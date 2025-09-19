<?php
error_log("DEBUG: New database-search.php loaded - " . date('Y-m-d H:i:s'));
// api/bookings/database-search.php - Advanced Booking Search API
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';

try {
    $db = new Database();
    $pdo = $db->getConnection();

    // Pagination parameters
    $page = $_GET['page'] ?? 1;
    $limit = $_GET['limit'] ?? 20;
    $offset = ($page - 1) * $limit;

    // Filter parameters
    $status = $_GET['status'] ?? 'all';
    $dateFrom = $_GET['date_from'] ?? null;
    $dateTo = $_GET['date_to'] ?? null;
    $dateType = $_GET['date_type'] ?? 'pickup'; // 'pickup' or 'arrival'
    $search = trim($_GET['search'] ?? '');

    // Debug logging
    error_log("Search API Debug - Search term: '$search'");
    error_log("Search API Debug - Other params: " . json_encode($_GET));

    // Base WHERE clause
    $whereClause = "WHERE 1=1";
    $params = [];

    // Status filter
    if ($status !== 'all') {
        $whereClause .= " AND ht_status = ?";
        $params[] = $status;
    }

    // Date range filter
    if ($dateFrom || $dateTo) {
        if ($dateFrom && $dateTo) {
            if ($dateType === 'arrival') {
                $whereClause .= " AND DATE(arrival_date) BETWEEN ? AND ?";
            } else { // pickup
                $whereClause .= " AND DATE(pickup_date) BETWEEN ? AND ?";
            }
            $params[] = $dateFrom;
            $params[] = $dateTo;
        } elseif ($dateFrom) {
            if ($dateType === 'arrival') {
                $whereClause .= " AND DATE(arrival_date) = ?";
            } else { // pickup
                $whereClause .= " AND DATE(pickup_date) = ?";
            }
            $params[] = $dateFrom;
        } elseif ($dateTo) {
            if ($dateType === 'arrival') {
                $whereClause .= " AND DATE(arrival_date) = ?";
            } else { // pickup
                $whereClause .= " AND DATE(pickup_date) = ?";
            }
            $params[] = $dateTo;
        }
    }

    // Search filter (Booking Ref or Passenger Name) - Case insensitive
    if (!empty($search)) {
        $whereClause .= " AND (LOWER(booking_ref) LIKE LOWER(?) OR LOWER(passenger_name) LIKE LOWER(?))";
        $searchParam = '%' . $search . '%';
        $params[] = $searchParam;
        $params[] = $searchParam;
        error_log("Search API Debug - WHERE clause: $whereClause");
        error_log("Search API Debug - Search param: $searchParam");
    }

    // Check if this is a default query (no search, no date filters)
    $isDefaultQuery = empty($search) && empty($dateFrom) && empty($dateTo) && $status === 'all';
    $maxDefaultResults = 100;

    error_log("DEBUG: isDefaultQuery = " . ($isDefaultQuery ? 'true' : 'false'));

    // Get total count for pagination
    if ($isDefaultQuery) {
        // For default query, limit to recent 100 bookings
        $countSql = "SELECT COUNT(*) as total FROM (
            SELECT id FROM bookings $whereClause 
            ORDER BY pickup_date DESC, created_at DESC 
            LIMIT $maxDefaultResults
        ) as limited_bookings";
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute($params);
        $totalRecords = min($countStmt->fetch()['total'], $maxDefaultResults);
    } else {
        // For filtered queries, count all matching records
        $countSql = "SELECT COUNT(*) as total FROM bookings $whereClause";
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute($params);
        $totalRecords = $countStmt->fetch()['total'];
    }

    // Get paginated bookings
    if ($isDefaultQuery) {
        // For default query, limit to recent bookings first
        $sql = "SELECT * FROM (
            SELECT 
                booking_ref,
                ht_status,
                passenger_name,
                passenger_phone,
                pax_total,
                adults,
                children,
                infants,
                booking_type,
                vehicle_type,
                airport,
                resort,
                accommodation_name,
                arrival_date,
                departure_date,
                pickup_date,
                last_action_date,
                created_at,
                raw_data
            FROM bookings
            $whereClause
            ORDER BY pickup_date DESC, created_at DESC
            LIMIT $maxDefaultResults
        ) as limited_bookings
        ORDER BY pickup_date DESC, created_at DESC
        LIMIT ? OFFSET ?";
    } else {
        // For filtered queries, use original query
        $sql = "SELECT 
            booking_ref,
            ht_status,
            passenger_name,
            passenger_phone,
            pax_total,
            adults,
            children,
            infants,
            booking_type,
            vehicle_type,
            airport,
            resort,
            accommodation_name,
            arrival_date,
            departure_date,
            pickup_date,
            last_action_date,
            created_at,
            raw_data
        FROM bookings
        $whereClause
        ORDER BY pickup_date DESC, created_at DESC
        LIMIT ? OFFSET ?";
    }

    // Prepare all parameters in correct order
    $allParams = $params;              // Get all WHERE clause parameters
    $allParams[] = (int)$limit;        // Add LIMIT parameter
    $allParams[] = (int)$offset;       // Add OFFSET parameter

    $stmt = $pdo->prepare($sql);
    $stmt->execute($allParams);
    $bookings = $stmt->fetchAll();

    // Format response data
    $formattedBookings = array_map(function ($booking) {
        $vehicle = '-';
        $passengerPhone = $booking['passenger_phone'];

        if (!empty($booking['raw_data'])) {
            $rawData = json_decode($booking['raw_data'], true);
            if ($rawData && isset($rawData['vehicle'])) {
                $vehicle = $rawData['vehicle'];
            }
            if (empty($passengerPhone) && isset($rawData['passengertelno'])) {
                $passengerPhone = $rawData['passengertelno'];
            }
        }

        return [
            'ref' => $booking['booking_ref'],
            'status' => $booking['ht_status'],
            'passenger' => [
                'name' => $booking['passenger_name'] ?? '-',
                'phone' => $passengerPhone
            ],
            'pax' => (int)$booking['pax_total'] ?? 1,
            'paxDetails' => [
                'adults' => (int)($booking['adults'] ?? 1),
                'children' => (int)($booking['children'] ?? 0),
                'infants' => (int)($booking['infants'] ?? 0)
            ],
            'bookingType' => $booking['booking_type'] ?? 'N/A',
            'airport' => $booking['airport'] ?? 'N/A',
            'arrivalDate' => ($booking['arrival_date'] && $booking['arrival_date'] !== '0000-00-00 00:00:00') ? $booking['arrival_date'] : null,
            'departureDate' => ($booking['departure_date'] && $booking['departure_date'] !== '0000-00-00 00:00:00') ? $booking['departure_date'] : null,
            'pickupDate' => ($booking['pickup_date'] && $booking['pickup_date'] !== '0000-00-00 00:00:00') ? $booking['pickup_date'] : null,
            'vehicle' => $booking['vehicle_type'] ?? $vehicle,
            'resort' => $booking['resort'] ?? 'N/A',
            'accommodation' => [
                'name' => $booking['accommodation_name']
            ],
            'lastActionDate' => $booking['last_action_date'],
            'createdAt' => $booking['created_at']
        ];
    }, $bookings);

    $totalPages = ceil($totalRecords / $limit);

    $response = [
        'success' => true,
        'data' => [
            'bookings' => $formattedBookings,
            'pagination' => [
                'current_page' => (int)$page,
                'total_pages' => $totalPages,
                'total_records' => (int)$totalRecords,
                'per_page' => (int)$limit,
                'has_next' => $page < $totalPages,
                'has_prev' => $page > 1,
                'is_default_query' => $isDefaultQuery,
                'max_default_results' => $isDefaultQuery ? $maxDefaultResults : null
            ],
            'filters' => [
                'status' => $status,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'date_type' => $dateType,
                'search' => $search,
                'limit' => (int)$limit
            ],
            'debug' => [
                'where_clause' => $whereClause,
                'params_count' => count($params),
                'total_found' => (int)$totalRecords,
                'search_term' => $search,
                'is_default_query' => $isDefaultQuery
            ],
            'lastUpdate' => date('Y-m-d H:i:s')
        ]
    ];

    echo json_encode($response);
} catch (PDOException $e) {
    error_log("Database Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error: ' . $e->getMessage(),
        'debug' => [
            'sql_error' => $e->getMessage(),
            'error_code' => $e->getCode()
        ]
    ]);
} catch (Exception $e) {
    error_log("General Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
