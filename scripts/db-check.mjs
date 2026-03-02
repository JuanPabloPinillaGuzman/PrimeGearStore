import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(filepath) {
  if (!existsSync(filepath)) return;
  const lines = readFileSync(filepath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key]) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function loadLocalEnv() {
  loadEnvFile(resolve(process.cwd(), ".env.local"));
  loadEnvFile(resolve(process.cwd(), ".env"));
}

function hasPsql() {
  const probe = spawnSync("psql", ["--version"], { encoding: "utf8" });
  return probe.status === 0;
}

function buildPsqlEnv() {
  const direct = process.env.DATABASE_URL_PSQL;
  const fallback = process.env.DATABASE_URL;
  const target = direct || fallback;
  if (!target) {
    throw new Error("DATABASE_URL or DATABASE_URL_PSQL is not set.");
  }

  const url = new URL(target);
  const password = decodeURIComponent(url.password || "");
  const database = url.pathname.replace(/^\//, "") || "postgres";

  return {
    ...process.env,
    PGHOST: url.hostname,
    PGPORT: url.port || "5432",
    PGUSER: decodeURIComponent(url.username || "postgres"),
    PGDATABASE: database,
    PGPASSWORD: password,
    PGSSLMODE: process.env.PGSSLMODE || url.searchParams.get("sslmode") || "require",
  };
}

function runPsql(args, env) {
  return spawnSync("psql", args, {
    encoding: "utf8",
    stdio: "pipe",
    env,
  });
}

function printHeader(title) {
  process.stdout.write(`\n${title}\n${"=".repeat(title.length)}\n`);
}

function printResult(result) {
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    throw new Error(`psql command failed with exit code ${result.status}`);
  }
}

function main() {
  loadLocalEnv();

  if (!hasPsql()) {
    process.stderr.write("psql is not installed or not in PATH.\n");
    process.stderr.write("Install PostgreSQL client tools and retry.\n");
    process.exit(1);
  }

  const psqlEnv = buildPsqlEnv();

  printHeader("DB Check: Schemas");
  printResult(
    runPsql([
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      "SELECT schema_name FROM information_schema.schemata WHERE schema_name IN ('inventory','webstore') ORDER BY schema_name;",
    ], psqlEnv),
  );

  printHeader("DB Check: Main Counts");
  printResult(
    runPsql([
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      "SELECT 'inventory.products' AS table_name, COUNT(*)::bigint AS count FROM inventory.products UNION ALL SELECT 'inventory.product_prices', COUNT(*)::bigint FROM inventory.product_prices UNION ALL SELECT 'webstore.orders', COUNT(*)::bigint FROM webstore.orders UNION ALL SELECT 'inventory.sales', COUNT(*)::bigint FROM inventory.sales ORDER BY table_name;",
    ], psqlEnv),
  );

  printHeader("DB Check: Notes");
  process.stdout.write(
    "- If inventory.product_prices / webstore.orders / inventory.sales are 0, verify whether the source dump contained data for those tables.\n",
  );
  process.stdout.write(
    "- If a legacy dump used inventory.citext, a DOMAIN alias (inventory.citext -> public.citext) is acceptable.\n",
  );
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
