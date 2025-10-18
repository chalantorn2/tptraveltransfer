<?php
// api/assignments/list.php - Get All Assignments
error_reporting(E_ALL);
ini_set('display_errors', 1);

$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header("Access-Control-Allow-Origin: $origin");
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../config/database.php';

function sendResponse($success, $data = null, $message = '', $code = 200)
{
    http_response_code($code);
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'message' => $message,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    exit;
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        sendResponse(false, null, 'Method not allowed', 405);
    }

    // Get filters
    $status = $_GET['status'] ?? 'all'; // all, assigned, completed, cancelled
    $limit = (int)($_GET['limit'] ?? 50);
    $offset = (int)($_GET['offset'] ?? 0);
    $search = $_GET['search'] ?? '';

    $db = new Database();
    $pdo = $db->getConnection();

    // Build WHERE clause
    $where = [];
    $params = [];

    if ($status !== 'all') {
        $where[] = "a.status = :status";
        $params[':status'] = $status;
    }

    if (!empty($search)) {
        $where[] = "(a.booking_ref LIKE :search OR d.name LIKE :search OR v.registration LIKE :search)";
        $params[':search'] = "%{$search}%";
    }

    $whereClause = !empty($where) ? "WHERE " . implode(' AND ', $where) : '';

    // Get assignments with all details
    $sql = "SELECT a.*,
                   d.name as driver_name, d.phone_number as driver_phone,
                   v.registration, v.brand, v.model, v.color,
                   s.full_name as assigned_by_name,
                   t.token as tracking_token, t.status as tracking_status,
                   t.started_at as tracking_started_at, t.completed_at as tracking_completed_at,
                   t.total_locations_sent,
                   b.passenger_name, b.passenger_phone, b.vehicle_type, b.pax_total, b.booking_type,
                   b.pickup_date, b.accommodation_name, b.airport, b.resort,
                   b.from_airport, b.to_airport, b.arrival_date, b.departure_date
            FROM driver_vehicle_assignments a
            LEFT JOIN drivers d ON a.driver_id = d.id
            LEFT JOIN vehicles v ON a.vehicle_id = v.id
            LEFT JOIN staff_users s ON a.assigned_by = s.id
            LEFT JOIN driver_tracking_tokens t ON a.id = t.assignment_id AND t.expires_at > NOW()
            LEFT JOIN bookings b ON a.booking_ref = b.booking_ref
            {$whereClause}
            ORDER BY a.assigned_at DESC
            LIMIT :limit OFFSET :offset";

    $stmt = $pdo->prepare($sql);

    // Bind params
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);

    $stmt->execute();
    $assignments = $stmt->fetchAll();

    // Process and format assignments
    $formattedAssignments = array_map(function($assignment) {
        // Determine pickup and dropoff locations based on booking type
        $pickupLocation = '-';
        $dropoffLocation = '-';

        $bookingType = strtolower($assignment['booking_type'] ?? '');
        $accommodation = $assignment['accommodation_name'] ?? $assignment['resort'] ?? '';
        $airport = $assignment['airport'] ?? $assignment['from_airport'] ?? $assignment['to_airport'] ?? '';

        if (strpos($bookingType, 'arrival') !== false || $assignment['arrival_date']) {
            // Arrival transfer: Airport -> Accommodation
            $pickupLocation = $airport ?: 'Airport';
            $dropoffLocation = $accommodation ?: 'Resort/Hotel';
        } else if (strpos($bookingType, 'departure') !== false || $assignment['departure_date']) {
            // Departure transfer: Accommodation -> Airport
            $pickupLocation = $accommodation ?: 'Resort/Hotel';
            $dropoffLocation = $airport ?: 'Airport';
        } else {
            // Default: use accommodation and airport
            $pickupLocation = $accommodation ?: $airport ?: '-';
            $dropoffLocation = $airport ?: $accommodation ?: '-';
        }

        return [
            'id' => (int)$assignment['id'],
            'booking_ref' => $assignment['booking_ref'],
            'status' => $assignment['status'],
            'booking_status' => $assignment['booking_status'],

            'driver' => [
                'id' => (int)$assignment['driver_id'],
                'name' => $assignment['driver_name'],
                'phone' => $assignment['driver_phone']
            ],

            'vehicle' => [
                'id' => (int)$assignment['vehicle_id'],
                'registration' => $assignment['registration'],
                'brand' => $assignment['brand'],
                'model' => $assignment['model'],
                'color' => $assignment['color']
            ],

            'booking' => [
                'passenger_name' => $assignment['passenger_name'] ?? '-',
                'passenger_phone' => $assignment['passenger_phone'] ?? '-',
                'vehicle' => $assignment['vehicle_type'] ?? '-',
                'pax' => (int)($assignment['pax_total'] ?? 0),
                'booking_type' => $assignment['booking_type'] ?? '-',
                'pickup_date' => $assignment['pickup_date'] ?? $assignment['arrival_date'] ?? $assignment['departure_date'] ?? null,
                'pickup_location' => $pickupLocation,
                'dropoff_location' => $dropoffLocation
            ],

            'tracking' => [
                'has_tracking' => (bool)$assignment['has_tracking'],
                'token' => $assignment['tracking_token'],
                'status' => $assignment['tracking_status'],
                'started_at' => $assignment['tracking_started_at'],
                'completed_at' => $assignment['tracking_completed_at'],
                'total_locations_sent' => (int)($assignment['total_locations_sent'] ?? 0)
            ],

            'assignment_notes' => $assignment['assignment_notes'],
            'assigned_by_name' => $assignment['assigned_by_name'],
            'assigned_at' => $assignment['assigned_at'],
            'last_sync_at' => $assignment['last_sync_at'],
            'cancelled_at' => $assignment['cancelled_at'],
            'cancellation_reason' => $assignment['cancellation_reason']
        ];
    }, $assignments);

    // Get total count
    $countSql = "SELECT COUNT(*) as total
                 FROM driver_vehicle_assignments a
                 LEFT JOIN drivers d ON a.driver_id = d.id
                 LEFT JOIN vehicles v ON a.vehicle_id = v.id
                 {$whereClause}";

    $countStmt = $pdo->prepare($countSql);
    foreach ($params as $key => $value) {
        $countStmt->bindValue($key, $value);
    }
    $countStmt->execute();
    $totalCount = $countStmt->fetch()['total'];

    sendResponse(true, [
        'assignments' => $formattedAssignments,
        'pagination' => [
            'total' => (int)$totalCount,
            'limit' => $limit,
            'offset' => $offset,
            'has_more' => ($offset + $limit) < $totalCount
        ]
    ], 'Assignments retrieved successfully');

} catch (Exception $e) {
    error_log("Assignments List API error: " . $e->getMessage());
    sendResponse(false, null, 'Server error: ' . $e->getMessage(), 500);
}
