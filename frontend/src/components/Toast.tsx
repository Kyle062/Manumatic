import { useEffect } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import "./Toast.css";

export type ToastType = "success" | "error" | "info";

export interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

export default function Toast({
  message,
  type = "info",
  duration = 3500,
  onClose,
}: ToastProps) {
  useEffect(() => {
    if (duration <= 0) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const Icon =
    type === "success"
      ? CheckCircle2
      : type === "error"
      ? AlertCircle
      : Info;

  return (
    <div className={`toast toast--${type}`} role="status" aria-live="polite">
      <span className="toast__icon">
        <Icon size={18} />
      </span>
      <span className="toast__message">{message}</span>
      <button
        type="button"
        className="toast__close"
        onClick={onClose}
        aria-label="Close"
      >
        <X size={14} />
      </button>
    </div>
  );
}