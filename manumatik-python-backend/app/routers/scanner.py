from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.services.scanner import scanner

router = APIRouter()

def generate_frames():
    while True:
        if scanner.latest_frame is not None:
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + scanner.latest_frame + b'\r\n')
        else:
            # Send a blank frame if camera is starting
            pass

@router.get("/start")
def start_scanner():
    scanner.start()
    return {"message": "Camera started"}

@router.get("/stop")
def stop_scanner():
    scanner.stop()
    return {"message": "Camera stopped"}

@router.get("/video_feed")
def video_feed():
    return StreamingResponse(generate_frames(), media_type="multipart/x-mixed-replace; boundary=frame")

@router.get("/poll")
def poll_barcodes():
    codes = scanner.get_new_barcodes()
    return {"barcodes": codes}