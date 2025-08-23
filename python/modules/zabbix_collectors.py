"""
Модуль для сбора данных Zabbix
"""

import json
from datetime import datetime
from pathlib import Path

from .constants import DIAGINFO_TIMEOUT, STATS_TIMEOUT
from .command_runner import CommandRunner
from .output_manager import OutputManager
from .zabbix_config import ZabbixConfigManager
from .zabbix_protocol import ZabbixProtocol
from .exceptions import CommandExecutionError, ConfigurationError, NetworkError
from .logging_manager import get_logger


class ZabbixCollectors:
    """Класс для сбора различных данных Zabbix сервера"""
    
    def __init__(self, command_runner: CommandRunner, output_manager: OutputManager, 
                 config_manager: ZabbixConfigManager = None, protocol: ZabbixProtocol = None):
        """
        Инициализация ZabbixCollectors
        
        Args:
            command_runner: Экземпляр CommandRunner для выполнения команд
            output_manager: Экземпляр OutputManager для работы с файлами
            config_manager: Экземпляр ZabbixConfigManager (опционально)
            protocol: Экземпляр ZabbixProtocol (опционально)
        """
        self.command_runner = command_runner
        self.output_manager = output_manager
        self.output_dir = output_manager.output_dir
        self.config_manager = config_manager or ZabbixConfigManager()
        self.protocol = protocol or ZabbixProtocol()
        self.keep_temp_config = False
        self.logger = get_logger()
    
    def collect_diaginfo(self, keep_temp_config=False):
        """
        Сбор диагностической информации Zabbix через diaginfo
        
        Args:
            keep_temp_config: Сохранить временный конфиг после использования
            
        Returns:
            bool: True при успехе
        """
        self.keep_temp_config = keep_temp_config
        
        try:
            binary_path, _ = self.config_manager.get_zabbix_paths()
            
            if not binary_path:
                self.logger.error("Не удалось получить путь к zabbix_server")
                return False

            # Создаем временный конфиг с Timeout=30
            temp_config_path = self.config_manager.create_temp_config(
                keep_temp=keep_temp_config, 
                timeout=30
            )

            # Запускаем diaginfo
            diaginfo_cmd = f"{binary_path} -c {temp_config_path} -R diaginfo"
            success, _ = self.command_runner.run_command(
                diaginfo_cmd, 
                "diaginfo", 
                timeout=DIAGINFO_TIMEOUT
            )

            # Удаляем временный файл если не нужно сохранять
            if not keep_temp_config:
                self.config_manager.cleanup_temp_config()
            else:
                self.logger.info(f"Временный конфиг сохранен: {temp_config_path}")

            return success

        except (ConfigurationError, CommandExecutionError) as e:
            self.logger.error(f"Ошибка сбора diaginfo: {e}")
            return False
    
    def collect_stats(self):
        """
        Сбор статистики Zabbix через zabbix.stats протокол
        
        Returns:
            bool: True при успехе
        """
        port = self.config_manager.get_zabbix_trapper_port()
        
        try:
            # Получаем статистику через протокол
            stats = self.protocol.get_stats(host='localhost', port=port)
            stats_text = f"Успешно получен JSON ответ:\n{json.dumps(stats, indent=2, ensure_ascii=False)}"
            
        except NetworkError as e:
            self.logger.error(f"Ошибка получения статистики: {e}")
            stats_text = f"Ошибка получения статистики: {e}"
            
        except Exception as e:
            self.logger.error(f"Неожиданная ошибка получения статистики: {e}")
            stats_text = f"Неожиданная ошибка: {e}"

        try:
            # Сохраняем результат
            output_file = self.output_dir / "zabbix_stats.txt"
            
            with open(output_file, 'w', encoding='utf-8') as f:
                self.output_manager.write_file_header(
                    f,
                    description="Zabbix Stats (JSON Protocol)",
                    extra_info=f"Порт: {port}, Таймаут: {STATS_TIMEOUT}"
                )
                f.write(stats_text)

            self.logger.info(f"Статистика сохранена в {output_file}")
            return True
            
        except Exception as e:
            self.logger.error(f"Ошибка сохранения статистики: {e}")
            return False
    
    def collect_config(self):
        """
        Сбор и фильтрация конфигурации Zabbix
        
        Returns:
            bool: True при успехе
        """
        try:
            output_file = self.output_dir / "zabbix_config.txt"
            return self.config_manager.filter_config(output_file)
            
        except ConfigurationError as e:
            self.logger.error(f"Ошибка сбора конфигурации: {e}")
            return False
    
    def collect_all_zabbix_data(self, keep_temp_config=False):
        """
        Сбор всех данных Zabbix
        
        Args:
            keep_temp_config: Сохранить временный конфиг после использования
            
        Returns:
            dict: Результаты выполнения всех коллекторов
        """
        collectors = [
            ("diaginfo", lambda: self.collect_diaginfo(keep_temp_config)),
            ("stats", self.collect_stats),
            ("config", self.collect_config),
        ]
        
        results = {}
        for name, collector in collectors:
            try:
                success = collector()
                results[name] = {"success": success}
                self.logger.info(f"Zabbix коллектор {name}: {'успешно' if success else 'ошибка'}")
            except Exception as e:
                results[name] = {"success": False, "error": str(e)}
                self.logger.error(f"Zabbix коллектор {name}: ошибка - {e}")
        
        return results