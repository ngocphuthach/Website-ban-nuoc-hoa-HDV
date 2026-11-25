// Service gọi API đơn hàng
class OrderService extends ApiService {
    async getMyOrders() {
        return this.get('/orders/my');
    }

    async getAll(filters = {}) {
        return this.get('/orders', filters);
    }

    async getById(id) {
        return this.get(`/orders/${id}`);
    }

    async create(data) {
        return this.post('/orders', data);
    }

    async updateStatus(id, status) {
        return this.patch(`/orders/${id}/status`, { status });
    }

    async cancel(id) {
        return this.patch(`/orders/${id}/cancel`, {});
    }
}
