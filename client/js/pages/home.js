// Controller xử lý Trang Chủ (#trang-chu) và Trang Thương Hiệu
class HomePage {
    constructor() {
        this.productService = new ProductService();
        this.brandService = new BrandService();
        this.featuredType = '';
    }

    async init() {
        await Promise.all([
            this.loadBrands(),
            this.loadFeaturedProducts(),
            this.loadSaleProducts(),
            this.loadNewProducts()
        ]);
    }

    resolveImg(src) {
        if (!src) return '../../pic/banner-hero.jpg';
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
                        <a href="#trang-san-pham" class="brand-pill" onclick="app.filterByBrand('${escapeHtml(b.slug)}')">
                            <img src="${escapeHtml(logo)}" alt="${escapeHtml(b.name)}" class="brand-pill-logo">
                            <div>
                                <span>${escapeHtml(b.name)}</span>
                                <small>${Number(b.productCount || 0)} sản phẩm</small>
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
                        <div class="brand-card" onclick="app.filterByBrand('${escapeHtml(b.slug)}')">
                            <div class="brand-card-media">
                                <img src="${escapeHtml(logo)}" alt="${escapeHtml(b.name)}" loading="lazy">
                            </div>
                            <div class="brand-card-body">
                                <h3>${escapeHtml(b.name)}</h3>
                                <p>${escapeHtml(b.description || 'Bộ sưu tập nước hoa chính hãng cao cấp.')}</p>
                                <span class="brand-count">${Number(b.productCount || 0)} tuyệt tác hương thơm</span>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        } catch (err) {
            console.error('Lỗi tải thương hiệu:', err);
        }
    }

    async filterFeatured(type, btn) {
        this.featuredType = type;
        document.querySelectorAll('#home-filter-tabs .home-tab-btn').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');
        await this.loadFeaturedProducts();
    }

    async loadFeaturedProducts() {
        const container = document.getElementById('home-featured-grid');
        if (!container) return;
        try {
            const params = { isFeatured: 1, limit: 8 };
            if (this.featuredType) {
                params.type = this.featuredType;
                delete params.isFeatured;
            }
            const res = await this.productService.getAll(params);
            const items = res.items || [];
            container.innerHTML = items.length
                ? items.map(p => createProductCard(p)).join('')
                : '<p class="empty-msg">Chưa có sản phẩm phù hợp.</p>';
            animateProductCards('#home-featured-grid');
        } catch (err) {
            container.innerHTML = `<p class="empty-msg">${escapeHtml(err.message)}</p>`;
        }
    }

    async loadSaleProducts() {
        const container = document.getElementById('home-sale-grid');
        if (!container) return;
        try {
            const res = await this.productService.getAll({ isSale: 1, sort: 'discount_desc', limit: 4 });
            const items = res.items || [];
            container.innerHTML = items.length
                ? items.map(p => createProductCard(p)).join('')
                : '<p class="empty-msg">Hiện chưa có sản phẩm giảm giá.</p>';
            animateProductCards('#home-sale-grid');
        } catch (err) {
            container.innerHTML = `<p class="empty-msg">${escapeHtml(err.message)}</p>`;
        }
    }

    async loadNewProducts() {
        const container = document.getElementById('home-new-grid');
        if (!container) return;
        try {
            const res = await this.productService.getAll({ isNew: 1, limit: 4 });
            const items = res.items || [];
            container.innerHTML = items.length
                ? items.map(p => createProductCard(p)).join('')
                : '<p class="empty-msg">Đang cập nhật sản phẩm mới.</p>';
            animateProductCards('#home-new-grid');
        } catch (err) {
            container.innerHTML = `<p class="empty-msg">${escapeHtml(err.message)}</p>`;
        }
    }
}
