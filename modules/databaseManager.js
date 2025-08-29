import { utils } from '../utils/helpers.js';

export class DatabaseManager {
    constructor() {
        this.databaseData = new Map();
        this.currentTab = '';
        this.sortColumn = '';
        this.sortDirection = 'asc';
        this.tabDisplayNames = {
            'hosts_top_by_metrics': 'Топ хостов по метрикам',
            'item_types_detailed_stats': 'Типы элементов данных',
            'escalations_recent_events_analysis': 'Активные эскалации',
            'triggers_performance_24h_stats': 'Производительность триггеров'
        };
    }

    parseDatabaseFiles(files) {
        console.log('DatabaseManager: parseDatabaseFiles called with:', Object.keys(files));
        const databaseFiles = new Map();
        
        // Фильтруем файлы из папки database/
        Object.keys(files).forEach(fileName => {
            console.log('Processing file:', fileName);
            if (fileName.includes('/database/') && fileName.endsWith('.csv')) {
                // Извлекаем имя CSV файла из полного пути
                const csvName = fileName.split('/').pop().replace('.csv', '');
                const csvContent = files[fileName];
                
                console.log(`Parsing CSV file: ${csvName}, content length: ${csvContent.length}`);
                
                try {
                    const parsedData = this.parseCSV(csvContent);
                    console.log(`Parsed ${csvName}: ${parsedData.rows.length} rows`);
                    
                    if (parsedData.rows.length > 0) {
                        parsedData.displayName = this.tabDisplayNames[csvName] || this.formatDisplayName(csvName);
                        databaseFiles.set(csvName, parsedData);
                        console.log(`Added ${csvName} to databaseFiles with display name: ${parsedData.displayName}`);
                    }
                } catch (error) {
                    console.error(`Ошибка парсинга файла ${fileName}:`, error);
                }
            }
        });

        this.databaseData = databaseFiles;
        console.log('DatabaseManager: final databaseData size:', this.databaseData.size);
        console.log('DatabaseManager: databaseData keys:', Array.from(this.databaseData.keys()));
        return databaseFiles;
    }

    parseCSV(csvContent) {
        const lines = csvContent.trim().split('\n');
        if (lines.length === 0) {
            return { headers: [], rows: [] };
        }

        const headers = lines[0].split(',').map(h => h.trim());
        const rows = lines.slice(1).map(line => {
            const values = line.split(',');
            return headers.reduce((obj, header, index) => {
                obj[header] = values[index] ? values[index].trim() : '';
                return obj;
            }, {});
        });

        return { headers, rows };
    }

    formatDisplayName(csvName) {
        return csvName
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }

    createDatabasePage() {
        console.log('DatabaseManager: createDatabasePage called');
        const container = document.getElementById('databaseContent');
        if (!container) {
            console.error('DatabaseManager: container #databaseContent not found');
            return;
        }

        console.log('DatabaseManager: databaseData size:', this.databaseData.size);
        if (this.databaseData.size === 0) {
            console.log('DatabaseManager: showing empty state');
            this.showEmptyState();
            return;
        }

        // Создаем табовую навигацию
        container.innerHTML = `
            <div class="database-tabs" id="databaseTabs">
                ${this.createTabButtons()}
            </div>
            <div class="database-tab-content" id="databaseTabContent">
                <!-- Контент будет загружен динамически -->
            </div>
        `;

        this.setupDatabaseTabs();
        
        // Активируем первую вкладку
        const firstTab = Array.from(this.databaseData.keys())[0];
        if (firstTab) {
            this.showDatabaseTab(firstTab);
        }
    }

    createTabButtons() {
        const buttons = Array.from(this.databaseData.entries()).map(([tabId, data]) => {
            return `<button class="tab-button" data-tab="${tabId}">${data.displayName}</button>`;
        });

        return buttons.join('');
    }

    setupDatabaseTabs() {
        const tabButtons = document.querySelectorAll('#databaseTabs .tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tabId = e.target.getAttribute('data-tab');
                this.showDatabaseTab(tabId);
            });
        });
    }

    showDatabaseTab(tabId) {
        if (!this.databaseData.has(tabId)) return;

        // Обновляем активную вкладку
        document.querySelectorAll('#databaseTabs .tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeButton = document.querySelector(`#databaseTabs .tab-button[data-tab="${tabId}"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }

        this.currentTab = tabId;
        this.renderTable(this.databaseData.get(tabId), tabId);
    }

    renderTable(csvData, tabId) {
        const contentContainer = document.getElementById('databaseTabContent');
        if (!contentContainer) return;

        const tableHtml = `
            <div class="table-container">
                <div class="table-controls">
                    <div class="table-title">${csvData.displayName}</div>
                    <div class="table-stats">
                        Записей: <strong>${csvData.rows.length}</strong>
                    </div>
                </div>
                <div class="table-wrapper">
                    <table class="database-table" id="databaseTable-${tabId}">
                        <thead>
                            <tr>
                                ${csvData.headers.map(header => 
                                    `<th class="sortable" data-sort="${header}">
                                        ${this.formatHeaderName(header)}
                                        <span class="sort-icon">↕</span>
                                    </th>`
                                ).join('')}
                            </tr>
                        </thead>
                        <tbody id="databaseTableBody-${tabId}">
                            ${this.createTableRows(csvData)}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        contentContainer.innerHTML = tableHtml;
        this.setupTableSorting(tabId, csvData);
    }

    formatHeaderName(header) {
        return header
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }

    createTableRows(csvData) {
        return csvData.rows.map(row => {
            const cells = csvData.headers.map(header => {
                const value = row[header] || '';
                const displayValue = this.formatCellValue(value, header, csvData.rows);
                return `<td>${displayValue}</td>`;
            });
            return `<tr>${cells.join('')}</tr>`;
        }).join('');
    }

    formatCellValue(value, header, allRowsData) {
        // Безопасное экранирование HTML
        const escapedValue = this.escapeHtml(value);
        
        // Динамическое определение числовых колонок и форматирование
        if (this.isNumericColumn(header, allRowsData) && !isNaN(escapedValue)) {
            const num = parseFloat(escapedValue);
            if (num >= 1000) {
                return utils.formatLargeNumber(num);
            }
        }

        return escapedValue;
    }

    isNumericColumn(header, allRowsData) {
        // Проверяем первые несколько значений колонки
        const sampleSize = Math.min(5, allRowsData.length);
        let numericCount = 0;
        
        for (let i = 0; i < sampleSize; i++) {
            const value = allRowsData[i][header];
            if (value && !isNaN(value) && isFinite(value)) {
                numericCount++;
            }
        }
        
        // Если более 80% значений числовые, считаем колонку числовой
        return (numericCount / sampleSize) > 0.8;
    }

    setupTableSorting(tabId, csvData) {
        const table = document.getElementById(`databaseTable-${tabId}`);
        if (!table) return;

        const sortableHeaders = table.querySelectorAll('th.sortable');
        sortableHeaders.forEach(header => {
            header.addEventListener('click', (e) => {
                const sortBy = e.currentTarget.getAttribute('data-sort');
                this.sortTable(tabId, csvData, sortBy);
            });
        });
    }

    sortTable(tabId, csvData, column) {
        // Определяем направление сортировки
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }

        // Сортируем данные
        const sortedRows = [...csvData.rows].sort((a, b) => {
            let aVal = a[column] || '';
            let bVal = b[column] || '';

            // Пытаемся преобразовать в числа для числовых колонок
            if (this.isNumericColumn(column, csvData.rows)) {
                const aNum = parseFloat(aVal);
                const bNum = parseFloat(bVal);
                if (!isNaN(aNum) && !isNaN(bNum)) {
                    return this.sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
                }
            }

            // Строковое сравнение
            aVal = String(aVal).toLowerCase();
            bVal = String(bVal).toLowerCase();

            if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        // Обновляем отображение
        this.updateSortIcons(tabId, column);
        this.updateTableBody(tabId, csvData.headers, sortedRows);
    }

    updateSortIcons(tabId, currentColumn) {
        const table = document.getElementById(`databaseTable-${tabId}`);
        if (!table) return;

        // Сброс всех иконок
        table.querySelectorAll('.sort-icon').forEach(icon => {
            icon.textContent = '↕';
        });

        // Установка иконки для текущей колонки
        const currentHeader = table.querySelector(`th[data-sort="${currentColumn}"] .sort-icon`);
        if (currentHeader) {
            currentHeader.textContent = this.sortDirection === 'asc' ? '↑' : '↓';
        }
    }

    updateTableBody(tabId, headers, rows) {
        const tbody = document.getElementById(`databaseTableBody-${tabId}`);
        if (!tbody) return;

        const rowsHtml = rows.map(row => {
            const cells = headers.map(header => {
                const value = row[header] || '';
                const displayValue = this.formatCellValue(value, header, rows);
                return `<td>${displayValue}</td>`;
            });
            return `<tr>${cells.join('')}</tr>`;
        }).join('');

        tbody.innerHTML = rowsHtml;
    }

    showEmptyState() {
        const container = document.getElementById('databaseContent');
        if (!container) return;

        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🗃️</div>
                <h3>Данные СУБД недоступны</h3>
                <p>Архив не содержит диагностических данных СУБД</p>
                <div class="empty-state-hint">
                    Для сбора данных базы данных используйте команду:<br>
                    <code>zdiag --db --sql-dir python/sql</code>
                </div>
            </div>
        `;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    handleTabSwitch(tabId) {
        this.showDatabaseTab(tabId);
    }

    getDatabaseStats() {
        return {
            totalTabs: this.databaseData.size,
            currentTab: this.currentTab,
            tabNames: Array.from(this.databaseData.keys())
        };
    }
}