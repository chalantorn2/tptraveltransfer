<?php
// api/drivers/manage.php - Driver Management API
error_reporting(E_ALL);
ini_set('display_errors', 1);

// CORS Headers
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header("Access-Control-Allow-Origin: $origin");
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Method');
header('Content-Type: application/json; charset=utf-8');

// Handle preflight OPTIONS request
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
    $method = $_SERVER['REQUEST_METHOD'];
    $input = json_decode(file_get_contents('php://input'), true) ?: [];

    // Check for X-Method header override
    if (isset($_SERVER['HTTP_X_METHOD'])) {
        $method = $_SERVER['HTTP_X_METHOD'];
    }

    $db = new Database();
    $pdo = $db->getConnection();

    switch ($method) {
        case 'GET':
            handleGetDrivers($pdo);
            break;

        case 'POST':
            handleCreateDriver($pdo, $input);
            break;

        case 'PUT':
            $driverId = $_GET['id'] ?? $input['id'] ?? null;
            handleUpdateDriver($pdo, $driverId, $input);
            break;

        case 'DELETE':
            $driverId = $_GET['id'] ?? $input['id'] ?? null;
            handleDeleteDriver($pdo, $driverId);
            break;

        default:
            sendResponse(false, null, 'Method not allowed', 405);
    }
} catch (Exception $e) {
    error_log("Driver API error: " . $e->getMessage());
    sendResponse(false, null, 'Server error: ' . $e->getMessage(), 500);
}

function handleGetDrivers($pdo)
{
    $sql = "SELECT d.*, v.registration as default_vehicle_registration, v.brand as default_vehicle_brand, v.model as default_vehicle_model
            FROM drivers d 
            LEFT JOIN vehicles v ON d.id = v.default_driver_id
            ORDER BY d.created_at DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $drivers = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Parse JSON contact_methods for each driver
    foreach ($drivers as &$driver) {
        if ($driver['contact_methods']) {
            $driver['contact_methods'] = json_decode($driver['contact_methods'], true);
        } else {
            $driver['contact_methods'] = [];
        }
    }

    sendResponse(true, $drivers, 'Drivers retrieved successfully');
}

function handleCreateDriver($pdo, $data)
{
    $name = trim($data['name'] ?? '');
    $phoneNumber = trim($data['phone_number'] ?? '');
    $preferredContactMethod = $data['preferred_contact_method'] ?? 'VOICE';
    $contactMethods = $data['contact_methods'] ?? [];
    $licenseNumber = trim($data['license_number'] ?? '');
    $username = trim($data['username'] ?? '');
    $password = $data['password'] ?? '';

    // Validate input
    if (empty($name) || empty($phoneNumber) || empty($username) || empty($password)) {
        sendResponse(false, null, 'Name, phone number, username, and password are required', 400);
    }

    // Validate username format
    if (!preg_match('/^[a-zA-Z0-9_]{3,20}$/', $username)) {
        sendResponse(false, null, 'Username must be 3-20 characters (letters, numbers, underscore only)', 400);
    }

    // Validate password length
    if (strlen($password) < 6) {
        sendResponse(false, null, 'Password must be at least 6 characters', 400);
    }

    // Validate phone format (Thai mobile format)
    if (!preg_match('/^\+66[6-9]\d{8}$/', $phoneNumber)) {
        sendResponse(false, null, 'Phone number must be Thai mobile format (+66812345678)', 400);
    }

    // Check if phone number exists
    $checkSql = "SELECT id FROM drivers WHERE phone_number = :phone";
    $checkStmt = $pdo->prepare($checkSql);
    $checkStmt->execute([':phone' => $phoneNumber]);

    if ($checkStmt->fetch()) {
        sendResponse(false, null, 'Phone number already exists', 400);
    }

    // Check if username exists
    $checkUsernameSql = "SELECT id FROM drivers WHERE username = :username";
    $checkUsernameStmt = $pdo->prepare($checkUsernameSql);
    $checkUsernameStmt->execute([':username' => $username]);

    if ($checkUsernameStmt->fetch()) {
        sendResponse(false, null, 'Username already exists', 400);
    }

    // Validate contact methods
    $validMethods = ['VOICE', 'SMS', 'VIBER', 'WHATSAPP'];
    if (!in_array($preferredContactMethod, $validMethods)) {
        sendResponse(false, null, 'Invalid preferred contact method', 400);
    }

    foreach ($contactMethods as $method) {
        if (!in_array($method, $validMethods)) {
            sendResponse(false, null, 'Invalid contact method: ' . $method, 400);
        }
    }

    // Hash password
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

    // Insert driver
    $sql = "INSERT INTO drivers (name, phone_number, preferred_contact_method, contact_methods, license_number, username, password, status, created_at) 
            VALUES (:name, :phone, :preferred_method, :contact_methods, :license, :username, :password, 'active', NOW())";

    $stmt = $pdo->prepare($sql);
    $result = $stmt->execute([
        ':name' => $name,
        ':phone' => $phoneNumber,
        ':preferred_method' => $preferredContactMethod,
        ':contact_methods' => json_encode($contactMethods),
        ':license' => $licenseNumber ?: null,
        ':username' => $username,
        ':password' => $hashedPassword
    ]);

    if ($result) {
        sendResponse(true, ['id' => $pdo->lastInsertId()], 'Driver created successfully');
    } else {
        sendResponse(false, null, 'Failed to create driver', 500);
    }
}

function handleUpdateDriver($pdo, $driverId, $data)
{
    if (!$driverId) {
        sendResponse(false, null, 'Driver ID is required', 400);
    }

    $name = trim($data['name'] ?? '');
    $phoneNumber = trim($data['phone_number'] ?? '');
    $preferredContactMethod = $data['preferred_contact_method'] ?? 'VOICE';
    $contactMethods = $data['contact_methods'] ?? [];
    $licenseNumber = trim($data['license_number'] ?? '');
    $username = trim($data['username'] ?? '');
    $password = $data['password'] ?? '';
    $status = $data['status'] ?? 'active';

    if (empty($name) || empty($phoneNumber) || empty($username)) {
        sendResponse(false, null, 'Name, phone number, and username are required', 400);
    }

    // Validate username format
    if (!preg_match('/^[a-zA-Z0-9_]{3,20}$/', $username)) {
        sendResponse(false, null, 'Username must be 3-20 characters (letters, numbers, underscore only)', 400);
    }

    // Validate password if provided
    if (!empty($password) && strlen($password) < 6) {
        sendResponse(false, null, 'Password must be at least 6 characters', 400);
    }

    // Validate phone format (Thai mobile format)
    if (!preg_match('/^\+66[6-9]\d{8}$/', $phoneNumber)) {
        sendResponse(false, null, 'Phone number must be Thai mobile format (+66812345678)', 400);
    }

    // Check if phone number exists for other drivers
    $checkSql = "SELECT id FROM drivers WHERE phone_number = :phone AND id != :id";
    $checkStmt = $pdo->prepare($checkSql);
    $checkStmt->execute([':phone' => $phoneNumber, ':id' => $driverId]);

    if ($checkStmt->fetch()) {
        sendResponse(false, null, 'Phone number already exists', 400);
    }

    // Check if username exists for other drivers
    $checkUsernameSql = "SELECT id FROM drivers WHERE username = :username AND id != :id";
    $checkUsernameStmt = $pdo->prepare($checkUsernameSql);
    $checkUsernameStmt->execute([':username' => $username, ':id' => $driverId]);

    if ($checkUsernameStmt->fetch()) {
        sendResponse(false, null, 'Username already exists', 400);
    }

    // Prepare SQL based on whether password is being updated
    if (!empty($password)) {
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        $sql = "UPDATE drivers 
                SET name = :name, phone_number = :phone, preferred_contact_method = :preferred_method, 
                    contact_methods = :contact_methods, license_number = :license, username = :username, 
                    password = :password, status = :status, updated_at = NOW() 
                WHERE id = :id";

        $params = [
            ':id' => $driverId,
            ':name' => $name,
            ':phone' => $phoneNumber,
            ':preferred_method' => $preferredContactMethod,
            ':contact_methods' => json_encode($contactMethods),
            ':license' => $licenseNumber ?: null,
            ':username' => $username,
            ':password' => $hashedPassword,
            ':status' => $status
        ];
    } else {
        $sql = "UPDATE drivers 
                SET name = :name, phone_number = :phone, preferred_contact_method = :preferred_method, 
                    contact_methods = :contact_methods, license_number = :license, username = :username, 
                    status = :status, updated_at = NOW() 
                WHERE id = :id";

        $params = [
            ':id' => $driverId,
            ':name' => $name,
            ':phone' => $phoneNumber,
            ':preferred_method' => $preferredContactMethod,
            ':contact_methods' => json_encode($contactMethods),
            ':license' => $licenseNumber ?: null,
            ':username' => $username,
            ':status' => $status
        ];
    }

    $stmt = $pdo->prepare($sql);
    $result = $stmt->execute($params);

    if ($result) {
        sendResponse(true, null, 'Driver updated successfully');
    } else {
        sendResponse(false, null, 'Failed to update driver', 500);
    }
}

function handleDeleteDriver($pdo, $driverId)
{
    if (!$driverId) {
        sendResponse(false, null, 'Driver ID is required', 400);
    }

    // Check if driver has active assignments
    $checkSql = "SELECT COUNT(*) as count FROM driver_vehicle_assignments WHERE driver_id = :id AND status IN ('assigned', 'in_progress')";
    $checkStmt = $pdo->prepare($checkSql);
    $checkStmt->execute([':id' => $driverId]);
    $activeAssignments = $checkStmt->fetch()['count'];

    if ($activeAssignments > 0) {
        sendResponse(false, null, 'Cannot delete driver with active assignments', 400);
    }

    $sql = "DELETE FROM drivers WHERE id = :id";
    $stmt = $pdo->prepare($sql);
    $result = $stmt->execute([':id' => $driverId]);

    if ($result) {
        sendResponse(true, null, 'Driver deleted successfully');
    } else {
        sendResponse(false, null, 'Failed to delete driver', 500);
    }
}
