<?php
// Repository thao tác với bảng Categories
class CategoryRepository {
    private PDO $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    // Lấy tất cả danh mục kèm số lượng sản phẩm
    public function getAll(): array {
        $sql = 'SELECT c.*, COUNT(p.id) AS productCount
                FROM Categories c
                LEFT JOIN Products p ON p.type = c.slug OR p.type = c.name
                GROUP BY c.id
                ORDER BY c.name ASC';
        return $this->db->query($sql)->fetchAll();
    }

    // Tìm danh mục theo ID
    public function findById(int $id): ?array {
        $stmt = $this->db->prepare('SELECT * FROM Categories WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    // Tìm danh mục theo slug
    public function findBySlug(string $slug): ?array {
        $stmt = $this->db->prepare('SELECT * FROM Categories WHERE slug = ?');
        $stmt->execute([$slug]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    // Tạo danh mục mới
    public function create(array $data): int {
        $stmt = $this->db->prepare(
            'INSERT INTO Categories (name, slug, description) VALUES (?, ?, ?)'
        );
        $stmt->execute([
            $data['name'],
            $data['slug'],
            $data['description'] ?? null,
        ]);
        return (int)$this->db->lastInsertId();
    }

    // Cập nhật danh mục
    public function update(int $id, array $data): bool {
        $stmt = $this->db->prepare(
            'UPDATE Categories SET name = ?, slug = ?, description = ? WHERE id = ?'
        );
        return $stmt->execute([
            $data['name'],
            $data['slug'],
            $data['description'] ?? null,
            $id,
        ]);
    }

    // Xóa danh mục
    public function delete(int $id): bool {
        $stmt = $this->db->prepare('DELETE FROM Categories WHERE id = ?');
        return $stmt->execute([$id]);
    }
}
