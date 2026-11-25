// Controller xử lý Trang Hồ Sơ Cá Nhân (#trang-ho-so)
class ProfilePage {
    constructor() {
        this.userService = new UserService();
        this.authService = new AuthService();
        this.bound = false;
    }

    async init() {
        if (!this.authService.isLoggedIn()) {
            window.location.hash = '#trang-dang-nhap';
            return;
        }

        try {
            const user = await this.userService.getMe();
            document.getElementById('profile-fullname').value = user.fullName || '';
            document.getElementById('profile-email').value = user.email || '';
            document.getElementById('profile-phone').value = user.phone || '';
            document.getElementById('profile-address').value = user.address || '';
        } catch (err) {
            toast.error(err.message);
        }

        if (!this.bound) {
            this.bound = true;
            document.getElementById('profile-form')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveProfile();
            });
        }
    }

    async saveProfile() {
        try {
            const updated = await this.userService.updateProfile({
                fullName: document.getElementById('profile-fullname').value.trim(),
                phone: document.getElementById('profile-phone').value.trim(),
                address: document.getElementById('profile-address').value.trim()
            });
            this.authService.updateLocalUser(updated);
            app.updateNavbar();
            toast.success('Đã cập nhật hồ sơ thành công.');
        } catch (err) {
            toast.error(err.message);
        }
    }
}
