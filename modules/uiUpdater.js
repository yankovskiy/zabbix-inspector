import { utils } from '../utils/helpers.js';
import { STATUS_THRESHOLDS, VMSTAT_INDICES } from '../config/constants.js';
import { CardCreator } from './cardCreator.js';
import { DiaginfoTabs } from './diaginfoTabs.js';

export class UIUpdater {
    constructor() {
        this.diaginfoTabs = new DiaginfoTabs();
    }

    updateOverviewPage(diagnosticData) {
        const dashboard = document.getElementById('overviewDashboard');
        if (!dashboard) return;

        dashboard.innerHTML = '';

        // Обновляем информацию о времени сбора диагностики
        this.updateCollectionDateTime(diagnosticData);

        // 1. Информация о сервере
        this.createServerResourcesCard(dashboard, diagnosticData);

        // 2. Информация о Zabbix
        this.createZabbixInfoCard(dashboard, diagnosticData);

        // 3. Проблемные процессы Zabbix
        this.createProblematicProcessesCard(dashboard, diagnosticData);

        // 4. Проблемные кэши Zabbix
        this.createProblematicCachesCard(dashboard, diagnosticData);
    }

    createServerResourcesCard(dashboard, diagnosticData) {
        let html = '<div class="metric"><span class="metric-label">Статус</span><span class="metric-value">Нет данных</span></div>';

        // Данные из free
        let memoryStatus = 'good';
        let swapStatus = 'good';
        let memoryText = 'Нет данных';
        let swapText = 'Нет данных';

        if (diagnosticData.memory) {
            // Функция для конвертации байтов в мегабайты
            const bytesToMB = (bytes) => {
                return bytes / (1024 * 1024);
            };

            // Данные приходят в байтах из free -b
            const totalMem = bytesToMB(diagnosticData.memory.total);
            const availableMem = bytesToMB(diagnosticData.memory.available);
            const memUsedPercent = ((totalMem - availableMem) / totalMem) * 100;

            memoryStatus = utils.getStatus(memUsedPercent, STATUS_THRESHOLDS.memory);

            memoryText = `${utils.formatBytesShort(availableMem * 1024 * 1024)} доступно (${(100 - memUsedPercent).toFixed(1)}%)`;

            // Swap
            const totalSwap = bytesToMB(diagnosticData.memory.swapTotal);
            if (totalSwap > 0) {
                const usedSwap = bytesToMB(diagnosticData.memory.swapUsed);
                const swapUsedPercent = (usedSwap / totalSwap) * 100;
                
                swapStatus = utils.getStatus(swapUsedPercent, STATUS_THRESHOLDS.swap);
                
                swapText = `${swapUsedPercent.toFixed(1)}% используется`;
            } else {
                swapText = 'Не настроен';
            }
        }

        // CPU данные из vmstat (последняя строка)
        let cpuStatus = 'good';
        let cpuText = 'Нет данных';

        if (diagnosticData.vmstat && diagnosticData.vmstat.length > 0) {
            const lastVmstat = diagnosticData.vmstat[diagnosticData.vmstat.length - 1];
            const idlePercent = lastVmstat[VMSTAT_INDICES.cpu.id] || 0;
            const usagePercent = 100 - idlePercent;
            
            cpuStatus = utils.getStatus(usagePercent, STATUS_THRESHOLDS.cpu);

            cpuText = `${idlePercent}% idle`;
        }

        // CPU Model из cpuinfo
        let cpuModelText = 'Нет данных';
        if (diagnosticData.cpuinfo && diagnosticData.cpuinfo.modelName) {
            cpuModelText = diagnosticData.cpuinfo.modelName;
        }

        // CPU Core из nproc
        let cpuCoreText = 'Нет данных';
        if (diagnosticData.nproc && diagnosticData.nproc.cores) {
            cpuCoreText = `${diagnosticData.nproc.cores}`;
        }

        // Uptime OS из uptime
        let uptimeOSText = 'Нет данных';
        if (diagnosticData.uptime && diagnosticData.uptime.uptime) {
            uptimeOSText = diagnosticData.uptime.uptime;
        }

        // Load average из uptime (без градации цвета)
        let loadAverageText = 'Нет данных';
        if (diagnosticData.uptime && diagnosticData.uptime.loadAverage) {
            const la = diagnosticData.uptime.loadAverage;
            loadAverageText = `${la['1min']}, ${la['5min']}, ${la['15min']}`;
        }

        // OS Info
        let osText = 'Неизвестно';
        if (diagnosticData.osInfo) {
            osText = diagnosticData.osInfo.PRETTY_NAME || diagnosticData.osInfo.NAME || 'Linux';
        }

        const metrics = [
            { label: 'OS', value: osText },
            { label: 'Uptime OS', value: uptimeOSText },
            { label: 'CPU Model', value: cpuModelText },
            { label: 'CPU Core', value: cpuCoreText },
            { label: 'Load average', value: loadAverageText },
            { label: 'Память', value: memoryText, status: memoryStatus },
            { label: 'Swap', value: swapText, status: swapStatus },
            { label: 'CPU', value: cpuText, status: cpuStatus }
        ];

        const card = CardCreator.createMetricCard('🖥️', 'Информация о сервере', metrics);
        dashboard.appendChild(card);
    }

    createZabbixInfoCard(dashboard, diagnosticData) {
        let metrics = [{ label: 'Статус', value: 'Нет данных' }];

        if (diagnosticData.zabbixStats && diagnosticData.zabbixStats.data) {
            const zbxData = diagnosticData.zabbixStats.data;
            
            // Форматируем uptime
            const uptimeSeconds = zbxData.uptime || 0;
            const uptimeText = utils.formatUptime(uptimeSeconds);

            // HA информация
            let haStatusText = 'Disabled';
            let masterNodeText = 'N/A';
            let standbyNodeText = 'N/A';

            if (zbxData.ha && Array.isArray(zbxData.ha) && zbxData.ha.length > 0) {
                haStatusText = 'Enabled';
                
                const masterNode = zbxData.ha.find(node => node.status === 3);
                const standbyNode = zbxData.ha.find(node => node.status === 0);
                
                if (masterNode) {
                    const lastAccessDate = new Date(masterNode.lastaccess * 1000);
                    const timeAgo = Math.floor((Date.now() - lastAccessDate.getTime()) / 1000);
                    masterNodeText = `${masterNode.address.split(':')[0]} (${timeAgo}s назад)`;
                }
                
                if (standbyNode) {
                    const lastAccessDate = new Date(standbyNode.lastaccess * 1000);
                    const timeAgo = Math.floor((Date.now() - lastAccessDate.getTime()) / 1000);
                    standbyNodeText = `${standbyNode.address.split(':')[0]} (${timeAgo}s назад)`;
                }
            }

            metrics = [
                { label: 'Версия', value: zbxData.version || 'N/A' },
                { label: 'Время работы', value: uptimeText },
                { label: 'HA Status', value: haStatusText, status: haStatusText === 'Enabled' ? 'good' : 'warning' },
                { label: 'Master Node', value: masterNodeText },
                { label: 'Standby Node', value: standbyNodeText },
                { label: 'Хосты', value: `${zbxData.hosts || 0}`, status: 'good' },
                { label: 'Метрики', value: `${zbxData.items || 0}`, status: 'good' },
                { label: 'Неподдерживаемые', value: `${zbxData.item_unsupported || 0}`, status: (zbxData.item_unsupported || 0) > 0 ? 'warning' : 'good' },
                { label: 'Требуемый VPS', value: `${(zbxData.requiredperformance || 0).toFixed(2)}` }
            ];

            // Убираем HA ноды если HA отключен
            if (haStatusText === 'Disabled') {
                metrics = metrics.filter(m => !['Master Node', 'Standby Node'].includes(m.label));
            }
        }

        const card = CardCreator.createMetricCard('📊', 'Информация о Zabbix', metrics);
        dashboard.appendChild(card);
    }

    createProblematicProcessesCard(dashboard, diagnosticData) {
        let metrics = [{ label: 'Статус', value: 'Все процессы в норме', status: 'good' }];

        if (diagnosticData.zabbixStats && diagnosticData.zabbixStats.data && diagnosticData.zabbixStats.data.process) {
            const processData = diagnosticData.zabbixStats.data.process;
            const problematicProcesses = [];

            Object.entries(processData).forEach(([name, data]) => {
                const busy = data.busy ? data.busy.avg : 0;
                if (busy > STATUS_THRESHOLDS.process.critical) {
                    problematicProcesses.push({ name, busy });
                }
            });

            if (problematicProcesses.length > 0) {
                metrics = [];
                problematicProcesses.forEach(process => {
                    metrics.push({
                        label: process.name,
                        value: `${process.busy.toFixed(2)}% загружен`,
                        status: 'critical'
                    });
                });

                if (problematicProcesses.length < 4) {
                    metrics.push({
                        label: 'Рекомендация',
                        value: 'Увеличить количество воркеров',
                        status: 'warning'
                    });
                }
            }
        }

        const card = CardCreator.createMetricCard('⚠️', 'Проблемные процессы Zabbix', metrics);
        dashboard.appendChild(card);
    }

    createProblematicCachesCard(dashboard, diagnosticData) {
        let metrics = [{ label: 'Статус', value: 'Все кэши в норме', status: 'good' }];

        if (diagnosticData.zabbixStats && diagnosticData.zabbixStats.data) {
            const zbxData = diagnosticData.zabbixStats.data;
            const problematicCaches = [];

            // Проверяем все кэши на pfree < critical threshold
            if (zbxData.wcache) {
                if (zbxData.wcache.history && zbxData.wcache.history.pfree < STATUS_THRESHOLDS.cacheFree.critical) {
                    problematicCaches.push({
                        name: 'Итории',
                        pfree: zbxData.wcache.history.pfree
                    });
                }
                if (zbxData.wcache.trend && zbxData.wcache.trend.pfree < STATUS_THRESHOLDS.cacheFree.critical) {
                    problematicCaches.push({
                        name: 'Трендов',
                        pfree: zbxData.wcache.trend.pfree
                    });
                }
            }

            if (zbxData.vcache && zbxData.vcache.buffer && zbxData.vcache.buffer.pfree < STATUS_THRESHOLDS.cacheFree.critical) {
                problematicCaches.push({
                    name: 'Значений',
                    pfree: zbxData.vcache.buffer.pfree
                });
            }

            if (zbxData.rcache && zbxData.rcache.pfree < STATUS_THRESHOLDS.cacheFree.critical) {
                problematicCaches.push({
                    name: 'Конфигурации',
                    pfree: zbxData.rcache.pfree
                });
            }

            if (problematicCaches.length > 0) {
                metrics = [];
                problematicCaches.forEach(cache => {
                    metrics.push({
                        label: `Кэш ${cache.name}`,
                        value: `${cache.pfree.toFixed(2)}% свободно`,
                        status: 'critical'
                    });
                });

                metrics.push({
                    label: 'Рекомендация',
                    value: 'Увеличить размер кэшей',
                    status: 'warning'
                });
            } else {
                // Показываем состояние основных кэшей если все в норме
                metrics = [];
                if (zbxData.wcache && zbxData.wcache.history) {
                    metrics.push({
                        label: 'Кэш истории',
                        value: `${zbxData.wcache.history.pfree.toFixed(2)}% свободно`,
                        status: 'good'
                    });
                }
                if (zbxData.vcache && zbxData.vcache.buffer) {
                    metrics.push({
                        label: 'Кэш значений',
                        value: `${zbxData.vcache.buffer.pfree.toFixed(2)}% свободно`,
                        status: 'good'
                    });
                }
                if (zbxData.wcache && zbxData.wcache.trend) {
                    metrics.push({
                        label: 'Кэш трендов',
                        value: `${zbxData.wcache.trend.pfree.toFixed(2)}% свободно`,
                        status: zbxData.wcache.trend.pfree > STATUS_THRESHOLDS.cacheFree.good ? 'good' : 'warning'
                    });
                }
            }
        }

        const card = CardCreator.createMetricCard('💾', 'Состояние кэшей Zabbix', metrics);
        dashboard.appendChild(card);
    }

    updatePerformancePage(diagnosticData) {
        // Метод оставлен для совместимости, логика перенесена в chartManager
    }

    updateDiagnosticsPage(diagnosticData) {
        // Проверяем наличие данных diaginfo
        if (!diagnosticData.diaginfo) {
            return;
        }

        // Настраиваем обработчики кликов для вкладок
        this.diaginfoTabs.setupDiaginfoTabs();

        // Создаем контент для каждой вкладки
        this.createDiaginfoTabContent(diagnosticData.diaginfo);

        // Показываем первую активную вкладку
        this.diaginfoTabs.showDiaginfoTab('history');
    }

    updateVmstatPage(diagnosticData) {
        // Страница Vmstat обновляется через графики в chartManager.createVmstatCharts()
        // Никаких дополнительных элементов интерфейса не требуется
        console.log('Vmstat страница обновлена через графики');
    }

    createDiaginfoTabContent(diaginfoData) {
        const container = document.getElementById('diaginfoTabContent');
        if (!container) return;

        container.innerHTML = '';

        // Создаем контент для каждой вкладки
        const tabs = {
            history: this.diaginfoTabs.createHistoryCacheTab(diaginfoData),
            value: this.diaginfoTabs.createValueCacheTab(diaginfoData),
            preprocessing: this.diaginfoTabs.createPreprocessingTab(diaginfoData),
            lld: this.diaginfoTabs.createLLDTab(diaginfoData),
            alerting: this.diaginfoTabs.createAlertingTab(diaginfoData),
            locks: this.diaginfoTabs.createLocksTab(diaginfoData)
        };

        // Добавляем каждую вкладку в контейнер
        Object.entries(tabs).forEach(([tabId, content]) => {
            const tabDiv = document.createElement('div');
            tabDiv.id = `tab-${tabId}`;
            tabDiv.className = 'tab-content';
            tabDiv.innerHTML = content;
            container.appendChild(tabDiv);
        });
    }


    updateCollectionDateTime(diagnosticData) {
        const collectionInfo = document.getElementById('collectionInfo');
        const collectionDateTime = document.getElementById('collectionDateTime');
        
        if (!collectionInfo || !collectionDateTime) return;

        // Проверяем наличие данных о времени завершения сбора
        if (diagnosticData.final && diagnosticData.final.collectionEndTime) {
            const endTime = diagnosticData.final.collectionEndTime;
            
            // Форматируем дату и время для отображения
            const formattedDateTime = endTime.toLocaleString('ru-RU', {
                year: 'numeric',
                month: '2-digit', 
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            
            collectionDateTime.textContent = formattedDateTime;
            collectionInfo.style.display = 'block';
        } else {
            // Скрываем блок если нет информации о времени сбора
            collectionInfo.style.display = 'none';
        }
    }
}