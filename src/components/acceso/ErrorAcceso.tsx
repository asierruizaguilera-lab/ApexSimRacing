import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

/** Se muestra cuando no se pudo comprobar el acceso (fallo al leer el modo temporada gratuita). */
export function ErrorAcceso() {
  return (
    <div className="min-h-screen bg-apex-bg flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 bg-apex-card border border-apex-border rounded-2xl flex items-center justify-center mb-6">
        <AlertTriangle size={28} className="text-apex-red" />
      </div>
      <h1 className="text-xl font-bold mb-2">No hemos podido comprobar tu acceso</h1>
      <p className="text-apex-muted max-w-sm mb-6">
        Ha fallado una comprobación interna. No es cosa de tu cuenta: vuelve a intentarlo en unos segundos.
      </p>
      <Link href="/"
        className="px-6 py-3 bg-apex-red hover:bg-apex-red-dark text-white rounded-xl font-semibold transition-colors">
        Volver al inicio
      </Link>
    </div>
  )
}
