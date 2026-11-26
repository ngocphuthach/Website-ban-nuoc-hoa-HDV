// Controller xử lý Trang Chi Tiết Sản Phẩm (#trang-chi-tiet)
class ProductDetailPage {
    constructor() {
        this.productService = new ProductService();
        this.currentProduct = null;
        this.selectedSize = null;
    }

    async init(productId) {
        const container = document.getElementById('product-detail-container');
        if (!container) return;
        container.innerHTML = '<div class="loading-spinner"></div>';

        try {
            const product = await this.productService.getById(productId);
            this.currentProduct = product;
            this.selectedSize = (product.sizes && product.sizes.length > 0) ? product.sizes[0] : null;
            this.renderProduct(product);
            this.loadRelatedProducts(product.brand, product.id);
        } catch (err) {
            container.innerHTML = `<p class="empty-msg">${err.message}</p>`;
        }
    }

    renderProduct(p) {
        const container = document.getElementById('product-detail-container');
        const sizes = p.sizes || [];

        container.innerHTML = `
            <div class="sig-detail-media"><span class="sig-label">Thư viện hình ảnh</span><div class="detail-gallery"></div><p class="sig-photo-caption">Chọn ảnh thu nhỏ hoặc chạm ảnh để xem chi tiết.</p></div>
            <div class="detail-info"><span class="sig-label">Thông tin sản phẩm</span>
                <span class="detail-brand">${escapeGallery(p.brandName || p.brand)} • ${escapeGallery(p.code)}</span>
                <h1 class="detail-title">${escapeGallery(p.name)}</h1>
                <p class="detail-category">Phân loại: ${escapeGallery(p.categoryName || p.type)}</p>

                <div class="detail-price-box" id="detail-price-box"></div>

                <p class="detail-desc">${escapeGallery(p.shortDesc || 'Mùi hương sang trọng, lưu hương lâu bền suốt ngày dài.')}</p>

                <div class="detail-sizes">
                    <label>Chọn dung tích (Chai chính hãng):</label>
                    <div class="size-buttons" id="detail-size-buttons">
                        ${sizes.map((s, idx) => `
                            <button type="button" class="size-btn metal-size-btn ${idx === 0 ? 'active' : ''} ${s.stock <= 0 ? 'disabled' : ''}"
                                onclick="app.productDetailPage.selectSize(${s.ml})">
                                <span class="size-ml">${s.ml}ml</span>
                                <small class="size-tag">${s.stock <= 0 ? 'Hết hàng' : `Còn ${s.stock}`}</small>
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div class="detail-stock" id="detail-stock-info"></div>

                <div class="detail-actions">
                    <div class="qty-input-group">
                        <button type="button" onclick="app.productDetailPage.changeQty(-1)">-</button>
                        <input type="number" id="detail-qty" value="1" min="1">
                        <button type="button" onclick="app.productDetailPage.changeQty(1)">+</button>
                    </div>
                    <button type="button" class="btn-gold" onclick="app.productDetailPage.addToCart()">
                        <i class="fa-solid fa-bag-shopping"></i> Thêm vào giỏ hàng
                    </button>
                </div>
                <div class="sig-detail-notes"><details open><summary>Thông tin mùi hương</summary><p>${escapeGallery(p.shortDesc || "Chưa có mô tả tầng hương cho sản phẩm này.")}</p></details><details><summary>Dung tích và tồn kho</summary><p>Chọn dung tích để xem giá và số lượng hiện có.</p></details></div>
            </div>
        `;

        window.mountStoreExtras?.(container,p);
        mountProductGallery(container.querySelector('.detail-gallery'), p);
        this.updatePriceDisplay();
    }

    selectSize(ml) {
        if (!this.currentProduct) return;
        const found = (this.currentProduct.sizes || []).find(s => Number(s.ml) === Number(ml));
        if (!found) return;
        this.selectedSize = found;

        document.querySelectorAll('#detail-size-buttons .size-btn').forEach(btn => {
            btn.classList.toggle('active', btn.textContent.includes(`${ml}ml`));
        });
        this.updatePriceDisplay();
    }

    updatePriceDisplay() {
        const priceBox = document.getElementById('detail-price-box');
        const stockInfo = document.getElementById('detail-stock-info');
        if (!priceBox || !this.selectedSize) return;

        const basePrice = Number(this.selectedSize.price);
        const discount = Number(this.currentProduct.discount || 0);
        const finalPrice = discount > 0 ? Math.round(basePrice * (100 - discount) / 100) : basePrice;

        const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

        priceBox.innerHTML = `
            <span class="detail-price-current">${fmt(finalPrice)}</span>
            ${discount > 0 ? `<span class="detail-price-old">${fmt(basePrice)}</span><span class="badge badge-sale">-${discount}%</span>` : ''}
        `;

        if (stockInfo) {
            stockInfo.innerHTML = this.selectedSize.stock > 0
                ? `<span class="in-stock"><i class="fa-solid fa-check"></i> Còn ${this.selectedSize.stock} sản phẩm trong kho</span>`
                : `<span class="out-stock"><i class="fa-solid fa-xmark"></i> Tạm hết hàng</span>`;
        }
    }

    changeQty(delta) {
        const input = document.getElementById('detail-qty');
        if (!input) return;
        const val = Math.max(1, Number(input.value || 1) + delta);
        input.value = val;
    }

    addToCart() {
        if (!this.currentProduct || !this.selectedSize) return;
        if (this.selectedSize.stock <= 0) {
            toast.error('Dung tích này hiện đã hết hàng.');
            return;
        }
        const qty = Math.max(1, Number(document.getElementById('detail-qty')?.value || 1));
        cart.addItem(this.currentProduct, this.selectedSize, qty);
    }

    async loadRelatedProducts(brand, excludeId) {
        const container = document.getElementById('related-products-grid');
        if (!container) return;
        try {
            const res = await this.productService.getAll({ brand, limit: 5 });
            const items = (res.items || []).filter(p => p.id !== excludeId).slice(0, 4);
            container.innerHTML = items.length
                ? items.map(createProductCard).join('')
                : '<p class="empty-msg">Không có sản phẩm liên quan.</p>';
            animateProductCards('#related-products-grid');
        } catch (err) {
            container.innerHTML = '';
        }
    }
}
