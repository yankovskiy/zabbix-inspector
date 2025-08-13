import { FILE_PATTERNS, REGEX_PATTERNS } from '../config/constants.js';

export class DataParser {
    constructor() {
        this.filePatterns = FILE_PATTERNS;
    }

    async processZipFiles(zip) {
        const diagnosticData = {};

        for (const [fileName, file] of Object.entries(zip.files)) {
            if (file.dir) continue;

            const content = await file.async('text');

            // Определяем тип файла и парсим соответствующим методом
            if (fileName.includes(this.filePatterns.vmstat)) {
                diagnosticData.vmstat = this.parseVmstat(content);
            } else if (fileName.includes(this.filePatterns.diaginfo)) {
                diagnosticData.diaginfo = this.parseDiaginfo(content);
            } else if (fileName.includes(this.filePatterns.zabbixStats)) {
                diagnosticData.zabbixStats = this.parseZabbixStats(content);
            } else if (fileName.includes(this.filePatterns.processes)) {
                diagnosticData.processes = this.parseProcesses(content);
            } else if (fileName.includes(this.filePatterns.memory)) {
                diagnosticData.memory = this.parseMemory(content);
            } else if (fileName.includes(this.filePatterns.config)) {
                diagnosticData.config = this.parseConfig(content);
            } else if (fileName.includes(this.filePatterns.osInfo)) {
                diagnosticData.osInfo = this.parseOsRelease(content);
            } else if (fileName.includes(this.filePatterns.cpuinfo)) {
                diagnosticData.cpuinfo = this.parseCpuinfo(content);
            } else if (fileName.includes(this.filePatterns.uptime)) {
                diagnosticData.uptime = this.parseUptime(content);
            } else if (fileName.includes(this.filePatterns.nproc)) {
                diagnosticData.nproc = this.parseNproc(content);
            } else if (fileName.includes(this.filePatterns.final)) {
                diagnosticData.final = this.parseFinal(content);
            }
        }

        return diagnosticData;
    }

    parseVmstat(content) {
        const lines = content.split('\n');
        const data = [];

        for (const line of lines) {
            if (/^\s*\d/.test(line.trim())) {
                const values = line.trim().split(/\s+/).map(val => {
                    const num = parseInt(val, 10);
                    return isNaN(num) ? 0 : num;
                });

                if (values.length >= 16) {
                    data.push(values);
                }
            }
        }

        return data;
    }

    parseDiaginfo(content) {
        const sections = {};
        const lines = content.split('\n');
        let currentSection = null;

        for (const line of lines) {
            if (line.includes('== ') && line.includes(' ==')) {
                currentSection = line.replace(/=+/g, '').trim();
                // Пропускаем секцию STDOUT
                if (currentSection === 'STDOUT' || currentSection.trim() === 'STDOUT') {
                    currentSection = null;
                    continue;
                }
                sections[currentSection] = [];
            } else if (currentSection && line.trim()) {
                sections[currentSection].push(line.trim());
            }
        }

        return sections;
    }

    parseZabbixStats(content) {
        try {
            // Извлечь JSON из строки
            const jsonMatch = content.match(/\{.*\}/s);
            if (jsonMatch) {
                let jsonStr = jsonMatch[0];

                // Заменить одинарные кавычки на двойные для валидного JSON
                jsonStr = jsonStr.replace(/'/g, '"');

                // Заменяем True/False на true/false для JavaScript
                jsonStr = jsonStr.replace(/True/g, 'true');
                jsonStr = jsonStr.replace(/False/g, 'false');
                jsonStr = jsonStr.replace(/None/g, 'null');

                return JSON.parse(jsonStr);
            }
        } catch (e) {
            console.error('Ошибка парсинга Zabbix stats:', e);
            return this.parseZabbixStatsAlternative(content);
        }
        return null;
    }

    parseZabbixStatsAlternative(content) {
        // Альтернативный парсер для случаев, когда JSON невалиден
        const stats = {};

        // Извлекаем основные метрики регулярными выражениями
        const patterns = REGEX_PATTERNS.zabbixStats;

        Object.entries(patterns).forEach(([key, pattern]) => {
            const match = content.match(pattern);
            if (match) {
                if (key === 'version') {
                    stats[key] = match[1];
                } else {
                    stats[key] = parseFloat(match[1]) || 0;
                }
            }
        });

        return {data: stats};
    }

    parseProcesses(content) {
        const lines = content.split('\n');
        const processes = [];

        for (const line of lines) {
            if (line.includes('zabbix_server') && !line.includes('grep') && line.trim()) {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 11) {
                    const command = parts.slice(10).join(' ');
                    
                    // Извлекаем тип процесса из команды динамически
                    let processType = '';
                    
                    // Ищем паттерн: /path/to/zabbix_server: процесс_тип
                    const typeMatch = command.match(/\S*zabbix_server:\s*([^#\[\]]+)/);
                    if (typeMatch) {
                        processType = typeMatch[1].trim();
                    } else {
                        // Проверяем, есть ли конфигурационный файл (основной процесс)
                        const configMatch = command.match(/\S*zabbix_server\s+-c\s+/);
                        if (configMatch) {
                            processType = 'main server';
                        } else if (command.includes('zabbix_server')) {
                            // Если это просто zabbix_server без дополнительной информации
                            processType = 'unknown';
                        }
                    }

                    processes.push({
                        user: parts[0],
                        pid: parseInt(parts[1], 10),
                        cpu: parseFloat(parts[2]),
                        mem: parseFloat(parts[3]),
                        vsz: parseInt(parts[4], 10),
                        rss: parseInt(parts[5], 10),
                        tty: parts[6],
                        stat: parts[7],
                        start: parts[8],
                        time: parts[9],
                        command: command,
                        processType: processType
                    });
                }
            }
        }

        return processes;
    }

    parseMemory(content) {
        const lines = content.split('\n');
        const memory = {};

        for (const line of lines) {
            if (line.includes('Mem:')) {
                const parts = line.split(/\s+/);
                // Данные из free -b приходят в байтах, сохраняем как числа
                memory.total = parseInt(parts[1]) || 0;
                memory.used = parseInt(parts[2]) || 0;
                memory.free = parseInt(parts[3]) || 0;
                memory.shared = parseInt(parts[4]) || 0;
                memory.buffCache = parseInt(parts[5]) || 0;
                memory.available = parseInt(parts[6]) || 0;
            } else if (line.includes('Swap:')) {
                const parts = line.split(/\s+/);
                // Swap также в байтах
                memory.swapTotal = parseInt(parts[1]) || 0;
                memory.swapUsed = parseInt(parts[2]) || 0;
                memory.swapFree = parseInt(parts[3]) || 0;
            }
        }

        return memory;
    }

    parseConfig(content) {
        const lines = content.split('\n');
        const config = {};

        for (const line of lines) {
            if (line.includes('=') && !line.startsWith('#')) {
                const [key, value] = line.split('=', 2);
                if (key && value) {
                    config[key.trim()] = value.trim();
                }
            }
        }

        return config;
    }

    parseOsRelease(content) {
        const lines = content.split('\n');
        const osInfo = {};

        for (const line of lines) {
            if (line.includes('=') && !line.startsWith('#')) {
                const [key, value] = line.split('=', 2);
                if (key && value) {
                    osInfo[key.trim()] = value.trim().replace(/"/g, '');
                }
            }
        }

        return osInfo;
    }

    parseCpuinfo(content) {
        const lines = content.split('\n');
        const cpuInfo = {};

        for (const line of lines) {
            if (line.includes('model name') && line.includes(':')) {
                const [, value] = line.split(':', 2);
                cpuInfo.modelName = value.trim();
                break; // Берем первый встреченный
            }
        }

        return cpuInfo;
    }

    parseUptime(content) {
        const lines = content.split('\n');
        const uptimeInfo = {};

        for (const line of lines) {
            if (line.trim()) {
                // Парсим строку вида: " 15:32:51 up 123 days, 4:56, 1 user, load average: 0.25, 0.30, 0.35"
                const loadMatch = line.match(/load average:\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)/);
                if (loadMatch) {
                    uptimeInfo.loadAverage = {
                        '1min': parseFloat(loadMatch[1]),
                        '5min': parseFloat(loadMatch[2]),
                        '15min': parseFloat(loadMatch[3])
                    };

                    // Извлекаем время работы системы
                    const uptimeMatch = line.match(/up\s+(.+?),\s+\d+\s+user/);
                    if (uptimeMatch) {
                        uptimeInfo.uptime = uptimeMatch[1].trim();
                    }
                    break;
                }
            }
        }

        return uptimeInfo;
    }

    parseNproc(content) {
        const lines = content.split('\n');
        const nprocInfo = {};

        for (const line of lines) {
            if (line.trim() && /^\d+$/.test(line.trim())) {
                nprocInfo.cores = parseInt(line.trim(), 10);
                break; // Берем первое число
            }
        }

        return nprocInfo;
    }

    parseFinal(content) {
        const lines = content.split('\n');
        const finalInfo = {};

        for (const line of lines) {
            if (line.trim() && !line.startsWith('#')) {
                // Парсим ISO datetime строку
                try {
                    finalInfo.collectionEndTime = new Date(line.trim());
                    finalInfo.collectionEndTimeISO = line.trim();
                    break; // Берем первую валидную строку времени
                } catch (e) {
                    console.warn('Не удалось распарсить дату:', line);
                }
            }
        }

        return finalInfo;
    }
}