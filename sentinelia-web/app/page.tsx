import Link from "next/link";

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      {/* ── Ambient background effects ───────────────────── */}
      <div className="pointer-events-none absolute inset-0">
        {/* Top-left glow */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-accent/[0.04] blur-[120px]" />
        {/* Bottom-right glow */}
        <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-accent/[0.03] blur-[100px]" />
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(var(--color-accent) 1px, transparent 1px), linear-gradient(90deg, var(--color-accent) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      {/* ── Hero Section ─────────────────────────────────── */}
      <section className="relative mx-auto max-w-6xl px-6 pt-28 pb-20">
        {/* Status badge */}
        <div className="mb-8 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/[0.06] px-4 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            <span className="text-xs font-medium tracking-wide text-accent">
              Système opérationnel
            </span>
          </div>
        </div>

        {/* Title */}
        <h1 className="mx-auto max-w-4xl text-center font-heading text-4xl font-bold leading-[1.15] tracking-tight text-text-primary sm:text-5xl lg:text-[3.5rem]">
          Sentinel<span className="text-accent">IA</span>
          <span className="mx-3 text-text-muted">—</span>
          <br className="hidden sm:block" />
          Le bouclier national contre
          <br className="hidden lg:block" />
          {" "}les manipulations par IA
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-relaxed text-text-secondary">
          Détectez en quelques secondes les{" "}
          <span className="text-text-primary font-medium">voix clonées</span> et les{" "}
          <span className="text-text-primary font-medium">images ou vidéos truquées</span>{" "}
          par intelligence artificielle, grâce à nos modèles d&apos;analyse avancés.
        </p>

        {/* ── Feature Cards ────────────────────────────────── */}
        <div className="mt-16 grid gap-5 sm:grid-cols-2 sm:gap-6">
          {/* Card: Voix — taller left card */}
          <Link
            href="/voix"
            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-bg-card p-8 transition-all duration-300 hover:border-accent/30 hover:shadow-[0_0_40px_-12px_rgba(0,229,204,0.15)] sm:min-h-[320px] sm:rounded-[20px] sm:p-10"
          >
            {/* Corner accent line */}
            <div className="absolute top-0 left-0 h-px w-24 bg-gradient-to-r from-accent/60 to-transparent" />
            <div className="absolute top-0 left-0 h-24 w-px bg-gradient-to-b from-accent/60 to-transparent" />

            <div>
              {/* Icon */}
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-bg-primary transition-colors duration-300 group-hover:border-accent/30 group-hover:bg-accent/[0.06]">
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-accent"
                  aria-hidden="true"
                >
                  <rect x="9" y="2" width="6" height="11" rx="3" />
                  <path d="M5 10a7 7 0 0 0 14 0" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                  <line x1="8" y1="22" x2="16" y2="22" />
                </svg>
              </div>

              {/* Label */}
              <span className="mb-2 inline-block rounded-md bg-accent/[0.08] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-accent">
                Audio
              </span>
              <h2 className="font-heading text-2xl font-bold text-text-primary">
                Analyser une voix
              </h2>
              <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-text-secondary">
                Soumettez un enregistrement audio pour détecter les signatures de synthèse
                vocale, de clonage ou de manipulation par IA.
              </p>
            </div>

            {/* CTA arrow */}
            <div className="mt-8 flex items-center gap-2 text-sm font-medium text-text-muted transition-colors duration-200 group-hover:text-accent">
              Lancer l&apos;analyse
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-transform duration-300 group-hover:translate-x-1"
                aria-hidden="true"
              >
                <path d="M3.5 8h9M8.5 4l4 4-4 4" />
              </svg>
            </div>

            {/* Decorative waveform */}
            <div className="pointer-events-none absolute right-6 bottom-6 flex items-end gap-[3px] opacity-[0.07] transition-opacity duration-300 group-hover:opacity-[0.15]">
              {[40, 65, 30, 80, 50, 70, 35, 55, 75, 45, 60, 38, 72, 48, 58].map(
                (h, i) => (
                  <div
                    key={i}
                    className="w-[3px] rounded-full bg-accent"
                    style={{ height: `${h}px` }}
                  />
                )
              )}
            </div>
          </Link>

          {/* Card: Vision — right card with different proportions */}
          <Link
            href="/vision"
            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-bg-card p-8 transition-all duration-300 hover:border-accent/30 hover:shadow-[0_0_40px_-12px_rgba(0,229,204,0.15)] sm:min-h-[320px] sm:rounded-[20px] sm:p-10"
          >
            {/* Corner accent line — opposite corner */}
            <div className="absolute top-0 right-0 h-px w-24 bg-gradient-to-l from-accent/60 to-transparent" />
            <div className="absolute top-0 right-0 h-24 w-px bg-gradient-to-b from-accent/60 to-transparent" />

            <div>
              {/* Icon */}
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-bg-primary transition-colors duration-300 group-hover:border-accent/30 group-hover:bg-accent/[0.06]">
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-accent"
                  aria-hidden="true"
                >
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>

              {/* Label */}
              <span className="mb-2 inline-block rounded-md bg-accent/[0.08] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-accent">
                Visuel
              </span>
              <h2 className="font-heading text-2xl font-bold text-text-primary">
                Analyser une image / vidéo
              </h2>
              <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-text-secondary">
                Uploadez une image ou une vidéo pour identifier les deepfakes, les
                visages générés et les retouches par modèles génératifs.
              </p>
            </div>

            {/* CTA arrow */}
            <div className="mt-8 flex items-center gap-2 text-sm font-medium text-text-muted transition-colors duration-200 group-hover:text-accent">
              Lancer l&apos;analyse
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-transform duration-300 group-hover:translate-x-1"
                aria-hidden="true"
              >
                <path d="M3.5 8h9M8.5 4l4 4-4 4" />
              </svg>
            </div>

            {/* Decorative scan grid */}
            <div className="pointer-events-none absolute right-6 bottom-6 opacity-[0.06] transition-opacity duration-300 group-hover:opacity-[0.14]">
              <svg
                width="80"
                height="80"
                viewBox="0 0 80 80"
                fill="none"
                aria-hidden="true"
              >
                {/* Grid lines */}
                <line x1="0" y1="20" x2="80" y2="20" stroke="var(--color-accent)" strokeWidth="0.5" />
                <line x1="0" y1="40" x2="80" y2="40" stroke="var(--color-accent)" strokeWidth="0.5" />
                <line x1="0" y1="60" x2="80" y2="60" stroke="var(--color-accent)" strokeWidth="0.5" />
                <line x1="20" y1="0" x2="20" y2="80" stroke="var(--color-accent)" strokeWidth="0.5" />
                <line x1="40" y1="0" x2="40" y2="80" stroke="var(--color-accent)" strokeWidth="0.5" />
                <line x1="60" y1="0" x2="60" y2="80" stroke="var(--color-accent)" strokeWidth="0.5" />
                {/* Crosshair */}
                <circle cx="40" cy="40" r="12" stroke="var(--color-accent)" strokeWidth="1" />
                <circle cx="40" cy="40" r="3" fill="var(--color-accent)" />
              </svg>
            </div>
          </Link>
        </div>
      </section>

      {/* ── Divider ──────────────────────────────────────── */}
      <div className="mx-auto max-w-6xl px-6">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* ── How it works ─────────────────────────────────── */}
      <section className="relative mx-auto max-w-6xl px-6 py-24">
        <div className="mb-14 text-center">
          <span className="mb-3 inline-block rounded-md bg-accent/[0.08] px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-accent">
            Processus
          </span>
          <h2 className="font-heading text-3xl font-bold tracking-tight text-text-primary">
            Comment ça marche
          </h2>
        </div>

        <div className="relative grid gap-6 sm:grid-cols-3">
          {/* Connecting line behind steps */}
          <div className="pointer-events-none absolute top-12 right-[16.67%] left-[16.67%] hidden h-px bg-gradient-to-r from-border via-accent/20 to-border sm:block" />

          {/* Step 1 */}
          <StepCard
            number="01"
            title="Soumettez"
            description="Uploadez un fichier audio, une image ou une vidéo via notre interface sécurisée."
            icon={<UploadIcon />}
          />

          {/* Step 2 */}
          <StepCard
            number="02"
            title="Analysez"
            description="Nos modèles d'IA inspectent le contenu à la recherche de signatures de manipulation."
            icon={<ScanIcon />}
          />

          {/* Step 3 */}
          <StepCard
            number="03"
            title="Résultat"
            description="Recevez un verdict clair avec un score de confiance et des zones suspectes identifiées."
            icon={<ResultIcon />}
          />
        </div>
      </section>
    </div>
  );
}

/* ── Step Card Component ───────────────────────────────────── */
function StepCard({
  number,
  title,
  description,
  icon,
}: {
  number: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="group relative flex flex-col items-center text-center">
      {/* Icon circle */}
      <div className="relative z-10 mb-6 flex h-24 w-24 items-center justify-center rounded-2xl border border-border bg-bg-card transition-all duration-300 group-hover:border-accent/25 group-hover:shadow-[0_0_30px_-8px_rgba(0,229,204,0.12)]">
        <div className="text-text-muted transition-colors duration-300 group-hover:text-accent">
          {icon}
        </div>
        {/* Step number */}
        <span className="absolute -top-2.5 -right-2.5 flex h-7 w-7 items-center justify-center rounded-lg bg-bg-primary text-[11px] font-bold text-accent ring-1 ring-accent/25">
          {number}
        </span>
      </div>

      <h3 className="font-heading text-lg font-semibold text-text-primary">
        {title}
      </h3>
      <p className="mt-2 max-w-[260px] text-sm leading-relaxed text-text-secondary">
        {description}
      </p>
    </div>
  );
}

/* ── Icons ──────────────────────────────────────────────────── */
function UploadIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function ScanIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Scan frame corners */}
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      {/* Scan line */}
      <line x1="7" y1="12" x2="17" y2="12" />
      {/* Pulse dots */}
      <circle cx="12" cy="8" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="16" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ResultIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Shield */}
      <path d="M12 2l8 4v6c0 5.6-3.4 10.8-8 12-4.6-1.2-8-6.4-8-12V6l8-4z" />
      {/* Checkmark */}
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}
