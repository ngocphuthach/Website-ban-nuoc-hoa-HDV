<?php
// Service xử lý nghiệp vụ đăng ký, đăng nhập tách biệt và giới hạn đăng nhập sai
class AuthService {
    private UserRepository $userRepo;
    private array $config;

    private const MAX_FAILED_ATTEMPTS = 5;
    private const LOCKOUT_SECONDS = 900; // 15 phút

    public function __construct(UserRepository $userRepo, array $config) {
        $this->userRepo = $userRepo;
        $this->config = $config;
    }

    // Đăng ký tài khoản mới (CHỈ tạo tài khoản khách hàng, KHÔNG cấp JWT Token)
    public function register(array $data): array {
        $fullName = Validator::requireField($data, 'fullName', 'họ tên');
        Validator::requireMinLength($fullName, 2, 'Họ tên');

        $email = Validator::requireEmail($data, 'email');
        $password = Validator::requireField($data, 'password', 'mật khẩu');
        $confirmPassword = Validator::requireField($data, 'confirmPassword', 'mật khẩu xác nhận');

        // Kiểm tra độ mạnh mật khẩu: tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và số
        $this->validatePasswordStrength($password);

        if ($password !== $confirmPassword) {
            throw new InvalidArgumentException('Mật khẩu xác nhận không khớp.');
        }

        $phone = trim((string)($data['phone'] ?? ''));
        if ($phone !== '' && !Validator::isValidPhone($phone)) {
            throw new InvalidArgumentException('Số điện thoại không hợp lệ.');
        }

        if ($this->userRepo->findByEmail($email)) {
            throw new InvalidArgumentException('Email này đã được đăng ký.');
        }

        // Luôn gán quyền mặc định 'user', tuyệt đối không tin role gửi từ client
        $userId = $this->userRepo->create([
            'fullName' => $fullName,
            'email' => $email,
            'password' => password_hash($password, PASSWORD_DEFAULT),
            'phone' => $phone,
            'address' => trim((string)($data['address'] ?? '')),
            'role' => 'user',
        ]);

        $user = $this->userRepo->findById($userId);
        return ['user' => $user];
    }

    // Đăng nhập và chỉ cấp JWT Token khi xác thực thành công
    public function login(array $data): array {
        $email = Validator::requireEmail($data, 'email');
        $password = Validator::requireField($data, 'password', 'mật khẩu');

        $attemptKey = $this->getAttemptKey($email);
        $this->ensureNotRateLimited($attemptKey);

        $user = $this->userRepo->findByEmail($email);
        if (!$user || !password_verify($password, $user['password'])) {
            $this->recordFailedAttempt($attemptKey);
            throw new RuntimeException('Email hoặc mật khẩu không chính xác.', 401);
        }

        if (isset($user['status']) && $user['status'] === 'locked') {
            throw new RuntimeException('Tài khoản của bạn hiện đang bị tạm khóa.', 403);
        }

        // Đăng nhập thành công -> xóa lịch sử thất bại và tạo JWT từ dữ liệu DB
        $this->clearAttempts($attemptKey);
        unset($user['password']);

        $token = AuthMiddleware::createToken(
            ['id' => (int)$user['id'], 'email' => $user['email'], 'role' => $user['role']],
            $this->config['jwt']['secret'],
            (int)$this->config['jwt']['expire']
        );

        return ['token' => $token, 'user' => $user];
    }

    // Thu hồi token hiện tại khi người dùng đăng xuất
    public function logout(?string $token): void {
        if ($token) {
            AuthMiddleware::revokeToken($token, $this->config);
        }
    }

    private function validatePasswordStrength(string $password): void {
        if (mb_strlen($password) < 8) {
            throw new InvalidArgumentException('Mật khẩu phải có ít nhất 8 ký tự.');
        }
        if (!preg_match('/[A-Z]/', $password) || !preg_match('/[a-z]/', $password) || !preg_match('/[0-9]/', $password)) {
            throw new InvalidArgumentException('Mật khẩu phải bao gồm chữ hoa, chữ thường và chữ số.');
        }
    }

    private function attemptFilePath(): string {
        return sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'perfumestore_login_attempts.json';
    }

    private function getAttemptKey(string $email): string {
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'cli';
        return hash('sha256', $ip . '|' . strtolower(trim($email)));
    }

    private function readAttempts(): array {
        $path = $this->attemptFilePath();
        if (!file_exists($path)) {
            return [];
        }
        $data = json_decode((string)file_get_contents($path), true);
        if (!is_array($data)) {
            return [];
        }
        $now = time();
        return array_filter($data, fn($entry) => isset($entry['expiresAt']) && $entry['expiresAt'] > $now);
    }

    private function ensureNotRateLimited(string $key): void {
        $store = $this->readAttempts();
        if (isset($store[$key]) && ($store[$key]['count'] ?? 0) >= self::MAX_FAILED_ATTEMPTS) {
            throw new RuntimeException('Bạn đã đăng nhập sai quá 5 lần. Vui lòng thử lại sau 15 phút.', 429);
        }
    }

    private function recordFailedAttempt(string $key): void {
        $store = $this->readAttempts();
        $current = $store[$key]['count'] ?? 0;
        $store[$key] = [
            'count' => $current + 1,
            'expiresAt' => time() + self::LOCKOUT_SECONDS,
        ];
        file_put_contents($this->attemptFilePath(), json_encode($store), LOCK_EX);
    }

    private function clearAttempts(string $key): void {
        $store = $this->readAttempts();
        if (isset($store[$key])) {
            unset($store[$key]);
            file_put_contents($this->attemptFilePath(), json_encode($store), LOCK_EX);
        }
    }
}
