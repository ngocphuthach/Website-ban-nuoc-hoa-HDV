<?php
// Repository thao tác trực tiếp với bảng Users trong Database
class UserRepository {
    private PDO $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    // Tìm người dùng theo ID (ẩn mật khẩu)
    public function findById(int $id): ?array {
        $stmt = $this->db->prepare(
            'SELECT id, fullName, email, phone, address, role, createdAt FROM Users WHERE id = ?'
        );
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    // Tìm người dùng theo Email (lấy cả password để kiểm tra đăng nhập)
    public function findByEmail(string $email): ?array {
        $stmt = $this->db->prepare(
            'SELECT id, fullName, email, password, phone, address, role, createdAt FROM Users WHERE email = ?'
        );
        $stmt->execute([strtolower(trim($email))]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    // Tạo tài khoản mới và trả về ID vừa thêm
    public function create(array $data): int {
        $stmt = $this->db->prepare(
            'INSERT INTO Users (fullName, email, password, phone, address, role) VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $data['fullName'],
            strtolower(trim($data['email'])),
            $data['password'],
            $data['phone'] ?? null,
            $data['address'] ?? null,
            $data['role'] ?? 'user',
        ]);
        return (int)$this->db->lastInsertId();
    }

    // Cập nhật thông tin cá nhân người dùng
    public function update(int $id, array $data): bool {
        $stmt = $this->db->prepare(
            'UPDATE Users SET fullName = ?, phone = ?, address = ? WHERE id = ?'
        );
        return $stmt->execute([
            $data['fullName'],
            $data['phone'] ?? null,
            $data['address'] ?? null,
            $id,
        ]);
    }

    // Lấy toàn bộ danh sách người dùng (dành cho Admin)
    public function getAll(): array {
        $stmt = $this->db->query(
            'SELECT id, fullName, email, phone, address, role, createdAt FROM Users ORDER BY id DESC'
        );
        return $stmt->fetchAll();
    }
}
