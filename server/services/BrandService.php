<?php
// Service xử lý nghiệp vụ thương hiệu
class BrandService {
    private BrandRepository $brandRepo;

    public function __construct(BrandRepository $brandRepo) {
        $this->brandRepo = $brandRepo;
    }

    public function getAll(): array {
        return $this->brandRepo->getAll();
    }

    public function getById(int $id): array {
        $brand = $this->brandRepo->findById($id);
        if (!$brand) {
            throw new RuntimeException('Không tìm thấy thương hiệu.', 404);
        }
        return $brand;
    }

    public function create(array $data): array {
        $name = Validator::requireField($data, 'name', 'tên thương hiệu');
        $slug = trim((string)($data['slug'] ?? ''));
        $slug = $slug !== '' ? Validator::toSlug($slug) : Validator::toSlug($name);

        if ($this->brandRepo->findBySlug($slug)) {
            throw new InvalidArgumentException('Thương hiệu (slug) đã tồn tại.');
        }

        $id = $this->brandRepo->create([
            'name' => $name,
            'slug' => $slug,
            'description' => trim((string)($data['description'] ?? '')),
            'logo' => trim((string)($data['logo'] ?? '')),
        ]);
        return $this->getById($id);
    }

    public function update(int $id, array $data): array {
        $this->getById($id);
        $name = Validator::requireField($data, 'name', 'tên thương hiệu');
        $slug = trim((string)($data['slug'] ?? ''));
        $slug = $slug !== '' ? Validator::toSlug($slug) : Validator::toSlug($name);

        $existing = $this->brandRepo->findBySlug($slug);
        if ($existing && (int)$existing['id'] !== $id) {
            throw new InvalidArgumentException('Slug thương hiệu đã tồn tại.');
        }

        $this->brandRepo->update($id, [
            'name' => $name,
            'slug' => $slug,
            'description' => trim((string)($data['description'] ?? '')),
            'logo' => trim((string)($data['logo'] ?? '')),
        ]);
        return $this->getById($id);
    }

    public function delete(int $id): void {
        $this->getById($id);
        $this->brandRepo->delete($id);
    }
}
