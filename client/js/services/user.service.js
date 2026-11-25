// Service gọi API quản lý người dùng
class UserService extends ApiService {
    async getAll() {
        return this.get('/users');
    }

    async getMe() {
        return this.get('/auth/me');
    }

    async updateProfile(data) {
        return this.put('/users/me', data);
    }
}
