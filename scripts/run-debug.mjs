import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";

const envPath = resolve(process.cwd(), ".env.debug.local");
if (!existsSync(envPath)) {
  console.error("Missing .env.debug.local. Copy .env.debug.example and add debug-project values.");
  process.exit(1);
}

dotenv.config({ path: envPath, override: true });
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
if (process.env.NEXT_PUBLIC_APP_ENV !== "debug") {
  console.error("NEXT_PUBLIC_APP_ENV must be debug.");
  process.exit(1);
}
if (!projectId || projectId === "kissanfresh-a72c1" || projectId.includes("your-debug")) {
  console.error("Debug dashboard must use a configured, non-production Firebase project.");
  process.exit(1);
}

const command = process.argv[2] || "dev";
if (!["dev", "build", "start"].includes(command)) {
  console.error(`Unsupported Next.js command: ${command}`);
  process.exit(1);
}

const nextBin = resolve(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const child = spawn(process.execPath, [nextBin, command], {
  env: process.env,
  stdio: "inherit",
});
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
