"""
Константы и настройки для Zabbix Inspector
"""

# Версия скрипта
VERSION = "20250809"

# Директории и пути
DEFAULT_OUTPUT_DIR = "/tmp/zabbix-diag"

# Сетевые настройки
DEFAULT_ZABBIX_PORT = 10051

# Таймауты (в секундах)
DEFAULT_TIMEOUT = 30
STATS_TIMEOUT = 60
PS_TIMEOUT = 10
DIAGINFO_TIMEOUT = 60
VMSTAT_TIMEOUT = 35

# Чувствительные параметры конфигурации Zabbix, которые нужно исключить
SENSITIVE_CONFIG_PARAMS = {
    'DBUser', 'DBPassword', 'DBName', 'DBHost', 'StatsAllowedIP',
    'VaultURL', 'VaultToken'
}

# Database retry configuration
DB_RETRY_ATTEMPTS = 3
DB_RETRY_DELAY_SECONDS = 60
DB_CONNECTION_TIMEOUT = 30
DB_QUERY_TIMEOUT = 300

# Команды для сбора системной информации
VMSTAT_COMMAND = "vmstat 1 30"