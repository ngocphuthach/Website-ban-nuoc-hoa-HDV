<?php
// Service xử lý nghiệp vụ đặt hàng, hủy đơn và cập nhật trạng thái
class OrderService {
    private OrderRepository $orderRepo;
    private ProductRepository $productRepo;
    private PDO $db;

    public const VALID_STATUSES = [
        'Chờ xác nhận',
        'Đã xác nhận',
        'Đang giao',
        'Giao thành công',
        'Đã hủy',
    ];

    public function __construct(OrderRepository $orderRepo, ProductRepository $productRepo, PDO $db) {
        $this->orderRepo = $orderRepo;
        $this->productRepo = $productRepo;
        $this->db = $db;
    }

    // Admin lấy toàn bộ đơn hàng
    public function getAll(array $filters = []): array {
        return $this->orderRepo->getAll($filters);
    }

    // Khách hàng xem lịch sử đơn hàng của mình
    public function getByCurrentUser(int $userId): array {
        return $this->orderRepo->getByUserId($userId);
    }

    // Xem chi tiết 1 đơn hàng (kiểm tra quyền sở hữu nếu không phải admin)
    public function getById(int $id, int $userId, bool $isAdmin): array {
        $order = $this->orderRepo->findById($id);
        if (!$order) {
            throw new RuntimeException('Không tìm thấy đơn hàng.', 404);
        }
        if (!$isAdmin && (int)$order['userId'] !== $userId) {
            throw new RuntimeException('Bạn không có quyền xem đơn hàng này.', 403);
        }
        return $order;
    }

    // Tạo đơn hàng mới từ giỏ hàng và trừ tồn kho
    public function create(int $userId, array $data): array {
        $customerName = Validator::requireField($data, 'customerName', 'tên người nhận');
        $email = Validator::requireEmail($data, 'email');
        $phone = Validator::requireField($data, 'phone', 'số điện thoại');
        if (!Validator::isValidPhone($phone)) {
            throw new InvalidArgumentException('Số điện thoại không hợp lệ.');
        }
        $address = Validator::requireField($data, 'address', 'địa chỉ giao hàng');
        $paymentMethod = trim((string)($data['paymentMethod'] ?? 'COD')) ?: 'COD';

        $items = $data['items'] ?? [];
        if (empty($items) || !is_array($items)) {
            throw new InvalidArgumentException('Giỏ hàng trống, không thể đặt hàng.');
        }

        // Kiểm tra sản phẩm, giá và tồn kho từ DB để tránh client sửa giá
        $preparedItems = [];
        $total = 0;

        foreach ($items as $item) {
            $productId = (int)($item['productId'] ?? 0);
            $ml = (int)($item['ml'] ?? 0);
            $qty = max(1, (int)($item['quantity'] ?? 1));

            $product = $this->productRepo->findById($productId);
            if (!$product) {
                throw new InvalidArgumentException("Sản phẩm ID {$productId} không tồn tại.");
            }
            $sizeRow = $this->productRepo->findSize($productId, $ml);
            if (!$sizeRow) {
                throw new InvalidArgumentException("Sản phẩm {$product['name']} không có dung tích {$ml}ml.");
            }
            if ((int)$sizeRow['stock'] < $qty) {
                throw new InvalidArgumentException("Sản phẩm {$product['name']} ({$ml}ml) chỉ còn {$sizeRow['stock']} chai.");
            }

            // Tính giá sau giảm giá
            $basePrice = (float)$sizeRow['price'];
            $discount = (int)$product['discount'];
            $finalPrice = $discount > 0 ? round($basePrice * (100 - $discount) / 100) : $basePrice;

            $total += $finalPrice * $qty;
            $preparedItems[] = [
                'productId' => $productId,
                'productName' => $product['name'],
                'ml' => $ml,
                'price' => $finalPrice,
                'quantity' => $qty,
            ];
        }

        // Dùng transaction để đảm bảo tạo đơn và trừ kho đồng bộ
        $this->db->beginTransaction();
        try {
            $orderId = $this->orderRepo->create([
                'userId' => $userId,
                'customerName' => $customerName,
                'email' => $email,
                'phone' => $phone,
                'address' => $address,
                'total' => $total,
                'status' => 'Chờ xác nhận',
                'paymentMethod' => $paymentMethod,
            ]);

            foreach ($preparedItems as $pItem) {
                $this->orderRepo->addItem($orderId, $pItem);
                $this->productRepo->decreaseStock($pItem['productId'], $pItem['ml'], $pItem['quantity']);
            }

            $this->db->commit();
            return $this->orderRepo->findById($orderId);
        } catch (Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    // Admin cập nhật trạng thái đơn hàng
    public function updateStatus(int $id, string $status): array {
        if (!in_array($status, self::VALID_STATUSES, true)) {
            throw new InvalidArgumentException('Trạng thái đơn hàng không hợp lệ.');
        }
        $order = $this->orderRepo->findById($id);
        if (!$order) {
            throw new RuntimeException('Không tìm thấy đơn hàng.', 404);
        }

        // Nếu chuyển sang Đã hủy từ trạng thái khác, hoàn lại tồn kho
        if ($status === 'Đã hủy' && $order['status'] !== 'Đã hủy') {
            foreach ($order['items'] as $item) {
                $this->productRepo->increaseStock($item['productId'], $item['ml'], $item['quantity']);
            }
        }

        $this->orderRepo->updateStatus($id, $status);
        return $this->orderRepo->findById($id);
    }

    // Người dùng tự hủy đơn khi đang Chờ xác nhận
    public function cancel(int $id, int $userId): array {
        $order = $this->orderRepo->findById($id);
        if (!$order) {
            throw new RuntimeException('Không tìm thấy đơn hàng.', 404);
        }
        if ((int)$order['userId'] !== $userId) {
            throw new RuntimeException('Bạn không có quyền hủy đơn hàng này.', 403);
        }
        if ($order['status'] !== 'Chờ xác nhận') {
            throw new InvalidArgumentException('Chỉ có thể hủy đơn hàng đang ở trạng thái Chờ xác nhận.');
        }

        foreach ($order['items'] as $item) {
            $this->productRepo->increaseStock($item['productId'], $item['ml'], $item['quantity']);
        }
        $this->orderRepo->updateStatus($id, 'Đã hủy');
        return $this->orderRepo->findById($id);
    }
}
