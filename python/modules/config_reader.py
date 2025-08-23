"""
Модуль для чтения конфигурации Zabbix
"""

import os
from .constants import DEFAULT_ZABBIX_PORT
from .logging_manager import get_logger


class ZabbixConfigReader:
    """Класс для чтения и парсинга конфигурации Zabbix"""
    
    def __init__(self):
        """Инициализация ZabbixConfigReader"""
        self.logger = get_logger()
    
    def get_trapper_port(self, config_path):
        """
        Получение порта trapper'а из конфигурации
        
        Args:
            config_path: Путь к конфиг файлу
            
        Returns:
            int: Номер порта trapper'а
        """
        default_port = DEFAULT_ZABBIX_PORT

        if not config_path or not os.path.exists(config_path):
            self.logger.info(f"Используем порт по умолчанию: {default_port}")
            return default_port

        try:
            with open(config_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line.startswith('ListenPort='):
                        port = int(line.split('=')[1])
                        self.logger.info(f"Найден порт trapper: {port}")
                        return port
                        
            self.logger.info(f"ListenPort не найден, используем по умолчанию: {default_port}")
            return default_port
            
        except (ValueError, IndexError) as e:
            self.logger.warning(f"Ошибка парсинга порта: {e}, используем по умолчанию: {default_port}")
            return default_port
        except Exception as e:
            self.logger.error(f"Ошибка чтения конфига: {e}, используем по умолчанию: {default_port}")
            return default_port