"""
ai_agent.py — Gemini-powered intent parsing and scheduling logic for LoopSync
"""
import json
import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)

MODEL = "gemini-1.5-flash"  # fast + cheap for SMS flows

SYSTEM_PROMPT = """You are LoopSync, a friendly AI assistant that helps groups of friends coordinate hangouts over iMessage. You are concise — SMS-friendly replies only (under 160 chars when possible, 320 max). Be warm, casual, and use minimal punctuation.

You will receive a JSON object with:
- message: what the user sent
- state: current conversation state (idle | awaiting_friends | awaiting_availability)
- context: any in-progress session data

Respond ONLY with a valid JSON object (no markdown, no backticks) with these fields:
{
  "intent": one of [start_scheduling | add_friends | provide_availability | cancel | unknown | greeting],
  "reply": the SMS reply to send back to the user,
  "extracted": {
    "event_title": string or null,
    "friends": list of phone numbers (E.164) or null,
    "availability": free-text description of when they're free, or null,
    "proposed_time": ISO datetime string or null
  }
}

Rules:
- For start_scheduling: extract the event title from the message
- For add_friends: extract any phone numbers mentioned (normalize to +1XXXXXXXXXX format)
- For provide_availability: capture their availability as a plain string
- Keep replies casual and short. Never mention JSON or technical terms.
- If state is awaiting_friends and they list phone numbers, intent = add_friends
- If state is awaiting_availability and they describe when they're free, intent = provide_availability
- If unclear, ask one clarifying question
"""


async def parse_intent(message: str, state: str, context: dict | None) -> dict:
    """
    Send a user message to Gemini and get back structured intent + reply.
    Returns a dict with intent, reply, and extracted fields.
    """
    model = genai.GenerativeModel(
        model_name=MODEL,
        system_instruction=SYSTEM_PROMPT,
    )

    user_input = json.dumps({
        "message": message,
        "state": state,
        "context": context or {},
    })

    response = await model.generate_content_async(user_input)
    raw = response.text.strip()

    # Strip accidental markdown fences
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {
            "intent": "unknown",
            "reply": "Hmm, something went sideways on my end. Try again?",
            "extracted": {},
        }


async def suggest_time(availabilities: list[str], event_title: str) -> str:
    """
    Given a list of availability strings from all participants,
    ask Gemini to suggest a best meeting time.
    """
    prompt = f"""
Event: {event_title}
Participant availabilities:
{chr(10).join(f'- {a}' for a in availabilities)}

Suggest the single best time that works for everyone.
Reply with ONLY a short, friendly SMS message announcing the time (e.g. "Saturday 3pm works for everyone! 🎉").
Keep it under 160 chars.
"""
    model = genai.GenerativeModel(model_name=MODEL)
    response = await model.generate_content_async(prompt)
    return response.text.strip()