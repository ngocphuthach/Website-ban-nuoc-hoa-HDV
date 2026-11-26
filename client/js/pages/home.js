// Controller xử lý Trang Chủ (#trang-chu) và Trang Thương Hiệu
class HomePage {
    constructor() {
        this.productService = new ProductService();
        this.brandService = new BrandService();
        this.featuredType = '';
        this.motionInitialized = false;
        this.conciergeBound = false;
    }

    async init() {
        this.renderHeritageSection();
        this.renderConciergeSection();
        this.initHeroMotion();
        this.initEditorialScrollMotions();
        this.setupConciergeForm();
        await Promise.all([
            this.loadBrands(),
            this.loadFeaturedProducts(),
            this.loadSaleProducts(),
            this.loadNewProducts()
        ]);
        this.initScrollReveal();
    }

    // Render phân khu Giới thiệu (cả trên Trang chủ lẫn tab #trang-gioi-thieu)
    renderHeritageSection() {
        const html = `
            <div class="heritage-editorial-grid">
                <div class="heritage-frame-wrap">
                    <div class="heritage-offset-frame">
                        <div class="heritage-media-box" id="heritage-parallax-img">
                            <img src="../../pic/banner-story.jpg" alt="Nghệ thuật chế tác nước hoa PerfumeStore" onerror="this.onerror=null;this.src='../../pic/anhgioithieu1.jpg'">
                        </div>
                    </div>
                </div>

                <div class="heritage-story-col">
                    <span class="hero-tag heritage-stagger">Brand Heritage &amp; Craftsmanship</span>
                    <h2 class="heritage-stagger">Nghệ Thuật Điều Chế Từ Những Giọt Tinh Dầu Quý Hiếm</h2>
                    <div class="gold-reveal-line"></div>
                    <p class="heritage-stagger">
                        Lấy cảm hứng từ các Maison nước hoa Niche trứ danh tại Grasse, mỗi tuyệt tác tại PerfumeStore là bản giao hưởng khứu giác được chưng cất công phu — nơi hương thơm không chỉ lưu lại trên làn da, mà còn khắc họa dấu ấn phong thái độc bản.
                    </p>

                    <div class="artisan-signature heritage-stagger">
                        <svg viewBox="0 0 220 54" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Chữ ký nghệ nhân">
                            <path d="M12 40C24 14 38 8 42 22C45 33 28 42 36 42C48 42 64 16 74 16C80 16 72 38 82 38C92 38 104 20 112 20C118 20 112 36 122 36C134 36 146 14 162 18C172 20 156 38 170 38C184 38 198 24 210 26" stroke="#D4AF37" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M18 46C68 42 135 42 198 44" stroke="rgba(212,175,55,0.45)" stroke-width="1" stroke-linecap="round"/>
                        </svg>
                        <span>Master Perfumer • Maison PerfumeStore</span>
                    </div>

                    <div class="heritage-metrics heritage-stagger">
                        <div class="metric-item">
                            <strong>100%</strong>
                            <span>Tinh dầu nguyên bản</span>
                        </div>
                        <div class="metric-item">
                            <strong>48H</strong>
                            <span>Lưu hương bền bỉ</span>
                        </div>
                        <div class="metric-item">
                            <strong>49+</strong>
                            <span>Tuyệt tác độc bản</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tầng 2: 3 Tầng hương đặc trưng (Olfactory Pyramid) -->
            <div class="olfactory-pyramid">
                <article class="olfactory-card glass-card">
                    <span class="olfactory-step">01 • Top Notes</span>
                    <h3>Hương Đầu</h3>
                    <p>Bùng nổ thanh khiết ngay khoảnh khắc chạm da với Cam Bergamot Calabria, Tiêu Hồng và Bạc Hà tươi mát.</p>
                </article>
                <article class="olfactory-card glass-card">
                    <span class="olfactory-step">02 • Heart Notes</span>
                    <h3>Hương Giữa</h3>
                    <p>Linh hồn của chai nước hoa tỏa sáng cùng Hoa Hồng Damask, Nhài Grasse và Diên Vĩ sang trọng.</p>
                </article>
                <article class="olfactory-card glass-card">
                    <span class="olfactory-step">03 • Base Notes</span>
                    <h3>Hương Cuối</h3>
                    <p>Lắng đọng đầy mê hoặc trên da hàng giờ liền với Trầm Hương, Hổ Phách Vàng và Xạ Hương Trắng.</p>
                </article>
            </div>
        `;

        document.querySelectorAll('.heritage-section, #about-page-root').forEach((el) => {
            el.innerHTML = html;
        });
    }

    // Render phân khu Liên hệ & Đặt lịch tư vấn (cả trên Trang chủ lẫn tab #trang-lien-he)
    renderConciergeSection() {
        const html = `
            <div class="concierge-split-card glass-card">
                <div class="concierge-boutique">
                    <img src="../../pic/banner-contact.jpg" alt="Boutique PerfumeStore" class="concierge-bg-img" onerror="this.onerror=null;this.src='../../pic/anhgioithieu2.jpg'">
                    <div class="concierge-bg-overlay"></div>
                    <div class="concierge-boutique-content">
                        <span class="hero-tag concierge-stagger">Private Concierge • Boutique</span>
                        <h2 class="concierge-stagger">Không Gian Trải Nghiệm Độc Bản</h2>
                        <div class="gold-reveal-line"></div>
                        <p class="concierge-lead concierge-stagger">
                            Ghé thăm Boutique hoặc đặt lịch hẹn riêng cùng chuyên gia mùi hương của chúng tôi.
                        </p>

                        <ul class="boutique-info-list concierge-stagger">
                            <li>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M12 21s-7-6.2-7-11.5a7 7 0 1 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>
                                <div><strong>Địa chỉ Boutique</strong><span>123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh</span></div>
                            </li>
                            <li>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
                                <div><strong>Giờ mở cửa</strong><span>09:00 – 22:00 (Thứ 2 – Chủ Nhật)</span></div>
                            </li>
                            <li>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.4 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>
                                <div><strong>Hotline VIP</strong><span>+84 909 888 999</span></div>
                            </li>
                            <li>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
                                <div><strong>Email Concierge</strong><span>concierge@perfumestore.vn</span></div>
                            </li>
                        </ul>
                    </div>
                </div>

                <form class="concierge-minimal-form">
                    <span class="hero-tag concierge-stagger">Private Appointment</span>
                    <h2 class="concierge-stagger">Đặt Lịch Thử Hương &amp; Tư Vấn Riêng</h2>
                    <div class="gold-reveal-line"></div>

                    <div class="minimal-field concierge-stagger">
                        <label>Họ và tên</label>
                        <input type="text" name="name" placeholder="Nhập họ và tên của bạn" required>
                    </div>
                    <div class="minimal-field concierge-stagger">
                        <label>Số điện thoại</label>
                        <input type="tel" name="phone" placeholder="0909 888 999" required>
                    </div>
                    <div class="minimal-field concierge-stagger">
                        <label>Nhóm hương yêu thích</label>
                        <select name="scent">
                            <option value="Gỗ trầm ấm">Gỗ trầm ấm</option>
                            <option value="Hoa cỏ thanh lịch">Hoa cỏ thanh lịch</option>
                            <option value="Cam chanh tươi mát">Cam chanh tươi mát</option>
                            <option value="Phương Đông quyến rũ">Phương Đông quyến rũ</option>
                        </select>
                    </div>
                    <div class="minimal-field concierge-stagger">
                        <label>Lời nhắn</label>
                        <textarea name="note" rows="2" placeholder="Ghi chú thời gian hẹn hoặc mùi hương bạn mong muốn..."></textarea>
                    </div>

                    <button type="submit" class="btn-gold concierge-stagger" style="width: 100%; margin-top: 12px;">
                        <span>Đặt Lịch Tư Vấn Riêng</span>
                    </button>
                </form>
            </div>
        `;

        document.querySelectorAll('.concierge-section, #contact-page-root').forEach((el) => {
            el.innerHTML = html;
        });
    }

    // Hiệu ứng cuộn GSAP riêng cho Heritage & Concierge (stagger fade-up + scaleX đường kẻ Gold + parallax)
    initEditorialScrollMotions() {
        if (!window.gsap || !window.ScrollTrigger) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        gsap.registerPlugin(ScrollTrigger);

        // Parallax nhẹ trên ảnh Brand Heritage
        gsap.fromTo('#heritage-parallax-img img',
            { yPercent: -6 },
            {
                yPercent: 6,
                ease: 'none',
                scrollTrigger: {
                    trigger: '.heritage-section',
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: true
                }
            }
        );

        // Đường kẻ vàng Gold tự kéo dài scaleX khi cuộn tới
        document.querySelectorAll('.gold-reveal-line').forEach((line) => {
            gsap.fromTo(line,
                { scaleX: 0 },
                {
                    scaleX: 1,
                    duration: 0.9,
                    ease: 'power3.out',
                    scrollTrigger: { trigger: line, start: 'top 90%', once: true }
                }
            );
        });

        // Stagger chữ & 3 tầng hương ở Heritage
        gsap.from('.heritage-stagger', {
            y: 26, opacity: 0, duration: 0.7, stagger: 0.1, ease: 'power3.out', clearProps: 'transform',
            scrollTrigger: { trigger: '.heritage-story-col', start: 'top 85%', once: true }
        });
        gsap.from('.olfactory-card', {
            y: 30, opacity: 0, duration: 0.7, stagger: 0.12, ease: 'power3.out', clearProps: 'transform',
            scrollTrigger: { trigger: '.olfactory-pyramid', start: 'top 88%', once: true }
        });

        // Stagger nội dung ở Private Concierge
        gsap.from('.concierge-stagger', {
            y: 24, opacity: 0, duration: 0.65, stagger: 0.08, ease: 'power3.out', clearProps: 'transform',
            scrollTrigger: { trigger: '.concierge-section', start: 'top 85%', once: true }
        });
    }

    // Hiệu ứng GSAP chữ xuất hiện khi tải trang + Parallax nhẹ cho ảnh Hero
    initHeroMotion() {
        if (this.motionInitialized) return;
        if (!window.gsap || !window.ScrollTrigger) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        this.motionInitialized = true;
        gsap.registerPlugin(ScrollTrigger);

        gsap.from('#hero-editorial .hero-editorial-left > *', {
            y: 28,
            opacity: 0,
            duration: 0.85,
            stagger: 0.12,
            ease: 'power3.out',
            clearProps: 'transform'
        });

        gsap.from('#hero-parallax-box', {
            y: 36,
            opacity: 0,
            duration: 1,
            delay: 0.15,
            ease: 'power3.out',
            clearProps: 'transform'
        });

        // Parallax nhẹ trên ảnh Hero khi cuộn xuống
        gsap.to('#hero-parallax-box', {
            yPercent: 12,
            ease: 'none',
            scrollTrigger: {
                trigger: '#hero-editorial',
                start: 'top top',
                end: 'bottom top',
                scrub: true
            }
        });

        // Hiệu ứng xuất hiện tuần tự cho các phân khu trang chủ
        document.querySelectorAll('.home-reveal-block').forEach((block) => {
            gsap.from(block, {
                y: 30,
                opacity: 0,
                duration: 0.75,
                ease: 'power3.out',
                clearProps: 'transform',
                scrollTrigger: {
                    trigger: block,
                    start: 'top 88%',
                    once: true
                }
            });
        });
    }

    setupConciergeForm() {
        if (this.conciergeBound) return;
        const forms = document.querySelectorAll('.concierge-minimal-form');
        if (!forms.length) return;
        this.conciergeBound = true;

        forms.forEach((form) => {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const btn = form.querySelector('button[type="submit"]');
                const name = form.querySelector('input[name="name"]')?.value.trim() || 'Quý khách';
                const scent = form.querySelector('select[name="scent"]')?.value || '';

                if (btn) {
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> <span>Đang xác nhận lịch hẹn...</span>';
                }

                setTimeout(() => {
                    toast.success(`Đặt lịch thành công! Chuyên gia sẽ liên hệ ${name} (Nhóm hương: ${scent}).`);
                    form.reset();
                    if (btn) {
                        btn.disabled = false;
                        btn.innerHTML = '<span>Đặt Lịch Tư Vấn Riêng</span>';
                    }
                }, 800);
            });
        });
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
                ? items.map(createProductCard).join('')
                : '<p class="empty-msg">Chưa có sản phẩm phù hợp.</p>';
            animateProductCards('#home-featured-grid');
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
            animateProductCards('#home-sale-grid');
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
            animateProductCards('#home-new-grid');
        } catch (err) {
            container.innerHTML = `<p class="empty-msg">${err.message}</p>`;
        }
    }

    initScrollReveal() {
        const brandCards = document.querySelectorAll('#brand-page-grid .brand-card');
        if (brandCards.length && window.gsap && window.ScrollTrigger && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            gsap.registerPlugin(ScrollTrigger);
            gsap.set(brandCards, { opacity: 0, y: 28 });
            ScrollTrigger.batch(brandCards, {
                start: 'top 90%',
                once: true,
                onEnter: (batch) => gsap.to(batch, {
                    opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'power3.out', clearProps: 'transform'
                })
            });
        }
    }
}

// Tự động render sẵn 2 phân khu Giới thiệu & Liên hệ khi mở trực tiếp #trang-gioi-thieu hoặc #trang-lien-he
document.addEventListener('DOMContentLoaded', () => {
    if (typeof app !== 'undefined' && app.homePage) {
        app.homePage.renderHeritageSection();
        app.homePage.renderConciergeSection();
        app.homePage.setupConciergeForm();
    }
});
