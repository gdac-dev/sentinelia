import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

// Log pool errors
pool.on("error", (err) => {
  console.error("[DB] Unexpected pool error:", err.message);
});

/**
 * Execute a parameterized SQL query.
 * All queries go through this function to enforce parameterized statements.
 */
export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  const result = await pool.query<T>(text, params);
  const duration = Date.now() - start;

  if (process.env.NODE_ENV !== "production") {
    console.log(`[DB] ${text.slice(0, 80)}... (${duration}ms, ${result.rowCount} rows)`);
  }

  return result;
}

/**
 * Test the database connection.
 */
export async function testConnection(): Promise<boolean> {
  try {
    await pool.query("SELECT 1");
    console.log("[DB] Connected to PostgreSQL");
    return true;
  } catch (err) {
    console.error("[DB] Connection failed:", (err as Error).message);
    return false;
  }
}

export default pool;
