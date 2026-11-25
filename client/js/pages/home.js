// Controller xử lý Trang Chủ (#trang-chu) và Trang Thương Hiệu
class HomePage {
    constructor() {
        this.productService = new ProductService();
        this.brandService = new BrandService();
        this.slideIndex = 0;
        this.slideTimer = null;
    }

    async init() {
        this.initHeroSlider();
        await Promise.all([
            this.loadBrands(),
            this.loadFeaturedProducts(),
            this.loadSaleProducts(),
            this.loadNewProducts()
        ]);
        this.initScrollReveal();
    }

    initHeroSlider() {
        const slides = document.querySelectorAll('#hero-slider .hero-slide');
        const dotsBox = document.getElementById('hero-dots');
        if (!slides.length || !dotsBox) return;

        dotsBox.innerHTML = Array.from(slides).map((_, i) =>
            `<button type="button" class="hero-dot ${i === this.slideIndex ? 'active' : ''}" onclick="app.homePage.goToSlide(${i})"></button>`
        ).join('');

        this.restartSlideTimer();
    }

    goToSlide(idx) {
        const slides = document.querySelectorAll('#hero-slider .hero-slide');
        const dots = document.querySelectorAll('#hero-dots .hero-dot');
        if (!slides.length) return;

        this.slideIndex = (idx + slides.length) % slides.length;
        slides.forEach((s, i) => s.classList.toggle('active', i === this.slideIndex));
        dots.forEach((d, i) => d.classList.toggle('active', i === this.slideIndex));

        // Reset thanh progress
        const bar = document.getElementById('hero-progress-bar');
        if (bar) {
            bar.style.animation = 'none';
            void bar.offsetWidth;
            bar.style.animation = 'heroProgress 5s linear infinite';
        }
        this.restartSlideTimer();
    }

    nextSlide() {
        this.goToSlide(this.slideIndex + 1);
    }

    prevSlide() {
        this.goToSlide(this.slideIndex - 1);
    }

    restartSlideTimer() {
        clearInterval(this.slideTimer);
        this.slideTimer = setInterval(() => this.nextSlide(), 5000);
    }

    resolveImg(src) {
        if (!src) return 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=500';
        return src.startsWith('pic/') ? '../../' + src : src;
    }

    async loadBrands() {
        const slider = document.getElementById('home-brand-slider');
        const brandGrid = document.getElementById('brand-page-grid');
        try {
            const brands = await this.brandService.getAll();
            if (slider) {
                const itemsHtml = brands.map(b => {
                    const logo = this.resolveImg(b.logo);
                    return `
                        <a href="#trang-san-pham" class="brand-pill" onclick="app.filterByBrand('${b.slug}')">
                            <img src="${logo}" alt="${b.name}" class="brand-pill-logo">
                            <div>
                                <span>${b.name}</span>
                                <small>${b.productCount || 0} sản phẩm</small>
                            </div>
                        </a>
                    `;
                }).join('');
                slider.innerHTML = itemsHtml + itemsHtml;
            }
            if (brandGrid) {
                brandGrid.innerHTML = brands.map(b => {
                    const logo = this.resolveImg(b.logo);
                    return `
                        <div class="brand-card reveal" onclick="app.filterByBrand('${b.slug}')">
                            <div class="brand-card-media">
                                <img src="${logo}" alt="${b.name}" loading="lazy">
                            </div>
                            <div class="brand-card-body">
                                <h3>${b.name}</h3>
                                <p>${b.description || 'Bộ sưu tập nước hoa chính hãng cao cấp.'}</p>
                                <span class="brand-count">${b.productCount || 0} tuyệt tác hương thơm</span>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        } catch (err) {
            console.error('Lỗi tải thương hiệu:', err);
        }
    }

    async loadFeaturedProducts() {
        const container = document.getElementById('home-featured-grid');
        if (!container) return;
        try {
            const res = await this.productService.getAll({ isFeatured: 1, limit: 8 });
            const items = res.items || [];
            container.innerHTML = items.length
                ? items.map(createProductCard).join('')
                : '<p class="empty-msg">Chưa có sản phẩm nổi bật.</p>';
        } catch (err) {
            container.innerHTML = `<p class="empty-msg">${err.message}</p>`;
        }
    }

    async loadSaleProducts() {
        const container = document.getElementById('home-sale-grid');
        if (!container) return;
        try {
            const res = await this.productService.getAll({ isSale: 1, sort: 'discount_desc', limit: 4 });
            const items = res.items || [];
            container.innerHTML = items.length
                ? items.map(createProductCard).join('')
                : '<p class="empty-msg">Hiện chưa có sản phẩm giảm giá.</p>';
        } catch (err) {
            container.innerHTML = `<p class="empty-msg">${err.message}</p>`;
        }
    }

    async loadNewProducts() {
        const container = document.getElementById('home-new-grid');
        if (!container) return;
        try {
            const res = await this.productService.getAll({ isNew: 1, limit: 4 });
            const items = res.items || [];
            container.innerHTML = items.length
                ? items.map(createProductCard).join('')
                : '<p class="empty-msg">Đang cập nhật sản phẩm mới.</p>';
        } catch (err) {
            container.innerHTML = `<p class="empty-msg">${err.message}</p>`;
        }
    }

    initScrollReveal() {
        const els = document.querySelectorAll('.reveal');
        if (!('IntersectionObserver' in window)) {
            els.forEach(el => el.classList.add('visible'));
            return;
        }
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        els.forEach(el => observer.observe(el));
    }
}
