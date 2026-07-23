"use client";

export default function ScanAnimation() {
  return (
    <div className="flex flex-col items-center gap-8 py-8">
      {/* Sonar container */}
      <div className="relative flex h-56 w-56 items-center justify-center">
        {/* Concentric rings */}
        {[1, 2, 3, 4].map((ring) => (
          <div
            key={ring}
            className="absolute rounded-full border border-accent/20"
            style={{
              width: `${ring * 25}%`,
              height: `${ring * 25}%`,
              animation: `sonar-pulse 2.4s ease-out ${ring * 0.3}s infinite`,
            }}
          />
        ))}

        {/* Sweeping line */}
        <div
          className="absolute h-full w-px origin-bottom bg-gradient-to-t from-accent/60 to-transparent"
          style={{
            top: 0,
            left: "50%",
            height: "50%",
            transformOrigin: "bottom center",
            animation: "sonar-sweep 2.4s linear infinite",
          }}
        />

        {/* Sweep trail */}
        <div
          className="absolute overflow-hidden rounded-full"
          style={{
            width: "100%",
            height: "100%",
            animation: "sonar-sweep 2.4s linear infinite",
          }}
        >
          <div
            className="absolute top-0 left-1/2 h-1/2 w-1/2 origin-bottom-left"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0deg, rgba(0, 229, 204, 0.08) 30deg, transparent 60deg)",
            }}
          />
        </div>

        {/* Center dot */}
        <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-accent/30 bg-bg-card">
          <div className="h-3 w-3 animate-pulse rounded-full bg-accent" />
        </div>

        {/* Floating detection dots */}
        <div
          className="absolute h-2 w-2 rounded-full bg-accent/50"
          style={{
            top: "30%",
            left: "65%",
            animation: "sonar-dot 2.4s ease-in-out 0.5s infinite",
          }}
        />
        <div
          className="absolute h-1.5 w-1.5 rounded-full bg-accent/40"
          style={{
            top: "55%",
            left: "25%",
            animation: "sonar-dot 2.4s ease-in-out 1.2s infinite",
          }}
        />
        <div
          className="absolute h-2 w-2 rounded-full bg-accent/30"
          style={{
            top: "70%",
            left: "60%",
            animation: "sonar-dot 2.4s ease-in-out 1.8s infinite",
          }}
        />
      </div>

      {/* Status text */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
          <span className="font-heading text-sm font-medium tracking-wide text-accent">
            Analyse en cours
          </span>
          <span className="inline-flex gap-0.5">
            <span className="animate-bounce text-accent" style={{ animationDelay: "0s" }}>.</span>
            <span className="animate-bounce text-accent" style={{ animationDelay: "0.15s" }}>.</span>
            <span className="animate-bounce text-accent" style={{ animationDelay: "0.3s" }}>.</span>
          </span>
        </div>
        <p className="text-sm text-text-secondary">
          Inspection des signatures spectrales et temporelles
        </p>
      </div>
    </div>
  );
}
