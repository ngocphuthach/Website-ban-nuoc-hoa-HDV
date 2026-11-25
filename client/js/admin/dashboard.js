// Controller Dashboard trang quản trị Admin
class DashboardPage {
    constructor() {
        this.reportService = new ReportService();
    }

    async init() {
        try {
            const data = await this.reportService.getDashboard();
            this.renderStats(data.summary || {});
            this.renderRevenueByBrand(data.revenueByBrand || []);
            this.renderOrderStatus(data.ordersByStatus || []);
            return data;
        } catch (err) {
            toast.error('Lỗi tải dữ liệu Dashboard: ' + err.message);
            return null;
        }
    }

    renderStats(summary) {
        const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
        const revEl = document.getElementById('kpi-revenue');
        const ordEl = document.getElementById('kpi-orders');
        const usrEl = document.getElementById('kpi-users');
        const prdEl = document.getElementById('kpi-products');

        if (revEl) revEl.textContent = fmt(summary.totalRevenue);
        if (ordEl) ordEl.textContent = summary.totalOrders ?? 0;
        if (usrEl) usrEl.textContent = summary.totalUsers ?? 0;
        if (prdEl) prdEl.textContent = summary.totalProducts ?? 0;
    }

    // Tự vẽ biểu đồ cột doanh thu theo thương hiệu bằng Canvas API
    renderRevenueByBrand(items) {
        const canvas = document.getElementById('chart-brand-revenue');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        if (!items.length) {
            ctx.fillStyle = '#888';
            ctx.font = '14px Poppins, sans-serif';
            ctx.fillText('Chưa có dữ liệu doanh thu', 20, h / 2);
            return;
        }

        const top = items.slice(0, 6);
        const maxVal = Math.max(...top.map(i => Number(i.revenue) || 0), 1);
        const pad = 40;
        const chartH = h - pad * 2;
        const barW = Math.min(50, (w - pad * 2) / top.length - 16);

        top.forEach((item, idx) => {
            const val = Number(item.revenue) || 0;
            const barH = (val / maxVal) * chartH;
            const x = pad + idx * ((w - pad * 2) / top.length) + 8;
            const y = h - pad - barH;

            const grad = ctx.createLinearGradient(x, y, x, h - pad);
            grad.addColorStop(0, '#f0d080');
            grad.addColorStop(1, '#c9a84c');

            ctx.fillStyle = grad;
            ctx.fillRect(x, y, barW, barH);

            ctx.fillStyle = '#f5f0eb';
            ctx.font = '11px Poppins, sans-serif';
            ctx.fillText(String(item.brand).slice(0, 8), x, h - 18);
        });
    }

    // Vẽ biểu đồ tròn trạng thái đơn hàng bằng Canvas API
    renderOrderStatus(items) {
        const canvas = document.getElementById('chart-order-status');
        const legend = document.getElementById('chart-status-legend');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        const total = items.reduce((s, i) => s + Number(i.count || 0), 0);
        if (!total) {
            ctx.fillStyle = '#888';
            ctx.font = '14px Poppins, sans-serif';
            ctx.fillText('Chưa có đơn hàng', 20, h / 2);
            if (legend) legend.innerHTML = '';
            return;
        }

        const colors = ['#c9a84c', '#3b82f6', '#a855f7', '#22c55e', '#ef4444'];
        let startAngle = -Math.PI / 2;
        const cx = w / 2;
        const cy = h / 2;
        const radius = Math.min(w, h) / 2 - 16;

        let legendHtml = '';
        items.forEach((item, idx) => {
            const count = Number(item.count || 0);
            const slice = (count / total) * Math.PI * 2;
            const color = colors[idx % colors.length];

            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, radius, startAngle, startAngle + slice);
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.fill();

            startAngle += slice;
            legendHtml += `<div><span class="dot" style="background:${color}"></span>${item.status}: <strong>${count}</strong></div>`;
        });

        if (legend) legend.innerHTML = legendHtml;
    }
}
