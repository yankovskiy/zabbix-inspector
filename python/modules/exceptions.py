"""
Кастомные исключения для Zabbix Inspector
"""


class ZabbixDiagnosticError(Exception):
    """Базовое исключение для ошибок диагностики Zabbix"""
    pass


class CommandExecutionError(ZabbixDiagnosticError):
    """Исключение для ошибок выполнения системных команд"""
    pass


class ConfigurationError(ZabbixDiagnosticError):
    """Исключение для ошибок конфигурации Zabbix"""
    pass


class NetworkError(ZabbixDiagnosticError):
    """Исключение для сетевых ошибок при взаимодействии с Zabbix"""
    pass