"""
Модуль для работы с сетевым протоколом Zabbix
"""

import json
import socket
import struct

from .constants import STATS_TIMEOUT
from .exceptions import NetworkError
from .logging_manager import get_logger


class ZabbixProtocol:
    """Класс для работы с протоколом Zabbix"""
    
    def __init__(self, timeout=STATS_TIMEOUT):
        """
        Инициализация ZabbixProtocol
        
        Args:
            timeout: Таймаут соединения в секундах
        """
        self.timeout = timeout
        self.logger = get_logger()
    
    def create_zabbix_header(self, data_length):
        """
        Создает заголовок Zabbix протокола
        
        Args:
            data_length: Длина данных в байтах
            
        Returns:
            bytes: Заголовок протокола Zabbix
        """
        protocol = b"ZBXD"  # Сигнатура протокола
        flags = 0x01  # Базовый флаг протокола Zabbix
        reserved = 0

        # Упаковываем заголовок: протокол + флаги + длина данных + зарезервированное поле
        header = protocol + struct.pack("<BII", flags, data_length, reserved)
        return header
    
    def create_stats_request(self):
        """
        Создает JSON запрос для получения статистики Zabbix
        
        Returns:
            bytes: Полный пакет запроса с заголовком
        """
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
        """
        Парсит ответ от Zabbix сервера
        
        Args:
            raw_response: Сырые данные ответа
            
        Returns:
            dict: Распарсенный JSON ответ
            
        Raises:
            NetworkError: При ошибке парсинга ответа
        """
        if len(raw_response) < 13:  # Минимальный размер заголовка
            raise NetworkError("Получен слишком короткий ответ")

        # Проверяем сигнатуру протокола
        if raw_response[:4] != b"ZBXD":
            raise NetworkError("Некорректная сигнатура протокола")

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
            raise NetworkError(f"Ошибка парсинга JSON: {e}")
    
    def get_stats(self, host='localhost', port=10051):
        """
        Получение статистики от Zabbix сервера
        
        Args:
            host: Адрес Zabbix сервера
            port: Порт Zabbix сервера
            
        Returns:
            dict: Статистика Zabbix сервера
            
        Raises:
            NetworkError: При ошибке сетевого взаимодействия
        """
        try:
            self.logger.info(f"Подключаемся к {host}:{port} для получения статистики")

            # Создаем запрос
            request_packet = self.create_stats_request()

            # Создаем socket
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(self.timeout)

            try:
                # Подключаемся
                sock.connect((host, port))

                self.logger.info("Отправляем JSON запрос zabbix.stats...")
                sock.sendall(request_packet)

                self.logger.info("Ожидание ответа...")
                # Сначала читаем заголовок
                header_data = sock.recv(13)
                if len(header_data) < 13:
                    raise NetworkError("Получен неполный заголовок")

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

                # Парсим ответ
                stats = self.parse_zabbix_response(response_data)
                self.logger.info("Статистика успешно получена")
                return stats

            finally:
                sock.close()

        except socket.timeout:
            error_msg = f"Таймаут подключения к {host}:{port}"
            self.logger.error(error_msg)
            raise NetworkError(error_msg)
        except socket.error as e:
            error_msg = f"Ошибка сокета при подключении к {host}:{port}: {e}"
            self.logger.error(error_msg)
            raise NetworkError(error_msg)
        except Exception as e:
            error_msg = f"Ошибка получения статистики: {e}"
            self.logger.error(error_msg)
            raise NetworkError(error_msg)