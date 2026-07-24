// lib/sound.ts
"use client";

const getAudioContext = () => {
  if (typeof window === "undefined") return null;
  // @ts-ignore
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  return new AudioContext();
};

export const playPositiveSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;

  // C5 (523.25 Hz) -> E5 (659.25 Hz)
  osc.frequency.setValueAtTime(523.25, now);
  osc.frequency.setValueAtTime(659.25, now + 0.15);

  // Envelope
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
  gain.gain.setValueAtTime(0.3, now + 0.2);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

  osc.start(now);
  osc.stop(now + 0.4);
};

export const playNegativeSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "triangle";
  osc.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;

  // A4 (440 Hz) -> F4 (349.23 Hz)
  osc.frequency.setValueAtTime(440, now);
  osc.frequency.setValueAtTime(349.23, now + 0.2);

  // Envelope
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
  gain.gain.setValueAtTime(0.2, now + 0.3);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

  osc.start(now);
  osc.stop(now + 0.5);
};
