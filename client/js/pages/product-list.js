// Controller xử lý Trang Danh Sách Sản Phẩm (#trang-san-pham)
class ProductListPage {
    constructor() {
        this.productService = new ProductService();
        this.brandService = new BrandService();
        this.categoryService = new CategoryService();
        this.filters = {
            brand: '',
            type: '',
            search: '',
            sort: '',
            page: 1,
            limit: 12
        };
        this.searchTimer = null;
        this.eventsBound = false;
    }

    async init(presetFilters = {}) {
        Object.assign(this.filters, presetFilters);
        await this.renderFilters();
        this.setupFilterEvents();
        await this.loadProducts();
    }

    async renderFilters() {
        const brandSelect = document.getElementById('filter-brand');
        const typeSelect = document.getElementById('filter-type');
        try {
            const [brands, categories] = await Promise.all([
                this.brandService.getAll(),
                this.categoryService.getAll()
            ]);

            if (brandSelect) {
                brandSelect.innerHTML = '<option value="">Tất cả thương hiệu</option>' +
                    brands.map(b => `<option value="${b.slug}">${b.name}</option>`).join('');
                brandSelect.value = this.filters.brand || '';
            }
            if (typeSelect) {
                typeSelect.innerHTML = '<option value="">Tất cả phân loại</option>' +
                    categories.map(c => `<option value="${c.slug}">${c.name}</option>`).join('');
                typeSelect.value = this.filters.type || '';
            }
        } catch (err) {
            console.error('Lỗi tải bộ lọc:', err);
        }
    }

    setupFilterEvents() {
        if (this.eventsBound) return;
        this.eventsBound = true;

        const brandSelect = document.getElementById('filter-brand');
        const typeSelect = document.getElementById('filter-type');
        const sortSelect = document.getElementById('filter-sort');
        const searchInput = document.getElementById('filter-search');
        const resetBtn = document.getElementById('btn-reset-filter');

        brandSelect?.addEventListener('change', (e) => {
            this.filters.brand = e.target.value;
            this.filters.page = 1;
            this.loadProducts();
        });

        typeSelect?.addEventListener('change', (e) => {
            this.filters.type = e.target.value;
            this.filters.page = 1;
            this.loadProducts();
        });

        sortSelect?.addEventListener('change', (e) => {
            this.filters.sort = e.target.value;
            this.filters.page = 1;
            this.loadProducts();
        });

        // Debounce tìm kiếm 300ms
        searchInput?.addEventListener('input', (e) => {
            clearTimeout(this.searchTimer);
            this.searchTimer = setTimeout(() => {
                this.filters.search = e.target.value.trim();
                this.filters.page = 1;
                this.loadProducts();
            }, 300);
        });

        resetBtn?.addEventListener('click', () => {
            this.filters = { brand: '', type: '', search: '', sort: '', page: 1, limit: 12 };
            if (brandSelect) brandSelect.value = '';
            if (typeSelect) typeSelect.value = '';
            if (sortSelect) sortSelect.value = '';
            if (searchInput) searchInput.value = '';
            this.loadProducts();
        });
    }

    async loadProducts() {
        const grid = document.getElementById('product-grid');
        const countEl = document.getElementById('product-count-info');
        if (!grid) return;

        grid.innerHTML = '<div class="loading-spinner"></div>';
        try {
            const res = await this.productService.getAll(this.filters);
            const items = res.items || [];

            if (countEl) {
                countEl.textContent = `Hiển thị ${items.length} / ${res.total || 0} sản phẩm`;
            }

            if (items.length === 0) {
                grid.innerHTML = `
                    <div class="empty-state" style="grid-column: 1 / -1;">
                        <i class="fa-solid fa-magnifying-glass"></i>
                        <p>Không tìm thấy sản phẩm phù hợp.</p>
                    </div>`;
            } else {
                grid.innerHTML = items.map(createProductCard).join('');
                document.querySelectorAll('#product-grid .reveal').forEach(el => el.classList.add('visible'));
            }

            this.renderPagination(res.page || 1, res.totalPages || 1);
        } catch (err) {
            grid.innerHTML = `<p class="empty-msg">${err.message}</p>`;
        }
    }

    renderPagination(currentPage, totalPages) {
        const container = document.getElementById('product-pagination');
        if (!container) return;

        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = '';
        for (let i = 1; i <= totalPages; i++) {
            html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }
        container.innerHTML = html;

        container.querySelectorAll('.page-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.filters.page = Number(btn.dataset.page);
                this.loadProducts();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        });
    }
}
