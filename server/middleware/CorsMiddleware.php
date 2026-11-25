<?php
// Middleware xử lý CORS để Frontend gọi API không bị chặn trình duyệt
class CorsMiddleware {
    public static function handle(): void {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

        // Trả về 200 ngay nếu trình duyệt gửi request kiểm tra OPTIONS (preflight)
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(200);
            exit;
        }
    }
}
