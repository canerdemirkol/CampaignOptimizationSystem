"""
ECS-compatible logging configuration with optional file rotation.

Console output (stdout): Always active, ECS JSON format.
File output (logs/): Only when FILE_LOG_ENABLED=true.

- logs/general/   : system logs (info, warning, error, debug)
- logs/optimization/ : campaign calculation logs with parameters and results
- File rotation: 50MB max per file, same-day overflow creates -2, -3 suffixes
"""
import logging
import os
import sys
from datetime import datetime
from logging.handlers import BaseRotatingHandler

from pythonjsonlogger import jsonlogger


class DailyRotatingFileHandler(BaseRotatingHandler):
    """
    Custom handler: date-based log files with 50MB size limit.
    When file exceeds 50MB, creates filename-2.log, filename-3.log, etc.
    """

    def __init__(self, log_dir: str, max_bytes: int = 50 * 1024 * 1024):
        self.log_dir = log_dir
        self.max_bytes = max_bytes
        os.makedirs(log_dir, exist_ok=True)
        filepath = self._get_current_filepath()
        super().__init__(filepath, mode="a", encoding="utf-8")

    def _get_current_filepath(self) -> str:
        today = datetime.now().strftime("%Y-%m-%d")
        suffix = 1
        filename = f"{today}.log"
        filepath = os.path.join(self.log_dir, filename)

        while os.path.exists(filepath):
            size = os.path.getsize(filepath)
            if size < self.max_bytes:
                return filepath
            suffix += 1
            filename = f"{today}-{suffix}.log"
            filepath = os.path.join(self.log_dir, filename)

        return filepath

    def shouldRollover(self, record) -> int:
        if self.stream is None:
            self.stream = self._open()
        if self.max_bytes > 0:
            self.stream.seek(0, 2)
            if self.stream.tell() + len(self.format(record)) >= self.max_bytes:
                return 1
        return 0

    def doRollover(self):
        if self.stream:
            self.stream.close()
        self.baseFilename = self._get_current_filepath()
        self.stream = self._open()


class EcsJsonFormatter(jsonlogger.JsonFormatter):
    """
    ECS (Elastic Common Schema) compatible JSON formatter.
    Maps standard Python logging fields to ECS field names.
    """

    def __init__(self, service_name: str = None, service_version: str = None, **kwargs):
        super().__init__(**kwargs)
        self.service_name = service_name or os.environ.get(
            "SERVICE_NAME", "campaign-optimization-python"
        )
        self.service_version = service_version or os.environ.get(
            "SERVICE_VERSION", "1.0.0"
        )

    def add_fields(self, log_record, record, message_dict):
        super().add_fields(log_record, record, message_dict)

        # ECS required fields
        log_record["@timestamp"] = datetime.utcnow().strftime(
            "%Y-%m-%dT%H:%M:%S.%f"
        )[:-3] + "Z"
        log_record["log.level"] = record.levelname.lower()
        log_record["message"] = record.getMessage()
        log_record["log.logger"] = record.name
        log_record["service.name"] = self.service_name
        log_record["service.version"] = self.service_version

        # Remove default python-json-logger fields that duplicate ECS fields
        for key in ["asctime", "levelname", "name"]:
            log_record.pop(key, None)


def setup_logging(level: str = "INFO"):
    """
    Setup logging with ECS console output + optional file handlers.

    Console (stdout): Always active, ECS JSON format.
    File (logs/): Only when FILE_LOG_ENABLED=true env var is set.
    """
    file_log_enabled = os.environ.get("FILE_LOG_ENABLED", "false").lower() == "true"
    base_log_dir = os.path.join(os.getcwd(), "logs")

    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    ecs_formatter = EcsJsonFormatter()

    # Console handler - ALWAYS active (ECS JSON to stdout)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)
    console_handler.setFormatter(ecs_formatter)
    if hasattr(console_handler.stream, "reconfigure"):
        console_handler.stream.reconfigure(encoding="utf-8")
    root_logger.addHandler(console_handler)

    # File handlers - only when FILE_LOG_ENABLED=true
    if file_log_enabled:
        general_handler = DailyRotatingFileHandler(
            log_dir=os.path.join(base_log_dir, "general")
        )
        general_handler.setLevel(level)
        general_handler.setFormatter(ecs_formatter)
        root_logger.addHandler(general_handler)

    # Optimization-specific logger
    opt_logger = logging.getLogger("optimization")
    if file_log_enabled:
        opt_handler = DailyRotatingFileHandler(
            log_dir=os.path.join(base_log_dir, "optimization")
        )
        opt_handler.setLevel(level)
        opt_handler.setFormatter(ecs_formatter)
        opt_logger.addHandler(opt_handler)

    # Reduce noise from third-party libraries
    logging.getLogger("uvicorn").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
