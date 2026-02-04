const dateUtil = {
    pad2: (n) => {
        if (n === null || n === undefined || isNaN(n)) return '00';
        return String(n).padStart(2, '0');
    },
    parse: (value) => {
        if (!value) return null;
        if (value instanceof Date && !isNaN(value.getTime())) {
            return { y: value.getFullYear(), m: value.getMonth() + 1, d: value.getDate() };
        }

        const raw = String(value).trim();
        if (!raw) return null;

        const isValid = (y, m, d) => {
            if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return false;
            if (y < 1900 || y > 2200) return false;
            if (m < 1 || m > 12) return false;
            const maxDay = new Date(y, m, 0).getDate();
            return d >= 1 && d <= maxDay;
        };

        // ISO: YYYY-MM-DD (start of string)
        const isoDateMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (isoDateMatch) {
            const y = parseInt(isoDateMatch[1], 10);
            const m = parseInt(isoDateMatch[2], 10);
            const d = parseInt(isoDateMatch[3], 10);
            if (isValid(y, m, d)) return { y, m, d };
        }

        // BR: DD/MM/YYYY (start of string, allowing potential time after)
        const brDateMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (brDateMatch) {
            const d = parseInt(brDateMatch[1], 10);
            const m = parseInt(brDateMatch[2], 10);
            const y = parseInt(brDateMatch[3], 10);
            if (isValid(y, m, d)) return { y, m, d };
        }

        // YMD Slash: YYYY/MM/DD
        const ymdSlashMatch = raw.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
        if (ymdSlashMatch) {
            const y = parseInt(ymdSlashMatch[1], 10);
            const m = parseInt(ymdSlashMatch[2], 10);
            const d = parseInt(ymdSlashMatch[3], 10);
            if (isValid(y, m, d)) return { y, m, d };
        }

        return null;
    },
    toISO: (value) => {
        const p = dateUtil.parse(value);
        if (!p) return '';
        return `${p.y}-${dateUtil.pad2(p.m)}-${dateUtil.pad2(p.d)}`;
    },
    toBR: (value) => {
        const p = dateUtil.parse(value);
        if (!p) return value || ''; // Fallback to original value if parse fails
        return `${dateUtil.pad2(p.d)}/${dateUtil.pad2(p.m)}/${p.y}`;
    },
    toBRShort: (value) => {
        const p = dateUtil.parse(value);
        if (!p) return value || ''; // Fallback
        return `${dateUtil.pad2(p.d)}/${dateUtil.pad2(p.m)}`;
    },
    getYear: (value) => {
        const p = dateUtil.parse(value);
        return p ? p.y : null;
    },
    getMonthIndex: (value) => {
        const p = dateUtil.parse(value);
        return p ? p.m - 1 : null;
    },
    valueKey: (value) => {
        const p = dateUtil.parse(value);
        if (!p) return null;
        return p.y * 10000 + p.m * 100 + p.d;
    }
};

const app = {
    state: {
        products: [],
        entries: [],
        exits: [],
        balance: [],
        logs: [],
        charts: {}, // Store Chart.js instances
        sort: {
            column: null,
            direction: 'asc' // or 'desc'
        },
        activeSearchForm: null // 'entry' or 'exit'
    },
    
    config: {
        pollingInterval: 30000, // 30 seconds
        syncTimer: null
    },

    init: () => {
        auth.init();
        app.startPolling();

        // Set Default Dates
        const today = new Date().toISOString().split('T')[0];
        const entryDate = document.getElementById('entry-date');
        const exitDate = document.getElementById('exit-date');
        if (entryDate) entryDate.value = today;
        if (exitDate) exitDate.value = today;
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
        if (viewId === 'reports') activeItem = navItems[4];
        if (viewId === 'audit') activeItem = navItems[5];

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
            'exits': 'Saídas',
            'reports': 'Indicadores e Gráficos',
            'audit': 'Auditoria e Logs'
        };
        document.getElementById('page-title').textContent = titles[viewId];
        
        // Render charts if opening reports view
        if (viewId === 'reports') {
            app.renderCharts();
        }

        // Render logs if opening audit view
        if (viewId === 'audit') {
            app.renderAuditLogs();
        }
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
            
            // Try to read logs separately
            try {
                const logs = await graph.readTable('LOGS');
                app.state.logs = logs || [];
            } catch(e) {
                console.warn("Aba LOGS não encontrada, será criada na próxima ação.");
                app.state.logs = [];
            }

            app.state.products = products;
            app.state.entries = entries;
            app.state.exits = exits;

            app.calculateBalance();
            app.updateDatalists(); // Ensure lists are populated
            app.updateUI();
            
            // Update charts if view is active
            if (!document.getElementById('view-reports').classList.contains('hidden')) {
                app.renderCharts();
            }

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
        const users = new Set(['ADMIN']);
        
        // Add existing from products
        if (app.state.products && app.state.products.length > 0) {
            app.state.products.forEach(p => {
                if (p.UNIDADE) units.add(p.UNIDADE);
                if (p.TIPO) types.add(p.TIPO);
            });
        }

        // Add existing from entries and exits
        if (app.state.entries) app.state.entries.forEach(e => { if(e.USUARIO) users.add(e.USUARIO); });
        if (app.state.exits) app.state.exits.forEach(e => { if(e.USUARIO) users.add(e.USUARIO); });

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
        populate('entry-user', users);
        populate('exit-user', users);

        // Populate Report Product Select
        const reportSel = document.getElementById('report-product-select');
        if (reportSel) {
            const currentVal = reportSel.value;
            const showInactive = document.getElementById('report-show-inactive') ? document.getElementById('report-show-inactive').checked : false;
            
            reportSel.innerHTML = '<option value="">Selecione um produto...</option>';
            app.state.products.forEach(p => {
                // If filter is active (default), hide inactive products
                // BUT if a product is already selected, keep it in the list even if inactive so chart doesn't break
                if (!showInactive && p.ATIVO && String(p.ATIVO).toUpperCase() === 'NÃO' && String(p.ID) !== String(currentVal)) return;
                
                const opt = document.createElement('option');
                opt.value = p.ID;
                opt.textContent = `${p.CODIGO || p.ID} - ${p.NOME}`;
                reportSel.appendChild(opt);
            });
            if (currentVal) reportSel.value = currentVal;
        }

        // Populate Report Year Selects
        const populateYearSelect = (selectId, dataList) => {
            const yearSel = document.getElementById(selectId);
            if (!yearSel) return;
            
            const currentVal = yearSel.value;
            yearSel.innerHTML = '';
            
            const years = new Set();
            const currentYear = new Date().getFullYear();
            
            // Always add current year to ensure chart works even without data
            // But user asked to show ONLY years with data. 
            // However, we need a default selected year. If no data, select current.
            // If data exists, we should still probably include current year for UX? 
            // User requirement: "mostrar somente os anos que tem dados na planilha"
            // Let's stick to strict requirement, but fallback to current if empty.
            
            if (dataList) {
                dataList.forEach(e => {
                    if (e.DATA) {
                        const y = dateUtil.getYear(e.DATA);
                        if (y) years.add(y);
                    }
                });
            }

            if (years.size === 0) {
                years.add(currentYear);
            }

            const sortedYears = Array.from(years).sort((a,b) => b - a); // Descending
            
            sortedYears.forEach(y => {
                const opt = document.createElement('option');
                opt.value = y;
                opt.textContent = y;
                yearSel.appendChild(opt);
            });

            // If previously selected value is still in the list, keep it. 
            // Otherwise select the first one (most recent year).
            if (currentVal && years.has(parseInt(currentVal))) {
                yearSel.value = currentVal;
            } else {
                yearSel.value = sortedYears[0];
            }
        };

        populateYearSelect('report-exit-year-select', app.state.exits);
        populateYearSelect('report-entry-year-select', app.state.entries);
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
            { field: 'qty', render: r => Math.floor(r.qty) }, // Show as Integer
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
        entryCols.push({ field: 'actions', render: (row) => `
            <div class="flex items-center justify-center">
                <button class="flex items-center justify-center size-8 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-primary dark:text-blue-300 transition-colors" onclick="app.editEntry('${row.ID}')">
                    <span class="material-symbols-outlined text-[18px]">edit</span>
                </button>
            </div>
        `});
        
        // Saidas: DESTINO
        const exitCols = [...histCols];
        exitCols[3] = { field: 'DESTINO', render: r => r.DESTINO || '-' };
        exitCols.push({ field: 'actions', render: (row) => `
            <div class="flex items-center justify-center">
                <button class="flex items-center justify-center size-8 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-orange-600 dark:text-orange-400 transition-colors" onclick="app.editExit('${row.ID}')">
                    <span class="material-symbols-outlined text-[18px]">edit</span>
                </button>
            </div>
        `});

        const sortedEntries = [...app.state.entries].sort((a,b) => new Date(b.CRIADO_EM) - new Date(a.CRIADO_EM)).slice(0, 5);
        const sortedExits = [...app.state.exits].sort((a,b) => new Date(b.CRIADO_EM) - new Date(a.CRIADO_EM)).slice(0, 5);
        
        ui.renderTable('entries-table', sortedEntries, entryCols);
        ui.renderTable('exits-table', sortedExits, exitCols);
    },

    sortData: (column, datasetName = 'balance') => {
        const currentSort = app.state.sort;
        
        // Toggle direction if clicking same column
        if (currentSort.column === column) {
            currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort.column = column;
            currentSort.direction = 'asc';
        }

        // Helper for value comparison
        const getValue = (item, col) => {
            let val = item[col];
            // Handle nested or special cases if any
            if (col === 'qty' || col === 'min' || col === 'ESTOQUE_MINIMO' || col === 'QUANTIDADE') {
                return parseFloat(val) || 0;
            }
            if (col === 'code' || col === 'CODIGO') {
                // Try to sort numbers numerically even if string
                const num = parseFloat(val);
                return isNaN(num) ? (val || '').toString().toLowerCase() : num;
            }
            return (val || '').toString().toLowerCase();
        };

        const direction = currentSort.direction === 'asc' ? 1 : -1;

        // Sort the data in place
        app.state[datasetName].sort((a, b) => {
            const valA = getValue(a, column);
            const valB = getValue(b, column);

            if (valA < valB) return -1 * direction;
            if (valA > valB) return 1 * direction;
            return 0;
        });

        // Update UI
        if (datasetName === 'balance') {
            app.filterDashboard();
        } else if (datasetName === 'products') {
            app.filterProducts();
        }
        
        // Update Sort Icons (Generic helper)
        app.updateSortIcons(column, currentSort.direction);
    },

    updateSortIcons: (activeColumn, direction) => {
        // Reset all icons
        document.querySelectorAll('.sort-icon').forEach(icon => {
            icon.textContent = 'unfold_more'; // default
            icon.classList.remove('text-primary', 'dark:text-blue-300');
            icon.classList.add('text-gray-300');
        });

        // Set active icon
        const activeIcon = document.querySelector(`.sort-icon[data-col="${activeColumn}"]`);
        if (activeIcon) {
            activeIcon.textContent = direction === 'asc' ? 'expand_less' : 'expand_more';
            activeIcon.classList.remove('text-gray-300');
            activeIcon.classList.add('text-primary', 'dark:text-blue-300');
        }
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
            { field: 'actions', render: (row) => {
                const isActive = !row.ATIVO || String(row.ATIVO).toUpperCase() === 'SIM';
                const icon = isActive ? 'block' : 'check_circle';
                const colorClass = isActive ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20';
                const title = isActive ? 'Inativar Produto' : 'Ativar Produto';
                
                return `
                <div class="flex items-center justify-center gap-2">
                    <button class="flex items-center justify-center size-8 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-primary dark:text-blue-300 transition-colors" onclick="app.editProduct('${row.ID}')" title="Editar">
                        <span class="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button class="flex items-center justify-center size-8 rounded-lg bg-gray-100 dark:bg-gray-700 transition-colors ${colorClass}" onclick="app.toggleProductStatus('${row.ID}')" title="${title}">
                        <span class="material-symbols-outlined text-[18px]">${icon}</span>
                    </button>
                </div>
            `; }}
        ];
        ui.renderTable('products-table', filtered, prodCols);
    },

    // --- EXPORT FUNCTIONS ---
    exportToExcel: (tableId, filename) => {
        const table = document.getElementById(tableId);
        if (!table) return;

        // Use SheetJS
        const wb = XLSX.utils.table_to_book(table, {sheet: "Sheet1"});
        XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
    },

    exportToPDF: (tableId, title) => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.text(title, 14, 15);
        doc.setFontSize(10);
        doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 22);

        doc.autoTable({ 
            html: `#${tableId}`,
            startY: 30,
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185] },
            styles: { fontSize: 8 }
        });

        doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
    },

    toggleProductStatus: async (id) => {
        const p = app.state.products.find(p => String(p.ID) === String(id));
        if (!p) return;

        const currentStatus = p.ATIVO || "Sim";
        const newStatus = String(currentStatus).toUpperCase() === "SIM" ? "Não" : "Sim";
        const confirmMsg = newStatus === "Não" ? "Deseja realmente inativar este produto?" : "Deseja ativar este produto?";

        const result = await Swal.fire({
            title: 'Confirmação',
            text: confirmMsg,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sim',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            ui.toggleLoading(true);
            try {
                const index = app.state.products.findIndex(prod => String(prod.ID) === String(id));
                const rowNum = index + 2;
                
                // Update row. Need all fields.
                // ID, CODIGO, TIPO, NOME, UNIDADE, ESTOQUE_MINIMO, ATIVO, CRIADO_EM
                const rowData = [
                    p.ID, p.CODIGO, p.TIPO, p.NOME, p.UNIDADE, p.ESTOQUE_MINIMO, newStatus, p.CRIADO_EM
                ];

                await graph.updateRow('PRODUTOS', rowNum, rowData);
                await app.syncData();
                ui.showToast(`Produto ${newStatus === "Sim" ? "ativado" : "inativado"} com sucesso!`, "success");
                
                // Log action
                app.logAction(newStatus === "Sim" ? "ATIVAR_PRODUTO" : "INATIVAR_PRODUTO", `Produto: ${p.NOME} (${p.CODIGO})`);

            } catch (err) {
                console.error(err);
                ui.showToast("Erro ao alterar status: " + err.message, "error");
            } finally {
                ui.toggleLoading(false);
            }
        }
    },

    // --- AUDIT LOGS ---
    logAction: async (action, details) => {
        const user = (auth.user && auth.user.name) || 'Desconhecido';
        const now = new Date().toISOString(); 
        
        // ID generation
        const newId = app.getNextId(app.state.logs);
        
        // Columns: ID, DATA_HORA, USUARIO, ACAO, DETALHES
        const row = [newId, now, user, action, details];
        
        try {
            await graph.addRow('LOGS', [row]);
            
            // Update local state
            app.state.logs.push({
                ID: newId,
                DATA_HORA: now,
                USUARIO: user,
                ACAO: action,
                DETALHES: details
            });
        } catch (e) {
            console.error("Erro ao gravar log (tentando criar aba LOGS...):", e);
            // If error is likely due to missing sheet, try to create it
            // Code 400 usually means "Unable to parse range" if sheet is missing
            try {
                 await graph.createSheet('LOGS');
                 // Add Header
                 await graph.addRow('LOGS', [['ID', 'DATA_HORA', 'USUARIO', 'ACAO', 'DETALHES']]);
                 // Retry log
                 await graph.addRow('LOGS', [row]);
                 app.state.logs.push({ ID: newId, DATA_HORA: now, USUARIO: user, ACAO: action, DETALHES: details });
            } catch (err2) {
                console.error("Falha final ao criar/gravar log:", err2);
            }
        }
    },

    renderAuditLogs: () => {
        // Force remove hidden class just in case navigation didn't do it
        const view = document.getElementById('view-audit');
        if (view) {
            view.classList.remove('hidden');
            view.style.display = 'block'; 
            view.style.height = 'auto';
            view.style.minHeight = '500px';
        }

        // Fail-safe: Check if table exists, if not re-create it inside view
        let table = document.getElementById('audit-table');
        if (!table) {
            console.warn("Table missing, rebuilding...");
            view.innerHTML = `
                <h3 class="text-xl font-bold mb-4 text-black dark:text-white">Histórico de Auditoria</h3>
                <div class="w-full bg-white dark:bg-gray-800 rounded shadow" style="min-height: 300px; border: 1px solid #ddd;">
                    <table id="audit-table" style="width: 100%; border-collapse: collapse;">
                        <thead style="background: #f3f4f6;">
                            <tr>
                                <th style="padding: 10px; text-align: left;">Data/Hora</th>
                                <th style="padding: 10px; text-align: left;">Usuário</th>
                                <th style="padding: 10px; text-align: left;">Ação</th>
                                <th style="padding: 10px; text-align: left;">Detalhes</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>
            `;
            table = document.getElementById('audit-table');
        }

        const tbody = table.querySelector('tbody');
        
        // Debug Raw Data
        console.log("RAW LOGS DATA:", app.state.logs);

        if (!app.state.logs || app.state.logs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="padding: 20px; text-align: center; color: black;">Nenhum registro encontrado (Tente sincronizar novamente).</td></tr>`;
            return;
        }
        
        // Robust sort and render
        const sortedLogs = [...app.state.logs].sort((a,b) => {
            const dateAVal = a.DATA_HORA || a[1] || '';
            const dateBVal = b.DATA_HORA || b[1] || '';
            const dateA = dateAVal ? new Date(dateAVal) : new Date(0);
            const dateB = dateBVal ? new Date(dateBVal) : new Date(0);
            return dateB - dateA;
        });
        
        const displayLogs = sortedLogs.slice(0, 100);

        const html = displayLogs.map(log => {
            const dateStr = log.DATA_HORA || log[1] || '-';
            const user = log.USUARIO || log[2] || '-';
            const action = log.ACAO || log[3] || '-';
            const details = log.DETALHES || log[4] || '-';

            let dateFormatted = dateStr;
            try {
                if (dateStr && dateStr !== '-') dateFormatted = new Date(dateStr).toLocaleString('pt-BR');
            } catch(e) { console.error("Date parse error", e); }

            return `
                <tr style="background-color: white; border-bottom: 1px solid #eee;">
                    <td style="padding: 12px; color: #000; font-weight: bold;">${dateFormatted}</td>
                    <td style="padding: 12px; color: #000;">${user}</td>
                    <td style="padding: 12px; color: #000;">
                        <span style="background-color: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                            ${action}
                        </span>
                    </td>
                    <td style="padding: 12px; color: #000; max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${details}">
                        ${details}
                    </td>
                </tr>
            `;
        }).join('');
        
        console.log("Final HTML Length:", html.length);
        tbody.innerHTML = html;
        tbody.style.display = 'table-row-group';
    },

    // --- PRODUCT SEARCH MODAL LOGIC ---
    openProductSearch: (formType) => {
        app.state.activeSearchForm = formType; // 'entry' or 'exit'
        document.getElementById('modal-search-input').value = '';
        app.filterSearchProducts();
        ui.showModal('modal-search-product');
        // Auto focus
        setTimeout(() => document.getElementById('modal-search-input').focus(), 100);
    },

    filterSearchProducts: () => {
        const query = document.getElementById('modal-search-input').value.toLowerCase();
        const resultsBody = document.getElementById('modal-search-results');
        resultsBody.innerHTML = '';

        const filtered = app.state.products.filter(p => {
             // Only active products
             if (p.ATIVO && String(p.ATIVO).toUpperCase() === 'NÃO') return false;
             return (p.NOME && p.NOME.toLowerCase().includes(query)) || 
                    (p.CODIGO && p.CODIGO.toLowerCase().includes(query));
        });

        if (filtered.length === 0) {
            resultsBody.innerHTML = `<tr><td colspan="4" class="px-4 py-3 text-center text-gray-500">Nenhum produto encontrado</td></tr>`;
            return;
        }

        filtered.forEach(p => {
            // Find current balance for context
            const balanceItem = app.state.balance.find(b => String(b.id) === String(p.ID));
            // Show balance as integer (floor)
            const currentQty = balanceItem ? Math.floor(balanceItem.qty) : '0';

            const tr = document.createElement('tr');
            tr.className = "hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors";
            tr.innerHTML = `
                <td class="px-4 py-3 font-medium text-gray-900 dark:text-white">${p.CODIGO || '-'}</td>
                <td class="px-4 py-3">${p.NOME}</td>
                <td class="px-4 py-3">${currentQty} ${p.UNIDADE}</td>
                <td class="px-4 py-3 text-center">
                    <button onclick="app.selectSearchedProduct('${p.ID}')" class="text-xs bg-primary hover:bg-blue-700 text-white font-bold py-1 px-3 rounded transition-colors">
                        Selecionar
                    </button>
                </td>
            `;
            resultsBody.appendChild(tr);
        });
    },

    selectSearchedProduct: (id) => {
        const targetMap = {
            'entry': 'entry-product-id',
            'exit': 'exit-product-id',
            'edit-entry': 'edit-entry-product-id',
            'edit-exit': 'edit-exit-product-id',
            'report': 'report-product-select'
        };
        const targetId = targetMap[app.state.activeSearchForm];
        
        const select = document.getElementById(targetId);
        if (select) {
            select.value = id;
            
            // Special trigger for reports
            if (app.state.activeSearchForm === 'report') {
                app.renderProductFrequencyChart();
            }
        }
        ui.closeModal('modal-search-product');
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

        // Update Stats Cards
        document.getElementById('total-items').textContent = filtered.length;
        const lowStock = filtered.filter(i => i.status === 'ESTOQUE BAIXO').length;
        document.getElementById('low-stock-count').textContent = lowStock;

        const dashboardCols = [
            { field: 'code' },
            { field: 'name' },
            { field: 'unit' },
            { field: 'type' },
            { field: 'qty', render: r => Math.floor(r.qty) }, // Show as Integer
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

    showLowStock: () => {
        // Reset filters
        document.getElementById('dashboard-search').value = '';
        document.getElementById('dashboard-type-filter').value = '';
        
        // Filter strictly by Low Stock
        const filtered = app.state.balance.filter(i => i.status === 'ESTOQUE BAIXO');
        
        // Update Stats Cards
        document.getElementById('total-items').textContent = filtered.length;
        document.getElementById('low-stock-count').textContent = filtered.length;

        const dashboardCols = [
            { field: 'code' },
            { field: 'name' },
            { field: 'unit' },
            { field: 'type' },
            { field: 'qty', render: r => Math.floor(r.qty) }, // Show as Integer
            { field: 'status', render: (row) => {
                return `<span class="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/30 px-2.5 py-0.5 text-xs font-bold text-red-700 dark:text-red-400">BAIXO</span>`;
            }}
        ];

        ui.renderTable('dashboard-table', filtered, dashboardCols);
        ui.showToast("Exibindo apenas itens com Estoque Baixo", "warning");
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
                app.logAction('EDITAR_PRODUTO', `Editou: ${name} (${code})`);
            } else {
                // New
                const newId = app.getNextId(app.state.products);
                const now = new Date().toISOString();
                const row = [newId, code, type, name, unit, min, "Sim", now];
                await graph.addRow('PRODUTOS', [row]);
                ui.showToast("Produto cadastrado!", "success");
                app.logAction('CRIAR_PRODUTO', `Criou: ${name} (${code})`);
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

    renderCharts: () => {
        // Register DataLabels plugin globally or per chart
        Chart.register(ChartDataLabels);

        // Define common options for datalabels
        const commonDataLabels = {
            color: '#fff',
            font: {
                weight: 'bold'
            },
            formatter: (value) => value > 0 ? value : '' // Hide zeros
        };

        // --- 1. Products by Type (Pie) ---
        const showInactive = document.getElementById('report-show-inactive').checked;
        const typeCounts = {};
        app.state.products.forEach(p => {
            if (!showInactive && p.ATIVO && String(p.ATIVO).toUpperCase() === 'NÃO') return;
            const type = p.TIPO || 'Outros';
            typeCounts[type] = (typeCounts[type] || 0) + 1;
        });

        const ctxType = document.getElementById('chart-products-by-type');
        if (ctxType) {
            if (app.state.charts.type) app.state.charts.type.destroy();
            app.state.charts.type = new Chart(ctxType, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(typeCounts),
                    datasets: [{
                        data: Object.values(typeCounts),
                        backgroundColor: ['#00398f', '#FFD100', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#8B5CF6'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right' },
                        datalabels: {
                            color: '#fff',
                            formatter: (value, ctx) => {
                                let sum = 0;
                                let dataArr = ctx.chart.data.datasets[0].data;
                                dataArr.map(data => { sum += data; });
                                let percentage = (value*100 / sum).toFixed(1)+"%";
                                return percentage;
                            }
                        }
                    }
                }
            });
        }

        // --- 2. Top 5 Exits (Bar) ---
        const exitCounts = {};
        app.state.exits.forEach(e => {
            const pid = e.PRODUTO_ID;
            const qty = parseFloat(e.QUANTIDADE) || 0;
            exitCounts[pid] = (exitCounts[pid] || 0) + qty;
        });

        const sortedExits = Object.entries(exitCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        const topLabels = sortedExits.map(([pid]) => {
            const p = app.state.products.find(p => String(p.ID) === String(pid));
            return p ? p.NOME : `ID ${pid}`;
        });
        const topData = sortedExits.map(([, qty]) => qty);

        const ctxTop = document.getElementById('chart-top-exits');
        if (ctxTop) {
            if (app.state.charts.top) app.state.charts.top.destroy();
            app.state.charts.top = new Chart(ctxTop, {
                type: 'bar',
                data: {
                    labels: topLabels,
                    datasets: [{
                        label: 'Quantidade Saída',
                        data: topData,
                        backgroundColor: '#00398f',
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true }
                    },
                    plugins: {
                        datalabels: {
                            anchor: 'end',
                            align: 'top',
                            color: '#555', // Darker for white bg
                            font: { weight: 'bold' }
                        }
                    }
                }
            });
        }

        // --- 3. Movements History (Line) ---
        // Last 6 months
        const months = [];
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            months.push(d.toLocaleString('pt-BR', { month: 'short', year: '2-digit' }));
        }

        const entriesData = new Array(6).fill(0);
        const exitsData = new Array(6).fill(0);

        const processHistory = (list, targetArray) => {
            list.forEach(item => {
                if (!item.DATA) return;
                const year = dateUtil.getYear(item.DATA);
                const month = dateUtil.getMonthIndex(item.DATA);
                if (year === null || month === null) return;
                
                // Calculate difference in months from today
                // Logic: (YearDiff * 12) + (MonthDiff)
                const diffMonths = (today.getFullYear() - year) * 12 + (today.getMonth() - month);
                
                if (diffMonths >= 0 && diffMonths < 6) {
                    // Index 5 is current month (diff=0), 0 is 5 months ago (diff=5)
                    const index = 5 - diffMonths;
                    targetArray[index] += parseFloat(item.QUANTIDADE) || 0;
                }
            });
        };

        processHistory(app.state.entries, entriesData);
        processHistory(app.state.exits, exitsData);

        const ctxMov = document.getElementById('chart-movements');
        if (ctxMov) {
            if (app.state.charts.mov) app.state.charts.mov.destroy();
            app.state.charts.mov = new Chart(ctxMov, {
                type: 'line',
                data: {
                    labels: months,
                    datasets: [
                        {
                            label: 'Entradas',
                            data: entriesData,
                            borderColor: '#10B981', // Green
                            backgroundColor: '#10B981',
                            tension: 0.3
                        },
                        {
                            label: 'Saídas',
                            data: exitsData,
                            borderColor: '#EF4444', // Red
                            backgroundColor: '#EF4444',
                            tension: 0.3
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true }
                    },
                    plugins: {
                        datalabels: {
                            display: 'auto',
                            color: '#555',
                            align: 'top',
                            anchor: 'end'
                        }
                    }
                }
            });
        }
        
        // --- 4. Product Frequency (Initial Call or Update) ---
        app.renderProductFrequencyChart();

        // --- 5. Monthly Exits (Initial Call or Update) ---
        app.renderMonthlyExitsChart();

        // --- 6. Monthly Entries (Initial Call or Update) ---
        app.renderMonthlyEntriesChart();
    },

    renderProductFrequencyChart: () => {
        const pid = document.getElementById('report-product-select').value;
        const ctxFreq = document.getElementById('chart-product-frequency');
        
        if (!ctxFreq) return;
        
        // Destroy existing chart if any
        if (app.state.charts.freq) {
            app.state.charts.freq.destroy();
            app.state.charts.freq = null;
        }

        if (!pid) {
            // Placeholder empty chart or message
            // We'll create an empty chart to keep layout consistent
            app.state.charts.freq = new Chart(ctxFreq, {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [{ label: 'Selecione um produto', data: [] }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        title: { display: true, text: 'Selecione um produto acima para ver os dados' }
                    },
                    scales: { y: { beginAtZero: true } }
                }
            });
            return;
        }

        // Filter exits for this product
        const productExits = app.state.exits.filter(e => String(e.PRODUTO_ID) === String(pid));
        
        // Group by Date
        const dateMap = {};
        productExits.forEach(e => {
            if (!e.DATA) return;
            const date = dateUtil.toISO(e.DATA);
            if (!date) return;
            const qty = parseFloat(e.QUANTIDADE) || 0;
            
            if (!dateMap[date]) {
                dateMap[date] = 0;
            }
            dateMap[date] += qty;
        });

        // Sort Dates
        const sortedDates = Object.keys(dateMap).sort((a, b) => (dateUtil.valueKey(a) || 0) - (dateUtil.valueKey(b) || 0));
        
        // If too many dates, maybe take last 30?
        // Let's take all for now, but if > 50, slice last 50
        let displayDates = sortedDates;
        if (sortedDates.length > 50) {
            displayDates = sortedDates.slice(-50);
        }

        const dataValues = displayDates.map(d => dateMap[d]);
        // Calculate Average
        const total = dataValues.reduce((sum, val) => sum + val, 0);
        const average = dataValues.length > 0 ? total / dataValues.length : 0;
        const averageData = new Array(dataValues.length).fill(average);

        // Update Title with Average
        const titleEl = document.getElementById('chart-frequency-title');
        if (titleEl) {
            titleEl.innerHTML = `Análise de Saída por Produto (Diário) <span class="text-sm font-normal text-gray-500 ml-2">Média: ${Math.round(average)}</span>`;
        }

        // Format dates for display (DD/MM) with Day of Week
        const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const labels = displayDates.map(d => {
            const dateObj = dateUtil.parse(d);
            if (!dateObj) return dateUtil.toBRShort(d);
            
            // Create Date object. Note: Month is 0-indexed in JS Date constructor
            const jsDate = new Date(dateObj.y, dateObj.m - 1, dateObj.d);
            const weekDay = daysOfWeek[jsDate.getDay()];
            
            // Return array for multiline label
            return [dateUtil.toBRShort(d), weekDay];
        });

        const productName = app.state.products.find(p => String(p.ID) === String(pid))?.NOME || 'Produto';

        app.state.charts.freq = new Chart(ctxFreq, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: `Quantidade Saída - ${productName}`,
                        data: dataValues,
                        backgroundColor: 'rgba(255, 209, 0, 0.2)',
                        borderColor: '#FFD100',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.3,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        order: 2,
                        datalabels: {
                            display: true // Show labels for main line
                        }
                    },
                    {
                        label: `Média (${Math.round(average)})`,
                        data: averageData,
                        borderColor: '#9ca3af', // Gray 400
                        borderWidth: 2,
                        borderDash: [5, 5],
                        fill: false,
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        order: 1,
                        datalabels: {
                            display: false // Hide labels for average line
                        }
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }, // Title already says product name usually, or we keep legend
                    tooltip: {
                        callbacks: {
                            title: (context) => {
                                // Find full date from original sorted array using index
                                const index = context[0].dataIndex;
                                const originalDate = displayDates[index];
                                return dateUtil.toBR(originalDate);
                            }
                        }
                    },
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        color: '#555',
                        font: { weight: 'bold' }
                    }
                },
                scales: {
                    y: { 
                        beginAtZero: true,
                        title: { display: true, text: 'Quantidade' }
                    },
                    x: {
                        title: { display: true, text: 'Dia' }
                    }
                }
            }
        });
    },

    renderMonthlyExitsChart: () => {
        const year = parseInt(document.getElementById('report-exit-year-select').value);
        const ctxMonthly = document.getElementById('chart-monthly-exits');
        
        if (!ctxMonthly || !year) return;

        // Destroy existing
        if (app.state.charts.monthlyExit) {
            app.state.charts.monthlyExit.destroy();
            app.state.charts.monthlyExit = null;
        }

        // Init Data Map: { MonthIndex: { Type: Qty } }
        const monthlyData = {}; 
        const types = new Set();
        const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

        app.state.exits.forEach(e => {
            if (!e.DATA) return;
            const y = dateUtil.getYear(e.DATA);
            const m = dateUtil.getMonthIndex(e.DATA);
            if (y === null || m === null) return;
            
            if (y === year && m >= 0 && m < 12) {
                // Find Product Type
                const prod = app.state.products.find(p => String(p.ID) === String(e.PRODUTO_ID));
                const type = prod ? (prod.TIPO || 'Outros') : 'Desconhecido';
                
                types.add(type);
                if (!monthlyData[m]) monthlyData[m] = {};
                if (!monthlyData[m][type]) monthlyData[m][type] = 0;
                
                monthlyData[m][type] += parseFloat(e.QUANTIDADE) || 0;
            }
        });

        // Prepare Datasets
        const datasets = Array.from(types).map((type, index) => {
            // Color Palette
            const colors = ['#00398f', '#FFD100', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#8B5CF6'];
            const color = colors[index % colors.length];

            const data = monthLabels.map((_, mIndex) => {
                return monthlyData[mIndex] ? (monthlyData[mIndex][type] || 0) : 0;
            });

            return {
                label: type,
                data: data,
                backgroundColor: color,
                borderRadius: 4,
                stack: 'Stack 0'
            };
        });

        // If no data, show empty chart structure
        if (datasets.length === 0) {
            datasets.push({
                label: 'Sem dados',
                data: new Array(12).fill(0),
                backgroundColor: '#e5e7eb'
            });
        }

        app.state.charts.monthlyExit = new Chart(ctxMonthly, {
            type: 'bar',
            data: {
                labels: monthLabels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { stacked: true },
                    y: { beginAtZero: true, stacked: true }
                },
                plugins: {
                    datalabels: {
                        color: '#fff',
                        font: { weight: 'bold' },
                        formatter: (val) => val > 0 ? Math.round(val) : '' // Hide zeros, show integer for clean look
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                }
            }
        });
    },

    renderMonthlyEntriesChart: () => {
        const year = parseInt(document.getElementById('report-entry-year-select').value);
        const ctxMonthly = document.getElementById('chart-monthly-entries');
        
        if (!ctxMonthly || !year) return;

        // Destroy existing
        if (app.state.charts.monthlyEntry) {
            app.state.charts.monthlyEntry.destroy();
            app.state.charts.monthlyEntry = null;
        }

        // Init Data Map
        const monthlyData = {}; 
        const types = new Set();
        const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

        app.state.entries.forEach(e => {
            if (!e.DATA) return;
            const y = dateUtil.getYear(e.DATA);
            const m = dateUtil.getMonthIndex(e.DATA);
            if (y === null || m === null) return;
            
            if (y === year && m >= 0 && m < 12) {
                // Find Product Type
                const prod = app.state.products.find(p => String(p.ID) === String(e.PRODUTO_ID));
                const type = prod ? (prod.TIPO || 'Outros') : 'Desconhecido';
                
                types.add(type);
                if (!monthlyData[m]) monthlyData[m] = {};
                if (!monthlyData[m][type]) monthlyData[m][type] = 0;
                
                monthlyData[m][type] += parseFloat(e.QUANTIDADE) || 0;
            }
        });

        // Prepare Datasets
        const datasets = Array.from(types).map((type, index) => {
            // Color Palette (Same as exits for consistency)
            const colors = ['#00398f', '#FFD100', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#8B5CF6'];
            const color = colors[index % colors.length];

            const data = monthLabels.map((_, mIndex) => {
                return monthlyData[mIndex] ? (monthlyData[mIndex][type] || 0) : 0;
            });

            return {
                label: type,
                data: data,
                backgroundColor: color,
                borderRadius: 4,
                stack: 'Stack 0'
            };
        });

        if (datasets.length === 0) {
            datasets.push({
                label: 'Sem dados',
                data: new Array(12).fill(0),
                backgroundColor: '#e5e7eb'
            });
        }

        app.state.charts.monthlyEntry = new Chart(ctxMonthly, {
            type: 'bar',
            data: {
                labels: monthLabels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { stacked: true },
                    y: { beginAtZero: true, stacked: true }
                },
                plugins: {
                    datalabels: {
                        color: '#fff',
                        font: { weight: 'bold' },
                        formatter: (val) => val > 0 ? Math.round(val) : '' 
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                }
            }
        });
    },

    handleEntry: async (e) => {
        e.preventDefault();
        const date = document.getElementById('entry-date').value;
        const pid = document.getElementById('entry-product-id').value;
        const qty = document.getElementById('entry-qty').value;
        const origin = document.getElementById('entry-origin').value;
        
        let user = document.getElementById('entry-user').value;
        if (user === 'OTHER') {
            user = document.getElementById('entry-user-custom').value;
            if (!user) {
                ui.showToast("Por favor, digite o nome do responsável.", "warning");
                return;
            }
        }
        
        const obs = document.getElementById('entry-obs').value;
        
        const newId = app.getNextId(app.state.entries);
        const now = new Date().toISOString();
        
        // Columns: ID, DATA, PRODUTO_ID, QUANTIDADE, ORIGEM, USUARIO, OBSERVACAO, CRIADO_EM
        const row = [newId, dateUtil.toBR(date), pid, qty, origin, user, obs, now];
        
        ui.toggleLoading(true);
        try {
            await graph.addRow('ENTRADAS', [row]);
            document.getElementById('form-entry').reset();
            await app.syncData();
            ui.showToast("Entrada registrada!", "success");
            
            const p = app.state.products.find(p => String(p.ID) === String(pid));
            app.logAction('NOVA_ENTRADA', `Produto: ${p ? p.NOME : pid}, Qtd: ${qty}`);
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
        
        let user = document.getElementById('exit-user').value;
        if (user === 'OTHER') {
            user = document.getElementById('exit-user-custom').value;
            if (!user) {
                ui.showToast("Por favor, digite o nome do responsável.", "warning");
                return;
            }
        }
        
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
        const row = [newId, dateUtil.toBR(date), pid, qty, dest, user, obs, now];
        
        ui.toggleLoading(true);
        try {
            await graph.addRow('SAIDAS', [row]);
            document.getElementById('form-exit').reset();
            await app.syncData();
            ui.showToast("Saída registrada!", "success");

            const p = app.state.products.find(p => String(p.ID) === String(pid));
            app.logAction('NOVA_SAIDA', `Produto: ${p ? p.NOME : pid}, Qtd: ${qty}`);
        } catch (err) {
            console.error(err);
        } finally {
            ui.toggleLoading(false);
        }
    },

    // --- EDIT ENTRY LOGIC ---
    editEntry: (id) => {
        const entry = app.state.entries.find(e => String(e.ID) === String(id));
        if (!entry) return;

        document.getElementById('edit-entry-id').value = entry.ID;
        document.getElementById('edit-entry-date').value = dateUtil.toISO(entry.DATA) || '';
        document.getElementById('edit-entry-qty').value = entry.QUANTIDADE || '';
        document.getElementById('edit-entry-origin').value = entry.ORIGEM || '';
        document.getElementById('edit-entry-user').value = entry.USUARIO || '';
        document.getElementById('edit-entry-obs').value = entry.OBSERVACAO || '';

        // Populate Product Select
        const prodSelect = document.getElementById('edit-entry-product-id');
        prodSelect.innerHTML = '<option value="">Selecione...</option>';
        app.state.products.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.ID;
            opt.textContent = `${p.CODIGO || p.ID} - ${p.NOME}`;
            prodSelect.appendChild(opt);
        });
        prodSelect.value = entry.PRODUTO_ID;

        ui.showModal('modal-edit-entry');
    },

    saveEntryEdit: async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-entry-id').value;
        const date = document.getElementById('edit-entry-date').value;
        const pid = document.getElementById('edit-entry-product-id').value;
        const qty = document.getElementById('edit-entry-qty').value;
        const origin = document.getElementById('edit-entry-origin').value;
        const user = document.getElementById('edit-entry-user').value;
        const obs = document.getElementById('edit-entry-obs').value;

        ui.toggleLoading(true);
        try {
            const index = app.state.entries.findIndex(e => String(e.ID) === String(id));
            if (index === -1) throw new Error("Entrada não encontrada");
            
            const original = app.state.entries[index];
            const rowNum = index + 2; // Header + 1-based index

            // Columns: ID, DATA, PRODUTO_ID, QUANTIDADE, ORIGEM, USUARIO, OBSERVACAO, CRIADO_EM
            const rowData = [id, dateUtil.toBR(date), pid, qty, origin, user, obs, original.CRIADO_EM];
            
            await graph.updateRow('ENTRADAS', rowNum, rowData);
            ui.showToast("Entrada atualizada!", "success");
            ui.closeModal('modal-edit-entry');
            await app.syncData();
            
            const p = app.state.products.find(p => String(p.ID) === String(pid));
            app.logAction('EDITAR_ENTRADA', `ID: ${id}, Produto: ${p ? p.NOME : pid}, Nova Qtd: ${qty}`);
        } catch (err) {
            console.error(err);
            ui.showToast("Erro: " + err.message, "error");
        } finally {
            ui.toggleLoading(false);
        }
    },

    // --- EDIT EXIT LOGIC ---
    editExit: (id) => {
        const exit = app.state.exits.find(e => String(e.ID) === String(id));
        if (!exit) return;

        document.getElementById('edit-exit-id').value = exit.ID;
        document.getElementById('edit-exit-date').value = dateUtil.toISO(exit.DATA) || '';
        document.getElementById('edit-exit-qty').value = exit.QUANTIDADE || '';
        document.getElementById('edit-exit-dest').value = exit.DESTINO || '';
        document.getElementById('edit-exit-user').value = exit.USUARIO || '';
        document.getElementById('edit-exit-obs').value = exit.OBSERVACAO || '';

        // Populate Product Select
        const prodSelect = document.getElementById('edit-exit-product-id');
        prodSelect.innerHTML = '<option value="">Selecione...</option>';
        app.state.products.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.ID;
            opt.textContent = `${p.CODIGO || p.ID} - ${p.NOME}`;
            prodSelect.appendChild(opt);
        });
        prodSelect.value = exit.PRODUTO_ID;

        ui.showModal('modal-edit-exit');
    },

    saveExitEdit: async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-exit-id').value;
        const date = document.getElementById('edit-exit-date').value;
        const pid = document.getElementById('edit-exit-product-id').value;
        const qty = document.getElementById('edit-exit-qty').value;
        const dest = document.getElementById('edit-exit-dest').value;
        const user = document.getElementById('edit-exit-user').value;
        const obs = document.getElementById('edit-exit-obs').value;

        ui.toggleLoading(true);
        try {
            const index = app.state.exits.findIndex(e => String(e.ID) === String(id));
            if (index === -1) throw new Error("Saída não encontrada");
            
            const original = app.state.exits[index];
            const rowNum = index + 2; // Header + 1-based index

            // Columns: ID, DATA, PRODUTO_ID, QUANTIDADE, DESTINO, USUARIO, OBSERVACAO, CRIADO_EM
            const rowData = [id, dateUtil.toBR(date), pid, qty, dest, user, obs, original.CRIADO_EM];
            
            await graph.updateRow('SAIDAS', rowNum, rowData);
            ui.showToast("Saída atualizada!", "success");
            ui.closeModal('modal-edit-exit');
            await app.syncData();

            const p = app.state.products.find(p => String(p.ID) === String(pid));
            app.logAction('EDITAR_SAIDA', `ID: ${id}, Produto: ${p ? p.NOME : pid}, Nova Qtd: ${qty}`);
        } catch (err) {
            console.error(err);
            ui.showToast("Erro: " + err.message, "error");
        } finally {
            ui.toggleLoading(false);
        }
    }
};

document.addEventListener('DOMContentLoaded', app.init);
