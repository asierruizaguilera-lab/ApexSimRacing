'use client'

import Link from 'next/link'
import { DISCIPLINA_COLORS, DISCIPLINA_LABELS, PLAN_LABELS, PLAN_COLORS, cn } from '@/lib/utils'
import { Car, Lock, Star } from 'lucide-react'

interface Coche {
  id: string
  nombre: string
  disciplina: string
  planMinimo: string
  descripcion: string | null
  imagen: string | null
  modAC: string | null
}

interface Props {
  coches: Coche[]
  suscripcionActual: { plan: string; estado: string } | null
}

const DISCIPLINAS_ORDER = ['CIRCUITO', 'RALLY', 'DRIFT', 'KARTCROSS', 'MONOPLAZA']

export function GarajeClient({ coches, suscripcionActual }: Props) {
  if (!suscripcionActual) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 bg-apex-card border border-apex-border rounded-2xl flex items-center justify-center mb-6">
          <Lock size={32} className="text-apex-muted" />
        </div>
        <h2 className="text-xl font-bold mb-2">Activa tu plan para desbloquear coches</h2>
        <p className="text-apex-muted max-w-sm mb-6">
          Con un plan activo accedes a coches exclusivos de SimRacing organizados por disciplina.
        </p>
        <Link href="/planes"
          className="flex items-center gap-2 px-6 py-3 bg-apex-red hover:bg-apex-red-dark text-white rounded-xl font-semibold transition-colors">
          <Star size={16} />Ver Planes
        </Link>
      </div>
    )
  }

  if (coches.length === 0) {
    return (
      <div className="text-center py-16 text-apex-muted">
        <Car size={48} className="mx-auto mb-4 opacity-30" />
        <p>No tienes coches desbloqueados aún.</p>
        <Link href="/planes" className="text-apex-red hover:underline text-sm mt-2 inline-block">
          Actualiza tu plan para más coches
        </Link>
      </div>
    )
  }

  // Agrupar por disciplina
  const porDisciplina = DISCIPLINAS_ORDER.reduce((acc, disc) => {
    const lista = coches.filter(c => c.disciplina === disc)
    if (lista.length > 0) acc[disc] = lista
    return acc
  }, {} as Record<string, Coche[]>)

  return (
    <div className="space-y-8">
      {/* Banner plan */}
      <div className="bg-apex-card border border-apex-border rounded-xl p-4 flex items-center gap-3">
        <div className={cn('text-xs px-2.5 py-1 rounded-full border font-semibold', PLAN_COLORS[suscripcionActual.plan])}>
          {PLAN_LABELS[suscripcionActual.plan]}
        </div>
        <span className="text-sm text-apex-muted">
          {coches.length} coches desbloqueados
        </span>
        {suscripcionActual.plan !== 'ELITE' && (
          <Link href="/planes" className="ml-auto text-xs text-apex-red hover:underline flex items-center gap-1">
            <Star size={11} />Actualizar plan
          </Link>
        )}
      </div>

      {/* Secciones por disciplina */}
      {Object.entries(porDisciplina).map(([disc, lista]) => (
        <div key={disc}>
          <div className="flex items-center gap-2 mb-4">
            <span className={cn('text-xs px-2 py-0.5 rounded-full border', DISCIPLINA_COLORS[disc])}>
              {DISCIPLINA_LABELS[disc]}
            </span>
            <span className="text-apex-muted text-sm">{lista.length} coches</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {lista.map(coche => (
              <div key={coche.id} className="bg-apex-card border border-apex-border rounded-xl p-4 hover:border-apex-red/30 transition-all group">
                {/* Imagen placeholder */}
                <div className="w-full h-28 bg-apex-surface rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                  {coche.imagen ? (
                    <img src={coche.imagen} alt={coche.nombre} className="w-full h-full object-cover" />
                  ) : (
                    <Car size={36} className="text-apex-border" />
                  )}
                </div>

                <h3 className="font-semibold text-sm mb-1 group-hover:text-apex-red transition-colors">
                  {coche.nombre}
                </h3>

                {coche.descripcion && (
                  <p className="text-xs text-apex-muted mb-2 line-clamp-2">{coche.descripcion}</p>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn('text-xs px-1.5 py-0.5 rounded-full border', PLAN_COLORS[coche.planMinimo])}>
                    {PLAN_LABELS[coche.planMinimo]}
                  </span>
                  {coche.modAC && (
                    <span className="text-xs text-apex-muted bg-apex-surface px-2 py-0.5 rounded-full truncate max-w-[120px]" title={coche.modAC}>
                      AC: {coche.modAC}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
