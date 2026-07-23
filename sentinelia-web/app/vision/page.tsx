"use client";

import { useState, useRef, useCallback } from "react";
import ScanAnimation from "@/app/components/ScanAnimation";
import ResultCard, { type AnalysisResult } from "@/app/components/ResultCard";
import BackButton from "@/components/BackButton";

type PageState = "idle" | "ready" | "analyzing" | "result";

export default function VisionPage() {
  const [state, setState] = useState<PageState>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<"image" | "video" | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Process selected file ───────────────────────────────
  const processFile = useCallback((f: File) => {
    // Revoke previous preview URL
    if (previewUrl) URL.revokeObjectURL(previewUrl);

    const type = f.type.startsWith("video/") ? "video" : "image";
    setFile(f);
    setFileType(type);
    setPreviewUrl(URL.createObjectURL(f));
    setState("ready");
    setError(null);
  }, [previewUrl]);

  // ── File input change ───────────────────────────────────
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) processFile(f);
    },
    [processFile]
  );

  // ── Drag & Drop handlers ────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const f = e.dataTransfer.files?.[0];
      if (f && (f.type.startsWith("image/") || f.type.startsWith("video/"))) {
        processFile(f);
      }
    },
    [processFile]
  );

  // ── Send to backend ─────────────────────────────────────
  const handleAnalyze = useCallback(async () => {
    if (!file || !fileType) return;

    setState("analyzing");
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const endpoint =
        fileType === "video" ? "/api/analyze/video" : "/api/analyze/image";

      const response = await fetch(endpoint, {
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
  }, [file, fileType]);

  // ── Reset to initial state ──────────────────────────────
  const handleReset = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setState("idle");
    setFile(null);
    setPreviewUrl(null);
    setFileType(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [previewUrl]);

  return (
    <div className="relative mx-auto max-w-3xl px-6 py-16">
      <BackButton />
      
      {/* ── Page header ──────────────────────────────────── */}
      <div className="mb-12 text-center">
        <span className="mb-3 inline-block rounded-md bg-accent/[0.08] px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-accent">
          Module Visuel
        </span>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
          Analyse image &amp; vidéo
        </h1>
        <p className="mt-3 text-text-secondary">
          Importez une image ou une vidéo pour détecter les deepfakes et
          contenus générés par IA.
        </p>
      </div>

      {/* ── Main content area ────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-bg-card p-8 sm:p-10">
        {/* ── IDLE: Drop zone ────────────────────────────── */}
        {state === "idle" && (
          <div className="flex flex-col items-center gap-6">
            {/* Drag & Drop zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`group flex w-full cursor-pointer flex-col items-center gap-5 rounded-2xl border-2 border-dashed px-8 py-14 transition-all duration-300 ${
                isDragging
                  ? "border-accent bg-accent/[0.06]"
                  : "border-border hover:border-accent/40 hover:bg-bg-primary/50"
              }`}
              role="button"
              tabIndex={0}
              aria-label="Zone de dépôt de fichier"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
            >
              {/* Icon */}
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-2xl border transition-all duration-300 ${
                  isDragging
                    ? "border-accent/40 bg-accent/10"
                    : "border-border bg-bg-primary group-hover:border-accent/30"
                }`}
              >
                <svg
                  width="30"
                  height="30"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-colors duration-300 ${
                    isDragging
                      ? "text-accent"
                      : "text-text-muted group-hover:text-accent"
                  }`}
                  aria-hidden="true"
                >
                  {/* Image with eye overlay */}
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>

              {/* Text */}
              <div className="text-center">
                <p className="text-sm font-medium text-text-primary">
                  {isDragging ? (
                    <span className="text-accent">Déposez le fichier ici</span>
                  ) : (
                    <>
                      Glissez-déposez une image ou vidéo
                      <span className="text-text-muted"> ou </span>
                      <span className="text-accent underline underline-offset-2">
                        parcourez
                      </span>
                    </>
                  )}
                </p>
                <p className="mt-1.5 text-xs text-text-muted">
                  PNG, JPG, WebP, MP4, WebM — max 50 Mo
                </p>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
              className="hidden"
              aria-label="Importer une image ou vidéo"
            />
          </div>
        )}

        {/* ── READY: Preview + analyze button ────────────── */}
        {state === "ready" && previewUrl && (
          <div className="flex flex-col items-center gap-8">
            {/* File preview */}
            <div className="relative w-full max-w-lg overflow-hidden rounded-xl border border-border bg-bg-primary">
              {/* Type badge */}
              <div className="absolute top-3 left-3 z-10 rounded-md bg-bg-card/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-accent backdrop-blur-sm">
                {fileType === "video" ? "Vidéo" : "Image"}
              </div>

              {fileType === "video" ? (
                <video
                  src={previewUrl}
                  controls
                  className="max-h-80 w-full object-contain"
                >
                  Votre navigateur ne supporte pas la lecture vidéo.
                </video>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={previewUrl}
                  alt="Aperçu du fichier importé"
                  className="max-h-80 w-full object-contain"
                />
              )}

              {/* Scan frame overlay */}
              <div className="pointer-events-none absolute inset-0">
                {/* Corner brackets */}
                <div className="absolute top-2 left-2 h-6 w-6 border-t-2 border-l-2 border-accent/40 rounded-tl" />
                <div className="absolute top-2 right-2 h-6 w-6 border-t-2 border-r-2 border-accent/40 rounded-tr" />
                <div className="absolute bottom-2 left-2 h-6 w-6 border-b-2 border-l-2 border-accent/40 rounded-bl" />
                <div className="absolute bottom-2 right-2 h-6 w-6 border-b-2 border-r-2 border-accent/40 rounded-br" />
              </div>
            </div>

            {/* File name */}
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
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {file?.name}
                </p>
                <p className="text-xs text-text-muted">
                  {file
                    ? `${(file.size / (1024 * 1024)).toFixed(2)} Mo — Prêt pour l'analyse`
                    : "Prêt pour l'analyse"}
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
