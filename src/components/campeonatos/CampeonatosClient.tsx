'use client'

import { useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { DISCIPLINA_COLORS, DISCIPLINA_LABELS, SIMULADOR_LABELS, ESTADO_CAMPEONATO_LABELS, formatFecha, cn } from '@/lib/utils'
import { Users, Calendar, Trophy, ChevronRight } from 'lucide-react'

interface Campeonato {
  id: string
  nombre: string
  disciplina: string
  simulador: string
  descripcion: string
  estado: string
  fechaInicio: string
  fechaFin: string
  maxPilotos: number
  imagen?: string | null
  _count: { inscripciones: number; carreras: number }
  inscrito?: string | null
}

const ESTADO_COLORS: Record<string, string> = {
  PROXIMO: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  ACTIVO: 'bg-green-500/20 text-green-400 border-green-500/30',
  FINALIZADO: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

export function CampeonatosClient({ campeonatos, userId }: { campeonatos: Campeonato[]; userId?: string }) {
  const [filtroEstado, setFiltroEstado] = useState('TODOS')
  const [filtroDisciplina, setFiltroDisciplina] = useState('TODOS')
  const [loading, setLoading] = useState<string | null>(null)
  const [inscripciones, setInscripciones] = useState<Record<string, string | null>>(
    Object.fromEntries(campeonatos.map(c => [c.id, c.inscrito || null]))
  )

  const filtrados = campeonatos.filter(c => {
    if (filtroEstado !== 'TODOS' && c.estado !== filtroEstado) return false
    if (filtroDisciplina !== 'TODOS' && c.disciplina !== filtroDisciplina) return false
    return true
  })

  async function inscribirse(campeonatoId: string) {
    if (!userId) { toast.error('Debes iniciar sesión'); return }
    setLoading(campeonatoId)
    try {
      const res = await fetch(`/api/campeonatos/${campeonatoId}/inscribirse`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setInscripciones(prev => ({ ...prev, [campeonatoId]: 'PENDIENTE' }))
        toast.success('Inscripción enviada. Pendiente de confirmación.')
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
  const disciplinas = ['TODOS', 'CIRCUITO', 'RALLY', 'DRIFT', 'KARTCROSS', 'MONOPLAZA']

  return (
    <div>
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-6">
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
            const lleno = c._count.inscripciones >= c.maxPilotos
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
                  <div className="flex items-center gap-2 mb-3">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full border', DISCIPLINA_COLORS[c.disciplina])}>
                      {DISCIPLINA_LABELS[c.disciplina]}
                    </span>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full border', ESTADO_COLORS[c.estado])}>
                      {ESTADO_CAMPEONATO_LABELS[c.estado]}
                    </span>
                  </div>

                  <h3 className="font-bold text-lg mb-1 group-hover:text-apex-red transition-colors line-clamp-2">
                    {c.nombre}
                  </h3>
                  <p className="text-apex-muted text-xs mb-1">{SIMULADOR_LABELS[c.simulador]}</p>
                  <p className="text-apex-muted text-sm line-clamp-2 mb-4">{c.descripcion}</p>

                  {/* Meta */}
                  <div className="flex items-center gap-4 text-xs text-apex-muted mb-4">
                    <span className="flex items-center gap-1">
                      <Users size={12} />{c._count.inscripciones}/{c.maxPilotos}
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

                    {c.estado !== 'FINALIZADO' && userId && (
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
