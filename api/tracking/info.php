<?php
// api/tracking/info.php - Get Tracking Info for Driver
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
        exit;
    }

    $token = $_GET['token'] ?? null;

    if (!$token) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Token is required']);
        exit;
    }

    $db = new Database();
    $pdo = $db->getConnection();

    $sql = "SELECT t.*,
                   d.name as driver_name, d.phone_number as driver_phone,
                   v.registration, v.brand, v.model, v.color,
                   b.passenger_name, b.passenger_phone, b.vehicle_type, b.pax_total,
                   b.booking_type, b.airport, b.resort, b.accommodation_name,
                   b.arrival_date, b.departure_date, b.pickup_date
            FROM driver_tracking_tokens t
            LEFT JOIN drivers d ON t.driver_id = d.id
            LEFT JOIN vehicles v ON t.vehicle_id = v.id
            LEFT JOIN bookings b ON t.booking_ref = b.booking_ref
            WHERE t.token = :token";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([':token' => $token]);
    $tokenData = $stmt->fetch();

    if (!$tokenData) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'error' => 'Token not found or expired'
        ]);
        exit;
    }

    // Check if token expired
    if (strtotime($tokenData['expires_at']) < time()) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Token has expired'
        ]);
        exit;
    }

    // Determine pickup and dropoff locations based on booking type
    $bookingType = strtolower($tokenData['booking_type'] ?? '');
    $accommodation = $tokenData['accommodation_name'] ?? $tokenData['resort'] ?? '';
    $airport = $tokenData['airport'] ?? '';

    $pickupLocation = '-';
    $dropoffLocation = '-';
    $pickupDateTime = '';

    if (strpos($bookingType, 'arrival') !== false || $tokenData['arrival_date']) {
        // Arrival transfer: Airport -> Accommodation
        $pickupLocation = $airport ?: 'Airport';
        $dropoffLocation = $accommodation ?: 'Resort/Hotel';
        $pickupDateTime = $tokenData['arrival_date'] ?? $tokenData['pickup_date'] ?? '';
    } elseif (strpos($bookingType, 'departure') !== false || $tokenData['departure_date']) {
        // Departure transfer: Accommodation -> Airport
        $pickupLocation = $accommodation ?: 'Resort/Hotel';
        $dropoffLocation = $airport ?: 'Airport';
        $pickupDateTime = $tokenData['pickup_date'] ?? $tokenData['departure_date'] ?? '';
    } else {
        // Default
        $pickupLocation = $accommodation ?: $airport ?: '-';
        $dropoffLocation = $airport ?: $accommodation ?: '-';
        $pickupDateTime = $tokenData['pickup_date'] ?? '';
    }

    // Determine the primary pickup date for validation
    $primaryPickupDate = $tokenData['pickup_date'] ?? $tokenData['arrival_date'] ?? $tokenData['departure_date'];

    // Format response
    $response = [
        'success' => true,
        'data' => [
            'booking_ref' => $tokenData['booking_ref'],
            'status' => $tokenData['status'],
            'pickup_date' => $primaryPickupDate, // For date range validation

            'booking' => [
                'passenger_name' => $tokenData['passenger_name'] ?? '-',
                'passenger_phone' => $tokenData['passenger_phone'] ?? '-',
                'pickup_location' => $pickupLocation,
                'dropoff_location' => $dropoffLocation,
                'pickup_datetime' => $pickupDateTime ? date('d/m/Y H:i', strtotime($pickupDateTime)) : '-',
                'vehicle' => $tokenData['vehicle_type'] ?? '-',
                'pax' => (int)($tokenData['pax_total'] ?? 0)
            ],

            'driver' => [
                'name' => $tokenData['driver_name'],
                'phone' => $tokenData['driver_phone']
            ],

            'vehicle' => [
                'registration' => $tokenData['registration'],
                'brand' => $tokenData['brand'],
                'model' => $tokenData['model'],
                'color' => $tokenData['color'] ?? '-'
            ],

            'tracking' => [
                'interval' => (int)$tokenData['tracking_interval'],
                'started_at' => $tokenData['started_at'],
                'completed_at' => $tokenData['completed_at'],
                'total_locations_sent' => (int)$tokenData['total_locations_sent']
            ],

            'expires_at' => $tokenData['expires_at']
        ]
    ];

    echo json_encode($response);
} catch (Exception $e) {
    error_log("Tracking Info API error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Server error: ' . $e->getMessage()
    ]);
}
