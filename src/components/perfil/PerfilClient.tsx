'use client'

import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatFecha, getPaisFlag, getPaisNombre, getPositionColor, DISCIPLINA_COLORS, DISCIPLINA_LABELS, cn } from '@/lib/utils'
import { Trophy, Flag, Calendar, Target, TrendingUp, Star } from 'lucide-react'
import Link from 'next/link'

interface Badge {
  id: string; icon: string; label: string; desc: string; unlocked: boolean
}

interface Props {
  piloto: any
  rankingGlobal: number
  chartData: { nombre: string; puntos: number }[]
  isOwn: boolean
}

function getBadges(piloto: any): Badge[] {
  return [
    { id: 'first_race', icon: '🏁', label: 'Primera Carrera', desc: 'Completaste tu primera carrera', unlocked: piloto.totalCarreras >= 1 },
    { id: 'first_podium', icon: '🏆', label: 'Primer Podio', desc: 'Terminaste en el top 3', unlocked: piloto.totalPodios >= 1 },
    { id: 'first_win', icon: '🥇', label: 'Primera Victoria', desc: 'Ganaste una carrera', unlocked: piloto.totalVictorias >= 1 },
    { id: '10_races', icon: '🔟', label: 'Veterano', desc: 'Completaste 10 carreras', unlocked: piloto.totalCarreras >= 10 },
    { id: '100_pts', icon: '💯', label: 'Centenario', desc: 'Acumulaste 100 puntos', unlocked: piloto.totalPuntos >= 100 },
    { id: '3_wins', icon: '👑', label: 'Rey de la Pista', desc: 'Ganaste 3 carreras', unlocked: piloto.totalVictorias >= 3 },
  ]
}

export function PerfilClient({ piloto, rankingGlobal, chartData, isOwn }: Props) {
  const [activeTab, setActiveTab] = useState<'resultados' | 'campeonatos' | 'trofeos'>('resultados')
  const badges = getBadges(piloto)

  const stats = [
    { icon: Trophy, label: 'Puntos Totales', value: piloto.totalPuntos, color: 'text-apex-red' },
    { icon: TrendingUp, label: 'Posición Global', value: `#${rankingGlobal}`, color: 'text-yellow-400' },
    { icon: Flag, label: 'Carreras', value: piloto.totalCarreras, color: 'text-blue-400' },
    { icon: Target, label: 'Victorias', value: piloto.totalVictorias, color: 'text-green-400' },
    { icon: Star, label: 'Podios', value: piloto.totalPodios, color: 'text-purple-400' },
  ]

  return (
    <div className="space-y-6">
      {/* Header perfil */}
      <div className="bg-apex-card border border-apex-border rounded-xl p-6">
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-24 h-24 rounded-2xl bg-apex-red flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-apex-red/20">
              {piloto.username.slice(0, 2).toUpperCase()}
            </div>
            {isOwn && (
              <span className="absolute -bottom-1 -right-1 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                Tú
              </span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold">{piloto.username}</h1>
              {piloto.role === 'ADMIN' && (
                <span className="text-xs bg-apex-red/20 text-apex-red border border-apex-red/30 px-2 py-0.5 rounded-full">
                  ADMIN
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-apex-muted mb-3">
              {piloto.pais && (
                <span>{getPaisFlag(piloto.pais)} {getPaisNombre(piloto.pais)}</span>
              )}
              <span className="flex items-center gap-1">
                <Calendar size={13} />
                Desde {formatFecha(piloto.fechaRegistro)}
              </span>
            </div>
            {piloto.bio && <p className="text-apex-muted text-sm">{piloto.bio}</p>}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6">
          {stats.map(s => (
            <div key={s.label} className="bg-apex-surface rounded-xl p-3 text-center border border-apex-border">
              <s.icon size={18} className={cn('mx-auto mb-1', s.color)} />
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-xs text-apex-muted mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Gráfica puntos */}
      {chartData.length > 0 && (
        <div className="bg-apex-card border border-apex-border rounded-xl p-6">
          <h3 className="font-semibold mb-4">Evolución de Puntos</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="nombre" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#2A2A2A', border: '1px solid #333', borderRadius: '8px', color: '#F5F5F5' }}
                labelStyle={{ color: '#9CA3AF' }}
              />
              <Line type="monotone" dataKey="puntos" stroke="#C0392B" strokeWidth={2} dot={{ fill: '#C0392B', r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-apex-card border border-apex-border rounded-xl p-1">
        {[
          { id: 'resultados', label: `Resultados (${piloto.resultados.length})` },
          { id: 'campeonatos', label: `Campeonatos (${piloto.inscripciones.length})` },
          { id: 'trofeos', label: `Trofeos (${badges.filter(b => b.unlocked).length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)}
            className={cn('flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === t.id ? 'bg-apex-red text-white' : 'text-apex-muted hover:text-apex-text'
            )}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Resultados */}
      {activeTab === 'resultados' && (
        <div className="bg-apex-card border border-apex-border rounded-xl overflow-hidden">
          {piloto.resultados.length === 0 ? (
            <div className="text-center py-12 text-apex-muted">
              <Flag size={40} className="mx-auto mb-3 opacity-30" />
              <p>Aún no hay resultados registrados</p>
            </div>
          ) : (
            <table className="w-full table-apex">
              <thead>
                <tr className="border-b border-apex-border text-left">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted">Carrera</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted hidden sm:table-cell">Campeonato</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted text-center">Pos</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted text-right">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-apex-border/50">
                {piloto.resultados.map((r: any) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium">{r.carrera.nombre}</div>
                      <div className="text-xs text-apex-muted">{r.carrera.circuito}</div>
                      {r.vueltaRapida && (
                        <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full">⚡ Vuelta rápida</span>
                      )}
                      {r.abandono && (
                        <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">DNF</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <Link href={`/campeonatos/${r.carrera.campeonato.id}`} className="hover:text-apex-red transition-colors">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full border', DISCIPLINA_COLORS[r.carrera.campeonato.disciplina])}>
                          {DISCIPLINA_LABELS[r.carrera.campeonato.disciplina]}
                        </span>
                        <div className="text-xs text-apex-muted mt-0.5">{r.carrera.campeonato.nombre}</div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn('font-bold', getPositionColor(r.posicion))}>{r.posicion}º</span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-apex-red">+{r.puntos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Campeonatos */}
      {activeTab === 'campeonatos' && (
        <div className="grid sm:grid-cols-2 gap-3">
          {piloto.inscripciones.length === 0 ? (
            <div className="sm:col-span-2 text-center py-12 text-apex-muted">
              <Trophy size={40} className="mx-auto mb-3 opacity-30" />
              <p>No inscrito en ningún campeonato</p>
            </div>
          ) : piloto.inscripciones.map((i: any, idx: number) => (
            <Link key={idx} href={`/campeonatos/${i.campeonato.id}`}
              className="flex items-center gap-3 bg-apex-card border border-apex-border rounded-xl p-4 hover:border-apex-red/30 transition-all">
              <span className={cn('text-xs px-2 py-1 rounded-full border whitespace-nowrap', DISCIPLINA_COLORS[i.campeonato.disciplina])}>
                {DISCIPLINA_LABELS[i.campeonato.disciplina]}
              </span>
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{i.campeonato.nombre}</div>
                <div className="text-xs text-apex-muted">
                  {i.campeonato.estado === 'ACTIVO' ? '🟢 Activo' : i.campeonato.estado === 'PROXIMO' ? '🔵 Próximo' : '⚫ Finalizado'}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Trofeos */}
      {activeTab === 'trofeos' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {badges.map(b => (
            <div key={b.id} className={cn(
              'bg-apex-card border rounded-xl p-4 text-center transition-all',
              b.unlocked ? 'border-apex-red/30' : 'border-apex-border opacity-40 grayscale'
            )}>
              <div className="text-3xl mb-2">{b.icon}</div>
              <div className="font-semibold text-sm">{b.label}</div>
              <div className="text-xs text-apex-muted mt-1">{b.desc}</div>
              {b.unlocked && (
                <div className="text-[10px] text-green-400 mt-2">✓ Desbloqueado</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
