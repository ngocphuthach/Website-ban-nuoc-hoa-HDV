// Controller xử lý Trang Thanh Toán (#trang-thanh-toan)
class CheckoutPage {
    constructor() {
        this.orderService = new OrderService();
        this.authService = new AuthService();
        this.bound = false;
    }

    init() {
        if (!this.authService.isLoggedIn()) {
            toast.warning('Vui lòng đăng nhập để tiến hành thanh toán.');
            window.location.hash = '#trang-dang-nhap';
            return;
        }

        const user = this.authService.getCurrentUser();
        if (user) {
            const nameEl = document.getElementById('checkout-name');
            const emailEl = document.getElementById('checkout-email');
            const phoneEl = document.getElementById('checkout-phone');
            const addressEl = document.getElementById('checkout-address');

            if (nameEl && !nameEl.value) nameEl.value = user.fullName || '';
            if (emailEl && !emailEl.value) emailEl.value = user.email || '';
            if (phoneEl && !phoneEl.value) phoneEl.value = user.phone || '';
            if (addressEl && !addressEl.value) addressEl.value = user.address || '';
        }

        this.renderCartSummary();
        new ApiService().get('/payments/config').then(cfg=>{const field=document.querySelector('input[name="paymentMethod"]');if(cfg.enabled && field && !document.querySelector('input[value="VNPay"]')) { const label=document.createElement('label'); const radio=document.createElement('input'); radio.type='radio';radio.name='paymentMethod';radio.value='VNPay';label.append(radio,document.createTextNode(' VNPay Sandbox'));field.closest('label')?.after(label); }}).catch(()=>{});
        this.setupEvents();
    }

    renderCartSummary() {
        const listEl = document.getElementById('checkout-items-summary');
        const totalEl = document.getElementById('checkout-total');
        if (!listEl || !totalEl) return;

        const items = cart.getItems();
        if (items.length === 0) {
            listEl.innerHTML = '<p class="empty-msg">Giỏ hàng trống.</p>';
            totalEl.textContent = cart.formatPrice(0);
            return;
        }

        listEl.innerHTML = items.map(item => `
            <div class="checkout-summary-item">
                <div>
                    <strong>${escapeHtml(item.name)}</strong>
                    <small>${Number(item.ml)}ml × ${Number(item.quantity)}</small>
                </div>
                <span>${cart.formatPrice(item.price * item.quantity)}</span>
            </div>
        `).join('');

        totalEl.textContent = cart.formatPrice(cart.getTotal());
    }

    setupEvents() {
        if (this.bound) return;
        this.bound = true;

        const paymentRadios = document.querySelectorAll('input[name="paymentMethod"]');
        const qrBox = document.getElementById('checkout-qr-box');

        paymentRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (qrBox) {
                    qrBox.style.display = radio.value === 'Chuyển khoản' && radio.checked ? 'block' : 'none';
                }
            });
        });

        const form = document.getElementById('checkout-form');
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.submitOrder();
        });
    }

    async submitOrder() {
        if (this.submitting) return;
        const items = cart.getItems();
        if (items.length === 0) {
            toast.error('Giỏ hàng của bạn đang trống.');
            return;
        }

        const payload = {
            customerName: document.getElementById('checkout-name').value.trim(),
            email: document.getElementById('checkout-email').value.trim(),
            phone: document.getElementById('checkout-phone').value.trim(),
            address: document.getElementById('checkout-address').value.trim(),
            paymentMethod: document.querySelector('input[name="paymentMethod"]:checked')?.value || 'COD',
            items: items.map(i => ({
                productId: i.productId,
                ml: i.ml,
                quantity: i.quantity
            }))
        };

        try {
            this.submitting = true;
            const order = await this.orderService.create(payload);
            cart.clear();
            if(payload.paymentMethod==='VNPay'){ window.location.hash='#trang-lich-su'; const pay=await new ApiService().post('/payments/'+order.id+'/start',{}); window.location.assign(pay.url); return; }
            toast.success(`Đặt hàng thành công! Mã đơn #${order.id}`);
            window.location.hash = '#trang-lich-su';
        } catch (err) {
            toast.error(err.message);
        } finally { this.submitting = false; }
    }
}
