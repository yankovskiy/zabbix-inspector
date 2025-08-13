export class ProcessTable {
    constructor() {
        this.processes = [];
        this.filteredProcesses = [];
        this.sortColumn = '';
        this.sortDirection = 'asc';
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Сортировка по клику на заголовок
        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-sort]')) {
                const column = e.target.closest('[data-sort]').dataset.sort;
                this.sortTable(column);
            }
        });

        // Фильтр по типу процесса
        document.addEventListener('change', (e) => {
            if (e.target.id === 'processTypeFilter') {
                this.filterByType(e.target.value);
            }
            if (e.target.id === 'topFilter') {
                this.filterTop(e.target.value);
            }
        });

        // Сброс фильтров
        document.addEventListener('click', (e) => {
            if (e.target.id === 'resetFiltersBtn') {
                this.resetFilters();
            }
        });
    }

    updateTable(processes) {
        this.processes = processes || [];
        this.filteredProcesses = [...this.processes];
        
        this.populateTypeFilter();
        this.renderTable();
    }

    populateTypeFilter() {
        const typeFilter = document.getElementById('processTypeFilter');
        if (!typeFilter) return;

        // Получаем уникальные типы процессов
        const uniqueTypes = [...new Set(this.processes.map(p => p.processType).filter(Boolean))].sort();
        
        // Очищаем и заполняем селект
        typeFilter.innerHTML = '<option value="">Все типы</option>';
        uniqueTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            typeFilter.appendChild(option);
        });
    }

    sortTable(column) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }

        this.filteredProcesses.sort((a, b) => {
            let aVal = a[column];
            let bVal = b[column];

            // Обработка числовых значений
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return this.sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
            }

            // Обработка строковых значений
            aVal = String(aVal).toLowerCase();
            bVal = String(bVal).toLowerCase();
            
            if (this.sortDirection === 'asc') {
                return aVal.localeCompare(bVal);
            } else {
                return bVal.localeCompare(aVal);
            }
        });

        this.renderTable();
        this.updateSortIcons();
    }

    updateSortIcons() {
        // Сбрасываем все иконки
        document.querySelectorAll('.sort-icon').forEach(icon => {
            icon.textContent = '↕';
        });

        // Устанавливаем иконку для активной колонки
        const activeHeader = document.querySelector(`[data-sort="${this.sortColumn}"] .sort-icon`);
        if (activeHeader) {
            activeHeader.textContent = this.sortDirection === 'asc' ? '↑' : '↓';
        }
    }

    filterByType(type) {
        if (type === '') {
            this.filteredProcesses = [...this.processes];
        } else {
            this.filteredProcesses = this.processes.filter(p => p.processType === type);
        }
        this.renderTable();
    }

    filterTop(filterType) {
        if (filterType === '') {
            this.filteredProcesses = [...this.processes];
        } else {
            // Сортируем по выбранному полю и берем топ-10
            const sortedProcesses = [...this.processes].sort((a, b) => {
                if (filterType === 'cpu') return b.cpu - a.cpu;
                if (filterType === 'rss') return b.rss - a.rss;
                if (filterType === 'vsz') return b.vsz - a.vsz;
                return 0;
            });
            
            this.filteredProcesses = sortedProcesses.slice(0, 10);
        }
        this.renderTable();
    }

    resetFilters() {
        // Сбрасываем селекты
        const typeFilter = document.getElementById('processTypeFilter');
        const topFilter = document.getElementById('topFilter');
        
        if (typeFilter) typeFilter.value = '';
        if (topFilter) topFilter.value = '';

        // Сбрасываем фильтрацию
        this.filteredProcesses = [...this.processes];
        this.renderTable();
    }

    formatMemoryValue(bytes) {
        if (bytes >= 1024 * 1024) {
            return (bytes / (1024 * 1024)).toFixed(1) + ' GB';
        } else if (bytes >= 1024) {
            return (bytes / 1024).toFixed(0) + ' MB';
        } else {
            return bytes + ' KB';
        }
    }

    renderTable() {
        const tbody = document.getElementById('processesTableBody');
        if (!tbody) return;

        if (this.filteredProcesses.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11" class="no-data">Нет данных для отображения</td></tr>';
            return;
        }

        tbody.innerHTML = this.filteredProcesses.map(process => `
            <tr>
                <td>${process.user}</td>
                <td>${process.pid}</td>
                <td class="number">${process.cpu.toFixed(1)}%</td>
                <td class="number">${process.mem.toFixed(1)}%</td>
                <td class="number">${this.formatMemoryValue(process.vsz)}</td>
                <td class="number">${this.formatMemoryValue(process.rss)}</td>
                <td>${process.tty}</td>
                <td>
                    <span class="process-status ${process.stat === 'S' ? 'sleeping' : process.stat === 'R' ? 'running' : 'other'}">
                        ${process.stat}
                    </span>
                </td>
                <td>${process.start}</td>
                <td>${process.time}</td>
                <td class="command-cell">
                    <div class="process-type">${process.processType || 'main server'}</div>
                    <div class="command-text">${process.command}</div>
                </td>
            </tr>
        `).join('');
    }
}