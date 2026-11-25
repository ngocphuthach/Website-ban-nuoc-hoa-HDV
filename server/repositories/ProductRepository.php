<?php
// Repository thao tác với bảng Products và ProductSizes
class ProductRepository {
    private PDO $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    // Xây dựng câu điều kiện WHERE dùng chung cho getAll và countAll
    private function buildWhere(array $filters, array &$params): string {
        $conditions = [];

        if (!empty($filters['brand'])) {
            $conditions[] = 'p.brand = ?';
            $params[] = $filters['brand'];
        }
        if (!empty($filters['type'])) {
            $conditions[] = 'p.type = ?';
            $params[] = $filters['type'];
        }
        if (!empty($filters['search'])) {
            $conditions[] = '(p.name LIKE ? OR p.code LIKE ? OR p.brand LIKE ?)';
            $kw = '%' . trim($filters['search']) . '%';
            $params[] = $kw;
            $params[] = $kw;
            $params[] = $kw;
        }
        if (isset($filters['isFeatured']) && $filters['isFeatured'] !== '') {
            $conditions[] = 'p.isFeatured = ?';
            $params[] = (int)$filters['isFeatured'];
        }
        if (isset($filters['isNew']) && $filters['isNew'] !== '') {
            $conditions[] = 'p.isNew = ?';
            $params[] = (int)$filters['isNew'];
        }
        if (!empty($filters['isSale'])) {
            $conditions[] = 'p.discount > 0';
        }

        return $conditions ? 'WHERE ' . implode(' AND ', $conditions) : '';
    }

    // Lấy danh sách sản phẩm theo bộ lọc và phân trang
    public function getAll(array $filters = []): array {
        $params = [];
        $where = $this->buildWhere($filters, $params);

        $limit = max(1, (int)($filters['limit'] ?? 50));
        $offset = max(0, (int)($filters['offset'] ?? 0));

        // Hỗ trợ sắp xếp cơ bản
        $orderBy = 'p.id DESC';
        if (!empty($filters['sort'])) {
            if ($filters['sort'] === 'name_asc') $orderBy = 'p.name ASC';
            elseif ($filters['sort'] === 'discount_desc') $orderBy = 'p.discount DESC, p.id DESC';
            elseif ($filters['sort'] === 'newest') $orderBy = 'p.isNew DESC, p.id DESC';
        }

        $sql = "SELECT p.*, b.name AS brandName, c.name AS categoryName
                FROM Products p
                LEFT JOIN Brands b ON b.slug = p.brand OR b.name = p.brand
                LEFT JOIN Categories c ON c.slug = p.type OR c.name = p.type
                {$where}
                ORDER BY {$orderBy}
                LIMIT {$limit} OFFSET {$offset}";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        return $this->attachSizes($rows);
    }

    // Đếm tổng số sản phẩm thỏa điều kiện lọc
    public function countAll(array $filters = []): int {
        $params = [];
        $where = $this->buildWhere($filters, $params);
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM Products p {$where}");
        $stmt->execute($params);
        return (int)$stmt->fetchColumn();
    }

    // Tìm 1 sản phẩm theo ID kèm danh sách dung tích (sizes)
    public function findById(int $id): ?array {
        $sql = 'SELECT p.*, b.name AS brandName, c.name AS categoryName
                FROM Products p
                LEFT JOIN Brands b ON b.slug = p.brand OR b.name = p.brand
                LEFT JOIN Categories c ON c.slug = p.type OR c.name = p.type
                WHERE p.id = ?';
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) {
            return null;
        }
        $list = $this->attachSizes([$row]);
        return $list[0];
    }

    // Kiểm tra mã sản phẩm đã tồn tại chưa
    public function findByCode(string $code): ?array {
        $stmt = $this->db->prepare('SELECT * FROM Products WHERE code = ?');
        $stmt->execute([$code]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    // Tạo sản phẩm mới và lưu các dung tích
    public function create(array $data): int {
        $stmt = $this->db->prepare(
            'INSERT INTO Products (code, name, image, shortDesc, type, brand, discount, isNew, isFeatured)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $data['code'],
            $data['name'],
            $data['image'] ?? '',
            $data['shortDesc'] ?? '',
            $data['type'],
            $data['brand'],
            (int)($data['discount'] ?? 0),
            (int)(!empty($data['isNew'])),
            (int)(!empty($data['isFeatured'])),
        ]);
        $productId = (int)$this->db->lastInsertId();

        if (!empty($data['sizes']) && is_array($data['sizes'])) {
            $this->saveSizes($productId, $data['sizes']);
        }
        return $productId;
    }

    // Cập nhật thông tin sản phẩm
    public function update(int $id, array $data): bool {
        $stmt = $this->db->prepare(
            'UPDATE Products
             SET code = ?, name = ?, image = ?, shortDesc = ?, type = ?, brand = ?, discount = ?, isNew = ?, isFeatured = ?
             WHERE id = ?'
        );
        $ok = $stmt->execute([
            $data['code'],
            $data['name'],
            $data['image'] ?? '',
            $data['shortDesc'] ?? '',
            $data['type'],
            $data['brand'],
            (int)($data['discount'] ?? 0),
            (int)(!empty($data['isNew'])),
            (int)(!empty($data['isFeatured'])),
            $id,
        ]);

        if (isset($data['sizes']) && is_array($data['sizes'])) {
            $this->saveSizes($id, $data['sizes']);
        }
        return $ok;
    }

    // Xóa sản phẩm (bảng ProductSizes có ON DELETE CASCADE nhưng xóa rõ ràng cho an toàn)
    public function delete(int $id): bool {
        $this->db->prepare('DELETE FROM ProductSizes WHERE productId = ?')->execute([$id]);
        $stmt = $this->db->prepare('DELETE FROM Products WHERE id = ?');
        return $stmt->execute([$id]);
    }

    // Lưu danh sách dung tích cho sản phẩm
    public function saveSizes(int $productId, array $sizes): void {
        $this->db->prepare('DELETE FROM ProductSizes WHERE productId = ?')->execute([$productId]);
        $stmt = $this->db->prepare(
            'INSERT INTO ProductSizes (productId, ml, price, stock) VALUES (?, ?, ?, ?)'
        );
        foreach ($sizes as $size) {
            $ml = (int)($size['ml'] ?? 0);
            $price = (float)($size['price'] ?? 0);
            $stock = max(0, (int)($size['stock'] ?? 0));
            if ($ml > 0 && $price >= 0) {
                $stmt->execute([$productId, $ml, $price, $stock]);
            }
        }
    }

    // Lấy thông tin 1 size cụ thể để kiểm tra tồn kho khi đặt hàng
    public function findSize(int $productId, int $ml): ?array {
        $stmt = $this->db->prepare('SELECT * FROM ProductSizes WHERE productId = ? AND ml = ?');
        $stmt->execute([$productId, $ml]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    // Trừ tồn kho khi tạo đơn hàng
    public function decreaseStock(int $productId, int $ml, int $qty): void {
        $stmt = $this->db->prepare(
            'UPDATE ProductSizes SET stock = GREATEST(0, stock - ?) WHERE productId = ? AND ml = ?'
        );
        $stmt->execute([$qty, $productId, $ml]);
    }

    // Cộng lại tồn kho khi hủy đơn hàng
    public function increaseStock(int $productId, int $ml, int $qty): void {
        $stmt = $this->db->prepare(
            'UPDATE ProductSizes SET stock = stock + ? WHERE productId = ? AND ml = ?'
        );
        $stmt->execute([$qty, $productId, $ml]);
    }

    // Gắn mảng sizes vào từng sản phẩm
    private function attachSizes(array $products): array {
        if (empty($products)) {
            return [];
        }
        $ids = array_column($products, 'id');
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $this->db->prepare(
            "SELECT productId, ml, price, stock FROM ProductSizes WHERE productId IN ({$placeholders}) ORDER BY ml ASC"
        );
        $stmt->execute($ids);
        $allSizes = $stmt->fetchAll();

        $sizeMap = [];
        foreach ($allSizes as $s) {
            $pid = (int)$s['productId'];
            $sizeMap[$pid][] = [
                'ml' => (int)$s['ml'],
                'price' => (float)$s['price'],
                'stock' => (int)$s['stock'],
            ];
        }

        foreach ($products as &$p) {
            $p['id'] = (int)$p['id'];
            $p['discount'] = (int)$p['discount'];
            $p['isNew'] = (bool)$p['isNew'];
            $p['isFeatured'] = (bool)$p['isFeatured'];
            $p['sizes'] = $sizeMap[$p['id']] ?? [];
        }
        return $products;
    }
}
