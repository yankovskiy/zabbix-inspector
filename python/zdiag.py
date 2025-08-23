#!/usr/bin/env python3
"""
Zabbix Diagnostic Data Collection Script
Собирает диагностическую информацию Zabbix сервера
"""

import os
import sys
import argparse
from pathlib import Path

# Импорты новых модулей
from modules.constants import VERSION, DEFAULT_OUTPUT_DIR, STATS_TIMEOUT
from modules.command_runner import CommandRunner
from modules.output_manager import OutputManager
from modules.system_collectors import SystemCollectors
from modules.zabbix_collectors import ZabbixCollectors
from modules.logging_manager import init_logging


class ZabbixDiagnostic:
    """Оркестратор сбора диагностических данных Zabbix"""
    
    def __init__(self, output_dir=DEFAULT_OUTPUT_DIR, keep_temp_config=False, stats_timeout=STATS_TIMEOUT):
        self.output_dir = Path(output_dir)
        self.keep_temp_config = keep_temp_config
        self.stats_timeout = stats_timeout
        
        # Инициализация логирования
        self.logger = init_logging()
        
        # Инициализация модулей
        self.output_manager = OutputManager(self.output_dir)
        self.command_runner = CommandRunner(self.output_dir)
        self.system_collectors = SystemCollectors(self.command_runner)
        self.zabbix_collectors = ZabbixCollectors(self.command_runner, self.output_manager)

    def run_all_tasks(self):
        """Выполнение всех задач по сбору диагностической информации"""
        self.logger.info("=== Начинаем сбор диагностической информации Zabbix ===")

        # Подготовка - создание выходной директории
        print("--- Подготовка ---")
        if not self.output_manager.setup_output_directory():
            self.logger.error("✗ Ошибка создания директории")
            return

        # Выполнение всех задач
        print("--- Выполнение задач сбора данных ---")
        
        # 1. Запись версии
        self.logger.info("Collector Version")
        version_success = self.output_manager.write_version()
        self.logger.info(f"Version: {'успешно' if version_success else 'ошибка'}")

        # 2. Сбор данных Zabbix
        print("--- Сбор данных Zabbix ---")
        zabbix_results = self.zabbix_collectors.collect_all_zabbix_data(self.keep_temp_config)
        
        # 3. Сбор системной информации
        print("--- Сбор системной информации ---")
        system_results = self.system_collectors.collect_all_system_info()

        # 4. Запись времени завершения
        print("--- Финализация ---")
        final_success = self.output_manager.write_completion_time()
        self.logger.info(f"Final: {'успешно' if final_success else 'ошибка'}")

        # 5. Создание архива
        print("--- Создание архива ---")
        archive_success, archive_path = self.output_manager.create_zip_archive()

        # Итоговый отчет
        self._print_summary_report(version_success, zabbix_results, system_results, 
                                 final_success, archive_success, archive_path)

    def _print_summary_report(self, version_success, zabbix_results, system_results, 
                             final_success, archive_success, archive_path):
        """Печать итогового отчета о выполнении задач"""
        print("\n=== Итоговый отчет ===")
        
        # Подсчет успешных задач
        total_tasks = 0
        successful_tasks = 0
        
        # Version
        total_tasks += 1
        if version_success:
            successful_tasks += 1
            
        # Zabbix tasks
        for name, result in zabbix_results.items():
            total_tasks += 1
            if result.get("success", False):
                successful_tasks += 1
                
        # System tasks  
        for name, result in system_results.items():
            total_tasks += 1
            if result.get("success", False):
                successful_tasks += 1
                
        # Final
        total_tasks += 1
        if final_success:
            successful_tasks += 1

        print(f"Выполнено успешно: {successful_tasks}/{total_tasks}")
        
        # Создаем динамически пронумерованный список задач
        task_list = []
        
        # 1. Version - всегда первая
        task_list.append(("Version", version_success))
        
        # 2-N. Остальные задачи в порядке выполнения (Zabbix, затем System)
        zabbix_task_names = {"diaginfo": "Diaginfo", "stats": "Zabbix Stats", "config": "Zabbix Config"}
        for name, result in zabbix_results.items():
            task_name = zabbix_task_names.get(name, f"Zabbix {name}")
            task_list.append((task_name, result.get("success", False)))
            
        system_task_names = {
            "processes": "PS AUX", "memory_info": "Free", "vmstat": "VMStat",
            "os_release": "OS Release", "uptime": "Uptime", 
            "nproc": "Nproc", "cpu_info": "CPU Info"
        }
        for name, result in system_results.items():
            task_name = system_task_names.get(name, f"System {name}")
            task_list.append((task_name, result.get("success", False)))
        
        # Final - всегда последняя
        task_list.append(("Final", final_success))
        
        # Детальный отчет с динамической нумерацией
        print("\nДетальный отчет:")
        for i, (task_name, success) in enumerate(task_list, 1):
            status = "✓" if success else "✗"
            print(f"{status} {i}. {task_name}")

        if archive_success:
            print(f"✓ Архив создан: {archive_path}")
        else:
            print(f"✗ Ошибка создания архива")

        print(f"\nДанные собраны в: {self.output_dir}")


def main():
    parser = argparse.ArgumentParser(description='Zabbix Diagnostic Data Collection')
    parser.add_argument(
        '--output-dir',
        default=DEFAULT_OUTPUT_DIR,
        help=f'Директория для вывода (по умолчанию: {DEFAULT_OUTPUT_DIR})'
    )
    parser.add_argument(
        '--keep-temp-config',
        action='store_true',
        help='Не удалять временный конфиг-файл',
        default=False
    )
    parser.add_argument(
        '--stats-timeout',
        type=int,
        default=STATS_TIMEOUT,
        help=f'Таймаут для получения статистики в секундах (по умолчанию: {STATS_TIMEOUT})'
    )
    parser.add_argument(
        '--version',
        action='store_true',
        help='Вывести версию скрипта'
    )

    args = parser.parse_args()

    if args.version:
        print(VERSION)
        sys.exit(0)

    # Проверяем права root
    if os.geteuid() != 0:
        print("Внимание: скрипт запущен не от root. Некоторые команды могут не работать.")

    # Создаем и запускаем диагностику
    diag = ZabbixDiagnostic(
        output_dir=args.output_dir,
        keep_temp_config=args.keep_temp_config,
        stats_timeout=args.stats_timeout
    )

    try:
        diag.run_all_tasks()
    except KeyboardInterrupt:
        print("\nПрервано пользователем")
        sys.exit(1)
    except Exception as e:
        print(f"Критическая ошибка: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()