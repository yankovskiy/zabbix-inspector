"""
Модуль для сбора системной информации
"""

import functools

from .constants import VMSTAT_COMMAND, VMSTAT_TIMEOUT, DEFAULT_TIMEOUT
from .command_runner import CommandRunner
from .exceptions import CommandExecutionError
from .logging_manager import get_logger


def safe_collector(func):
    """
    Декоратор для безопасного выполнения коллекторов с единообразной обработкой ошибок
    
    При ошибке CommandExecutionError возвращает (False, "")
    Все остальные исключения пробрасываются дальше
    """
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except CommandExecutionError:
            return False, ""
    return wrapper


class SystemCollectors:
    """Класс для сбора различных системных метрик"""
    
    def __init__(self, command_runner: CommandRunner):
        """
        Инициализация SystemCollectors
        
        Args:
            command_runner: Экземпляр CommandRunner для выполнения команд
        """
        self.command_runner = command_runner
        self.logger = get_logger()
    
    @safe_collector
    def collect_processes(self):
        """
        Сбор информации о процессах Zabbix через ps aux
        
        Returns:
            tuple: (success: bool, stdout: str)
        """
        return self.command_runner.run_command(
            "ps aux | grep zabbix_server", 
            "ps_aux",
            timeout=DEFAULT_TIMEOUT
        )
    
    @safe_collector
    def collect_memory_info(self):
        """
        Сбор информации о памяти через free
        
        Returns:
            tuple: (success: bool, stdout: str)
        """
        return self.command_runner.run_command(
            "free -b", 
            "free",
            timeout=DEFAULT_TIMEOUT
        )
    
    @safe_collector
    def collect_vmstat(self):
        """
        Сбор статистики производительности системы через vmstat
        
        Returns:
            tuple: (success: bool, stdout: str)
        """
        return self.command_runner.run_command(
            VMSTAT_COMMAND, 
            "vmstat",
            timeout=VMSTAT_TIMEOUT
        )
    
    @safe_collector
    def collect_os_release(self):
        """
        Сбор информации о версии ОС
        
        Returns:
            tuple: (success: bool, stdout: str)
        """
        return self.command_runner.run_command(
            "cat /etc/os-release", 
            "os_release",
            timeout=DEFAULT_TIMEOUT
        )
    
    @safe_collector
    def collect_uptime(self):
        """
        Сбор информации о времени работы системы
        
        Returns:
            tuple: (success: bool, stdout: str)
        """
        return self.command_runner.run_command(
            "uptime", 
            "uptime",
            timeout=DEFAULT_TIMEOUT
        )
    
    @safe_collector
    def collect_nproc(self):
        """
        Сбор информации о количестве процессоров
        
        Returns:
            tuple: (success: bool, stdout: str)
        """
        return self.command_runner.run_command(
            "nproc", 
            "nproc",
            timeout=DEFAULT_TIMEOUT
        )
    
    @safe_collector
    def collect_cpu_info(self):
        """
        Сбор подробной информации о процессоре
        
        Returns:
            tuple: (success: bool, stdout: str)
        """
        return self.command_runner.run_command(
            "cat /proc/cpuinfo", 
            "cpuinfo",
            timeout=DEFAULT_TIMEOUT
        )
    
    def collect_all_system_info(self):
        """
        Сбор всей системной информации
        
        Returns:
            dict: Результаты выполнения всех коллекторов
        """
        collectors = [
            ("processes", self.collect_processes),
            ("memory_info", self.collect_memory_info),
            ("vmstat", self.collect_vmstat),
            ("os_release", self.collect_os_release),
            ("uptime", self.collect_uptime),
            ("nproc", self.collect_nproc),
            ("cpu_info", self.collect_cpu_info),
        ]
        
        results = {}
        for name, collector in collectors:
            try:
                success, output = collector()
                results[name] = {"success": success, "output": output}
                self.logger.info(f"Коллектор {name}: {'успешно' if success else 'ошибка'}")
            except Exception as e:
                results[name] = {"success": False, "error": str(e)}
                self.logger.error(f"Коллектор {name}: ошибка - {e}")
        
        return results