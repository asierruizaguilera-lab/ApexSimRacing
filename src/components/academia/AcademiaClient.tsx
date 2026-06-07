'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn, DISCIPLINA_LABELS } from '@/lib/utils'

const DISCIPLINAS = ['RALLY', 'CIRCUITO', 'DRIFT', 'KARTCROSS', 'MONOPLAZA'] as const

const TAB_COLORS: Record<string, string> = {
  TODOS: 'bg-apex-red text-white',
  RALLY: 'bg-orange-500 text-white',
  CIRCUITO: 'bg-blue-500 text-white',
  DRIFT: 'bg-purple-500 text-white',
  KARTCROSS: 'bg-green-500 text-white',
  MONOPLAZA: 'bg-red-500 text-white',
}

const BADGE_COLORS: Record<string, string> = {
  RALLY: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  CIRCUITO: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  DRIFT: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  KARTCROSS: 'bg-green-500/20 text-green-400 border-green-500/30',
  MONOPLAZA: 'bg-red-500/20 text-red-400 border-red-500/30',
}

type Clase = {
  id: string
  titulo: string
  descripcion: string | null
  disciplina: string
  thumbnailUrl: string
  duracionMin: number | null
  totalVistas: number
  vistaPorMi: boolean
}

export function AcademiaClient({ clases }: { clases: Clase[] }) {
  const [tab, setTab] = useState('TODOS')

  const filtradas = tab === 'TODOS' ? clases : clases.filter(c => c.disciplina === tab)

  const disciplinasConClases = DISCIPLINAS.filter(d => clases.some(c => c.disciplina === d))

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setTab('TODOS')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-all',
            tab === 'TODOS' ? TAB_COLORS.TODOS : 'bg-apex-card border border-apex-border text-apex-muted hover:text-apex-text'
          )}
        >
          Todas ({clases.length})
        </button>
        {disciplinasConClases.map(d => (
          <button
            key={d}
            onClick={() => setTab(d)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === d ? TAB_COLORS[d] : 'bg-apex-card border border-apex-border text-apex-muted hover:text-apex-text'
            )}
          >
            {DISCIPLINA_LABELS[d]} ({clases.filter(c => c.disciplina === d).length})
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtradas.length === 0 ? (
        <div className="bg-apex-card border border-apex-border rounded-xl p-12 text-center text-apex-muted">
          No hay clases disponibles en esta disciplina todavía.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtradas.map(clase => (
            <Link key={clase.id} href={`/academia/${clase.id}`} className="group block">
              <div className="bg-apex-card border border-apex-border rounded-xl overflow-hidden hover:border-apex-red/40 transition-all duration-200 group-hover:shadow-lg group-hover:shadow-black/20">
                {/* Thumbnail */}
                <div className="relative aspect-video bg-apex-surface overflow-hidden">
                  <img
                    src={clase.thumbnailUrl}
                    alt={clase.titulo}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${clase.thumbnailUrl.split('/vi/')[1]?.split('/')[0]}/hqdefault.jpg`
                    }}
                  />
                  {/* Duration badge */}
                  {clase.duracionMin && (
                    <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-0.5 rounded-md font-medium">
                      {clase.duracionMin} min
                    </div>
                  )}
                  {/* Vista badge */}
                  {clase.vistaPorMi && (
                    <div className="absolute top-2 right-2 bg-green-500/90 text-white text-xs px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                      ✓ Vista
                    </div>
                  )}
                  {/* Play overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-14 h-14 bg-apex-red/90 rounded-full flex items-center justify-center shadow-lg">
                      <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6 ml-1">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full border', BADGE_COLORS[clase.disciplina])}>
                      {DISCIPLINA_LABELS[clase.disciplina]}
                    </span>
                    <span className="text-xs text-apex-muted">{clase.totalVistas} vistas</span>
                  </div>
                  <h3 className="font-semibold text-sm leading-snug mb-1 group-hover:text-apex-red transition-colors line-clamp-2">
                    {clase.titulo}
                  </h3>
                  {clase.descripcion && (
                    <p className="text-xs text-apex-muted line-clamp-2">{clase.descripcion}</p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
