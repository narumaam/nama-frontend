"""
Centralised Anthropic client factory.

Routes calls through the Vercel AI Gateway when VERCEL_AI_GATEWAY_TEAM_ID and
VERCEL_AI_GATEWAY_NAME are set, otherwise falls back to the direct Anthropic API.

Usage:
    from app.core.ai_client import get_ai_client, get_async_ai_client

    client = get_ai_client()         # anthropic.Anthropic (sync)
    client = get_async_ai_client()   # anthropic.AsyncAnthropic (async)

Both functions accept an optional api_key override; by default they read
ANTHROPIC_API_KEY from the environment.
"""

import os
from typing import Optional

import anthropic


def _build_base_url() -> Optional[str]:
    """Return the Vercel AI Gateway base URL if env vars are configured, else None."""
    team_id = os.getenv("VERCEL_AI_GATEWAY_TEAM_ID")
    gateway_name = os.getenv("VERCEL_AI_GATEWAY_NAME", "nama-ai-gateway")
    if team_id and gateway_name:
        return f"https://gateway.ai.vercel.com/v1/{team_id}/{gateway_name}/anthropic"
    return None


def get_ai_client(api_key: Optional[str] = None) -> anthropic.Anthropic:
    """
    Return a synchronous Anthropic client.

    If VERCEL_AI_GATEWAY_TEAM_ID is set the client routes through the Vercel AI
    Gateway (same API key, different base URL).  Otherwise calls go directly to
    api.anthropic.com.
    """
    key = api_key or os.getenv("ANTHROPIC_API_KEY")
    base_url = _build_base_url()
    if base_url:
        return anthropic.Anthropic(api_key=key, base_url=base_url)
    return anthropic.Anthropic(api_key=key)


def get_async_ai_client(api_key: Optional[str] = None) -> anthropic.AsyncAnthropic:
    """
    Return an asynchronous Anthropic client.

    Same gateway routing logic as get_ai_client().
    """
    key = api_key or os.getenv("ANTHROPIC_API_KEY")
    base_url = _build_base_url()
    if base_url:
        return anthropic.AsyncAnthropic(api_key=key, base_url=base_url)
    return anthropic.AsyncAnthropic(api_key=key)
