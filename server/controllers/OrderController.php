<?php
// Controller tiếp nhận request đơn hàng
class OrderController {
    private OrderService $orderService;

    public function __construct(OrderService $orderService) {
        $this->orderService = $orderService;
    }

    public function index(array $params): void {
        Response::success($this->orderService->getAll($params));
    }

    public function myOrders(array $authUser): void {
        Response::success($this->orderService->getByCurrentUser((int)$authUser['id']));
    }

    public function show(int $id, array $authUser): void {
        $isAdmin = ($authUser['role'] ?? '') === 'admin';
        $order = $this->orderService->getById($id, (int)$authUser['id'], $isAdmin);
        Response::success($order);
    }

    public function store(array $data, array $authUser): void {
        $order = $this->orderService->create((int)$authUser['id'], $data);
        Response::success($order, 'Đặt hàng thành công.', 201);
    }

    public function updateStatus(int $id, array $data): void {
        $status = Validator::requireField($data, 'status', 'trạng thái');
        $order = $this->orderService->updateStatus($id, $status);
        Response::success($order, 'Cập nhật trạng thái đơn hàng thành công.');
    }

    public function cancel(int $id, array $authUser): void {
        $order = $this->orderService->cancel($id, (int)$authUser['id']);
        Response::success($order, 'Đã hủy đơn hàng thành công.');
    }
}
