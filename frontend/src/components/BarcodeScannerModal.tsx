import { useEffect, useRef, useState, useCallback, FormEvent } from "react";
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
}: BarcodeScannerModalProps) {
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [camerasLoaded, setCamerasLoaded] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState("0");
  const [manualCode, setManualCode] = useState("");
  const [pendingPart, setPendingPart] = useState<Part | null>(null);
  const [notFound, setNotFound] = useState("");
  const [feedError, setFeedError] = useState("");
  const [confirming, setConfirming] = useState(false);

  // Refs keep the polling loop stable while still seeing the latest parts.
  const partsRef = useRef(parts);
  partsRef.current = parts;
  const waitingForDecision = useRef(false);

  // Reset local state each time the scanner is opened.
  useEffect(() => {
    if (!open) return;
    setPendingPart(null);
    waitingForDecision.current = false;
    setNotFound("");
    setManualCode("");
    setFeedError("");
    setConfirming(false);
  }, [open]);

  // Discover cameras.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    fetch(scannerUrl("/cameras"))
      .then((res) => res.json())
      .then((data: CameraDevice[]) => {
        if (cancelled) return;
        setCameras(Array.isArray(data) ? data : []);
        if (Array.isArray(data) && data.length > 0) {
          setSelectedCamera(data[0].id);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFeedError(
            "Camera list unavailable. You can still enter a barcode manually.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setCamerasLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  // Start the selected camera once the list has loaded (or failed).
  useEffect(() => {
    if (!open || !camerasLoaded) return;
    fetch(scannerUrl(`/start?camera_id=${encodeURIComponent(selectedCamera)}`))
      .then((res) => {
        if (!res.ok) throw new Error("camera start failed");
      })
      .catch(() => {
        setFeedError(
          "Could not start the camera. You can still enter a barcode manually.",
        );
      });
  }, [open, camerasLoaded, selectedCamera]);

  // Always release the camera when the modal closes or unmounts.
  useEffect(() => {
    if (!open) return;
    return () => {
      fetch(scannerUrl("/stop")).catch(() => {});
    };
  }, [open]);

  const handleCode = useCallback((raw: string) => {
    const code = raw.trim();
    if (!code) return;

    const part = partsRef.current.find(
      (p) =>
        p.part_number.trim().toLowerCase() === code.toLowerCase() ||
        p.name.trim().toLowerCase() === code.toLowerCase(),
    );

    if (!part) {
      setNotFound(`No part found for "${code}".`);
      return;
    }

    setNotFound("");
    setManualCode("");
    waitingForDecision.current = true;
    setPendingPart(part);
  }, []);

  // Poll for newly detected barcodes.
  useEffect(() => {
    if (!open) return;

    const interval = setInterval(async () => {
      if (waitingForDecision.current) return;
      try {
        const res = await fetch(scannerUrl("/poll"));
        const data = await res.json();
        const codes: string[] = Array.isArray(data?.barcodes)
          ? data.barcodes
          : [];
        for (const code of codes) {
          if (waitingForDecision.current) break;
          handleCode(String(code));
        }
      } catch {
        // Ignore transient polling failures.
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [open, handleCode]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const handleManualSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleCode(manualCode);
  };

  const handleConfirm = async () => {
    if (!pendingPart || confirming) return;
    setConfirming(true);
    try {
      const result = await onConfirm(pendingPart);
      if (result === false) return; // validation failed — keep the confirmation open
      waitingForDecision.current = false;
      setPendingPart(null);
      if (closeOnConfirm) onClose();
    } finally {
      setConfirming(false);
    }
  };

  const handleScanAgain = () => {
    waitingForDecision.current = false;
    setPendingPart(null);
    setNotFound("");
  };

  if (!open) return null;

  const feedSrc = `${PYTHON_API_URL}/scanner/video_feed?t=${Date.now()}`;

  return (
    <div className="modal-overlay scanner-overlay" onClick={onClose}>
      <div className="modal modal--scanner" onClick={(e) => e.stopPropagation()}>
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

            {error && (
              <div className="scanner-error" role="alert">
                {error}
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
                onChange={(e) => setSelectedCamera(e.target.value)}
                className="scanner-select"
                disabled={cameras.length === 0}
              >
                {cameras.length === 0 && (
                  <option value="0">No camera detected</option>
                )}
                {cameras.map((cam) => (
                  <option key={cam.id} value={cam.id}>
                    {cam.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="scanner-container">
              <img
                src={feedSrc}
                alt="Barcode scanner feed"
                className="scanner-video"
              />
              <p className="scanner-hint">
                Align the barcode within the camera view
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
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="e.g. PART-001"
                  autoComplete="off"
                />
                <button type="submit" className="btn-secondary">
                  Use code
                </button>
              </div>
            </form>

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
