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
        const btn = document.querySelector('button[onclick="app.syncData()"]');
        if (btn) {
            if (isLoading) {
                btn.innerHTML = '<span class="material-symbols-outlined text-[20px] animate-spin">sync</span>';
                btn.disabled = true;
            } else {
                btn.innerHTML = '<span class="material-symbols-outlined text-[20px]">sync</span>';
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
            tbody.innerHTML = `<tr><td colspan="${columns.length}" class="px-6 py-4 text-center text-gray-500">Nenhum dado encontrado</td></tr>`;
            return;
        }

        data.forEach((row, index) => {
            const tr = document.createElement('tr');
            tr.className = "hover:bg-blue-50/50 dark:hover:bg-white/5 transition-colors border-b border-[#dadfe7] dark:border-gray-700 last:border-0";
            
            columns.forEach((col, colIndex) => {
                const td = document.createElement('td');
                // Base classes
                td.className = "px-6 py-4 text-[#101418] dark:text-gray-200";
                
                // Specific styling
                if (colIndex === 0) td.classList.add('font-medium');
                if (col.field === 'qty' || col.field === 'QUANTIDADE' || col.field === 'ESTOQUE_MINIMO') td.classList.add('text-right'); // Align numbers right
                if (col.field === 'actions') td.classList.add('text-center');

                if (col.render) {
                    td.innerHTML = col.render(row, index);
                } else {
                    td.textContent = row[col.field] || '-';
                }
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
    }
};
