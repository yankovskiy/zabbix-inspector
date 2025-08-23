"""
Модуль для фильтрации и обработки конфигурации Zabbix
"""

import os
from datetime import datetime
from pathlib import Path

from .path_manager import ZabbixPathManager
from .config_reader import ZabbixConfigReader
from .temp_config_manager import TempConfigManager
from .constants import SENSITIVE_CONFIG_PARAMS
from .exceptions import ConfigurationError
from .logging_manager import get_logger


class ZabbixConfigManager:
    """Класс для фильтрации и обработки конфигурации Zabbix"""
    
    def __init__(self, path_manager: ZabbixPathManager = None, 
                 config_reader: ZabbixConfigReader = None,
                 temp_manager: TempConfigManager = None):
        """Инициализация ZabbixConfigManager
        
        Args:
            path_manager: Менеджер путей Zabbix (опционально)
            config_reader: Читатель конфигурации (опционально) 
            temp_manager: Менеджер временных конфигов (опционально)
        """
        self.path_manager = path_manager or ZabbixPathManager()
        self.config_reader = config_reader or ZabbixConfigReader()
        self.temp_manager = temp_manager or TempConfigManager()
        self.logger = get_logger()
    
    def get_zabbix_paths(self):
        """
        Получение путей к бинарнику и конфиг-файлу zabbix_server
        
        Returns:
            tuple: (binary_path: str|None, config_path: str|None)
        """
        return self.path_manager.get_zabbix_paths()
    
    def clear_cache(self):
        """
        Очистка кэша путей Zabbix
        Полезно если процесс zabbix_server был перезапущен с другими параметрами
        """
        self.path_manager.clear_cache()
    
    def get_zabbix_trapper_port(self):
        """
        Получение порта trapper'а из конфигурации
        
        Returns:
            int: Номер порта trapper'а
        """
        _, config_path = self.get_zabbix_paths()
        return self.config_reader.get_trapper_port(config_path)
    
    def create_temp_config(self, keep_temp=False, timeout=30):
        """
        Создание временного конфиг-файла с измененным Timeout
        
        Args:
            keep_temp: Сохранить временный файл после использования
            timeout: Значение Timeout для временного конфига
            
        Returns:
            str: Путь к временному конфиг-файлу
            
        Raises:
            ConfigurationError: При ошибке создания временного конфига
        """
        binary_path, config_path = self.get_zabbix_paths()
        
        if not binary_path or not config_path:
            raise ConfigurationError("Не удалось получить пути к zabbix_server")
            
        return self.temp_manager.create_temp_config(config_path, keep_temp, timeout)
    
    def cleanup_temp_config(self):
        """Удаление временного конфиг-файла"""
        self.temp_manager.cleanup_temp_config()
    
    def filter_config(self, output_file):
        """
        Фильтрация конфигурации Zabbix с исключением чувствительных параметров
        
        Args:
            output_file: Путь к файлу для сохранения отфильтрованной конфигурации
            
        Returns:
            bool: True при успехе
            
        Raises:
            ConfigurationError: При ошибке чтения конфигурации
        """
        _, config_path = self.get_zabbix_paths()

        if not config_path or not os.path.exists(config_path):
            raise ConfigurationError(f"Конфиг-файл не найден: {config_path}")

        try:
            filtered_config = []

            with open(config_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()

                    # Пропускаем пустые строки и комментарии
                    if not line or line.startswith('#'):
                        continue

                    # Проверяем чувствительные параметры
                    is_sensitive = False
                    for param in SENSITIVE_CONFIG_PARAMS:
                        if line.startswith(f"{param}="):
                            is_sensitive = True
                            break

                    if not is_sensitive:
                        filtered_config.append(line)

            # Сохраняем отфильтрованный конфиг
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(f"# Zabbix Server Configuration (filtered)\n")
                f.write(f"# Дата выполнения: {datetime.now()}\n")
                f.write(f"# Исходный файл: {config_path}\n")
                f.write(f"# Исключены чувствительные параметры: {', '.join(SENSITIVE_CONFIG_PARAMS)}\n\n")

                for line in filtered_config:
                    f.write(line + '\n')

            self.logger.info(f"Конфигурация сохранена в {output_file}")
            self.logger.info(f"Обработано строк: {len(filtered_config)}")
            return True

        except Exception as e:
            error_msg = f"Ошибка фильтрации конфигурации: {e}"
            self.logger.error(error_msg)
            raise ConfigurationError(error_msg)