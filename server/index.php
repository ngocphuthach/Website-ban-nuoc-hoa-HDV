<?php
// Entry point chính của RESTful API Server (theo kiến trúc hướng dịch vụ SOA)

// Nạp cấu hình và các lớp lõi
$config = require __DIR__ . '/config/config.php';
require_once __DIR__ . '/core/Database.php';
require_once __DIR__ . '/core/Response.php';
require_once __DIR__ . '/core/Validator.php';
require_once __DIR__ . '/core/Seeder.php';

// Nạp Middleware
require_once __DIR__ . '/middleware/CorsMiddleware.php';
require_once __DIR__ . '/middleware/AuthMiddleware.php';

// Nạp Repositories
require_once __DIR__ . '/repositories/UserRepository.php';
require_once __DIR__ . '/repositories/BrandRepository.php';
require_once __DIR__ . '/repositories/CategoryRepository.php';
require_once __DIR__ . '/repositories/ProductRepository.php';
require_once __DIR__ . '/repositories/OrderRepository.php';

// Nạp Services
require_once __DIR__ . '/services/AuthService.php';
require_once __DIR__ . '/services/ProductService.php';
require_once __DIR__ . '/services/BrandService.php';
require_once __DIR__ . '/services/CategoryService.php';
require_once __DIR__ . '/services/OrderService.php';
require_once __DIR__ . '/services/UserService.php';
require_once __DIR__ . '/services/ReportService.php';

// Nạp Controllers
require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/ProductController.php';
require_once __DIR__ . '/controllers/BrandController.php';
require_once __DIR__ . '/controllers/CategoryController.php';
require_once __DIR__ . '/controllers/OrderController.php';
require_once __DIR__ . '/controllers/UserController.php';
require_once __DIR__ . '/controllers/ReportController.php';
require_once __DIR__ . '/controllers/UploadController.php';

// Xử lý CORS ngay từ đầu
CorsMiddleware::handle();

try {
    // Khởi tạo kết nối Database
    $db = Database::getInstance($config['db']);

    // Tự động tạo bảng & nạp dữ liệu mẫu từ products.json nếu Database đang trống
    Seeder::ensureSeeded($db, $config);

    // Khởi tạo Repositories
    $userRepo = new UserRepository($db);
    $brandRepo = new BrandRepository($db);
    $categoryRepo = new CategoryRepository($db);
    $productRepo = new ProductRepository($db);
    $orderRepo = new OrderRepository($db);

    // Khởi tạo Services
    $authService = new AuthService($userRepo, $config);
    $userService = new UserService($userRepo);
    $brandService = new BrandService($brandRepo);
    $categoryService = new CategoryService($categoryRepo);
    $productService = new ProductService($productRepo);
    $orderService = new OrderService($orderRepo, $productRepo, $db);
    $reportService = new ReportService($db);

    // Khởi tạo Controllers
    $authController = new AuthController($authService, $userService);
    $productController = new ProductController($productService);
    $brandController = new BrandController($brandService);
    $categoryController = new CategoryController($categoryService);
    $orderController = new OrderController($orderService);
    $userController = new UserController($userService);
    $reportController = new ReportController($reportService);
    $uploadController = new UploadController();

    // Phân tích Method và Route
    $method = $_SERVER['REQUEST_METHOD'];
    $route = $_GET['route'] ?? '';
    if ($route === '') {
        $uriPath = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/';
        $scriptDir = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\');
        if ($scriptDir !== '' && strpos($uriPath, $scriptDir) === 0) {
            $uriPath = substr($uriPath, strlen($scriptDir));
        }
        $route = str_replace('/index.php', '', $uriPath);
    }
    $route = '/' . trim($route, '/');

    // Đọc JSON body từ client gửi lên
    $rawBody = file_get_contents('php://input');
    $body = json_decode($rawBody, true);
    if (!is_array($body)) {
        $body = $_POST ?? [];
    }

    // Định tuyến (Routing)
    if ($route === '/' || $route === '/health') {
        Response::success(['status' => 'running', 'service' => 'PerfumeStore SOA API']);
    }

    // --- AUTH ---
    elseif ($method === 'POST' && $route === '/auth/register') {
        $authController->register($body);
    } elseif ($method === 'POST' && $route === '/auth/login') {
        $authController->login($body);
    } elseif ($method === 'GET' && $route === '/auth/me') {
        $user = AuthMiddleware::requireUser($config);
        $authController->me($user);
    }

    // --- PRODUCTS ---
    elseif ($method === 'GET' && $route === '/products') {
        $productController->index($_GET);
    } elseif ($method === 'GET' && preg_match('#^/products/(\d+)$#', $route, $m)) {
        $productController->show((int)$m[1]);
    } elseif ($method === 'POST' && $route === '/products') {
        AuthMiddleware::requireAdmin($config);
        $productController->store($body);
    } elseif ($method === 'PUT' && preg_match('#^/products/(\d+)$#', $route, $m)) {
        AuthMiddleware::requireAdmin($config);
        $productController->update((int)$m[1], $body);
    } elseif ($method === 'DELETE' && preg_match('#^/products/(\d+)$#', $route, $m)) {
        AuthMiddleware::requireAdmin($config);
        $productController->destroy((int)$m[1]);
    }

    // --- BRANDS ---
    elseif ($method === 'GET' && $route === '/brands') {
        $brandController->index();
    } elseif ($method === 'GET' && preg_match('#^/brands/(\d+)$#', $route, $m)) {
        $brandController->show((int)$m[1]);
    } elseif ($method === 'POST' && $route === '/brands') {
        AuthMiddleware::requireAdmin($config);
        $brandController->store($body);
    } elseif ($method === 'PUT' && preg_match('#^/brands/(\d+)$#', $route, $m)) {
        AuthMiddleware::requireAdmin($config);
        $brandController->update((int)$m[1], $body);
    } elseif ($method === 'DELETE' && preg_match('#^/brands/(\d+)$#', $route, $m)) {
        AuthMiddleware::requireAdmin($config);
        $brandController->destroy((int)$m[1]);
    }

    // --- CATEGORIES ---
    elseif ($method === 'GET' && $route === '/categories') {
        $categoryController->index();
    } elseif ($method === 'GET' && preg_match('#^/categories/(\d+)$#', $route, $m)) {
        $categoryController->show((int)$m[1]);
    } elseif ($method === 'POST' && $route === '/categories') {
        AuthMiddleware::requireAdmin($config);
        $categoryController->store($body);
    } elseif ($method === 'PUT' && preg_match('#^/categories/(\d+)$#', $route, $m)) {
        AuthMiddleware::requireAdmin($config);
        $categoryController->update((int)$m[1], $body);
    } elseif ($method === 'DELETE' && preg_match('#^/categories/(\d+)$#', $route, $m)) {
        AuthMiddleware::requireAdmin($config);
        $categoryController->destroy((int)$m[1]);
    }

    // --- ORDERS ---
    elseif ($method === 'GET' && $route === '/orders') {
        AuthMiddleware::requireAdmin($config);
        $orderController->index($_GET);
    } elseif ($method === 'GET' && $route === '/orders/my') {
        $user = AuthMiddleware::requireUser($config);
        $orderController->myOrders($user);
    } elseif ($method === 'GET' && preg_match('#^/orders/(\d+)$#', $route, $m)) {
        $user = AuthMiddleware::requireUser($config);
        $orderController->show((int)$m[1], $user);
    } elseif ($method === 'POST' && $route === '/orders') {
        $user = AuthMiddleware::requireUser($config);
        $orderController->store($body, $user);
    } elseif ($method === 'PATCH' && preg_match('#^/orders/(\d+)/status$#', $route, $m)) {
        AuthMiddleware::requireAdmin($config);
        $orderController->updateStatus((int)$m[1], $body);
    } elseif ($method === 'PATCH' && preg_match('#^/orders/(\d+)/cancel$#', $route, $m)) {
        $user = AuthMiddleware::requireUser($config);
        $orderController->cancel((int)$m[1], $user);
    }

    // --- USERS ---
    elseif ($method === 'GET' && $route === '/users') {
        AuthMiddleware::requireAdmin($config);
        $userController->index();
    } elseif ($method === 'PUT' && $route === '/users/me') {
        $user = AuthMiddleware::requireUser($config);
        $userController->updateMe($body, $user);
    }

    // --- REPORTS ---
    elseif ($method === 'GET' && $route === '/reports/dashboard') {
        AuthMiddleware::requireAdmin($config);
        $reportController->dashboard();
    }

    // --- UPLOAD ---
    elseif ($method === 'POST' && $route === '/upload') {
        AuthMiddleware::requireAdmin($config);
        $uploadController->uploadImage();
    }

    // Không khớp route nào
    else {
        Response::error("Không tìm thấy đường dẫn: {$method} {$route}", 404);
    }
} catch (InvalidArgumentException $e) {
    Response::error($e->getMessage(), 400);
} catch (RuntimeException $e) {
    $code = $e->getCode();
    Response::error($e->getMessage(), ($code >= 400 && $code < 600) ? $code : 400);
} catch (Throwable $e) {
    Response::error('Lỗi hệ thống: ' . $e->getMessage(), 500);
}
