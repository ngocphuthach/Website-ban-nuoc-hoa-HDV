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

        if (!in_array($paymentMethod, ['COD','Chuyển khoản','VNPay'], true)) throw new InvalidArgumentException('Phương thức thanh toán không hợp lệ.');
        if ($paymentMethod==='VNPay' && !PaymentService::enabled()) throw new RuntimeException('VNPay chưa được cấu hình.',503);
        $items = $data['items'] ?? [];
        if (empty($items) || !is_array($items)) {
            throw new InvalidArgumentException('Giỏ hàng trống, không thể đặt hàng.');
        }

        if (count($items)>100) throw new InvalidArgumentException('Quá nhiều dòng sản phẩm.');
        $merged=[];
        foreach ($items as $item) {
            if (!is_array($item)) throw new InvalidArgumentException('Sản phẩm không hợp lệ.');
            $id=filter_var($item['productId']??null,FILTER_VALIDATE_INT,['options'=>['min_range'=>1]]);
            $ml=filter_var($item['ml']??null,FILTER_VALIDATE_INT,['options'=>['min_range'=>1]]);
            $qty=filter_var($item['quantity']??null,FILTER_VALIDATE_INT,['options'=>['min_range'=>1,'max_range'=>100]]);
            if (!$id || !$ml || !$qty) throw new InvalidArgumentException('Sản phẩm hoặc số lượng không hợp lệ.');
            $key="$id:$ml";
            if (!isset($merged[$key])) $merged[$key]=['productId'=>$id,'ml'=>$ml,'quantity'=>0];
            $merged[$key]['quantity']+=$qty;
        }
        ksort($merged); $items=array_values($merged);
        // Kiểm tra sản phẩm, giá và tồn kho từ DB để tránh client sửa giá
        $preparedItems = [];
        $total = 0;

        foreach ($items as $item) {
            $productId = (int)($item['productId'] ?? 0);
            $ml = (int)($item['ml'] ?? 0);
            $qty = filter_var($item['quantity'] ?? null, FILTER_VALIDATE_INT, ['options'=>['min_range'=>1,'max_range'=>100]]);
            if ($qty === false) throw new InvalidArgumentException('Số lượng không hợp lệ.');

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

            NotificationService::enqueue($this->db,$orderId,$email,'Chờ xác nhận');
            $this->db->commit();
            return $this->orderRepo->findById($orderId);
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $e;
        }
    }

    public const TRANSITIONS = [
        'Chờ xác nhận'=>['Đã xác nhận','Đã hủy'], 'Đã xác nhận'=>['Đang giao','Đã hủy'],
        'Đang giao'=>['Giao thành công'], 'Giao thành công'=>[], 'Đã hủy'=>[]
    ];
    public function updateStatus(int $id, string $status): array {
        return $this->transition($id, $status, null);
    }
    public function cancel(int $id, int $userId): array {
        return $this->transition($id, 'Đã hủy', $userId);
    }
    private function transition(int $id, string $status, ?int $userId): array {
        $this->db->beginTransaction();
        try {
            $lock = $this->db->prepare('SELECT id FROM Orders WHERE id=? FOR UPDATE');
            $lock->execute([$id]); $lock->fetch(); $lock->closeCursor();
            $order = $this->orderRepo->findById($id);
            if (!$order) throw new RuntimeException('Không tìm thấy đơn hàng.',404);
            if ($userId !== null && (int)$order['userId'] !== $userId) throw new RuntimeException('Không có quyền.',403);
            if ($order['status'] !== $status) {
                if ($order['paymentMethod']==='VNPay') {
                    $q=$this->db->prepare('SELECT state FROM Payments WHERE orderId=?');$q->execute([$id]);$state=$q->fetchColumn();
                    if (($status==='Đã hủy' && in_array($state,['pending','paid'],true)) || ($status!=='Đã hủy' && $state!=='paid')) throw new RuntimeException('Cần đối soát giao dịch VNPay trước khi đổi trạng thái.',409);
                }
                if (($userId !== null && $order['status'] !== 'Chờ xác nhận') || !in_array($status,self::TRANSITIONS[$order['status']] ?? [],true)) throw new RuntimeException('Chuyển trạng thái không hợp lệ.',409);
                if ($status === 'Đã hủy') foreach ($order['items'] as $item) $this->productRepo->increaseStock($item['productId'],$item['ml'],$item['quantity']);
                $this->orderRepo->updateStatus($id,$status);
                NotificationService::enqueue($this->db,$id,$order['email'],$status);
            }
            $this->db->commit();
            return $this->orderRepo->findById($id);
        } catch (Throwable $e) { if ($this->db->inTransaction()) $this->db->rollBack(); throw $e; }
    }
}
