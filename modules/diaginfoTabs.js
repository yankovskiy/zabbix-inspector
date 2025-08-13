import { utils } from '../utils/helpers.js';

export class DiaginfoTabs {
    constructor() {}

    setupDiaginfoTabs() {
        const tabButtons = document.querySelectorAll('.tab-button');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tabId = e.target.getAttribute('data-tab');
                this.showDiaginfoTab(tabId);
                
                // Обновляем активную кнопку
                tabButtons.forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
    }

    showDiaginfoTab(tabId) {
        // Скрываем все вкладки
        const allTabs = document.querySelectorAll('.tab-content');
        allTabs.forEach(tab => tab.classList.remove('active'));
        
        // Показываем выбранную вкладку
        const activeTab = document.getElementById(`tab-${tabId}`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
    }

    createHistoryCacheTab(diaginfoData) {
        const historyData = diaginfoData['history cache diagnostic information'] || [];
        
        if (historyData.length === 0) {
            return '<div class="card"><p>Нет данных о кэше истории</p></div>';
        }

        // Парсим данные истории кэша
        const parsed = this.parseHistoryCacheData(historyData);
        
        return `
            <div class="dashboard-grid">
                <div class="card">
                    <div class="card-header">
                        <div class="card-icon">📚</div>
                        <div class="card-title">Основные метрики</div>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Количество метрик</span>
                        <span class="metric-value">${utils.formatLargeNumber(parsed.items) || 'N/A'}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Количество значений</span>
                        <span class="metric-value">${utils.formatLargeNumber(parsed.values) || 'N/A'}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Время обработки</span>
                        <span class="metric-value ${parsed.time && parsed.time < 0.001 ? 'good' : 'warning'}">${parsed.time || 'N/A'}s</span>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <div class="card-icon">💾</div>
                        <div class="card-title">Использование памяти</div>
                    </div>
                    ${parsed.memoryData && parsed.memoryIndex ? `
                        <div class="metric">
                            <span class="metric-label">Данные</span>
                            <span class="metric-value">${utils.formatBytesShort(parsed.memoryData.used)} / ${utils.formatBytesShort(parsed.memoryData.total)} (${parsed.memoryData.usedPercent}%)</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Индексы</span>
                            <span class="metric-value">${utils.formatBytesShort(parsed.memoryIndex.used)} / ${utils.formatBytesShort(parsed.memoryIndex.total)} (${parsed.memoryIndex.usedPercent}%)</span>
                        </div>
                    ` : '<p>Нет данных о памяти</p>'}
                </div>

                ${parsed.topValues ? `
                    <div class="card">
                        <div class="card-header">
                            <div class="card-icon">📊</div>
                            <div class="card-title">Top.values</div>
                        </div>
                        <div style="overflow-x: auto;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                                <thead>
                                    <tr style="background-color: var(--bg-secondary); border-bottom: 1px solid var(--border-color);">
                                        <th style="padding: 8px 12px; text-align: left; color: var(--text-primary); font-weight: 600;">itemid</th>
                                        <th style="padding: 8px 12px; text-align: right; color: var(--text-primary); font-weight: 600;">количество</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${parsed.topValues.map(item => `
                                        <tr style="border-bottom: 1px solid var(--bg-secondary);">
                                            <td style="padding: 6px 12px;">
                                                <a href="#" 
                                                   style="color: var(--primary-color); text-decoration: none;" 
                                                   onclick="window.zabbixAnalyzer?.openZabbixItem('${item.itemid}'); return false;"
                                                   onmouseover="this.style.textDecoration='underline'"
                                                   onmouseout="this.style.textDecoration='none'">
                                                    ${item.itemid}
                                                </a>
                                            </td>
                                            <td style="padding: 6px 12px; text-align: right; color: var(--text-secondary);">
                                                ${item.values}
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    createValueCacheTab(diaginfoData) {
        const valueCacheData = diaginfoData['value cache diagnostic information'] || [];
        
        if (valueCacheData.length === 0) {
            return '<div class="card"><p>Нет данных о кэше значений</p></div>';
        }

        const parsed = this.parseValueCacheData(valueCacheData);
        
        return `
            <div class="dashboard-grid">
                <div class="card">
                    <div class="card-header">
                        <div class="card-icon">🗂️</div>
                        <div class="card-title">Основные метрики</div>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Количество метрик</span>
                        <span class="metric-value">${utils.formatLargeNumber(parsed.items) || 'N/A'}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Количество значений</span>
                        <span class="metric-value">${utils.formatLargeNumber(parsed.values) || 'N/A'}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Режим</span>
                        <span class="metric-value">${parsed.mode || 'N/A'}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Время обработки</span>
                        <span class="metric-value ${parsed.time && parsed.time < 0.001 ? 'good' : 'warning'}">${parsed.time || 'N/A'}s</span>
                    </div>
                </div>

                ${parsed.memory ? `
                    <div class="card">
                        <div class="card-header">
                            <div class="card-icon">💾</div>
                            <div class="card-title">Использование памяти</div>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Память</span>
                            <span class="metric-value">${utils.formatBytesShort(parsed.memory.used)} / ${utils.formatBytesShort(parsed.memory.free + parsed.memory.used)} (${((parsed.memory.used / (parsed.memory.free + parsed.memory.used)) * 100).toFixed(2)}%)</span>
                        </div>
                    </div>
                ` : ''}

                ${parsed.topValues ? `
                    <div class="card">
                        <div class="card-header">
                            <div class="card-icon">📊</div>
                            <div class="card-title">Top.values</div>
                        </div>
                        <div style="overflow-x: auto;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                                <thead>
                                    <tr style="background-color: var(--bg-secondary); border-bottom: 1px solid var(--border-color);">
                                        <th style="padding: 8px 12px; text-align: left; color: var(--text-primary); font-weight: 600;">itemid</th>
                                        <th style="padding: 8px 12px; text-align: right; color: var(--text-primary); font-weight: 600;">количество</th>
                                        <th style="padding: 8px 12px; text-align: right; color: var(--text-primary); font-weight: 600;">запросов</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${parsed.topValues.map(item => `
                                        <tr style="border-bottom: 1px solid var(--bg-secondary);">
                                            <td style="padding: 6px 12px;">
                                                <a href="#" 
                                                   style="color: var(--primary-color); text-decoration: none;" 
                                                   onclick="window.zabbixAnalyzer?.openZabbixItem('${item.itemid}'); return false;"
                                                   onmouseover="this.style.textDecoration='underline'"
                                                   onmouseout="this.style.textDecoration='none'">
                                                    ${item.itemid}
                                                </a>
                                            </td>
                                            <td style="padding: 6px 12px; text-align: right; color: var(--text-secondary);">
                                                ${item.values}
                                            </td>
                                            <td style="padding: 6px 12px; text-align: right; color: var(--text-secondary);">
                                                ${item.requests}
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ` : ''}

                ${parsed.topRequests ? `
                    <div class="card">
                        <div class="card-header">
                            <div class="card-icon">🔍</div>
                            <div class="card-title">Top.requests</div>
                        </div>
                        <div style="overflow-x: auto;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                                <thead>
                                    <tr style="background-color: var(--bg-secondary); border-bottom: 1px solid var(--border-color);">
                                        <th style="padding: 8px 12px; text-align: left; color: var(--text-primary); font-weight: 600;">itemid</th>
                                        <th style="padding: 8px 12px; text-align: right; color: var(--text-primary); font-weight: 600;">количество</th>
                                        <th style="padding: 8px 12px; text-align: right; color: var(--text-primary); font-weight: 600;">запросов</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${parsed.topRequests.map(item => `
                                        <tr style="border-bottom: 1px solid var(--bg-secondary);">
                                            <td style="padding: 6px 12px;">
                                                <a href="#" 
                                                   style="color: var(--primary-color); text-decoration: none;" 
                                                   onclick="window.zabbixAnalyzer?.openZabbixItem('${item.itemid}'); return false;"
                                                   onmouseover="this.style.textDecoration='underline'"
                                                   onmouseout="this.style.textDecoration='none'">
                                                    ${item.itemid}
                                                </a>
                                            </td>
                                            <td style="padding: 6px 12px; text-align: right; color: var(--text-secondary);">
                                                ${item.values}
                                            </td>
                                            <td style="padding: 6px 12px; text-align: right; color: var(--text-secondary);">
                                                ${item.requests}
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    createPreprocessingTab(diaginfoData) {
        const preprocData = diaginfoData['preprocessing diagnostic information'] || [];
        
        if (preprocData.length === 0) {
            return '<div class="card"><p>Нет данных о препроцессинге</p></div>';
        }

        const parsed = this.parsePreprocessingData(preprocData);
        
        return `
            <div class="dashboard-grid">
                <div class="card">
                    <div class="card-header">
                        <div class="card-icon">⚙️</div>
                        <div class="card-title">Препроцессинг</div>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Значения</span>
                        <span class="metric-value">${utils.formatLargeNumber(parsed.values) || 0}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Выполнено</span>
                        <span class="metric-value good">${utils.formatLargeNumber(parsed.done) || 0}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">В очереди</span>
                        <span class="metric-value ${parsed.queued > 0 ? 'warning' : 'good'}">${utils.formatLargeNumber(parsed.queued) || 0}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Обрабатывается</span>
                        <span class="metric-value">${utils.formatLargeNumber(parsed.processing) || 0}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Ожидает</span>
                        <span class="metric-value">${utils.formatLargeNumber(parsed.pending) || 0}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Время обработки</span>
                        <span class="metric-value ${parsed.time && parsed.time < 0.001 ? 'good' : 'warning'}">${parsed.time || 'N/A'}s</span>
                    </div>
                </div>

                ${parsed.topValues ? `
                    <div class="card">
                        <div class="card-header">
                            <div class="card-icon">📊</div>
                            <div class="card-title">Top.values</div>
                        </div>
                        <div style="overflow-x: auto;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                                <thead>
                                    <tr style="background-color: var(--bg-secondary); border-bottom: 1px solid var(--border-color);">
                                        <th style="padding: 8px 12px; text-align: left; color: var(--text-primary); font-weight: 600;">itemid</th>
                                        <th style="padding: 8px 12px; text-align: right; color: var(--text-primary); font-weight: 600;">количество</th>
                                        <th style="padding: 8px 12px; text-align: right; color: var(--text-primary); font-weight: 600;">шаги</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${parsed.topValues.map(item => `
                                        <tr style="border-bottom: 1px solid var(--bg-secondary);">
                                            <td style="padding: 6px 12px;">
                                                <a href="#" 
                                                   style="color: var(--primary-color); text-decoration: none;" 
                                                   onclick="window.zabbixAnalyzer?.openZabbixItem('${item.itemid}'); return false;"
                                                   onmouseover="this.style.textDecoration='underline'"
                                                   onmouseout="this.style.textDecoration='none'">
                                                    ${item.itemid}
                                                </a>
                                            </td>
                                            <td style="padding: 6px 12px; text-align: right; color: var(--text-secondary);">
                                                ${item.values}
                                            </td>
                                            <td style="padding: 6px 12px; text-align: right; color: var(--text-secondary);">
                                                ${item.steps}
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    createLLDTab(diaginfoData) {
        const lldData = diaginfoData['LLD diagnostic information'] || [];
        
        if (lldData.length === 0) {
            return '<div class="card"><p>Нет данных о LLD</p></div>';
        }

        const parsed = this.parseLLDData(lldData);
        
        return `
            <div class="dashboard-grid">
                <div class="card">
                    <div class="card-header">
                        <div class="card-icon">🔄</div>
                        <div class="card-title">LLD Правила</div>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Количество правил</span>
                        <span class="metric-value">${parsed.rules || 'N/A'}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Количество значений</span>
                        <span class="metric-value">${parsed.values || 'N/A'}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Время обработки</span>
                        <span class="metric-value ${parsed.time && parsed.time < 0.001 ? 'good' : 'warning'}">${parsed.time || 'N/A'}s</span>
                    </div>
                </div>

                ${parsed.topValues ? `
                    <div class="card">
                        <div class="card-header">
                            <div class="card-icon">📊</div>
                            <div class="card-title">Top.values</div>
                        </div>
                        <div style="overflow-x: auto;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                                <thead>
                                    <tr style="background-color: var(--bg-secondary); border-bottom: 1px solid var(--border-color);">
                                        <th style="padding: 8px 12px; text-align: left; color: var(--text-primary); font-weight: 600;">Discovery ID</th>
                                        <th style="padding: 8px 12px; text-align: right; color: var(--text-primary); font-weight: 600;">Количество</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${parsed.topValues.map(item => `
                                        <tr style="border-bottom: 1px solid var(--bg-secondary);">
                                            <td style="padding: 6px 12px;">
                                                <a href="#" 
                                                   style="color: var(--primary-color); text-decoration: none;" 
                                                   onclick="window.zabbixAnalyzer?.openZabbixLLD('${item.itemid}'); return false;"
                                                   onmouseover="this.style.textDecoration='underline'"
                                                   onmouseout="this.style.textDecoration='none'">
                                                    ${item.itemid}
                                                </a>
                                            </td>
                                            <td style="padding: 6px 12px; text-align: right; color: var(--text-secondary);">
                                                ${item.values}
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    createAlertingTab(diaginfoData) {
        const alertingData = diaginfoData['alerting diagnostic information'] || [];
        
        if (alertingData.length === 0) {
            return '<div class="card"><p>Нет данных об аллертинге</p></div>';
        }

        const parsed = this.parseAlertingData(alertingData);
        
        return `
            <div class="dashboard-grid">
                <div class="card">
                    <div class="card-header">
                        <div class="card-icon">🚨</div>
                        <div class="card-title">Система оповещений</div>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Алерты</span>
                        <span class="metric-value ${parsed.alerts > 0 ? 'warning' : 'good'}">${parsed.alerts || 0}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Время обработки</span>
                        <span class="metric-value ${parsed.time && parsed.time < 0.001 ? 'good' : 'warning'}">${parsed.time || 'N/A'}s</span>
                    </div>
                </div>
            </div>
        `;
    }

    createLocksTab(diaginfoData) {
        const locksData = diaginfoData['locks diagnostic information'] || [];
        
        if (locksData.length === 0) {
            return '<div class="card"><p>Нет данных о блокировках</p></div>';
        }

        const locks = this.parseLocksData(locksData);
        
        return `
            <div class="card">
                <div class="card-header">
                    <div class="card-icon">🔒</div>
                    <div class="card-title">Системные мьютексы и блокировки</div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 12px; margin-top: 16px;">
                    ${locks.map(lock => `
                        <div style="background: var(--bg-secondary); padding: 12px; border-radius: 6px; font-family: var(--font-mono, monospace); font-size: 12px;">
                            <div style="color: var(--primary-color); font-weight: 600; margin-bottom: 4px;">${lock.name}</div>
                            <div style="color: var(--text-secondary);">${lock.address}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Методы парсинга данных
    parseHistoryCacheData(data) {
        const result = {};
        let currentSection = null;
        
        data.forEach(line => {
            if (line.startsWith('Items:')) {
                const match = utils.parseRegexMatch(line, /Items:(\d+) values:(\d+) time:([\d.]+)/, ['items', 'values', 'time']);
                if (match) {
                    result.items = match.items;
                    result.values = match.values;
                    result.time = parseFloat(match.time);
                }
            } else if (line === 'Memory.data:') {
                currentSection = 'data';
            } else if (line === 'Memory.index:') {
                currentSection = 'index';
            } else if (line.includes('size: free:') && currentSection) {
                const match = utils.parseRegexMatch(line, /free:(\d+) used:(\d+)/, ['free', 'used']);
                if (match) {
                    const free = parseInt(match.free);
                    const used = parseInt(match.used);
                    const total = free + used;
                    const usedPercent = ((used / total) * 100).toFixed(2);
                    
                    if (currentSection === 'data') {
                        result.memoryData = {
                            free,
                            used,
                            total,
                            usedPercent
                        };
                    } else if (currentSection === 'index') {
                        result.memoryIndex = {
                            free,
                            used,
                            total,
                            usedPercent
                        };
                    }
                }
            } else if (line.includes('itemid:')) {
                if (!result.topValues) result.topValues = [];
                const match = utils.parseRegexMatch(line, /itemid:(\d+) values:(\d+)/, ['itemid', 'values']);
                if (match) {
                    result.topValues.push({
                        itemid: match.itemid,
                        values: match.values
                    });
                }
            }
        });
        
        return result;
    }

    parseValueCacheData(data) {
        const result = {};
        let currentSection = null;
        
        data.forEach(line => {
            if (line.startsWith('Items:')) {
                const match = utils.parseRegexMatch(line, /Items:(\d+) values:(\d+) mode:(\d+) time:([\d.]+)/, ['items', 'values', 'mode', 'time']);
                if (match) {
                    result.items = match.items;
                    result.values = match.values;
                    result.mode = match.mode;
                    result.time = parseFloat(match.time);
                }
            } else if (line === 'Memory:') {
                currentSection = 'memory';
            } else if (line.startsWith('size: ') && currentSection === 'memory') {
                const match = line.match(/free:(\d+) used:(\d+)/);
                if (match) {
                    result.memory = {
                        free: parseInt(match[1]),
                        used: parseInt(match[2])
                    };
                }
            } else if (line === 'Top.values:') {
                currentSection = 'topValues';
                result.topValues = [];
            } else if (line === 'Top.request.values:') {
                currentSection = 'topRequests'; 
                result.topRequests = [];
            } else if (line.startsWith('itemid:')) {
                if (currentSection === 'topValues') {
                    const match = line.match(/itemid:(\d+) values:(\d+) request\.values:(\d+)/);
                    if (match) {
                        result.topValues.push({
                            itemid: match[1],
                            values: match[2],
                            requests: match[3]
                        });
                    }
                } else if (currentSection === 'topRequests') {
                    const match = line.match(/itemid:(\d+) values:(\d+) request\.values:(\d+)/);
                    if (match) {
                        result.topRequests.push({
                            itemid: match[1],
                            values: match[2],
                            requests: match[3]
                        });
                    }
                }
            }
        });
        
        return result;
    }

    parsePreprocessingData(data) {
        const result = {};
        let inTopValues = false;
        
        data.forEach(line => {
            if (line.startsWith('Values:')) {
                const match = utils.parseRegexMatch(line, /Values:(\d+) done:(\d+) queued:(\d+) processing:(\d+) pending:(\d+) time:([\d.]+)/, ['values', 'done', 'queued', 'processing', 'pending', 'time']);
                if (match) {
                    result.values = parseInt(match.values);
                    result.done = parseInt(match.done);
                    result.queued = parseInt(match.queued);
                    result.processing = parseInt(match.processing);
                    result.pending = parseInt(match.pending);
                    result.time = parseFloat(match.time);
                }
            } else if (line === 'Top.values:') {
                inTopValues = true;
                result.topValues = [];
            } else if (inTopValues && line.includes('itemid:')) {
                const match = line.match(/itemid:(\d+) values:(\d+) steps:(\d+)/);
                if (match) {
                    result.topValues.push({
                        itemid: match[1],
                        values: match[2],
                        steps: match[3]
                    });
                }
            } else if (inTopValues && (line.startsWith('==') || line.trim() === '' || line.startsWith('Top.'))) {
                inTopValues = false;
            }
        });
        
        return result;
    }

    parseLLDData(data) {
        const result = {};
        let inTopValues = false;
        
        data.forEach(line => {
            if (line.startsWith('Rules:')) {
                const match = line.match(/Rules:(\d+) values:(\d+) time:([\d.]+)/);
                if (match) {
                    result.rules = match[1];
                    result.values = match[2];
                    result.time = parseFloat(match[3]);
                }
            } else if (line === 'Top.values:') {
                inTopValues = true;
                result.topValues = [];
            } else if (inTopValues && line.includes('itemid:')) {
                const match = line.match(/itemid:(\d+) values:(\d+)/);
                if (match) {
                    result.topValues.push({
                        itemid: match[1],
                        values: match[2]
                    });
                }
            } else if (line.startsWith('==') || (line.trim() === '' && inTopValues)) {
                inTopValues = false;
            }
        });
        
        return result;
    }

    parseAlertingData(data) {
        const result = {};
        
        data.forEach(line => {
            if (line.startsWith('Alerts:')) {
                const match = line.match(/Alerts:(\d+) time:([\d.]+)/);
                if (match) {
                    result.alerts = parseInt(match[1]);
                    result.time = parseFloat(match[2]);
                }
            }
        });
        
        return result;
    }

    parseLocksData(data) {
        const locks = [];
        
        data.forEach(line => {
            if (line.includes(':0x')) {
                const parts = line.split(':');
                if (parts.length >= 2) {
                    locks.push({
                        name: parts[0].trim(),
                        address: parts[1].trim()
                    });
                }
            }
        });
        
        return locks;
    }
}