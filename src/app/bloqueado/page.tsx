import Link from 'next/link'

export default function BloqueadoPage() {
  return (
    <div className="min-h-screen bg-apex-bg flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-2xl mb-6">
          <span className="text-3xl">🚫</span>
        </div>
        <h1 className="text-3xl font-bold tracking-widest text-white mb-2">APEX</h1>
        <div className="bg-apex-card border border-red-500/30 rounded-2xl p-8 mt-6">
          <h2 className="text-xl font-bold text-red-400 mb-3">Cuenta Suspendida</h2>
          <p className="text-apex-muted mb-6 leading-relaxed">
            Tu cuenta ha sido suspendida por el equipo de APEX. Si crees que es un error
            o quieres apelar la decisión, contacta con el soporte.
          </p>
          <a
            href="mailto:soporte@apex.gg"
            className="block w-full py-3 bg-apex-red hover:bg-apex-red-dark text-white rounded-xl font-semibold transition-colors"
          >
            Contactar Soporte
          </a>
          <Link href="/login" className="block mt-3 text-sm text-apex-muted hover:text-apex-text transition-colors">
            Intentar con otra cuenta
          </Link>
        </div>
      </div>
    </div>
  )
}
