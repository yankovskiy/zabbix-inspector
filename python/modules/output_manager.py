"""
Модуль для управления выводом файлов и архивов
"""

import os
import shutil
import zipfile
from datetime import datetime
from pathlib import Path

from .command_runner import CommandRunner
from .constants import VERSION
from .logging_manager import get_logger


class OutputManager:
    """Класс для управления файлами вывода и архивами"""
    
    def __init__(self, output_dir):
        """
        Инициализация OutputManager
        
        Args:
            output_dir: Директория для сохранения результатов
        """
        self.output_dir = Path(output_dir)
        self._command_runner = None  # Lazy initialization
        self.logger = get_logger()
    
    @property
    def command_runner(self):
        """Lazy initialization of CommandRunner"""
        if self._command_runner is None:
            self._command_runner = CommandRunner()
        return self._command_runner
    
    def write_file_header(self, file_handle, command=None, description=None, source_file=None, extra_info=None):
        """
        Централизованная запись заголовка файла с датой выполнения
        
        Args:
            file_handle: Открытый файловый дескриптор для записи
            command: Команда, которая была выполнена (опционально)
            description: Описание содержимого файла (опционально) 
            source_file: Путь к исходному файлу (опционально)
            extra_info: Дополнительная информация (опционально)
        """
        if description:
            file_handle.write(f"# {description}\n")
        if command:
            file_handle.write(f"# Команда: {command}\n")
        file_handle.write(f"# Дата выполнения: {datetime.now()}\n")
        if source_file:
            file_handle.write(f"# Исходный файл: {source_file}\n")
        if extra_info:
            file_handle.write(f"# {extra_info}\n")
        file_handle.write("\n")
    
    def setup_output_directory(self):
        """
        Создание выходной директории, удаление существующей если есть
        
        Returns:
            bool: True при успехе
        """
        try:
            if self.output_dir.exists():
                self.logger.info(f"Удаляем существующую директорию {self.output_dir}")
                shutil.rmtree(self.output_dir)

            self.output_dir.mkdir(parents=True, exist_ok=True)
            self.logger.info(f"Создана директория для вывода: {self.output_dir}")
            return True
        except Exception as e:
            self.logger.error(f"Ошибка создания директории: {e}")
            return False
    
    def write_version(self):
        """
        Запись версии скрипта в файл version.txt
        
        Returns:
            bool: True при успехе
        """
        try:
            output_file = self.output_dir / "version.txt"
            with open(output_file, 'w', encoding='utf-8') as f:
                self.write_file_header(f, description="Версия скрипта zdiag.py")
                f.write(VERSION)
            
            self.logger.info(f"Версия сохранена в {output_file}")
            return True
        
        except Exception as e:
            self.logger.error(f"Ошибка записи версии: {e}")
            return False
    
    def write_completion_time(self):
        """
        Запись времени завершения в файл final.txt
        
        Returns:
            bool: True при успехе
        """
        try:
            output_file = self.output_dir / "final.txt"
            with open(output_file, 'w', encoding='utf-8') as f:
                self.write_file_header(f, description="Время завершения сбора диагностических данных")
                f.write(datetime.now().isoformat())
            
            self.logger.info(f"Время завершения записано в {output_file}")
            return True
        
        except Exception as e:
            self.logger.error(f"Ошибка записи времени завершения: {e}")
            return False
    
    def create_zip_archive(self, zip_dir="/tmp"):
        """
        Создание zip-архива с именем HOSTNAME.zip
        
        Args:
            zip_dir: Директория для сохранения архива
            
        Returns:
            tuple: (success: bool, zip_path: Path|None)
        """
        try:
            # Получаем hostname
            success, stdout, _ = self.command_runner.run_command_direct(
                'hostname',
                shell=False
            )
            
            if success:
                hostname = stdout.strip() or "unknown"
            else:
                hostname = "unknown"

            zip_filename = f"{hostname}.zip"
            zip_path = Path(zip_dir) / zip_filename

            if os.path.exists(zip_path):
                os.unlink(zip_path)

            self.logger.info(f"Создаем архив: {zip_path}")

            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for file_path in self.output_dir.rglob('*.txt'):
                    arcname = file_path.relative_to(self.output_dir.parent)
                    zipf.write(file_path, arcname)
                    self.logger.info(f"Добавлен в архив: {file_path}")

            self.logger.info(f"Архив создан: {zip_path}")
            return True, zip_path

        except Exception as e:
            self.logger.error(f"Ошибка создания архива: {e}")
            return False, None