"use client";

import { useEffect, useState } from "react";

export interface AnalysisResult {
  score: number;          // 0–100 (0 = authentic, 100 = fully synthetic)
  label: string;
  explanation: string;
}

interface ResultCardProps {
  result: AnalysisResult;
  onReset: () => void;
}

export default function ResultCard({ result, onReset }: ResultCardProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  const isSuspicious = result.score >= 50;

  // Color selection based on score
  const scoreColor = result.score < 40
    ? "var(--color-accent)"       // cyan — authentic
    : result.score < 70
      ? "var(--color-alert)"      // amber — uncertain
      : "var(--color-danger)";    // red — synthetic

  const scoreBg = result.score < 40
    ? "rgba(0, 229, 204, 0.06)"
    : result.score < 70
      ? "rgba(255, 176, 32, 0.06)"
      : "rgba(255, 76, 97, 0.06)";

  // SVG circle params
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  // Animate score on mount
  useEffect(() => {
    let frame: number;
    const duration = 1200;
    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(eased * result.score));

      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [result.score]);

  return (
    <div className="flex flex-col items-center gap-8 py-4">
      {/* Circular score */}
      <div className="relative flex items-center justify-center">
        <svg width="180" height="180" viewBox="0 0 180 180" aria-hidden="true">
          {/* Background track */}
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="6"
          />
          {/* Score arc */}
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke={scoreColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 90 90)"
            style={{ transition: "stroke-dashoffset 0.1s ease-out" }}
          />
          {/* Glow filter */}
          <defs>
            <filter id="score-glow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Glow arc (duplicate, filtered) */}
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke={scoreColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 90 90)"
            filter="url(#score-glow)"
            opacity="0.4"
            style={{ transition: "stroke-dashoffset 0.1s ease-out" }}
          />
        </svg>

        {/* Center label */}
        <div className="absolute flex flex-col items-center">
          <span
            className="font-heading text-4xl font-bold tabular-nums"
            style={{ color: scoreColor }}
          >
            {animatedScore}%
          </span>
          <span className="text-xs text-text-muted">
            {isSuspicious ? "synthétique" : "authentique"}
          </span>
        </div>
      </div>

      {/* Verdict card */}
      <div
        className="w-full max-w-md rounded-2xl border p-6 text-center"
        style={{
          borderColor: scoreColor + "30",
          backgroundColor: scoreBg,
        }}
      >
        {/* Status icon */}
        <div
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
          style={{ backgroundColor: scoreColor + "15" }}
        >
          {isSuspicious ? (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke={scoreColor}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          ) : (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke={scoreColor}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 2l8 4v6c0 5.6-3.4 10.8-8 12-4.6-1.2-8-6.4-8-12V6l8-4z" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
          )}
        </div>

        <h3
          className="font-heading text-lg font-bold"
          style={{ color: scoreColor }}
        >
          {result.label}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          {result.explanation}
        </p>
      </div>

      {/* Reset button */}
      <button
        onClick={onReset}
        className="focus-ring flex items-center gap-2 rounded-xl border border-border bg-bg-card px-6 py-3 text-sm font-medium text-text-secondary transition-colors duration-200 hover:border-accent/30 hover:text-text-primary"
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
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
        Nouvelle analyse
      </button>
    </div>
  );
}
