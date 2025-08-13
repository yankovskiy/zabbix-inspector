import { CHART_COLORS, VMSTAT_INDICES } from '../config/constants.js';

export class ChartManager {
    constructor() {
        this.charts = {};
    }

    createCharts() {
        // Создаем пустые графики при инициализации
        this.setupEmptyCharts();
    }

    setupEmptyCharts() {
        // Пустые графики будут созданы когда есть данные
        console.log('Chart manager initialized');
    }

    updateCharts(diagnosticData) {
        // Очистить старые графики
        this.destroyCharts();

        // График использования CPU
        this.createCpuChart(diagnosticData);

        // График потребления памяти
        if (typeof this.createMemoryChart === 'function') {
            this.createMemoryChart(diagnosticData);
        } else {
            console.error('createMemoryChart method is not available');
        }

        // График процессов
        this.createProcessChart(diagnosticData);

        // График кэшей
        this.createCacheChart(diagnosticData);
    }

    createCpuChart(diagnosticData) {
        if (diagnosticData.vmstat && diagnosticData.vmstat.length > 0) {
            const lastVmstat = diagnosticData.vmstat[diagnosticData.vmstat.length - 1];
            const cpuCtx = document.getElementById('cpuChart');
            
            if (cpuCtx && lastVmstat.length >= 17) {
                // Извлекаем данные CPU из vmstat (индексы из constants.js)
                const user = lastVmstat[VMSTAT_INDICES.cpu.us] || 0;      // us - user time
                const system = lastVmstat[VMSTAT_INDICES.cpu.sy] || 0;    // sy - system time  
                const idle = lastVmstat[VMSTAT_INDICES.cpu.id] || 0;      // id - idle time
                const wait = lastVmstat[VMSTAT_INDICES.cpu.wa] || 0;      // wa - wait time
                const stolen = lastVmstat[VMSTAT_INDICES.cpu.st] || 0;    // st - stolen time (virtualization)
                
                // Вычисляем "other" как остаток до 100%
                const total = user + system + idle + wait + stolen;
                const other = total < 100 ? 100 - total : 0;

                this.charts.cpu = new Chart(cpuCtx, {
                    type: 'pie',
                    data: {
                        labels: ['User', 'System', 'Idle', 'Wait', 'Other'],
                        datasets: [{
                            data: [user, system, idle, wait, other],
                            backgroundColor: [
                                '#4dabf7',  // User - синий
                                '#ff6b6b',  // System - красный  
                                '#51cf66',  // Idle - зеленый
                                '#ffd43b',  // Wait - желтый
                                '#adb5bd'   // Other - серый
                            ],
                            borderColor: CHART_COLORS.background,
                            borderWidth: 2,
                            hoverOffset: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    color: CHART_COLORS.text,
                                    padding: 12,
                                    usePointStyle: true,
                                    font: {
                                        size: 11
                                    }
                                }
                            },
                            tooltip: {
                                backgroundColor: CHART_COLORS.tooltipBg,
                                titleColor: CHART_COLORS.text,
                                bodyColor: CHART_COLORS.text,
                                borderColor: CHART_COLORS.border,
                                borderWidth: 1,
                                callbacks: {
                                    label: function (context) {
                                        return context.label + ': ' + context.parsed.toFixed(1) + '%';
                                    }
                                }
                            }
                        }
                    }
                });
            }
        }
    }

    createMemoryChart(diagnosticData) {
        if (diagnosticData.memory) {
            const memoryCtx = document.getElementById('memoryChart');
            
            if (memoryCtx) {
                // Функция для конвертации байтов в мегабайты для отображения
                const bytesToMB = (bytes) => {
                    return bytes / (1024 * 1024);
                };

                // Данные приходят в байтах из free -b, конвертируем в MB для отображения
                const total = bytesToMB(diagnosticData.memory.total);
                const used = bytesToMB(diagnosticData.memory.used); 
                const free = bytesToMB(diagnosticData.memory.free);
                const shared = bytesToMB(diagnosticData.memory.shared);
                const buffCache = bytesToMB(diagnosticData.memory.buffCache);

                // В free показывается: used уже без buff/cache, они отдельно
                // Показываем все компоненты памяти
                
                this.charts.memory = new Chart(memoryCtx, {
                    type: 'pie',
                    data: {
                        labels: ['Used', 'Cache/Buffer', 'Shared', 'Free'],
                        datasets: [{
                            data: [used, buffCache, shared, free],
                            backgroundColor: [
                                '#ff6b6b',  // Used - красный
                                '#4dabf7',  // Cache/Buffer - синий
                                '#ffd43b',  // Shared - желтый  
                                '#51cf66'   // Free - зеленый
                            ],
                            borderColor: CHART_COLORS.background,
                            borderWidth: 2,
                            hoverOffset: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    color: CHART_COLORS.text,
                                    padding: 12,
                                    usePointStyle: true,
                                    font: {
                                        size: 11
                                    }
                                }
                            },
                            tooltip: {
                                backgroundColor: CHART_COLORS.tooltipBg,
                                titleColor: CHART_COLORS.text,
                                bodyColor: CHART_COLORS.text,
                                borderColor: CHART_COLORS.border,
                                borderWidth: 1,
                                callbacks: {
                                    label: function (context) {
                                        const value = context.parsed;
                                        const percentage = ((value / total) * 100).toFixed(1);
                                        const sizeStr = value >= 1024 
                                            ? (value / 1024).toFixed(1) + ' GB'
                                            : value.toFixed(0) + ' MB';
                                        
                                        return context.label + ': ' + sizeStr + ' (' + percentage + '%)';
                                    }
                                }
                            }
                        }
                    }
                });
            }
        }
    }

    createProcessChart(diagnosticData) {
        if (diagnosticData.zabbixStats && diagnosticData.zabbixStats.data && diagnosticData.zabbixStats.data.process) {
            const processData = diagnosticData.zabbixStats.data.process;
            
            // Создаем массив процессов с их загрузкой и сортируем по убыванию
            const processEntries = Object.entries(processData)
                .map(([name, data]) => ({
                    name: name,
                    busy: data.busy?.avg || 0
                }))
                .filter(process => process.busy > 0) // Показываем только активные процессы
                .sort((a, b) => b.busy - a.busy) // Сортируем по убыванию загрузки
                .slice(0, 10); // Берем топ 10 самых загруженных

            const processNames = processEntries.map(entry => entry.name);
            const busyData = processEntries.map(entry => entry.busy);

            // Создаем массив цветов для каждого процесса
            const processColors = processNames.map((name, index) => {
                return CHART_COLORS.barColors[index % CHART_COLORS.barColors.length];
            });

            const processCtx = document.getElementById('processChart');
            if (processCtx) {
                this.charts.process = new Chart(processCtx, {
                    type: 'bar',
                    data: {
                        labels: processNames,
                        datasets: [{
                            label: 'Загрузка (%)',
                            data: busyData,
                            backgroundColor: processColors,
                            borderColor: CHART_COLORS.background,
                            borderWidth: 1,
                            borderRadius: 4,
                            borderSkipped: false
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        indexAxis: 'y',
                        plugins: {
                            legend: {
                                display: false
                            },
                            tooltip: {
                                backgroundColor: CHART_COLORS.tooltipBg,
                                titleColor: CHART_COLORS.text,
                                bodyColor: CHART_COLORS.text,
                                borderColor: CHART_COLORS.border,
                                borderWidth: 1,
                                callbacks: {
                                    label: function (context) {
                                        return context.dataset.label + ': ' + context.parsed.x.toFixed(2) + '%';
                                    }
                                }
                            }
                        },
                        scales: {
                            x: {
                                beginAtZero: true,
                                max: 100,
                                ticks: {
                                    color: CHART_COLORS.text,
                                    font: {
                                        size: 11
                                    },
                                    callback: function (value) {
                                        return value + '%';
                                    }
                                },
                                grid: {
                                    color: CHART_COLORS.grid,
                                    drawBorder: false
                                },
                                title: {
                                    display: true,
                                    text: 'Процент утилизации',
                                    color: CHART_COLORS.text,
                                    font: {
                                        size: 12
                                    }
                                }
                            },
                            y: {
                                ticks: {
                                    color: CHART_COLORS.text,
                                    font: {
                                        size: 11
                                    },
                                    maxRotation: 0,
                                    minRotation: 0
                                },
                                grid: {
                                    display: false
                                }
                            }
                        }
                    }
                });
            }
        }
    }

    createCacheChart(diagnosticData) {
        if (diagnosticData.zabbixStats && diagnosticData.zabbixStats.data) {
            const data = diagnosticData.zabbixStats.data;
            const cacheCtx = document.getElementById('cacheChart');

            if (cacheCtx) {
                // Собираем данные по всем типам кэшей
                const cacheEntries = [];

                // Кэш значений
                if (data.vcache?.buffer?.pused !== undefined) {
                    cacheEntries.push({
                        label: 'Кэш значений',
                        value: data.vcache.buffer.pused,
                        color: '#4dabf7'
                    });
                }

                // Кэш конфигураций
                if (data.rcache?.pused !== undefined) {
                    cacheEntries.push({
                        label: 'Кэш конфигураций',
                        value: data.rcache.pused,
                        color: '#ff6b6b'
                    });
                }

                // Кэш истории
                if (data.wcache?.history?.pused !== undefined) {
                    cacheEntries.push({
                        label: 'Кэш истории',
                        value: data.wcache.history.pused,
                        color: '#51cf66'
                    });
                }

                // Кэш индексов
                if (data.wcache?.index?.pused !== undefined) {
                    cacheEntries.push({
                        label: 'Кэш индексов',
                        value: data.wcache.index.pused,
                        color: '#ffd43b'
                    });
                }

                // Кэш трендов
                if (data.wcache?.trend?.pused !== undefined) {
                    cacheEntries.push({
                        label: 'Кэш трендов',
                        value: data.wcache.trend.pused,
                        color: '#845ef7'
                    });
                }

                // Сортируем по убыванию утилизации
                cacheEntries.sort((a, b) => b.value - a.value);

                const cacheLabels = cacheEntries.map(entry => entry.label);
                const cacheData = cacheEntries.map(entry => entry.value);
                const cacheColors = cacheEntries.map(entry => entry.color);

                if (cacheData.length > 0) {
                    this.charts.cache = new Chart(cacheCtx, {
                        type: 'bar',
                        data: {
                            labels: cacheLabels,
                            datasets: [{
                                label: 'Утилизация (%)',
                                data: cacheData,
                                backgroundColor: cacheColors,
                                borderColor: CHART_COLORS.background,
                                borderWidth: 1,
                                borderRadius: 4,
                                borderSkipped: false
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            indexAxis: 'y',  // Делает диаграмму горизонтальной
                            plugins: {
                                legend: {
                                    display: false  // Убираем легенду для горизонтальной диаграммы
                                },
                                tooltip: {
                                    backgroundColor: CHART_COLORS.tooltipBg,
                                    titleColor: CHART_COLORS.text,
                                    bodyColor: CHART_COLORS.text,
                                    borderColor: CHART_COLORS.border,
                                    borderWidth: 1,
                                    callbacks: {
                                        label: function (context) {
                                            return context.dataset.label + ': ' + context.parsed.x.toFixed(2) + '%';
                                        }
                                    }
                                }
                            },
                            scales: {
                                x: {
                                    beginAtZero: true,
                                    max: 100,  // Максимум 100%
                                    ticks: {
                                        color: CHART_COLORS.text,
                                        font: {
                                            size: 11
                                        },
                                        callback: function (value) {
                                            return value + '%';
                                        }
                                    },
                                    grid: {
                                        color: CHART_COLORS.grid,
                                        drawBorder: false
                                    },
                                    title: {
                                        display: true,
                                        text: 'Процент утилизации',
                                        color: CHART_COLORS.text,
                                        font: {
                                            size: 12
                                        }
                                    }
                                },
                                y: {
                                    ticks: {
                                        color: CHART_COLORS.text,
                                        font: {
                                            size: 11
                                        }
                                    },
                                    grid: {
                                        display: false  // Убираем горизонтальные линии сетки
                                    }
                                }
                            }
                        }
                    });
                }
            }
        }
    }

    createVmstatCharts(diagnosticData) {
        if (!diagnosticData.vmstat || diagnosticData.vmstat.length === 0) return;

        const data = diagnosticData.vmstat;
        const labels = data.map((_, index) => index + 1);

        // Базовая конфигурация для всех графиков vmstat
        const chartConfig = {
            type: 'line',
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: CHART_COLORS.text,
                            padding: 12,
                            usePointStyle: true,
                            font: {
                                size: 11
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: CHART_COLORS.tooltipBg,
                        titleColor: CHART_COLORS.text,
                        bodyColor: CHART_COLORS.text,
                        borderColor: CHART_COLORS.border,
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Время (интервалы)',
                            color: CHART_COLORS.text
                        },
                        ticks: {
                            color: CHART_COLORS.text,
                            maxRotation: 0,
                            minRotation: 0
                        },
                        grid: {
                            color: CHART_COLORS.grid
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: CHART_COLORS.text
                        },
                        grid: {
                            color: CHART_COLORS.grid
                        }
                    }
                },
                elements: {
                    line: {
                        tension: 0.3
                    },
                    point: {
                        radius: 2
                    }
                }
            }
        };

        // График CPU
        const vmstatCpuCtx = document.getElementById('vmstatCpuChart');
        if (vmstatCpuCtx) {
            this.charts.vmstatCpu = new Chart(vmstatCpuCtx, {
                ...chartConfig,
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'User %',
                            data: data.map(row => row[VMSTAT_INDICES.cpu.us] || 0),
                            borderColor: '#3498db',
                            backgroundColor: 'rgba(52, 152, 219, 0.1)',
                            fill: true
                        },
                        {
                            label: 'System %',
                            data: data.map(row => row[VMSTAT_INDICES.cpu.sy] || 0),
                            borderColor: '#e74c3c',
                            backgroundColor: 'rgba(231, 76, 60, 0.1)',
                            fill: true
                        },
                        {
                            label: 'Idle %',
                            data: data.map(row => row[VMSTAT_INDICES.cpu.id] || 0),
                            borderColor: '#2ecc71',
                            backgroundColor: 'rgba(46, 204, 113, 0.1)',
                            fill: true
                        },
                        {
                            label: 'Stolen %',
                            data: data.map(row => row[VMSTAT_INDICES.cpu.st] || 0),
                            borderColor: '#9b59b6',
                            backgroundColor: 'rgba(155, 89, 182, 0.1)',
                            fill: true
                        }
                    ]
                }
            });
        }

        // График памяти
        const vmstatMemoryCtx = document.getElementById('vmstatMemoryChart');
        if (vmstatMemoryCtx) {
            this.charts.vmstatMemory = new Chart(vmstatMemoryCtx, {
                ...chartConfig,
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Free (MB)',
                            data: data.map(row => Math.round((row[VMSTAT_INDICES.memory.free] || 0) / 1024)),
                            borderColor: '#9b59b6',
                            backgroundColor: 'rgba(155, 89, 182, 0.1)',
                            fill: true
                        },
                        {
                            label: 'Buffer (MB)',
                            data: data.map(row => Math.round((row[VMSTAT_INDICES.memory.buff] || 0) / 1024)),
                            borderColor: '#f39c12',
                            backgroundColor: 'rgba(243, 156, 18, 0.1)',
                            fill: true
                        },
                        {
                            label: 'Cache (MB)',
                            data: data.map(row => Math.round((row[VMSTAT_INDICES.memory.cache] || 0) / 1024)),
                            borderColor: '#1abc9c',
                            backgroundColor: 'rgba(26, 188, 156, 0.1)',
                            fill: true
                        }
                    ]
                }
            });
        }

        // График I/O
        const vmstatIoCtx = document.getElementById('vmstatIoChart');
        if (vmstatIoCtx) {
            this.charts.vmstatIo = new Chart(vmstatIoCtx, {
                ...chartConfig,
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Blocks In',
                            data: data.map(row => row[VMSTAT_INDICES.io.bi] || 0),
                            borderColor: '#3498db',
                            backgroundColor: 'rgba(52, 152, 219, 0.1)',
                            fill: true
                        },
                        {
                            label: 'Blocks Out',
                            data: data.map(row => row[VMSTAT_INDICES.io.bo] || 0),
                            borderColor: '#e74c3c',
                            backgroundColor: 'rgba(231, 76, 60, 0.1)',
                            fill: true
                        }
                    ]
                }
            });
        }

        // График системной активности
        const vmstatSystemCtx = document.getElementById('vmstatSystemChart');
        if (vmstatSystemCtx) {
            this.charts.vmstatSystem = new Chart(vmstatSystemCtx, {
                ...chartConfig,
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Interrupts',
                            data: data.map(row => row[VMSTAT_INDICES.system.in] || 0),
                            borderColor: '#9b59b6',
                            backgroundColor: 'rgba(155, 89, 182, 0.1)',
                            fill: true
                        },
                        {
                            label: 'Context Switches',
                            data: data.map(row => row[VMSTAT_INDICES.system.cs] || 0),
                            borderColor: '#f39c12',
                            backgroundColor: 'rgba(243, 156, 18, 0.1)',
                            fill: true
                        }
                    ]
                }
            });
        }
    }

    destroyCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.charts = {};
    }
}