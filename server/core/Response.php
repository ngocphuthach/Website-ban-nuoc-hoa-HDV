<?php
// Lớp chuẩn hóa dữ liệu JSON trả về cho Client
class Response {
    // Trả về dữ liệu JSON kèm HTTP status code và dừng chương trình
    public static function json($data, int $code = 200): void {
        http_response_code($code);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Trả về phản hồi thành công
    public static function success($data = null, string $message = 'Thành công', int $code = 200): void {
        self::json([
            'success' => true,
            'message' => $message,
            'data' => $data,
        ], $code);
    }

    // Trả về phản hồi lỗi
    public static function error(string $message = 'Có lỗi xảy ra', int $code = 400): void {
        self::json([
            'success' => false,
            'message' => $message,
        ], $code);
    }
}
