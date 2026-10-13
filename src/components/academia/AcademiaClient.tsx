'use client'

import Link from 'next/link'
import { Clock, ListChecks, Play } from 'lucide-react'

type Clase = {
  id: string
  titulo: string
  descripcion: string | null
  numeroModulo: string | null
  thumbnailUrl: string | null
  duracionMin: number | null
  duracionTexto: string | null
  numeroTecnicas: number | null
  totalVistas: number
  vistaPorMi: boolean
}

type Patrocinador = {
  id: string
  nombre: string
  descripcion: string | null
  logoUrl: string | null
  linkExterno: string | null
  esColaborador: boolean
}

function initials(nombre: string) {
  return nombre.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function ColaboradorCard({ p }: { p: Patrocinador }) {
  return (
    <div className="bg-apex-card border-2 border-apex-red/60 rounded-2xl p-5 flex items-start gap-4">
      <div className="w-14 h-14 rounded-full bg-apex-red flex items-center justify-center font-bold text-white text-xl shrink-0 overflow-hidden">
        {p.logoUrl ? (
          <img src={p.logoUrl} alt={p.nombre} className="w-full h-full object-cover" />
        ) : (
          <span>{initials(p.nombre)}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-bold text-lg leading-tight">{p.nombre}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-apex-red/20 text-apex-red border border-apex-red/30 font-semibold">
            Colaborador Técnico
          </span>
        </div>
        {p.descripcion && (
          <p className="text-apex-muted text-sm leading-relaxed">{p.descripcion}</p>
        )}
      </div>
    </div>
  )
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

      <div className="shrink-0 sm:pl-2">
        {clase.thumbnailUrl ? (
          <Link
            href={`/academia/${clase.id}`}
            className="inline-flex items-center gap-2 bg-apex-red hover:bg-apex-red/90 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <Play size={14} fill="currentColor" /> Ver vídeo
          </Link>
        ) : (
          <span className="inline-block text-xs font-semibold px-3 py-1.5 rounded-full bg-apex-surface border border-apex-border text-apex-muted">
            Próximamente
          </span>
        )}
      </div>
    </div>
  )
}

export function AcademiaClient({ clases, patrocinadores = [] }: { clases: Clase[]; patrocinadores?: Patrocinador[] }) {
  const modulos = clases.filter(c => c.numeroModulo !== null)
  const otras = clases.filter(c => c.numeroModulo === null)
  const colaborador = patrocinadores.find(p => p.esColaborador)

  return (
    <div className="space-y-5">
      {/* Card colaborador técnico — dinámica desde BD */}
      {colaborador && (
        colaborador.linkExterno ? (
          <a href={colaborador.linkExterno} target="_blank" rel="noopener noreferrer" className="block">
            <ColaboradorCard p={colaborador} />
          </a>
        ) : (
          <ColaboradorCard p={colaborador} />
        )
      )}

      {clases.length === 0 ? (
        <div className="bg-apex-card border border-apex-border rounded-xl p-12 text-center text-apex-muted">
          No hay módulos disponibles todavía.
        </div>
      ) : (
        <>
          {/* Módulos en orden de aprendizaje */}
          <div className="space-y-3">
            {modulos.map(clase => <ModuloCard key={clase.id} clase={clase} />)}
          </div>

          {otras.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-semibold text-sm text-apex-muted uppercase tracking-wider pt-2">Otras clases</h2>
              {otras.map(clase => <ModuloCard key={clase.id} clase={clase} />)}
            </div>
          )}
        </>
      )}
    </div>
  )
}
