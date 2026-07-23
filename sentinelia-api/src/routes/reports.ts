import { Router, Request, Response } from "express";
import { query } from "../db.js";

const router = Router();

// ── POST /reports — Create a citizen report ───────────────
router.post(
  "/reports",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { analysis_id, source_url, description, reporter } = req.body;

      // Validate required field
      if (!description || typeof description !== "string" || description.trim().length === 0) {
        res.status(400).json({ error: "Le champ 'description' est requis" });
        return;
      }

      // Validate analysis_id exists if provided
      if (analysis_id) {
        const check = await query(
          "SELECT id FROM analyses WHERE id = $1",
          [analysis_id]
        );
        if (check.rowCount === 0) {
          res.status(404).json({ error: "Analyse introuvable" });
          return;
        }
      }

      const result = await query(
        `INSERT INTO reports (analysis_id, source_url, description, reporter)
         VALUES ($1, $2, $3, $4)
         RETURNING id, analysis_id, source_url, description, reporter, status, created_at`,
        [
          analysis_id || null,
          source_url || null,
          description.trim(),
          reporter || null,
        ]
      );

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error("[Reports] Error:", (err as Error).message);
      res.status(500).json({
        error: "Erreur lors de l'enregistrement du signalement",
        message: (err as Error).message,
      });
    }
  }
);

// ── GET /reports — List recent reports ────────────────────
router.get(
  "/reports",
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const result = await query(
        `SELECT r.*, a.type AS analysis_type, a.score AS analysis_score, a.verdict AS analysis_verdict
         FROM reports r
         LEFT JOIN analyses a ON r.analysis_id = a.id
         ORDER BY r.created_at DESC
         LIMIT 50`
      );

      res.json(result.rows);
    } catch (err) {
      console.error("[Reports] Error:", (err as Error).message);
      res.status(500).json({
        error: "Erreur lors de la récupération des signalements",
        message: (err as Error).message,
      });
    }
  }
);

export default router;
