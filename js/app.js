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
        document.querySelectorAll('.nav-links li').forEach(el => el.classList.remove('active'));
        
        document.getElementById(`view-${viewId}`).classList.remove('hidden');
        
        const navItems = document.querySelectorAll('.nav-links li');
        if (viewId === 'dashboard') navItems[0].classList.add('active');
        if (viewId === 'products') navItems[1].classList.add('active');
        if (viewId === 'entries') navItems[2].classList.add('active');
        if (viewId === 'exits') navItems[3].classList.add('active');

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
            app.updateUI();
            
            const now = new Date();
            document.getElementById('last-sync').textContent = `Sincronizado: ${now.toLocaleTimeString()}`;
            
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
        // Collect unique values
        const units = new Set(['UN', 'KG', 'MT', 'CX', 'L', 'PCT']);
        const types = new Set(['Material', 'EPI', 'Ferramenta', 'Comida']);
        
        app.state.products.forEach(p => {
            if (p.UNIDADE) units.add(p.UNIDADE);
            if (p.TIPO) types.add(p.TIPO);
        });

        // Populate Datalists
        const unitList = document.getElementById('unit-list');
        const typeList = document.getElementById('type-list');
        
        unitList.innerHTML = '';
        typeList.innerHTML = '';
        
        units.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u;
            unitList.appendChild(opt);
        });
        
        types.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t;
            typeList.appendChild(opt);
        });
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
                const cls = row.status === 'OK' ? 'status-ok' : 'status-low';
                return `<span class="${cls}">${row.status}</span>`;
            }}
        ];
        ui.renderTable('dashboard-table', app.state.balance, dashboardCols);

        // Products
        const prodCols = [
            { field: 'CODIGO' },
            { field: 'NOME' },
            { field: 'UNIDADE' },
            { field: 'TIPO' },
            { field: 'ESTOQUE_MINIMO' },
            { field: 'actions', render: (row) => `<button class="btn btn-sm btn-outline" style="color:blue; border-color:blue" onclick="app.editProduct('${row.ID}')">Editar</button>` }
        ];
        ui.renderTable('products-table', app.state.products, prodCols);

        // Selects
        const populateSelect = (id) => {
            const sel = document.getElementById(id);
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
                // Excel dates sometimes come as serial numbers or strings. Assuming ISO string or formatted string for now from input.
                // If it was saved by this app, it's YYYY-MM-DD.
                return r.DATA;
            }},
            { field: 'PRODUTO_ID', render: r => {
                const p = app.state.products.find(p => String(p.ID) === String(r.PRODUTO_ID));
                return p ? p.NOME : r.PRODUTO_ID;
            }},
            { field: 'QUANTIDADE' },
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
        const unit = document.getElementById('prod-unit').value;
        const type = document.getElementById('prod-type').value;
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
        document.getElementById('prod-unit').value = p.UNIDADE || "UN";
        document.getElementById('prod-type').value = p.TIPO || "Material";
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
