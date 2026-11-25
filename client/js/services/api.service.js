// Lớp dịch vụ cơ sở (Base API Service) dùng chung cho tất cả các service phía Client
class ApiService {
    constructor() {
        // Tự động xác định đường dẫn tới thư mục server
        const path = window.location.pathname;
        if (path.includes('/client/')) {
            this.baseURL = path.split('/client/')[0] + '/server';
        } else {
            this.baseURL = window.location.hostname === 'localhost'
                ? 'http://localhost/HDV/server'
                : '/server';
        }
    }

    // Lấy JWT token từ localStorage
    getToken() {
        return localStorage.getItem('perfume_token') || '';
    }

    // Định dạng tiền tệ VNĐ
    formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount || 0);
    }

    // Hàm gửi HTTP request chung
    async request(method, endpoint, data = null) {
        const headers = {
            'Content-Type': 'application/json'
        };

        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const options = {
            method: method.toUpperCase(),
            headers
        };

        if (data && ['POST', 'PUT', 'PATCH'].includes(options.method)) {
            options.body = JSON.stringify(data);
        }

        const url = `${this.baseURL}${endpoint}`;
        const response = await fetch(url, options);
        const result = await response.json().catch(() => ({
            success: false,
            message: 'Phản hồi từ server không hợp lệ.'
        }));

        if (!response.ok || result.success === false) {
            throw new Error(result.message || `Lỗi kết nối (${response.status})`);
        }

        return result.data;
    }

    async get(endpoint, params = {}) {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                query.append(key, value);
            }
        });
        const qs = query.toString();
        return this.request('GET', qs ? `${endpoint}?${qs}` : endpoint);
    }

    async post(endpoint, data) {
        return this.request('POST', endpoint, data);
    }

    async put(endpoint, data) {
        return this.request('PUT', endpoint, data);
    }

    async patch(endpoint, data) {
        return this.request('PATCH', endpoint, data);
    }

    async delete(endpoint) {
        return this.request('DELETE', endpoint);
    }

    // Upload file ảnh lên server bằng FormData
    async uploadImage(file) {
        const formData = new FormData();
        formData.append('image', file);

        const headers = {};
        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${this.baseURL}/upload`, {
            method: 'POST',
            headers,
            body: formData
        });
        const result = await response.json().catch(() => ({
            success: false,
            message: 'Phản hồi upload không hợp lệ.'
        }));
        if (!response.ok || result.success === false) {
            throw new Error(result.message || 'Tải ảnh thất bại.');
        }
        return result.data;
    }
}
