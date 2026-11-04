import cv2
import numpy as np
import threading
import time
from typing import Optional, Any
from pyzbar.pyzbar import decode

class BarcodeScanner:
    def __init__(self) -> None:
        # ✅ FIX: Tell Python this can be None or a VideoCapture object
        self.cap: Optional[cv2.VideoCapture] = None
        self.is_running: bool = False
        self.detected_barcodes: list[str] = []
        self.lock = threading.Lock()
        self.latest_frame: Optional[bytes] = None

        self.visible_barcodes: dict[str, int] = {}
        self.MISS_LIMIT = 5

    def start(self) -> None:
        if self.is_running:
            return

        self.cap = cv2.VideoCapture(0)
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

        if not self.cap.isOpened():
            print("Cannot connect to camera!")
            return

        self.is_running = True
        self.thread = threading.Thread(target=self._scan_loop, daemon=True)
        self.thread.start()

    def stop(self) -> None:
        self.is_running = False
        if self.cap:
            self.cap.release()
            self.cap = None
        self.visible_barcodes.clear()
        self.latest_frame = None

    def get_new_barcodes(self) -> list[str]:
        with self.lock:
            codes = self.detected_barcodes.copy()
            self.detected_barcodes.clear()
            return codes

    def _scan_loop(self) -> None:
        # ✅ FIX: Safely check if self.cap exists before checking isOpened()
        while self.is_running and self.cap is not None and self.cap.isOpened():
            success, frame = self.cap.read()
            if not success:
                continue

            current_barcodes = {}

            full_results = decode(frame)

            for barcode in full_results:
                code = barcode.data.decode("utf-8")
                current_barcodes[code] = barcode.rect

            for code, rect in current_barcodes.items():
                x, y, w, h = rect

                cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 3)
                cv2.putText(
                    frame,
                    code,
                    (x, max(y - 10, 20)),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.8,
                    (0, 255, 0),
                    2,
                )

                if code not in self.visible_barcodes:
                    with self.lock:
                        self.detected_barcodes.append(code)

                self.visible_barcodes[code] = 0

            for code in list(self.visible_barcodes.keys()):
                if code not in current_barcodes:
                    self.visible_barcodes[code] += 1
                    if self.visible_barcodes[code] > self.MISS_LIMIT:
                        del self.visible_barcodes[code]

            ret, buffer = cv2.imencode(".jpg", frame)
            if ret:
                self.latest_frame = buffer.tobytes()

            time.sleep(0.03)

scanner = BarcodeScanner()