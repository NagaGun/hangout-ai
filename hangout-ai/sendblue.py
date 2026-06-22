"""
sendblue.py — Sendblue API client for LoopSync
"""
import os
import httpx
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("loopsync.sendblue")

SENDBLUE_API_KEY = os.getenv("SENDBLUE_API_KEY")
SENDBLUE_API_SECRET = os.getenv("SENDBLUE_API_SECRET")
SENDBLUE_BASE = "https://api.sendblue.co/api"


async def send_imessage(to: str, body: str) -> bool:
    """
    Send an iMessage via Sendblue. Returns True on success, False on failure.
    Raises no exceptions — failures are logged and swallowed so the webhook
    always returns 200 to Sendblue (preventing infinite retries).
    """
    if not SENDBLUE_API_KEY or not SENDBLUE_API_SECRET:
        logger.error("Sendblue credentials not configured")
        return False

    payload = {"number": to, "content": body, "send_style": "invisible"}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{SENDBLUE_BASE}/send-message",
                json=payload,
                headers={
                    "sb-api-key-id": SENDBLUE_API_KEY,
                    "sb-api-secret-key": SENDBLUE_API_SECRET,
                    "Content-Type": "application/json",
                },
            )
            resp.raise_for_status()
            logger.info("Sent iMessage to %s: %s", to, body[:60])
            return True
    except httpx.HTTPStatusError as e:
        logger.error("Sendblue HTTP error %s for %s: %s", e.response.status_code, to, e.response.text)
        return False
    except Exception as e:
        logger.error("Sendblue send failed for %s: %s", to, e)
        return False


async def send_to_group(phones: list[str], body: str):
    """Broadcast the same message to multiple numbers."""
    for phone in phones:
        await send_imessage(phone, body)
