// Component quản lý giỏ hàng lưu trên localStorage
class Cart {
    constructor() {
        this.storageKey = 'perfumeCart';
    }

    getItems() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            const items = raw ? JSON.parse(raw) : [];
            return Array.isArray(items) ? items : [];
        } catch (e) {
            return [];
        }
    }

    saveItems(items) {
        localStorage.setItem(this.storageKey, JSON.stringify(items));
        this.updateBadge();
        this.renderSidebar();
    }

    // Thêm sản phẩm kèm dung tích đã chọn vào giỏ
    addItem(product, sizeOption, quantity = 1) {
        const items = this.getItems();
        const ml = Number(sizeOption.ml);
        const basePrice = Number(sizeOption.price);
        const discount = Number(product.discount || 0);
        const finalPrice = discount > 0 ? Math.round(basePrice * (100 - discount) / 100) : basePrice;

        const existing = items.find(i => i.productId === product.id && i.ml === ml);
        if (existing) {
            existing.quantity += Number(quantity);
            if (sizeOption.stock && existing.quantity > sizeOption.stock) {
                existing.quantity = sizeOption.stock;
                toast.warning('Đã đạt số lượng tối đa trong kho!');
            }
        } else {
            items.push({
                productId: product.id,
                name: product.name,
                brand: product.brandName || product.brand,
                image: product.image || '',
                ml: ml,
                price: finalPrice,
                quantity: Number(quantity)
            });
        }

        this.saveItems(items);
        toast.success(`Đã thêm ${product.name} (${ml}ml) vào giỏ hàng`);

        // Hiệu ứng nảy mượt trên icon giỏ hàng khi thêm sản phẩm
        const cartBtn = document.getElementById('btn-open-cart');
        if (cartBtn && window.gsap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            gsap.fromTo(cartBtn, { scale: 0.85 }, { scale: 1, duration: 0.55, ease: 'elastic.out(1, 0.4)' });
        }
    }

    removeItem(productId, ml) {
        const items = this.getItems().filter(
            i => !(i.productId === Number(productId) && i.ml === Number(ml))
        );
        this.saveItems(items);
    }

    updateQuantity(productId, ml, qty) {
        const quantity = Number(qty);
        if (quantity <= 0) {
            this.removeItem(productId, ml);
            return;
        }
        const items = this.getItems().map(i => {
            if (i.productId === Number(productId) && i.ml === Number(ml)) {
                return { ...i, quantity };
            }
            return i;
        });
        this.saveItems(items);
    }

    getTotal() {
        return this.getItems().reduce((sum, item) => sum + item.price * item.quantity, 0);
    }

    getCount() {
        return this.getItems().reduce((sum, item) => sum + item.quantity, 0);
    }

    clear() {
        localStorage.removeItem(this.storageKey);
        this.updateBadge();
        this.renderSidebar();
    }

    formatPrice(num) {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
    }

    updateBadge() {
        const badge = document.getElementById('cart-badge');
        if (badge) {
            const count = this.getCount();
            badge.textContent = count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        }
    }

    // Render nội dung giỏ hàng nhanh ở Sidebar
    renderSidebar() {
        const listEl = document.getElementById('cart-sidebar-items');
        const totalEl = document.getElementById('cart-sidebar-total');
        if (!listEl || !totalEl) return;

        const items = this.getItems();
        if (items.length === 0) {
            listEl.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-bag-shopping"></i>
                    <p>Giỏ hàng của bạn đang trống</p>
                </div>`;
            totalEl.textContent = this.formatPrice(0);
            return;
        }

        listEl.innerHTML = items.map(item => {
            let img = item.image || 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=300';
            if (img.startsWith('pic/')) img = '../../' + img;
            return `
            <div class="cart-sidebar-item">
                <img src="${img}" alt="${item.name}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1541643600914-78b084683601?w=300'">
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <span class="cart-item-meta">${item.brand} • ${item.ml}ml</span>
                    <div class="cart-item-price">${this.formatPrice(item.price)}</div>
                    <div class="cart-qty-controls">
                        <button onclick="cart.updateQuantity(${item.productId}, ${item.ml}, ${item.quantity - 1})">-</button>
                        <span>${item.quantity}</span>
                        <button onclick="cart.updateQuantity(${item.productId}, ${item.ml}, ${item.quantity + 1})">+</button>
                        <button class="btn-remove-item" onclick="cart.removeItem(${item.productId}, ${item.ml})">
                            <i class="fa-regular fa-trash-can"></i>
                        </button>
                    </div>
                </div>
            </div>
        `; }).join('');

        totalEl.textContent = this.formatPrice(this.getTotal());

        if (window.gsap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            gsap.fromTo('#cart-sidebar-items .cart-sidebar-item',
                { x: 18, opacity: 0 },
                { x: 0, opacity: 1, duration: 0.35, stagger: 0.05, ease: 'power2.out', clearProps: 'transform' }
            );
        }
    }

    // Render bảng giỏ hàng đầy đủ tại trang #trang-gio-hang
    renderCartPage() {
        const tbody = document.getElementById('cart-page-items');
        const totalEl = document.getElementById('cart-page-total');
        const subtotalEl = document.getElementById('cart-page-subtotal');
        if (!tbody) return;

        const items = this.getItems();
        if (items.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center; padding: 48px 16px; color: var(--text-muted);">
                        Giỏ hàng đang trống. <a href="#trang-san-pham" style="color: var(--gold);">Khám phá nước hoa ngay</a>
                    </td>
                </tr>`;
            if (subtotalEl) subtotalEl.textContent = this.formatPrice(0);
            if (totalEl) totalEl.textContent = this.formatPrice(0);
            return;
        }

        tbody.innerHTML = items.map(item => {
            let img = item.image || 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=300';
            if (img.startsWith('pic/')) img = '../../' + img;
            return `
            <tr>
                <td>
                    <div class="cart-table-product">
                        <img src="${img}" alt="${item.name}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1541643600914-78b084683601?w=300'">
                        <div>
                            <strong>${item.name}</strong>
                            <small>${item.brand} • ${item.ml}ml</small>
                        </div>
                    </div>
                </td>
                <td>${this.formatPrice(item.price)}</td>
                <td>
                    <div class="cart-qty-controls">
                        <button onclick="cart.updateQuantity(${item.productId}, ${item.ml}, ${item.quantity - 1}); cart.renderCartPage()">-</button>
                        <span>${item.quantity}</span>
                        <button onclick="cart.updateQuantity(${item.productId}, ${item.ml}, ${item.quantity + 1}); cart.renderCartPage()">+</button>
                    </div>
                </td>
                <td class="gold-text">${this.formatPrice(item.price * item.quantity)}</td>
                <td>
                    <button class="btn-icon-danger" onclick="cart.removeItem(${item.productId}, ${item.ml}); cart.renderCartPage()">
                        <i class="fa-regular fa-trash-can"></i>
                    </button>
                </td>
            </tr>
        `; }).join('');

        const total = this.getTotal();
        if (subtotalEl) subtotalEl.textContent = this.formatPrice(total);
        if (totalEl) totalEl.textContent = this.formatPrice(total);
    }
}

const cart = new Cart();
