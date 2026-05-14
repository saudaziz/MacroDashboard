import logging
from logging.handlers import RotatingFileHandler

try:
    from backend.runtime_paths import APP_LOG_PATH
except ImportError:
    from runtime_paths import APP_LOG_PATH


_LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
_CONFIGURED_FLAG = "_macro_dashboard_logging_configured"


def configure_logging() -> None:
    root_logger = logging.getLogger()
    if getattr(root_logger, _CONFIGURED_FLAG, False):
        return

    root_logger.setLevel(logging.INFO)

    formatter = logging.Formatter(_LOG_FORMAT)

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)

    file_handler = RotatingFileHandler(
        APP_LOG_PATH,
        maxBytes=10 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8",
    )
    file_handler.setFormatter(formatter)
    root_logger.addHandler(file_handler)

    setattr(root_logger, _CONFIGURED_FLAG, True)
