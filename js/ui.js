const ui = {
    showModal: (modalId) => {
        document.getElementById(modalId).classList.remove('hidden');
    },

    closeModal: (modalId) => {
        document.getElementById(modalId).classList.add('hidden');
    },

    showToast: (message, type = 'info') => {
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            didOpen: (toast) => {
                toast.addEventListener('mouseenter', Swal.stopTimer)
                toast.addEventListener('mouseleave', Swal.resumeTimer)
            }
        });

        Toast.fire({
            icon: type,
            title: message
        });
    },

    toggleLoading: (isLoading) => {
        const btn = document.querySelector('.header-actions button');
        if (btn) {
            if (isLoading) {
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                btn.disabled = true;
            } else {
                btn.innerHTML = '<i class="fas fa-sync-alt"></i>';
                btn.disabled = false;
            }
        }
    },

    updateAuthUI: (user) => {
        const loginBtn = document.getElementById('login-btn');
        const userProfile = document.getElementById('user-profile');
        const usernameSpan = document.getElementById('username');

        if (user) {
            loginBtn.classList.add('hidden');
            userProfile.classList.remove('hidden');
            usernameSpan.textContent = user.name || user.username;
        } else {
            loginBtn.classList.remove('hidden');
            userProfile.classList.add('hidden');
            usernameSpan.textContent = '';
        }
    },
    
    renderTable: (tableId, data, columns) => {
        const table = document.getElementById(tableId);
        const tbody = table.querySelector('tbody');
        tbody.innerHTML = '';

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${columns.length}" class="text-center">Nenhum dado encontrado</td></tr>`;
            return;
        }

        data.forEach((row, index) => { // Added index for row numbering
            const tr = document.createElement('tr');
            columns.forEach(col => {
                const td = document.createElement('td');
                if (col.render) {
                    td.innerHTML = col.render(row, index); // Pass index to render function
                } else {
                    td.textContent = row[col.field] || '-';
                }
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
    },
};
