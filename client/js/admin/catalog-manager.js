// Quản lý Thương hiệu, Danh mục và Khách hàng trong Admin Panel
class CatalogManager {
    constructor() {
        this.brandService = new BrandService();
        this.categoryService = new CategoryService();
        this.userService = new UserService();
        this.brands = [];
        this.categories = [];
        this.modalMode = 'brand';
        this.editingId = null;
    }

    async loadBrands() {
        const tbody = document.getElementById('admin-brands-tbody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Đang tải...</td></tr>';
        try {
            this.brands = await this.brandService.getAll();
            tbody.innerHTML = this.brands.length ? this.brands.map(b => `
                <tr>
                    <td>#${Number(b.id)}</td>
                    <td><strong>${escapeHtml(b.name)}</strong></td>
                    <td>${escapeHtml(b.slug)}</td>
                    <td>${Number(b.productCount || 0)}</td>
                    <td>
                        <button class="btn-outline btn-sm" onclick="adminApp.catalogManager.openModal('brand', ${Number(b.id)})">Sửa</button>
                        <button class="btn-danger btn-sm" onclick="adminApp.catalogManager.deleteItem('brand', ${Number(b.id)})">Xóa</button>
                    </td>
                </tr>
            `).join('') : '<tr><td colspan="5" style="text-align:center;">Chưa có thương hiệu.</td></tr>';
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="5">${escapeHtml(err.message)}</td></tr>`;
        }
    }

    async loadCategories() {
        const tbody = document.getElementById('admin-categories-tbody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Đang tải...</td></tr>';
        try {
            this.categories = await this.categoryService.getAll();
            tbody.innerHTML = this.categories.length ? this.categories.map(c => `
                <tr>
                    <td>#${Number(c.id)}</td>
                    <td><strong>${escapeHtml(c.name)}</strong></td>
                    <td>${escapeHtml(c.slug)}</td>
                    <td>${Number(c.productCount || 0)}</td>
                    <td>
                        <button class="btn-outline btn-sm" onclick="adminApp.catalogManager.openModal('category', ${Number(c.id)})">Sửa</button>
                        <button class="btn-danger btn-sm" onclick="adminApp.catalogManager.deleteItem('category', ${Number(c.id)})">Xóa</button>
                    </td>
                </tr>
            `).join('') : '<tr><td colspan="5" style="text-align:center;">Chưa có danh mục.</td></tr>';
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="5">${escapeHtml(err.message)}</td></tr>`;
        }
    }

    async loadUsers() {
        const tbody = document.getElementById('admin-users-tbody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Đang tải...</td></tr>';
        try {
            const users = await this.userService.getAll();
            tbody.innerHTML = users.length ? users.map(u => `
                <tr>
                    <td>#${Number(u.id)}</td>
                    <td><strong>${escapeHtml(u.fullName)}</strong></td>
                    <td>${escapeHtml(u.email)}</td>
                    <td>${escapeHtml(u.phone || '—')}</td>
                    <td><span class="badge ${u.role === 'admin' ? 'badge-new' : 'badge-hot'}">${escapeHtml(u.role)}</span></td>
                    <td>${new Date(u.createdAt).toLocaleDateString('vi-VN')}</td>
                </tr>
            `).join('') : '<tr><td colspan="6" style="text-align:center;">Chưa có tài khoản.</td></tr>';
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="6">${escapeHtml(err.message)}</td></tr>`;
        }
    }

    openModal(mode, id = null) {
        this.modalMode = mode;
        this.editingId = id;
        const title = document.getElementById('catalog-modal-title');
        const logoGroup = document.getElementById('catalog-logo-group');
        const form = document.getElementById('admin-catalog-form');
        form?.reset();

        const isBrand = mode === 'brand';
        if (logoGroup) logoGroup.style.display = isBrand ? 'block' : 'none';
        if (title) title.textContent = (id ? 'Chỉnh sửa ' : 'Thêm ') + (isBrand ? 'thương hiệu' : 'danh mục');

        if (id) {
            const item = (isBrand ? this.brands : this.categories).find(x => Number(x.id) === Number(id));
            if (item) {
                document.getElementById('catalog-name').value = item.name || '';
                document.getElementById('catalog-slug').value = item.slug || '';
                document.getElementById('catalog-desc').value = item.description || '';
                if (isBrand) document.getElementById('catalog-logo').value = item.logo || '';
            }
        }
        document.getElementById('admin-catalog-modal')?.classList.add('active');
    }

    closeModal() {
        document.getElementById('admin-catalog-modal')?.classList.remove('active');
    }

    async save(e) {
        e.preventDefault();
        const payload = {
            name: document.getElementById('catalog-name').value.trim(),
            slug: document.getElementById('catalog-slug').value.trim(),
            description: document.getElementById('catalog-desc').value.trim()
        };
        if (this.modalMode === 'brand') {
            payload.logo = document.getElementById('catalog-logo').value.trim();
        }

        const svc = this.modalMode === 'brand' ? this.brandService : this.categoryService;
        try {
            if (this.editingId) {
                await svc.update(this.editingId, payload);
                toast.success('Cập nhật thành công.');
            } else {
                await svc.create(payload);
                toast.success('Thêm mới thành công.');
            }
            this.closeModal();
            if (this.modalMode === 'brand') await this.loadBrands();
            else await this.loadCategories();
        } catch (err) {
            toast.error(err.message);
        }
    }

    async deleteItem(mode, id) {
        if (!confirm(`Bạn chắc chắn muốn xóa mục #${id}?`)) return;
        const svc = mode === 'brand' ? this.brandService : this.categoryService;
        try {
            await svc.delete(id);
            toast.success('Đã xóa thành công.');
            if (mode === 'brand') await this.loadBrands();
            else await this.loadCategories();
        } catch (err) {
            toast.error(err.message);
        }
    }
}
