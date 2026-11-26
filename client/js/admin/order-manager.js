// Quản lý đơn hàng trong trang Admin (dùng Modal chi tiết, chống XSS)
class OrderManager {
    constructor() {
        this.orderService = new OrderService();
        this.orders = [];
    }

    async init() {
        await this.loadOrders();
    }

    async loadOrders(status = '') {
        const tbody = document.getElementById('admin-orders-tbody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Đang tải...</td></tr>';

        try {
            const filters = status ? { status } : {};
            this.orders = await this.orderService.getAll(filters);
            this.renderTable(this.orders);
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="7">${escapeHtml(err.message)}</td></tr>`;
        }
    }

    renderTable(orders) {
        const tbody = document.getElementById('admin-orders-tbody');
        const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
        const statuses = ['Chờ xác nhận', 'Đã xác nhận', 'Đang giao', 'Giao thành công', 'Đã hủy'];

        if (!orders.length) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Không có đơn hàng nào.</td></tr>';
            return;
        }

        tbody.innerHTML = orders.map(o => `
            <tr>
                <td><strong>#${Number(o.id)}</strong></td>
                <td>
                    <div>${escapeHtml(o.customerName)}</div>
                    <small style="color: var(--text-muted)">${escapeHtml(o.phone)}</small>
                </td>
                <td>${new Date(o.orderDate).toLocaleDateString('vi-VN')}</td>
                <td>${escapeHtml(o.paymentMethod)}${o.paymentMethod === 'VNPay' ? ` <small style="color:var(--gold)">(${escapeHtml(o.paymentStatus)})</small>` : ''}</td>
                <td class="gold-text">${fmt(o.total)}</td>
                <td>
                    <select class="admin-status-select" onchange="adminApp.orderManager.updateStatus(${Number(o.id)}, this.value)">
                        ${statuses.map(s => `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                </td>
                <td>
                    <button class="btn-outline btn-sm" onclick="adminApp.orderManager.viewDetail(${Number(o.id)})">Chi tiết</button>
                </td>
            </tr>
        `).join('');
    }

    viewDetail(id) {
        const order = this.orders.find(o => o.id === id);
        if (!order) return;
        const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);

        const body = document.getElementById('admin-order-detail-body');
        const title = document.getElementById('order-modal-title');
        if (!body || !title) return;

        title.textContent = `Chi tiết đơn hàng #${Number(order.id)}`;
        body.innerHTML = `
            <div style="display:grid; gap:8px; margin-bottom:16px; font-size:14px;">
                <div><strong>Khách hàng:</strong> ${escapeHtml(order.customerName)} (${escapeHtml(order.phone)})</div>
                <div><strong>Email:</strong> ${escapeHtml(order.email)}</div>
                <div><strong>Địa chỉ:</strong> ${escapeHtml(order.address)}</div>
                <div><strong>Thanh toán:</strong> ${escapeHtml(order.paymentMethod)}${order.paymentMethod === 'VNPay' ? ` — ${escapeHtml(order.paymentStatus)}` : ''}</div>
                <div><strong>Trạng thái:</strong> <span class="gold-text">${escapeHtml(order.status)}</span></div>
                <div><strong>Ngày đặt:</strong> ${new Date(order.orderDate).toLocaleString('vi-VN')}</div>
            </div>
            <table class="data-table">
                <thead><tr><th>Sản phẩm</th><th>Dung tích</th><th>SL</th><th>Thành tiền</th></tr></thead>
                <tbody>
                    ${(order.items || []).map(i => `
                        <tr>
                            <td>${escapeHtml(i.productName)}</td>
                            <td>${Number(i.ml)}ml</td>
                            <td>${Number(i.quantity)}</td>
                            <td class="gold-text">${fmt(i.price * i.quantity)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div style="text-align:right; margin-top:16px; font-size:17px;">
                <strong>Tổng cộng: <span class="gold-text">${fmt(order.total)}</span></strong>
            </div>
        `;
        document.getElementById('admin-order-modal')?.classList.add('active');
    }

    closeModal() {
        document.getElementById('admin-order-modal')?.classList.remove('active');
    }

    async updateStatus(id, status) {
        try {
            await this.orderService.updateStatus(id, status);
            toast.success(`Đã cập nhật đơn #${id} → ${status}`);
        } catch (err) {
            toast.error(err.message);
            await this.loadOrders();
        }
    }
}
