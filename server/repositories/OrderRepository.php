<?php
// Repository thao tác với bảng Orders và OrderItems
class OrderRepository {
    private PDO $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    // Lấy toàn bộ đơn hàng (dành cho Admin) có lọc theo trạng thái
    public function getAll(array $filters = []): array {
        $conditions = [];
        $params = [];

        if (!empty($filters['status'])) {
            $conditions[] = 'status = ?';
            $params[] = $filters['status'];
        }
        if (!empty($filters['userId'])) {
            $conditions[] = 'userId = ?';
            $params[] = (int)$filters['userId'];
        }

        $where = $conditions ? 'WHERE ' . implode(' AND ', $conditions) : '';
        $limit = max(1, (int)($filters['limit'] ?? 100));
        $offset = max(0, (int)($filters['offset'] ?? 0));

        $stmt = $this->db->prepare(
            "SELECT * FROM Orders {$where} ORDER BY orderDate DESC, id DESC LIMIT {$limit} OFFSET {$offset}"
        );
        $stmt->execute($params);
        return $this->combineWithItems($stmt->fetchAll());
    }

    // Lấy đơn hàng của một người dùng cụ thể
    public function getByUserId(int $userId): array {
        $stmt = $this->db->prepare(
            'SELECT * FROM Orders WHERE userId = ? ORDER BY orderDate DESC, id DESC'
        );
        $stmt->execute([$userId]);
        return $this->combineWithItems($stmt->fetchAll());
    }

    // Tìm 1 đơn hàng theo ID
    public function findById(int $id): ?array {
        $stmt = $this->db->prepare('SELECT * FROM Orders WHERE id = ?');
        $stmt->execute([$id]);
        $order = $stmt->fetch();
        if (!$order) {
            return null;
        }
        $list = $this->combineWithItems([$order]);
        return $list[0];
    }

    // Tạo đơn hàng mới và trả về ID
    public function create(array $data): int {
        $stmt = $this->db->prepare(
            'INSERT INTO Orders (userId, customerName, email, phone, address, total, status, paymentMethod)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            (int)$data['userId'],
            $data['customerName'],
            $data['email'],
            $data['phone'],
            $data['address'],
            (float)$data['total'],
            $data['status'] ?? 'Chờ xác nhận',
            $data['paymentMethod'] ?? 'COD',
        ]);
        return (int)$this->db->lastInsertId();
    }

    // Thêm chi tiết sản phẩm vào đơn hàng
    public function addItem(int $orderId, array $item): void {
        $stmt = $this->db->prepare(
            'INSERT INTO OrderItems (orderId, productId, productName, ml, price, quantity)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $orderId,
            (int)$item['productId'],
            $item['productName'],
            (int)$item['ml'],
            (float)$item['price'],
            (int)$item['quantity'],
        ]);
    }

    // Cập nhật trạng thái đơn hàng
    public function updateStatus(int $id, string $status): bool {
        $stmt = $this->db->prepare('UPDATE Orders SET status = ? WHERE id = ?');
        return $stmt->execute([$status, $id]);
    }

    // Gắn danh sách OrderItems vào từng đơn hàng
    private function combineWithItems(array $orders): array {
        if (empty($orders)) {
            return [];
        }
        $ids = array_column($orders, 'id');
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $this->db->prepare(
            "SELECT oi.*, p.image AS productImage
             FROM OrderItems oi
             LEFT JOIN Products p ON p.id = oi.productId
             WHERE oi.orderId IN ({$placeholders})"
        );
        $stmt->execute($ids);
        $items = $stmt->fetchAll();

        $itemMap = [];
        foreach ($items as $item) {
            $oid = (int)$item['orderId'];
            $itemMap[$oid][] = [
                'id' => (int)$item['id'],
                'productId' => (int)$item['productId'],
                'productName' => $item['productName'],
                'productImage' => $item['productImage'] ?? '',
                'ml' => (int)$item['ml'],
                'price' => (float)$item['price'],
                'quantity' => (int)$item['quantity'],
            ];
        }

        // Lấy trạng thái thanh toán (VNPay/Payments) bằng 1 truy vấn duy nhất thay cho N+1 query
        $payStmt = $this->db->prepare(
            "SELECT orderId, state FROM Payments WHERE orderId IN ({$placeholders})"
        );
        $payStmt->execute($ids);
        $payMap = [];
        foreach ($payStmt->fetchAll() as $pRow) {
            $payMap[(int)$pRow['orderId']] = $pRow['state'];
        }

        foreach ($orders as &$order) {
            $order['id'] = (int)$order['id'];
            $order['userId'] = (int)$order['userId'];
            $order['total'] = (float)$order['total'];
            $order['items'] = $itemMap[$order['id']] ?? [];
            $order['paymentStatus'] = $payMap[$order['id']] ?? 'unverified';
        }
        return $orders;
    }
}
