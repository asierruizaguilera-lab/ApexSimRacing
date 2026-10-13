'use client'

import Link from 'next/link'
import { Clock, FileText, ListChecks, Play } from 'lucide-react'

type Clase = {
  id: string
  titulo: string
  descripcion: string | null
  numeroModulo: string | null
  thumbnailUrl: string | null
  duracionMin: number | null
  duracionTexto: string | null
  numeroTecnicas: number | null
  linkPresentacion: string | null
  totalVistas: number
  vistaPorMi: boolean
}

function ModuloCard({ clase }: { clase: Clase }) {
  const duracion = clase.duracionTexto ?? (clase.duracionMin ? `${clase.duracionMin} MIN` : null)

  return (
    <div className="bg-apex-card border border-apex-border rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-apex-red/40 transition-colors">
      <div className="flex items-start gap-4 flex-1 min-w-0">
        {clase.numeroModulo !== null && (
          <div className="w-16 shrink-0 text-center">
            <span className="block text-[10px] font-semibold tracking-widest text-apex-muted uppercase">Módulo</span>
            <span className="block text-4xl font-black text-apex-red leading-none tabular-nums">{clase.numeroModulo}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base leading-snug">{clase.titulo}</h3>
          {clase.descripcion && (
            <p className="text-sm text-apex-muted mt-1 leading-relaxed">{clase.descripcion}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-apex-muted">
            {duracion && (
              <span className="flex items-center gap-1"><Clock size={12} />{duracion}</span>
            )}
            {clase.numeroTecnicas !== null && (
              <span className="flex items-center gap-1">
                <ListChecks size={12} />{clase.numeroTecnicas} {clase.numeroTecnicas === 1 ? 'técnica' : 'técnicas'}
              </span>
            )}
            {clase.vistaPorMi && <span className="text-green-400 font-medium">✓ Vista</span>}
          </div>
        </div>
      </div>

      <div className="shrink-0 flex flex-wrap gap-2 sm:pl-2">
        {clase.linkPresentacion ? (
          <Link
            href={`/academia/${clase.id}`}
            className="inline-flex items-center gap-2 bg-apex-red hover:bg-apex-red/90 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <FileText size={14} /> Ver presentación
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-2 bg-apex-surface border border-apex-border text-apex-muted text-sm font-semibold px-4 py-2 rounded-lg cursor-not-allowed"
          >
            <FileText size={14} /> Presentación próximamente
          </button>
        )}
        {clase.thumbnailUrl && (
          <Link
            href={`/academia/${clase.id}`}
            className="inline-flex items-center gap-2 bg-apex-surface border border-apex-border hover:border-apex-red/40 text-apex-text text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <Play size={14} fill="currentColor" /> Ver vídeo
          </Link>
        )}
      </div>
    </div>
  )
}

export function AcademiaClient({ clases }: { clases: Clase[] }) {
  if (clases.length === 0) {
    return (
      <div className="bg-apex-card border border-apex-border rounded-xl p-12 text-center text-apex-muted">
        No hay módulos disponibles todavía.
      </div>
    )
  }

  // Módulos en orden de aprendizaje
  return (
    <div className="space-y-3">
      {clases.map(clase => <ModuloCard key={clase.id} clase={clase} />)}
    </div>
  )
}
