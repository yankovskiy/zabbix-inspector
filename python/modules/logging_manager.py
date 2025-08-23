"""
Модуль централизованного логирования для Zabbix Inspector
"""
import logging
import sys
from pathlib import Path


class LoggingManager:
    """Manages centralized logging configuration for the application"""
    
    def __init__(self, log_level=logging.INFO, log_file=None):
        """
        Initialize logging configuration
        
        Args:
            log_level: Logging level (default: INFO)
            log_file: Optional log file path
        """
        self.logger = logging.getLogger('zabbix_analyse')
        self.logger.setLevel(log_level)
        
        # Remove any existing handlers
        self.logger.handlers.clear()
        
        # Create console handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(log_level)
        
        # Create formatter
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        console_handler.setFormatter(formatter)
        
        self.logger.addHandler(console_handler)
        
        # Add file handler if specified
        if log_file:
            file_handler = logging.FileHandler(log_file)
            file_handler.setLevel(log_level)
            file_handler.setFormatter(formatter)
            self.logger.addHandler(file_handler)
    
    def get_logger(self):
        """Get configured logger instance"""
        return self.logger
    
    def info(self, message):
        """Log info message"""
        self.logger.info(message)
    
    def error(self, message):
        """Log error message"""
        self.logger.error(message)
    
    def warning(self, message):
        """Log warning message"""
        self.logger.warning(message)
    
    def debug(self, message):
        """Log debug message"""
        self.logger.debug(message)


# Global logger instance
_logging_manager = None

def get_logger():
    """Get global logger instance"""
    global _logging_manager
    if _logging_manager is None:
        _logging_manager = LoggingManager()
    return _logging_manager.get_logger()

def init_logging(log_level=logging.INFO, log_file=None):
    """Initialize global logging"""
    global _logging_manager
    _logging_manager = LoggingManager(log_level, log_file)
    return _logging_manager.get_logger()