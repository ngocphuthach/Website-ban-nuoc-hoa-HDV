<?php
// Middleware xác thực JWT HS256 tự viết (hỗ trợ thu hồi token khi đăng xuất)
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

    private static function revokeStorePath(): string {
        return sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'perfumestore_revoked_tokens.json';
    }

    private static function readRevokedStore(): array {
        $path = self::revokeStorePath();
        if (!file_exists($path)) {
            return [];
        }
        $data = json_decode((string)file_get_contents($path), true);
        if (!is_array($data)) {
            return [];
        }
        $now = time();
        return array_filter($data, fn($exp) => is_int($exp) && $exp > $now);
    }

    // Thu hồi JWT khi người dùng đăng xuất
    public static function revokeToken(string $token, array $config): void {
        $payload = self::verifyToken($token, $config['jwt']['secret']);
        if (!$payload) {
            return;
        }
        $store = self::readRevokedStore();
        $store[hash('sha256', $token)] = (int)$payload['exp'];
        file_put_contents(self::revokeStorePath(), json_encode($store), LOCK_EX);
    }

    public static function isTokenRevoked(string $token): bool {
        $store = self::readRevokedStore();
        return isset($store[hash('sha256', $token)]);
    }

    // Tạo JWT token từ payload
    public static function createToken(array $payload, string $secret, int $expire): string {
        $header = ['typ' => 'JWT', 'alg' => 'HS256'];
        $payload['iat'] = time();
        $payload['exp'] = time() + $expire;
        if (empty($payload['jti'])) {
            $payload['jti'] = bin2hex(random_bytes(8));
        }

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

        // Kiểm tra thời hạn token và định danh user
        if (!isset($payload['exp'], $payload['id']) || !is_int($payload['exp']) || $payload['exp'] <= time()) {
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

    // Lấy thông tin user từ token (trả về null nếu chưa đăng nhập hoặc token đã đăng xuất)
    public static function getUser(array $config): ?array {
        $token = self::getTokenFromHeader();
        if (!$token || self::isTokenRevoked($token)) {
            return null;
        }
        $payload = self::verifyToken($token, $config['jwt']['secret']);
        if (!$payload) {
            return null;
        }
        $q = Database::getInstance($config['db'])->prepare(
            'SELECT id, role, email, fullName FROM Users WHERE id = ?'
        );
        $q->execute([(int)$payload['id']]);
        $user = $q->fetch();
        return $user ?: null;
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
