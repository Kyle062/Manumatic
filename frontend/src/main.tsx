import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./pythonStatus";
import "./styles/global.css";
import "./styles/responsive.css"; // last so breakpoint overrides win

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
