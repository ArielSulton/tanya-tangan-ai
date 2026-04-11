"""
Rate limiting middleware for API protection
"""

import logging
import time
from typing import Dict

from app.core.config import settings
from fastapi import Request, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

logger = logging.getLogger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware to prevent abuse
    """

    def __init__(self, app):
        super().__init__(app)
        self.memory_store: Dict[str, Dict[str, int]] = {}

    async def dispatch(self, request: Request, call_next):
        """
        Apply rate limiting to requests
        """

        # Get client identifier
        client_id = self._get_client_id(request)

        # Check rate limit
        if not await self._check_rate_limit(client_id, request.url.path):
            return Response(
                content="Rate limit exceeded. Please try again later.",
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                headers={
                    "Retry-After": str(settings.RATE_LIMIT_WINDOW),
                    "X-RateLimit-Limit": str(settings.RATE_LIMIT_REQUESTS),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(
                        int(time.time()) + settings.RATE_LIMIT_WINDOW
                    ),
                },
            )

        response = await call_next(request)
        return response

    def _get_client_id(self, request: Request) -> str:
        """
        Get client identifier for rate limiting
        """
        # Use session ID if available, otherwise fall back to IP
        session_id = request.headers.get("X-Session-Id")
        if session_id:
            return f"session:{session_id}"

        # Get client IP
        client_ip = request.client.host
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()

        return f"ip:{client_ip}"

    async def _check_rate_limit(self, client_id: str, path: str) -> bool:
        """
        Check if request is within rate limit
        """
        current_time = int(time.time())
        window_start = current_time - settings.RATE_LIMIT_WINDOW

        # Different limits for different endpoints
        limit = self._get_endpoint_limit(path)

        return self._check_memory_rate_limit(
            client_id, current_time, window_start, limit
        )

    def _get_endpoint_limit(self, path: str) -> int:
        """
        Get rate limit for specific endpoint
        """
        # Gesture recognition endpoints have higher limits
        if "/gesture" in path:
            return settings.RATE_LIMIT_REQUESTS * 2

        # AI/RAG endpoints have lower limits
        if "/rag" in path or "/question" in path:
            return settings.RATE_LIMIT_REQUESTS // 2

        # Admin endpoints have very low limits
        if "/admin" in path:
            return settings.RATE_LIMIT_REQUESTS // 4

        return settings.RATE_LIMIT_REQUESTS

    def _check_memory_rate_limit(
        self, client_id: str, current_time: int, window_start: int, limit: int
    ) -> bool:
        """
        Check rate limit using memory store
        """
        if client_id not in self.memory_store:
            self.memory_store[client_id] = {}

        # Clean old entries
        client_requests = self.memory_store[client_id]
        self.memory_store[client_id] = {
            timestamp: count
            for timestamp, count in client_requests.items()
            if int(timestamp) > window_start
        }

        # Add current request
        self.memory_store[client_id][str(current_time)] = 1

        # Check limit
        request_count = len(self.memory_store[client_id])
        return request_count <= limit
