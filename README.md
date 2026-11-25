# ĐỒ ÁN MÔN HỌC: PHÁT TRIỂN ỨNG DỤNG HƯỚNG DỊCH VỤ (SOA)

## 1. Tên Đề Tài
**Xây dựng website bán nước hoa cao cấp (PerfumeStore)** theo kiến trúc hướng dịch vụ (**Service-Oriented Architecture – SOA**), tách biệt hoàn toàn giữa tầng giao diện (**Client SPA**) và tầng cung cấp dịch vụ (**RESTful API Server**).

---

## 2. Thông Tin Sinh Viên Thực Hiện

| STT | Họ và Tên | MSSV |
|:---:|-----------|------|
| 1 | **Thạch Ngọc Phú** | `110123039` |
| 2 | **Trần Quốc Thắng** | `110123048` |
| 3 | **Du Kiệt** | `110123022` |

---

## 3. Mục Tiêu Đề Tài
- **Áp dụng kiến trúc hướng dịch vụ (SOA) & phân tầng:** Tách biệt rõ ràng các tầng `Controller → Service → Repository → Database` ở Backend và tầng `ApiService` ở Frontend, giúp hệ thống dễ bảo trì, mở rộng và tái sử dụng dịch vụ.
- **Xây dựng hệ thống RESTful API chuẩn:** Tự thiết kế bộ định tuyến (Router), xác thực người dùng bằng **JWT (HS256)**, phân quyền `user` / `admin`, kiểm tra tồn kho và xử lý giao dịch (Transaction) khi đặt hàng.
- **Xây dựng giao diện người dùng hiện đại (SPA):** Thiết kế giao diện **Luxury Dark** (Đen & Vàng Gold) tích hợp hiệu ứng chuyển cảnh banner, lọc/tìm kiếm sản phẩm, giỏ hàng, thanh toán và theo dõi đơn hàng.
- **Xây dựng trang quản trị (Admin Dashboard):** Thống kê doanh thu, biểu đồ trạng thái đơn hàng, quản lý sản phẩm (phân trang, upload ảnh trực tiếp), và quản lý đơn hàng.
- **Đóng gói và triển khai đồng nhất:** Sử dụng **Docker** để chạy toàn bộ ứng dụng Web + MySQL nhanh chóng, không phụ thuộc môi trường cài đặt thủ công.

---

## 4. Công Nghệ Sử Dụng

| Thành phần | Công nghệ / Chi tiết |
|------------|----------------------|
| **Frontend (Client)** | HTML5, CSS3 (Luxury Dark Theme), JavaScript ES6+ (SPA Hash Router, Fetch API, Canvas Chart) |
| **Backend (Server API)** | PHP 8.2 thuần, kiến trúc Layered SOA (`Controller`, `Service`, `Repository`), PDO Prepared Statements |
| **Xác thực & Bảo mật** | JWT (HS256 tự cài đặt, không dùng thư viện ngoài), `password_hash` / `password_verify`, CORS Middleware |
| **Cơ sở dữ liệu** | MySQL 8.0 (`Users`, `Brands`, `Categories`, `Products`, `ProductSizes`, `Orders`, `OrderItems`) |
| **Tài liệu API** | OpenAPI 3.0 (`server/docs/api-spec.yaml`) |
| **Môi trường triển khai** | Docker, Docker Compose, Apache 2.4 (`mod_rewrite` với `.htaccess`) |

---

## 5. Cấu Trúc Thư Mục Dự Án

```text
HDV/
├── client/                         # Tầng giao diện người dùng (Frontend SPA)
│   ├── css/
│   │   ├── style.css               # Giao diện Luxury Dark cho khách hàng
│   │   └── admin.css               # Giao diện Dashboard cho quản trị viên
│   ├── js/
│   │   ├── services/               # Service Layer gọi RESTful API (api, auth, product, brand, category, order, user, report)
│   │   ├── components/             # Thành phần dùng chung (toast, cart, product-card)
│   │   ├── pages/                  # Controller các trang khách hàng (home, product-list, product-detail, checkout, profile, orders)
│   │   ├── admin/                  # Controller trang quản trị (dashboard, product-manager, order-manager, report)
│   │   └── app.js                  # Hash SPA Router điều hướng chính
│   └── pages/
│       ├── index.html              # Trang chủ SPA khách hàng
│       └── admin.html              # Trang quản trị Admin
│
├── server/                         # Tầng dịch vụ Backend RESTful API (PHP + PDO + JWT)
│   ├── config/config.php           # Cấu hình kết nối Database & JWT Secret
│   ├── core/                       # Thành phần lõi (Database.php, Response.php, Validator.php, Seeder.php)
│   ├── middleware/                 # CorsMiddleware.php, AuthMiddleware.php
│   ├── repositories/               # Tầng truy vấn dữ liệu (User, Brand, Category, Product, Order)
│   ├── services/                   # Tầng xử lý nghiệp vụ (Auth, Product, Brand, Category, Order, User, Report)
│   ├── controllers/                # Tầng tiếp nhận HTTP request & trả về JSON (kèm UploadController)
│   ├── database/products.json      # Dữ liệu mẫu tự động nạp khi Database trống
│   ├── docs/api-spec.yaml          # Tài liệu mô tả API chuẩn OpenAPI 3.0
│   ├── index.php                   # Entry point & Router trung tâm
│   └── .htaccess                   # Cấu hình URL Rewrite cho Apache
│
├── pic/                            # Thư mục lưu hình ảnh sản phẩm, thương hiệu, banner và ảnh upload
├── Dockerfile                      # Cấu hình image PHP 8.2 + Apache + pdo_mysql + mod_rewrite
├── docker-compose.yml              # Khởi chạy đồng thời Web Server (8080) và MySQL 8.0 (3306)
├── index.php                       # Chuyển hướng trang gốc vào client/pages/index.html
└── README.md                       # Tài liệu giới thiệu và hướng dẫn triển khai
```

---

## 6. Cách Cài Đặt Và Triển Khai

### Yêu cầu hệ thống
- Đã cài đặt **Docker Desktop** (hoặc Docker Engine + Docker Compose).

### Các bước triển khai
1. **Clone hoặc mở thư mục dự án** tại `HDV/`:
   ```bash
   cd d:\HDV
   ```
2. **Khởi chạy hệ thống bằng Docker Compose:**
   ```bash
   docker compose up -d --build
   ```
   > Hệ thống sẽ tự động khởi tạo 2 container (`perfumestore-soa` chạy PHP/Apache và `perfumestore-db` chạy MySQL 8.0). Trong lần truy cập API đầu tiên, `Seeder.php` sẽ tự động tạo đầy đủ 7 bảng dữ liệu và nạp sẵn 49 sản phẩm, 10 thương hiệu, 3 danh mục cùng tài khoản Admin.

3. **Truy cập ứng dụng trên trình duyệt:**
   - **Trang bán hàng (Client):** `http://localhost:8080/`
   - **Trang quản trị (Admin):** `http://localhost:8080/client/pages/admin.html`
   - **Kiểm tra trạng thái API:** `http://localhost:8080/server/health`

4. **Dừng hệ thống khi không sử dụng:**
   ```bash
   docker compose down
   ```
