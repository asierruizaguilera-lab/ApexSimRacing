'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { DISCIPLINA_COLORS, DISCIPLINA_LABELS, SIMULADOR_LABELS, formatFechaHora, formatFecha, getPaisFlag, getPositionColor, cn } from '@/lib/utils'
import { Users, Calendar, Trophy, Server, Wifi, Copy, ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react'

interface Carrera {
  id: string; nombre: string; circuito: string; fecha: string; duracionMin: number
  estado: string; servidorIP?: string | null; servidorPassword?: string | null
  transmisionUrl?: string | null; modsRequeridos?: string | null
}

interface Clasificacion {
  userId: string; username: string; avatar: string | null; pais: string | null
  puntos: number; carreras: number; victorias: number
}

interface ResultadoCarrera {
  id: string
  posicion: number
  puntos: number
  vueltaRapida: boolean
  abandono: boolean
  tiempo: string | null
  user: { id: string; username: string; avatar: string | null; pais: string | null }
}

interface Props {
  campeonato: any
  clasificacion: Clasificacion[]
  inscripcionActual: string | null
  userId?: string
}

function getPodiumRowClass(pos: number): string {
  if (pos === 1) return 'bg-yellow-400/8 border-l-2 border-yellow-400/70'
  if (pos === 2) return 'bg-gray-300/8 border-l-2 border-gray-300/50'
  if (pos === 3) return 'bg-amber-600/8 border-l-2 border-amber-600/50'
  return ''
}

export function CampeonatoDetalle({ campeonato: c, clasificacion, inscripcionActual, userId }: Props) {
  const [tab, setTab] = useState<'info' | 'carreras' | 'clasificacion' | 'pilotos'>('info')
  const [inscrito, setInscrito] = useState(inscripcionActual)
  const [loading, setLoading] = useState(false)
  const [expandedRace, setExpandedRace] = useState<string | null>(null)
  const [raceResults, setRaceResults] = useState<Record<string, ResultadoCarrera[]>>({})
  const [loadingResults, setLoadingResults] = useState<string | null>(null)

  async function inscribirse() {
    if (!userId) { toast.error('Debes iniciar sesión'); return }
    setLoading(true)
    const res = await fetch(`/api/campeonatos/${c.id}/inscribirse`, { method: 'POST' })
    const data = await res.json()
    setLoading(false)
    if (res.ok) {
      setInscrito('PENDIENTE')
      toast.success('Inscripción enviada. Pendiente de confirmación.')
    } else if (data.code === 'NO_SUBSCRIPTION') {
      toast.error('Necesitas un plan activo para inscribirte')
      setTimeout(() => { window.location.href = '/planes' }, 1500)
    } else {
      toast.error(data.error || 'Error')
    }
  }

  function copiar(text: string, label: string) {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copiado`)
  }

  async function toggleResultados(carreraId: string) {
    if (expandedRace === carreraId) {
      setExpandedRace(null)
      return
    }
    if (raceResults[carreraId]) {
      setExpandedRace(carreraId)
      return
    }
    setLoadingResults(carreraId)
    try {
      const res = await fetch(`/api/carreras/${carreraId}/resultados`)
      const data = await res.json()
      setRaceResults(prev => ({ ...prev, [carreraId]: data }))
      setExpandedRace(carreraId)
    } catch {
      toast.error('No se pudieron cargar los resultados')
    } finally {
      setLoadingResults(null)
    }
  }

  const lleno = c.inscripciones.filter((i: any) => i.estado === 'CONFIRMADA').length >= c.maxPilotos
  const tabs = [
    { id: 'info', label: 'Información' },
    { id: 'carreras', label: `Carreras (${c.carreras.length})` },
    { id: 'clasificacion', label: 'Clasificación' },
    { id: 'pilotos', label: `Pilotos (${c.inscripciones.length})` },
  ]

  return (
    <div>
      {/* Back */}
      <Link href="/campeonatos" className="inline-flex items-center gap-1 text-apex-muted hover:text-apex-text text-sm mb-4 transition-colors">
        <ChevronLeft size={16} />Volver a Campeonatos
      </Link>

      {/* Header */}
      <div className="bg-apex-card border border-apex-border rounded-xl p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-start gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className={cn('text-xs px-2 py-1 rounded-full border', DISCIPLINA_COLORS[c.disciplina])}>
                {DISCIPLINA_LABELS[c.disciplina]}
              </span>
              <span className="text-xs px-2 py-1 bg-apex-surface border border-apex-border rounded-full text-apex-muted">
                {SIMULADOR_LABELS[c.simulador]}
              </span>
              <span className={cn('text-xs px-2 py-1 rounded-full border', {
                'bg-green-500/20 text-green-400 border-green-500/30': c.estado === 'ACTIVO',
                'bg-blue-500/20 text-blue-400 border-blue-500/30': c.estado === 'PROXIMO',
                'bg-gray-500/20 text-gray-400 border-gray-500/30': c.estado === 'FINALIZADO',
              })}>
                {c.estado === 'ACTIVO' ? 'Activo' : c.estado === 'PROXIMO' ? 'Próximo' : 'Finalizado'}
              </span>
            </div>
            <h1 className="text-2xl font-bold mb-2">{c.nombre}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-apex-muted">
              <span className="flex items-center gap-1"><Calendar size={14} />{formatFecha(c.fechaInicio)} — {formatFecha(c.fechaFin)}</span>
              <span className="flex items-center gap-1"><Users size={14} />{c.inscripciones.filter((i: any) => i.estado === 'CONFIRMADA').length}/{c.maxPilotos} pilotos</span>
              <span className="flex items-center gap-1"><Trophy size={14} />{c.carreras.length} carreras</span>
            </div>
          </div>

          {/* Botón inscripción */}
          {c.estado !== 'FINALIZADO' && userId && (
            <div className="flex-shrink-0">
              {inscrito === 'CONFIRMADA' ? (
                <div className="px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-xl font-medium">
                  ✓ Inscripción Confirmada
                </div>
              ) : inscrito === 'PENDIENTE' ? (
                <div className="px-4 py-2 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-xl font-medium">
                  ⏳ Pendiente de confirmación
                </div>
              ) : lleno ? (
                <div className="px-4 py-2 bg-gray-500/20 text-gray-400 border border-gray-500/30 rounded-xl font-medium">
                  Campeonato lleno
                </div>
              ) : (
                <button onClick={inscribirse} disabled={loading}
                  className="px-6 py-2.5 bg-apex-red hover:bg-apex-red-dark text-white rounded-xl font-semibold transition-colors disabled:opacity-50">
                  {loading ? 'Enviando...' : '🏁 Inscribirme'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-apex-card border border-apex-border rounded-xl p-1 mb-6 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={cn('flex-1 min-w-fit px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
              tab === t.id ? 'bg-apex-red text-white' : 'text-apex-muted hover:text-apex-text'
            )}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'info' && (
        <div className="space-y-4">
          <div className="bg-apex-card border border-apex-border rounded-xl p-6">
            <h3 className="font-semibold mb-3">Descripción</h3>
            <p className="text-apex-muted leading-relaxed whitespace-pre-wrap">{c.descripcion}</p>
          </div>
          {c.modsReq && (
            <div className="bg-apex-card border border-apex-border rounded-xl p-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><Wifi size={16} />Mods Requeridos</h3>
              <pre className="text-sm text-apex-muted whitespace-pre-wrap font-sans">{c.modsReq}</pre>
            </div>
          )}
          <div className="bg-apex-card border border-apex-border rounded-xl p-6">
            <h3 className="font-semibold mb-3">Sistema de Puntos</h3>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {[25, 18, 15, 12, 10, 8, 6, 4, 2, 1].map((pts, i) => (
                <div key={i} className="text-center bg-apex-surface rounded-lg p-2">
                  <div className="text-xs text-apex-muted mb-1">{i + 1}º</div>
                  <div className="font-bold text-apex-red text-sm">{pts}</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-apex-muted mt-3">+ 1 punto adicional por vuelta rápida</p>
          </div>
        </div>
      )}

      {tab === 'carreras' && (
        <div className="space-y-3">
          {c.carreras.map((carrera: Carrera, idx: number) => {
            const isInscrito = inscrito === 'CONFIRMADA'
            const isFinalizada = carrera.estado === 'FINALIZADA'
            const isExpanded = expandedRace === carrera.id
            const results = raceResults[carrera.id] || []
            const isLoadingThis = loadingResults === carrera.id

            return (
              <div key={carrera.id} className="bg-apex-card border border-apex-border rounded-xl overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-apex-muted text-sm">Ronda {idx + 1}</span>
                        <span className={cn('text-xs px-2 py-0.5 rounded-full border', {
                          'bg-yellow-500/20 text-yellow-400 border-yellow-500/30': carrera.estado === 'EN_CURSO',
                          'bg-blue-500/20 text-blue-400 border-blue-500/30': carrera.estado === 'PROGRAMADA',
                          'bg-gray-500/20 text-gray-400 border-gray-500/30': carrera.estado === 'FINALIZADA',
                        })}>
                          {carrera.estado === 'PROGRAMADA' ? 'Programada' : carrera.estado === 'EN_CURSO' ? 'En Curso' : 'Finalizada'}
                        </span>
                      </div>
                      <h4 className="font-semibold">{carrera.nombre}</h4>
                      <p className="text-apex-muted text-sm">{carrera.circuito}</p>
                    </div>
                    <div className="text-right text-sm text-apex-muted flex-shrink-0">
                      <div className="font-medium text-apex-text">{formatFechaHora(carrera.fecha)}</div>
                      <div>{carrera.duracionMin} min</div>
                    </div>
                  </div>

                  {/* Server info */}
                  {isInscrito && carrera.servidorIP && carrera.estado !== 'FINALIZADA' && (
                    <div className="bg-apex-surface border border-apex-border rounded-lg p-4 mt-3">
                      <div className="flex items-center gap-2 mb-3 text-sm font-medium">
                        <Server size={14} className="text-green-400" />
                        <span>Servidor de Juego</span>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-apex-muted mb-1">IP del Servidor</div>
                          <div className="flex items-center gap-2 bg-apex-bg rounded-lg px-3 py-2">
                            <code className="text-sm text-green-400 flex-1">{carrera.servidorIP}</code>
                            <button onClick={() => copiar(carrera.servidorIP!, 'IP')}
                              className="text-apex-muted hover:text-apex-text transition-colors">
                              <Copy size={14} />
                            </button>
                          </div>
                        </div>
                        {carrera.servidorPassword && (
                          <div>
                            <div className="text-xs text-apex-muted mb-1">Contraseña</div>
                            <div className="flex items-center gap-2 bg-apex-bg rounded-lg px-3 py-2">
                              <code className="text-sm text-yellow-400 flex-1">{carrera.servidorPassword}</code>
                              <button onClick={() => copiar(carrera.servidorPassword!, 'Contraseña')}
                                className="text-apex-muted hover:text-apex-text transition-colors">
                                <Copy size={14} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-apex-muted mt-3">
                        💡 Abre Content Manager → Online → Busca el servidor o introduce la IP directamente
                      </p>
                      {carrera.modsRequeridos && (
                        <div className="mt-3 pt-3 border-t border-apex-border">
                          <div className="text-xs text-apex-muted mb-1">Mods requeridos:</div>
                          <pre className="text-xs text-apex-text/80 whitespace-pre-wrap font-sans">{carrera.modsRequeridos}</pre>
                        </div>
                      )}
                    </div>
                  )}

                  {carrera.transmisionUrl && (
                    <a href={carrera.transmisionUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 mt-3 text-sm text-apex-red hover:underline">
                      📺 Ver transmisión en directo
                    </a>
                  )}

                  {!isInscrito && carrera.servidorIP && c.estado !== 'FINALIZADO' && (
                    <p className="text-xs text-apex-muted mt-3 italic">
                      🔒 Inscríbete al campeonato para ver los datos del servidor
                    </p>
                  )}

                  {/* Botón Ver Resultados */}
                  {isFinalizada && (
                    <div className="mt-4 pt-4 border-t border-apex-border">
                      <button
                        onClick={() => toggleResultados(carrera.id)}
                        disabled={isLoadingThis}
                        className="flex items-center gap-2 text-sm font-medium text-apex-muted hover:text-apex-text transition-colors disabled:opacity-60">
                        {isLoadingThis ? (
                          <span className="w-4 h-4 border-2 border-apex-muted/30 border-t-apex-red rounded-full animate-spin" />
                        ) : isExpanded ? (
                          <ChevronUp size={16} className="text-apex-red" />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                        {isLoadingThis ? 'Cargando...' : isExpanded ? 'Ocultar resultados' : '🏁 Ver Resultados'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Tabla de resultados expandida */}
                {isFinalizada && isExpanded && results.length > 0 && (
                  <div className="border-t border-apex-border overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-apex-surface border-b border-apex-border">
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-apex-muted text-left w-12">Pos</th>
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-apex-muted text-left">Piloto</th>
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-apex-muted text-center hidden sm:table-cell">Tiempo</th>
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-apex-muted text-right">Pts</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-apex-border/40">
                        {results.map((r) => {
                          const isCurrentUser = r.user.id === userId
                          return (
                            <tr
                              key={r.id}
                              className={cn(
                                'transition-colors',
                                getPodiumRowClass(r.posicion),
                                isCurrentUser && 'outline outline-1 outline-apex-red/40'
                              )}>
                              <td className="px-4 py-3">
                                <span className={cn('font-bold text-sm', getPositionColor(r.posicion))}>
                                  {r.posicion === 1 ? '🥇' : r.posicion === 2 ? '🥈' : r.posicion === 3 ? '🥉' : `${r.posicion}º`}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <Link href={`/perfil/${r.user.id}`} className="flex items-center gap-2.5 hover:text-apex-red transition-colors">
                                  {r.user.avatar ? (
                                    <img src={r.user.avatar} alt={r.user.username}
                                      className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                                  ) : (
                                    <div className="w-7 h-7 rounded-full bg-apex-red flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                                      {r.user.username.slice(0, 2).toUpperCase()}
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-sm font-medium truncate">{r.user.username}</span>
                                      {isCurrentUser && (
                                        <span className="text-[10px] bg-apex-red/20 text-apex-red px-1.5 py-0.5 rounded-full flex-shrink-0">Tú</span>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap gap-1 mt-0.5">
                                      {r.vueltaRapida && (
                                        <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full">🏁 Vuelta Rápida</span>
                                      )}
                                      {r.abandono && (
                                        <span className="text-[10px] bg-gray-500/20 text-gray-400 px-1.5 py-0.5 rounded-full">Abandonó</span>
                                      )}
                                    </div>
                                  </div>
                                </Link>
                              </td>
                              <td className="px-4 py-3 text-center text-sm text-apex-muted hidden sm:table-cell">
                                {r.tiempo || '—'}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-apex-red">
                                {r.abandono ? '—' : `+${r.puntos}`}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {isFinalizada && isExpanded && results.length === 0 && !isLoadingThis && (
                  <div className="border-t border-apex-border px-5 py-8 text-center text-apex-muted text-sm">
                    No hay resultados publicados para esta carrera
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {tab === 'clasificacion' && (
        <div className="bg-apex-card border border-apex-border rounded-xl overflow-hidden">
          {clasificacion.length === 0 ? (
            <div className="text-center py-12 text-apex-muted">
              <Trophy size={40} className="mx-auto mb-3 opacity-30" />
              <p>La clasificación se publicará cuando haya resultados</p>
            </div>
          ) : (
            <table className="w-full table-apex">
              <thead>
                <tr className="border-b border-apex-border text-left">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted w-12">Pos</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted">Piloto</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted text-center">Carreras</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted text-center">Victorias</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted text-right">Puntos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-apex-border/50">
                {clasificacion.map((p, i) => (
                  <tr key={p.userId} className={cn(i < 3 ? 'bg-yellow-400/3' : '')}>
                    <td className="px-4 py-3">
                      <span className={cn('font-bold', getPositionColor(i + 1))}>{i + 1}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/perfil/${p.userId}`} className="flex items-center gap-2 hover:text-apex-red transition-colors">
                        <div className="w-8 h-8 rounded-full bg-apex-red flex items-center justify-center text-white text-xs font-bold">
                          {p.username.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium">{p.username}</span>
                        <span className="text-sm">{getPaisFlag(p.pais)}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-center text-sm">{p.carreras}</td>
                    <td className="px-4 py-3 text-center text-sm">{p.victorias}</td>
                    <td className="px-4 py-3 text-right font-bold text-apex-red">{p.puntos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'pilotos' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {c.inscripciones.filter((i: any) => i.estado === 'CONFIRMADA').map((insc: any) => (
            <Link key={insc.userId} href={`/perfil/${insc.user.id}`}
              className="flex items-center gap-3 bg-apex-card border border-apex-border rounded-xl p-4 hover:border-apex-red/30 transition-all">
              <div className="w-10 h-10 rounded-full bg-apex-red flex items-center justify-center text-white font-bold flex-shrink-0">
                {insc.user.username.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="font-medium">{insc.user.username}</div>
                <div className="text-sm text-apex-muted">{getPaisFlag(insc.user.pais)} {insc.user.pais || 'Internacional'}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
