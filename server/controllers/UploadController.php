<?php
// Controller xử lý upload hình ảnh sản phẩm lên thư mục /pic/uploads/
class UploadController {
    public function uploadImage(): void {
        if (empty($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
            Response::error('Vui lòng chọn file ảnh hợp lệ.', 400);
        }

        $file = $_FILES['image'];
        $allowedExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

        if (!in_array($ext, $allowedExt, true)) {
            Response::error('Chỉ hỗ trợ file ảnh (jpg, jpeg, png, webp, gif).', 400);
        }

        if ($file['size'] > 5 * 1024 * 1024) {
            Response::error('Kích thước ảnh tối đa 5MB.', 400);
        }

        $uploadDir = dirname(__DIR__, 2) . '/pic/uploads';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }

        $fileName = 'prod_' . time() . '_' . rand(1000, 9999) . '.' . $ext;
        $targetPath = $uploadDir . '/' . $fileName;

        if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
            Response::error('Không thể lưu file ảnh lên server.', 500);
        }

        Response::success([
            'path' => 'pic/uploads/' . $fileName
        ], 'Tải ảnh lên thành công.');
    }
}
