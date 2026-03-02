import { spawnSync } from "node:child_process";

const MAX_ATTEMPTS = 3;
const WAIT_MS = [1000, 2000, 3000];

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function shouldRetry(stderr) {
  const text = (stderr || "").toUpperCase();
  return text.includes("EPERM") || text.includes("EBUSY");
}

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
  const result = spawnSync("prisma", ["generate"], {
    shell: true,
    stdio: "pipe",
    encoding: "utf8",
    env: process.env,
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) process.stderr.write(`${result.error.message}\n`);

  if (result.status === 0) {
    process.exit(0);
  }

  const retryable = shouldRetry(result.stderr);
  if (!retryable || attempt === MAX_ATTEMPTS) {
    process.exit(result.status ?? 1);
  }

  const delay = WAIT_MS[attempt - 1] ?? 1000;
  process.stderr.write(
    `prisma generate failed with a retryable Windows file lock error. Retrying (${attempt}/${MAX_ATTEMPTS}) in ${delay}ms...\n`,
  );
  sleep(delay);
}
