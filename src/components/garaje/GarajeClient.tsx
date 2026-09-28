'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DISCIPLINA_COLORS, DISCIPLINA_LABELS, PLAN_LABELS, PLAN_COLORS, formatFechaHora, cn } from '@/lib/utils'
import { Car, Lock, Star, Download, Flag, Clock, X, FolderOpen } from 'lucide-react'

interface Coche {
  id: string
  nombre: string
  disciplina: string
  planMinimo: string
  descripcion: string | null
  imagen: string | null
  imagenUrl: string | null
  linkDescarga: string | null
}

interface CarreraMods {
  id: string; nombre: string; circuito: string; fecha: string; coche: string | null
  linkModCircuito: string | null; linkModCoche: string | null
  campeonato: { id: string; nombre: string }
}

interface Props {
  coches: Coche[]
  suscripcionActual: { plan: string; estado: string } | null
  carrerasConMods?: CarreraMods[]
}

const DISCIPLINAS_ORDER = ['CIRCUITO', 'RALLY', 'DRIFT', 'KARTCROSS', 'MONOPLAZA']
const PLACEHOLDER = '/placeholder-car.jpg'

function CocheImagen({ coche, className }: { coche: Coche; className?: string }) {
  return (
    <img
      src={coche.imagenUrl || coche.imagen || PLACEHOLDER}
      alt={coche.nombre}
      loading="lazy"
      width={400}
      height={300}
      onError={e => { if (!e.currentTarget.src.endsWith(PLACEHOLDER)) e.currentTarget.src = PLACEHOLDER }}
      className={cn('w-full aspect-[4/3] object-cover bg-apex-surface', className)}
    />
  )
}

function Badges({ coche }: { coche: Coche }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className={cn('text-xs px-2 py-0.5 rounded-full border', DISCIPLINA_COLORS[coche.disciplina])}>
        {DISCIPLINA_LABELS[coche.disciplina]}
      </span>
      <span className={cn('text-xs px-2 py-0.5 rounded-full border', PLAN_COLORS[coche.planMinimo])}>
        {PLAN_LABELS[coche.planMinimo]}
      </span>
    </div>
  )
}

function CocheCard({ coche, onOpen }: { coche: Coche; onOpen: () => void }) {
  const [expandida, setExpandida] = useState(false)
  const larga = (coche.descripcion?.length ?? 0) > 90

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={e => { if (e.key === 'Enter') onOpen() }}
      className="bg-apex-card border border-apex-border rounded-xl overflow-hidden hover:border-apex-red/30 transition-all group cursor-pointer flex flex-col"
    >
      <div className="overflow-hidden">
        <CocheImagen coche={coche} className="group-hover:scale-[1.03] transition-transform duration-300" />
      </div>

      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-bold text-lg leading-tight mb-2 group-hover:text-apex-red transition-colors">
          {coche.nombre}
        </h3>
        <div className="mb-3"><Badges coche={coche} /></div>

        {coche.descripcion && (
          <div className="mb-4">
            <p className={cn('text-sm text-apex-muted italic', !expandida && 'line-clamp-2')}>{coche.descripcion}</p>
            {larga && (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setExpandida(v => !v) }}
                className="text-xs text-apex-red hover:underline mt-1"
              >
                {expandida ? 'ver menos' : 'ver más'}
              </button>
            )}
          </div>
        )}

        <div className="mt-auto">
          {coche.linkDescarga ? (
            <a
              href={coche.linkDescarga}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-apex-red hover:bg-apex-red-dark text-white rounded-lg text-sm font-semibold transition-colors"
            >
              <Download size={14} />Descargar mod
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-apex-surface border border-apex-border text-apex-muted rounded-lg text-sm font-semibold cursor-not-allowed opacity-70"
            >
              <Clock size={14} />Próximamente
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function CocheModal({ coche, onClose }: { coche: Coche; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={coche.nombre}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-apex-card border border-apex-border rounded-2xl shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
        >
          <X size={18} />
        </button>

        <CocheImagen coche={coche} className="rounded-t-2xl" />

        <div className="p-6 space-y-5">
          <div>
            <h2 className="text-2xl font-bold mb-3">{coche.nombre}</h2>
            <Badges coche={coche} />
          </div>

          {coche.descripcion && (
            <p className="text-apex-muted italic leading-relaxed">{coche.descripcion}</p>
          )}

          <div className="bg-apex-surface border border-apex-border rounded-xl p-4">
            <div className="flex items-center gap-2 text-sm font-semibold mb-1">
              <FolderOpen size={15} className="text-apex-red" />Instalación
            </div>
            <p className="text-sm text-apex-muted">
              Descarga el mod, extrae el contenido en la carpeta{' '}
              <code className="text-apex-text bg-apex-card px-1.5 py-0.5 rounded text-xs">assettocorsa/content/cars/</code>{' '}
              y reinicia el juego.
            </p>
          </div>

          {coche.linkDescarga ? (
            <a
              href={coche.linkDescarga}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-apex-red hover:bg-apex-red-dark text-white rounded-xl font-bold transition-colors"
            >
              <Download size={18} />Descargar mod de Google Drive
            </a>
          ) : (
            <div className="flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-apex-surface border border-apex-border text-apex-muted rounded-xl text-sm text-center">
              <Clock size={16} className="shrink-0" />El mod de este coche estará disponible próximamente.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ModsCarrerasSection({ carreras }: { carreras: CarreraMods[] }) {
  if (carreras.length === 0) return null
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Flag size={16} className="text-apex-red" />
        <h2 className="font-semibold">Mods de tus próximas carreras</h2>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {carreras.map(c => (
          <div key={c.id} className="bg-apex-card border border-apex-border rounded-xl p-4">
            <div className="text-xs text-apex-muted mb-1">{c.campeonato.nombre} · {formatFechaHora(c.fecha)}</div>
            <h3 className="font-semibold text-sm mb-1">{c.nombre}</h3>
            <p className="text-xs text-apex-muted mb-3">{c.circuito}</p>
            {c.coche && (
              <span className="inline-block text-xs px-2 py-0.5 bg-apex-surface border border-apex-border rounded-full mb-2">
                {c.coche}
              </span>
            )}
            <div className="flex flex-wrap gap-2">
              {c.linkModCircuito && (
                <a href={c.linkModCircuito} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 bg-apex-surface border border-apex-border rounded-lg hover:border-apex-red/30 transition-colors">
                  <Download size={12} />Mod circuito
                </a>
              )}
              {c.linkModCoche && (
                <a href={c.linkModCoche} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 bg-apex-surface border border-apex-border rounded-lg hover:border-apex-red/30 transition-colors">
                  <Download size={12} />Mod coche
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function GarajeClient({ coches, suscripcionActual, carrerasConMods = [] }: Props) {
  const [seleccionado, setSeleccionado] = useState<Coche | null>(null)

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
      <div className="space-y-8">
        <ModsCarrerasSection carreras={carrerasConMods} />
        <div className="text-center py-16 text-apex-muted">
          <Car size={48} className="mx-auto mb-4 opacity-30" />
          <p>No tienes coches desbloqueados aún.</p>
          <Link href="/planes" className="text-apex-red hover:underline text-sm mt-2 inline-block">
            Actualiza tu plan para más coches
          </Link>
        </div>
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

      <ModsCarrerasSection carreras={carrerasConMods} />

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
              <CocheCard key={coche.id} coche={coche} onOpen={() => setSeleccionado(coche)} />
            ))}
          </div>
        </div>
      ))}

      {seleccionado && <CocheModal coche={seleccionado} onClose={() => setSeleccionado(null)} />}
    </div>
  )
}
