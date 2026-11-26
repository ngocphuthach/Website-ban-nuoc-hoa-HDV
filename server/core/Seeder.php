<?php
// Lớp tự động khởi tạo bảng và nạp dữ liệu mẫu từ products.json nếu Database đang trống
class Seeder {
    public static function ensureSeeded(PDO $db, array $config): void {
        $flagPath = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'perfumestore_seeded_v2.flag';
        if (file_exists($flagPath)) {
            return;
        }

        $hasProducts = false;
        try {
            $count = (int)$db->query('SELECT COUNT(*) FROM Products')->fetchColumn();
            if ($count > 0) {
                $hasProducts = true;
            }
        } catch (Throwable $e) {
            // Bảng chưa tồn tại -> tiếp tục tạo bảng bên dưới
        }

        if ($hasProducts) {
            self::ensureGallery($db);
            self::ensureExtras($db);
            self::ensureBrandLogos($db);
            @file_put_contents($flagPath, (string)time());
            return;
        }
        self::createTables($db);
        self::ensureGallery($db);
        self::ensureExtras($db);
        self::seedDefaultAdmin($db, $config);
        self::seedCategories($db);
        self::seedProductsAndBrands($db);
        self::ensureBrandLogos($db);
        @file_put_contents($flagPath, (string)time());
    }

    private static function ensureExtras(PDO $db): void {
        $db->exec("CREATE TABLE IF NOT EXISTS Payments (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,orderId INT UNSIGNED NOT NULL UNIQUE,reference VARCHAR(64) NOT NULL UNIQUE,amount BIGINT UNSIGNED NOT NULL,state ENUM('pending','paid','failed') DEFAULT 'pending',gatewayReference VARCHAR(100) NULL,FOREIGN KEY(orderId) REFERENCES Orders(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        $db->exec("CREATE TABLE IF NOT EXISTS NotificationOutbox (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, orderId INT UNSIGNED NOT NULL, email VARCHAR(100) NOT NULL, status VARCHAR(50) NOT NULL, sentAt DATETIME NULL, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        $db->exec("CREATE TABLE IF NOT EXISTS Reviews (productId INT UNSIGNED NOT NULL,userId INT UNSIGNED NOT NULL,rating TINYINT UNSIGNED NOT NULL,comment TEXT NOT NULL,createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(productId,userId),FOREIGN KEY(productId) REFERENCES Products(id) ON DELETE CASCADE,FOREIGN KEY(userId) REFERENCES Users(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        $db->exec("CREATE TABLE IF NOT EXISTS Favorites (userId INT UNSIGNED NOT NULL,productId INT UNSIGNED NOT NULL,PRIMARY KEY(userId,productId),FOREIGN KEY(productId) REFERENCES Products(id) ON DELETE CASCADE,FOREIGN KEY(userId) REFERENCES Users(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    }
    private static function ensureGallery(PDO $db): void {
        $db->exec("CREATE TABLE IF NOT EXISTS ProductImages (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            productId INT UNSIGNED NOT NULL,
            imageUrl VARCHAR(1024) NOT NULL,
            sortOrder INT UNSIGNED NOT NULL DEFAULT 0,
            INDEX (productId, sortOrder),
            FOREIGN KEY (productId) REFERENCES Products(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    }

    private static function createTables(PDO $db): void {
        $queries = [
            "CREATE TABLE IF NOT EXISTS Users (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                fullName VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                phone VARCHAR(20) NULL,
                address VARCHAR(255) NULL,
                role ENUM('user','admin') NOT NULL DEFAULT 'user',
                createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

            "CREATE TABLE IF NOT EXISTS Brands (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                slug VARCHAR(50) NOT NULL UNIQUE,
                description VARCHAR(255) NULL,
                logo LONGTEXT NULL,
                createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

            "CREATE TABLE IF NOT EXISTS Categories (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                slug VARCHAR(50) NOT NULL UNIQUE,
                description VARCHAR(255) NULL,
                createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

            "CREATE TABLE IF NOT EXISTS Products (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(50) NOT NULL UNIQUE,
                name VARCHAR(150) NOT NULL,
                image LONGTEXT NULL,
                shortDesc VARCHAR(255) NULL,
                type VARCHAR(50) NOT NULL,
                brand VARCHAR(50) NOT NULL,
                discount TINYINT UNSIGNED NOT NULL DEFAULT 0,
                isNew TINYINT(1) NOT NULL DEFAULT 0,
                isFeatured TINYINT(1) NOT NULL DEFAULT 0,
                createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

            "CREATE TABLE IF NOT EXISTS ProductSizes (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                productId INT UNSIGNED NOT NULL,
                ml INT UNSIGNED NOT NULL,
                price DECIMAL(18,2) NOT NULL,
                stock INT UNSIGNED NOT NULL DEFAULT 0,
                UNIQUE KEY UQ_ProductSizes_Product_Ml (productId, ml),
                CONSTRAINT FK_ProductSizes_Products FOREIGN KEY (productId) REFERENCES Products(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

            "CREATE TABLE IF NOT EXISTS Orders (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                userId INT UNSIGNED NOT NULL,
                customerName VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL,
                phone VARCHAR(20) NOT NULL,
                address VARCHAR(255) NOT NULL,
                total DECIMAL(18,2) NOT NULL DEFAULT 0,
                status ENUM('Chờ xác nhận','Đã xác nhận','Đang giao','Giao thành công','Đã hủy') NOT NULL DEFAULT 'Chờ xác nhận',
                paymentMethod VARCHAR(50) NOT NULL DEFAULT 'COD',
                orderDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT FK_Orders_Users FOREIGN KEY (userId) REFERENCES Users(id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

            "CREATE TABLE IF NOT EXISTS OrderItems (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                orderId INT UNSIGNED NOT NULL,
                productId INT UNSIGNED NOT NULL,
                productName VARCHAR(150) NOT NULL,
                ml INT UNSIGNED NOT NULL,
                price DECIMAL(18,2) NOT NULL,
                quantity INT UNSIGNED NOT NULL,
                CONSTRAINT FK_OrderItems_Orders FOREIGN KEY (orderId) REFERENCES Orders(id) ON DELETE CASCADE,
                CONSTRAINT FK_OrderItems_Products FOREIGN KEY (productId) REFERENCES Products(id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        ];

        foreach ($queries as $sql) {
            $db->exec($sql);
        }
    }

    private static function seedDefaultAdmin(PDO $db, array $config): void {
        $adminEmail = $config['admin_email'] ?? 'admin@perfume.vn';
        $stmt = $db->prepare('SELECT id FROM Users WHERE email = ?');
        $stmt->execute([$adminEmail]);
        if (!$stmt->fetch()) {
            $ins = $db->prepare(
                'INSERT INTO Users (fullName, email, password, phone, address, role) VALUES (?, ?, ?, ?, ?, ?)'
            );
            $ins->execute([
                'PerfumeStore Admin',
                $adminEmail,
                password_hash(getenv('ADMIN_PASSWORD') ?: bin2hex(random_bytes(24)), PASSWORD_DEFAULT),
                '0900000000',
                'TP. Hồ Chí Minh',
                'admin'
            ]);
        }
    }

    private static function seedCategories(PDO $db): void {
        $cats = [
            ['Nước Hoa Nam', 'nam', 'Mùi hương mạnh mẽ, lịch lãm dành cho phái mạnh'],
            ['Nước Hoa Nữ', 'nu', 'Mùi hương quyến rũ, tinh tế dành cho phái đẹp'],
            ['Nước Hoa Unisex', 'unisex', 'Mùi hương phi giới tính độc đáo, cá tính'],
        ];
        $stmt = $db->prepare('INSERT IGNORE INTO Categories (name, slug, description) VALUES (?, ?, ?)');
        foreach ($cats as $c) {
            $stmt->execute($c);
        }
    }

    private static function seedProductsAndBrands(PDO $db): void {
        $jsonPath = dirname(__DIR__) . '/database/products.json';
        if (!file_exists($jsonPath)) {
            return;
        }
        $products = json_decode(file_get_contents($jsonPath), true);
        if (!is_array($products)) {
            return;
        }

        $brandNames = [
            'dior' => 'Dior',
            'chanel' => 'Chanel',
            'ysl' => 'Yves Saint Laurent',
            'gucci' => 'Gucci',
            'tomford' => 'Tom Ford',
            'creed' => 'Creed',
            'versace' => 'Versace',
            'armani' => 'Giorgio Armani',
            'ck' => 'Calvin Klein',
            'dg' => 'Dolce & Gabbana',
        ];

        $insBrand = $db->prepare('INSERT IGNORE INTO Brands (name, slug, description) VALUES (?, ?, ?)');
        $insProd = $db->prepare(
            'INSERT IGNORE INTO Products (code, name, image, shortDesc, type, brand, discount, isNew, isFeatured)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $insSize = $db->prepare(
            'INSERT IGNORE INTO ProductSizes (productId, ml, price, stock) VALUES (?, ?, ?, ?)'
        );

        foreach ($products as $idx => $p) {
            $brandSlug = strtolower(trim((string)($p['brand'] ?? 'other')));
            $bName = $brandNames[$brandSlug] ?? ucfirst($brandSlug);
            $insBrand->execute([$bName, $brandSlug, "Thương hiệu nước hoa {$bName} chính hãng"]);

            $code = trim((string)($p['id'] ?? 'SP-' . ($idx + 1)));
            $discount = (int)($p['discount'] ?? ($idx % 5 === 0 ? 15 : 0));
            $isNew = isset($p['isNew']) ? (int)$p['isNew'] : ($idx < 6 ? 1 : 0);
            $isFeatured = isset($p['isFeatured']) ? (int)$p['isFeatured'] : ($idx % 3 === 0 ? 1 : 0);

            $insProd->execute([
                $code,
                $p['name'] ?? 'Nước hoa',
                $p['image'] ?? '',
                $p['short'] ?? '',
                $p['type'] ?? 'unisex',
                $brandSlug,
                $discount,
                $isNew,
                $isFeatured,
            ]);

            $productId = (int)$db->lastInsertId();
            if ($productId > 0 && !empty($p['sizes']) && is_array($p['sizes'])) {
                foreach ($p['sizes'] as $s) {
                    $insSize->execute([
                        $productId,
                        (int)($s['ml'] ?? 100),
                        (float)($s['price'] ?? 0),
                        (int)($s['stock'] ?? 10),
                    ]);
                }
            }
        }
    }

    // Gắn ảnh logo có sẵn trong thư mục pic/ cho các thương hiệu chưa có logo
    private static function ensureBrandLogos(PDO $db): void {
        $logos = [
            'dior' => 'pic/diorthuonghieu.jpg',
            'chanel' => 'pic/chanelthuonghieu.jpg',
            'armani' => 'pic/thuonghieuarmani.jpg',
            'ck' => 'pic/thuonghieuCK.jpg',
            'creed' => 'pic/thuonghieucreed.jpg',
            'dg' => 'pic/thuonghieudg.jpg',
            'gucci' => 'pic/thuonghieugucci.jpg',
            'tomford' => 'pic/thuonghieutomford.jpg',
            'versace' => 'pic/thuonghieuversace.jpg',
            'ysl' => 'pic/thuonghieuysl.jpg',
        ];
        $stmt = $db->prepare("UPDATE Brands SET logo = ? WHERE slug = ? AND (logo IS NULL OR logo = '')");
        foreach ($logos as $slug => $path) {
            $stmt->execute([$path, $slug]);
        }
    }
}
