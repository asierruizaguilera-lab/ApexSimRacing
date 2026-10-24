'use client'

import { useEffect } from 'react'
import Link from 'next/link'

// Error de una página: mensaje genérico, sin trazas ni detalles internos (el error queda en los logs del servidor)
export default function ErrorPagina({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[Error página]', error.digest ?? '')
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <p className="text-6xl font-black text-apex-red mb-2">500</p>
        <h1 className="text-xl font-bold mb-2">Algo ha fallado</h1>
        <p className="text-apex-muted text-sm mb-6">
          Ha ocurrido un error inesperado. Inténtalo de nuevo en unos segundos.
          {error.digest && <span className="block text-xs mt-2 font-mono opacity-60">Ref: {error.digest}</span>}
        </p>
        <div className="flex justify-center gap-3">
          <button onClick={reset} className="px-5 py-2.5 bg-apex-red hover:bg-apex-red-dark rounded-xl font-semibold text-white text-sm">
            Reintentar
          </button>
          <Link href="/" className="px-5 py-2.5 border border-apex-border rounded-xl font-semibold text-sm">Inicio</Link>
        </div>
      </div>
    </div>
  )
}
