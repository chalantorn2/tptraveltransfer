<?php
// api/bookings/export-data.php - Export Full Booking Data (Aligned with database-search.php)
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/database.php';

try {
    $db = new Database();
    $pdo = $db->getConnection();

    // Get query parameters (with separate assignment_status)
    $status = isset($_GET['status']) ? $_GET['status'] : 'all';
    $assignmentStatus = isset($_GET['assignment_status']) ? $_GET['assignment_status'] : '';
    $dateFrom = isset($_GET['date_from']) ? $_GET['date_from'] : '';
    $dateTo = isset($_GET['date_to']) ? $_GET['date_to'] : '';
    $search = isset($_GET['search']) ? $_GET['search'] : '';
    $province = isset($_GET['province']) ? $_GET['province'] : '';
    $format = isset($_GET['format']) ? $_GET['format'] : 'json';

    // Build query with LEFT JOIN for assignments
    $sql = "SELECT
                b.booking_ref,
                b.ht_status,
                b.booking_type,
                b.pickup_date,
                COALESCE(b.accommodation_name, b.resort, b.airport) as pickup_location,
                COALESCE(b.airport, b.resort, b.accommodation_name) as dropoff_location,
                b.passenger_name as lead_passenger,
                b.pax_total,
                COALESCE(b.flight_no_arrival, b.flight_no_departure) as flight_number,
                b.province,
                b.vehicle_type,
                d.name as driver_name,
                v.registration as vehicle_number
            FROM bookings b
            LEFT JOIN driver_vehicle_assignments dva ON b.booking_ref = dva.booking_ref
            LEFT JOIN drivers d ON dva.driver_id = d.id
            LEFT JOIN vehicles v ON dva.vehicle_id = v.id
            WHERE 1=1";

    $params = [];

    // Booking status filter
    if ($status !== 'all') {
        $sql .= " AND b.ht_status = :status";
        $params[':status'] = $status;
    }

    // Assignment status filter (separate from booking status)
    if (!empty($assignmentStatus)) {
        if ($assignmentStatus === 'pending') {
            // Not assigned (no assignment record)
            $sql .= " AND dva.id IS NULL";
        } elseif ($assignmentStatus === 'assigned') {
            // Has assignment (any status)
            $sql .= " AND dva.id IS NOT NULL";
        } else {
            // Has assignment with specific status (for backward compatibility)
            $sql .= " AND dva.status = :assignment_status_param";
            $params[':assignment_status_param'] = $assignmentStatus;
        }
    }

    // Province filter
    if (!empty($province) && $province !== 'all') {
        if ($province === 'unknown') {
            $sql .= " AND (b.province IS NULL OR b.province = '' OR b.province = 'Unknown')";
        } else {
            $sql .= " AND b.province = :province";
            $params[':province'] = $province;
        }
    }

    // Date filter (same logic as database-search.php)
    if (!empty($dateFrom) || !empty($dateTo)) {
        if (!empty($dateFrom) && !empty($dateTo)) {
            // Both From and To specified - date range
            $dateToEnd = date('Y-m-d', strtotime($dateTo . ' +1 day'));
            $sql .= " AND (
                (b.arrival_date >= :dateFrom1 AND b.arrival_date < :dateTo1)
                OR (b.departure_date >= :dateFrom2 AND b.departure_date < :dateTo2)
                OR (b.pickup_date >= :dateFrom3 AND b.pickup_date < :dateTo3)
            )";
            $params[':dateFrom1'] = $dateFrom . ' 00:00:00';
            $params[':dateTo1'] = $dateToEnd . ' 00:00:00';
            $params[':dateFrom2'] = $dateFrom . ' 00:00:00';
            $params[':dateTo2'] = $dateToEnd . ' 00:00:00';
            $params[':dateFrom3'] = $dateFrom . ' 00:00:00';
            $params[':dateTo3'] = $dateToEnd . ' 00:00:00';
        } elseif (!empty($dateFrom)) {
            // Only From specified - show that single day
            $dateFromEnd = date('Y-m-d', strtotime($dateFrom . ' +1 day'));
            $sql .= " AND (
                (b.arrival_date >= :dateFrom1 AND b.arrival_date < :dateFromEnd1)
                OR (b.departure_date >= :dateFrom2 AND b.departure_date < :dateFromEnd2)
                OR (b.pickup_date >= :dateFrom3 AND b.pickup_date < :dateFromEnd3)
            )";
            $params[':dateFrom1'] = $dateFrom . ' 00:00:00';
            $params[':dateFromEnd1'] = $dateFromEnd . ' 00:00:00';
            $params[':dateFrom2'] = $dateFrom . ' 00:00:00';
            $params[':dateFromEnd2'] = $dateFromEnd . ' 00:00:00';
            $params[':dateFrom3'] = $dateFrom . ' 00:00:00';
            $params[':dateFromEnd3'] = $dateFromEnd . ' 00:00:00';
        } else {
            // Only To specified - show that single day
            $dateToEnd = date('Y-m-d', strtotime($dateTo . ' +1 day'));
            $sql .= " AND (
                (b.arrival_date >= :dateTo1 AND b.arrival_date < :dateToEnd1)
                OR (b.departure_date >= :dateTo2 AND b.departure_date < :dateToEnd2)
                OR (b.pickup_date >= :dateTo3 AND b.pickup_date < :dateToEnd3)
            )";
            $params[':dateTo1'] = $dateTo . ' 00:00:00';
            $params[':dateToEnd1'] = $dateToEnd . ' 00:00:00';
            $params[':dateTo2'] = $dateTo . ' 00:00:00';
            $params[':dateToEnd2'] = $dateToEnd . ' 00:00:00';
            $params[':dateTo3'] = $dateTo . ' 00:00:00';
            $params[':dateToEnd3'] = $dateToEnd . ' 00:00:00';
        }
    }

    // Search filter
    if (!empty($search)) {
        $sql .= " AND (
            b.booking_ref LIKE :search OR
            b.passenger_name LIKE :search OR
            b.accommodation_name LIKE :search OR
            b.resort LIKE :search OR
            b.airport LIKE :search OR
            b.flight_no_arrival LIKE :search OR
            b.flight_no_departure LIKE :search
        )";
        $params[':search'] = "%$search%";
    }

    $sql .= " ORDER BY b.pickup_date DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get summary statistics (apply same filters)
    $summarySql = "SELECT
            COUNT(*) as total,
            SUM(CASE WHEN b.ht_status = 'ACON' THEN 1 ELSE 0 END) as confirmed,
            SUM(CASE WHEN b.ht_status = 'PCON' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN b.ht_status LIKE '%CAN' THEN 1 ELSE 0 END) as cancelled,
            SUM(b.pax_total) as total_passengers
        FROM bookings b
        LEFT JOIN driver_vehicle_assignments dva ON b.booking_ref = dva.booking_ref
        WHERE 1=1";

    $summaryParams = [];

    // Apply same filters
    // Booking status filter
    if ($status !== 'all') {
        $summarySql .= " AND b.ht_status = :status";
        $summaryParams[':status'] = $status;
    }

    // Assignment status filter
    if (!empty($assignmentStatus)) {
        if ($assignmentStatus === 'pending') {
            // Not assigned (no assignment record)
            $summarySql .= " AND dva.id IS NULL";
        } elseif ($assignmentStatus === 'assigned') {
            // Has assignment (any status)
            $summarySql .= " AND dva.id IS NOT NULL";
        } else {
            // Has assignment with specific status
            $summarySql .= " AND dva.status = :assignment_status_param";
            $summaryParams[':assignment_status_param'] = $assignmentStatus;
        }
    }

    if (!empty($province) && $province !== 'all') {
        if ($province === 'unknown') {
            $summarySql .= " AND (b.province IS NULL OR b.province = '' OR b.province = 'Unknown')";
        } else {
            $summarySql .= " AND b.province = :province";
            $summaryParams[':province'] = $province;
        }
    }

    if (!empty($dateFrom) || !empty($dateTo)) {
        if (!empty($dateFrom) && !empty($dateTo)) {
            // Both From and To specified - date range
            $dateToEnd = date('Y-m-d', strtotime($dateTo . ' +1 day'));
            $summarySql .= " AND (
                (b.arrival_date >= :dateFrom1 AND b.arrival_date < :dateTo1)
                OR (b.departure_date >= :dateFrom2 AND b.departure_date < :dateTo2)
                OR (b.pickup_date >= :dateFrom3 AND b.pickup_date < :dateTo3)
            )";
            $summaryParams[':dateFrom1'] = $dateFrom . ' 00:00:00';
            $summaryParams[':dateTo1'] = $dateToEnd . ' 00:00:00';
            $summaryParams[':dateFrom2'] = $dateFrom . ' 00:00:00';
            $summaryParams[':dateTo2'] = $dateToEnd . ' 00:00:00';
            $summaryParams[':dateFrom3'] = $dateFrom . ' 00:00:00';
            $summaryParams[':dateTo3'] = $dateToEnd . ' 00:00:00';
        } elseif (!empty($dateFrom)) {
            // Only From specified - show that single day
            $dateFromEnd = date('Y-m-d', strtotime($dateFrom . ' +1 day'));
            $summarySql .= " AND (
                (b.arrival_date >= :dateFrom1 AND b.arrival_date < :dateFromEnd1)
                OR (b.departure_date >= :dateFrom2 AND b.departure_date < :dateFromEnd2)
                OR (b.pickup_date >= :dateFrom3 AND b.pickup_date < :dateFromEnd3)
            )";
            $summaryParams[':dateFrom1'] = $dateFrom . ' 00:00:00';
            $summaryParams[':dateFromEnd1'] = $dateFromEnd . ' 00:00:00';
            $summaryParams[':dateFrom2'] = $dateFrom . ' 00:00:00';
            $summaryParams[':dateFromEnd2'] = $dateFromEnd . ' 00:00:00';
            $summaryParams[':dateFrom3'] = $dateFrom . ' 00:00:00';
            $summaryParams[':dateFromEnd3'] = $dateFromEnd . ' 00:00:00';
        } else {
            // Only To specified - show that single day
            $dateToEnd = date('Y-m-d', strtotime($dateTo . ' +1 day'));
            $summarySql .= " AND (
                (b.arrival_date >= :dateTo1 AND b.arrival_date < :dateToEnd1)
                OR (b.departure_date >= :dateTo2 AND b.departure_date < :dateToEnd2)
                OR (b.pickup_date >= :dateTo3 AND b.pickup_date < :dateToEnd3)
            )";
            $summaryParams[':dateTo1'] = $dateTo . ' 00:00:00';
            $summaryParams[':dateToEnd1'] = $dateToEnd . ' 00:00:00';
            $summaryParams[':dateTo2'] = $dateTo . ' 00:00:00';
            $summaryParams[':dateToEnd2'] = $dateToEnd . ' 00:00:00';
            $summaryParams[':dateTo3'] = $dateTo . ' 00:00:00';
            $summaryParams[':dateToEnd3'] = $dateToEnd . ' 00:00:00';
        }
    }

    if (!empty($search)) {
        $summarySql .= " AND (
            b.booking_ref LIKE :search OR
            b.passenger_name LIKE :search OR
            b.accommodation_name LIKE :search OR
            b.resort LIKE :search OR
            b.airport LIKE :search OR
            b.flight_no_arrival LIKE :search OR
            b.flight_no_departure LIKE :search
        )";
        $summaryParams[':search'] = "%$search%";
    }

    $summaryStmt = $pdo->prepare($summarySql);
    $summaryStmt->execute($summaryParams);
    $summary = $summaryStmt->fetch(PDO::FETCH_ASSOC);

    // Get province list for filter
    $provincesStmt = $pdo->query("
        SELECT DISTINCT province
        FROM bookings
        WHERE province IS NOT NULL AND province != ''
        ORDER BY province
    ");
    $provinces = $provincesStmt->fetchAll(PDO::FETCH_COLUMN);

    // Format response based on requested format
    $response = [
        'success' => true,
        'data' => [
            'bookings' => $bookings,
            'summary' => $summary,
            'provinces' => $provinces,
            'filters' => [
                'status' => $status,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'search' => $search,
                'province' => $province
            ],
            'total' => count($bookings),
            'generated_at' => date('Y-m-d H:i:s')
        ]
    ];

    echo json_encode($response);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error: ' . $e->getMessage()
    ]);
}
