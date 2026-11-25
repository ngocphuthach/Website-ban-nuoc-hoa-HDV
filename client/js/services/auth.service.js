// Service xử lý đăng nhập, đăng ký và phiên người dùng
class AuthService extends ApiService {
    async register(data) {
        const res = await this.post('/auth/register', data);
        this.saveSession(res.token, res.user);
        return res;
    }

    async login(email, password) {
        const res = await this.post('/auth/login', { email, password });
        this.saveSession(res.token, res.user);
        return res;
    }

    async getMe() {
        const user = await this.get('/auth/me');
        this.updateLocalUser(user);
        return user;
    }

    saveSession(token, user) {
        localStorage.setItem('perfume_token', token);
        localStorage.setItem('perfume_user', JSON.stringify(user));
    }

    logout() {
        localStorage.removeItem('perfume_token');
        localStorage.removeItem('perfume_user');
    }

    getCurrentUser() {
        try {
            const raw = localStorage.getItem('perfume_user');
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    updateLocalUser(user) {
        localStorage.setItem('perfume_user', JSON.stringify(user));
    }

    isLoggedIn() {
        return !!this.getToken() && !!this.getCurrentUser();
    }

    isAdmin() {
        const user = this.getCurrentUser();
        return !!user && user.role === 'admin';
    }
}
