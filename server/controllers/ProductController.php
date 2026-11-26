<?php
// Controller tiếp nhận request quản lý sản phẩm
class ProductController {
    private ProductService $productService;

    public function __construct(ProductService $productService) {
        $this->productService = $productService;
    }

    public function index(array $params): void {
        // Kiểm tra định dạng tham số giá nếu client có truyền
        foreach (['minPrice' => 'Giá thấp nhất', 'maxPrice' => 'Giá cao nhất'] as $key => $label) {
            if (isset($params[$key]) && trim((string)$params[$key]) !== '') {
                if (!is_numeric($params[$key])) {
                    throw new InvalidArgumentException("{$label} phải là số hợp lệ.");
                }
            }
        }
        $result = $this->productService->getAll($params);
        Response::success($result);
    }

    public function show(int $id): void {
        $product = $this->productService->getById($id);
        Response::success($product);
    }

    public function store(array $data): void {
        $product = $this->productService->create($data);
        Response::success($product, 'Thêm sản phẩm thành công.', 201);
    }

    public function update(int $id, array $data): void {
        $product = $this->productService->update($id, $data);
        Response::success($product, 'Cập nhật sản phẩm thành công.');
    }

    public function destroy(int $id): void {
        $this->productService->delete($id);
        Response::success(null, 'Đã xóa sản phẩm.');
    }
}
