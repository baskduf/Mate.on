import { spawn, spawnSync } from "node:child_process";

const isWindows = process.platform === "win32";
const useDryRun = process.argv.includes("--dry-run");
const skipDbGenerate = process.argv.includes("--skip-db-generate");

const tasks = [
  { name: "web", command: "npm run dev:web" },
  { name: "socket", command: "npm run dev:socket" }
];

if (useDryRun) {
  console.log(`[dry-run] bootstrap: ${skipDbGenerate ? "skip db:generate" : "npm run db:generate"}`);
  for (const task of tasks) {
    console.log(`[dry-run] ${task.name}: ${task.command}`);
  }
  process.exit(0);
}

if (!skipDbGenerate) {
  const bootstrap = spawnSync("npm run db:generate", {
    shell: true,
    stdio: "inherit",
    env: process.env
  });

  if (bootstrap.status !== 0) {
    process.exit(bootstrap.status ?? 1);
  }
}

const children = [];
let isShuttingDown = false;
let firstExitCode = 0;

function startTask(task) {
  const child = spawn(task.command, {
    shell: true,
    stdio: "inherit",
    env: process.env
  });

  child.on("exit", (code) => {
    if (isShuttingDown) {
      return;
    }

    if (typeof code === "number" && code !== 0 && firstExitCode === 0) {
      firstExitCode = code;
    }

    shutdown();
  });

  child.on("error", () => {
    if (firstExitCode === 0) {
      firstExitCode = 1;
    }
    shutdown();
  });

  children.push(child);
}

function shutdown() {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;

  for (const child of children) {
    if (child.killed) {
      continue;
    }

    if (isWindows) {
      child.kill();
    } else {
      child.kill("SIGTERM");
    }
  }

  setTimeout(() => {
    process.exit(firstExitCode);
  }, 150);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

for (const task of tasks) {
  startTask(task);
}
