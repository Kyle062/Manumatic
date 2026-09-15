import { AlertTriangle, X } from "lucide-react";
import "./ConfirmDialog.css";

export interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-header">
          <div className={`confirm-icon confirm-icon--${variant}`}>
            <AlertTriangle size={20} />
          </div>
          <button
            type="button"
            className="confirm-close"
            onClick={onCancel}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="confirm-body">
          <h3 className="confirm-title">{title}</h3>
          <p className="confirm-message">{message}</p>
        </div>

        <div className="confirm-actions">
          <button
            type="button"
            className="confirm-btn confirm-btn--secondary"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`confirm-btn confirm-btn--${
              variant === "danger" ? "danger" : "primary"
            }`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Please wait..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}