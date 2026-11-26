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

        // Lọc theo khoảng giá trên giá bán thực tế sau giảm giá của từng dung tích
        $minPrice = $filters['minPrice'] ?? null;
        $maxPrice = $filters['maxPrice'] ?? null;
        if ($minPrice !== null || $maxPrice !== null) {
            $sizeConds = ['ps.productId = p.id'];
            if ($minPrice !== null) {
                $sizeConds[] = 'ROUND(ps.price * (100 - p.discount) / 100) >= ?';
                $params[] = $minPrice;
            }
            if ($maxPrice !== null) {
                $sizeConds[] = 'ROUND(ps.price * (100 - p.discount) / 100) <= ?';
                $params[] = $maxPrice;
            }
            $conditions[] = 'EXISTS (SELECT 1 FROM ProductSizes ps WHERE ' . implode(' AND ', $sizeConds) . ')';
        }

        return $conditions ? 'WHERE ' . implode(' AND ', $conditions) : '';
    }

    // Lấy danh sách sản phẩm theo bộ lọc và phân trang
    public function getAll(array $filters = []): array {
        $params = [];
        $where = $this->buildWhere($filters, $params);

        $limit = min(100, max(1, (int)($filters['limit'] ?? 50)));
        $offset = max(0, (int)($filters['offset'] ?? 0));

        $minPrice = $filters['minPrice'] ?? null;
        $maxPrice = $filters['maxPrice'] ?? null;
        $orderParams = [];

        // Hỗ trợ sắp xếp theo giá (ưu tiên giá dung tích khớp bộ lọc nếu đang lọc giá)
        $orderBy = 'p.id DESC';
        $sort = $filters['sort'] ?? '';
        if ($sort === 'name_asc') {
            $orderBy = 'p.name ASC';
        } elseif ($sort === 'discount_desc') {
            $orderBy = 'p.discount DESC, p.id DESC';
        } elseif ($sort === 'newest') {
            $orderBy = 'p.isNew DESC, p.id DESC';
        } elseif ($sort === 'price_asc' || $sort === 'price_desc') {
            $agg = $sort === 'price_asc' ? 'MIN' : 'MAX';
            $dir = $sort === 'price_asc' ? 'ASC' : 'DESC';
            $subConds = ['ps2.productId = p.id'];
            if ($minPrice !== null) {
                $subConds[] = 'ROUND(ps2.price * (100 - p.discount) / 100) >= ?';
                $orderParams[] = $minPrice;
            }
            if ($maxPrice !== null) {
                $subConds[] = 'ROUND(ps2.price * (100 - p.discount) / 100) <= ?';
                $orderParams[] = $maxPrice;
            }
            $subWhere = implode(' AND ', $subConds);
            $orderBy = "(SELECT {$agg}(ROUND(ps2.price * (100 - p.discount) / 100)) FROM ProductSizes ps2 WHERE {$subWhere}) {$dir}, p.id DESC";
        }

        $sql = "SELECT p.*, b.name AS brandName, c.name AS categoryName
                FROM Products p
                LEFT JOIN Brands b ON b.slug = p.brand OR b.name = p.brand
                LEFT JOIN Categories c ON c.slug = p.type OR c.name = p.type
                {$where}
                ORDER BY {$orderBy}
                LIMIT {$limit} OFFSET {$offset}";

        $stmt = $this->db->prepare($sql);
        $stmt->execute(array_merge($params, $orderParams));
        $rows = $stmt->fetchAll();

        return $this->attachSizes($rows);
    }

    // Lấy khoảng giá thấp nhất & cao nhất thực tế trong Database (sau giảm giá)
    public function getPriceBounds(): array {
        $sql = 'SELECT
                    COALESCE(MIN(ROUND(ps.price * (100 - p.discount) / 100)), 0) AS minPrice,
                    COALESCE(MAX(ROUND(ps.price * (100 - p.discount) / 100)), 0) AS maxPrice
                FROM ProductSizes ps
                INNER JOIN Products p ON p.id = ps.productId';
        $row = $this->db->query($sql)->fetch();
        return [
            'min' => (int)($row['minPrice'] ?? 0),
            'max' => (int)($row['maxPrice'] ?? 0),
        ];
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
        $this->saveImages($productId, $data['images'] ?? []);
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
        if (isset($data['images'])) $this->saveImages($id, $data['images']);
        return $ok;
    }

    private function saveImages(int $id, array $images): void {
        $this->db->prepare('DELETE FROM ProductImages WHERE productId = ?')->execute([$id]);
        $stmt = $this->db->prepare('INSERT INTO ProductImages (productId, imageUrl, sortOrder) VALUES (?, ?, ?)');
        foreach ($images as $i => $url) $stmt->execute([$id, $url, $i]);
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
            'UPDATE ProductSizes SET stock = stock - ? WHERE productId = ? AND ml = ? AND stock >= ?'
        );
        $stmt->execute([$qty, $productId, $ml, $qty]);
        if ($stmt->rowCount() !== 1) throw new RuntimeException('Không đủ tồn kho.', 409);
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

        $stmt = $this->db->prepare("SELECT productId, imageUrl FROM ProductImages WHERE productId IN ({$placeholders}) ORDER BY sortOrder, id");
        $stmt->execute($ids);
        $imageMap = [];
        foreach ($stmt->fetchAll() as $row) $imageMap[(int)$row['productId']][] = $row['imageUrl'];
        foreach ($products as &$p) {
            $p['images'] = array_values(array_unique(array_filter(array_merge([$p['image']], $imageMap[(int)$p['id']] ?? []))));
            $p['id'] = (int)$p['id'];
            $p['discount'] = (int)$p['discount'];
            $p['isNew'] = (bool)$p['isNew'];
            $p['isFeatured'] = (bool)$p['isFeatured'];
            $p['sizes'] = $sizeMap[$p['id']] ?? [];
        }
        return $products;
    }
}
