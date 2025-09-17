<?php
// api/sync/holiday-taxis.php - Fixed CORS Headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Max-Age: 86400');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

require_once '../config/database.php';
require_once '../config/holiday-taxis.php';

try {
    $db = new Database();
    $pdo = $db->getConnection();

    // Calculate date range (last 7 days)
    $dateFrom = date('Y-m-d\TH:i:s', strtotime('-7 days'));
    $dateTo = date('Y-m-d\TH:i:s');

    // Call Holiday Taxis API
    $apiUrl = HolidayTaxisConfig::API_ENDPOINT . "/bookings/search/since/{$dateFrom}/until/{$dateTo}/page/1";

    $headers = [
        "API_KEY: " . HolidayTaxisConfig::API_KEY,
        "Content-Type: application/json",
        "Accept: application/json",
        "VERSION: " . HolidayTaxisConfig::API_VERSION
    ];

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $apiUrl,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        throw new Exception("Holiday Taxis API error: HTTP $httpCode");
    }

    $data = json_decode($response, true);

    if (!$data || !isset($data['bookings'])) {
        throw new Exception('Invalid API response format');
    }

    // Convert bookings object to array
    $bookingsData = $data['bookings'];
    if (is_object($bookingsData) || (is_array($bookingsData) && isset($bookingsData['booking_0']))) {
        $bookings = array_values((array)$bookingsData);
    } else {
        $bookings = $bookingsData;
    }

    // Process bookings
    $totalFound = count($bookings);
    $totalNew = 0;
    $totalUpdated = 0;

    foreach ($bookings as $booking) {
        // Check if booking exists
        $checkSql = "SELECT id FROM bookings WHERE booking_ref = :ref";
        $checkStmt = $pdo->prepare($checkSql);
        $checkStmt->execute([':ref' => $booking['ref']]);
        $exists = $checkStmt->fetch();

        // Determine pickup date (arrival or departure)
        $pickupDate = null;
        if (!empty($booking['arrivaldate'])) {
            $pickupDate = $booking['arrivaldate'];
        } elseif (!empty($booking['departuredate'])) {
            $pickupDate = $booking['departuredate'];
        }

        if ($exists) {
            // Update existing booking
            $updateSql = "UPDATE bookings SET 
                            ht_status = :status,
                            passenger_name = :passenger_name,
                            passenger_phone = :passenger_phone,
                            pax_total = :pax_total,
                            pickup_date = :pickup_date,
                            vehicle_type = :vehicle_type,
                            last_action_date = :last_action_date,
                            raw_data = :raw_data,
                            synced_at = NOW(),
                            updated_at = NOW()
                          WHERE booking_ref = :ref";

            $updateStmt = $pdo->prepare($updateSql);
            $updateStmt->execute([
                ':ref' => $booking['ref'],
                ':status' => $booking['status'],
                ':passenger_name' => $booking['passengername'] ?? null,
                ':passenger_phone' => $booking['passengertelno'] ?? null,
                ':pax_total' => 1,
                ':pickup_date' => $pickupDate,
                ':vehicle_type' => $booking['vehicle'] ?? null,
                ':last_action_date' => $booking['lastactiondate'] ?? date('Y-m-d H:i:s'),
                ':raw_data' => json_encode($booking)
            ]);

            $totalUpdated++;
        } else {
            // Insert new booking
            $insertSql = "INSERT INTO bookings (
                            booking_ref, ht_status, passenger_name, passenger_phone,
                            pax_total, pickup_date, vehicle_type,
                            last_action_date, raw_data, synced_at
                          ) VALUES (
                            :ref, :status, :passenger_name, :passenger_phone,
                            :pax_total, :pickup_date, :vehicle_type,
                            :last_action_date, :raw_data, NOW()
                          )";

            $insertStmt = $pdo->prepare($insertSql);
            $insertStmt->execute([
                ':ref' => $booking['ref'],
                ':status' => $booking['status'],
                ':passenger_name' => $booking['passengername'] ?? null,
                ':passenger_phone' => $booking['passengertelno'] ?? null,
                ':pax_total' => 1,
                ':pickup_date' => $pickupDate,
                ':vehicle_type' => $booking['vehicle'] ?? null,
                ':last_action_date' => $booking['lastactiondate'] ?? date('Y-m-d H:i:s'),
                ':raw_data' => json_encode($booking)
            ]);

            $totalNew++;
        }
    }

    // Log sync status
    $syncSql = "INSERT INTO sync_status (
                    sync_type, date_from, date_to, 
                    total_found, total_new, total_updated, 
                    status, completed_at
                ) VALUES (
                    'manual', :date_from, :date_to,
                    :total_found, :total_new, :total_updated,
                    'completed', NOW()
                )";

    $syncStmt = $pdo->prepare($syncSql);
    $syncStmt->execute([
        ':date_from' => $dateFrom,
        ':date_to' => $dateTo,
        ':total_found' => $totalFound,
        ':total_new' => $totalNew,
        ':total_updated' => $totalUpdated
    ]);

    $response = [
        'success' => true,
        'data' => [
            'totalFound' => $totalFound,
            'totalNew' => $totalNew,
            'totalUpdated' => $totalUpdated,
            'dateRange' => [
                'from' => $dateFrom,
                'to' => $dateTo
            ],
            'syncedAt' => date('Y-m-d H:i:s')
        ]
    ];

    echo json_encode($response);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
