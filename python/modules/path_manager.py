"""
Модуль для работы с путями Zabbix
"""

import os
import re
from .command_runner import CommandRunner
from .constants import PS_TIMEOUT
from .exceptions import ConfigurationError
from .logging_manager import get_logger


class ZabbixPathManager:
    """Класс для получения путей к Zabbix бинарникам и конфигам"""
    
    def __init__(self, command_runner: CommandRunner = None):
        """
        Инициализация ZabbixPathManager
        
        Args:
            command_runner: Экземпляр CommandRunner (опционально)
        """
        self.command_runner = command_runner or CommandRunner()
        self._cached_paths = None
        self.logger = get_logger()
    
    def get_zabbix_paths(self):
        """
        Получение путей к бинарнику и конфиг-файлу zabbix_server из ps aux
        Использует кэширование для избежания повторных вызовов subprocess
        
        Returns:
            tuple: (binary_path: str|None, config_path: str|None)
        """
        # Возвращаем кэшированный результат если он есть
        if self._cached_paths is not None:
            return self._cached_paths
            
        try:
            success, stdout, _ = self.command_runner.run_command_direct(
                "ps aux | grep '[z]abbix_server'",
                shell=True,
                timeout=PS_TIMEOUT
            )
            
            if not success:
                self.logger.error("Не удалось выполнить ps aux")
                self._cached_paths = (None, None)
                return self._cached_paths

            binary_path = None
            config_path = None
            
            for line in stdout.split('\n'):
                if 'zabbix_server' in line:
                    # Ищем zabbix_server в строке
                    match = re.search(r'(\S*/zabbix_server)', line)
                    if match:
                        binary_path = match.group(1)
                    
                    # Ищем -c параметр для конфига
                    config_match = re.search(r'-c\s+(\S+)', line)
                    if config_match:
                        config_path = config_match.group(1)
                    
                    break

            if binary_path:
                self.logger.info(f"Найден zabbix_server: {binary_path}")
                if config_path:
                    self.logger.info(f"Конфиг файл: {config_path}")
            else:
                self.logger.warning("zabbix_server не найден в процессах")

            self._cached_paths = (binary_path, config_path)
            return self._cached_paths
            
        except Exception as e:
            self.logger.error(f"Ошибка получения путей Zabbix: {e}")
            self._cached_paths = (None, None)
            return self._cached_paths
    
    def clear_cache(self):
        """
        Очистка кэша путей Zabbix
        Полезно если процесс zabbix_server был перезапущен с другими параметрами
        """
        self._cached_paths = None