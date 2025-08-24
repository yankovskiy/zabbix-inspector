"""
Database Collector Module
Модуль для работы с базой данных Zabbix PostgreSQL
"""

import os
import json
import csv
import psycopg2
import time
from pathlib import Path
from dataclasses import dataclass
from typing import List, Dict, Any, Optional, Tuple
from getpass import getpass

from .constants import (
    DB_RETRY_ATTEMPTS, 
    DB_RETRY_DELAY_SECONDS,
    DB_CONNECTION_TIMEOUT,
    DB_QUERY_TIMEOUT
)
from .logging_manager import get_logger
from .system_collectors import safe_collector
from .zabbix_config import ZabbixConfigManager


@dataclass
class SQLTask:
    """Модель задачи SQL"""
    name: str
    sql_file_path: str
    csv_output_path: str
    sql_content: str


class DatabaseConfig:
    """Класс для управления конфигурацией БД"""
    
    def __init__(self):
        self.logger = get_logger()
        
    def get_config_dir(self) -> Path:
        """Получение директории конфигурации"""
        config_dir = Path.home() / '.config' / 'zdiag'
        config_dir.mkdir(parents=True, exist_ok=True)
        return config_dir
    
    def get_config_path(self) -> Path:
        """Получение пути к файлу конфигурации"""
        return self.get_config_dir() / 'database.json'
    
    def load_from_file(self, config_path: Optional[Path] = None) -> Dict[str, Any]:
        """Загрузка конфигурации из файла"""
        if config_path is None:
            config_path = self.get_config_path()
            
        try:
            if not config_path.exists():
                raise FileNotFoundError(f"Конфигурационный файл не найден: {config_path}")
                
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
                
            self.logger.info(f"Конфигурация БД загружена из {config_path}")
            return config
            
        except Exception as e:
            self.logger.error(f"Ошибка загрузки конфигурации БД: {e}")
            raise
    
    def save_to_file(self, config: Dict[str, Any], config_path: Optional[Path] = None) -> None:
        """Сохранение конфигурации в файл"""
        if config_path is None:
            config_path = self.get_config_path()
            
        try:
            # Создаем директорию если не существует
            config_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(config_path, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2, ensure_ascii=False)
                
            # Устанавливаем права доступа 600 (только владелец)
            config_path.chmod(0o600)
            
            self.logger.info(f"Конфигурация БД сохранена в {config_path}")
            
        except Exception as e:
            self.logger.error(f"Ошибка сохранения конфигурации БД: {e}")
            raise
    
    def validate_config(self, config: Dict[str, Any]) -> bool:
        """Валидация конфигурации"""
        required_keys = ['DBHost', 'DBName', 'DBUser', 'DBPassword']
        
        for key in required_keys:
            if key not in config or not config[key]:
                self.logger.error(f"Отсутствует обязательный параметр: {key}")
                return False
                
        return True
    
    def read_zabbix_db_config(self) -> Dict[str, str]:
        """Чтение конфигурации БД из конфига Zabbix Server"""
        try:
            config_manager = ZabbixConfigManager()
            db_params = config_manager.get_database_params()
            
            return db_params
            
        except Exception as e:
            self.logger.warning(f"Не удалось прочитать конфигурацию Zabbix: {e}")
            return {}


class SQLTaskScanner:
    """Сканирование и парсинг SQL-файлов"""
    
    def __init__(self):
        self.logger = get_logger()
    
    def scan_sql_directory(self, sql_dir: Path) -> List[SQLTask]:
        """Сканирование директории SQL-файлов"""
        tasks = []
        
        if not sql_dir.exists():
            self.logger.warning(f"Директория SQL не найдена: {sql_dir}")
            return tasks
            
        for sql_file in sql_dir.glob('*.sql'):
            try:
                if self.validate_sql_file(sql_file):
                    task = self._create_sql_task(sql_file)
                    if task:
                        tasks.append(task)
                        
            except Exception as e:
                self.logger.error(f"Ошибка обработки SQL файла {sql_file}: {e}")
                
        self.logger.info(f"Найдено {len(tasks)} SQL задач в {sql_dir}")
        return tasks
    
    def _create_sql_task(self, sql_file: Path) -> Optional[SQLTask]:
        """Создание задачи из SQL файла"""
        try:
            with open(sql_file, 'r', encoding='utf-8') as f:
                sql_content = f.read()
                
            task_name = self.parse_task_name(sql_content)
            csv_output_path = sql_file.with_suffix('.csv').name
            
            return SQLTask(
                name=task_name,
                sql_file_path=str(sql_file),
                csv_output_path=csv_output_path,
                sql_content=sql_content
            )
            
        except Exception as e:
            self.logger.error(f"Ошибка создания задачи для {sql_file}: {e}")
            return None
    
    def parse_task_name(self, sql_content: str) -> str:
        """Извлечение имени задачи из комментария SQL"""
        lines = sql_content.split('\n')
        
        for line in lines:
            line = line.strip()
            if line.startswith('-- Task Name:'):
                task_name = line.replace('-- Task Name:', '').strip()
                if task_name:
                    return task_name
                    
        # Если Task Name не найден, возвращаем имя файла без расширения
        return "Unknown Task"
    
    def validate_sql_file(self, file_path: Path) -> bool:
        """Валидация SQL файла"""
        try:
            if not file_path.exists():
                return False
                
            if file_path.suffix.lower() != '.sql':
                return False
                
            # Проверяем, что файл не пустой
            if file_path.stat().st_size == 0:
                self.logger.warning(f"SQL файл пустой: {file_path}")
                return False
                
            return True
            
        except Exception as e:
            self.logger.error(f"Ошибка валидации SQL файла {file_path}: {e}")
            return False


class DatabaseExecutor:
    """Выполнение запросов к базе данных"""
    
    def __init__(self, output_dir: Path):
        self.logger = get_logger()
        self.connection = None
        self.output_dir = output_dir
        self.db_output_dir = output_dir / 'database'
        
        # Создаем директорию для результатов БД
        self.db_output_dir.mkdir(exist_ok=True)
    
    def connect(self, config: Dict[str, Any]) -> bool:
        """Подключение к базе данных"""
        try:
            # Подготовка параметров подключения
            conn_params = {
                'host': config['DBHost'],
                'database': config['DBName'],
                'user': config['DBUser'],
                'password': config['DBPassword'],
                'connect_timeout': DB_CONNECTION_TIMEOUT
            }
            
            # Добавляем порт если указан
            if config.get('DBPort'):
                conn_params['port'] = int(config['DBPort'])
                
            # Добавляем схему если указана
            if config.get('DBSchema'):
                conn_params['options'] = f'-c search_path={config["DBSchema"]}'
            
            self.connection = psycopg2.connect(**conn_params)
            self.logger.info("Успешное подключение к базе данных")
            return True
            
        except Exception as e:
            self.logger.error(f"Ошибка подключения к БД: {e}")
            return False
    
    def test_connection(self, config: Dict[str, Any]) -> Tuple[bool, str]:
        """Тестовое подключение к БД"""
        try:
            if self.connect(config):
                with self.connection.cursor() as cursor:
                    cursor.execute("SELECT version()")
                    version = cursor.fetchone()[0]
                    self.logger.info(f"Версия PostgreSQL: {version}")
                    return True, version
            return False, "Ошибка подключения"
            
        except Exception as e:
            error_msg = str(e)
            self.logger.error(f"Ошибка тестирования подключения: {error_msg}")
            return False, error_msg
        finally:
            self.close_connection()
    
    def get_database_version_info(self) -> Optional[Dict[str, Any]]:
        """Получение информации о версии БД из Zabbix"""
        try:
            with self.connection.cursor() as cursor:
                cursor.execute("SELECT dbversion_status FROM config;")
                result = cursor.fetchone()
                
                if result and result[0]:
                    version_info = json.loads(result[0])
                    self.logger.info("Получена информация о версии БД")
                    return version_info
                    
            return None
            
        except Exception as e:
            self.logger.error(f"Ошибка получения версии БД: {e}")
            return None
    
    @safe_collector
    def execute_task(self, sql_task: SQLTask) -> bool:
        """Выполнение SQL задачи с ретраями"""
        self.logger.info(f"Выполнение задачи: {sql_task.name}")
        
        for attempt in range(1, DB_RETRY_ATTEMPTS + 1):
            try:
                if not self.connection or self.connection.closed:
                    self.logger.warning("Соединение с БД потеряно, переподключение...")
                    # Здесь нужно будет переподключиться с сохраненными параметрами
                    
                with self.connection.cursor() as cursor:
                    # Устанавливаем таймаут для запроса
                    cursor.execute(f"SET statement_timeout = {DB_QUERY_TIMEOUT * 1000}")
                    
                    # Выполняем основной запрос
                    cursor.execute(sql_task.sql_content)
                    
                    # Получаем результаты
                    if cursor.description:
                        columns = [desc[0] for desc in cursor.description]
                        results = cursor.fetchall()
                        
                        # Сохраняем в CSV
                        self.save_results_to_csv(results, columns, sql_task.csv_output_path)
                        
                        self.logger.info(f"Задача '{sql_task.name}' выполнена успешно. "
                                       f"Получено {len(results)} строк")
                        return True
                    else:
                        self.logger.warning(f"Задача '{sql_task.name}' не вернула результатов")
                        return True
                        
            except Exception as e:
                self.logger.error(f"Попытка {attempt}/{DB_RETRY_ATTEMPTS} для задачи "
                                f"'{sql_task.name}' неудачна: {e}")
                
                if attempt < DB_RETRY_ATTEMPTS:
                    self.logger.info(f"Ожидание {DB_RETRY_DELAY_SECONDS} секунд перед повтором...")
                    time.sleep(DB_RETRY_DELAY_SECONDS)
                else:
                    self.logger.error(f"Задача '{sql_task.name}' не выполнена после "
                                    f"{DB_RETRY_ATTEMPTS} попыток")
                    return False
                    
        return False
    
    def save_results_to_csv(self, results: List[tuple], columns: List[str], 
                          output_filename: str) -> None:
        """Сохранение результатов в CSV файл"""
        try:
            output_path = self.db_output_dir / output_filename
            
            with open(output_path, 'w', newline='', encoding='utf-8') as csvfile:
                writer = csv.writer(csvfile, delimiter=',', quotechar='"')
                
                # Записываем заголовки
                writer.writerow(columns)
                
                # Записываем данные
                for row in results:
                    # Конвертируем все значения в строки для корректной записи
                    str_row = [str(value) if value is not None else '' for value in row]
                    writer.writerow(str_row)
                    
            self.logger.info(f"Результаты сохранены в {output_path}")
            
        except Exception as e:
            self.logger.error(f"Ошибка сохранения в CSV {output_filename}: {e}")
            raise
    
    def close_connection(self) -> None:
        """Закрытие соединения с БД"""
        try:
            if self.connection and not self.connection.closed:
                self.connection.close()
                self.logger.info("Соединение с БД закрыто")
                
        except Exception as e:
            self.logger.error(f"Ошибка закрытия соединения с БД: {e}")


class DatabaseCollector:
    """Основной класс для работы с БД"""
    
    def __init__(self, output_dir: Path):
        self.logger = get_logger()
        self.output_dir = Path(output_dir)
        
        self.config_manager = DatabaseConfig()
        self.task_scanner = SQLTaskScanner()
        self.executor = DatabaseExecutor(self.output_dir)
    
    def init_database_config(self) -> bool:
        """Инициализация конфигурации БД (--db-init)"""
        print("=== Настройка подключения к базе данных Zabbix ===\n")
        
        # Получаем параметры из конфига Zabbix
        zabbix_db_params = self.config_manager.read_zabbix_db_config()
        
        # Интерактивный ввод параметров
        config = {}
        
        # Параметры для ввода
        params = [
            ('DBHost', 'Хост базы данных'),
            ('DBName', 'Имя базы данных'),
            ('DBSchema', 'Схема базы данных'),
            ('DBUser', 'Пользователь базы данных'),
            ('DBPassword', 'Пароль базы данных'),
            ('DBPort', 'Порт базы данных')
        ]

        print("") # empty line
        for param_key, param_desc in params:
            default_value = zabbix_db_params.get(param_key, '')
            
            if param_key == 'DBPassword':
                # Специальная обработка пароля
                if default_value:
                    prompt = f"{param_desc} [***]: "
                else:
                    prompt = f"{param_desc} []: "
                    
                value = getpass(prompt)
                if not value and default_value:
                    value = default_value
                    
            else:
                # Обычный ввод
                if default_value:
                    prompt = f"{param_desc} [{default_value}]: "
                else:
                    prompt = f"{param_desc} []: "
                    
                value = input(prompt).strip()
                if not value and default_value:
                    value = default_value
            
            # Проверка обязательных параметров
            if not value and param_key in ['DBHost', 'DBName', 'DBUser', 'DBPassword']:
                print(f"Ошибка: Параметр {param_desc} является обязательным!")
                return False
                
            if value:
                config[param_key] = value
        
        # Тестирование подключения
        print("\n--- Проверка подключения к базе данных ---")
        success, message = self.executor.test_connection(config)
        
        if not success:
            # print(f"✗ Ошибка подключения к БД: {message}")
            return False
            
        # print(f"✓ Подключение успешно: {message}")
        
        # Получение информации о версии БД
        print("--- Информация о версии базы данных ---")
        if self.executor.connect(config):
            version_info = self.executor.get_database_version_info()
            
            if version_info:
                print("Версия базы данных:")
                if isinstance(version_info, list):
                    for item in version_info:
                        if isinstance(item, dict):
                            for key, value in item.items():
                                print(f"  {key} = {value}")
                elif isinstance(version_info, dict):
                    for key, value in version_info.items():
                        print(f"  {key} = {value}")
            else:
                print("Не удалось получить информацию о версии БД")
                
            self.executor.close_connection()
        
        # Сохранение конфигурации
        print("--- Сохранение конфигурации ---")
        try:
            self.config_manager.save_to_file(config)
            config_path = self.config_manager.get_config_path()
            # print(f"✓ Конфигурация сохранена в {config_path}")
            return True
            
        except Exception as e:
            # print(f"✗ Ошибка сохранения конфигурации: {e}")
            return False
    
    def collect_database_data(self, sql_dir: Path) -> Dict[str, Any]:
        """Сбор данных из БД (--db)"""
        results = {
            'tasks_total': 0,
            'tasks_successful': 0,
            'tasks_failed': 0,
            'csv_files_created': 0,
            'total_data_size': 0
        }
        
        try:
            # Проверка существования конфигурации
            config_path = self.config_manager.get_config_path()
            if not config_path.exists():
                self.logger.error(f"Конфигурация БД не найдена: {config_path}")
                self.logger.error(f"Запустите скрипт с параметром --db-init для настройки подключения к БД")
                return results
            
            # Загрузка конфигурации
            self.logger.info(f"Загрузка конфигурации БД из {config_path}")
            config = self.config_manager.load_from_file()
            
            if not self.config_manager.validate_config(config):
                self.logger.error("Валидация конфигурации БД неудачна")
                return results
            
            # Подключение к БД
            if not self.executor.connect(config):
                self.logger.error("Подключение к БД для сбора данных неудачно")
                return results
            
            # Сканирование SQL файлов
            tasks = self.task_scanner.scan_sql_directory(sql_dir)
            results['tasks_total'] = len(tasks)
            
            if not tasks:
                self.logger.warning(f"SQL файлы не найдены в директории: {sql_dir}")
                return results
            
            self.logger.info(f"Начинаем выполнение {len(tasks)} SQL задач")
            
            # Выполнение задач
            for task in tasks:
                
                if self.executor.execute_task(task):
                    results['tasks_successful'] += 1
                    results['csv_files_created'] += 1
                    
                    # Подсчет размера созданного файла
                    csv_path = self.executor.db_output_dir / task.csv_output_path
                    if csv_path.exists():
                        file_size = csv_path.stat().st_size
                        results['total_data_size'] += file_size
                        self.logger.info(f"SQL задача {task.name}: успешно, размер CSV: {file_size} байт")
                        
                else:
                    results['tasks_failed'] += 1
                    self.logger.error(f"SQL задача {task.name}: ошибка выполнения")
            
            return results
            
        except Exception as e:
            error_msg = f"Критическая ошибка при сборе данных БД: {e}"
            self.logger.error(error_msg)
            return results
            
        finally:
            self.executor.close_connection()