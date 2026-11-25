// Service gọi API thương hiệu
class BrandService extends ApiService {
    async getAll() {
        return this.get('/brands');
    }

    async getById(id) {
        return this.get(`/brands/${id}`);
    }

    async create(data) {
        return this.post('/brands', data);
    }

    async update(id, data) {
        return this.put(`/brands/${id}`, data);
    }

    async delete(id) {
        return super.delete(`/brands/${id}`);
    }
}
