'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

export function Modal({ titulo, onClose, children, ancho = 'max-w-lg' }: {
  titulo: string
  onClose: () => void
  children: React.ReactNode
  ancho?: string
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={titulo}
        className={`w-full ${ancho} max-h-[90vh] overflow-y-auto bg-apex-card border border-apex-border rounded-2xl shadow-2xl animate-fade-in`}
        onMouseDown={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-apex-border sticky top-0 bg-apex-card z-10">
          <h2 className="font-semibold">{titulo}</h2>
          <button onClick={onClose} aria-label="Cerrar" className="text-apex-muted hover:text-apex-text transition-colors"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
