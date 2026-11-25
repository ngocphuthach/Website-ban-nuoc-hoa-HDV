<?php
// Repository thao tác với bảng Brands
class BrandRepository {
    private PDO $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    // Lấy tất cả thương hiệu kèm số lượng sản phẩm của mỗi thương hiệu
    public function getAll(): array {
        $sql = 'SELECT b.*, COUNT(p.id) AS productCount
                FROM Brands b
                LEFT JOIN Products p ON p.brand = b.slug OR p.brand = b.name
                GROUP BY b.id
                ORDER BY b.name ASC';
        return $this->db->query($sql)->fetchAll();
    }

    // Tìm thương hiệu theo ID
    public function findById(int $id): ?array {
        $stmt = $this->db->prepare('SELECT * FROM Brands WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    // Tìm thương hiệu theo slug
    public function findBySlug(string $slug): ?array {
        $stmt = $this->db->prepare('SELECT * FROM Brands WHERE slug = ?');
        $stmt->execute([$slug]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    // Tạo thương hiệu mới
    public function create(array $data): int {
        $stmt = $this->db->prepare(
            'INSERT INTO Brands (name, slug, description, logo) VALUES (?, ?, ?, ?)'
        );
        $stmt->execute([
            $data['name'],
            $data['slug'],
            $data['description'] ?? null,
            $data['logo'] ?? null,
        ]);
        return (int)$this->db->lastInsertId();
    }

    // Cập nhật thương hiệu
    public function update(int $id, array $data): bool {
        $stmt = $this->db->prepare(
            'UPDATE Brands SET name = ?, slug = ?, description = ?, logo = ? WHERE id = ?'
        );
        return $stmt->execute([
            $data['name'],
            $data['slug'],
            $data['description'] ?? null,
            $data['logo'] ?? null,
            $id,
        ]);
    }

    // Xóa thương hiệu
    public function delete(int $id): bool {
        $stmt = $this->db->prepare('DELETE FROM Brands WHERE id = ?');
        return $stmt->execute([$id]);
    }
}
