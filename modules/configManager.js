import { STATUS_THRESHOLDS } from '../config/constants.js';
import { utils } from '../utils/helpers.js';

export class ConfigManager {
    constructor() {
        this.configData = [];
        this.filteredData = [];
        this.sortColumn = 'parameter';
        this.sortDirection = 'asc';
        this.defaultMemoryValues = {
            'CacheSize': 32 * 1024 * 1024,
            'HistoryCacheSize': 16 * 1024 * 1024,
            'HistoryIndexCacheSize': 4 * 1024 * 1024,
            'TrendCacheSize': 4 * 1024 * 1024,
            'ValueCacheSize': 8 * 1024 * 1024,
            'VMwareCacheSize': 8 * 1024 * 1024,
            'HistoryTextCacheSize': 16 * 1024 * 1024
        };
    }

    updateConfigPage(diagnosticData) {
        if (!diagnosticData.config) {
            return;
        }

        // Преобразуем объект конфига в массив для удобной работы
        this.configData = Object.entries(diagnosticData.config).map(([key, value]) => ({
            parameter: key,
            value: value
        }));

        this.filteredData = [...this.configData];
        this.sortData();
        this.renderTable();
        this.setupEventListeners();
        this.updateMemoryInfo(diagnosticData);
    }

    setupEventListeners() {
        // Поиск
        const searchInput = document.getElementById('configSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterData(e.target.value);
            });
        }

        // Сортировка по клику на заголовки
        const sortableHeaders = document.querySelectorAll('#configTable th.sortable');
        sortableHeaders.forEach(header => {
            header.addEventListener('click', (e) => {
                const sortBy = e.currentTarget.getAttribute('data-sort');
                this.setSortColumn(sortBy);
            });
        });
    }

    filterData(searchTerm) {
        if (!searchTerm.trim()) {
            this.filteredData = [...this.configData];
        } else {
            const term = searchTerm.toLowerCase();
            this.filteredData = this.configData.filter(item => 
                item.parameter.toLowerCase().includes(term) ||
                item.value.toLowerCase().includes(term)
            );
        }
        this.sortData();
        this.renderTable();
    }

    setSortColumn(column) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }
        
        this.updateSortIcons();
        this.sortData();
        this.renderTable();
    }

    sortData() {
        this.filteredData.sort((a, b) => {
            let aVal = a[this.sortColumn];
            let bVal = b[this.sortColumn];

            // Приведение к строке для сравнения
            aVal = String(aVal).toLowerCase();
            bVal = String(bVal).toLowerCase();

            if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }

    updateSortIcons() {
        // Сброс всех иконок сортировки
        document.querySelectorAll('#configTable .sort-icon').forEach(icon => {
            icon.textContent = '↕';
        });

        // Установка иконки для текущей колонки
        const currentHeader = document.querySelector(`#configTable th[data-sort="${this.sortColumn}"] .sort-icon`);
        if (currentHeader) {
            currentHeader.textContent = this.sortDirection === 'asc' ? '↑' : '↓';
        }
    }

    renderTable() {
        const tbody = document.getElementById('configTableBody');
        if (!tbody) return;

        if (this.filteredData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" class="no-data">Нет данных для отображения</td></tr>';
            return;
        }

        const rows = this.filteredData.map(item => {
            const parameterDisplay = this.highlightMemoryParameters(item.parameter);
            
            return `
                <tr>
                    <td class="config-parameter">${parameterDisplay}</td>
                    <td class="config-value">${this.escapeHtml(item.value)}</td>
                </tr>
            `;
        }).join('');

        tbody.innerHTML = rows;
    }

    highlightMemoryParameters(parameter) {
        // Список параметров, связанных с памятью
        const memoryParams = [
            'CacheSize', 'HistoryCacheSize', 'HistoryIndexCacheSize', 
            'TrendCacheSize', 'ValueCacheSize', 'VMwareCacheSize', 
            'HistoryTextCacheSize'
        ];

        if (memoryParams.includes(parameter)) {
            return `<span class="memory-param" title="Параметр управления памятью">${this.escapeHtml(parameter)}</span>`;
        }

        return this.escapeHtml(parameter);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getConfigStats() {
        if (!this.configData.length) return null;

        const memoryParams = this.configData.filter(item => 
            item.parameter.includes('Cache') || 
            item.parameter.includes('Size')
        ).length;

        return {
            total: this.configData.length,
            memoryRelated: memoryParams,
            filtered: this.filteredData.length
        };
    }

    parseSizeValue(value) {
        if (!value || value === '0') return 0;
        
        const str = value.toString().toUpperCase();
        const matches = str.match(/^([\d.]+)([KMGT]?)$/);
        
        if (!matches) return 0;
        
        const [, num, unit] = matches;
        const number = parseFloat(num);
        
        switch (unit) {
            case 'K': return number * 1024;
            case 'M': return number * 1024 * 1024;
            case 'G': return number * 1024 * 1024 * 1024;
            case 'T': return number * 1024 * 1024 * 1024 * 1024;
            default: return number;
        }
    }


    calculateMemoryAllocation(diagnosticData) {
        let explicitMemory = 0;
        let defaultMemory = 0;
        let serverMemory = 0;

        // Получаем общую память сервера из free.txt
        if (diagnosticData.memory && diagnosticData.memory.total) {
            serverMemory = diagnosticData.memory.total;
        }

        // Определяем какие параметры памяти присутствуют в конфигурации
        const presentParams = new Set();
        
        // Суммируем явно указанную память из конфигурации
        this.configData.forEach(item => {
            if (item.parameter in this.defaultMemoryValues) {
                presentParams.add(item.parameter);
                const memorySize = this.parseSizeValue(item.value);
                explicitMemory += memorySize;
            }
        });

        // Добавляем дефолтные значения для отсутствующих параметров
        Object.entries(this.defaultMemoryValues).forEach(([param, defaultSize]) => {
            if (!presentParams.has(param)) {
                defaultMemory += defaultSize;
            }
        });

        const totalMemory = explicitMemory + defaultMemory;
        const memoryPercentage = serverMemory > 0 ? (totalMemory / serverMemory) * 100 : 0;

        return {
            explicit: explicitMemory,
            default: defaultMemory,
            total: totalMemory,
            server: serverMemory,
            percentage: memoryPercentage
        };
    }

    updateMemoryInfo(diagnosticData) {
        const memory = this.calculateMemoryAllocation(diagnosticData);
        
        const memoryTotalEl = document.getElementById('memoryTotal');
        const memoryExplicitEl = document.getElementById('memoryExplicit');
        const memoryDefaultEl = document.getElementById('memoryDefault');
        const memoryServerEl = document.getElementById('memoryServer');

        if (memoryTotalEl && memoryExplicitEl && memoryDefaultEl && memoryServerEl) {
            memoryExplicitEl.textContent = utils.formatBytesShort(memory.explicit);
            memoryDefaultEl.textContent = utils.formatBytesShort(memory.default);
            memoryTotalEl.textContent = utils.formatBytesShort(memory.total);
            memoryServerEl.textContent = utils.formatBytesShort(memory.server);

            // Цветовая индикация для общей памяти
            memoryTotalEl.className = 'memory-total';
            const status = utils.getStatus(memory.percentage, STATUS_THRESHOLDS.memory);
            memoryTotalEl.innerHTML = utils.createStatusSpan(memoryTotalEl.textContent, status);
        }
    }
}