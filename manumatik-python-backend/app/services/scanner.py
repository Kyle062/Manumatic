import cv2
import numpy as np
import threading
import time
from typing import Optional, List, Dict
from pyzbar.pyzbar import decode

class BarcodeScanner:
    def __init__(self) -> None:
        self.cap: Optional[cv2.VideoCapture] = None
        self.is_running: bool = False
        self.detected_barcodes: List[str] = []
        self.lock = threading.Lock()
        self.latest_frame: Optional[bytes] = None
        self.visible_barcodes: Dict[str, int] = {}
        self.MISS_LIMIT = 5

    def get_available_cameras(self) -> List[Dict[str, str]]:
        available_cameras = []
        for i in range(5):
            cap = cv2.VideoCapture(i)
            if cap.isOpened():
                available_cameras.append({
                    "id": str(i),
                    "name": f"Camera {i} {'(Default)' if i == 0 else '(External)'}"
                })
                cap.release()
        return available_cameras

    def start(self, camera_id: int = 0) -> None:
        if self.is_running:
            self.stop()
            time.sleep(1) # Wait for camera to release

        self.cap = cv2.VideoCapture(camera_id, cv2.CAP_DSHOW) # Force DirectShow for Windows
        # ✅ Reduced to 1080p to stop the system from lagging
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1920)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 1080)

        if not self.cap.isOpened():
            print(f"Cannot connect to camera {camera_id}!")
            self.cap = None
            return

        self.is_running = True
        self.thread = threading.Thread(target=self._scan_loop, daemon=True)
        self.thread.start()

    def stop(self) -> None:
        self.is_running = False
        if self.cap is not None:
            self.cap.release()
            self.cap = None
        self.visible_barcodes.clear()
        self.latest_frame = None

    def get_new_barcodes(self) -> List[str]:
        with self.lock:
            codes = self.detected_barcodes.copy()
            self.detected_barcodes.clear()
            return codes

    def _scan_loop(self) -> None:
        while self.is_running and self.cap is not None and self.cap.isOpened():
            success, frame = self.cap.read()
            if not success:
                time.sleep(0.1)
                continue

            current_barcodes = {}
            full_results = decode(frame)

            for barcode in full_results:
                code = barcode.data.decode("utf-8")
                current_barcodes[code] = barcode.rect

            for code, rect in current_barcodes.items():
                x, y, w, h = rect
                cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 4)
                cv2.putText(frame, code, (x, max(y - 15, 30)), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 255, 0), 3)

                if code not in self.visible_barcodes:
                    with self.lock:
                        self.detected_barcodes.append(code)

                self.visible_barcodes[code] = 0

            for code in list(self.visible_barcodes.keys()):
                if code not in current_barcodes:
                    self.visible_barcodes[code] += 1
                    if self.visible_barcodes[code] > self.MISS_LIMIT:
                        del self.visible_barcodes[code]

            # Resize to 720p for streaming to React
            stream_frame = cv2.resize(frame, (1280, 720))
            ret, buffer = cv2.imencode(".jpg", stream_frame)
            if ret:
                self.latest_frame = buffer.tobytes()

            time.sleep(0.04) # Slight delay to prevent CPU max-out

scanner = BarcodeScanner()