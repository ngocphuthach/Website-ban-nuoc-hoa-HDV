// Bộ điều hướng SPA chính (Hash Router) cho PerfumeStore Client
class App {
    constructor() {
        this.authService = new AuthService();
        this.homePage = new HomePage();
        this.productListPage = new ProductListPage();
        this.productDetailPage = new ProductDetailPage();
        this.checkoutPage = new CheckoutPage();
        this.profilePage = new ProfilePage();
        this.ordersPage = new OrdersPage();
        this.quickModalProduct = null;
        this.quickSelectedSize = null;
        this.pendingRedirectHash = null;
        this.isSubmittingLogin = false;
        this.isSubmittingRegister = false;
    }

    // Chỉ chấp nhận các đường dẫn nội bộ hợp lệ sau khi đăng nhập
    isSafeInternalHash(hash) {
        const allowed = new Set([
            '#trang-chu', '#trang-san-pham', '#trang-thuong-hieu',
            '#trang-gio-hang', '#trang-thanh-toan', '#trang-ho-so', '#trang-lich-su'
        ]);
        return typeof hash === 'string' && (allowed.has(hash) || /^#trang-chi-tiet\?id=\d+$/.test(hash));
    }

    togglePassword(inputId, btn) {
        const input = document.getElementById(inputId);
        if (!input) return;
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        const icon = btn?.querySelector('i');
        if (icon) {
            icon.className = show ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
        }
        btn?.setAttribute('aria-label', show ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu');
    }

    setFieldError(fieldId, msg) {
        const input = document.getElementById(fieldId);
        const errEl = document.getElementById(`${fieldId}-error`);
        if (input) input.classList.toggle('input-invalid', !!msg);
        if (errEl) errEl.textContent = msg || '';
    }

    clearFormErrors(ids) {
        ids.forEach(id => this.setFieldError(id, ''));
    }

    updatePasswordStrength(password) {
        const box = document.getElementById('reg-password-strength');
        const label = document.getElementById('reg-strength-text');
        if (!box || !label) return;

        let score = 0;
        if (password.length >= 8) score++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
        if (/\d/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password) || password.length >= 12) score++;

        if (!password) score = 0;
        box.dataset.level = String(score);
        const texts = ['', 'Yếu (cần ít nhất 8 ký tự, chữ hoa, chữ thường, số)', 'Trung bình', 'Mạnh', 'Rất mạnh'];
        label.textContent = texts[score] || '';
    }

    init() {
        this.updateNavbar();
        cart.updateBadge();
        cart.renderSidebar();
        this.setupGlobalEvents();

        window.addEventListener('hashchange', () => this.navigate());
        this.navigate();
    }

    setupGlobalEvents() {
        // Đổi màu navbar khi cuộn
        window.addEventListener('scroll', () => {
            const nav = document.querySelector('.navbar');
            if (nav) {
                nav.classList.toggle('scrolled', window.scrollY > 40);
            }
        });

        // Mở / đóng Cart Sidebar
        document.getElementById('btn-open-cart')?.addEventListener('click', () => this.toggleCartSidebar(true));
        document.getElementById('btn-close-cart')?.addEventListener('click', () => this.toggleCartSidebar(false));
        document.getElementById('cart-overlay')?.addEventListener('click', () => this.toggleCartSidebar(false));

        // Menu mobile hamburger
        document.getElementById('btn-mobile-menu')?.addEventListener('click', () => {
            document.querySelector('.nav-links')?.classList.toggle('open');
        });

        // Chỉ báo độ mạnh mật khẩu theo thời gian thực
        const regPassInput = document.getElementById('reg-password');
        regPassInput?.addEventListener('input', (e) => {
            this.updatePasswordStrength(e.target.value);
            this.setFieldError('reg-password', '');
        });

        // Xóa thông báo lỗi khi người dùng chỉnh sửa input
        ['login-email', 'login-password', 'reg-fullname', 'reg-email', 'reg-phone', 'reg-address', 'reg-confirm-password'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', () => this.setFieldError(id, ''));
        });

        // Form đăng nhập
        document.getElementById('login-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (this.isSubmittingLogin) return;

            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            this.clearFormErrors(['login-email', 'login-password']);

            let hasError = false;
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                this.setFieldError('login-email', 'Vui lòng nhập email hợp lệ.');
                hasError = true;
            }
            if (!password) {
                this.setFieldError('login-password', 'Vui lòng nhập mật khẩu.');
                hasError = true;
            }
            if (hasError) return;

            const btn = document.getElementById('login-submit-btn');
            this.isSubmittingLogin = true;
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Đang đăng nhập...';
            }

            try {
                const res = await this.authService.login(email, password);
                toast.success(`Chào mừng ${res.user.fullName}!`);
                this.updateNavbar();
                document.getElementById('login-password').value = '';

                if (res.user.role === 'admin') {
                    window.location.href = 'admin.html';
                    return;
                }

                const target = this.isSafeInternalHash(this.pendingRedirectHash)
                    ? this.pendingRedirectHash
                    : '#trang-chu';
                this.pendingRedirectHash = null;
                window.location.hash = target;
            } catch (err) {
                this.setFieldError('login-password', err.message);
                toast.error(err.message);
            } finally {
                this.isSubmittingLogin = false;
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = 'Đăng nhập';
                }
            }
        });

        // Form đăng ký (tách biệt hoàn toàn: tạo tài khoản xong chuyển sang Đăng nhập, KHÔNG tự đăng nhập)
        document.getElementById('register-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (this.isSubmittingRegister) return;

            const fullName = document.getElementById('reg-fullname').value.trim();
            const email = document.getElementById('reg-email').value.trim();
            const phone = document.getElementById('reg-phone').value.trim();
            const address = document.getElementById('reg-address').value.trim();
            const password = document.getElementById('reg-password').value;
            const confirmPassword = document.getElementById('reg-confirm-password').value;

            this.clearFormErrors(['reg-fullname', 'reg-email', 'reg-phone', 'reg-password', 'reg-confirm-password']);

            let hasError = false;
            if (fullName.length < 2) {
                this.setFieldError('reg-fullname', 'Họ và tên phải có ít nhất 2 ký tự.');
                hasError = true;
            }
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                this.setFieldError('reg-email', 'Email không hợp lệ.');
                hasError = true;
            }
            if (phone && !/^[0-9+\-\s]{8,20}$/.test(phone)) {
                this.setFieldError('reg-phone', 'Số điện thoại không hợp lệ.');
                hasError = true;
            }
            if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
                this.setFieldError('reg-password', 'Mật khẩu cần tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và chữ số.');
                hasError = true;
            }
            if (confirmPassword !== password || !confirmPassword) {
                this.setFieldError('reg-confirm-password', 'Mật khẩu xác nhận không khớp.');
                hasError = true;
            }
            if (hasError) return;

            const btn = document.getElementById('register-submit-btn');
            this.isSubmittingRegister = true;
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Đang tạo tài khoản...';
            }

            try {
                await this.authService.register({ fullName, email, phone, address, password, confirmPassword });

                // Tuyệt đối không lưu phiên hay mật khẩu; chỉ điền sẵn email ở form Đăng nhập
                this.authService.clearLocalSession();
                this.updateNavbar();

                document.getElementById('register-form')?.reset();
                this.updatePasswordStrength('');

                const loginEmailEl = document.getElementById('login-email');
                const loginPassEl = document.getElementById('login-password');
                if (loginEmailEl) loginEmailEl.value = email;
                if (loginPassEl) loginPassEl.value = '';

                toast.success('Đăng ký tài khoản thành công! Vui lòng đăng nhập để tiếp tục.');
                window.location.hash = '#trang-dang-nhap';
                setTimeout(() => loginPassEl?.focus(), 120);
            } catch (err) {
                const msg = err.message || 'Đăng ký thất bại.';
                if (msg.toLowerCase().includes('email')) {
                    this.setFieldError('reg-email', msg);
                } else {
                    this.setFieldError('reg-password', msg);
                }
                toast.error(msg);
            } finally {
                this.isSubmittingRegister = false;
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = 'Đăng ký tài khoản';
                }
            }
        });

        // Form liên hệ
        document.getElementById('contact-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            toast.success('Cảm ơn bạn! Tin nhắn đã được gửi đến PerfumeStore.');
            e.target.reset();
        });
    }

    toggleCartSidebar(open) {
        document.getElementById('cart-sidebar')?.classList.toggle('open', open);
        document.getElementById('cart-overlay')?.classList.toggle('active', open);
    }

    navigate() {
        let hash = window.location.hash || '#trang-chu';
        if (hash === '#') hash = '#trang-chu';

        // Hỗ trợ dạng #trang-chi-tiet?id=5
        const [sectionPart, queryPart] = hash.slice(1).split('?');
        const sectionId = sectionPart || 'trang-chu';
        const params = new URLSearchParams(queryPart || '');

        // Bảo vệ các trang yêu cầu đăng nhập
        const protectedSections = new Set(['trang-thanh-toan', 'trang-ho-so', 'trang-lich-su']);
        if (protectedSections.has(sectionId) && !this.authService.isLoggedIn()) {
            this.pendingRedirectHash = hash;
            toast.warning('Vui lòng đăng nhập để tiếp tục.');
            window.location.hash = '#trang-dang-nhap';
            return;
        }

        this.showSection(sectionId);
        document.querySelector('.nav-links')?.classList.remove('open');
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Gọi controller tương ứng
        if (sectionId === 'trang-chu' || sectionId === 'trang-thuong-hieu') {
            this.homePage.init();
        } else if (sectionId === 'trang-san-pham') {
            this.productListPage.init();
        } else if (sectionId === 'trang-chi-tiet') {
            const id = params.get('id');
            if (id) this.productDetailPage.init(id);
        } else if (sectionId === 'trang-gio-hang') {
            cart.renderCartPage();
        } else if (sectionId === 'trang-thanh-toan') {
            this.checkoutPage.init();
        } else if (sectionId === 'trang-ho-so') {
            this.profilePage.init();
        } else if (sectionId === 'trang-lich-su') {
            this.ordersPage.init();
        }
    }

    showSection(sectionId) {
        document.querySelectorAll('.page-section').forEach(sec => {
            sec.classList.toggle('active', sec.id === sectionId);
        });
    }

    openProductDetail(id) {
        window.location.hash = `#trang-chi-tiet?id=${id}`;
    }

    filterByBrand(slug) {
        this.productListPage.filters.brand = slug;
        this.productListPage.filters.page = 1;
        window.location.hash = '#trang-san-pham';
    }

    // Modal chọn nhanh dung tích từ thẻ sản phẩm
    openQuickSizeModal(encodedProduct) {
        try {
            const p = JSON.parse(decodeURIComponent(encodedProduct));
            this.quickModalProduct = p;
            const sizes = p.sizes || [];
            if (!sizes.length) {
                toast.warning('Sản phẩm chưa có thông tin dung tích.');
                return;
            }
            this.quickSelectedSize = sizes[0];

            document.getElementById('quick-modal-title').textContent = p.name;
            const box = document.getElementById('quick-modal-sizes');
            box.innerHTML = sizes.map((s, idx) => {
                const price = p.discount > 0 ? Math.round(s.price * (100 - p.discount) / 100) : s.price;
                return `
                    <button type="button" class="size-btn ${idx === 0 ? 'active' : ''}"
                        onclick="app.selectQuickSize(${idx}, this)">
                        ${s.ml}ml - ${cart.formatPrice(price)}
                    </button>`;
            }).join('');

            document.getElementById('size-modal').classList.add('active');
        } catch (e) {
            console.error(e);
        }
    }

    selectQuickSize(index, btn) {
        if (!this.quickModalProduct) return;
        this.quickSelectedSize = this.quickModalProduct.sizes[index];
        document.querySelectorAll('#quick-modal-sizes .size-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }

    confirmQuickAdd() {
        if (this.quickModalProduct && this.quickSelectedSize) {
            if (this.quickSelectedSize.stock <= 0) {
                toast.error('Dung tích này hiện đã hết hàng.');
                return;
            }
            cart.addItem(this.quickModalProduct, this.quickSelectedSize, 1);
            this.closeQuickModal();
        }
    }

    closeQuickModal() {
        document.getElementById('size-modal')?.classList.remove('active');
    }

    updateNavbar() {
        const area = document.getElementById('nav-user-area');
        if (!area) return;

        const user = this.authService.getCurrentUser();
        if (!user) {
            area.innerHTML = `
                <a href="#trang-dang-nhap" class="btn-outline btn-sm">Đăng nhập</a>
                <a href="#trang-dang-ky" class="btn-gold btn-sm">Đăng ký</a>
            `;
            return;
        }

        area.innerHTML = `
            <div class="user-dropdown">
                <button class="user-trigger">
                    <i class="fa-regular fa-user"></i>
                    <span>${escapeHtml(user.fullName)}</span>
                </button>
                <div class="user-dropdown-menu">
                    <a href="#trang-ho-so"><i class="fa-regular fa-id-card"></i> Hồ sơ cá nhân</a>
                    <a href="#trang-lich-su"><i class="fa-solid fa-box"></i> Đơn hàng của tôi</a>
                    ${user.role === 'admin' ? `<a href="admin.html"><i class="fa-solid fa-gauge"></i> Quản trị Admin</a>` : ''}
                    <button onclick="app.logout()"><i class="fa-solid fa-right-from-bracket"></i> Đăng xuất</button>
                </div>
            </div>
        `;
    }

    async logout() {
        await this.authService.logout();
        this.pendingRedirectHash = null;
        this.updateNavbar();
        toast.info('Đã đăng xuất tài khoản.');

        const protectedHashes = ['#trang-thanh-toan', '#trang-ho-so', '#trang-lich-su'];
        if (protectedHashes.includes(window.location.hash)) {
            window.location.hash = '#trang-dang-nhap';
        } else {
            window.location.hash = '#trang-chu';
        }
    }
}

const app = new App();
document.addEventListener('DOMContentLoaded', () => {
    // Chỉ chạy App router ở trang khách (index.html)
    if (document.getElementById('main-content')) {
        app.init();
    }
});
