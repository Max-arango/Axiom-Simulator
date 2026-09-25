import Link from "next/link";
import { Logo } from "@/components/landing/logo";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-paper/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" aria-label="Volver al inicio">
            <Logo />
          </Link>
          <nav className="flex gap-4 text-sm text-graphite">
            <Link href="/legal/terminos" className="hover:text-ink transition-colors">Términos</Link>
            <Link href="/legal/privacidad" className="hover:text-ink transition-colors">Privacidad</Link>
            <Link href="/legal/cookies" className="hover:text-ink transition-colors">Cookies</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        {children}
      </main>
      <footer className="border-t border-line py-8 text-center">
        <p className="text-sm text-graphite">
          © {new Date().getFullYear()} AXIOM ·{" "}
          <Link href="/" className="hover:text-vermilion transition-colors">Inicio</Link>
        </p>
      </footer>
    </div>
  );
}
