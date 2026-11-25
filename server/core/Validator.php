<?php
// Lớp kiểm tra và chuẩn hóa dữ liệu đầu vào
class Validator {
    // Kiểm tra trường bắt buộc không được rỗng
    public static function requireField(array $data, string $field, string $label): string {
        $value = trim((string)($data[$field] ?? ''));
        if ($value === '') {
            throw new InvalidArgumentException("Vui lòng nhập {$label}.");
        }
        return $value;
    }

    // Kiểm tra định dạng email hợp lệ
    public static function requireEmail(array $data, string $field = 'email'): string {
        $email = strtolower(trim((string)($data[$field] ?? '')));
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new InvalidArgumentException('Email không hợp lệ.');
        }
        return $email;
    }

    // Kiểm tra độ dài tối thiểu của chuỗi
    public static function requireMinLength(string $value, int $min, string $label): string {
        if (mb_strlen($value) < $min) {
            throw new InvalidArgumentException("{$label} phải có ít nhất {$min} ký tự.");
        }
        return $value;
    }

    // Kiểm tra số điện thoại cơ bản
    public static function isValidPhone(string $phone): bool {
        return (bool)preg_match('/^[0-9+\-\s]{8,20}$/', trim($phone));
    }

    // Chuyển chuỗi tiếng Việt thành slug không dấu
    public static function toSlug(string $str): string {
        $str = mb_strtolower(trim($str), 'UTF-8');
        $unicode = [
            'a' => 'á|à|ả|ã|ạ|ă|ắ|ằ|ẳ|ẵ|ặ|â|ấ|ầ|ẩ|ẫ|ậ',
            'd' => 'đ',
            'e' => 'é|è|ẻ|ẽ|ẹ|ê|ế|ề|ể|ễ|ệ',
            'i' => 'í|ì|ỉ|ĩ|ị',
            'o' => 'ó|ò|ỏ|õ|ọ|ô|ố|ồ|ổ|ỗ|ộ|ơ|ớ|ờ|ở|ỡ|ợ',
            'u' => 'ú|ù|ủ|ũ|ụ|ư|ứ|ừ|ử|ữ|ự',
            'y' => 'ý|ỳ|ỷ|ỹ|ỵ',
        ];
        foreach ($unicode as $nonUnicode => $uni) {
            $str = preg_replace("/({$uni})/i", $nonUnicode, $str);
        }
        $str = preg_replace('/[^a-z0-9]+/', '-', $str);
        return trim($str, '-');
    }
}
