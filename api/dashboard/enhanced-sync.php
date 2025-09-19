<?php
// api/dashboard/enhanced-sync.php - Enhanced Dashboard with Auto Sync
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';
require_once '../config/holiday-taxis.php';

try {
    $db = new Database();
    $pdo = $db->getConnection();

    // Check if we need to sync (if database is empty or last sync > 1 hour ago)
    $lastSyncSql = "SELECT MAX(completed_at) as last_sync FROM sync_status WHERE status = 'completed'";
    $lastSyncStmt = $pdo->prepare($lastSyncSql);
    $lastSyncStmt->execute();
    $lastSync = $lastSyncStmt->fetch()['last_sync'];

    $bookingsCountSql = "SELECT COUNT(*) as total FROM bookings";
    $bookingsCountStmt = $pdo->prepare($bookingsCountSql);
    $bookingsCountStmt->execute();
    $bookingsCount = $bookingsCountStmt->fetch()['total'];

    $needsSync = false;
    if ($bookingsCount == 0) {
        $needsSync = true;
        $syncReason = "No bookings in database";
    } elseif (!$lastSync || strtotime($lastSync) < strtotime('-1 hour')) {
        $needsSync = true;
        $syncReason = "Background sync (silent)";

        // ทำ sync แบบ background - ไม่ block user
        if (function_exists('fastcgi_finish_request')) {
            // Return response แต่ทำ sync ต่อ background
            echo json_encode([
                'success' => true,
                'data' => [
                    'sync_performed' => false,
                    'sync_reason' => 'Loading from database',
                    'stats' => getDashboardStats($pdo),
                    'recent_bookings' => getEnhancedRecentBookings($pdo),
                    'total_bookings' => (int)$bookingsCount,
                    'timestamp' => date('Y-m-d H:i:s')
                ]
            ]);
            fastcgi_finish_request();

            // Sync background (user ไม่เห็น)
            performEnhancedSync($pdo);
            exit;
        }
    }

    $syncResult = null;
    if ($needsSync) {
        // Perform auto sync
        $syncResult = performEnhancedSync($pdo);
    }

    // Get dashboard stats
    $statsResult = getDashboardStats($pdo);

    // Get recent bookings
    $recentBookings = getEnhancedRecentBookings($pdo);

    $response = [
        'success' => true,
        'data' => [
            'sync_performed' => $needsSync,
            'sync_reason' => $syncReason ?? 'No sync needed',
            'sync_result' => $syncResult,
            'stats' => $statsResult,
            'recent_bookings' => $recentBookings,
            'last_sync' => $lastSync,
            'total_bookings' => (int)$bookingsCount,
            'timestamp' => date('Y-m-d H:i:s')
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

function performEnhancedSync($pdo)
{
    // แก้ไขตรงนี้: เปลี่ยนจาก 30 วัน เป็น 7 วัน
    $dateFrom = date('Y-m-d\TH:i:s', strtotime('-3 days')); // เปลี่ยนจาก -30 days
    $dateTo = date('Y-m-d\TH:i:s');

    // Log sync start
    $syncStartSql = "INSERT INTO sync_status (sync_type, date_from, date_to, status, started_at) 
                     VALUES ('auto', :date_from, :date_to, 'running', NOW())";
    $syncStartStmt = $pdo->prepare($syncStartSql);
    $syncStartStmt->execute([
        ':date_from' => $dateFrom,
        ':date_to' => $dateTo
    ]);
    $syncId = $pdo->lastInsertId();

    try {
        // Step 1: Get bookings from Holiday Taxis search API
        $searchUrl = HolidayTaxisConfig::API_ENDPOINT . "/bookings/search/since/{$dateFrom}/until/{$dateTo}/page/1";

        $headers = [
            "API_KEY: " . HolidayTaxisConfig::API_KEY,
            "Content-Type: application/json",
            "Accept: application/json",
            "VERSION: " . HolidayTaxisConfig::API_VERSION
        ];

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $searchUrl,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {
            throw new Exception("Holiday Taxis Search API error: HTTP $httpCode - $response");
        }

        $searchData = json_decode($response, true);
        if (!$searchData || !isset($searchData['bookings'])) {
            throw new Exception('Invalid API response format');
        }

        // Convert bookings to array
        $bookingsData = $searchData['bookings'];
        if (is_object($bookingsData) || (is_array($bookingsData) && isset($bookingsData['booking_0']))) {
            $bookings = array_values((array)$bookingsData);
        } else {
            $bookings = $bookingsData;
        }

        $totalFound = count($bookings);
        $totalNew = 0;
        $totalUpdated = 0;
        $totalDetailed = 0;
        $errors = [];

        foreach ($bookings as $index => $booking) {
            try {
                // เพิ่ม delay ระหว่างการประมวลผลแต่ละ booking
                if ($index > 0) {
                    usleep(200000); // หน่วงเวลา 0.2 วินาที (200,000 microseconds)
                }

                // เช็คว่า booking มีอยู่หรือไม่
                $checkSql = "SELECT id FROM bookings WHERE booking_ref = :ref";
                $checkStmt = $pdo->prepare($checkSql);
                $checkStmt->execute([':ref' => $booking['ref']]);
                $exists = $checkStmt->fetch();

                // ดึงข้อมูล booking detail
                $detailData = getBookingDetail($booking['ref'], $headers);
                if ($detailData) {
                    $totalDetailed++;
                }

                // หน่วงเวลาก่อนเรียก Notes API
                usleep(100000); // หน่วงเวลา 0.1 วินาที

                // ดึงข้อมูล Notes (เพิ่มส่วนนี้!!!)
                $notesText = getBookingNotesFromAPI($booking['ref'], $headers);
                error_log("DEBUG: Got notes for " . $booking['ref'] . ": " . ($notesText ? substr($notesText, 0, 50) . '...' : 'NULL'));

                // ประมวลผลข้อมูล booking (ส่ง notes ไปด้วย)
                $processedData = processBookingData($booking, $detailData, $notesText);

                error_log("DEBUG: ProcessedData notes for " . $booking['ref'] . ": " . ($processedData['notes'] ? substr($processedData['notes'], 0, 50) . '...' : 'NULL'));

                if ($exists) {
                    updateExistingBooking($pdo, $booking['ref'], $processedData);
                    $totalUpdated++;
                } else {
                    insertNewBooking($pdo, $booking['ref'], $processedData);
                    $totalNew++;
                }
            } catch (Exception $e) {
                error_log("DEBUG: Error processing " . $booking['ref'] . ": " . $e->getMessage());
                $errors[] = "Booking {$booking['ref']}: " . $e->getMessage();
                continue;
            }
        }

        // Update sync status - success
        $updateSyncSql = "UPDATE sync_status SET 
                          total_found = :total_found,
                          total_new = :total_new, 
                          total_updated = :total_updated,
                          status = 'completed',
                          completed_at = NOW()
                          WHERE id = :sync_id";
        $updateSyncStmt = $pdo->prepare($updateSyncSql);
        $updateSyncStmt->execute([
            ':sync_id' => $syncId,
            ':total_found' => $totalFound,
            ':total_new' => $totalNew,
            ':total_updated' => $totalUpdated
        ]);

        return [
            'success' => true,
            'total_found' => $totalFound,
            'total_new' => $totalNew,
            'total_updated' => $totalUpdated,
            'total_detailed' => $totalDetailed,
            'errors' => $errors,
            'sync_id' => $syncId
        ];
    } catch (Exception $e) {
        // Update sync status - failed
        $updateSyncSql = "UPDATE sync_status SET 
                          status = 'failed',
                          error_message = :error,
                          completed_at = NOW()
                          WHERE id = :sync_id";
        $updateSyncStmt = $pdo->prepare($updateSyncSql);
        $updateSyncStmt->execute([
            ':sync_id' => $syncId,
            ':error' => $e->getMessage()
        ]);

        throw $e;
    }
}
function getBookingDetail($bookingRef, $headers)
{
    $detailUrl = HolidayTaxisConfig::API_ENDPOINT . "/bookings/{$bookingRef}";

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $detailUrl,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 20
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200) {
        return json_decode($response, true);
    }

    return null;
}

function getBookingNotesFromAPI($bookingRef, $headers)
{
    $notesUrl = HolidayTaxisConfig::API_ENDPOINT . "/bookings/notes/{$bookingRef}";

    error_log("DEBUG: Fetching notes for " . $bookingRef);

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $notesUrl,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 20
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    error_log("DEBUG: Notes HTTP Code for $bookingRef: " . $httpCode);

    if ($httpCode === 200) {
        $notesData = json_decode($response, true);

        error_log("DEBUG: Notes data for $bookingRef: " . json_encode($notesData));

        // แปลงข้อมูล Notes เป็น text
        if (isset($notesData['notes']) && isset($notesData['notes']['note_0'])) {
            $note = $notesData['notes']['note_0'];

            $noteText = $note['note'] ?? '';
            $noteDate = $note['notedate'] ?? '';
            $noteUser = $note['user'] ?? '';

            // เพิ่มข้อมูลเพิ่มเติม
            $flags = [];
            if (!empty($note['flightnoquery'])) $flags[] = 'Flight Query';
            if (!empty($note['wrongresort'])) $flags[] = 'Wrong Resort';

            $formattedNote = $noteText;
            if (!empty($noteDate)) $formattedNote .= "\n\nDate: " . $noteDate;
            if (!empty($noteUser)) $formattedNote .= "\nUser: " . $noteUser;
            if (!empty($flags)) $formattedNote .= "\nFlags: " . implode(', ', $flags);

            error_log("DEBUG: Formatted note for $bookingRef: " . $formattedNote);

            return $formattedNote;
        } else {
            error_log("DEBUG: No note_0 found in response for $bookingRef");
        }
    } else {
        error_log("DEBUG: Notes API failed for $bookingRef with code: " . $httpCode);
    }

    return null;
}

function processBookingData($searchBooking, $detailData, $notesText = null)
{
    error_log("DEBUG: ProcessBookingData for " . $searchBooking['ref'] . " - Notes: " . ($notesText ?: 'NULL'));

    $data = [
        // From search data
        'status' => $searchBooking['status'],
        'passenger_name' => $searchBooking['passengername'] ?? null,
        'passenger_phone' => $searchBooking['passengertelno'] ?? null,
        'vehicle_type' => $searchBooking['vehicle'] ?? null,
        'last_action_date' => $searchBooking['lastactiondate'] ?? date('Y-m-d H:i:s'),

        'notes' => $notesText,  // ← สำคัญ!!! ต้องมีบรรทัดนี้

        // Default values
        'pax_total' => 1,
        'adults' => 1,
        'children' => 0,
        'infants' => 0,
        'arrival_date' => $searchBooking['arrivaldate'] ?? null,
        'departure_date' => $searchBooking['departuredate'] ?? null,
        'pickup_date' => null,

        // Additional fields
        'booking_type' => null,
        'passenger_email' => null,
        'airport' => null,
        'airport_code' => null,
        'resort' => null,
        'accommodation_name' => null,
        'accommodation_address1' => null,
        'accommodation_address2' => null,
        'accommodation_tel' => null,
        'flight_no_arrival' => null,
        'flight_no_departure' => null,
        'from_airport' => null,
        'to_airport' => null
    ];

    // Process detail data if available
    if ($detailData && isset($detailData['booking'])) {
        $booking = $detailData['booking'];

        // General info
        if (isset($booking['general'])) {
            $general = $booking['general'];
            $data['booking_type'] = $general['bookingtype'] ?? null;
            $data['airport'] = $general['airport'] ?? null;
            $data['airport_code'] = $general['airportcode'] ?? null;
            $data['resort'] = $general['resort'] ?? null;
            $data['pax_total'] = (int)($general['pax'] ?? $data['pax_total']);
            $data['adults'] = (int)($general['adults'] ?? $data['adults']);
            $data['children'] = (int)($general['children'] ?? $data['children']);
            $data['infants'] = (int)($general['infants'] ?? $data['infants']);

            // Override with more accurate data from detail
            if (isset($general['passengername'])) $data['passenger_name'] = $general['passengername'];
            if (isset($general['passengertelno'])) $data['passenger_phone'] = $general['passengertelno'];
            if (isset($general['vehicle'])) $data['vehicle_type'] = $general['vehicle'];
        }

        // Arrival info
        if (isset($booking['arrival'])) {
            $arrival = $booking['arrival'];
            $data['arrival_date'] = $arrival['arrivaldate'] ?? $data['arrival_date'];
            $data['accommodation_name'] = $arrival['accommodationname'] ?? null;
            $data['accommodation_address1'] = $arrival['accommodationaddress1'] ?? null;
            $data['accommodation_address2'] = $arrival['accommodationaddress2'] ?? null;
            $data['accommodation_tel'] = $arrival['accommodationtel'] ?? null;
            $data['flight_no_arrival'] = $arrival['flightno'] ?? null;
            $data['from_airport'] = $arrival['fromairport'] ?? null;
        }

        // Departure info
        if (isset($booking['departure'])) {
            $departure = $booking['departure'];
            $data['departure_date'] = $departure['departuredate'] ?? $data['departure_date'];
            $data['pickup_date'] = $departure['pickupdate'] ?? null;
            $data['flight_no_departure'] = $departure['flightno'] ?? null;
            $data['to_airport'] = $departure['toairport'] ?? null;

            // Use departure accommodation if arrival not available
            if (!$data['accommodation_name']) {
                $data['accommodation_name'] = $departure['accommodationname'] ?? null;
                $data['accommodation_address1'] = $departure['accommodationaddress1'] ?? null;
                $data['accommodation_address2'] = $departure['accommodationaddress2'] ?? null;
                $data['accommodation_tel'] = $departure['accommodationtel'] ?? null;
            }
        }
    }

    // Determine pickup date if not set
    if (!$data['pickup_date']) {
        $data['pickup_date'] = $data['departure_date'] ?: $data['arrival_date'];
    }

    // Prepare raw data
    $data['raw_data'] = json_encode([
        'search_data' => $searchBooking,
        'detail_data' => $detailData,
        'processed_at' => date('Y-m-d H:i:s')
    ]);

    error_log("DEBUG: Final processedData notes for " . $searchBooking['ref'] . ": " . ($data['notes'] ?: 'NULL'));

    return $data;
}

function updateExistingBooking($pdo, $bookingRef, $data)
{
    error_log("DEBUG: Updating booking $bookingRef - Notes: " . ($data['notes'] ?: 'NULL'));

    // *** เพิ่ม Protection สำหรับ Notes ***
    // ถ้า notes ใหม่เป็น null/empty แต่ใน DB มี notes อยู่แล้ว ให้คงไว้
    if (empty($data['notes'])) {
        // เช็คว่าใน DB มี notes อยู่หรือไม่
        $checkNotesSql = "SELECT notes FROM bookings WHERE booking_ref = :ref AND notes IS NOT NULL AND notes != ''";
        $checkNotesStmt = $pdo->prepare($checkNotesSql);
        $checkNotesStmt->execute([':ref' => $bookingRef]);
        $existingNotes = $checkNotesStmt->fetchColumn();

        if ($existingNotes) {
            // ถ้ามี notes อยู่แล้ว ไม่ต้อง update notes
            unset($data['notes']);
            error_log("DEBUG: Protecting existing notes for $bookingRef");
        }
    }

    // สร้าง SQL query แบบ dynamic ตาม data ที่เหลือ
    $updateFields = [];
    $params = [':ref' => $bookingRef];

    $fieldMapping = [
        'status' => 'ht_status',
        'passenger_name' => 'passenger_name',
        'passenger_email' => 'passenger_email',
        'passenger_phone' => 'passenger_phone',
        'pax_total' => 'pax_total',
        'adults' => 'adults',
        'children' => 'children',
        'infants' => 'infants',
        'booking_type' => 'booking_type',
        'vehicle_type' => 'vehicle_type',
        'airport' => 'airport',
        'airport_code' => 'airport_code',
        'resort' => 'resort',
        'accommodation_name' => 'accommodation_name',
        'accommodation_address1' => 'accommodation_address1',
        'accommodation_address2' => 'accommodation_address2',
        'accommodation_tel' => 'accommodation_tel',
        'arrival_date' => 'arrival_date',
        'departure_date' => 'departure_date',
        'pickup_date' => 'pickup_date',
        'flight_no_arrival' => 'flight_no_arrival',
        'flight_no_departure' => 'flight_no_departure',
        'from_airport' => 'from_airport',
        'to_airport' => 'to_airport',
        'last_action_date' => 'last_action_date',
        'raw_data' => 'raw_data',
        'notes' => 'notes'
    ];

    foreach ($fieldMapping as $dataKey => $dbColumn) {
        if (isset($data[$dataKey])) {
            $updateFields[] = "$dbColumn = :$dataKey";
            $params[":$dataKey"] = $data[$dataKey];
        }
    }

    // เพิ่ม timestamp fields
    $updateFields[] = "synced_at = NOW()";
    $updateFields[] = "updated_at = NOW()";

    $sql = "UPDATE bookings SET " . implode(', ', $updateFields) . " WHERE booking_ref = :ref";

    error_log("DEBUG: SQL for $bookingRef: " . $sql);
    error_log("DEBUG: Will update notes? " . (isset($data['notes']) ? 'YES' : 'NO'));

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
}

function insertNewBooking($pdo, $bookingRef, $data)
{
    error_log("DEBUG: Inserting new booking $bookingRef - Notes: " . ($data['notes'] ?: 'NULL'));

    // สำหรับ booking ใหม่ ให้ insert ตามปกติ (รวม notes ถ้ามี)
    $sql = "INSERT INTO bookings (
                booking_ref, ht_status, passenger_name, passenger_email, passenger_phone,
                pax_total, adults, children, infants,
                booking_type, vehicle_type,
                airport, airport_code, resort,
                accommodation_name, accommodation_address1, accommodation_address2, accommodation_tel,
                arrival_date, departure_date, pickup_date,
                flight_no_arrival, flight_no_departure, from_airport, to_airport,
                last_action_date, raw_data, notes, synced_at
            ) VALUES (
                :ref, :status, :passenger_name, :passenger_email, :passenger_phone,
                :pax_total, :adults, :children, :infants,
                :booking_type, :vehicle_type,
                :airport, :airport_code, :resort,
                :accommodation_name, :accommodation_address1, :accommodation_address2, :accommodation_tel,
                :arrival_date, :departure_date, :pickup_date,
                :flight_no_arrival, :flight_no_departure, :from_airport, :to_airport,
                :last_action_date, :raw_data, :notes, NOW()
            )";

    $stmt = $pdo->prepare($sql);
    $params = $data;
    $params[':ref'] = $bookingRef;

    error_log("DEBUG: About to execute INSERT for $bookingRef with notes: " . ($params['notes'] ?: 'NULL'));

    $stmt->execute($params);
}

function getDashboardStats($pdo)
{
    $dateFrom = date('Y-m-d H:i:s', strtotime('-7 days'));
    $dateTo = date('Y-m-d H:i:s');

    $sql = "SELECT 
                ht_status,
                COUNT(*) as count
            FROM bookings 
            WHERE last_action_date BETWEEN :date_from AND :date_to
            GROUP BY ht_status";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':date_from' => $dateFrom,
        ':date_to' => $dateTo
    ]);
    $results = $stmt->fetchAll();

    $stats = [
        'newBookings' => 0,
        'confirmed' => 0,
        'cancelled' => 0,
        'amendments' => 0
    ];

    foreach ($results as $row) {
        switch ($row['ht_status']) {
            case 'PCON':
                $stats['newBookings'] = (int)$row['count'];
                break;
            case 'ACON':
                $stats['confirmed'] = (int)$row['count'];
                break;
            case 'ACAN':
                $stats['cancelled'] = (int)$row['count'];
                break;
            case 'PAMM':
            case 'AAMM':
                $stats['amendments'] += (int)$row['count'];
                break;
        }
    }

    // Get total bookings today
    $todaySql = "SELECT COUNT(*) as today_total 
                 FROM bookings 
                 WHERE DATE(created_at) = CURDATE()";
    $todayStmt = $pdo->prepare($todaySql);
    $todayStmt->execute();
    $todayResult = $todayStmt->fetch();

    return [
        'stats' => $stats,
        'totalToday' => (int)$todayResult['today_total'],
        'dateRange' => ['from' => $dateFrom, 'to' => $dateTo]
    ];
}

function getEnhancedRecentBookings($pdo)
{
    $sql = "SELECT 
                booking_ref,
                ht_status,
                passenger_name,
                passenger_phone,
                pax_total,
                booking_type,
                vehicle_type,
                airport,
                resort,
                accommodation_name,
                arrival_date,
                departure_date,
                pickup_date,
                last_action_date,
                created_at
            FROM bookings 
            WHERE last_action_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            ORDER BY last_action_date DESC 
            LIMIT 20";

    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $bookings = $stmt->fetchAll();

    return array_map(function ($booking) {
        return [
            'ref' => $booking['booking_ref'],
            'status' => $booking['ht_status'],
            'passenger' => [
                'name' => $booking['passenger_name'] ?? '-',
                'phone' => $booking['passenger_phone']
            ],
            'pax' => (int)$booking['pax_total'],
            'bookingType' => $booking['booking_type'],
            'vehicle' => $booking['vehicle_type'],
            'airport' => $booking['airport'],
            'resort' => $booking['resort'],
            'accommodation' => [
                'name' => $booking['accommodation_name']
            ],
            'arrivalDate' => $booking['arrival_date'],
            'departureDate' => $booking['departure_date'],
            'pickupDate' => $booking['pickup_date'],
            'lastActionDate' => $booking['last_action_date'],
            'createdAt' => $booking['created_at']
        ];
    }, $bookings);
}
