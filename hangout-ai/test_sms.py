from fastapi import APIRouter, HTTPException
from main import dispatch_loopsync_imessage

router = APIRouter()

@router.get("/test_sms")
async def send_test_sms(to_number: str = "9259845990"):
    """Send a simple test SMS to the provided phone number.
    Returns the HTTP status code from Sendblue.
    """
    try:
        status = await dispatch_loopsync_imessage(to_number, "✅ LoopSync test message works!")
        return {"status": "sent", "http_status": status}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
