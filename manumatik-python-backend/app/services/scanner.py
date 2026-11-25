"""
Scanner service: camera discovery, barcode decoding, and live preview.
"""

# 0.Dependencies - OpenCV, ZBar decoding, threading, and type hints.
import cv2
import numpy as np
import threading
import time
from typing import Optional, List, Dict
from pyzbar.pyzbar import decode


# 1.Scanner(State) - Holding the camera handle, code queue, lock, and preview frame.
class BarcodeScanner:
    # 1.1 Scanner(State) - Fields shared between the scan thread and HTTP routes.
    def __init__(self) -> None:
        self.cap: Optional[cv2.VideoCapture] = None
        self.is_running: bool = False
        self.detected_barcodes: List[str] = []
        self.lock = threading.Lock()
        self.latest_frame: Optional[bytes] = None
        self.visible_barcodes: Dict[str, int] = {}
        # 1.2.Scanner(Polling) - Ignore a code until it leaves view for 5 frames.
        self.MISS_LIMIT = 5

    # 2.Scanner(Camera) - Showing which cameras the user can choose from.
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

    # 3.Scanner(Camera) - Starting the webcam and its background decode thread.
    def start(self, camera_id: int = 0) -> None:
        if self.is_running:
            # 3.1.Scanner(Camera) - Restarting: stop old camera and wait for Windows to free it.
            self.stop()
            time.sleep(1)

        # 3.2.Scanner(Camera) - DirectShow avoids OpenCV webcam failures on Windows.
        self.cap = cv2.VideoCapture(camera_id, cv2.CAP_DSHOW)
        # 3.3.Scanner(Camera) - Cap resolution at 1080p to prevent lag.
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1920)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 1080)

        if not self.cap.isOpened():
            print(f"Cannot connect to camera {camera_id}!")
            self.cap = None
            return

        self.is_running = True
        # 3.4.Scanner(Camera) - Daemon thread cannot block process shutdown.
        self.thread = threading.Thread(target=self._scan_loop, daemon=True)
        self.thread.start()

    # 4.Scanner(Camera) - Stopping the webcam and clearing scan state.
    def stop(self) -> None:
        self.is_running = False
        if self.cap is not None:
            self.cap.release()
            self.cap = None
        self.visible_barcodes.clear()
        self.latest_frame = None

    # 5.Scanner(Polling) - Sending newly scanned codes to the POS/Inventory UI.
    def get_new_barcodes(self) -> List[str]:
        with self.lock:
            codes = self.detected_barcodes.copy()
            self.detected_barcodes.clear()
            return codes

    # 6.Scanner(Video Feed) - Decoding frames and showing the live preview.
    def _scan_loop(self) -> None:
        while self.is_running and self.cap is not None and self.cap.isOpened():
            success, frame = self.cap.read()
            if not success:
                # 6.1.Scanner(Camera) - A dropped frame is not a fatal error.
                time.sleep(0.1)
                continue

            # 6.2.Scanner(Polling) - Map each visible code to its bounding box.
            current_barcodes = {}
            full_results = decode(frame)

            for barcode in full_results:
                code = barcode.data.decode("utf-8")
                current_barcodes[code] = barcode.rect

            # 6.3.Scanner(Video Feed) - Draw green boxes/labels for user feedback.
            for code, rect in current_barcodes.items():
                x, y, w, h = rect
                cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 4)
                cv2.putText(frame, code, (x, max(y - 15, 30)), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 255, 0), 3)

                # 6.4.Scanner(Polling) - Queue a code only on its first appearance.
                if code not in self.visible_barcodes:
                    with self.lock:
                        self.detected_barcodes.append(code)

                self.visible_barcodes[code] = 0

            # 6.5.Scanner(Polling) - Forget codes after MISS_LIMIT absent frames.
            for code in list(self.visible_barcodes.keys()):
                if code not in current_barcodes:
                    self.visible_barcodes[code] += 1
                    if self.visible_barcodes[code] > self.MISS_LIMIT:
                        del self.visible_barcodes[code]

            # 6.6.Scanner(Video Feed) - Downscale to 720p JPEG for the React preview.
            stream_frame = cv2.resize(frame, (1280, 720))
            ret, buffer = cv2.imencode(".jpg", stream_frame)
            if ret:
                self.latest_frame = buffer.tobytes()

            # 6.7.Scanner(Video Feed) - Small delay caps CPU use at roughly 25 fps.
            time.sleep(0.04)


# 7.Scanner(State) - Share one camera and one decode thread across all routes.
scanner = BarcodeScanner()
