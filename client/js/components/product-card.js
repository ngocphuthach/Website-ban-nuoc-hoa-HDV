// Component tạo thẻ HTML hiển thị 1 sản phẩm nước hoa
function createProductCard(product) {
    const sizes = Array.isArray(product.sizes) ? product.sizes : [];
    const minPrice = sizes.length > 0 ? Math.min(...sizes.map(s => Number(s.price))) : 0;
    const discount = Number(product.discount || 0);
    const finalPrice = discount > 0 ? Math.round(minPrice * (100 - discount) / 100) : minPrice;

    const formatMoney = (val) => new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(val || 0);

    // Nhãn trạng thái (Sale / Mới / Nổi bật)
    let badges = '';
    if (discount > 0) badges += `<span class="badge badge-sale">-${discount}%</span>`;
    if (product.isNew) badges += `<span class="badge badge-new">NEW</span>`;
    if (product.isFeatured) badges += `<span class="badge badge-hot">HOT</span>`;

    let imgSrc = product.image || 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=500';
    if (imgSrc.startsWith('pic/')) imgSrc = '../../' + imgSrc;
    const safeJson = encodeURIComponent(JSON.stringify(product));

    return `
        <article class="product-card reveal">
            <div class="product-card-img">
                <div class="product-badges">${badges}</div>
                <img src="${imgSrc}" alt="${product.name}" loading="lazy" onclick="app.openProductDetail(${product.id})" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1541643600914-78b084683601?w=500'">
                <div class="product-overlay-actions">
                    <button class="btn-overlay" onclick="app.openProductDetail(${product.id})" title="Xem chi tiết">
                        <i class="fa-regular fa-eye"></i>
                    </button>
                    <button class="btn-overlay btn-add-bounce" onclick="app.openQuickSizeModal('${safeJson}')" title="Thêm vào giỏ">
                        <i class="fa-solid fa-bag-shopping"></i>
                    </button>
                </div>
            </div>
            <div class="product-card-body">
                <span class="product-brand">${product.brandName || product.brand}</span>
                <h3 class="product-title" onclick="app.openProductDetail(${product.id})">${product.name}</h3>
                <p class="product-type">${product.categoryName || product.type}</p>
                <div class="product-price-row">
                    <span class="price-current">${formatMoney(finalPrice)}</span>
                    ${discount > 0 ? `<span class="price-old">${formatMoney(minPrice)}</span>` : ''}
                </div>
            </div>
        </article>
    `;
}

// Kích hoạt hiệu ứng xuất hiện theo nhịp (GSAP ScrollTrigger Stagger) cho danh sách sản phẩm
function animateProductCards(containerSelector) {
    const cards = document.querySelectorAll(`${containerSelector} .product-card`);
    if (!cards.length) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || !window.gsap || !window.ScrollTrigger) {
        cards.forEach(c => { c.style.opacity = '1'; });
        return;
    }

    gsap.registerPlugin(ScrollTrigger);
    gsap.set(cards, { opacity: 0, y: 34, scale: 0.96 });

    ScrollTrigger.batch(cards, {
        start: 'top 90%',
        once: true,
        onEnter: (batch) => {
            gsap.to(batch, {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: 0.65,
                stagger: 0.09,
                ease: 'power3.out',
                clearProps: 'transform'
            });
        }
    });
    ScrollTrigger.refresh();
}
