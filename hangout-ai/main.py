import os
from dotenv import load_dotenv
from fastapi import FastAPI, Request, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
import httpx

# Load .env file so real credentials override the fallback mock values
load_dotenv()

app = FastAPI(
    title="LoopSync_Core_Engine",
    description="Asynchronous multi-agent infrastructure for conversational zero-UI group scheduling."
)

# --- CONFIGURATION (Populated from your local environment variables) ---
SENDBLUE_API_KEY = os.getenv("SENDBLUE_API_KEY", "sb_test_mock_key")
SENDBLUE_API_SECRET = os.getenv("SENDBLUE_API_SECRET", "sb_secret_mock_key")
AI_API_KEY = os.getenv("AI_API_KEY", "ai_free_tier_key")

# --- LOOPSYNC INBOUND NETWORK SCHEMAS ---
class LoopSyncInboundWebhook(BaseModel):
    account_id: str
    number: str          # The shared Sendblue sandbox number
    from_number: str     # The user texting LoopSync
    text: str            # Raw message payload text
    date_sent: str

class LoopSyncOutboundPayload(BaseModel):
    to_number: str
    content: str

# --- ASYNC MESSAGING ENGINE ---
async def dispatch_loopsync_imessage(to_number: str, message: str) -> int:
    """Fires an asynchronous HTTP POST call to route outbound text streams via Sendblue."""
    url = "https://api.sendblue.co/api/send-message"
    headers = {
        "sb-api-key-id": SENDBLUE_API_KEY,
        "sb-api-secret-key": SENDBLUE_API_SECRET,
        "Content-Type": "application/json"
    }
    payload = {
        "number": to_number,
        "content": message
    }
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload, headers=headers)
            return response.status_code
        except httpx.RequestError as exc:
            print(f"An error occurred while requesting {exc.request.url!r}.")
            return 500

# --- HEALTH CHECK ---
@app.get("/healthz", status_code=status.HTTP_200_OK)
async def health_check():
    return {"status": "ok", "service": "LoopSync_Core_Engine"}

# --- INTENT INGESTION ROUTER ---
@app.post("/webhook/imessage", status_code=status.HTTP_200_OK)
async def handle_loopsync_webhook(payload: LoopSyncInboundWebhook):
    raw_text = payload.text.strip()
    sender = payload.from_number

    print(f"[LoopSync Inbound Data Stream] From: {sender} | Packet: '{raw_text}'")

    # 1. Catch browser-triggered onboarding handshake
    if "Try LoopSync!" in raw_text:
        welcome_backbone = (
            "Hey! Welcome to LoopSync. Let's skip the endless group chat scheduling loop. "
            "What hangout plan are we setting up, and what are the phone numbers of your friends?"
        )
        await dispatch_loopsync_imessage(sender, welcome_backbone)
        return {"status": "loopsync_lifecycle_initialized"}

    # 2. Sequential State Routing Engine
    # TODO: Connect to Groq/Gemini API to isolate parameters and evaluate individual user availability states.

    return {"status": "stream_processed"}
