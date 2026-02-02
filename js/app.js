const app = {
    state: {
        products: [],
        entries: [],
        exits: [],
        balance: []
    },
    
    config: {
        pollingInterval: 30000, // 30 seconds
        syncTimer: null
    },

    init: () => {
        auth.init();
        app.startPolling();
    },

    navigate: (viewId) => {
        document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.nav-links a.nav-item').forEach(el => {
            el.classList.remove('active');
            // Remove active styles, add inactive styles
            el.classList.remove('bg-[#FFD100]', 'text-primary', 'shadow-sm', 'font-bold');
            el.classList.add('text-white/80', 'hover:bg-white/10', 'hover:text-white');
            
            // Fix icons/text colors inside
            const icon = el.querySelector('.material-symbols-outlined');
            const text = el.querySelector('p');
            if (icon) icon.classList.remove('text-primary');
            if (text) text.classList.remove('font-bold');
        });
        
        document.getElementById(`view-${viewId}`).classList.remove('hidden');
        
        const navItems = document.querySelectorAll('.nav-links a.nav-item');
        let activeItem;
        if (viewId === 'dashboard') activeItem = navItems[0];
        if (viewId === 'products') activeItem = navItems[1];
        if (viewId === 'entries') activeItem = navItems[2];
        if (viewId === 'exits') activeItem = navItems[3];

        if (activeItem) {
            activeItem.classList.add('active');
            // Add active styles, remove inactive styles
            activeItem.classList.remove('text-white/80', 'hover:bg-white/10', 'hover:text-white');
            activeItem.classList.add('bg-[#FFD100]', 'text-primary', 'shadow-sm', 'font-bold');
            
            // Fix icons/text colors inside
            const icon = activeItem.querySelector('.material-symbols-outlined');
            const text = activeItem.querySelector('p');
            if (icon) icon.classList.add('text-primary');
            if (text) text.classList.add('font-bold');
        }

        const titles = {
            'dashboard': 'Visão Geral',
            'products': 'Produtos',
            'entries': 'Entradas',
            'exits': 'Saídas'
        };
        document.getElementById('page-title').textContent = titles[viewId];
    },

    startPolling: () => {
        if (app.config.syncTimer) clearInterval(app.config.syncTimer);
        app.config.syncTimer = setInterval(() => {
             // Sempre sincroniza, pois leitura é pública
             app.syncData(true);
        }, app.config.pollingInterval);
    },

    syncData: async (silent = false) => {
        // Remover checagem de auth para permitir leitura pública
        // if (!auth.account) return;

        if (!silent) ui.toggleLoading(true);

        try {
            const [products, entries, exits] = await Promise.all([
                graph.readTable('PRODUTOS'),
                graph.readTable('ENTRADAS'),
                graph.readTable('SAIDAS')
            ]);

            app.state.products = products;
            app.state.entries = entries;
            app.state.exits = exits;

            app.calculateBalance();
            app.updateDatalists(); // Ensure lists are populated
            app.updateUI();
            
            const now = new Date();
            document.getElementById('last-sync').textContent = `${now.toLocaleTimeString()}`;
            
            if (!silent && products.length > 0) ui.showToast("Dados atualizados com sucesso", "success");

        } catch (error) {
            console.error(error);
            if (!silent) ui.showToast("Erro na sincronização: " + error.message, "error");
        } finally {
            if (!silent) ui.toggleLoading(false);
        }
    },

    initData: () => {
        app.syncData();
    },

    calculateBalance: () => {
        const balanceMap = {};

        // Init products
        app.state.products.forEach(p => {
            const id = p.ID;
            if (!id) return;
            
            balanceMap[id] = {
                id: id,
                code: p.CODIGO,
                name: p.NOME,
                unit: p.UNIDADE,
                type: p.TIPO,
                min: parseFloat(p.ESTOQUE_MINIMO) || 0,
                qty: 0,
                status: 'OK'
            };
        });

        // Sum Entries
        app.state.entries.forEach(e => {
            const pid = e.PRODUTO_ID;
            const qty = parseFloat(e.QUANTIDADE) || 0;
            if (balanceMap[pid]) {
                balanceMap[pid].qty += qty;
            }
        });

        // Subtract Exits
        app.state.exits.forEach(s => {
            const pid = s.PRODUTO_ID;
            const qty = parseFloat(s.QUANTIDADE) || 0;
            if (balanceMap[pid]) {
                balanceMap[pid].qty -= qty;
            }
        });

        app.state.balance = Object.values(balanceMap).map(item => {
            if (item.qty <= item.min) {
                item.status = 'ESTOQUE BAIXO';
            }
            return item;
        });
        
        document.getElementById('total-items').textContent = app.state.products.length;
        const lowStock = app.state.balance.filter(i => i.status === 'ESTOQUE BAIXO').length;
        document.getElementById('low-stock-count').textContent = lowStock;
    },

    updateDatalists: () => {
        // Collect unique values - Start with defaults
        const units = new Set(['UN', 'KG', 'MT', 'CX', 'L', 'PCT']);
        const types = new Set(['Material', 'EPI', 'Ferramenta', 'Comida']);
        
        // Add existing from products
        if (app.state.products && app.state.products.length > 0) {
            app.state.products.forEach(p => {
                if (p.UNIDADE) units.add(p.UNIDADE);
                if (p.TIPO) types.add(p.TIPO);
            });
        }

        // Populate Selects
        const populate = (id, set) => {
            const el = document.getElementById(id);
            if (!el) return;
            
            const currentValue = el.value; // Preserve selection if possible
            
            // Clear but keep first option if it's a filter
            if (id === 'product-type-filter' || id === 'dashboard-type-filter') {
                el.innerHTML = '<option value="">Todos os Tipos</option>';
            } else {
                el.innerHTML = '';
            }
            
            set.forEach(val => {
                const opt = document.createElement('option');
                opt.value = val;
                opt.textContent = val;
                el.appendChild(opt);
            });

            // Add 'Outro' option only for product form
            if (id !== 'product-type-filter' && id !== 'dashboard-type-filter') {
                const other = document.createElement('option');
                other.value = 'OTHER';
                other.textContent = 'Outro (Adicionar Novo)...';
                el.appendChild(other);
            }
            
            // Restore value if it exists in new set, otherwise select first
            if (currentValue && (set.has(currentValue) || currentValue === 'OTHER')) {
                el.value = currentValue;
            }
        };

        populate('prod-unit', units);
        populate('prod-type', types);
        populate('product-type-filter', types);
        populate('dashboard-type-filter', types);
    },

    toggleCustomInput: (id) => {
        const select = document.getElementById(id);
        const customInput = document.getElementById(id + '-custom');
        
        if (select.value === 'OTHER') {
            customInput.classList.remove('hidden');
            customInput.setAttribute('required', 'true'); // Add required dynamically
            customInput.focus();
        } else {
            customInput.classList.add('hidden');
            customInput.removeAttribute('required'); // Remove required
            customInput.value = '';
        }
    },

    updateUI: () => {
        // Dashboard
        const dashboardCols = [
            { field: 'code' },
            { field: 'name' },
            { field: 'unit' },
            { field: 'type' },
            { field: 'qty', render: r => r.qty.toFixed(2) },
            { field: 'status', render: (row) => {
                if (row.status === 'OK') {
                    return `<span class="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5 text-xs font-bold text-green-700 dark:text-green-400">OK</span>`;
                } else {
                    return `<span class="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/30 px-2.5 py-0.5 text-xs font-bold text-red-700 dark:text-red-400">BAIXO</span>`;
                }
            }}
        ];
        // Now using filterDashboard instead of direct render
        app.filterDashboard();

        // Products - Filter Logic is now handled by filterProducts
        app.filterProducts();

        // Selects
        const populateSelect = (id) => {
            const sel = document.getElementById(id);
            if (!sel) return;
            sel.innerHTML = '<option value="">Selecione...</option>';
            app.state.products.forEach(p => {
                if (p.ATIVO && String(p.ATIVO).toUpperCase() === 'NÃO') return; 
                const opt = document.createElement('option');
                opt.value = p.ID;
                opt.textContent = `${p.CODIGO || p.ID} - ${p.NOME}`;
                sel.appendChild(opt);
            });
        };
        populateSelect('entry-product-id');
        populateSelect('exit-product-id');

        // Update Datalists
        app.updateDatalists();

        // History
        const histCols = [
            { field: 'DATA', render: r => {
                if (!r.DATA) return '-';
                return r.DATA; // Keep original date format for now
            }},
            { field: 'PRODUTO_ID', render: r => {
                const p = app.state.products.find(p => String(p.ID) === String(r.PRODUTO_ID));
                return p ? p.NOME : r.PRODUTO_ID;
            }},
            { field: 'QUANTIDADE', render: r => `<span class="font-bold">${r.QUANTIDADE}</span>` },
            { field: 'ORIGEM', render: r => r.ORIGEM || r.DESTINO || '-' },
            { field: 'USUARIO' }
        ];
        
        // Entradas: ORIGEM
        const entryCols = [...histCols]; 
        
        // Saidas: DESTINO
        const exitCols = [...histCols];
        exitCols[3] = { field: 'DESTINO', render: r => r.DESTINO || '-' };

        const sortedEntries = [...app.state.entries].sort((a,b) => new Date(b.CRIADO_EM) - new Date(a.CRIADO_EM)).slice(0, 5);
        const sortedExits = [...app.state.exits].sort((a,b) => new Date(b.CRIADO_EM) - new Date(a.CRIADO_EM)).slice(0, 5);
        
        ui.renderTable('entries-table', sortedEntries, entryCols);
        ui.renderTable('exits-table', sortedExits, exitCols);
    },

    filterProducts: () => {
        const searchText = document.getElementById('product-search').value.toLowerCase();
        const typeFilter = document.getElementById('product-type-filter').value;
        
        let filtered = app.state.products;

        if (searchText) {
            filtered = filtered.filter(p => 
                (p.NOME && p.NOME.toLowerCase().includes(searchText)) || 
                (p.CODIGO && p.CODIGO.toLowerCase().includes(searchText))
            );
        }

        if (typeFilter) {
            filtered = filtered.filter(p => p.TIPO === typeFilter);
        }

        // Update count
        document.getElementById('product-count').textContent = `${filtered.length} itens`;

        // Render Table with Row Number
        const prodCols = [
            { field: 'rowNum', render: (row, index) => index + 1 }, // Dynamic Row Number
            { field: 'CODIGO' },
            { field: 'NOME' },
            { field: 'UNIDADE' },
            { field: 'TIPO' },
            { field: 'ESTOQUE_MINIMO' },
            { field: 'actions', render: (row) => `
                <div class="flex items-center justify-center">
                    <button class="flex items-center justify-center size-8 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-primary dark:text-blue-300 transition-colors" onclick="app.editProduct('${row.ID}')">
                        <span class="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                </div>
            ` }
        ];
        ui.renderTable('products-table', filtered, prodCols);
    },

    filterDashboard: () => {
        const searchText = document.getElementById('dashboard-search').value.toLowerCase();
        const typeFilter = document.getElementById('dashboard-type-filter').value;
        
        let filtered = app.state.balance;

        if (searchText) {
            filtered = filtered.filter(item => 
                (item.name && item.name.toLowerCase().includes(searchText)) || 
                (item.code && item.code.toLowerCase().includes(searchText))
            );
        }

        if (typeFilter) {
            filtered = filtered.filter(item => item.type === typeFilter);
        }

        const dashboardCols = [
            { field: 'code' },
            { field: 'name' },
            { field: 'unit' },
            { field: 'type' },
            { field: 'qty', render: r => r.qty.toFixed(2) },
            { field: 'status', render: (row) => {
                if (row.status === 'OK') {
                    return `<span class="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5 text-xs font-bold text-green-700 dark:text-green-400">OK</span>`;
                } else {
                    return `<span class="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/30 px-2.5 py-0.5 text-xs font-bold text-red-700 dark:text-red-400">BAIXO</span>`;
                }
            }}
        ];

        ui.renderTable('dashboard-table', filtered, dashboardCols);
    },

    filterTable: (tableId, query) => {
        const table = document.getElementById(tableId);
        const trs = table.querySelectorAll('tbody tr');
        query = query.toLowerCase();
        
        trs.forEach(tr => {
            const text = tr.textContent.toLowerCase();
            tr.style.display = text.includes(query) ? '' : 'none';
        });
    },

    getNextId: (list) => {
        if (!list || list.length === 0) return 1;
        const ids = list.map(i => parseInt(i.ID)).filter(n => !isNaN(n));
        if (ids.length === 0) return 1;
        return Math.max(...ids) + 1;
    },

    saveProduct: async (e) => {
        e.preventDefault();
        const id = document.getElementById('prod-id').value;
        const code = document.getElementById('prod-code').value;
        const name = document.getElementById('prod-name').value;
        
        let unit = document.getElementById('prod-unit').value;
        if (unit === 'OTHER') {
            unit = document.getElementById('prod-unit-custom').value;
            if (!unit) {
                ui.showToast("Por favor, digite a nova unidade.", "warning");
                return;
            }
        }

        let type = document.getElementById('prod-type').value;
        if (type === 'OTHER') {
            type = document.getElementById('prod-type-custom').value;
            if (!type) {
                ui.showToast("Por favor, digite o novo tipo.", "warning");
                return;
            }
        }

        const min = document.getElementById('prod-min').value;
        
        ui.toggleLoading(true);
        try {
            if (id) {
                // Edit existing
                // Find row index (Assuming ID is in first column, but row index depends on array position + 2 for header)
                // We need to find the actual row index in the sheet.
                // Best way: find index in app.state.products and add 2 (1 for header, 1 for 0-based to 1-based)
                const index = app.state.products.findIndex(p => String(p.ID) === String(id));
                if (index === -1) throw new Error("Produto não encontrado");
                
                // Row number in Excel/Sheets (Header is row 1, Data starts row 2)
                const rowNum = index + 2; 
                
                // Columns: ID, CODIGO, TIPO, NOME, UNIDADE, ESTOQUE_MINIMO, ATIVO, CRIADO_EM
                // We update everything except ID and CRIADO_EM
                const original = app.state.products[index];
                const rowData = [id, code, type, name, unit, min, original.ATIVO || "Sim", original.CRIADO_EM];
                
                await graph.updateRow('PRODUTOS', rowNum, rowData);
                ui.showToast("Produto atualizado!", "success");
            } else {
                // New
                const newId = app.getNextId(app.state.products);
                const now = new Date().toISOString();
                const row = [newId, code, type, name, unit, min, "Sim", now];
                await graph.addRow('PRODUTOS', [row]);
                ui.showToast("Produto cadastrado!", "success");
            }
            
            ui.closeModal('modal-product');
            document.getElementById('form-product').reset();
            document.getElementById('prod-id').value = ""; // Clear ID
            await app.syncData();
            
        } catch (err) {
            console.error(err);
            ui.showToast("Erro: " + err.message, "error");
        } finally {
            ui.toggleLoading(false);
        }
    },

    editProduct: (id) => {
        const p = app.state.products.find(p => String(p.ID) === String(id));
        if (!p) return;
        
        document.getElementById('prod-id').value = p.ID;
        document.getElementById('prod-code').value = p.CODIGO || "";
        document.getElementById('prod-name').value = p.NOME || "";
        
        // Handle Unit
        const unitSelect = document.getElementById('prod-unit');
        const unitCustom = document.getElementById('prod-unit-custom');
        
        // Check if value exists in options
        let unitExists = false;
        for (let i = 0; i < unitSelect.options.length; i++) {
            if (unitSelect.options[i].value === p.UNIDADE) {
                unitExists = true;
                break;
            }
        }

        if (unitExists) {
            unitSelect.value = p.UNIDADE;
            unitCustom.classList.add('hidden');
        } else {
            // New unit not in list yet (or list not updated), technically shouldn't happen if updateDatalists runs, 
            // but safe fallback:
            unitSelect.value = 'OTHER';
            unitCustom.classList.remove('hidden');
            unitCustom.value = p.UNIDADE;
        }

        // Handle Type
        const typeSelect = document.getElementById('prod-type');
        const typeCustom = document.getElementById('prod-type-custom');
        
        let typeExists = false;
        for (let i = 0; i < typeSelect.options.length; i++) {
            if (typeSelect.options[i].value === p.TIPO) {
                typeExists = true;
                break;
            }
        }

        if (typeExists) {
            typeSelect.value = p.TIPO;
            typeCustom.classList.add('hidden');
        } else {
            typeSelect.value = 'OTHER';
            typeCustom.classList.remove('hidden');
            typeCustom.value = p.TIPO;
        }

        document.getElementById('prod-min').value = p.ESTOQUE_MINIMO || 0;
        
        ui.showModal('modal-product');
    },

    handleEntry: async (e) => {
        e.preventDefault();
        const date = document.getElementById('entry-date').value;
        const pid = document.getElementById('entry-product-id').value;
        const qty = document.getElementById('entry-qty').value;
        const origin = document.getElementById('entry-origin').value;
        const user = document.getElementById('entry-user').value;
        const obs = document.getElementById('entry-obs').value;
        
        const newId = app.getNextId(app.state.entries);
        const now = new Date().toISOString();
        
        // Columns: ID, DATA, PRODUTO_ID, QUANTIDADE, ORIGEM, USUARIO, OBSERVACAO, CRIADO_EM
        const row = [newId, date, pid, qty, origin, user, obs, now];
        
        ui.toggleLoading(true);
        try {
            await graph.addRow('ENTRADAS', [row]);
            document.getElementById('form-entry').reset();
            await app.syncData();
            ui.showToast("Entrada registrada!", "success");
        } catch (err) {
            console.error(err);
        } finally {
            ui.toggleLoading(false);
        }
    },

    handleExit: async (e) => {
        e.preventDefault();
        const date = document.getElementById('exit-date').value;
        const pid = document.getElementById('exit-product-id').value;
        const qty = parseFloat(document.getElementById('exit-qty').value);
        const dest = document.getElementById('exit-dest').value;
        const user = document.getElementById('exit-user').value;
        const obs = document.getElementById('exit-obs').value;
        
        // Validation: Check Balance
        const productBalance = app.state.balance.find(b => String(b.id) === String(pid));
        if (!productBalance || productBalance.qty < qty) {
            ui.showToast("Erro: Saldo insuficiente!", "error");
            return;
        }

        const newId = app.getNextId(app.state.exits);
        const now = new Date().toISOString();
        
        // Columns: ID, DATA, PRODUTO_ID, QUANTIDADE, DESTINO, USUARIO, OBSERVACAO, CRIADO_EM
        const row = [newId, date, pid, qty, dest, user, obs, now];
        
        ui.toggleLoading(true);
        try {
            await graph.addRow('SAIDAS', [row]);
            document.getElementById('form-exit').reset();
            await app.syncData();
            ui.showToast("Saída registrada!", "success");
        } catch (err) {
            console.error(err);
        } finally {
            ui.toggleLoading(false);
        }
    }
};

document.addEventListener('DOMContentLoaded', app.init);
