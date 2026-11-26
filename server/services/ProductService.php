<?php
// Service xử lý nghiệp vụ sản phẩm
class ProductService {
    private ProductRepository $productRepo;

    public function __construct(ProductRepository $productRepo) {
        $this->productRepo = $productRepo;
    }

    // Lấy danh sách sản phẩm kèm thông tin phân trang và lọc giá
    public function getAll(array $params): array {
        $page = max(1, (int)($params['page'] ?? 1));
        $limit = max(1, min(100, (int)($params['limit'] ?? 12)));
        $offset = ($page - 1) * $limit;

        $minPrice = $this->parseOptionalPrice($params['minPrice'] ?? null, 'Giá thấp nhất');
        $maxPrice = $this->parseOptionalPrice($params['maxPrice'] ?? null, 'Giá cao nhất');

        if ($minPrice !== null && $maxPrice !== null && $minPrice > $maxPrice) {
            throw new InvalidArgumentException('Giá thấp nhất không được lớn hơn giá cao nhất.');
        }

        $filters = [
            'brand' => $params['brand'] ?? '',
            'type' => $params['type'] ?? '',
            'search' => $params['search'] ?? '',
            'isFeatured' => $params['isFeatured'] ?? '',
            'isNew' => $params['isNew'] ?? '',
            'isSale' => !empty($params['isSale']),
            'minPrice' => $minPrice,
            'maxPrice' => $maxPrice,
            'sort' => $params['sort'] ?? '',
            'limit' => $limit,
            'offset' => $offset,
        ];

        $items = $this->productRepo->getAll($filters);
        $total = $this->productRepo->countAll($filters);
        $priceBounds = $this->productRepo->getPriceBounds();

        return [
            'items' => $items,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'totalPages' => max(1, (int)ceil($total / $limit)),
            'priceRange' => $priceBounds,
        ];
    }

    // Kiểm tra và chuẩn hóa tham số giá tùy chọn (cho phép bỏ trống)
    private function parseOptionalPrice($raw, string $label): ?float {
        if ($raw === null || trim((string)$raw) === '') {
            return null;
        }
        if (!is_numeric($raw)) {
            throw new InvalidArgumentException("{$label} không hợp lệ.");
        }
        $val = (float)$raw;
        if ($val < 0) {
            throw new InvalidArgumentException("{$label} không được là số âm.");
        }
        return $val;
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
        if (!array_key_exists('images', $data)) $data['images'] = $this->getById($id)['images'];
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

        $images = $data['images'] ?? [];
        if (!is_array($images) || count($images) > 5) throw new InvalidArgumentException('Tối đa 5 ảnh sản phẩm.');
        $primary = trim((string)($data['image'] ?? ''));
        $images = array_values(array_unique(array_filter(array_merge([$primary], $images))));
        if (count($images) > 5) throw new InvalidArgumentException('Tối đa 5 ảnh sản phẩm.');
        foreach ($images as $url) {
            if (!is_string($url) || strlen($url) > 1024 || !preg_match('~^pic/[a-zA-Z0-9_./ -]+\.(jpg|jpeg|png|webp|gif)$~i', $url) || str_contains($url, '..')) {
                throw new InvalidArgumentException('Ảnh phải là đường dẫn ảnh nội bộ hợp lệ.');
            }
        }
        return [
            'images' => $images,
            'code' => $code,
            'name' => $name,
            'image' => $images[0] ?? '',
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
