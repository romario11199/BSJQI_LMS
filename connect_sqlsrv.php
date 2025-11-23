<?php
// connect_sqlsrv.php
// PDO connection to Microsoft SQL Server (sqlsrv driver)
// Usage: put this file in your webroot and browse to it, or run `php connect_sqlsrv.php` from CLI.

header('Content-Type: application/json; charset=utf-8');

// Configuration - update as needed or set environment variables
$server = getenv('DB_SERVER') ?: 'DESKTOP-P6M5VIB\\SQLEXPRESS';
$database = getenv('DB_DATABASE') ?: 'BSJQI_LMS';
$user = getenv('DB_USER') ?: 'sa';
$password = getenv('DB_PASSWORD') ?: 'SpecialProject2025';

$dsn = "sqlsrv:Server={$server};Database={$database}";

$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::SQLSRV_ATTR_DIRECT_QUERY => true
];

try {
    $pdo = new PDO($dsn, $user, $password, $options);

    // Test query - return current database name
    $stmt = $pdo->query('SELECT DB_NAME() AS dbname');
    $row = $stmt->fetch();

    echo json_encode([
        'success' => true,
        'message' => 'Connected to SQL Server successfully',
        'database' => $row['dbname'] ?? $database,
        'server' => $server
    ], JSON_UNESCAPED_UNICODE);

    // Optional migration: make Students.PhoneNumber nullable
    // Call this script with ?migrate=1 to run the ALTER TABLE if the column exists.
    if (isset($_GET['migrate']) && $_GET['migrate'] == '1') {
        try {
            // Only alter if column exists
            $checkSql = "SELECT COL_LENGTH('dbo.Students','PhoneNumber') AS ColLen, 
                                 COLUMNPROPERTY(OBJECT_ID('dbo.Students'),'PhoneNumber','AllowsNull') AS AllowsNull";
            $chk = $pdo->query($checkSql)->fetch();

            if ($chk && $chk['ColLen'] !== null) {
                // If AllowsNull is 1, nothing to do
                if (isset($chk['AllowsNull']) && intval($chk['AllowsNull']) === 1) {
                    echo json_encode(['migrate' => 'skipped', 'reason' => 'PhoneNumber already nullable']);
                } else {
                    $alterSql = "ALTER TABLE dbo.Students ALTER COLUMN PhoneNumber NVARCHAR(20) NULL";
                    $pdo->exec($alterSql);
                    echo json_encode(['migrate' => 'ok', 'sql' => $alterSql]);
                }
            } else {
                // Column not found — create it as nullable to satisfy existing references
                try {
                    $addSql = "ALTER TABLE dbo.Students ADD PhoneNumber NVARCHAR(20) NULL";
                    $pdo->exec($addSql);
                    echo json_encode(['migrate' => 'created', 'sql' => $addSql]);
                } catch (PDOException $e2) {
                    echo json_encode(['migrate' => 'error_creating', 'error' => $e2->getMessage()]);
                }
            }
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['migrate' => 'error', 'error' => $e->getMessage()]);
        }
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Connection failed',
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}

// Notes:
// - This script requires the Microsoft Drivers for PHP for SQL Server (pdo_sqlsrv/sqlsrv). Install from:
//   https://learn.microsoft.com/sql/connect/php/installation-tutorial
// - On Windows, enable the extension in php.ini (extension=php_pdo_sqlsrv.dll / php_sqlsrv.dll)
// - For production, avoid hardcoding credentials; use environment variables or a secure vault.

?>
