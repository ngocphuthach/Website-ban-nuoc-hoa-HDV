<?php
// Lớp kết nối Database dùng mẫu Singleton để tái sử dụng kết nối PDO
class Database {
    private static ?PDO $instance = null;

    // Không cho phép khởi tạo trực tiếp từ bên ngoài
    private function __construct() {}

    // Lấy kết nối PDO duy nhất
    public static function getInstance(array $dbConfig): PDO {
        if (self::$instance === null) {
            $dsn = sprintf(
                'mysql:host=%s;dbname=%s;charset=%s',
                $dbConfig['host'],
                $dbConfig['dbname'],
                $dbConfig['charset'] ?? 'utf8mb4'
            );

            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];

            self::$instance = new PDO($dsn, $dbConfig['username'], $dbConfig['password'], $options);
        }

        return self::$instance;
    }
}
