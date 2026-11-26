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
            minPrice: null,
            maxPrice: null,
            page: 1,
            limit: 12
        };
        this.priceBounds = { min: 0, max: 10000000, initialized: false };
        this.searchTimer = null;
        this.priceTimer = null;
        this.abortController = null;
        this.eventsBound = false;
    }

    async init(presetFilters = {}) {
        Object.assign(this.filters, presetFilters);
        await this.renderFilters();
        this.setupFilterEvents();
        this.updatePriceUI();
        await this.loadProducts();
    }

    formatVND(num) {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(num) || 0);
    }

    formatNumberInput(num) {
        if (num === null || num === undefined || num === '') return '';
        return new Intl.NumberFormat('vi-VN').format(Number(num));
    }

    // Phân tích chuỗi nhập liệu tiền tệ, trả về null nếu rỗng, hoặc throw/object lỗi nếu không hợp lệ
    parseManualPrice(raw) {
        const trimmed = String(raw ?? '').trim();
        if (trimmed === '') return { empty: true, value: null };
        if (trimmed.startsWith('-')) return { error: 'Giá tiền không được là số âm.' };
        const cleaned = trimmed.replace(/[.\s,₫vndVNĐ]/g, '');
        if (!/^\d+$/.test(cleaned)) {
            return { error: 'Vui lòng chỉ nhập chữ số hợp lệ cho khoảng giá.' };
        }
        return { empty: false, value: Number(cleaned) };
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
        const resetPriceBtn = document.getElementById('btn-reset-price');

        const rangeMin = document.getElementById('range-min-price');
        const rangeMax = document.getElementById('range-max-price');
        const inputMin = document.getElementById('filter-min-price');
        const inputMax = document.getElementById('filter-max-price');
        const togglePriceBtn = document.getElementById('btn-toggle-price');
        const priceBody = document.getElementById('price-filter-body');

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

        // Debounce tìm kiếm 350ms
        searchInput?.addEventListener('input', (e) => {
            clearTimeout(this.searchTimer);
            this.searchTimer = setTimeout(() => {
                this.filters.search = e.target.value.trim();
                this.filters.page = 1;
                this.loadProducts();
            }, 350);
        });

        // Thu gọn / mở rộng khu vực khoảng giá trên Desktop
        togglePriceBtn?.addEventListener('click', () => {
            const expanded = togglePriceBtn.getAttribute('aria-expanded') === 'true';
            togglePriceBtn.setAttribute('aria-expanded', String(!expanded));
            priceBody?.classList.toggle('collapsed', expanded);
        });

        // Dual Range Slider
        const onRangeInput = (source) => {
            if (!rangeMin || !rangeMax) return;
            let minVal = Number(rangeMin.value);
            let maxVal = Number(rangeMax.value);

            if (source === 'min' && minVal > maxVal) {
                minVal = maxVal;
                rangeMin.value = String(minVal);
            } else if (source === 'max' && maxVal < minVal) {
                maxVal = minVal;
                rangeMax.value = String(maxVal);
            }

            this.filters.minPrice = minVal <= this.priceBounds.min ? null : minVal;
            this.filters.maxPrice = maxVal >= this.priceBounds.max ? null : maxVal;

            this.clearPriceError();
            this.syncInputsFromFilters();
            this.clearActivePresets();
            this.updateDualTrack(minVal, maxVal);
            this.renderActivePriceBadge();

            clearTimeout(this.priceTimer);
            this.priceTimer = setTimeout(() => {
                this.filters.page = 1;
                this.loadProducts();
            }, 350);
        };

        rangeMin?.addEventListener('input', () => onRangeInput('min'));
        rangeMax?.addEventListener('input', () => onRangeInput('max'));

        // Ô nhập giá thủ công (format VNĐ khi blur, đồng bộ 2 chiều)
        const handleManualInput = () => {
            const pMin = this.parseManualPrice(inputMin?.value);
            const pMax = this.parseManualPrice(inputMax?.value);

            if (pMin.error) {
                this.showPriceError(pMin.error);
                return;
            }
            if (pMax.error) {
                this.showPriceError(pMax.error);
                return;
            }
            if (pMin.value !== null && pMax.value !== null && pMin.value > pMax.value) {
                this.showPriceError('Giá thấp nhất không được lớn hơn giá cao nhất.');
                return;
            }

            this.clearPriceError();
            this.filters.minPrice = pMin.value;
            this.filters.maxPrice = pMax.value;
            this.clearActivePresets();
            this.syncSliderFromFilters();
            this.renderActivePriceBadge();

            clearTimeout(this.priceTimer);
            this.priceTimer = setTimeout(() => {
                this.filters.page = 1;
                this.loadProducts();
            }, 400);
        };

        [inputMin, inputMax].forEach((inp) => {
            if (!inp) return;
            inp.addEventListener('focus', () => {
                inp.value = inp.value.replace(/[.\s,₫]/g, '');
            });
            inp.addEventListener('input', handleManualInput);
            inp.addEventListener('blur', () => {
                const parsed = this.parseManualPrice(inp.value);
                if (!parsed.error && !parsed.empty) {
                    inp.value = this.formatNumberInput(parsed.value);
                }
            });
        });

        // 6 khoảng giá có sẵn
        document.querySelectorAll('#price-presets .price-preset-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                const min = btn.dataset.min !== '' ? Number(btn.dataset.min) : null;
                const max = btn.dataset.max !== '' ? Number(btn.dataset.max) : null;
                this.filters.minPrice = min;
                this.filters.maxPrice = max;
                this.clearPriceError();
                this.clearActivePresets();
                btn.classList.add('active');
                this.updatePriceUI();
                this.filters.page = 1;
                this.loadProducts();
            });
        });

        // Đặt lại riêng bộ lọc giá
        resetPriceBtn?.addEventListener('click', () => {
            this.resetPriceFilter(true);
        });

        // Đặt lại toàn bộ bộ lọc
        resetBtn?.addEventListener('click', () => {
            this.filters = {
                brand: '', type: '', search: '', sort: '',
                minPrice: null, maxPrice: null, page: 1, limit: 12
            };
            if (brandSelect) brandSelect.value = '';
            if (typeSelect) typeSelect.value = '';
            if (sortSelect) sortSelect.value = '';
            if (searchInput) searchInput.value = '';
            this.resetPriceFilter(false);
            this.loadProducts();
        });

        // Drawer bộ lọc trên Mobile
        const drawer = document.getElementById('sig-filters-drawer');
        const backdrop = document.getElementById('sig-filter-backdrop');
        const toggleDrawer = (open) => {
            drawer?.classList.toggle('open', open);
            backdrop?.classList.toggle('active', open);
            document.body.style.overflow = open ? 'hidden' : '';
        };
        document.getElementById('btn-mobile-filters')?.addEventListener('click', () => toggleDrawer(true));
        document.getElementById('btn-close-filters')?.addEventListener('click', () => toggleDrawer(false));
        backdrop?.addEventListener('click', () => toggleDrawer(false));
        document.getElementById('btn-apply-mobile-filters')?.addEventListener('click', () => {
            toggleDrawer(false);
            document.getElementById('product-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    resetPriceFilter(shouldReload = true) {
        this.filters.minPrice = null;
        this.filters.maxPrice = null;
        this.clearPriceError();
        this.clearActivePresets();
        this.updatePriceUI();
        if (shouldReload) {
            this.filters.page = 1;
            this.loadProducts();
        }
    }

    showPriceError(msg) {
        const el = document.getElementById('price-filter-error');
        if (el) el.textContent = msg;
        toast.warning(msg);
    }

    clearPriceError() {
        const el = document.getElementById('price-filter-error');
        if (el) el.textContent = '';
    }

    clearActivePresets() {
        document.querySelectorAll('#price-presets .price-preset-btn').forEach(b => b.classList.remove('active'));
    }

    syncInputsFromFilters() {
        const inputMin = document.getElementById('filter-min-price');
        const inputMax = document.getElementById('filter-max-price');
        if (inputMin && document.activeElement !== inputMin) {
            inputMin.value = this.filters.minPrice !== null ? this.formatNumberInput(this.filters.minPrice) : '';
        }
        if (inputMax && document.activeElement !== inputMax) {
            inputMax.value = this.filters.maxPrice !== null ? this.formatNumberInput(this.filters.maxPrice) : '';
        }
    }

    syncSliderFromFilters() {
        const rangeMin = document.getElementById('range-min-price');
        const rangeMax = document.getElementById('range-max-price');
        if (!rangeMin || !rangeMax) return;

        const minVal = this.filters.minPrice !== null
            ? Math.max(this.priceBounds.min, Math.min(this.priceBounds.max, this.filters.minPrice))
            : this.priceBounds.min;
        const maxVal = this.filters.maxPrice !== null
            ? Math.max(this.priceBounds.min, Math.min(this.priceBounds.max, this.filters.maxPrice))
            : this.priceBounds.max;

        rangeMin.value = String(Math.min(minVal, maxVal));
        rangeMax.value = String(Math.max(minVal, maxVal));
        this.updateDualTrack(Number(rangeMin.value), Number(rangeMax.value));
    }

    updateDualTrack(minVal, maxVal) {
        const fill = document.getElementById('dual-range-fill');
        const minLabel = document.getElementById('range-min-label');
        const maxLabel = document.getElementById('range-max-label');
        const span = Math.max(1, this.priceBounds.max - this.priceBounds.min);

        const leftPct = ((minVal - this.priceBounds.min) / span) * 100;
        const rightPct = ((maxVal - this.priceBounds.min) / span) * 100;

        if (fill) {
            fill.style.left = `${Math.max(0, Math.min(100, leftPct))}%`;
            fill.style.width = `${Math.max(0, Math.min(100, rightPct - leftPct))}%`;
        }
        if (minLabel) minLabel.textContent = this.formatVND(this.filters.minPrice ?? minVal);
        if (maxLabel) maxLabel.textContent = this.formatVND(this.filters.maxPrice ?? maxVal);
    }

    updatePriceUI() {
        const rangeMin = document.getElementById('range-min-price');
        const rangeMax = document.getElementById('range-max-price');
        if (rangeMin && rangeMax) {
            rangeMin.min = String(this.priceBounds.min);
            rangeMin.max = String(this.priceBounds.max);
            rangeMax.min = String(this.priceBounds.min);
            rangeMax.max = String(this.priceBounds.max);
        }
        this.syncInputsFromFilters();
        this.syncSliderFromFilters();
        this.renderActivePriceBadge();
    }

    renderActivePriceBadge() {
        const badge = document.getElementById('active-price-badge');
        if (!badge) return;

        const { minPrice, maxPrice } = this.filters;
        if (minPrice === null && maxPrice === null) {
            badge.innerHTML = '';
            return;
        }

        let text = '';
        if (minPrice !== null && maxPrice !== null) {
            text = `${this.formatVND(minPrice)} – ${this.formatVND(maxPrice)}`;
        } else if (minPrice !== null) {
            text = `Từ ${this.formatVND(minPrice)} trở lên`;
        } else {
            text = `Từ 0 ₫ – ${this.formatVND(maxPrice)}`;
        }

        badge.innerHTML = `
            <span class="price-chip">
                <span>Khoảng giá: <strong>${text}</strong></span>
                <button type="button" aria-label="Xóa lọc giá" onclick="app.productListPage.resetPriceFilter(true)">&times;</button>
            </span>
        `;
    }

    renderSkeleton(grid) {
        const cards = Array.from({ length: 6 }, () => `
            <div class="sig-skeleton-card" aria-hidden="true">
                <div class="sig-skeleton-img"></div>
                <div class="sig-skeleton-line short"></div>
                <div class="sig-skeleton-line"></div>
                <div class="sig-skeleton-line price"></div>
            </div>
        `).join('');
        grid.innerHTML = cards;
    }

    async loadProducts() {
        const grid = document.getElementById('product-grid');
        const countEl = document.getElementById('product-count-info');
        if (!grid) return;

        // Hủy request cũ nếu người dùng thao tác nhanh
        if (this.abortController) {
            this.abortController.abort();
        }
        this.abortController = new AbortController();

        this.renderSkeleton(grid);
        try {
            const queryParams = {
                brand: this.filters.brand,
                type: this.filters.type,
                search: this.filters.search,
                sort: this.filters.sort,
                page: this.filters.page,
                limit: this.filters.limit
            };
            if (this.filters.minPrice !== null) queryParams.minPrice = this.filters.minPrice;
            if (this.filters.maxPrice !== null) queryParams.maxPrice = this.filters.maxPrice;

            const res = await this.productService.getAll(queryParams, { signal: this.abortController.signal });

            // Cập nhật giới hạn thanh trượt từ dữ liệu giá thực tế trong Database
            if (!this.priceBounds.initialized && res.priceRange) {
                const rawMin = Math.floor((res.priceRange.min || 0) / 50000) * 50000;
                const rawMax = Math.ceil((res.priceRange.max || 10000000) / 50000) * 50000;
                this.priceBounds = {
                    min: Math.max(0, rawMin),
                    max: Math.max(rawMin + 500000, rawMax),
                    initialized: true
                };
                this.updatePriceUI();
            }

            const items = res.items || [];
            if (countEl) {
                countEl.textContent = `Hiển thị ${items.length} / ${res.total || 0} sản phẩm`;
            }

            if (items.length === 0) {
                grid.innerHTML = `
                    <div class="empty-state sig-empty-state" style="grid-column: 1 / -1;">
                        <i class="fa-solid fa-magnifying-glass"></i>
                        <p>Không tìm thấy sản phẩm phù hợp với bộ lọc hiện tại.</p>
                        <button type="button" class="btn-outline btn-sm" onclick="app.productListPage.resetPriceFilter(true)">Đặt lại khoảng giá</button>
                    </div>`;
            } else {
                const priceCtx = {
                    minPrice: this.filters.minPrice,
                    maxPrice: this.filters.maxPrice,
                    sort: this.filters.sort
                };
                grid.innerHTML = items.map(p => createProductCard(p, priceCtx)).join('');
                animateProductCards('#product-grid');
            }

            this.renderPagination(res.page || 1, res.totalPages || 1);
        } catch (err) {
            if (err.name === 'AbortError') return;
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
