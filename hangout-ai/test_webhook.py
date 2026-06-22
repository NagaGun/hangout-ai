"""
test_webhook.py — Simulate inbound iMessages for local development
Usage:
    python test_webhook.py                  # interactive prompt
    python test_webhook.py "plan dinner"    # send a single message
"""
import sys
import asyncio
import httpx

BASE_URL = "http://localhost:8000"
TEST_PHONE = "+14155550100"  # fake sender


async def send(message: str, phone: str = TEST_PHONE):
    payload = {
        "number": phone,
        "content": message,
        "is_outbound": False,
        "status": "delivered",
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(f"{BASE_URL}/webhook/imessage", json=payload)
        print(f"→ [{resp.status_code}] {resp.text}")


async def main():
    if len(sys.argv) > 1:
        await send(" ".join(sys.argv[1:]))
        return

    print(f"LoopSync webhook simulator — sending as {TEST_PHONE}")
    print("Type a message and press Enter. Ctrl+C to quit.\n")
    while True:
        try:
            msg = input("you: ").strip()
            if msg:
                await send(msg)
        except (KeyboardInterrupt, EOFError):
            print("\nDone.")
            break


if __name__ == "__main__":
    asyncio.run(main())
