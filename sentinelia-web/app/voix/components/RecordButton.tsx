"use client";

import { useRef, useState, useCallback, useEffect } from "react";

interface RecordButtonProps {
  onAudioReady: (blob: Blob) => void;
  disabled?: boolean;
}

export default function RecordButton({ onAudioReady, disabled }: RecordButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState<number[]>(Array(24).fill(0.1));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const updateLevels = useCallback(() => {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);

    // Sample 24 bands from the frequency data
    const bandCount = 24;
    const step = Math.floor(data.length / bandCount);
    const newLevels = Array.from({ length: bandCount }, (_, i) => {
      const val = data[i * step] / 255;
      return Math.max(0.08, val);
    });

    setLevels(newLevels);
    animFrameRef.current = requestAnimationFrame(updateLevels);
  }, []);

  const [micError, setMicError] = useState<string | null>(null);

  const startRecording = useCallback(async () => {
    setMicError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("L'accès au microphone n'est pas supporté par ce navigateur.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Set up analyser for visualization
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Set up recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        onAudioReady(blob);
        stream.getTracks().forEach((t) => t.stop());
        audioCtx.close();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setElapsed(0);

      // Timer
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);

      // Start visualization
      updateLevels();
    } catch (err) {
      console.error("Microphone access failed:", err);
      setMicError(
        "Accès au microphone indisponible ou refusé. Utilisez l'importation de fichier ci-dessous."
      );
    }
  }, [onAudioReady, updateLevels]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    cancelAnimationFrame(animFrameRef.current);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setLevels(Array(24).fill(0.1));
  }, []);

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Waveform visualizer */}
      <div className="flex h-24 items-end justify-center gap-[3px]">
        {levels.map((level, i) => (
          <div
            key={i}
            className="w-[4px] rounded-full transition-all duration-75"
            style={{
              height: `${Math.max(6, level * 96)}px`,
              backgroundColor: isRecording
                ? `rgba(0, 229, 204, ${0.4 + level * 0.6})`
                : "var(--color-text-muted)",
              opacity: isRecording ? 1 : 0.3,
            }}
          />
        ))}
      </div>

      {/* Timer */}
      {isRecording && (
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-danger" />
          </span>
          <span className="font-heading text-lg tabular-nums text-text-primary">
            {formatTime(elapsed)}
          </span>
        </div>
      )}

      {/* Record button */}
      <button
        type="button"
        onClick={isRecording ? stopRecording : startRecording}
        disabled={disabled}
        className="focus-ring group relative flex h-20 w-20 cursor-pointer items-center justify-center rounded-full border-2 transition-all duration-300 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          borderColor: isRecording ? "var(--color-danger)" : "var(--color-accent)",
          backgroundColor: isRecording
            ? "rgba(255, 76, 97, 0.1)"
            : "rgba(0, 229, 204, 0.06)",
        }}
        aria-label={isRecording ? "Arrêter l'enregistrement" : "Commencer l'enregistrement"}
      >
        {isRecording ? (
          /* Stop square */
          <div className="h-6 w-6 rounded-sm bg-danger" />
        ) : (
          /* Mic icon */
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="9" y="2" width="6" height="11" rx="3" />
            <path d="M5 10a7 7 0 0 0 14 0" />
            <line x1="12" y1="19" x2="12" y2="22" />
            <line x1="8" y1="22" x2="16" y2="22" />
          </svg>
        )}

        {/* Pulse ring when recording */}
        {isRecording && (
          <span className="pointer-events-none absolute inset-0 animate-ping rounded-full border border-danger opacity-20" />
        )}
      </button>

      <p className="text-sm text-text-secondary">
        {isRecording
          ? "Cliquez pour arrêter l'enregistrement"
          : "Cliquez pour enregistrer votre voix"}
      </p>

      {/* Mic Error message if permission or mic fails */}
      {micError && (
        <p className="max-w-xs text-center text-xs text-alert">{micError}</p>
      )}
    </div>
  );
}
