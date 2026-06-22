"""
main.py — LoopSync FastAPI entry point
iMessage scheduling assistant powered by Claude + Sendblue
"""
import json
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from database import init_db, get_session, set_session
from sendblue import send_imessage
from ai_agent import parse_intent
from scheduler import (
    handle_start_scheduling,
    handle_add_friends,
    handle_provide_availability,
    handle_participant_availability,
)

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("loopsync")


# ── App lifecycle ─────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("LoopSync starting — initialising database...")
    await init_db()
    logger.info("Database ready.")
    yield
    logger.info("LoopSync shutting down.")


app = FastAPI(title="LoopSync", lifespan=lifespan)


# ── Schemas ───────────────────────────────────────────────────────────────────
class InboundMessage(BaseModel):
    number: str                  # sender's phone in E.164
    content: str
    is_outbound: bool = False
    status: str = ""
    message_handle: str = ""


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/healthz")
async def health():
    return {"status": "ok"}


# ── Webhook ───────────────────────────────────────────────────────────────────
@app.post("/webhook/imessage")
async def imessage_webhook(request: Request):
    """
    Main Sendblue webhook. All inbound iMessages land here.
    We always return 200 so Sendblue doesn't retry.
    """
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "bad json"}, status_code=400)

    # Ignore outbound echoes
    if body.get("is_outbound"):
        return JSONResponse({"stream": "processed"})

    phone: str = body.get("number", "").strip()
    message: str = body.get("content", "").strip()

    if not phone or not message:
        return JSONResponse({"stream": "processed"})

    logger.info("Inbound from %s: %r", phone, message)

    try:
        reply = await route_message(phone, message)
    except Exception as e:
        logger.exception("Unhandled error routing message from %s", phone)
        reply = "Something went wrong on my end — try again in a moment!"

    if reply:
        await send_imessage(phone, reply)

    return JSONResponse({"stream": "processed"})


# ── Message router ────────────────────────────────────────────────────────────
async def route_message(phone: str, message: str) -> str:
    """
    Route an inbound message through the scheduling state machine.
    Returns the reply string to send back.
    """
    # ── 1. Onboarding trigger ──────────────────────────────────────────────
    if "Try LoopSync!" in message:
        await set_session(phone, "idle")
        return (
            "Hey! 👋 I'm LoopSync — I help groups plan hangouts over iMessage. "
            "Just tell me what you want to plan (e.g. \"dinner Saturday\") and I'll handle the rest!"
        )

    # ── 2. Load session state ──────────────────────────────────────────────
    session = await get_session(phone)
    state = session.get("state", "idle")
    context_raw = session.get("context")
    context = json.loads(context_raw) if context_raw else {}

    # ── 3. Check if this person is a participant in someone else's event ───
    if state == "idle":
        participant_reply = await handle_participant_availability(phone, message)
        if participant_reply:
            return participant_reply

    # ── 4. Parse intent with Claude ────────────────────────────────────────
    parsed = await parse_intent(message, state, context)
    intent = parsed.get("intent", "unknown")
    extracted = parsed.get("extracted", {})
    ai_reply = parsed.get("reply", "")

    logger.info("Intent=%s state=%s phone=%s", intent, state, phone)

    # ── 5. State machine dispatch ──────────────────────────────────────────
    if intent == "start_scheduling":
        title = extracted.get("event_title") or "hangout"
        return await handle_start_scheduling(phone, title)

    elif intent == "add_friends" and state == "awaiting_friends":
        friends = extracted.get("friends") or []
        if not friends:
            return "I didn't catch any phone numbers — send them like: +14155550100, +14085550199"
        return await handle_add_friends(phone, friends, context)

    elif intent == "provide_availability" and state == "awaiting_availability":
        availability = extracted.get("availability") or message
        return await handle_provide_availability(phone, availability, context)

    elif intent == "cancel":
        await set_session(phone, "idle")
        return "No worries — cancelled! Text me when you want to plan something 🙌"

    elif intent == "greeting":
        return ai_reply or "Hey! Tell me what you'd like to plan and I'll get the crew organized 🗓"

    else:
        # Fallback: echo Claude's reply or a default
        return ai_reply or (
            "I'm not sure what to do with that. Try: \"plan movie night\" to start scheduling!"
        )
