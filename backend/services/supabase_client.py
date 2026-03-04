"""Supabase admin client utilities."""

from __future__ import annotations

from supabase import Client, create_client

from app.core.config import settings


_client: Client | None = None


def get_supabase_admin_client() -> Client:
    global _client
    if _client is None:
        if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
            raise ValueError("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set")
        _client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    return _client
