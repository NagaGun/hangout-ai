"""
database.py — async SQLite layer for LoopSync
"""
import aiosqlite
from pathlib import Path

DB_PATH = Path("loopsync.db")


async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                phone       TEXT PRIMARY KEY,
                name        TEXT,
                created_at  TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS events (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                organizer   TEXT NOT NULL,
                title       TEXT NOT NULL,
                description TEXT,
                proposed_dt TEXT,
                status      TEXT DEFAULT 'pending',
                created_at  TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS participants (
                event_id    INTEGER NOT NULL REFERENCES events(id),
                phone       TEXT NOT NULL,
                status      TEXT DEFAULT 'invited',   -- invited | available | unavailable
                availability TEXT,                     -- free-text or JSON slot list
                PRIMARY KEY (event_id, phone)
            );

            CREATE TABLE IF NOT EXISTS sessions (
                phone       TEXT PRIMARY KEY,
                state       TEXT DEFAULT 'idle',       -- idle | awaiting_friends | awaiting_availability
                context     TEXT,                      -- JSON blob for in-progress flow
                updated_at  TEXT DEFAULT (datetime('now'))
            );
        """)
        await db.commit()


async def get_session(phone: str) -> dict:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM sessions WHERE phone = ?", (phone,)
        ) as cur:
            row = await cur.fetchone()
            return dict(row) if row else {"phone": phone, "state": "idle", "context": None}


async def set_session(phone: str, state: str, context: str | None = None):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """
            INSERT INTO sessions (phone, state, context, updated_at)
            VALUES (?, ?, ?, datetime('now'))
            ON CONFLICT(phone) DO UPDATE SET
                state = excluded.state,
                context = excluded.context,
                updated_at = excluded.updated_at
            """,
            (phone, state, context),
        )
        await db.commit()


async def create_event(organizer: str, title: str, description: str = None, proposed_dt: str = None) -> int:
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute(
            "INSERT INTO events (organizer, title, description, proposed_dt) VALUES (?, ?, ?, ?)",
            (organizer, title, description, proposed_dt),
        )
        await db.commit()
        return cur.lastrowid


async def add_participant(event_id: int, phone: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT OR IGNORE INTO participants (event_id, phone) VALUES (?, ?)",
            (event_id, phone),
        )
        await db.commit()


async def record_availability(event_id: int, phone: str, availability: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """
            UPDATE participants SET status = 'available', availability = ?
            WHERE event_id = ? AND phone = ?
            """,
            (availability, event_id, phone),
        )
        await db.commit()


async def get_event_participants(event_id: int) -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM participants WHERE event_id = ?", (event_id,)
        ) as cur:
            return [dict(r) for r in await cur.fetchall()]


async def get_event(event_id: int) -> dict | None:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM events WHERE id = ?", (event_id,)) as cur:
            row = await cur.fetchone()
            return dict(row) if row else None


async def finalize_event(event_id: int, confirmed_dt: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE events SET status = 'confirmed', proposed_dt = ? WHERE id = ?",
            (confirmed_dt, event_id),
        )
        await db.commit()
