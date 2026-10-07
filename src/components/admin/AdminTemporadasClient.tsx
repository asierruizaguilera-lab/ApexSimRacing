'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Play, Trophy, Car, CalendarRange } from 'lucide-react'
import { cn, formatFecha, getPositionColor } from '@/lib/utils'

interface TemporadaFila {
  id: string
  numero: number
  anio: number
  activa: boolean
  fechaInicio: string
  fechaFin: string
  coche: { id: string; nombre: string } | null
  ganador: { id: string; nombre: string; colorPrimario: string | null } | null
}

interface Props {
  anioActual: number
  activa: {
    id: string; numero: number; anio: number; fechaInicio: string; fechaFin: string; etiqueta: string
    coche: { id: string; nombre: string } | null
  } | null
  ranking: { equipo: { id: string; nombre: string; colorPrimario: string | null; activo: boolean }; puntos: number }[]
  temporadas: TemporadaFila[]
  coches: { id: string; nombre: string }[]
}

const SELECT = 'bg-apex-surface border border-apex-border rounded-lg px-3 py-2 text-sm focus:border-apex-red focus:outline-none'

export function AdminTemporadasClient({ anioActual, activa, ranking, temporadas, coches }: Props) {
  const router = useRouter()
  const [cocheInicio, setCocheInicio] = useState(activa?.coche?.id ?? coches[0]?.id ?? '')
  const [iniciando, setIniciando] = useState(false)

  async function iniciar() {
    if (activa && !confirm(`Ya hay una temporada activa (T${activa.numero} ${activa.anio}). Se volverá a activar la del mes actual con el coche elegido. ¿Continuar?`)) return
    setIniciando(true)
    try {
      const res = await fetch('/api/admin/temporadas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anio: anioActual, cocheEquipoId: cocheInicio || null }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Error'); return }
      toast.success(`Temporada ${data.numero} de ${data.anio} activa`)
      router.refresh()
    } finally {
      setIniciando(false)
    }
  }

  async function asignarCoche(temporadaId: string, cocheEquipoId: string) {
    const res = await fetch(`/api/admin/temporadas/${temporadaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cocheEquipoId: cocheEquipoId || null }),
    })
    if (res.ok) { toast.success('Coche asignado'); router.refresh() }
    else toast.error((await res.json()).error || 'Error')
  }

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Temporada activa */}
        <div className="bg-apex-card border border-apex-border rounded-xl p-5">
          <h2 className="font-semibold flex items-center gap-2 mb-4"><CalendarRange size={16} className="text-apex-red" />Temporada activa</h2>
          {activa ? (
            <div className="space-y-2 mb-5">
              <div className="text-2xl font-bold">T{activa.numero} · {activa.anio}</div>
              <div className="text-sm text-apex-muted">{activa.etiqueta}</div>
              <div className="text-sm text-apex-muted">{formatFecha(activa.fechaInicio)} → {formatFecha(activa.fechaFin)}</div>
              <div className="flex items-center gap-2 text-sm">
                <Car size={14} className="text-apex-red" />
                {activa.coche ? activa.coche.nombre : <span className="text-yellow-400">Sin coche asignado</span>}
              </div>
            </div>
          ) : (
            <p className="text-sm text-apex-muted mb-5">No hay ninguna temporada activa. Al iniciarla se crean las 3 temporadas de {anioActual} y se activa la del mes actual.</p>
          )}

          <div className="border-t border-apex-border pt-4 space-y-3">
            <div className="text-sm font-medium">{activa ? 'Reiniciar / reasignar' : 'Iniciar nueva temporada'}</div>
            {coches.length === 0 ? (
              <p className="text-sm text-yellow-400">
                Primero crea un coche en <Link href="/admin/garaje-equipo" className="underline">Garaje de equipo</Link>.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                <select value={cocheInicio} onChange={e => setCocheInicio(e.target.value)} className={cn(SELECT, 'flex-1 min-w-[200px]')} aria-label="Coche de la temporada">
                  <option value="">— Sin coche —</option>
                  {coches.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
                <button onClick={iniciar} disabled={iniciando}
                  className="flex items-center gap-2 px-4 py-2 bg-apex-red hover:bg-apex-red-dark text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
                  <Play size={14} />{iniciando ? 'Iniciando...' : activa ? 'Activar temporada actual' : 'Iniciar nueva temporada'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Ranking de la temporada */}
        <div className="bg-apex-card border border-apex-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-apex-border">
            <h2 className="font-semibold flex items-center gap-2"><Trophy size={16} className="text-yellow-400" />Ranking de la temporada</h2>
          </div>
          {ranking.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-apex-muted">Aún no hay puntos esta temporada</p>
          ) : (
            <div className="divide-y divide-apex-border/50">
              {ranking.slice(0, 10).map((r, i) => (
                <Link key={r.equipo.id} href={`/equipos/${r.equipo.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-apex-surface/50 transition-colors">
                  <span className={cn('w-6 text-center font-bold text-sm', getPositionColor(i + 1))}>{i + 1}</span>
                  <span className="w-3 h-3 rounded-sm" style={{ background: r.equipo.colorPrimario || '#C0392B' }} />
                  <span className="flex-1 text-sm font-medium truncate">{r.equipo.nombre}</span>
                  <span className="text-sm font-bold text-apex-red">{r.puntos} pts</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Historial */}
      <div className="bg-apex-card border border-apex-border rounded-xl overflow-x-auto">
        <div className="px-5 py-4 border-b border-apex-border font-semibold">Historial de temporadas</div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-apex-border text-left">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted">Temporada</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted">Fechas</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted">Coche</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted">Ganador</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-apex-border/50">
            {temporadas.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-apex-muted">Todavía no se ha creado ninguna temporada</td></tr>
            )}
            {temporadas.map(t => (
              <tr key={t.id}>
                <td className="px-4 py-3 text-sm font-medium">
                  T{t.numero} · {t.anio}
                  {t.activa && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">ACTIVA</span>}
                </td>
                <td className="px-4 py-3 text-sm text-apex-muted">{formatFecha(t.fechaInicio)} → {formatFecha(t.fechaFin)}</td>
                <td className="px-4 py-3">
                  <select value={t.coche?.id ?? ''} onChange={e => asignarCoche(t.id, e.target.value)} className={SELECT} aria-label={`Coche de T${t.numero} ${t.anio}`}>
                    <option value="">— Sin coche —</option>
                    {t.coche && !coches.some(c => c.id === t.coche!.id) && <option value={t.coche.id}>{t.coche.nombre} (inactivo)</option>}
                    {coches.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3 text-sm">
                  {t.ganador ? (
                    <Link href={`/equipos/${t.ganador.id}`} className="flex items-center gap-2 hover:text-apex-red transition-colors">
                      🏆 <span className="w-2.5 h-2.5 rounded-sm" style={{ background: t.ganador.colorPrimario || '#C0392B' }} />{t.ganador.nombre}
                    </Link>
                  ) : <span className="text-apex-muted">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
