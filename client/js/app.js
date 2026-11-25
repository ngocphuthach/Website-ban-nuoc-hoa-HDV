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

        // Form đăng nhập
        document.getElementById('login-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            try {
                const res = await this.authService.login(email, password);
                toast.success(`Chào mừng ${res.user.fullName}!`);
                this.updateNavbar();
                window.location.hash = res.user.role === 'admin' ? '#trang-chu' : '#trang-chu';
            } catch (err) {
                toast.error(err.message);
            }
        });

        // Form đăng ký
        document.getElementById('register-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                fullName: document.getElementById('reg-fullname').value.trim(),
                email: document.getElementById('reg-email').value.trim(),
                phone: document.getElementById('reg-phone').value.trim(),
                address: document.getElementById('reg-address').value.trim(),
                password: document.getElementById('reg-password').value
            };
            try {
                await this.authService.register(payload);
                toast.success('Đăng ký thành công!');
                this.updateNavbar();
                window.location.hash = '#trang-chu';
            } catch (err) {
                toast.error(err.message);
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
                    <span>${user.fullName}</span>
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

    logout() {
        this.authService.logout();
        this.updateNavbar();
        toast.info('Đã đăng xuất.');
        window.location.hash = '#trang-chu';
    }
}

const app = new App();
document.addEventListener('DOMContentLoaded', () => {
    // Chỉ chạy App router ở trang khách (index.html)
    if (document.getElementById('main-content')) {
        app.init();
    }
});
