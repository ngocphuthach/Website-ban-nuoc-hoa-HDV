<?php
// Controller tiếp nhận request quản lý danh mục
class CategoryController {
    private CategoryService $categoryService;

    public function __construct(CategoryService $categoryService) {
        $this->categoryService = $categoryService;
    }

    public function index(): void {
        Response::success($this->categoryService->getAll());
    }

    public function show(int $id): void {
        Response::success($this->categoryService->getById($id));
    }

    public function store(array $data): void {
        $cat = $this->categoryService->create($data);
        Response::success($cat, 'Thêm danh mục thành công.', 201);
    }

    public function update(int $id, array $data): void {
        $cat = $this->categoryService->update($id, $data);
        Response::success($cat, 'Cập nhật danh mục thành công.');
    }

    public function destroy(int $id): void {
        $this->categoryService->delete($id);
        Response::success(null, 'Đã xóa danh mục.');
    }
}
