"""
Structured logging utility for roadmap generation
"""

import json
import logging
from pathlib import Path
from datetime import datetime
from typing import Any, Dict, Optional
from app.core.config import settings


# Create logs directory if it doesn't exist
LOGS_DIR = Path(__file__).parent.parent.parent / "logs"
LOGS_DIR.mkdir(exist_ok=True)

# Configure logger
logger = logging.getLogger("roadmap")
logger.setLevel(logging.INFO)

# File handler for JSON logs
log_file = LOGS_DIR / f"roadmap_{datetime.now().strftime('%Y%m%d')}.log"
file_handler = logging.FileHandler(log_file)
file_handler.setLevel(logging.INFO)

# Console handler
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.DEBUG if settings.DEBUG else logging.INFO)

# Add handlers
logger.addHandler(file_handler)
logger.addHandler(console_handler)


class RoadmapLogger:
    """
    Structured logger for roadmap generation pipeline.
    Logs are written as JSON lines for easy parsing.
    """
    
    @staticmethod
    def _format_log(
        event: str,
        level: str = "INFO",
        **kwargs: Any
    ) -> str:
        """Format log entry as JSON"""
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": level,
            "event": event,
            **kwargs
        }
        return json.dumps(log_entry)
    
    @staticmethod
    def log_request(query: str, request_id: str):
        """Log incoming roadmap generation request"""
        msg = RoadmapLogger._format_log(
            "request_received",
            query=query,
            request_id=request_id
        )
        logger.info(msg)
    
    @staticmethod
    def log_agent_call(
        agent_name: str,
        request_id: str,
        prompt: str,
        model: str
    ):
        """Log agent call with prompt"""
        msg = RoadmapLogger._format_log(
            "agent_call",
            agent=agent_name,
            request_id=request_id,
            model=model,
            prompt_length=len(prompt),
            prompt_preview=prompt[:200] + "..." if len(prompt) > 200 else prompt
        )
        logger.info(msg)
    
    @staticmethod
    def log_agent_response(
        agent_name: str,
        request_id: str,
        response: str,
        success: bool,
        error: Optional[str] = None
    ):
        """Log agent response"""
        msg = RoadmapLogger._format_log(
            "agent_response",
            agent=agent_name,
            request_id=request_id,
            success=success,
            response_length=len(response) if response else 0,
            response_preview=response[:200] + "..." if response and len(response) > 200 else response,
            error=error
        )
        if success:
            logger.info(msg)
        else:
            logger.error(msg)
    
    @staticmethod
    def log_validation(
        agent_name: str,
        request_id: str,
        success: bool,
        error: Optional[str] = None
    ):
        """Log validation result"""
        msg = RoadmapLogger._format_log(
            "validation",
            agent=agent_name,
            request_id=request_id,
            success=success,
            error=error
        )
        if success:
            logger.info(msg)
        else:
            logger.error(msg)
    
    @staticmethod
    def log_file_saved(
        filename: str,
        request_id: str,
        file_type: str
    ):
        """Log file save operation"""
        msg = RoadmapLogger._format_log(
            "file_saved",
            filename=filename,
            request_id=request_id,
            file_type=file_type
        )
        logger.info(msg)
    
    @staticmethod
    def log_response_sent(
        request_id: str,
        success: bool,
        error: Optional[str] = None
    ):
        """Log API response sent"""
        msg = RoadmapLogger._format_log(
            "response_sent",
            request_id=request_id,
            success=success,
            error=error
        )
        if success:
            logger.info(msg)
        else:
            logger.error(msg)
    
    @staticmethod
    def log_error(
        event: str,
        request_id: str,
        error: str,
        **kwargs: Any
    ):
        """Log error"""
        msg = RoadmapLogger._format_log(
            event,
            level="ERROR",
            request_id=request_id,
            error=error,
            **kwargs
        )
        logger.error(msg)
