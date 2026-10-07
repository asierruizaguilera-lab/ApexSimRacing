'use client'

import { useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { DISCIPLINA_COLORS, DISCIPLINA_LABELS, ESTADO_CAMPEONATO_LABELS, PLAN_LABELS, PLAN_COLORS, planSuficiente, formatFecha, cn } from '@/lib/utils'
import { Users, Calendar, Trophy, ChevronRight, Lock, Shield } from 'lucide-react'

interface Campeonato {
  id: string
  nombre: string
  disciplina: string
  descripcion: string
  estado: string
  fechaInicio: string
  fechaFin: string
  maxPilotos: number
  imagen?: string | null
  categoriaMinima: string
  soloElite?: boolean
  esCampeonatoEquipos?: boolean
  _count: { inscripciones: number; carreras: number; inscripcionesEquipo?: number }
  inscrito?: string | null
}

const ESTADO_COLORS: Record<string, string> = {
  PROXIMO: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  ACTIVO: 'bg-green-500/20 text-green-400 border-green-500/30',
  FINALIZADO: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

interface Patrocinador {
  id: string
  nombre: string
  descripcion: string | null
  logoUrl: string | null
  linkExterno: string | null
}

export function CampeonatosClient({ campeonatos, userId, userPlan, patrocinadores = [], miEquipo = null }: {
  campeonatos: Campeonato[]
  userId?: string
  userPlan?: string | null
  patrocinadores?: Patrocinador[]
  miEquipo?: { id: string; nombre: string; esLider: boolean } | null
}) {
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'INDIVIDUAL' | 'EQUIPOS'>('TODOS')
  const [filtroEstado, setFiltroEstado] = useState('TODOS')
  const [filtroDisciplina, setFiltroDisciplina] = useState('TODOS')
  const [loading, setLoading] = useState<string | null>(null)
  const [inscripciones, setInscripciones] = useState<Record<string, string | null>>(
    Object.fromEntries(campeonatos.map(c => [c.id, c.inscrito || null]))
  )

  const filtrados = campeonatos.filter(c => {
    if (filtroTipo === 'INDIVIDUAL' && c.esCampeonatoEquipos) return false
    if (filtroTipo === 'EQUIPOS' && !c.esCampeonatoEquipos) return false
    if (filtroEstado !== 'TODOS' && c.estado !== filtroEstado) return false
    if (filtroDisciplina !== 'TODOS' && c.disciplina !== filtroDisciplina) return false
    return true
  })

  async function inscribirse(campeonatoId: string, equipos = false) {
    if (!userId) { toast.error('Debes iniciar sesión'); return }
    setLoading(campeonatoId)
    try {
      const res = await fetch(`/api/campeonatos/${campeonatoId}/${equipos ? 'inscribir-equipo' : 'inscribirse'}`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setInscripciones(prev => ({ ...prev, [campeonatoId]: 'PENDIENTE' }))
        toast.success(equipos ? 'Equipo inscrito. Pendiente de confirmación.' : 'Inscripción enviada. Pendiente de confirmación.')
      } else if (data.code === 'NO_SUBSCRIPTION' || data.code === 'PLAN_INSUFICIENTE' || data.code === 'SOLO_ELITE') {
        toast.error(data.error || 'Necesitas un plan activo para inscribirte')
        setTimeout(() => { window.location.href = '/planes' }, 1500)
      } else {
        toast.error(data.error || 'Error al inscribirse')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(null)
    }
  }

  const estados = ['TODOS', 'ACTIVO', 'PROXIMO', 'FINALIZADO']
  const disciplinas = ['TODOS', 'CIRCUITO', 'RALLY', 'DRIFT', 'KARTCROSS', 'MONOPLAZA', 'SUBIDAS']

  return (
    <div>
      {/* Banner patrocinadores */}
      {patrocinadores.length > 0 && (
        <div className="flex items-center gap-4 py-3 px-4 bg-apex-card/50 border border-apex-border rounded-xl mb-5">
          <span className="text-xs text-apex-muted whitespace-nowrap font-medium shrink-0">Patrocinado por</span>
          <div className="flex items-center gap-3 flex-wrap">
            {patrocinadores.map(p => {
              const logo = (
                <div
                  key={p.id}
                  className="w-8 h-8 rounded-lg border border-apex-border/50 bg-apex-card flex items-center justify-center overflow-hidden hover:border-apex-red/40 transition-colors"
                  title={p.nombre}
                >
                  {p.logoUrl ? (
                    <img src={p.logoUrl} alt={p.nombre} className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-[9px] font-bold text-apex-muted">
                      {p.nombre.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
              )
              return p.linkExterno ? (
                <a key={p.id} href={p.linkExterno} target="_blank" rel="noopener noreferrer">{logo}</a>
              ) : <div key={p.id}>{logo}</div>
            })}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex gap-1 bg-apex-card border border-apex-border rounded-lg p-1">
          {([['TODOS', 'Todos'], ['INDIVIDUAL', 'Individual'], ['EQUIPOS', 'Por Equipos']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setFiltroTipo(id)}
              className={cn('px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                filtroTipo === id ? 'bg-apex-red text-white' : 'text-apex-muted hover:text-apex-text'
              )}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-apex-card border border-apex-border rounded-lg p-1">
          {estados.map(e => (
            <button key={e} onClick={() => setFiltroEstado(e)}
              className={cn('px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                filtroEstado === e ? 'bg-apex-red text-white' : 'text-apex-muted hover:text-apex-text'
              )}>
              {e === 'TODOS' ? 'Todos' : ESTADO_CAMPEONATO_LABELS[e]}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-apex-card border border-apex-border rounded-lg p-1 flex-wrap">
          {disciplinas.map(d => (
            <button key={d} onClick={() => setFiltroDisciplina(d)}
              className={cn('px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                filtroDisciplina === d ? 'bg-apex-red text-white' : 'text-apex-muted hover:text-apex-text'
              )}>
              {d === 'TODOS' ? 'Todas' : DISCIPLINA_LABELS[d]}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtrados.length === 0 ? (
        <div className="text-center py-16 text-apex-muted">
          <Trophy size={48} className="mx-auto mb-4 opacity-30" />
          <p>No hay campeonatos con estos filtros</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtrados.map(c => {
            const estado = inscripciones[c.id]
            const esEquipos = !!c.esCampeonatoEquipos
            const inscritosCount = esEquipos ? (c._count.inscripcionesEquipo ?? 0) : c._count.inscripciones
            const lleno = inscritosCount >= c.maxPilotos
            const planOk = (userPlan ? planSuficiente(userPlan, c.categoriaMinima) : true) && (!c.soloElite || userPlan === 'ELITE')
            return (
              <div key={c.id} className="bg-apex-card border border-apex-border rounded-xl overflow-hidden hover:border-apex-red/30 transition-all group">
                {/* Header colored bar */}
                <div className={cn('h-1', {
                  'bg-green-500': c.estado === 'ACTIVO',
                  'bg-blue-500': c.estado === 'PROXIMO',
                  'bg-gray-500': c.estado === 'FINALIZADO',
                })} />

                <div className="p-5">
                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {esEquipos && (
                      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-semibold">
                        <Shield size={11} />EQUIPOS
                      </span>
                    )}
                    <span className={cn('text-xs px-2 py-0.5 rounded-full border', DISCIPLINA_COLORS[c.disciplina])}>
                      {DISCIPLINA_LABELS[c.disciplina]}
                    </span>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full border', ESTADO_COLORS[c.estado])}>
                      {ESTADO_CAMPEONATO_LABELS[c.estado]}
                    </span>
                    {!esEquipos && (
                      <span className={cn('text-xs px-2 py-0.5 rounded-full border', PLAN_COLORS[c.categoriaMinima])}>
                        Desde {PLAN_LABELS[c.categoriaMinima]}
                      </span>
                    )}
                    {c.soloElite && !esEquipos && (
                      <span className="text-xs px-2 py-0.5 rounded-full border bg-red-950 text-red-300 border-red-800 font-semibold">
                        ELITE
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-lg mb-1 group-hover:text-apex-red transition-colors line-clamp-2">
                    {c.nombre}
                  </h3>
                  <p className="text-apex-muted text-sm line-clamp-2 mb-4">{c.descripcion}</p>

                  {/* Meta */}
                  <div className="flex items-center gap-4 text-xs text-apex-muted mb-4">
                    <span className="flex items-center gap-1">
                      {esEquipos ? <Shield size={12} /> : <Users size={12} />}{inscritosCount}/{c.maxPilotos}{esEquipos ? ' equipos' : ''}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />{c._count.carreras} carreras
                    </span>
                    <span>{formatFecha(c.fechaInicio)}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Link href={`/campeonatos/${c.id}`}
                      className="flex-1 flex items-center justify-center gap-1 py-2 bg-apex-surface border border-apex-border rounded-lg text-sm hover:border-apex-red/50 transition-colors">
                      Ver detalles <ChevronRight size={14} />
                    </Link>

                    {c.estado !== 'FINALIZADO' && userId && esEquipos && (
                      estado === 'CONFIRMADA' ? (
                        <span className="px-3 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-xs font-medium">
                          ✓ Equipo inscrito
                        </span>
                      ) : estado === 'PENDIENTE' ? (
                        <span className="px-3 py-2 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-lg text-xs font-medium">
                          Pendiente
                        </span>
                      ) : lleno ? (
                        <span className="px-3 py-2 bg-gray-500/20 text-gray-400 border border-gray-500/30 rounded-lg text-xs">
                          Lleno
                        </span>
                      ) : miEquipo?.esLider ? (
                        <button onClick={() => inscribirse(c.id, true)}
                          disabled={loading === c.id}
                          className="px-3 py-2 bg-apex-red hover:bg-apex-red-dark text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 whitespace-nowrap">
                          {loading === c.id ? '...' : 'Inscribir equipo'}
                        </button>
                      ) : (
                        <span title={miEquipo ? 'Solo el líder puede inscribir al equipo' : 'Necesitas pertenecer a un equipo'}
                          className="flex items-center gap-1 px-3 py-2 bg-apex-surface border border-apex-border text-apex-muted rounded-lg text-xs whitespace-nowrap">
                          <Lock size={11} />{miEquipo ? 'Solo líderes' : 'Solo equipos'}
                        </span>
                      )
                    )}

                    {c.estado !== 'FINALIZADO' && userId && !esEquipos && (
                      estado === 'CONFIRMADA' ? (
                        <span className="px-3 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-xs font-medium">
                          ✓ Inscrito
                        </span>
                      ) : estado === 'PENDIENTE' ? (
                        <span className="px-3 py-2 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-lg text-xs font-medium">
                          Pendiente
                        </span>
                      ) : lleno ? (
                        <span className="px-3 py-2 bg-gray-500/20 text-gray-400 border border-gray-500/30 rounded-lg text-xs">
                          Lleno
                        </span>
                      ) : !planOk ? (
                        <Link href="/planes"
                          title={c.soloElite ? 'Este campeonato es exclusivo para pilotos Elite' : `Necesitas el plan ${PLAN_LABELS[c.categoriaMinima]} para esta categoría`}
                          className="flex items-center gap-1 px-3 py-2 bg-apex-surface border border-apex-border text-apex-muted rounded-lg text-xs font-medium whitespace-nowrap hover:border-apex-red/30 transition-colors">
                          <Lock size={11} />{c.soloElite ? 'Solo Elite' : `Plan ${PLAN_LABELS[c.categoriaMinima]}`}
                        </Link>
                      ) : (
                        <button onClick={() => inscribirse(c.id)}
                          disabled={loading === c.id}
                          className="px-3 py-2 bg-apex-red hover:bg-apex-red-dark text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 whitespace-nowrap">
                          {loading === c.id ? '...' : 'Inscribirme'}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
