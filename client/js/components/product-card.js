// Component tạo thẻ HTML hiển thị 1 sản phẩm nước hoa
function createProductCard(product, priceContext = null) {
    const sizes = Array.isArray(product.sizes) ? product.sizes : [];
    const discount = Number(product.discount || 0);

    // Tính giá thực tế sau giảm cho từng dung tích để hiển thị khớp với bộ lọc giá (nếu có)
    const computedSizes = sizes.map(s => {
        const orig = Number(s.price || 0);
        const final = discount > 0 ? Math.round(orig * (100 - discount) / 100) : orig;
        return { ml: Number(s.ml), orig, final };
    });

    let chosen = computedSizes.length
        ? computedSizes.reduce((a, b) => (b.final < a.final ? b : a), computedSizes[0])
        : { ml: 0, orig: 0, final: 0 };
    let matchedLabel = '';

    if (priceContext && (priceContext.minPrice !== null || priceContext.maxPrice !== null) && computedSizes.length) {
        const minP = priceContext.minPrice !== null ? Number(priceContext.minPrice) : 0;
        const maxP = priceContext.maxPrice !== null ? Number(priceContext.maxPrice) : Infinity;
        const matched = computedSizes.filter(s => s.final >= minP && s.final <= maxP);
        if (matched.length) {
            chosen = priceContext.sort === 'price_desc'
                ? matched.reduce((a, b) => (b.final > a.final ? b : a), matched[0])
                : matched.reduce((a, b) => (b.final < a.final ? b : a), matched[0]);
            matchedLabel = `<span class="matched-size-pill">Dung tích ${chosen.ml}ml</span>`;
        }
    }

    const minPrice = chosen.orig;
    const finalPrice = chosen.final;

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
    imgSrc = galleryUrl(product.image || product.images?.[0]);
    const safeJson = encodeURIComponent(JSON.stringify(product)).replace(/'/g, "%27");
    const gallery = productGalleryImages(product);

    return `
        <article class="product-card maison-product">
            <div class="product-card-img">
                <div class="product-badges">${badges}</div>
                <img src="${imgSrc}" alt="${escapeGallery(product.name)}" loading="lazy" onclick="app.openProductDetail(${product.id})" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1541643600914-78b084683601?w=500'">
                ${gallery.length > 1 ? `<img class="card-alt-image" src="${escapeGallery(galleryUrl(gallery[1]))}" alt="Góc chụp khác" loading="lazy" onclick="app.openProductDetail(${product.id})">` : ""}
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
                <span class="product-brand">${escapeGallery(product.brandName || product.brand)}</span>
                <h3 class="product-title" onclick="app.openProductDetail(${product.id})">${escapeGallery(product.name)}</h3>
                <p class="product-type">${escapeGallery(product.categoryName || product.type)}</p>
                <div class="product-price-row">
                    <span class="price-current">${formatMoney(finalPrice)}</span>
                    ${discount > 0 ? `<span class="price-old">${formatMoney(minPrice)}</span>` : ''}
                </div>
                ${matchedLabel}
                <button class="maison-add" onclick="app.openQuickSizeModal('${safeJson}')">Chọn dung tích <span>→</span></button>
            </div>
        </article>
    `;
}

// Kích hoạt hiệu ứng xuất hiện theo nhịp (GSAP ScrollTrigger Stagger) cho danh sách sản phẩm
function animateProductCards(containerSelector) {
    document.querySelectorAll(`${containerSelector} .product-card`).forEach((card,i)=>{
        card.style.opacity='1'; card.style.animationDelay=`${Math.min(i,8)*45}ms`;
    });
}
