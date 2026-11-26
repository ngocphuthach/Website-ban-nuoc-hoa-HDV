// Component hiển thị thông báo nổi (Toast Notification)
class Toast {
    getContainer() {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }
        return container;
    }

    show(message, type = 'info', duration = 3200) {
        const container = this.getContainer();
        const icons = {
            success: 'fa-circle-check',
            error: 'fa-circle-xmark',
            warning: 'fa-triangle-exclamation',
            info: 'fa-circle-info'
        };

        const toastEl = document.createElement('div');
        toastEl.className = `toast toast-${type}`;
        toastEl.innerHTML = `
            <i class="fa-solid ${icons[type] || icons.info}"></i>
            <span class="toast-msg">${message}</span>
            <button class="toast-close" aria-label="Đóng">&times;</button>
            <div class="toast-progress" style="animation-duration: ${duration}ms;"></div>
        `;

        toastEl.querySelector('.toast-close').addEventListener('click', () => {
            this.removeToast(toastEl);
        });

        container.appendChild(toastEl);
        requestAnimationFrame(() => toastEl.classList.add('show'));

        setTimeout(() => this.removeToast(toastEl), duration);
    }

    removeToast(el) {
        if (!el || !el.parentElement) return;
        el.classList.remove('show');
        setTimeout(() => el.remove(), 300);
    }

    success(msg) { this.show(msg, 'success'); }
    error(msg) { this.show(msg, 'error', 4000); }
    warning(msg) { this.show(msg, 'warning'); }
    info(msg) { this.show(msg, 'info'); }
}

const toast = new Toast();
