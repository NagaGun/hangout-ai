"""
scheduler.py — Group scheduling flow for LoopSync
Handles the multi-step state machine: collect friends → poll availability → resolve → confirm
"""
import json
import logging

from database import (
    create_event, add_participant, record_availability,
    get_event_participants, get_event, finalize_event,
    get_session, set_session,
)
from sendblue import send_imessage, send_to_group
from ai_agent import suggest_time

logger = logging.getLogger("loopsync.scheduler")


async def handle_start_scheduling(organizer: str, event_title: str) -> str:
    """Organizer wants to schedule a hangout. Create the event, move to awaiting_friends."""
    event_id = await create_event(organizer=organizer, title=event_title)
    ctx = {"event_id": event_id, "friends": []}
    await set_session(organizer, "awaiting_friends", json.dumps(ctx))
    return f"Let's plan {event_title}! Who's coming? Send me their numbers (e.g. +14155550100, +14085550199)"


async def handle_add_friends(organizer: str, friends: list[str], context: dict) -> str:
    """Organizer sent friend phone numbers. Invite them all and start polling."""
    event_id = context.get("event_id")
    if not event_id:
        await set_session(organizer, "idle")
        return "Something went wrong — let's start over. What do you want to plan?"

    event = await get_event(event_id)
    if not event:
        await set_session(organizer, "idle")
        return "I lost track of that event. Want to try again?"

    # Save participants
    for phone in friends:
        await add_participant(event_id, phone)

    # Invite each friend
    invite_msg = (
        f"Hey! {organizer} is using LoopSync to plan \"{event['title']}\". "
        f"When are you free this week? Just reply with your availability!"
    )
    await send_to_group(friends, invite_msg)

    # Also add organizer as participant and ask their availability
    await add_participant(event_id, organizer)
    ctx = {**context, "friends": friends, "pending": friends + [organizer]}
    await set_session(organizer, "awaiting_availability", json.dumps(ctx))

    names = ", ".join(friends)
    return f"Invited {len(friends)} friends! I'll collect everyone's availability. When are YOU free?"


async def handle_provide_availability(phone: str, availability: str, context: dict) -> str:
    """A participant sent their availability. Record it and check if everyone responded."""
    event_id = context.get("event_id")
    if not event_id:
        return "Hmm, I'm not sure which hangout this is for. Ask the organizer to re-invite you!"

    await record_availability(event_id, phone, availability)

    # Check if everyone has responded
    participants = await get_event_participants(event_id)
    pending = [p for p in participants if p["status"] == "invited"]

    if pending:
        remaining = len(pending)
        return f"Got it! Still waiting on {remaining} more friend{'s' if remaining > 1 else ''}..."

    # Everyone responded — find the best time
    event = await get_event(event_id)
    availabilities = [p["availability"] for p in participants if p["availability"]]

    best_time_msg = await suggest_time(availabilities, event["title"])

    # Confirm the event
    await finalize_event(event_id, best_time_msg)

    # Notify organizer's session is done
    organizer = event["organizer"]
    await set_session(organizer, "idle")

    # Notify all participants
    all_phones = [p["phone"] for p in participants]
    confirmation = f"🎉 Everyone's in! {best_time_msg}"
    await send_to_group(all_phones, confirmation)

    # Return something for the current responder too
    return confirmation


async def handle_participant_availability(phone: str, message: str) -> str | None:
    """
    Check if this phone number is a non-organizer participant awaiting availability.
    Returns a reply string if handled, None if not applicable.
    """
    # Look for any event where this person is an invited participant
    from database import DB_PATH
    import aiosqlite

    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            """
            SELECT p.event_id, e.title, e.organizer
            FROM participants p
            JOIN events e ON e.id = p.event_id
            WHERE p.phone = ? AND p.status = 'invited' AND e.status = 'pending'
            LIMIT 1
            """,
            (phone,),
        ) as cur:
            row = await cur.fetchone()

    if not row:
        return None

    event_id = row["event_id"]
    context = {"event_id": event_id}
    return await handle_provide_availability(phone, message, context)
