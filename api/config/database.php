<?php
// config/database.php - Database Configuration
class Database
{
    private $host = 'localhost:3306';
    private $dbname = 'tptravel_staff';
    private $username = 'samui_tptravel';
    private $password = 'g#0tz72W3';
    private $pdo;

    public function __construct()
    {
        try {
            $this->pdo = new PDO(
                "mysql:host={$this->host};dbname={$this->dbname};charset=utf8mb4",
                $this->username,
                $this->password,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false
                ]
            );
        } catch (PDOException $e) {
            throw new Exception("Database connection failed: " . $e->getMessage());
        }
    }

    public function getConnection()
    {
        return $this->pdo;
    }
}
