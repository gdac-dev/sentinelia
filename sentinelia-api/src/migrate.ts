import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

/**
 * Simple migration runner.
 * Executes all .sql files in the migrations/ directory in alphabetical order.
 * Must be run from the project root (e.g. via `npm run migrate`).
 */
async function migrate() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const migrationsDir = path.join(process.cwd(), "migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  console.log(`[Migrate] Found ${files.length} migration(s)`);

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, "utf-8");

    console.log(`[Migrate] Running: ${file}`);
    try {
      await pool.query(sql);
      console.log(`[Migrate] ✓ ${file} applied`);
    } catch (err) {
      console.error(`[Migrate] ✗ ${file} failed:`, (err as Error).message);
      process.exit(1);
    }
  }

  await pool.end();
  console.log("[Migrate] All migrations applied successfully");
}

migrate();
