import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "SentinelIA — Détecteur de manipulations IA",
  description:
    "SentinelIA surveille et détecte les contenus manipulés par intelligence artificielle : voix synthétiques, images générées et deepfakes.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.svg", type: "image/svg+xml" }
    ],
    apple: [
      { url: "/icon-192.png" }
    ]
  },
  manifest: "/manifest.json"
};

export const viewport: Viewport = {
  themeColor: "#0A0E17",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${spaceGrotesk.variable} ${inter.variable} h-full`}
    >
      <body className="min-h-full flex flex-col antialiased">
        {/* ── Navigation ─────────────────────────────────── */}
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-bg-primary/80 backdrop-blur-lg">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
            {/* Logo */}
            <Link href="/" className="group flex items-center gap-2.5 focus-ring">
              {/* Sentinel icon */}
              <div className="relative flex h-9 w-9 items-center justify-center">
                <svg
                  viewBox="0 0 36 36"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-9 w-9"
                  aria-hidden="true"
                >
                  {/* Shield outline */}
                  <path
                    d="M18 3L4 9v9c0 8.4 5.96 16.26 14 18 8.04-1.74 14-9.6 14-18V9L18 3z"
                    stroke="#00E5CC"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                    fill="none"
                    className="transition-all duration-300 group-hover:fill-accent-muted"
                  />
                  {/* Eye / scan circle */}
                  <circle
                    cx="18"
                    cy="17"
                    r="5"
                    stroke="#00E5CC"
                    strokeWidth="1.5"
                    fill="none"
                    className="transition-all duration-300 group-hover:stroke-[2]"
                  />
                  {/* Pupil dot */}
                  <circle
                    cx="18"
                    cy="17"
                    r="2"
                    fill="#00E5CC"
                    className="transition-all duration-300 group-hover:r-[2.5]"
                  />
                </svg>
                {/* Glow effect */}
                <div className="absolute inset-0 rounded-full bg-accent/10 blur-md opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </div>

              <span className="font-heading text-xl font-bold tracking-tight text-text-primary">
                Sentinel
                <span className="text-accent">IA</span>
              </span>
            </Link>

            {/* Nav links */}
            <div className="flex items-center gap-1">
              <NavLink href="/voix" label="Voix" icon={<VoixIcon />} />
              <NavLink href="/vision" label="Vision" icon={<VisionIcon />} />
            </div>
          </div>
        </nav>

        {/* ── Main content ───────────────────────────────── */}
        <main className="flex-1 pt-16">{children}</main>
      </body>
    </html>
  );
}

/* ── NavLink component ─────────────────────────────────────── */
function NavLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="focus-ring group relative flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-text-secondary transition-colors duration-200 hover:bg-bg-card hover:text-text-primary"
    >
      <span className="text-text-muted transition-colors duration-200 group-hover:text-accent">
        {icon}
      </span>
      {label}
      {/* Active indicator line */}
      <span className="absolute bottom-0 left-1/2 h-px w-0 -translate-x-1/2 bg-accent transition-all duration-300 group-hover:w-2/3" />
    </Link>
  );
}

/* ── Icons ──────────────────────────────────────────────────── */
function VoixIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Microphone */}
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  );
}

function VisionIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Eye */}
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
