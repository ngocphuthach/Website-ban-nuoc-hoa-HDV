// Service gọi API sản phẩm
class ProductService extends ApiService {
    async getAll(filters = {}, extraOptions = {}) {
        return this.get('/products', filters, extraOptions);
    }

    async getById(id) {
        return this.get(`/products/${id}`);
    }

    async create(data) {
        return this.post('/products', data);
    }

    async update(id, data) {
        return this.put(`/products/${id}`, data);
    }

    async delete(id) {
        return super.delete(`/products/${id}`);
    }
}
