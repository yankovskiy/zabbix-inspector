#!/usr/bin/env python3
"""
Zabbix Diagnostic Data Collection Script
Собирает диагностическую информацию Zabbix сервера
"""

import os
import sys
import shutil
import subprocess
import tempfile
import socket
import argparse
import re
import zipfile
from datetime import datetime
from pathlib import Path

# Версия скрипта
VERSION = "20250809"


class ZabbixDiagnostic:
    def __init__(self, output_dir="/tmp/zabbix-diag", keep_temp_config=False, stats_timeout=60):
        self.output_dir = Path(output_dir)
        self.keep_temp_config = keep_temp_config
        self.stats_timeout = stats_timeout
        self.temp_config_path = None

    def setup_output_directory(self):
        """Создание выходной директории, удаление существующей если есть"""
        if self.output_dir.exists():
            print(f"Удаляем существующую директорию {self.output_dir}")
            shutil.rmtree(self.output_dir)

        self.output_dir.mkdir(parents=True, exist_ok=True)
        print(f"Создана директория для вывода: {self.output_dir}")

    def run_command(self, command, filename, shell=True, timeout=30):
        """Выполнение команды и сохранение результата в файл"""
        try:
            print(f"Выполняем: {command}")
            result = subprocess.run(
                command,
                shell=shell,
                capture_output=True,
                text=True,
                timeout=timeout
            )

            output_file = self.output_dir / f"{filename}.txt"
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(f"# Команда: {command}\n")
                f.write(f"# Дата выполнения: {datetime.now()}\n")
                f.write(f"# Exit code: {result.returncode}\n\n")
                f.write("=== STDOUT ===\n")
                f.write(result.stdout)
                if result.stderr:
                    f.write("\n=== STDERR ===\n")
                    f.write(result.stderr)

            print(f"Результат сохранен в {output_file}")
            return result.returncode == 0, result.stdout

        except subprocess.TimeoutExpired:
            print(f"Команда '{command}' превысила таймаут")
            return False, ""
        except Exception as e:
            print(f"Ошибка выполнения команды '{command}': {e}")
            return False, ""

    def get_zabbix_paths(self):
        """Получение путей к бинарнику и конфиг-файлу zabbix_server из ps aux"""
        try:
            result = subprocess.run(
                ["ps", "aux"],
                capture_output=True,
                text=True,
                timeout=10
            )

            for line in result.stdout.split('\n'):
                if 'zabbix_server' in line and '-c' in line:
                    # Ищем паттерн: /path/to/zabbix_server -c /path/to/config
                    match = re.search(r'(\S+zabbix_server)\s+.*?-c\s+(\S+)', line)
                    if match:
                        binary_path = match.group(1)
                        config_path = match.group(2)
                        print(f"Найден zabbix_server: {binary_path}, конфиг: {config_path}")
                        return binary_path, config_path

            print("Не удалось найти zabbix_server в процессах")
            return None, None

        except Exception as e:
            print(f"Ошибка получения путей zabbix: {e}")
            return None, None

    def task_1_diaginfo(self):
        """Задача 1: Сбор diaginfo"""
        binary_path, config_path = self.get_zabbix_paths()

        if not binary_path or not config_path:
            print("Не удалось получить пути к zabbix_server")
            return False

        if not os.path.exists(config_path):
            print(f"Конфиг-файл не найден: {config_path}")
            return False

        # Создаем временный конфиг-файл
        try:
            with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='_zabbix.conf') as temp_config:
                self.temp_config_path = temp_config.name

                # Читаем оригинальный конфиг
                with open(config_path, 'r') as original_config:
                    config_content = original_config.read()

                # Заменяем Timeout на 30 (или добавляем если нет)
                if re.search(r'^Timeout=', config_content, re.MULTILINE):
                    config_content = re.sub(r'^Timeout=.*$', 'Timeout=30', config_content, flags=re.MULTILINE)
                else:
                    config_content += '\nTimeout=30\n'

                temp_config.write(config_content)
                print(f"Создан временный конфиг: {self.temp_config_path}")

            # Запускаем diaginfo
            diaginfo_cmd = f"{binary_path} -c {self.temp_config_path} -R diaginfo"
            success, _ = self.run_command(diaginfo_cmd, "1_diaginfo", timeout=60)

            # Удаляем временный файл если не нужно сохранять
            if not self.keep_temp_config and self.temp_config_path:
                try:
                    os.unlink(self.temp_config_path)
                    print(f"Удален временный конфиг: {self.temp_config_path}")
                except Exception as e:
                    print(f"Не удалось удалить временный конфиг: {e}")
            else:
                print(f"Временный конфиг сохранен: {self.temp_config_path}")

            return success

        except Exception as e:
            print(f"Ошибка создания временного конфига: {e}")
            return False

    def get_zabbix_trapper_port(self):
        """Получение порта trapper'а из конфигурации"""
        _, config_path = self.get_zabbix_paths()
        default_port = 10051

        if not config_path or not os.path.exists(config_path):
            print(f"Используем порт по умолчанию: {default_port}")
            return default_port

        try:
            with open(config_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line.startswith('ListenPort='):
                        port = int(line.split('=')[1])
                        print(f"Найден порт в конфиге: {port}")
                        return port
        except Exception as e:
            print(f"Ошибка чтения конфига для порта: {e}")

        print(f"Используем порт по умолчанию: {default_port}")
        return default_port

    def create_zabbix_header(self, data_length):
        """Создает заголовок Zabbix протокола"""
        protocol = b"ZBXD"  # Сигнатура протокола
        flags = 0x01  # Базовый флаг протокола Zabbix
        reserved = 0

        # Упаковываем заголовок: протокол + флаги + длина данных + зарезервированное поле
        import struct
        header = protocol + struct.pack("<BII", flags, data_length, reserved)
        return header

    def create_stats_request(self):
        """Создает JSON запрос для получения статистики Zabbix"""
        import json

        # Формируем JSON запрос для получения статистики
        request_data = {
            "request": "zabbix.stats"
        }

        # Конвертируем в JSON строку и затем в байты
        json_data = json.dumps(request_data, separators=(',', ':'))
        data_bytes = json_data.encode('utf-8')

        # Создаем заголовок и объединяем с данными
        header = self.create_zabbix_header(len(data_bytes))
        packet = header + data_bytes

        return packet

    def parse_zabbix_response(self, raw_response):
        """Парсит ответ от Zabbix сервера"""
        import struct
        import json

        if len(raw_response) < 13:  # Минимальный размер заголовка
            raise ValueError("Получен слишком короткий ответ")

        # Проверяем сигнатуру протокола
        if raw_response[:4] != b"ZBXD":
            raise ValueError("Некорректная сигнатура протокола")

        # Извлекаем информацию из заголовка
        flags = raw_response[4]
        data_length, reserved = struct.unpack("<II", raw_response[5:13])

        # Извлекаем JSON данные
        json_data = raw_response[13:13 + data_length]

        # Парсим JSON
        try:
            response = json.loads(json_data.decode('utf-8'))
            return response
        except json.JSONDecodeError as e:
            raise ValueError(f"Ошибка парсинга JSON: {e}")

    def task_2_zabbix_stats(self):
        """Задача 2: Сбор zabbix.stats через socket"""
        import struct

        port = self.get_zabbix_trapper_port()

        try:
            print(f"Подключаемся к localhost:{port} для получения статистики")

            # Создаем запрос
            request_packet = self.create_stats_request()

            # Создаем socket
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(self.stats_timeout)

            # Подключаемся
            sock.connect(('localhost', port))

            print("Отправляем JSON запрос zabbix.stats...")
            sock.sendall(request_packet)

            print("Ожидание ответа...")
            # Сначала читаем заголовок
            header_data = sock.recv(13)
            if len(header_data) < 13:
                raise ValueError("Получен неполный заголовок")

            # Извлекаем длину данных из заголовка
            data_length = struct.unpack("<I", header_data[5:9])[0]

            # Читаем данные
            response_data = header_data
            remaining = data_length
            while remaining > 0:
                chunk = sock.recv(min(remaining, 4096))
                if not chunk:
                    break
                response_data += chunk
                remaining -= len(chunk)

            sock.close()

            # Парсим ответ
            try:
                stats = self.parse_zabbix_response(response_data)
                stats_text = f"Успешно получен JSON ответ:\n{stats}"
            except Exception as e:
                stats_text = f"Ошибка парсинга ответа: {e}\nСырые данные:\n{response_data}"

            # Сохраняем результат
            output_file = self.output_dir / "2_zabbix_stats.txt"
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(f"# Zabbix Stats (JSON Protocol)\n")
                f.write(f"# Дата выполнения: {datetime.now()}\n")
                f.write(f"# Порт: {port}\n")
                f.write(f"# Таймаут: {self.stats_timeout}\n\n")
                f.write(stats_text)

            print(f"Статистика сохранена в {output_file}")
            return True

        except socket.timeout:
            print(f"Таймаут подключения к порту {port}")
            return False
        except Exception as e:
            print(f"Ошибка получения статистики: {e}")
            return False

    def task_3_ps_aux(self):
        """Задача 3: Сбор ps aux | grep zabbix_server"""
        return self.run_command("ps aux | grep zabbix_server", "3_ps_aux")

    def task_4_free(self):
        """Задача 4: Сбор free"""
        return self.run_command("free -b", "4_free")

    def task_5_vmstat(self):
        """Задача 5: Сбор vmstat 1 30"""
        return self.run_command("vmstat 1 30", "5_vmstat", timeout=35)

    def task_6_zabbix_config(self):
        """Задача 6: Сбор конфигурации zabbix_server"""
        _, config_path = self.get_zabbix_paths()

        if not config_path or not os.path.exists(config_path):
            print(f"Конфиг-файл не найден: {config_path}")
            return False

        try:
            # Чувствительные параметры, которые нужно исключить
            sensitive_params = {
                'DBUser', 'DBPassword', 'DBName', 'DBHost', 'StatsAllowedIP',
                'VaultURL', 'VaultToken'
            }

            filtered_config = []

            with open(config_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()

                    # Пропускаем пустые строки и комментарии
                    if not line or line.startswith('#'):
                        continue

                    # Проверяем чувствительные параметры
                    is_sensitive = False
                    for param in sensitive_params:
                        if line.startswith(f"{param}="):
                            is_sensitive = True
                            break

                    if not is_sensitive:
                        filtered_config.append(line)

            # Сохраняем отфильтрованный конфиг
            output_file = self.output_dir / "6_zabbix_config.txt"
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(f"# Zabbix Server Configuration (filtered)\n")
                f.write(f"# Дата выполнения: {datetime.now()}\n")
                f.write(f"# Исходный файл: {config_path}\n")
                f.write(f"# Исключены чувствительные параметры: {', '.join(sensitive_params)}\n\n")

                for line in filtered_config:
                    f.write(line + '\n')

            print(f"Конфигурация сохранена в {output_file}")
            print(f"Обработано строк: {len(filtered_config)}")
            return True

        except Exception as e:
            print(f"Ошибка обработки конфига: {e}")
            return False

    def task_7_os_release(self):
        """Задача 7: Сбор cat /etc/os-release"""
        return self.run_command("cat /etc/os-release", "7_os_release")

    def task_8_uptime(self):
        """Задача 8: Сбор uptime"""
        return self.run_command("uptime", "8_uptime")

    def task_9_nproc(self):
        """Задача 9: Сбор nproc"""
        return self.run_command("nproc", "9_nproc")

    def task_10_cpuinfo(self):
        """Задача 10: Сбор информации о процессоре"""
        return self.run_command("cat /proc/cpuinfo", "10_cpuinfo")

    def task_final(self):
        """Финальная задача: Запись времени завершения"""
        try:
            output_file = self.output_dir / "final.txt"
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(f"# Время завершения сбора диагностических данных\n")
                f.write(f"# Дата и время: {datetime.now()}\n\n")
                f.write(datetime.now().isoformat())
            
            print(f"Время завершения записано в {output_file}")
            return True
        
        except Exception as e:
            print(f"Ошибка записи времени завершения: {e}")
            return False

    def create_zip_archive(self):
        """Создание zip-архива с именем HOSTNAME.zip"""
        try:
            # Получаем hostname
            result = subprocess.run(['hostname'], capture_output=True, text=True)
            hostname = result.stdout.strip()

            if not hostname:
                hostname = "unknown"

            zip_filename = f"{hostname}.zip"
            zip_path = Path("/tmp") / zip_filename

            if os.path.exists(zip_path):
                os.unlink(zip_path)

            print(f"Создаем архив: {zip_path}")

            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for file_path in self.output_dir.rglob('*.txt'):
                    arcname = file_path.relative_to(self.output_dir.parent)
                    zipf.write(file_path, arcname)
                    print(f"Добавлен в архив: {file_path}")

            print(f"Архив создан: {zip_path}")
            return True, zip_path

        except Exception as e:
            print(f"Ошибка создания архива: {e}")
            return False, None

    def task_0_version(self):
        """Задача 0: Запись версии скрипта"""
        try:
            output_file = self.output_dir / "0_version.txt"
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(f"# Версия скрипта zdiag.py\n")
                f.write(f"# Дата выполнения: {datetime.now()}\n\n")
                f.write(VERSION)
            
            print(f"Версия сохранена в {output_file}")
            return True
        
        except Exception as e:
            print(f"Ошибка записи версии: {e}")
            return False

    def run_all_tasks(self):
        """Выполнение всех задач"""
        print("=== Начинаем сбор диагностической информации Zabbix ===")

        # Подготовка
        self.setup_output_directory()

        # Выполняем все задачи
        tasks = [
            ("0. Version", self.task_0_version),
            ("1. Diaginfo", self.task_1_diaginfo),
            ("2. Zabbix Stats", self.task_2_zabbix_stats),
            ("3. PS AUX", self.task_3_ps_aux),
            ("4. Free", self.task_4_free),
            ("5. VMStat", self.task_5_vmstat),
            ("6. Zabbix Config", self.task_6_zabbix_config),
            ("7. OS Release", self.task_7_os_release),
            ("8. Uptime", self.task_8_uptime),
            ("9. Nproc", self.task_9_nproc),
            ("10. CPU Info", self.task_10_cpuinfo),
            ("Final", self.task_final),
        ]

        results = []
        for task_name, task_func in tasks:
            print(f"\n--- Выполняем задачу: {task_name} ---")
            try:
                success = task_func()
                results.append((task_name, success))
                status = "✓" if success else "✗"
                print(f"{status} {task_name}: {'успешно' if success else 'ошибка'}")
            except Exception as e:
                print(f"✗ {task_name}: исключение - {e}")
                results.append((task_name, False))

        # Создаем архив
        print(f"\n--- Создание архива ---")
        archive_success, archive_path = self.create_zip_archive()

        # Итоговый отчет
        print(f"\n=== Итоговый отчет ===")
        for task_name, success in results:
            status = "✓" if success else "✗"
            print(f"{status} {task_name}")

        if archive_success:
            print(f"✓ Архив создан: {archive_path}")
        else:
            print(f"✗ Ошибка создания архива")

        print(f"\nДанные собраны в: {self.output_dir}")


def main():
    parser = argparse.ArgumentParser(description='Zabbix Diagnostic Data Collection')
    parser.add_argument(
        '--output-dir',
        default='/tmp/zabbix-diag',
        help='Директория для вывода (по умолчанию: /tmp/zabbix-diag)'
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
        default=60,
        help='Таймаут для получения статистики в секундах (по умолчанию: 60)'
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