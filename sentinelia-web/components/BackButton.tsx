import Link from "next/link";

export default function BackButton() {
  return (
    <Link
      href="/"
      aria-label="Retourner à l'accueil"
      className="inline-flex items-center justify-center p-2 mb-6 rounded-lg bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-cyan-400 transition-all duration-200 border border-slate-700/50 hover:border-cyan-500/30 group backdrop-blur-sm shadow-sm hover:shadow-cyan-500/10"
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="20" 
        height="20" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className="group-hover:-translate-x-0.5 transition-transform duration-200"
      >
        <path d="m12 19-7-7 7-7"/>
        <path d="M19 12H5"/>
      </svg>
    </Link>
  );
}
