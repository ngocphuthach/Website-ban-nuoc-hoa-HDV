<?php
// Middleware xác thực JWT HS256 tự viết (không dùng thư viện ngoài)
class AuthMiddleware {
    // Mã hóa base64url theo chuẩn JWT
    private static function base64UrlEncode(string $data): string {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    // Giải mã base64url
    private static function base64UrlDecode(string $data): string {
        $remainder = strlen($data) % 4;
        if ($remainder) {
            $data .= str_repeat('=', 4 - $remainder);
        }
        return base64_decode(strtr($data, '-_', '+/'));
    }

    // Tạo JWT token từ payload
    public static function createToken(array $payload, string $secret, int $expire): string {
        $header = ['typ' => 'JWT', 'alg' => 'HS256'];
        $payload['iat'] = time();
        $payload['exp'] = time() + $expire;

        $headerEncoded = self::base64UrlEncode(json_encode($header));
        $payloadEncoded = self::base64UrlEncode(json_encode($payload));

        $signature = hash_hmac('sha256', $headerEncoded . '.' . $payloadEncoded, $secret, true);
        $signatureEncoded = self::base64UrlEncode($signature);

        return $headerEncoded . '.' . $payloadEncoded . '.' . $signatureEncoded;
    }

    // Kiểm tra và giải mã JWT token
    public static function verifyToken(string $token, string $secret): ?array {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }

        [$headerEncoded, $payloadEncoded, $signatureEncoded] = $parts;
        $expectedSignature = self::base64UrlEncode(
            hash_hmac('sha256', $headerEncoded . '.' . $payloadEncoded, $secret, true)
        );

        // So sánh chữ ký an toàn
        if (!hash_equals($expectedSignature, $signatureEncoded)) {
            return null;
        }

        $payload = json_decode(self::base64UrlDecode($payloadEncoded), true);
        if (!is_array($payload)) {
            return null;
        }

        // Kiểm tra thời hạn token
        if (isset($payload['exp']) && $payload['exp'] < time()) {
            return null;
        }

        return $payload;
    }

    // Lấy Bearer token từ header Authorization
    public static function getTokenFromHeader(): ?string {
        $headers = function_exists('getallheaders') ? getallheaders() : [];
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? $_SERVER['HTTP_AUTHORIZATION'] ?? '';

        if (preg_match('/Bearer\s+(.+)/i', $authHeader, $matches)) {
            return trim($matches[1]);
        }
        return null;
    }

    // Lấy thông tin user từ token (trả về null nếu chưa đăng nhập)
    public static function getUser(array $config): ?array {
        $token = self::getTokenFromHeader();
        if (!$token) {
            return null;
        }
        return self::verifyToken($token, $config['jwt']['secret']);
    }

    // Bắt buộc phải đăng nhập mới được đi tiếp
    public static function requireUser(array $config): array {
        $user = self::getUser($config);
        if (!$user) {
            Response::error('Vui lòng đăng nhập để tiếp tục.', 401);
        }
        return $user;
    }

    // Bắt buộc phải có quyền admin
    public static function requireAdmin(array $config): array {
        $user = self::requireUser($config);
        if (($user['role'] ?? '') !== 'admin') {
            Response::error('Bạn không có quyền thực hiện thao tác này.', 403);
        }
        return $user;
    }
}
