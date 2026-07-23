"use client";

import { useState, useRef, useCallback } from "react";
import RecordButton from "./components/RecordButton";
import ScanAnimation from "@/app/components/ScanAnimation";
import ResultCard, { type AnalysisResult } from "@/app/components/ResultCard";
import BackButton from "@/components/BackButton";

type PageState = "idle" | "ready" | "analyzing" | "result";

export default function VoixPage() {
  const [state, setState] = useState<PageState>("idle");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Handle recorded audio ───────────────────────────────
  const handleAudioReady = useCallback((blob: Blob) => {
    setAudioBlob(blob);
    setFileName("Enregistrement vocal");
    setState("ready");
    setError(null);
  }, []);

  // ── Handle file upload ──────────────────────────────────
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setAudioBlob(file);
      setFileName(file.name);
      setState("ready");
      setError(null);
    },
    []
  );

  // ── Send to backend ─────────────────────────────────────
  const handleAnalyze = useCallback(async () => {
    if (!audioBlob) return;

    setState("analyzing");
    setError(null);

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, fileName ?? "recording.webm");

      const response = await fetch("/api/analyze/voice", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Erreur serveur (${response.status})`);
      }

      const data: AnalysisResult = await response.json();
      setResult(data);
      setState("result");
    } catch (err) {
      console.error("Analysis failed:", err);
      setError(
        "Impossible de contacter le serveur d'analyse. Vérifiez que le backend est lancé."
      );
      setState("ready");
    }
  }, [audioBlob, fileName]);

  // ── Reset to initial state ──────────────────────────────
  const handleReset = useCallback(() => {
    setState("idle");
    setAudioBlob(null);
    setFileName(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  return (
    <div className="relative mx-auto max-w-3xl px-6 py-16">
      <BackButton />
      
      {/* ── Page header ──────────────────────────────────── */}
      <div className="mb-12 text-center">
        <span className="mb-3 inline-block rounded-md bg-accent/[0.08] px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-accent">
          Module Audio
        </span>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
          Analyse vocale
        </h1>
        <p className="mt-3 text-text-secondary">
          Enregistrez ou importez un fichier audio pour détecter les voix
          synthétiques.
        </p>
      </div>

      {/* ── Main content area ────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-bg-card p-8 sm:p-10">
        {/* ── IDLE: Record or upload ──────────────────────── */}
        {state === "idle" && (
          <div className="flex flex-col items-center gap-10">
            {/* Record button */}
            <RecordButton onAudioReady={handleAudioReady} />

            {/* Divider */}
            <div className="flex w-full max-w-xs items-center gap-4">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-medium text-text-muted">OU</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* File upload */}
            <div className="flex flex-col items-center gap-3">
              <label
                htmlFor="audio-file-input"
                className="focus-ring group flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-bg-primary px-6 py-3.5 text-sm font-medium text-text-secondary transition-all duration-200 hover:border-accent/30 hover:text-text-primary"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-text-muted transition-colors group-hover:text-accent"
                  aria-hidden="true"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Importer un fichier audio
              </label>
              <input
                id="audio-file-input"
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                className="hidden"
                aria-label="Importer un fichier audio"
              />
              <span className="text-xs text-text-muted">
                MP3, WAV, OGG, WebM — max 25 Mo
              </span>
            </div>
          </div>
        )}

        {/* ── READY: File loaded, show analyze button ────── */}
        {state === "ready" && (
          <div className="flex flex-col items-center gap-8">
            {/* File info */}
            <div className="flex items-center gap-3 rounded-xl border border-border bg-bg-primary px-5 py-3">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {fileName}
                </p>
                <p className="text-xs text-text-muted">
                  Prêt pour l&apos;analyse
                </p>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="w-full max-w-md rounded-xl border border-danger/30 bg-danger-muted px-4 py-3 text-center text-sm text-danger">
                {error}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleReset}
                className="focus-ring rounded-xl border border-border px-5 py-3 text-sm font-medium text-text-secondary transition-colors hover:border-text-muted hover:text-text-primary"
              >
                Annuler
              </button>
              <button
                onClick={handleAnalyze}
                className="focus-ring flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-6 py-3 text-sm font-semibold text-accent transition-all duration-200 hover:bg-accent/20 hover:shadow-[0_0_20px_-4px_rgba(0,229,204,0.3)]"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                  <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                  <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                  <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                  <line x1="7" y1="12" x2="17" y2="12" />
                </svg>
                Analyser
              </button>
            </div>
          </div>
        )}

        {/* ── ANALYZING: Sonar animation ─────────────────── */}
        {state === "analyzing" && <ScanAnimation />}

        {/* ── RESULT: Score card ──────────────────────────── */}
        {state === "result" && result && (
          <ResultCard result={result} onReset={handleReset} />
        )}
      </div>
    </div>
  );
}
