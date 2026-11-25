// Quản lý đơn hàng trong trang Admin
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
            tbody.innerHTML = `<tr><td colspan="7">${err.message}</td></tr>`;
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
                <td><strong>#${o.id}</strong></td>
                <td>
                    <div>${o.customerName}</div>
                    <small style="color: var(--text-muted)">${o.phone}</small>
                </td>
                <td>${new Date(o.orderDate).toLocaleDateString('vi-VN')}</td>
                <td>${o.paymentMethod}</td>
                <td class="gold-text">${fmt(o.total)}</td>
                <td>
                    <select class="admin-status-select" onchange="adminApp.orderManager.updateStatus(${o.id}, this.value)">
                        ${statuses.map(s => `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                </td>
                <td>
                    <button class="btn-outline btn-sm" onclick="adminApp.orderManager.viewDetail(${o.id})">Chi tiết</button>
                </td>
            </tr>
        `).join('');
    }

    viewDetail(id) {
        const order = this.orders.find(o => o.id === id);
        if (!order) return;
        const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
        const itemsText = (order.items || [])
            .map(i => `• ${i.productName} (${i.ml}ml) × ${i.quantity} = ${fmt(i.price * i.quantity)}`)
            .join('\n');

        alert(
            `ĐƠN HÀNG #${order.id}\n` +
            `Khách hàng: ${order.customerName} (${order.phone})\n` +
            `Địa chỉ: ${order.address}\n` +
            `Trạng thái: ${order.status}\n\n` +
            `Sản phẩm:\n${itemsText}\n\n` +
            `Tổng cộng: ${fmt(order.total)}`
        );
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
