"""
Модуль для работы с временными конфигурационными файлами Zabbix
"""

import os
import tempfile
from datetime import datetime
from pathlib import Path
from .exceptions import ConfigurationError
from .logging_manager import get_logger


class TempConfigManager:
    """Класс для создания и управления временными конфиг файлами"""
    
    def __init__(self):
        """Инициализация TempConfigManager"""
        self.temp_config_path = None
        self.logger = get_logger()
    
    def create_temp_config(self, config_path, keep_temp=False, timeout=30):
        """
        Создание временного конфига с измененным Timeout
        
        Args:
            config_path: Путь к оригинальному конфиг файлу
            keep_temp: Сохранить временный файл после использования
            timeout: Значение Timeout для временного конфига
            
        Returns:
            str: Путь к временному конфиг файлу
        """
        if not config_path or not os.path.exists(config_path):
            raise ConfigurationError(f"Конфиг файл не найден: {config_path}")

        try:
            # Создаем временный файл
            with tempfile.NamedTemporaryFile(
                mode='w', 
                suffix='.conf', 
                prefix='zabbix_temp_',
                delete=False
            ) as temp_file:
                
                temp_config_path = temp_file.name
                self.temp_config_path = temp_config_path
                
                # Копируем содержимое оригинального конфига
                with open(config_path, 'r') as orig_config:
                    lines = orig_config.readlines()
                
                # Записываем заголовок
                temp_file.write(f"# Временный конфиг для zabbix diaginfo\n")
                temp_file.write(f"# Создан: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                temp_file.write(f"# Оригинальный: {config_path}\n\n")
                
                timeout_found = False
                for line in lines:
                    stripped = line.strip()
                    
                    # Заменяем существующий Timeout или добавляем комментарий
                    if stripped.startswith('Timeout='):
                        temp_file.write(f"# {line}")  # Комментируем старый
                        if not timeout_found:
                            temp_file.write(f"Timeout={timeout}\n")
                            timeout_found = True
                    else:
                        temp_file.write(line)
                
                # Если Timeout не был найден, добавляем в конец
                if not timeout_found:
                    temp_file.write(f"\n# Добавлен автоматически для diaginfo\n")
                    temp_file.write(f"Timeout={timeout}\n")

            self.logger.info(f"Создан временный конфиг: {temp_config_path}")
            
            if keep_temp:
                self.logger.info(f"Временный конфиг будет сохранен")
            
            return temp_config_path
            
        except Exception as e:
            raise ConfigurationError(f"Ошибка создания временного конфига: {e}")
    
    def cleanup_temp_config(self):
        """Удаление временного конфиг файла"""
        if self.temp_config_path and os.path.exists(self.temp_config_path):
            try:
                os.unlink(self.temp_config_path)
                self.logger.info(f"Временный конфиг удален: {self.temp_config_path}")
            except Exception as e:
                self.logger.warning(f"Не удалось удалить временный конфиг {self.temp_config_path}: {e}")
            finally:
                self.temp_config_path = None