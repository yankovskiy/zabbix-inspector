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
    
    def get_database_params(self, config_path):
        """
        Получение параметров подключения к БД из конфигурации Zabbix
        
        Args:
            config_path: Путь к конфиг файлу
            
        Returns:
            dict: Словарь с параметрами БД (DBHost, DBName, DBUser, etc.)
        """
        db_params = {}
        
        if not config_path or not os.path.exists(config_path):
            self.logger.warning(f"Конфиг файл не найден: {config_path}")
            return db_params

        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    
                    # Пропускаем комментарии и пустые строки
                    if not line or line.startswith('#'):
                        continue
                    
                    # Ищем DB параметры
                    for param in ['DBHost', 'DBName', 'DBSchema', 'DBUser', 'DBPassword', 'DBPort']:
                        if line.startswith(f'{param}='):
                            value = line.split('=', 1)[1].strip()
                            if value:
                                db_params[param] = value
                                # Логируем все параметры кроме пароля
                                if param != 'DBPassword':
                                    self.logger.info(f"Найден параметр {param}: {value}")
                                else:
                                    self.logger.info(f"Найден параметр {param}: ***")
                                    
            self.logger.info(f"Получено {len(db_params)} параметров БД из конфигурации")
            return db_params
            
        except Exception as e:
            self.logger.error(f"Ошибка чтения параметров БД: {e}")
            return db_params