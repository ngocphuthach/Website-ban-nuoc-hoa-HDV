// Service gọi API danh mục
class CategoryService extends ApiService {
    async getAll() {
        return this.get('/categories');
    }

    async create(data) {
        return this.post('/categories', data);
    }

    async update(id, data) {
        return this.put(`/categories/${id}`, data);
    }

    async delete(id) {
        return super.delete(`/categories/${id}`);
    }
}
