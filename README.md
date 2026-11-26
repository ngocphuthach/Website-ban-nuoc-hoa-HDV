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
- **Xây dựng hệ thống RESTful API chuẩn (OpenAPI 3.0):** Tự thiết kế bộ định tuyến (Router), tách biệt hoàn toàn nghiệp vụ Đăng ký (`POST /auth/register`, không tự động đăng nhập) & Đăng nhập (`POST /auth/login` có giới hạn 5 lần sai/15 phút), thu hồi **JWT (HS256)** khi đăng xuất (`POST /auth/logout`), phân quyền `user` / `admin`, kiểm tra tồn kho và xử lý giao dịch (Transaction) khi đặt hàng.
- **Tích hợp các dịch vụ nghiệp vụ mở rộng:**
  - **PaymentService:** Tích hợp thanh toán **VNPay Sandbox** kèm xác thực chữ ký HMAC-SHA512 và IPN (`FOR UPDATE`).
  - **NotificationService (Outbox Pattern):** Ghi nhận hàng đợi thông báo trạng thái đơn hàng vào `NotificationOutbox` và xử lý gửi email bất đồng bộ qua CLI worker (`tools/send-notifications.php`).
  - **StoreExtras:** Cung cấp dịch vụ gợi ý mùi hương theo ngân sách, đánh giá sản phẩm (chỉ khách đã nhận hàng) và danh sách yêu thích.
- **Xây dựng giao diện người dùng hiện đại (SPA):** Thiết kế giao diện **Maison Signature** kết hợp **Luxury Dark** (`Playfair Display` & `Be Vietnam Pro`), hỗ trợ Dual Range Slider lọc giá theo dung tích, sắp xếp theo giá (`price_asc`/`price_desc`), giỏ hàng, thanh toán và theo dõi đơn hàng.
  - **Quy tắc lọc giá theo dung tích:** API `GET /server/products?minPrice=500000&maxPrice=2000000&sort=price_asc` lọc theo giá bán thực tế sau giảm giá (`ROUND(price * (100 - discount) / 100)`) của từng phiên bản `ProductSizes`; sản phẩm hiển thị khi có ít nhất 1 dung tích thỏa khoảng giá (không trùng lặp).
- **Xây dựng trang quản trị (Admin Dashboard):** Thống kê doanh thu, biểu đồ trạng thái đơn hàng, quản lý sản phẩm (phân trang, upload nhiều ảnh trực tiếp), quản lý thương hiệu, danh mục, đơn hàng (kèm Modal chi tiết) và khách hàng.
- **Đóng gói và triển khai đồng nhất:** Sử dụng **Docker** và script khởi tạo `.env` tự động (`setup-local.ps1`) để chạy toàn bộ ứng dụng Web + MySQL nhanh chóng và an toàn.

---

## 4. Công Nghệ Sử Dụng

| Thành phần | Công nghệ / Chi tiết |
|------------|----------------------|
| **Frontend (Client)** | HTML5, CSS3 (Maison Signature & Luxury Dark, Typography `Playfair Display` + `Be Vietnam Pro`), JavaScript ES6+ (SPA Hash Router, Fetch API, Canvas Chart, Web Animations API) |
| **Backend (Server API)** | PHP 8.2 thuần, kiến trúc Layered SOA (`Controller`, `Service`, `Repository`), PDO Prepared Statements |
| **Xác thực & Bảo mật** | JWT HS256 tự cài đặt (hỗ trợ thu hồi token khi đăng xuất & rate limit đăng nhập sai), `password_hash` / `password_verify`, CORS Middleware, chống XSS, `.env`, `.htaccess` bảo vệ thư mục nội bộ |
| **Cơ sở dữ liệu** | MySQL 8.0 (12 bảng: `Users`, `Brands`, `Categories`, `Products`, `ProductSizes`, `ProductImages`, `Orders`, `OrderItems`, `Payments`, `NotificationOutbox`, `Reviews`, `Favorites`) |
| **Tài liệu & Kiểm thử** | OpenAPI 3.0 + Swagger UI (`server/docs/`), Unit Tests (`tests/unit.php`) |
| **Môi trường triển khai** | Docker, Docker Compose (`127.0.0.1:8080`), Apache 2.4 (`mod_rewrite`), PowerShell (`setup-local.ps1`) |

---

## 5. Cấu Trúc Thư Mục Dự Án

```text
HDV/
├── client/                         # Tầng giao diện người dùng (Frontend SPA)
│   ├── css/                        # Style hệ thống (style.css, luxury-v2.css, maison.css, signature.css, admin.css...)
│   ├── js/
│   │   ├── services/               # Service Layer gọi RESTful API (api, auth, product, brand, category, order, user, report)
│   │   ├── components/             # Thành phần dùng chung (toast, cart, product-card, gallery, maison, signature, store-extras)
│   │   ├── pages/                  # Controller các trang khách hàng (home, product-list, product-detail, checkout, profile, orders)
│   │   ├── admin/                  # Controller trang quản trị (dashboard, product-manager, order-manager, catalog-manager, report, signature-admin)
│   │   └── app.js                  # Hash SPA Router điều hướng chính
│   └── pages/
│       ├── index.html              # Trang chủ SPA khách hàng
│       └── admin.html              # Trang quản trị Admin
│
├── server/                         # Tầng dịch vụ Backend RESTful API (PHP + PDO + JWT)
│   ├── config/config.php           # Cấu hình kết nối Database, JWT Secret & VNPay/Mail env
│   ├── core/                       # Thành phần lõi (Database.php, Response.php, Validator.php, Seeder.php)
│   ├── middleware/                 # CorsMiddleware.php, AuthMiddleware.php
│   ├── repositories/               # Tầng truy vấn dữ liệu (User, Brand, Category, Product, Order)
│   ├── services/                   # Tầng xử lý nghiệp vụ (Auth, Product, Brand, Category, Order, User, Report, Payment, Notification, StoreExtras)
│   ├── controllers/                # Tầng tiếp nhận HTTP request & trả về JSON (kèm UploadController)
│   ├── database/products.json      # Dữ liệu mẫu tự động nạp khi Database trống
│   ├── docs/
│   │   ├── api-spec.yaml           # Tài liệu mô tả API chuẩn OpenAPI 3.0 (v2.1.0)
│   │   └── index.html              # Giao diện Swagger UI xem & test API trực tiếp
│   ├── index.php                   # Entry point & Router trung tâm
│   └── .htaccess                   # Cấu hình URL Rewrite cho Apache
│
├── tests/
│   └── unit.php                    # Unit tests kiểm tra JWT, OrderService transitions và chữ ký VNPay
├── tools/
│   └── send-notifications.php      # CLI worker xử lý gửi email từ bảng NotificationOutbox
├── pic/                            # Thư mục lưu hình ảnh sản phẩm, thương hiệu, banner và ảnh upload
├── Dockerfile                      # Cấu hình image PHP 8.2 + Apache + pdo_mysql + mod_rewrite
├── docker-compose.yml              # Khởi chạy đồng thời Web Server (127.0.0.1:8080) và MySQL 8.0
├── setup-local.ps1                 # Script sinh .env ngẫu nhiên và khởi chạy Docker Compose
├── index.php                       # Chuyển hướng trang gốc vào client/pages/index.html
└── README.md                       # Tài liệu giới thiệu và hướng dẫn triển khai
```

---

## 6. Cách Cài Đặt Và Triển Khai

### Yêu cầu hệ thống
- Đã cài đặt **Docker Desktop** (hoặc Docker Engine + Docker Compose).

### Các bước triển khai
1. **Mở terminal tại thư mục dự án** `HDV/`:
   ```bash
   cd d:\HDV
   ```
2. **Khởi tạo cấu hình `.env` và chạy hệ thống bằng Docker Compose:**
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\setup-local.ps1
   ```
   > Script sẽ tự động tạo file `.env` (chứa `JWT_SECRET` và `ADMIN_PASSWORD` ngẫu nhiên nếu chưa có) và khởi tạo 2 container (`perfumestore-soa` chạy PHP/Apache và `perfumestore-db` chạy MySQL 8.0). Trong lần truy cập API đầu tiên, `Seeder.php` sẽ tự động tạo đầy đủ **12 bảng dữ liệu** và nạp sẵn **49 sản phẩm**, **10 thương hiệu**, **3 danh mục** cùng tài khoản Admin.

3. **Truy cập ứng dụng trên trình duyệt:**
   - **Trang bán hàng (Client):** `http://localhost:8080/`
   - **Trang quản trị (Admin):** `http://localhost:8080/client/pages/admin.html`
   - **Tài liệu API (Swagger UI):** `http://localhost:8080/server/docs/`
   - **Kiểm tra trạng thái API:** `http://localhost:8080/server/health`

4. **Chạy Unit Test (bên trong container):**
   ```bash
   docker exec perfumestore-soa php /var/www/html/tests/unit.php
   ```

5. **Dừng hệ thống khi không sử dụng:**
   ```bash
   docker compose down
   ```
