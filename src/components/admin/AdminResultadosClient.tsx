'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { ChevronLeft, Save, Trophy, Shield } from 'lucide-react'
import Link from 'next/link'
import { formatFechaHora, DISCIPLINA_LABELS, cn } from '@/lib/utils'
import { calcularPuntos, tieneVueltaRapida } from '@/lib/puntos'

interface PilotoRow {
  userId: string
  username: string
  posicion: number
  tiempo: string
  vueltaRapida: boolean
  abandono: boolean
  // Solo campeonatos de equipos
  equipoId?: string
  participo?: boolean
}

interface EquipoInscrito {
  id: string
  nombre: string
  colorPrimario: string | null
  miembros: { user: { id: string; username: string } }[]
}

export function AdminResultadosClient({ carrera }: { carrera: any }) {
  const router = useRouter()
  const esEquipos: boolean = !!carrera.campeonato.esCampeonatoEquipos
  const equipos: EquipoInscrito[] = (carrera.campeonato.inscripcionesEquipo ?? []).map((i: any) => i.equipo)
  const equipoMap = new Map(equipos.map(e => [e.id, e]))
  const disciplina = carrera.campeonato.disciplina
  const numEtapas = carrera.campeonato.numEtapas || 1
  const conVueltaRapida = tieneVueltaRapida(disciplina)

  const [rows, setRows] = useState<PilotoRow[]>(() => {
    const existente = (userId: string) => carrera.resultados.find((r: any) => r.userId === userId)

    if (!esEquipos) {
      const pilotos = carrera.campeonato.inscripciones.map((i: any) => i.user)
      return pilotos.map((p: any, idx: number) => {
        const ex = existente(p.id)
        return {
          userId: p.id,
          username: p.username,
          posicion: ex?.posicion || idx + 1,
          tiempo: ex?.tiempo || '',
          vueltaRapida: ex?.vueltaRapida || false,
          abandono: ex?.abandono || false,
        }
      }).sort((a: PilotoRow, b: PilotoRow) => a.posicion - b.posicion)
    }

    // Equipos: todos los miembros de equipos confirmados + quien ya tenga resultado con un equipo
    // (por si dejó el equipo después de correr). Solo se envían los marcados como "participó".
    const filas: PilotoRow[] = []
    const vistos = new Set<string>()
    for (const e of equipos) {
      for (const m of e.miembros) {
        if (vistos.has(m.user.id)) continue
        vistos.add(m.user.id)
        const ex = existente(m.user.id)
        filas.push({
          userId: m.user.id,
          username: m.user.username,
          posicion: ex?.posicion || filas.length + 1,
          tiempo: ex?.tiempo || '',
          vueltaRapida: ex?.vueltaRapida || false,
          abandono: ex?.abandono || false,
          equipoId: ex?.equipoId || e.id,
          participo: !!ex,
        })
      }
    }
    for (const r of carrera.resultados) {
      if (vistos.has(r.userId) || !r.equipoId) continue
      filas.push({
        userId: r.userId, username: r.user.username, posicion: r.posicion, tiempo: r.tiempo || '',
        vueltaRapida: r.vueltaRapida, abandono: r.abandono, equipoId: r.equipoId, participo: true,
      })
    }
    return filas.sort((a, b) => Number(b.participo) - Number(a.participo) || a.posicion - b.posicion)
  })
  const [filtroEquipo, setFiltroEquipo] = useState<string>('TODOS')
  const [loading, setLoading] = useState(false)

  function update(userId: string, field: keyof PilotoRow, value: any) {
    setRows(prev => prev.map(r => r.userId === userId ? { ...r, [field]: value } : r))
  }

  function calcPuntos(posicion: number, vueltaRapida: boolean, abandono: boolean): number {
    return calcularPuntos(posicion, disciplina, numEtapas, abandono, conVueltaRapida && vueltaRapida)
  }

  const enCarrera = esEquipos ? rows.filter(r => r.participo) : rows
  const visibles = esEquipos && filtroEquipo !== 'TODOS' ? rows.filter(r => r.equipoId === filtroEquipo) : rows

  // Puntos por equipo con la configuración actual (vista previa para el admin)
  const puntosEquipo = new Map<string, number>()
  if (esEquipos) {
    for (const r of enCarrera) {
      puntosEquipo.set(r.equipoId!, (puntosEquipo.get(r.equipoId!) ?? 0) + calcPuntos(r.posicion, r.vueltaRapida, r.abandono))
    }
  }

  async function guardar() {
    if (enCarrera.length === 0) {
      toast.error('Marca al menos un piloto que haya participado')
      return
    }
    // Validar posiciones únicas
    const positions = enCarrera.filter(r => !r.abandono).map(r => r.posicion)
    const unique = new Set(positions)
    if (unique.size !== positions.length) {
      toast.error('Hay posiciones duplicadas')
      return
    }

    setLoading(true)
    try {
      const resultados = enCarrera.map(r => ({
        userId: r.userId,
        posicion: r.posicion,
        puntos: calcPuntos(r.posicion, r.vueltaRapida, r.abandono),
        vueltaRapida: r.vueltaRapida,
        abandono: r.abandono,
        tiempo: r.tiempo,
        ...(esEquipos ? { equipoId: r.equipoId } : {}),
      }))

      const res = await fetch(`/api/resultados/${carrera.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resultados }),
      })

      if (res.ok) {
        toast.success(esEquipos ? 'Resultados guardados y liga por equipos actualizada' : 'Resultados guardados y puntos calculados')
        router.push(`/admin/campeonatos/${carrera.campeonatoId}`)
        router.refresh()
      } else {
        const d = await res.json()
        toast.error(d.error || 'Error al guardar')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Link href={`/admin/campeonatos/${carrera.campeonatoId}`}
        className="inline-flex items-center gap-1 text-apex-muted hover:text-apex-text text-sm mb-4 transition-colors">
        <ChevronLeft size={16} />Volver al Campeonato
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          Subir Resultados
          {esEquipos && (
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-semibold">
              <Shield size={11} />EQUIPOS
            </span>
          )}
        </h1>
        <p className="text-apex-muted mt-1">{carrera.nombre} · {formatFechaHora(carrera.fecha)}</p>
      </div>

      {esEquipos && (
        equipos.length === 0 ? (
          <div className="bg-apex-card border border-apex-border rounded-xl p-6 text-center text-apex-muted mb-4">
            No hay equipos con inscripción confirmada en este campeonato.
          </div>
        ) : (
          <div className="bg-apex-card border border-apex-border rounded-xl p-4 mb-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <label htmlFor="filtro-equipo" className="text-sm font-medium">Equipo</label>
              <select id="filtro-equipo" value={filtroEquipo} onChange={e => setFiltroEquipo(e.target.value)}
                className="bg-apex-surface border border-apex-border rounded-lg px-3 py-1.5 text-sm focus:border-apex-red focus:outline-none">
                <option value="TODOS">Todos los equipos</option>
                {equipos.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
              <span className="text-xs text-apex-muted">Marca qué pilotos de cada equipo participaron. Cada piloto suma sus puntos a su equipo.</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {equipos.map(e => (
                <span key={e.id} className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-apex-surface border border-apex-border">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: e.colorPrimario || '#C0392B' }} />
                  {e.nombre}: <strong className="text-apex-red">{puntosEquipo.get(e.id) ?? 0} pts</strong>
                </span>
              ))}
            </div>
          </div>
        )
      )}

      <div className="bg-apex-card border border-apex-border rounded-xl overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-apex-border flex items-center gap-2 flex-wrap">
          <Trophy size={16} className="text-yellow-400" />
          <span className="font-semibold">Resultados de la Carrera</span>
          <span className="text-xs text-apex-muted ml-auto">
            {disciplina === 'RALLY' || disciplina === 'SUBIDAS'
              ? `${DISCIPLINA_LABELS[disciplina]}: 25-20-16-13-11-9-7-5-3-1, 11º+ = 1 pt, DNF = 0`
              : 'Puntos: 25-20-16-13-11-9-7-5-3-1 + 1 por vuelta rápida'}
          </span>
        </div>
        {disciplina === 'RALLY' && (
          <div className="px-4 py-2 bg-apex-surface border-b border-apex-border text-xs text-apex-muted">
            Este rally tiene <strong className="text-apex-text">{numEtapas}</strong> etapa{numEtapas === 1 ? '' : 's'} → los puntos base se multiplican ×{numEtapas}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-apex-border text-left">
                {esEquipos && <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted text-center w-20">Participó</th>}
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted w-16">Pos</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted">Piloto</th>
                {esEquipos && <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted">Equipo</th>}
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted">Tiempo</th>
                {conVueltaRapida && (
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted text-center">V. Rápida</th>
                )}
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted text-center">DNF</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted text-right">Puntos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-apex-border/50">
              {visibles.map(r => {
                const pts = calcPuntos(r.posicion, r.vueltaRapida, r.abandono)
                const inactiva = esEquipos && !r.participo
                const equipo = r.equipoId ? equipoMap.get(r.equipoId) : undefined
                return (
                  <tr key={r.userId} className={cn((r.abandono || inactiva) && 'opacity-50')}>
                    {esEquipos && (
                      <td className="px-4 py-3 text-center">
                        <input type="checkbox" checked={!!r.participo} aria-label={`${r.username} participó`}
                          onChange={e => update(r.userId, 'participo', e.target.checked)}
                          className="w-4 h-4 accent-cyan-500" />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={r.posicion}
                        onChange={e => update(r.userId, 'posicion', parseInt(e.target.value))}
                        min={1}
                        max={rows.length}
                        disabled={inactiva}
                        className="w-14 bg-apex-surface border border-apex-border rounded-lg px-2 py-1 text-sm text-center focus:border-apex-red focus:outline-none"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-sm">{r.username}</td>
                    {esEquipos && (
                      <td className="px-4 py-3 text-sm">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: equipo?.colorPrimario || '#666' }} />
                          {equipo?.nombre ?? 'Equipo ya no inscrito'}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={r.tiempo}
                        onChange={e => update(r.userId, 'tiempo', e.target.value)}
                        placeholder="1:23:45.234"
                        disabled={inactiva}
                        className="w-32 bg-apex-surface border border-apex-border rounded-lg px-2 py-1 text-sm focus:border-apex-red focus:outline-none"
                      />
                    </td>
                    {conVueltaRapida && (
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={r.vueltaRapida}
                          onChange={e => update(r.userId, 'vueltaRapida', e.target.checked)}
                          disabled={inactiva}
                          className="w-4 h-4 accent-purple-500"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={r.abandono}
                        onChange={e => update(r.userId, 'abandono', e.target.checked)}
                        disabled={inactiva}
                        className="w-4 h-4 accent-red-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {inactiva ? <span className="text-apex-muted">—</span> : (
                        <span className={cn('font-bold', pts > 0 ? 'text-apex-red' : 'text-apex-muted')}>
                          {pts > 0 ? `+${pts}` : '0'}
                          {conVueltaRapida && r.vueltaRapida && <span className="text-purple-400 text-xs ml-1">(+1⚡)</span>}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={guardar} disabled={loading}
          className="flex items-center gap-2 px-6 py-2.5 bg-apex-red hover:bg-apex-red-dark text-white rounded-xl font-semibold transition-colors disabled:opacity-50">
          <Save size={16} />
          {loading ? 'Guardando...' : 'Guardar Resultados y Calcular Puntos'}
        </button>
      </div>
    </div>
  )
}
