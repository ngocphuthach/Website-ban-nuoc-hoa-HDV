<?php
// Service xử lý thông tin tài khoản người dùng
class UserService {
    private UserRepository $userRepo;

    public function __construct(UserRepository $userRepo) {
        $this->userRepo = $userRepo;
    }

    public function getAll(): array {
        return $this->userRepo->getAll();
    }

    public function getMe(int $userId): array {
        $user = $this->userRepo->findById($userId);
        if (!$user) {
            throw new RuntimeException('Không tìm thấy tài khoản.', 404);
        }
        return $user;
    }

    public function updateProfile(int $userId, array $data): array {
        $this->getMe($userId);
        $fullName = Validator::requireField($data, 'fullName', 'họ tên');
        $phone = trim((string)($data['phone'] ?? ''));
        if ($phone !== '' && !Validator::isValidPhone($phone)) {
            throw new InvalidArgumentException('Số điện thoại không hợp lệ.');
        }

        $this->userRepo->update($userId, [
            'fullName' => $fullName,
            'phone' => $phone,
            'address' => trim((string)($data['address'] ?? '')),
        ]);
        return $this->getMe($userId);
    }
}
