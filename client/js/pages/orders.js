// Controller xử lý Trang Lịch Sử Đơn Hàng (#trang-lich-su)
class OrdersPage {
    constructor() {
        this.orderService = new OrderService();
        this.authService = new AuthService();
    }

    async init() {
        if (!this.authService.isLoggedIn()) {
            window.location.hash = '#trang-dang-nhap';
            return;
        }
        const container = document.getElementById('my-orders-list');
        if (!container) return;

        container.innerHTML = '<div class="loading-spinner"></div>';
        try {
            const orders = await this.orderService.getMyOrders();
            this.renderOrders(orders);
        } catch (err) {
            container.innerHTML = `<p class="empty-msg">${escapeHtml(err.message)}</p>`;
        }
    }

    formatPaymentBadge(order) {
        if (order.paymentMethod !== 'VNPay') return '';
        if (order.paymentStatus === 'paid') return '<span class="status-badge status-success">Đã thanh toán VNPay</span>';
        if (order.paymentStatus === 'failed') return '<span class="status-badge status-danger">VNPay thất bại</span>';
        return '<span class="status-badge status-warning">Chờ thanh toán VNPay</span>';
    }

    renderOrders(orders) {
        const container = document.getElementById('my-orders-list');
        if (!orders || orders.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-box-open"></i>
                    <p>Bạn chưa có đơn hàng nào.</p>
                    <a href="#trang-san-pham" class="btn-gold">Mua sắm ngay</a>
                </div>`;
            return;
        }

        container.innerHTML = orders.map(order => {
            const canRetryVnpay = order.paymentMethod === 'VNPay'
                && order.status === 'Chờ xác nhận'
                && order.paymentStatus !== 'paid'
                && order.paymentStatus !== 'pending';
            return `
            <div class="order-card">
                <div class="order-card-header">
                    <div>
                        <strong>Đơn hàng #${Number(order.id)}</strong>
                        <span class="order-date">${new Date(order.orderDate).toLocaleString('vi-VN')}</span>
                    </div>
                    <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
                        ${this.formatPaymentBadge(order)}
                        <span class="status-badge status-${this.statusClass(order.status)}">${escapeHtml(order.status)}</span>
                    </div>
                </div>
                <div class="order-card-items">
                    ${(order.items || []).map(item => `
                        <div class="order-item-row">
                            <span>${escapeHtml(item.productName)} (${Number(item.ml)}ml) × ${Number(item.quantity)}</span>
                            <span>${cart.formatPrice(item.price * item.quantity)}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="order-card-footer">
                    <div>
                        <small>Thanh toán: ${escapeHtml(order.paymentMethod)} • Giao tới: ${escapeHtml(order.address)}</small>
                    </div>
                    <div class="order-total-actions" style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                        <strong class="gold-text">Tổng: ${cart.formatPrice(order.total)}</strong>
                        ${canRetryVnpay ? `
                            <button class="btn-gold btn-sm" onclick="app.ordersPage.payWithVnpay(${Number(order.id)})">Thanh toán VNPay</button>
                        ` : ''}
                        ${order.status === 'Chờ xác nhận' ? `
                            <button class="btn-outline btn-sm" onclick="app.ordersPage.cancelOrder(${Number(order.id)})">Hủy đơn</button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        }).join('');
    }

    statusClass(status) {
        if (status === 'Giao thành công') return 'success';
        if (status === 'Đã hủy') return 'danger';
        if (status === 'Đang giao') return 'info';
        if (status === 'Đã xác nhận') return 'primary';
        return 'warning';
    }

    async payWithVnpay(id) {
        try {
            const pay = await new ApiService().post(`/payments/${id}/start`, {});
            window.location.assign(pay.url);
        } catch (err) {
            toast.error(err.message);
        }
    }

    async cancelOrder(id) {
        if (!confirm(`Bạn chắc chắn muốn hủy đơn hàng #${id}?`)) return;
        try {
            await this.orderService.cancel(id);
            toast.success('Đã hủy đơn hàng.');
            this.init();
        } catch (err) {
            toast.error(err.message);
        }
    }
}
