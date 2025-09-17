<?php
// test-tp-travel-api.php - ทดสอบ TP Travel APIs
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// TP Travel API Config
$API_KEY = 'htscon_fd8a9d60c363c15e3be1ff427dac2e31f5ee1521eeac523fb7c655899acf414cb45135d7dcd81841';
$API_ENDPOINT = 'https://suppliers.holidaytaxis.com';
$API_VERSION = '2025-01';

try {
    $result = [
        'server_info' => [
            'timestamp' => date('Y-m-d H:i:s'),
            'server_name' => $_SERVER['SERVER_NAME'] ?? 'unknown',
            'php_version' => phpversion(),
            'method' => $_SERVER['REQUEST_METHOD'],
            'script_path' => $_SERVER['SCRIPT_NAME'] ?? 'unknown'
        ],
        'api_config' => [
            'api_key' => substr($API_KEY, 0, 20) . '...', // แสดงแค่ส่วนแรก
            'endpoint' => $API_ENDPOINT,
            'version' => $API_VERSION
        ],
        'database_test' => [],
        'holiday_taxis_test' => [],
        'file_checks' => []
    ];

    // Test 1: Database Connection
    try {
        // Check if database config exists
        if (file_exists('config/database.php')) {
            require_once 'config/database.php';
            $db = new Database();
            $pdo = $db->getConnection();

            $testSql = "SELECT COUNT(*) as total FROM bookings";
            $testStmt = $pdo->prepare($testSql);
            $testStmt->execute();
            $testResult = $testStmt->fetch();

            $result['database_test'] = [
                'status' => 'SUCCESS',
                'total_bookings' => $testResult['total']
            ];
        } else {
            $result['database_test'] = [
                'status' => 'FAILED',
                'error' => 'config/database.php not found'
            ];
        }
    } catch (Exception $e) {
        $result['database_test'] = [
            'status' => 'FAILED',
            'error' => $e->getMessage()
        ];
    }

    // Test 2: Holiday Taxis API
    try {
        $dateFrom = date('Y-m-d\TH:i:s', strtotime('-7 days'));
        $dateTo = date('Y-m-d\TH:i:s');

        $apiUrl = "{$API_ENDPOINT}/bookings/search/since/{$dateFrom}/until/{$dateTo}/page/1";

        $headers = [
            "API_KEY: {$API_KEY}",
            "Content-Type: application/json",
            "Accept: application/json",
            "VERSION: {$API_VERSION}"
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

        if ($httpCode === 200) {
            $data = json_decode($response, true);
            $bookings = $data['bookings'] ?? [];

            // Convert object to array if needed
            if (is_object($bookings)) {
                $bookings = array_values((array)$bookings);
            }

            $result['holiday_taxis_test'] = [
                'status' => 'SUCCESS',
                'http_code' => $httpCode,
                'total_bookings' => count($bookings),
                'sample_booking' => $bookings[0] ?? null
            ];
        } else {
            $result['holiday_taxis_test'] = [
                'status' => 'FAILED',
                'http_code' => $httpCode,
                'error' => 'API call failed'
            ];
        }
    } catch (Exception $e) {
        $result['holiday_taxis_test'] = [
            'status' => 'FAILED',
            'error' => $e->getMessage()
        ];
    }

    // Test 3: File Structure Check
    $files_to_check = [
        'config/database.php',
        'config/holiday-taxis.php',
        'api/dashboard/stats.php',
        'api/dashboard/recent-jobs.php',
        'api/sync/holiday-taxis.php'
    ];

    foreach ($files_to_check as $file) {
        $result['file_checks'][$file] = file_exists($file) ? 'EXISTS' : 'MISSING';
    }

    echo json_encode($result, JSON_PRETTY_PRINT);
} catch (Exception $e) {
    echo json_encode([
        'error' => 'Test failed',
        'message' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ], JSON_PRETTY_PRINT);
}
