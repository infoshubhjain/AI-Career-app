"""Structured logging utilities for roadmap and agent tracing."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


LOGS_DIR = Path(__file__).resolve().parents[2] / "logs"
LOGS_DIR.mkdir(exist_ok=True)

_logger = logging.getLogger("career_app_trace")
_logger.setLevel(logging.INFO)

if not _logger.handlers:
    log_file = LOGS_DIR / f"roadmap_{datetime.now().strftime('%Y%m%d')}.log"
    file_handler = logging.FileHandler(log_file)
    file_handler.setLevel(logging.INFO)
    _logger.addHandler(file_handler)

    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    _logger.addHandler(console_handler)


class AgentLogger:
    @staticmethod
    def _emit(event: str, level: str = "INFO", **fields: Any) -> None:
        payload = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": level,
            "event": event,
            **fields,
        }
        message = json.dumps(payload, ensure_ascii=False)
        if level == "ERROR":
            _logger.error(message)
        else:
            _logger.info(message)

    @staticmethod
    def preview(text: str | None, size: int = 500) -> str:
        if not text:
            return ""
        return text[:size] + ("..." if len(text) > size else "")

    @staticmethod
    def info(event: str, **fields: Any) -> None:
        AgentLogger._emit(event=event, level="INFO", **fields)

    @staticmethod
    def error(event: str, **fields: Any) -> None:
        AgentLogger._emit(event=event, level="ERROR", **fields)


class RoadmapLogger(AgentLogger):
    """Backward-compatible alias for the existing roadmap pipeline."""
