<?php
// Service xử lý nghiệp vụ đăng ký, đăng nhập và tạo JWT
class AuthService {
    private UserRepository $userRepo;
    private array $config;

    public function __construct(UserRepository $userRepo, array $config) {
        $this->userRepo = $userRepo;
        $this->config = $config;
    }

    // Đăng ký tài khoản mới
    public function register(array $data): array {
        $fullName = Validator::requireField($data, 'fullName', 'họ tên');
        $email = Validator::requireEmail($data, 'email');
        $password = Validator::requireField($data, 'password', 'mật khẩu');
        Validator::requireMinLength($password, 6, 'Mật khẩu');

        if ($this->userRepo->findByEmail($email)) {
            throw new InvalidArgumentException('Email này đã được đăng ký.');
        }

        $role = ($email === ($this->config['admin_email'] ?? '')) ? 'admin' : 'user';
        $userId = $this->userRepo->create([
            'fullName' => $fullName,
            'email' => $email,
            'password' => password_hash($password, PASSWORD_DEFAULT),
            'phone' => trim((string)($data['phone'] ?? '')),
            'address' => trim((string)($data['address'] ?? '')),
            'role' => $role,
        ]);

        $user = $this->userRepo->findById($userId);
        $token = AuthMiddleware::createToken(
            ['id' => $user['id'], 'email' => $user['email'], 'role' => $user['role']],
            $this->config['jwt']['secret'],
            $this->config['jwt']['expire']
        );

        return ['token' => $token, 'user' => $user];
    }

    // Đăng nhập và trả về token + thông tin user
    public function login(array $data): array {
        $email = Validator::requireEmail($data, 'email');
        $password = Validator::requireField($data, 'password', 'mật khẩu');

        $user = $this->userRepo->findByEmail($email);
        if (!$user || !password_verify($password, $user['password'])) {
            throw new InvalidArgumentException('Email hoặc mật khẩu không chính xác.');
        }

        unset($user['password']);
        $token = AuthMiddleware::createToken(
            ['id' => $user['id'], 'email' => $user['email'], 'role' => $user['role']],
            $this->config['jwt']['secret'],
            $this->config['jwt']['expire']
        );

        return ['token' => $token, 'user' => $user];
    }
}
