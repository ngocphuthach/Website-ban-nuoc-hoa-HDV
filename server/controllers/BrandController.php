<?php
// Controller tiếp nhận request quản lý thương hiệu
class BrandController {
    private BrandService $brandService;

    public function __construct(BrandService $brandService) {
        $this->brandService = $brandService;
    }

    public function index(): void {
        Response::success($this->brandService->getAll());
    }

    public function show(int $id): void {
        Response::success($this->brandService->getById($id));
    }

    public function store(array $data): void {
        $brand = $this->brandService->create($data);
        Response::success($brand, 'Thêm thương hiệu thành công.', 201);
    }

    public function update(int $id, array $data): void {
        $brand = $this->brandService->update($id, $data);
        Response::success($brand, 'Cập nhật thương hiệu thành công.');
    }

    public function destroy(int $id): void {
        $this->brandService->delete($id);
        Response::success(null, 'Đã xóa thương hiệu.');
    }
}
