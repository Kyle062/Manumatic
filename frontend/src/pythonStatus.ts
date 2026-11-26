/// <reference types="vite/client" />

export type PythonStatus = {
  ok: boolean;
  error?: string;
  at?: number;
};

type Listener = (status: PythonStatus) => void;

const listeners = new Set<Listener>();
let current: PythonStatus | null = null;

function renderBanner() {
  const existing = document.getElementById("python-status-banner");

  if (!current || current.ok) {
    existing?.remove();
    return;
  }

  const banner = existing ?? document.createElement("div");
  if (!existing) {
    banner.id = "python-status-banner";
    banner.style.cssText = [
      "position:fixed",
      "right:16px",
      "bottom:16px",
      "z-index:99999",
      "max-width:min(520px,calc(100vw - 32px))",
      "max-height:40vh",
      "overflow:auto",
      "padding:12px 16px",
      "border-radius:8px",
      "background:#7f1d1d",
      "color:#fff",
      "font:12px/1.5 ui-monospace,Consolas,monospace",
      "white-space:pre-wrap",
      "box-shadow:0 8px 24px rgba(0,0,0,.28)",
    ].join(";");
    document.body.appendChild(banner);
  }

  banner.textContent = `Python error — the code you just saved did not load:\n\n${
    current.error || "Unknown Python error"
  }`;
}

if (import.meta.hot) {
  import.meta.hot.on("python-status", (status: PythonStatus) => {
    current = status;
    listeners.forEach((listener) => listener(status));
    renderBanner();
  });
}

export function onPythonStatus(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getPythonStatus(): PythonStatus | null {
  return current;
}
