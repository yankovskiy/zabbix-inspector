export const utils = {
    // Форматирование времени работы
    formatUptime(seconds) {
        if (seconds < 60) {
            return `${seconds} секунд`;
        }

        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) {
            return `${minutes} минут`;
        }

        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        if (hours < 24) {
            return `${hours}ч ${remainingMinutes}м`;
        }

        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        return `${days}д ${remainingHours}ч ${remainingMinutes}м`;
    },

    // Форматирование размера файла
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        const value = bytes / Math.pow(1024, i);
        
        return `${value.toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
    },

    // Краткое форматирование размера файла
    formatBytesShort(bytes) {
        if (bytes >= 1024 * 1024 * 1024) {
            return `${Math.round(bytes / (1024 * 1024 * 1024))}Gb`;
        } else if (bytes >= 1024 * 1024) {
            return `${Math.round(bytes / (1024 * 1024))}Mb`;
        } else if (bytes >= 1024) {
            return `${Math.round(bytes / 1024)}Kb`;
        }
        return `${bytes}B`;
    },


    // Показать ошибку
    showError(message) {
        const errorMessage = document.getElementById('errorMessage');
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.style.display = 'block';
        }
    },

    // Сброс содержимого страниц
    resetPageContent() {
        // Сброс содержимого страницы обзора к начальному состоянию
        const dashboard = document.getElementById('overviewDashboard');
        if (dashboard) {
            dashboard.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <div class="card-icon">🖥️</div>
                        <div class="card-title">Информация о сервере</div>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Статус</span>
                        <span class="metric-value">Загрузите диагностические данные</span>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header">
                        <div class="card-icon">📊</div>
                        <div class="card-title">Информация о Zabbix</div>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Статус</span>
                        <span class="metric-value">Нет данных</span>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header">
                        <div class="card-icon">⚠️</div>
                        <div class="card-title">Проблемные процессы Zabbix</div>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Статус</span>
                        <span class="metric-value">Нет данных</span>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header">
                        <div class="card-icon">💾</div>
                        <div class="card-title">Состояние кэшей Zabbix</div>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Статус</span>
                        <span class="metric-value">Нет данных</span>
                    </div>
                </div>
            `;
        }

        // Сброс других страниц
        const defaultContent = '<div class="metric"><span class="metric-label">Статус</span><span class="metric-value">Нет данных</span></div>';

        const processStats = document.getElementById('processStats');
        const systemStats = document.getElementById('systemStats');

        if (processStats) processStats.innerHTML = defaultContent;
        if (systemStats) systemStats.innerHTML = defaultContent;

        // Очистить диагностику
        const diagnosticsDashboard = document.getElementById('diagnosticsDashboard');
        if (diagnosticsDashboard) {
            diagnosticsDashboard.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <div class="card-icon">🔒</div>
                        <div class="card-title">Системные блокировки</div>
                    </div>
                    ${defaultContent}
                </div>
            `;
        }
    },

    // Валидация данных с расширенными возможностями
    validateData(data, requiredFields = [], options = {}) {
        if (!data) return false;

        const { strict = false, nonEmpty = false } = options;

        return requiredFields.every(field => {
            const fieldParts = field.split('.');
            let current = data;

            for (const part of fieldParts) {
                if (current === null || current === undefined) {
                    return false;
                }
                
                // В строгом режиме проверяем hasOwnProperty, иначе используем простую проверку
                if (strict ? !current.hasOwnProperty(part) : !(part in current)) {
                    return false;
                }
                
                current = current[part];
            }

            // Опционально проверяем, что значение не пустое
            if (nonEmpty) {
                if (current === null || current === undefined || current === '') {
                    return false;
                }
                if (Array.isArray(current) && current.length === 0) {
                    return false;
                }
            }

            return true;
        });
    },

    // Безопасное получение значения из объекта с улучшенной обработкой
    safeGet(obj, path, defaultValue = null) {
        if (!obj || !path) return defaultValue;

        const keys = Array.isArray(path) ? path : path.split('.');
        let current = obj;

        for (const key of keys) {
            if (current === null || current === undefined) {
                return defaultValue;
            }
            
            // Поддержка массивов и объектов
            if (typeof current === 'object' && key in current) {
                current = current[key];
            } else {
                return defaultValue;
            }
        }

        return current;
    },

    // Форматирование чисел
    formatNumber(num, decimals = 2) {
        if (num === null || num === undefined || isNaN(num)) {
            return '0';
        }

        return Number(num).toFixed(decimals);
    },

    // Форматирование больших чисел с разделителями
    formatLargeNumber(num, separator = ' ') {
        if (num === null || num === undefined || isNaN(num)) {
            return '0';
        }

        return Math.floor(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator);
    },

    // Определение статуса по значению
    getStatus(value, thresholds) {
        if (!thresholds || value === null || value === undefined) {
            return 'good';
        }

        if (value >= thresholds.critical) {
            return 'critical';
        } else if (value >= thresholds.warning) {
            return 'warning';
        } else {
            return 'good';
        }
    },

    // Унифицированный парсинг регулярными выражениями
    parseRegexMatch(content, pattern, fields = []) {
        if (!content || !pattern) {
            return null;
        }

        const match = content.match(pattern);
        if (!match) {
            return null;
        }

        // Если поля не указаны, возвращаем весь массив совпадений
        if (fields.length === 0) {
            return match;
        }

        // Создаем объект с именованными полями
        const result = {};
        fields.forEach((field, index) => {
            result[field] = match[index + 1] || null; // +1 потому что match[0] - это вся строка
        });

        return result;
    },

    // Создание HTML span элемента со статусом
    createStatusSpan(value, status = 'good', additionalClasses = '') {
        const statusToClass = {
            'good': 'green',
            'warning': 'yellow', 
            'critical': 'red',
            'success': 'green'
        };

        const statusClass = statusToClass[status] || 'green';
        const classes = `status-${statusClass} ${additionalClasses}`.trim();

        return `<span class="${classes}">${value}</span>`;
    }
};