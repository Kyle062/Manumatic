const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const serviceDir = path.join(__dirname, "..", "manumatik-python-backend");
const venvPython =
  process.platform === "win32"
    ? path.join(serviceDir, "venv", "Scripts", "python.exe")
    : path.join(serviceDir, "venv", "bin", "python");

// Prefer the project's venv so installed dependencies are found.
const interpreter = fs.existsSync(venvPython) ? venvPython : "python";

console.log(`[PYTHON] Using interpreter: ${interpreter}`);

const child = spawn(
  interpreter,
  ["-m", "uvicorn", "main:app", "--reload", "--port", "8000"],
  { cwd: serviceDir, stdio: "inherit" },
);

child.on("error", (error) => {
  console.error(`[PYTHON] Failed to start: ${error.message}`);
  process.exit(1);
});

child.on("exit", (code) => process.exit(code ?? 0));
