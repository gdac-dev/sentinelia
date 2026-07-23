import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import { query } from "../db.js";

// ── Multer config ─────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, "uploads/"),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

const router = Router();

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

// ── Helper: call the Python AI service ────────────────────
async function callAIService(
  endpoint: string,
  filePath: string,
  filename: string
): Promise<{ score: number; verdict: string; label: string; explanation: string; details?: Record<string, unknown> }> {
  const fs = await import("fs");
  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer]);

  const formData = new FormData();
  formData.append("file", blob, filename);

  const response = await fetch(`${AI_SERVICE_URL}${endpoint}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI service error (${response.status}): ${text}`);
  }

  return response.json();
}

// ── Helper: save analysis to database ─────────────────────
async function saveAnalysis(
  type: "voice" | "image" | "video",
  filename: string,
  score: number,
  verdict: string,
  details?: Record<string, unknown>
) {
  try {
    const result = await query(
      `INSERT INTO analyses (type, filename, score, verdict, details)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, type, filename, score, verdict, details, created_at`,
      [type, filename, score, verdict, details ? JSON.stringify(details) : null]
    );
    return result.rows[0];
  } catch (dbErr) {
    console.warn("[DB] ⚠ Save skipped (PostgreSQL unavailable or table missing):", (dbErr as Error).message);
    return {
      id: `local-${Date.now()}`,
      type,
      filename,
      score,
      verdict,
      details,
      created_at: new Date().toISOString(),
    };
  }
}

// ── POST /analyze/voice ───────────────────────────────────
router.post(
  "/analyze/voice",
  upload.single("audio"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "Aucun fichier audio fourni" });
        return;
      }

      // Call Python AI service
      const aiResult = await callAIService(
        "/analyze/voice",
        req.file.path,
        req.file.originalname
      );

      // Save to database
      const saved = await saveAnalysis(
        "voice",
        req.file.originalname,
        aiResult.score,
        aiResult.verdict,
        aiResult.details
      );

      // Return result to frontend
      res.json({
        id: saved.id,
        score: aiResult.score,
        label: aiResult.label,
        explanation: aiResult.explanation,
        verdict: aiResult.verdict,
        created_at: saved.created_at,
      });
    } catch (err) {
      console.error("[Analyze/Voice] Error:", (err as Error).message);
      res.status(500).json({
        error: "Erreur lors de l'analyse vocale",
        message: (err as Error).message,
      });
    }
  }
);

// ── POST /analyze/image ───────────────────────────────────
router.post(
  "/analyze/image",
  upload.single("file"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "Aucun fichier image fourni" });
        return;
      }

      const aiResult = await callAIService(
        "/analyze/image",
        req.file.path,
        req.file.originalname
      );

      const saved = await saveAnalysis(
        "image",
        req.file.originalname,
        aiResult.score,
        aiResult.verdict,
        aiResult.details
      );

      res.json({
        id: saved.id,
        score: aiResult.score,
        label: aiResult.label,
        explanation: aiResult.explanation,
        verdict: aiResult.verdict,
        created_at: saved.created_at,
      });
    } catch (err) {
      console.error("[Analyze/Image] Error:", (err as Error).message);
      res.status(500).json({
        error: "Erreur lors de l'analyse d'image",
        message: (err as Error).message,
      });
    }
  }
);

// ── POST /analyze/video ───────────────────────────────────
router.post(
  "/analyze/video",
  upload.single("file"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "Aucun fichier vidéo fourni" });
        return;
      }

      const aiResult = await callAIService(
        "/analyze/video",
        req.file.path,
        req.file.originalname
      );

      const saved = await saveAnalysis(
        "video",
        req.file.originalname,
        aiResult.score,
        aiResult.verdict,
        aiResult.details
      );

      res.json({
        id: saved.id,
        score: aiResult.score,
        label: aiResult.label,
        explanation: aiResult.explanation,
        verdict: aiResult.verdict,
        created_at: saved.created_at,
      });
    } catch (err) {
      console.error("[Analyze/Video] Error:", (err as Error).message);
      res.status(500).json({
        error: "Erreur lors de l'analyse vidéo",
        message: (err as Error).message,
      });
    }
  }
);

export default router;
