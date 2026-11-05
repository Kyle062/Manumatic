from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from app.services.scanner import scanner
from typing import List, Dict
import time

router = APIRouter()

def generate_frames():
    while True:
        if scanner.latest_frame is not None:
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + scanner.latest_frame + b'\r\n')
        else:
            time.sleep(0.1)

@router.get("/cameras")
def get_cameras() -> List[Dict[str, str]]:
    return scanner.get_available_cameras()

@router.get("/start")
def start_scanner(camera_id: int = Query(0)):
    scanner.start(camera_id)
    return {"message": f"Camera {camera_id} started"}

@router.get("/stop")
def stop_scanner():
    scanner.stop()
    return {"message": "Camera stopped"}

@router.get("/video_feed")
def video_feed():
    return StreamingResponse(generate_frames(), media_type="multipart/x-mixed-replace; boundary=frame")

@router.get("/poll")
def barcodes():
    codes = scanner.get_new_barcodes()
    return {"barcodes": codes}