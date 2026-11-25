<?php
// Service xử lý nghiệp vụ sản phẩm
class ProductService {
    private ProductRepository $productRepo;

    public function __construct(ProductRepository $productRepo) {
        $this->productRepo = $productRepo;
    }

    // Lấy danh sách sản phẩm kèm thông tin phân trang
    public function getAll(array $params): array {
        $page = max(1, (int)($params['page'] ?? 1));
        $limit = max(1, min(100, (int)($params['limit'] ?? 12)));
        $offset = ($page - 1) * $limit;

        $filters = [
            'brand' => $params['brand'] ?? '',
            'type' => $params['type'] ?? '',
            'search' => $params['search'] ?? '',
            'isFeatured' => $params['isFeatured'] ?? '',
            'isNew' => $params['isNew'] ?? '',
            'isSale' => !empty($params['isSale']),
            'sort' => $params['sort'] ?? '',
            'limit' => $limit,
            'offset' => $offset,
        ];

        $items = $this->productRepo->getAll($filters);
        $total = $this->productRepo->countAll($filters);

        return [
            'items' => $items,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'totalPages' => (int)ceil($total / $limit),
        ];
    }

    // Lấy chi tiết 1 sản phẩm
    public function getById(int $id): array {
        $product = $this->productRepo->findById($id);
        if (!$product) {
            throw new RuntimeException('Không tìm thấy sản phẩm.', 404);
        }
        return $product;
    }

    // Thêm sản phẩm mới
    public function create(array $data): array {
        $validated = $this->validateProduct($data);
        if ($this->productRepo->findByCode($validated['code'])) {
            throw new InvalidArgumentException('Mã sản phẩm đã tồn tại.');
        }
        $id = $this->productRepo->create($validated);
        return $this->getById($id);
    }

    // Cập nhật sản phẩm
    public function update(int $id, array $data): array {
        $this->getById($id);
        $validated = $this->validateProduct($data);
        $existing = $this->productRepo->findByCode($validated['code']);
        if ($existing && (int)$existing['id'] !== $id) {
            throw new InvalidArgumentException('Mã sản phẩm đã được dùng cho sản phẩm khác.');
        }
        $this->productRepo->update($id, $validated);
        return $this->getById($id);
    }

    // Xóa sản phẩm
    public function delete(int $id): void {
        $this->getById($id);
        $this->productRepo->delete($id);
    }

    // Kiểm tra dữ liệu đầu vào cho sản phẩm
    private function validateProduct(array $data): array {
        $name = Validator::requireField($data, 'name', 'tên sản phẩm');
        $code = trim((string)($data['code'] ?? ''));
        if ($code === '') {
            $code = strtoupper(substr(Validator::toSlug($name), 0, 12)) . '-' . rand(100, 999);
        }
        $brand = Validator::requireField($data, 'brand', 'thương hiệu');
        $type = Validator::requireField($data, 'type', 'phân loại');
        $discount = max(0, min(99, (int)($data['discount'] ?? 0)));

        $sizes = $data['sizes'] ?? [];
        if (empty($sizes) || !is_array($sizes)) {
            throw new InvalidArgumentException('Vui lòng thêm ít nhất 1 dung tích (ml) cho sản phẩm.');
        }

        return [
            'code' => $code,
            'name' => $name,
            'image' => trim((string)($data['image'] ?? '')),
            'shortDesc' => trim((string)($data['shortDesc'] ?? '')),
            'type' => $type,
            'brand' => $brand,
            'discount' => $discount,
            'isNew' => !empty($data['isNew']),
            'isFeatured' => !empty($data['isFeatured']),
            'sizes' => $sizes,
        ];
    }
}
