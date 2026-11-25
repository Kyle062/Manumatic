import { useEffect, useRef, useState, FormEvent } from "react";
import { CheckCircle2, X } from "lucide-react";
import { Part } from "../types";
import { PYTHON_API_URL } from "../services/api";
import "./BarcodeScannerModal.css";

interface BarcodeScannerModalProps {
  open: boolean;
  onClose: () => void;
  parts: Part[];
  onConfirm: (part: Part) => void | boolean | Promise<void | boolean>;
  closeOnConfirm?: boolean;
  title?: string;
  confirmLabel?: string;
  confirmHint?: string;
  error?: string;

  // Automatically call onConfirm for every recognized code.
  autoAdd?: boolean;
}

interface CameraDevice {
  id: string;
  name: string;
}

const scannerUrl = (path: string) => `${PYTHON_API_URL}/scanner${path}`;

const money = (value: number) =>
  "₱" +
  Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function BarcodeScannerModal({
  open,
  onClose,
  parts,
  onConfirm,
  closeOnConfirm = false,
  title = "Scan Barcode",
  confirmLabel = "Use this part",
  confirmHint,
  error,
  autoAdd = false,
}: BarcodeScannerModalProps) {
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [camerasLoaded, setCamerasLoaded] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState("0");

  const [manualCode, setManualCode] = useState("");
  const [pendingPart, setPendingPart] = useState<Part | null>(null);
  const [notFound, setNotFound] = useState("");
  const [feedError, setFeedError] = useState("");
  const [status, setStatus] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [feedSrc, setFeedSrc] = useState("");

  const partsRef = useRef(parts);
  const onConfirmRef = useRef(onConfirm);
  const onCloseRef = useRef(onClose);
  const openRef = useRef(open);

  // Codes waiting for processing, including codes from the same poll.
  const codeQueue = useRef<string[]>([]);
  const processingQueue = useRef(false);
  const waitingForDecision = useRef(false);

  partsRef.current = parts;
  onConfirmRef.current = onConfirm;
  onCloseRef.current = onClose;
  openRef.current = open;

  // Used to process queued codes again after a confirmation.
  const processQueueRef = useRef<() => Promise<void>>(async () => {});

  processQueueRef.current = async () => {
    if (processingQueue.current || waitingForDecision.current) return;

    processingQueue.current = true;

    try {
      while (
        openRef.current &&
        !waitingForDecision.current &&
        codeQueue.current.length > 0
      ) {
        const code = codeQueue.current.shift()?.trim();

        if (!code) continue;

        const part = partsRef.current.find(
          (p) =>
            p.part_number.trim().toLowerCase() === code.toLowerCase() ||
            p.name.trim().toLowerCase() === code.toLowerCase(),
        );

        if (!part) {
          setNotFound(`No part found for "${code}".`);
          continue;
        }

        setNotFound("");

        if (autoAdd) {
          try {
            const result = await onConfirmRef.current(part);

            if (!openRef.current) return;

            if (result === false) {
              setStatus(`Could not add "${part.name}".`);
            } else {
              setStatus(`Processed: ${part.name}`);
            }
          } catch (err) {
            console.error("Failed to process scanned part:", err);

            if (openRef.current) {
              setStatus(`Could not process "${part.name}".`);
            }
          }
        } else {
          waitingForDecision.current = true;
          setPendingPart(part);
        }
      }
    } finally {
      processingQueue.current = false;
    }
  };

  const enqueueCodes = (codes: string[]) => {
    const validCodes = codes
      .map((code) => String(code).trim())
      .filter(Boolean);

    codeQueue.current.push(...validCodes);
    void processQueueRef.current();
  };

  // Reset state and discover cameras when opening the modal.
  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    codeQueue.current = [];
    waitingForDecision.current = false;

    setPendingPart(null);
    setNotFound("");
    setManualCode("");
    setFeedError("");
    setStatus("");
    setConfirming(false);
    setCameras([]);
    setCamerasLoaded(false);
    setFeedSrc("");

    const loadCameras = async () => {
      try {
        const res = await fetch(scannerUrl("/cameras"));

        if (!res.ok) {
          throw new Error(`Camera list failed: HTTP ${res.status}`);
        }

        const data: unknown = await res.json();

        if (cancelled) return;

        const devices = Array.isArray(data) ? (data as CameraDevice[]) : [];

        setCameras(devices);

        if (devices.length > 0) {
          setSelectedCamera(devices[0].id);
        } else {
          setFeedError(
            "No camera detected. You can still enter a barcode manually.",
          );
        }
      } catch (err) {
        console.error("Failed to discover cameras:", err);

        if (!cancelled) {
          setFeedError(
            "Camera list unavailable. You can still enter a barcode manually.",
          );
        }
      } finally {
        if (!cancelled) setCamerasLoaded(true);
      }
    };

    void loadCameras();

    return () => {
      cancelled = true;
      codeQueue.current = [];
      waitingForDecision.current = false;
    };
  }, [open]);

  // Start the selected camera.
  useEffect(() => {
    if (!open || !camerasLoaded || cameras.length === 0) return;

    let cancelled = false;

    const startCamera = async () => {
      setFeedError("");
      setFeedSrc("");

      try {
        const res = await fetch(
          scannerUrl(`/start?camera_id=${encodeURIComponent(selectedCamera)}`),
        );

        if (!res.ok) {
          const body = await res.text();
          throw new Error(`HTTP ${res.status}: ${body}`);
        }

        if (!cancelled) {
          // Change the URL only when starting a camera, not on every render.
          setFeedSrc(scannerUrl(`/video_feed?t=${Date.now()}`));
        }
      } catch (err) {
        console.error("Failed to start camera:", err);

        if (!cancelled) {
          setFeedError(
            "Could not start the camera. You can still enter a barcode manually.",
          );
        }
      }
    };

    void startCamera();

    return () => {
      cancelled = true;
    };
  }, [open, camerasLoaded, cameras.length, selectedCamera]);

  // Release the camera when the modal closes or unmounts.
  useEffect(() => {
    if (!open) return;

    return () => {
      fetch(scannerUrl("/stop")).catch((err) => {
        console.error("Failed to stop camera:", err);
      });
    };
  }, [open]);

  // Poll sequentially so requests cannot overlap.
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const res = await fetch(scannerUrl("/poll"));

        if (!res.ok) {
          throw new Error(`Polling failed: HTTP ${res.status}`);
        }

        const data = await res.json();

        if (!cancelled && Array.isArray(data?.barcodes)) {
          enqueueCodes(data.barcodes.map(String));
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Scanner polling error:", err);
        }
      } finally {
        if (!cancelled) {
          timer = setTimeout(poll, 1000);
        }
      }
    };

    void poll();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const handleManualSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const code = manualCode.trim();
    if (!code) return;

    enqueueCodes([code]);
    setManualCode("");
  };

  const handleConfirm = async () => {
    if (!pendingPart || confirming) return;

    setConfirming(true);

    try {
      const result = await onConfirmRef.current(pendingPart);

      if (result === false) return;

      waitingForDecision.current = false;
      setPendingPart(null);

      if (closeOnConfirm) {
        onCloseRef.current();
      } else {
        void processQueueRef.current();
      }
    } catch (err) {
      console.error("Failed to confirm part:", err);
      setNotFound("Could not process this part. Please try again.");
    } finally {
      setConfirming(false);
    }
  };

  const handleScanAgain = () => {
    waitingForDecision.current = false;
    setPendingPart(null);
    setNotFound("");
    void processQueueRef.current();
  };

  if (!open) return null;

  return (
    <div className="modal-overlay scanner-overlay" onClick={onClose}>
      <div
        className="modal modal--scanner"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{pendingPart ? "Part Found" : title}</h2>

          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close scanner"
          >
            <X size={18} />
          </button>
        </div>

        {pendingPart ? (
          <div className="scanner-confirm">
            <div className="scanner-found-badge">
              <CheckCircle2 size={16} /> Barcode recognized
            </div>

            {confirmHint && (
              <p className="scanner-confirm-hint">{confirmHint}</p>
            )}

            {(error || notFound) && (
              <div className="scanner-error" role="alert">
                {error || notFound}
              </div>
            )}

            <div className="scanner-part-card">
              <div className="scanner-part-card__top">
                <span className="scanner-part-number">
                  {pendingPart.part_number}
                </span>

                <span
                  className={`scanner-part-stock ${
                    pendingPart.quantity <= pendingPart.reorder_level
                      ? "is-low"
                      : ""
                  }`}
                >
                  {pendingPart.quantity} in stock
                </span>
              </div>

              <h3 className="scanner-part-name">{pendingPart.name}</h3>

              <div className="scanner-part-grid">
                <div>
                  <span>Category</span>
                  <strong>{pendingPart.category || "—"}</strong>
                </div>
                <div>
                  <span>Supplier</span>
                  <strong>{pendingPart.supplier || "—"}</strong>
                </div>
                <div>
                  <span>Selling price</span>
                  <strong>{money(Number(pendingPart.price))}</strong>
                </div>
                <div>
                  <span>Cost / Markup</span>
                  <strong>
                    {money(Number(pendingPart.cost_price))} /{" "}
                    {pendingPart.markup_percent ?? 0}%
                  </strong>
                </div>
                <div>
                  <span>Reorder level</span>
                  <strong>{pendingPart.reorder_level}</strong>
                </div>
                <div>
                  <span>Location</span>
                  <strong>{pendingPart.location || "—"}</strong>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleScanAgain}
                disabled={confirming}
              >
                Scan again
              </button>

              <button
                type="button"
                className="btn-primary"
                onClick={handleConfirm}
                disabled={confirming}
              >
                <CheckCircle2 size={15} />{" "}
                {confirming ? "Applying..." : confirmLabel}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="scanner-controls">
              <label htmlFor="scanner-camera-select">Camera:</label>

              <select
                id="scanner-camera-select"
                value={selectedCamera}
                onChange={(event) => setSelectedCamera(event.target.value)}
                className="scanner-select"
                disabled={cameras.length === 0}
              >
                {cameras.length === 0 && (
                  <option value="0">No camera detected</option>
                )}

                {cameras.map((camera) => (
                  <option key={camera.id} value={camera.id}>
                    {camera.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="scanner-container">
              {feedSrc && (
                <img
                  src={feedSrc}
                  alt="Barcode scanner feed"
                  className="scanner-video"
                />
              )}

              <p className="scanner-hint">
                {autoAdd
                  ? "Show QR codes or barcodes to the camera to add matching parts."
                  : "Align the barcode within the camera view."}
              </p>
            </div>

            <form className="scanner-manual" onSubmit={handleManualSubmit}>
              <label htmlFor="scanner-manual-code">
                Or enter a barcode manually
              </label>

              <div className="scanner-manual__row">
                <input
                  id="scanner-manual-code"
                  type="text"
                  value={manualCode}
                  onChange={(event) => setManualCode(event.target.value)}
                  placeholder="e.g. PART-001"
                  autoComplete="off"
                />

                <button type="submit" className="btn-secondary">
                  Use code
                </button>
              </div>
            </form>

            {status && <p role="status">{status}</p>}

            {(notFound || feedError || error) && (
              <div className="scanner-error" role="alert">
                {notFound || feedError || error}
              </div>
            )}

            <div className="modal-actions scanner-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
              >
                Close Camera
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}