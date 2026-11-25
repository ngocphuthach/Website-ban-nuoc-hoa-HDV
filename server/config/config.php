<?php
// Cấu hình hệ thống - Tự động ưu tiên biến môi trường Docker, fallback sang cấu hình mặc định
return [
    'db' => [
        'host' => getenv('DB_HOST') ?: 'sql300.infinityfree.com',
        'dbname' => getenv('DB_NAME') ?: 'if0_42526365_perfumestore',
        'username' => getenv('DB_USER') ?: 'if0_42526365',
        'password' => getenv('DB_PASS') ?: 'phungocthach8',
        'charset' => 'utf8mb4',
    ],
    'jwt' => [
        'secret' => 'dfe6daa695dc82e12138b4d373c7086878611a0d06b3b3bfac4c95a0c7ab68bdc70a099c1d43d1b92a71757711a5ef19',
        'expire' => 86400 * 7, // Hết hạn sau 7 ngày
    ],
    'admin_email' => 'admin@perfume.vn',
];
