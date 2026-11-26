<?php
// Cấu hình hệ thống - Tự động ưu tiên biến môi trường Docker, fallback sang cấu hình mặc định
return [
    'db' => [
        'host' => getenv('DB_HOST') ?: '127.0.0.1',
        'dbname' => getenv('DB_NAME') ?: 'perfumestore',
        'username' => getenv('DB_USER') ?: 'perfumestore',
        'password' => getenv('DB_PASS') ?: '',
        'charset' => 'utf8mb4',
    ],
    'jwt' => [
        'secret' => getenv('JWT_SECRET') ?: throw new RuntimeException('JWT_SECRET chưa được cấu hình.'),
        'expire' => 3600 * 8, // Hết hạn sau 7 ngày
    ],
    'admin_email' => 'admin@perfume.vn',
];
