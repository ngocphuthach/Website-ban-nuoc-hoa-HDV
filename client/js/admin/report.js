// Trang báo cáo chi tiết trong Admin
class ReportPage {
    constructor() {
        this.reportService = new ReportService();
    }

    async init(cachedData = null) {
        try {
            const data = cachedData || await this.reportService.getDashboard();
            this.renderBrandRevenue(data.revenueByBrand || []);
            this.renderTopProducts(data.topProducts || []);
            this.renderLowStock(data.lowStock || []);
        } catch (err) {
            toast.error(err.message);
        }
    }

    renderBrandRevenue(items) {
        const tbody = document.getElementById('report-brand-tbody');
        if (!tbody) return;
        const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
        tbody.innerHTML = items.length
            ? items.map(i => `<tr><td>${i.brand}</td><td>${i.totalSold}</td><td class="gold-text">${fmt(i.revenue)}</td></tr>`).join('')
            : '<tr><td colspan="3">Chưa có dữ liệu.</td></tr>';
    }

    renderTopProducts(items) {
        const tbody = document.getElementById('report-top-products-tbody');
        if (!tbody) return;
        const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
        tbody.innerHTML = items.length
            ? items.map(i => `<tr><td>${i.productName}</td><td>${i.totalSold}</td><td class="gold-text">${fmt(i.revenue)}</td></tr>`).join('')
            : '<tr><td colspan="3">Chưa có dữ liệu.</td></tr>';
    }

    renderLowStock(items) {
        const tbody = document.getElementById('report-low-stock-tbody');
        if (!tbody) return;
        tbody.innerHTML = items.length
            ? items.map(i => `<tr><td>${i.code}</td><td>${i.name}</td><td>${i.ml}ml</td><td><span class="badge badge-sale">${i.stock}</span></td></tr>`).join('')
            : '<tr><td colspan="4">Kho hàng đang ổn định.</td></tr>';
    }
}
