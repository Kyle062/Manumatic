import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";

// The Python dev runner writes frontend/python-status.json after every
// restart. Forward it to the browser so pages can refetch or show errors.
function pythonStatusBridge(): Plugin {
  return {
    name: "python-status-bridge",
    configureServer(server) {
      const statusPath = path.resolve(process.cwd(), "python-status.json");
      let timer: ReturnType<typeof setTimeout> | undefined;

      const send = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          try {
            const status = JSON.parse(fs.readFileSync(statusPath, "utf8"));
            server.ws.send({ type: "custom", event: "python-status", data: status });
          } catch {
            // The file may be mid-write; the next event will pick it up.
          }
        }, 150);
      };

      const onFile = (file: string) => {
        if (path.resolve(file) === statusPath) send();
      };

      server.watcher.on("change", onFile);
      server.watcher.on("add", onFile);
    },
  };
}

export default defineConfig({
  plugins: [react(), pythonStatusBridge()],
  server: {
    port: 5173,
  },
});
