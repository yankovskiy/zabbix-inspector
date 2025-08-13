// Цвета для графиков
export const CHART_COLORS = {
    text: '#f8f9fa',
    grid: 'rgba(248, 249, 250, 0.1)',
    background: '#2c3e50',
    border: '#495057',
    tooltipBg: '#343a40',
    barColors: [
        '#4dabf7',
        '#51cf66',
        '#ff6b6b',
        '#ffd43b',
        '#845ef7',
        '#1abc9c',
        '#f39c12',
        '#e67e22',
        '#9b59b6',
        '#34495e',
        '#16a085',
        '#27ae60',
        '#2980b9',
        '#8e44ad',
        '#2c3e50',
        '#f1c40f',
        '#e74c3c',
        '#95a5a6',
        '#3498db',
        '#1f8b4c',
        '#607d8b',
        '#ff5722',
        '#795548',
        '#9c27b0',
        '#673ab7'
    ],
    pieColors: [
        '#51cf66',
        '#ff6b6b',
        '#4dabf7',
        '#ffd43b'
    ]
};

// Пороги для статусов
export const STATUS_THRESHOLDS = {
    memory: {
        warning: 70,
        critical: 90
    },
    swap: {
        warning: 5,
        critical: 30
    },
    cpu: {
        warning: 60, // (100 - 40) idle
        critical: 80  // (100 - 20) idle
    },
    cache: {
        warning: 70,
        critical: 30
    },
    process: {
        warning: 5,
        critical: 50
    },
    cacheFree: {
        critical: 30,  // Минимальный процент свободного места в кэше
        good: 70       // Хороший уровень свободного места в кэше
    }
};

// Паттерны файлов для парсинга
export const FILE_PATTERNS = {
    vmstat: 'vmstat',
    diaginfo: 'diaginfo',
    zabbixStats: 'zabbix_stats',
    processes: 'ps_aux',
    memory: 'free',
    config: 'zabbix_config',
    osInfo: 'os_release',
    cpuinfo: 'cpuinfo',
    uptime: 'uptime',
    nproc: 'nproc',
    final: 'final'
};

// URL Zabbix по умолчанию
export const DEFAULT_ZABBIX_URL = 'http://zabbix.local/zabbix';

// Конфигурация приложения
export const APP_CONFIG = {
    name: 'Zabbix Inspector',
    version: '0.1-beta',
    supportedFormats: ['.zip'],
    maxFileSize: 50 * 1024 * 1024, // 50MB
    animationDelay: 30,
    chartHeight: 350,
    minDiagCollectorVersion: 20250809, // Минимальная версия сборщика диагностических данных
    author: 'Артем Янковский',
    githubUrl: 'https://github.com/yankovskiy/zabbix-inspector'
};

// Сообщения для пользователя
export const MESSAGES = {
    errors: {
        fileFormat: 'Поддерживаются только ZIP архивы',
        fileSize: 'Размер файла превышает допустимый лимит',
        parsing: 'Ошибка при обработке файла',
        upload: 'Ошибка при загрузке файла',
        versionTooOld: 'Версия сборщика диагностических данных слишком старая. Требуется версия не ниже'
    },
    success: {
        upload: 'Файл успешно загружен и обработан',
        processing: 'Обработка архива...'
    },
    info: {
        noData: 'Нет данных',
        loading: 'Загрузите диагностические данные',
        allGood: 'Все системы в норме'
    }
};

// Регулярные выражения для парсинга
export const REGEX_PATTERNS = {
    vmstat: /^\s*\d/,
    memory: /([\d.]+)([KMGT]?i)/,
    zabbixStats: {
        hosts: /"hosts":\s*(\d+)/,
        items: /"items":\s*(\d+)/,
        triggers: /"triggers":\s*(\d+)/,
        version: /"version":\s*"([^"]+)"/,
        requiredperformance: /"requiredperformance":\s*([\d.]+)/,
        item_unsupported: /"item_unsupported":\s*(\d+)/,
        preprocessing_queue: /"preprocessing_queue":\s*(\d+)/,
        lld_queue: /"lld_queue":\s*(\d+)/
    },
    diaginfo: {
        section: /== (.+) ==/
    }
};

// Индексы данных vmstat
export const VMSTAT_INDICES = {
    procs: {
        running: 0,
        blocked: 1
    },
    memory: {
        swpd: 2,
        free: 3,
        buff: 4,
        cache: 5
    },
    swap: {
        si: 6,
        so: 7
    },
    io: {
        bi: 8,
        bo: 9
    },
    system: {
        in: 10,
        cs: 11
    },
    cpu: {
        us: 12,
        sy: 13,
        id: 14,
        wa: 15,
        st: 16
    }
};

// Задержки анимации (в миллисекундах)
export const ANIMATION_DELAYS = {
    metrics: 500,      // Задержка для анимации метрик при инициализации
    navigation: 150    // Задержка для анимации при переключении страниц
};

// Единицы измерения
export const UNITS = {
    memory: {
        multipliers: {
            'Gi': 1024,
            'Mi': 1,
            'Ki': 1/1024,
            'Ti': 1024 * 1024
        }
    },
    time: {
        second: 1,
        minute: 60,
        hour: 3600,
        day: 86400
    }
};