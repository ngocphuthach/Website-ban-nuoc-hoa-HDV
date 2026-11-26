// Quản lý sản phẩm trong trang Admin (có phân trang & upload ảnh Choose File)
class ProductManager {
    constructor() {
        this.productService = new ProductService();
        this.brandService = new BrandService();
        this.categoryService = new CategoryService();
        this.editingId = null;
        this.sizes = [];
        this.currentPage = 1;
        this.limit = 10;
        this.searchQuery = '';
        this.searchTimer = null;
        this.selectedFile = null;
        this.extraImages = [];
    }

    async init() {
        await Promise.all([this.loadProducts(), this.loadDropdowns()]);
    }

    onSearch(value) {
        clearTimeout(this.searchTimer);
        this.searchTimer = setTimeout(() => {
            this.searchQuery = value.trim();
            this.currentPage = 1;
            this.loadProducts();
        }, 300);
    }

    async loadDropdowns() {
        try {
            const [brands, categories] = await Promise.all([
                this.brandService.getAll(),
                this.categoryService.getAll()
            ]);
            const brandSel = document.getElementById('admin-prod-brand');
            const typeSel = document.getElementById('admin-prod-type');
            if (brandSel) {
                brandSel.innerHTML = brands.map(b => `<option value="${b.slug}">${b.name}</option>`).join('');
            }
            if (typeSel) {
                typeSel.innerHTML = categories.map(c => `<option value="${c.slug}">${c.name}</option>`).join('');
            }
        } catch (err) {
            console.error(err);
        }
    }

    async loadProducts(page = this.currentPage) {
        this.currentPage = page;
        const tbody = document.getElementById('admin-products-tbody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Đang tải...</td></tr>';

        try {
            const res = await this.productService.getAll({
                page: this.currentPage,
                limit: this.limit,
                search: this.searchQuery
            });
            const items = res.items || [];
            if (!items.length) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Không tìm thấy sản phẩm.</td></tr>';
                this.renderPagination(1, 1);
                return;
            }

            tbody.innerHTML = items.map(p => {
                const sizesText = (p.sizes || []).map(s => `${s.ml}ml (${s.stock})`).join(', ');
                let img = p.image || 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=100';
                if (img.startsWith('pic/')) img = '../../' + img;
                return `
                    <tr>
                        <td>#${p.id}</td>
                        <td><strong>${p.code}</strong></td>
                        <td>
                            <div class="admin-prod-cell">
                                <img src="${img}" alt="" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1541643600914-78b084683601?w=100'">
                                <span>${p.name}</span>
                            </div>
                        </td>
                        <td>${p.brandName || p.brand}</td>
                        <td>${sizesText || '-'}</td>
                        <td>${p.discount > 0 ? `<span class="badge badge-sale">-${p.discount}%</span>` : '0%'}</td>
                        <td>
                            <button class="btn-outline btn-sm" onclick="adminApp.productManager.openEditModal(${p.id})">Sửa</button>
                            <button class="btn-danger btn-sm" onclick="adminApp.productManager.deleteProduct(${p.id})">Xóa</button>
                        </td>
                    </tr>
                `;
            }).join('');

            this.renderPagination(res.page || 1, res.totalPages || 1);
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="7">${err.message}</td></tr>`;
        }
    }

    renderPagination(currentPage, totalPages) {
        const container = document.getElementById('admin-products-pagination');
        if (!container) return;
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }
        let html = '';
        for (let i = 1; i <= totalPages; i++) {
            html += `<button type="button" class="page-btn ${i === currentPage ? 'active' : ''}" onclick="adminApp.productManager.loadProducts(${i})">${i}</button>`;
        }
        container.innerHTML = html;
    }

    setPreview(imgPath) {
        const preview = document.getElementById('admin-prod-preview');
        const label = document.getElementById('admin-prod-img-label');
        if (!preview || !label) return;

        if (imgPath) {
            preview.src = imgPath.startsWith('pic/') ? '../../' + imgPath : imgPath;
            preview.style.display = 'block';
            label.textContent = imgPath;
        } else {
            preview.style.display = 'none';
            preview.src = '';
            label.textContent = 'Chưa chọn ảnh';
        }
    }

    handleFileSelect(event) {
        const file = event.target.files?.[0];
        if (!file) return;
        this.selectedFile = file;
        const preview = document.getElementById('admin-prod-preview');
        const label = document.getElementById('admin-prod-img-label');
        if (preview) {
            preview.src = URL.createObjectURL(file);
            preview.style.display = 'block';
        }
        if (label) {
            label.textContent = `Đã chọn: ${file.name}`;
        }
    }

    renderGallery() {
        const root=document.getElementById('gallery-admin-list'); root.replaceChildren();
        this.extraImages.forEach((item,i)=>{
            const row=document.createElement('div'); row.className='gallery-admin-item';
            const img=document.createElement('img'); img.src=item instanceof File?URL.createObjectURL(item):galleryUrl(item); if(item instanceof File) img.onload=()=>URL.revokeObjectURL(img.src); img.alt='Ảnh bổ sung '+(i+1); row.append(img);
            [['↑',-1],['↓',1],['×',0]].forEach(([label,delta])=>{const b=document.createElement('button');b.type='button';b.className='btn-outline btn-sm';b.textContent=label;b.setAttribute('aria-label',delta===0?'Xóa ảnh':delta<0?'Đưa lên':'Đưa xuống');b.onclick=()=>{if(!delta)this.extraImages.splice(i,1);else if(i+delta>=0&&i+delta<this.extraImages.length)[this.extraImages[i],this.extraImages[i+delta]]=[this.extraImages[i+delta],this.extraImages[i]];this.renderGallery();};row.append(b);}); root.append(row);
        });
    }
    setupGallery(images=[]) {
        this.extraImages=images.slice(0,4); const input=document.getElementById('gallery-files'); input.value='';
        input.onchange=()=>{const files=[...input.files];if(files.length+this.extraImages.length>4){toast.error('Tối đa 4 ảnh bổ sung.');input.value='';return;}this.extraImages.push(...files);input.value='';this.renderGallery();}; this.renderGallery();
    }
    openAddModal() {
        this.editingId = null;
        this.selectedFile = null;
        document.getElementById('product-modal-title').textContent = 'Thêm sản phẩm mới';
        document.getElementById('admin-product-form').reset();
        document.getElementById('admin-prod-image').value = '';
        this.setPreview('');
        this.setupGallery();
        this.sizes = [{ ml: 100, price: 2500000, stock: 20 }];
        this.renderSizesInModal();
        document.getElementById('admin-product-modal').classList.add('active');
    }

    async openEditModal(id) {
        try {
            const p = await this.productService.getById(id);
            this.editingId = p.id;
            this.selectedFile = null;
            document.getElementById('product-modal-title').textContent = `Chỉnh sửa: ${p.name}`;
            document.getElementById('admin-prod-code').value = p.code || '';
            document.getElementById('admin-prod-name').value = p.name || '';
            document.getElementById('admin-prod-brand').value = p.brand || '';
            document.getElementById('admin-prod-type').value = p.type || '';
            document.getElementById('admin-prod-discount').value = p.discount || 0;
            document.getElementById('admin-prod-image').value = p.image || '';
            document.getElementById('admin-prod-file').value = '';
            this.setPreview(p.image || '');
            this.setupGallery(productGalleryImages(p).filter(x=>x!==p.image));
            document.getElementById('admin-prod-desc').value = p.shortDesc || '';
            document.getElementById('admin-prod-new').checked = !!p.isNew;
            document.getElementById('admin-prod-featured').checked = !!p.isFeatured;

            this.sizes = (p.sizes && p.sizes.length) ? p.sizes : [{ ml: 100, price: 0, stock: 0 }];
            this.renderSizesInModal();
            document.getElementById('admin-product-modal').classList.add('active');
        } catch (err) {
            toast.error(err.message);
        }
    }

    closeModal() {
        document.getElementById('admin-product-modal')?.classList.remove('active');
    }

    addSizeRow() {
        this.sizes.push({ ml: 50, price: 1500000, stock: 10 });
        this.renderSizesInModal();
    }

    removeSizeRow(index) {
        if (this.sizes.length <= 1) {
            toast.warning('Sản phẩm cần ít nhất 1 dung tích.');
            return;
        }
        this.sizes.splice(index, 1);
        this.renderSizesInModal();
    }

    renderSizesInModal() {
        const container = document.getElementById('admin-sizes-list');
        if (!container) return;
        container.innerHTML = this.sizes.map((s, idx) => `
            <div class="size-row">
                <input type="number" placeholder="ml" value="${s.ml}" onchange="adminApp.productManager.sizes[${idx}].ml = Number(this.value)">
                <input type="number" placeholder="Giá (VNĐ)" value="${s.price}" onchange="adminApp.productManager.sizes[${idx}].price = Number(this.value)">
                <input type="number" placeholder="Tồn kho" value="${s.stock}" onchange="adminApp.productManager.sizes[${idx}].stock = Number(this.value)">
                <button type="button" class="btn-danger btn-sm" onclick="adminApp.productManager.removeSizeRow(${idx})">&times;</button>
            </div>
        `).join('');
    }

    async saveProduct(e) {
        e.preventDefault();
        try {
            let imagePath = document.getElementById('admin-prod-image').value.trim();

            // Nếu người dùng vừa chọn file ảnh mới thì upload lên server trước
            if (this.selectedFile) {
                const uploaded = await this.productService.uploadImage(this.selectedFile);
                imagePath = uploaded.path;
            }

            const images = [];
            for (const item of this.extraImages) images.push(item instanceof File ? (await this.productService.uploadImage(item)).path : item);
            const payload = {
                images,
                code: document.getElementById('admin-prod-code').value.trim(),
                name: document.getElementById('admin-prod-name').value.trim(),
                brand: document.getElementById('admin-prod-brand').value,
                type: document.getElementById('admin-prod-type').value,
                discount: Number(document.getElementById('admin-prod-discount').value || 0),
                image: imagePath,
                shortDesc: document.getElementById('admin-prod-desc').value.trim(),
                isNew: document.getElementById('admin-prod-new').checked,
                isFeatured: document.getElementById('admin-prod-featured').checked,
                sizes: this.sizes
            };

            if (this.editingId) {
                await this.productService.update(this.editingId, payload);
                toast.success('Đã cập nhật sản phẩm.');
            } else {
                await this.productService.create(payload);
                toast.success('Đã thêm sản phẩm mới.');
            }
            this.closeModal();
            await this.loadProducts(this.currentPage);
        } catch (err) {
            toast.error(err.message);
        }
    }

    async deleteProduct(id) {
        if (!confirm(`Bạn chắc chắn muốn xóa sản phẩm #${id}?`)) return;
        try {
            await this.productService.delete(id);
            toast.success('Đã xóa sản phẩm.');
            await this.loadProducts(this.currentPage);
        } catch (err) {
            toast.error(err.message);
        }
    }
}
