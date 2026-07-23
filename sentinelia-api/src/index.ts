import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { testConnection } from "./db.js";
import analyzeRoutes from "./routes/analyze.js";
import reportsRoutes from "./routes/reports.js";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// ── Middleware ─────────────────────────────────────────────
app.use(cors({
  origin: FRONTEND_URL,
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"],
}));

app.use(express.json());

// ── Routes ────────────────────────────────────────────────
app.use("/api", analyzeRoutes);
app.use("/api", reportsRoutes);

// ── Health check ──────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "sentinelia-api",
    timestamp: new Date().toISOString(),
  });
});

// ── Start server ──────────────────────────────────────────
async function start() {
  // Test DB connection (non-blocking — server starts even if DB is down)
  const dbOk = await testConnection();
  if (!dbOk) {
    console.warn("[Server] ⚠ Starting without database connection");
  }

  app.listen(PORT, () => {
    console.log(`[Server] SentinelIA API running on http://localhost:${PORT}`);
    console.log(`[Server] CORS origin: ${FRONTEND_URL}`);
  });
}

start();
