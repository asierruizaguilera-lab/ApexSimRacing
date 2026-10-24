import Link from 'next/link'

// Páginas legales públicas. Los textos son una base: todo lo marcado [REVISAR ASESOR] debe validarlo
// un asesor legal antes de darlo por definitivo.
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-apex-bg">
      <header className="border-b border-apex-border px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/"><img src="/logo-apex-medio.jpg" alt="APEX SimRacing" className="h-8 w-auto rounded" /></Link>
          <nav className="flex gap-4 text-sm text-apex-muted">
            <Link href="/privacidad" className="hover:text-apex-text">Privacidad</Link>
            <Link href="/terminos" className="hover:text-apex-text">Términos</Link>
            <Link href="/cookies" className="hover:text-apex-text">Cookies</Link>
          </nav>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-10">{children}</main>
    </div>
  )
}
