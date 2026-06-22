# LoopSync

**Zero-UI group scheduling over iMessage.** Text in, AI handles the rest — no app download needed.

```
📱 "plan dinner Saturday"
        ↓
   LoopSync AI
        ↓
📱 "Who's coming? Send numbers"
        ↓
   Invites friends, collects availability
        ↓
📱 "Saturday 7pm works for everyone! 🎉"
```

---

## Stack

| Layer | Tech |
|---|---|
| Webhook server | FastAPI + uvicorn |
| AI intent parsing | Claude Haiku (Anthropic) |
| Messaging | Sendblue (iMessage API) |
| Database | SQLite via aiosqlite |
| Local tunnel | ngrok |

---

## Setup

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Configure credentials
cp .env.example .env
# Edit .env with your Sendblue + Anthropic keys

# 3. Run the server
uvicorn main:app --reload

# 4. Expose locally with ngrok
ngrok http 8000
# Copy the https URL → paste into Sendblue webhook settings
```

---

## Architecture

```
📱 User iMessage
      │
      ▼
 Sendblue API ──webhook──► ngrok tunnel
                                │
                                ▼
                    FastAPI /webhook/imessage
                                │
                     ┌──────────┴──────────┐
                     │    route_message()   │
                     └──────────┬──────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
              ▼                 ▼                 ▼
       Participant?       get_session()      "Try LoopSync!"
       (invited user)     (state machine)    (onboarding)
              │                 │
              └────────┬────────┘
                       │
                       ▼
              Claude Haiku (parse_intent)
              → intent + extracted data
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
  start_scheduling  add_friends  provide_availability
          │            │            │
          └────────────┴────────────┘
                       │
                  SQLite (events, participants, sessions)
                       │
                  Sendblue → 📱 Reply
```

### Conversation state machine

```
idle ──"plan X"──► awaiting_friends ──phone numbers──► awaiting_availability
                                                              │
                                              everyone responds? ──yes──► idle
                                                              │
                                                    Claude suggests best time
                                                    → broadcast confirmation
```

---

## Testing locally

```bash
# Interactive simulator (no real SMS needed)
python test_webhook.py

# Single message
python test_webhook.py "plan movie night"
python test_webhook.py "Try LoopSync!"
```

---

## File structure

```
hangout-ai/
├── main.py          # FastAPI app, webhook handler, message router
├── ai_agent.py      # Claude intent parsing + time suggestion
├── scheduler.py     # Group scheduling flow (state transitions)
├── database.py      # Async SQLite (events, participants, sessions)
├── sendblue.py      # Sendblue API client
├── test_webhook.py  # Local dev simulator
├── requirements.txt
└── .env.example
```
