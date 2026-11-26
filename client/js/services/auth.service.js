// Service xử lý đăng nhập, đăng ký (tách biệt hoàn toàn) và phiên người dùng
class AuthService extends ApiService {
    // Đăng ký tài khoản mới: CHỈ tạo tài khoản, tuyệt đối không lưu token hay tự động đăng nhập
    async register(data) {
        const res = await this.post('/auth/register', data);
        return res;
    }

    // Đăng nhập: chỉ lưu phiên khi Server xác thực thành công và cấp JWT Token
    async login(email, password) {
        const res = await this.post('/auth/login', { email, password });
        if (res && res.token && res.user) {
            this.saveSession(res.token, res.user);
        }
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

    clearLocalSession() {
        localStorage.removeItem('perfume_token');
        localStorage.removeItem('perfume_user');
        sessionStorage.removeItem('perfume_token');
        sessionStorage.removeItem('perfume_user');
    }

    async logout() {
        const token = this.getToken();
        if (token) {
            try {
                await this.post('/auth/logout', {});
            } catch (e) {
                // Bỏ qua lỗi mạng khi thu hồi token, vẫn xóa phiên cục bộ
            }
        }
        this.clearLocalSession();
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
        return this.isLoggedIn() && !!user && user.role === 'admin';
    }
}
