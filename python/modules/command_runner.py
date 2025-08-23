"""
Модуль для выполнения системных команд
"""

import subprocess
from datetime import datetime
from pathlib import Path

from .constants import DEFAULT_TIMEOUT
from .exceptions import CommandExecutionError
from .logging_manager import get_logger


class CommandRunner:
    """Класс для выполнения системных команд"""
    
    def __init__(self, output_dir=None):
        """
        Инициализация CommandRunner
        
        Args:
            output_dir: Директория для сохранения результатов команд
        """
        self.output_dir = Path(output_dir) if output_dir else None
        self.logger = get_logger()
    
    def _safe_subprocess_run(self, command, shell=True, timeout=DEFAULT_TIMEOUT):
        """
        Безопасное выполнение subprocess с унифицированной обработкой ошибок
        
        Args:
            command: Команда для выполнения
            shell: Использовать shell для выполнения команды
            timeout: Таймаут выполнения в секундах
            
        Returns:
            subprocess.CompletedProcess: Результат выполнения команды
            
        Raises:
            CommandExecutionError: При ошибке выполнения команды
        """
        try:
            self.logger.info(f"Выполняем: {command}")
            result = subprocess.run(
                command,
                shell=shell,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            return result
        except subprocess.TimeoutExpired:
            error_msg = f"Команда '{command}' превысила таймаут"
            self.logger.error(error_msg)
            raise CommandExecutionError(error_msg)
        except Exception as e:
            error_msg = f"Ошибка выполнения команды '{command}': {e}"
            self.logger.error(error_msg)
            raise CommandExecutionError(error_msg)
    
    def run_command(self, command, filename, shell=True, timeout=DEFAULT_TIMEOUT):
        """
        Выполнение команды и сохранение результата в файл
        
        Args:
            command: Команда для выполнения
            filename: Имя файла для сохранения результата (без расширения)
            shell: Использовать shell для выполнения команды
            timeout: Таймаут выполнения в секундах
            
        Returns:
            tuple: (success: bool, stdout: str)
            
        Raises:
            CommandExecutionError: При ошибке выполнения команды
        """
        if not self.output_dir:
            raise CommandExecutionError("output_dir не установлена")
            
        result = self._safe_subprocess_run(command, shell, timeout)

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

        self.logger.info(f"Результат сохранен в {output_file}")
        return result.returncode == 0, result.stdout
    
    def run_command_direct(self, command, shell=True, timeout=DEFAULT_TIMEOUT):
        """
        Выполнение команды без сохранения в файл
        
        Args:
            command: Команда для выполнения
            shell: Использовать shell для выполнения команды
            timeout: Таймаут выполнения в секундах
            
        Returns:
            tuple: (success: bool, stdout: str, stderr: str)
            
        Raises:
            CommandExecutionError: При ошибке выполнения команды
        """
        result = self._safe_subprocess_run(command, shell, timeout)
        return result.returncode == 0, result.stdout, result.stderr