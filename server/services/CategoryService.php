<?php
// Service xử lý nghiệp vụ danh mục sản phẩm
class CategoryService {
    private CategoryRepository $categoryRepo;

    public function __construct(CategoryRepository $categoryRepo) {
        $this->categoryRepo = $categoryRepo;
    }

    public function getAll(): array {
        return $this->categoryRepo->getAll();
    }

    public function getById(int $id): array {
        $cat = $this->categoryRepo->findById($id);
        if (!$cat) {
            throw new RuntimeException('Không tìm thấy danh mục.', 404);
        }
        return $cat;
    }

    public function create(array $data): array {
        $name = Validator::requireField($data, 'name', 'tên danh mục');
        $slug = trim((string)($data['slug'] ?? ''));
        $slug = $slug !== '' ? Validator::toSlug($slug) : Validator::toSlug($name);

        if ($this->categoryRepo->findBySlug($slug)) {
            throw new InvalidArgumentException('Danh mục (slug) đã tồn tại.');
        }

        $id = $this->categoryRepo->create([
            'name' => $name,
            'slug' => $slug,
            'description' => trim((string)($data['description'] ?? '')),
        ]);
        return $this->getById($id);
    }

    public function update(int $id, array $data): array {
        $this->getById($id);
        $name = Validator::requireField($data, 'name', 'tên danh mục');
        $slug = trim((string)($data['slug'] ?? ''));
        $slug = $slug !== '' ? Validator::toSlug($slug) : Validator::toSlug($name);

        $existing = $this->categoryRepo->findBySlug($slug);
        if ($existing && (int)$existing['id'] !== $id) {
            throw new InvalidArgumentException('Slug danh mục đã tồn tại.');
        }

        $this->categoryRepo->update($id, [
            'name' => $name,
            'slug' => $slug,
            'description' => trim((string)($data['description'] ?? '')),
        ]);
        return $this->getById($id);
    }

    public function delete(int $id): void {
        $this->getById($id);
        $this->categoryRepo->delete($id);
    }
}
