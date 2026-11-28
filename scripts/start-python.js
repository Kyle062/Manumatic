const { spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const serviceDir = path.join(__dirname, "..", "manumatik-python-backend");
const statusPath = path.join(__dirname, "..", "frontend", "python-status.json");
const venvPython =
  process.platform === "win32"
    ? path.join(serviceDir, "venv", "Scripts", "python.exe")
    : path.join(serviceDir, "venv", "bin", "python");

// Prefer the project's venv so installed dependencies are found.
const interpreter = fs.existsSync(venvPython) ? venvPython : "python";
const isWindows = process.platform === "win32";
const port = process.env.PYTHON_PORT || "8000";
const ignoredDirs = new Set(["venv", "__pycache__", ".git", "node_modules"]);

let child = null;
let watcher = null;
let debounceTimer = null;
let stopping = false;
let generation = 0;
let stderrTail = "";

console.log(`[PYTHON] Using interpreter: ${interpreter}`);

function writeStatus(status) {
  try {
    fs.writeFileSync(
      statusPath,
      JSON.stringify({ ...status, at: Date.now() }, null, 2),
    );
  } catch (error) {
    console.error(`[PYTHON] Could not write status file: ${error.message}`);
  }
}

function readableError() {
  const lines = stderrTail
    .split(/\r?\n/)
    .filter((line) =>
      /Traceback|Error|Exception|SyntaxError|ImportError|ModuleNotFound|line \d+/i.test(
        line,
      ),
    );
  return (lines.length ? lines.slice(-12).join("\n") : stderrTail).trim();
}

function waitUntilReady(target, gen) {
  let settled = false;
  const deadline = Date.now() + 10000;

  const finish = (status) => {
    if (settled || stopping || gen !== generation || child !== target) return;
    settled = true;
    writeStatus(status);
  };

  const schedule = () => {
    if (settled || stopping || gen !== generation || child !== target) return;
    if (Date.now() >= deadline) {
      finish({
        ok: false,
        error: readableError() || "Python service did not become ready in time.",
      });
      return;
    }
    setTimeout(tryOnce, 250);
  };

  const tryOnce = () => {
    if (settled || stopping || gen !== generation || child !== target) return;
    if (target.exitCode !== null || target.signalCode !== null) return;

    const request = http.get(`http://127.0.0.1:${port}/health`, (response) => {
      response.resume();
      if (response.statusCode === 200) finish({ ok: true });
      else schedule();
    });
    request.on("error", schedule);
    request.setTimeout(500, () => request.destroy());
  };

  tryOnce();
}

function startServer() {
  if (stopping) return;

  const gen = ++generation;
  stderrTail = "";

  console.log(`[PYTHON] Starting uvicorn on port ${port}`);

  const proc = spawn(
    interpreter,
    ["-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", port],
    { cwd: serviceDir, stdio: ["inherit", "inherit", "pipe"] },
  );
  child = proc;

  proc.stderr.on("data", (chunk) => {
    const text = chunk.toString();
    process.stderr.write(text);
    stderrTail = (stderrTail + text).slice(-8000);
  });

  proc.on("error", (error) => {
    if (gen !== generation) return;
    console.error(`[PYTHON] Failed to start: ${error.message}`);
    child = null;
    writeStatus({ ok: false, error: error.message });
    scheduleRestart(1000);
  });

  proc.on("exit", (code, signal) => {
    if (gen !== generation) return;
    child = null;
    if (stopping) return;
    const reason = readableError() || `Server exited (${signal || `code ${code}`}).`;
    writeStatus({ ok: false, error: reason });
    console.log(
      `[PYTHON] Server exited (${signal || `code ${code}`}). It will restart on the next code change.`,
    );
  });

  waitUntilReady(proc, gen);
}

function stopServer() {
  return new Promise((resolve) => {
    const target = child;
    if (!target) {
      resolve();
      return;
    }
    child = null;
    generation++;

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };

    if (isWindows) {
      // taskkill targets only this PID and its descendants. Uvicorn's own
      // --reload sends CTRL_C_EVENT, which Windows broadcasts to every
      // process in the shared console and takes down npm, Node, and Vite.
      const killer = spawn("taskkill", ["/PID", String(target.pid), "/T", "/F"], {
        stdio: "ignore",
      });
      killer.on("exit", finish);
      killer.on("error", () => {
        target.kill();
        finish();
      });
    } else {
      target.once("exit", finish);
      target.kill("SIGTERM");
    }
  });
}

function scheduleRestart(delay = 250) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    if (stopping) return;
    console.log("[PYTHON] Code changed, restarting Python service...");
    await stopServer();
    startServer();
  }, delay);
}

function shutdown() {
  if (stopping) return;
  stopping = true;
  clearTimeout(debounceTimer);
  if (watcher) watcher.close();
  stopServer().then(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shouldWatch(filename) {
  if (!filename) return false;
  const parts = filename.split(/[\\/]/);
  if (parts.some((part) => ignoredDirs.has(part))) return false;
  return /\.(py|json|ya?ml|env|txt)$/i.test(filename);
}

try {
  // fs.watch(recursive) works on Windows and only watches this service, so
  // edits in frontend/ or backend/ don't restart Python.
  watcher = fs.watch(serviceDir, { recursive: true }, (_eventType, filename) => {
    if (shouldWatch(filename)) scheduleRestart();
  });
  watcher.on("error", (error) => {
    console.error(`[PYTHON] File watcher error: ${error.message}`);
  });
} catch (error) {
  console.error(`[PYTHON] Could not watch files: ${error.message}`);
}

startServer();
