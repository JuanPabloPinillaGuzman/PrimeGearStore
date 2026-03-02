import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const migrationsDir = path.join(root, "prisma", "migrations");

function print(line = "") {
  process.stdout.write(`${line}\n`);
}

if (!fs.existsSync(migrationsDir)) {
  print("No existe prisma/migrations.");
  process.exit(0);
}

const dirs = fs
  .readdirSync(migrationsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const migrations = dirs
  .map((dir) => {
    const sqlPath = path.join(migrationsDir, dir, "migration.sql");
    return {
      dir,
      sqlPath,
      exists: fs.existsSync(sqlPath),
    };
  })
  .filter((entry) => entry.exists);

print("PrimeGearStore manual SQL migrations");
print("==================================");
print("");

if (migrations.length === 0) {
  print("No se encontraron archivos migration.sql en prisma/migrations.");
  process.exit(0);
}

print("Migraciones SQL detectadas (orden recomendado):");
for (const [index, migration] of migrations.entries()) {
  print(`${index + 1}. ${migration.dir}`);
}

print("");
print("Aplicar manualmente (ejemplo):");
print(`psql -h <host> -p <port> -U <user> -d <db> -f "${migrations[0].sqlPath.replaceAll("\\", "/")}"`);
print("");
print("Luego ejecutar:");
print("npm run prisma:generate");
print("npm run prisma:validate");
print("");
print("Nota: este script no aplica cambios automaticamente; solo lista y documenta el orden.");
