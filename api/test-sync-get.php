<?php
// test-sync-get.php - ทดสอบ sync ผ่าน GET method
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once 'config/database.php';
require_once 'config/holiday-taxis.php';

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

    // Show structure analysis
    $result = [
        'api_call' => [
            'url' => $apiUrl,
            'http_code' => $httpCode,
            'total_bookings' => count($bookings)
        ],
        'first_booking' => $bookings[0] ?? null,
        'vehicle_check' => [
            'has_vehicle_field' => isset($bookings[0]['vehicle']),
            'vehicle_value' => $bookings[0]['vehicle'] ?? 'NOT_FOUND'
        ],
        'database_test' => []
    ];

    // Test database connection
    try {
        $testSql = "SELECT COUNT(*) as total FROM bookings";
        $testStmt = $pdo->prepare($testSql);
        $testStmt->execute();
        $testResult = $testStmt->fetch();

        $result['database_test'] = [
            'connection' => 'SUCCESS',
            'current_bookings' => $testResult['total']
        ];

        // Check if vehicle_type column exists
        $columnSql = "SHOW COLUMNS FROM bookings LIKE 'vehicle_type'";
        $columnStmt = $pdo->prepare($columnSql);
        $columnStmt->execute();
        $columnExists = $columnStmt->fetch();

        $result['database_test']['vehicle_type_column'] = $columnExists ? 'EXISTS' : 'NOT_EXISTS';
    } catch (Exception $dbError) {
        $result['database_test'] = [
            'connection' => 'FAILED',
            'error' => $dbError->getMessage()
        ];
    }

    echo json_encode($result, JSON_PRETTY_PRINT);
} catch (Exception $e) {
    echo json_encode([
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ], JSON_PRETTY_PRINT);
}
