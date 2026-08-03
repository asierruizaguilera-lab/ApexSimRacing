'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { ChevronLeft, Save, Trophy } from 'lucide-react'
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
}

export function AdminResultadosClient({ carrera }: { carrera: any }) {
  const router = useRouter()
  const pilotos = carrera.campeonato.inscripciones.map((i: any) => i.user)
  const disciplina = carrera.campeonato.disciplina
  const numEtapas = carrera.campeonato.numEtapas || 1
  const conVueltaRapida = tieneVueltaRapida(disciplina)

  const [rows, setRows] = useState<PilotoRow[]>(
    pilotos.map((p: any, idx: number) => {
      const existing = carrera.resultados.find((r: any) => r.userId === p.id)
      return {
        userId: p.id,
        username: p.username,
        posicion: existing?.posicion || idx + 1,
        tiempo: existing?.tiempo || '',
        vueltaRapida: existing?.vueltaRapida || false,
        abandono: existing?.abandono || false,
      }
    }).sort((a: PilotoRow, b: PilotoRow) => a.posicion - b.posicion)
  )
  const [loading, setLoading] = useState(false)

  function update(userId: string, field: keyof PilotoRow, value: any) {
    setRows(prev => prev.map(r => r.userId === userId ? { ...r, [field]: value } : r))
  }

  function calcPuntos(posicion: number, vueltaRapida: boolean, abandono: boolean): number {
    return calcularPuntos(posicion, disciplina, numEtapas, abandono, conVueltaRapida && vueltaRapida)
  }

  async function guardar() {
    // Validar posiciones únicas
    const positions = rows.filter(r => !r.abandono).map(r => r.posicion)
    const unique = new Set(positions)
    if (unique.size !== positions.length) {
      toast.error('Hay posiciones duplicadas')
      return
    }

    setLoading(true)
    try {
      const resultados = rows.map(r => ({
        userId: r.userId,
        posicion: r.posicion,
        puntos: calcPuntos(r.posicion, r.vueltaRapida, r.abandono),
        vueltaRapida: r.vueltaRapida,
        abandono: r.abandono,
        tiempo: r.tiempo,
      }))

      const res = await fetch(`/api/resultados/${carrera.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resultados }),
      })

      if (res.ok) {
        toast.success('Resultados guardados y puntos calculados')
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
        <h1 className="text-2xl font-bold">Subir Resultados</h1>
        <p className="text-apex-muted mt-1">{carrera.nombre} · {formatFechaHora(carrera.fecha)}</p>
      </div>

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
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted w-16">Pos</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted">Piloto</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted">Tiempo</th>
                {conVueltaRapida && (
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted text-center">V. Rápida</th>
                )}
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted text-center">DNF</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted text-right">Puntos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-apex-border/50">
              {rows.map((r, i) => {
                const pts = calcPuntos(r.posicion, r.vueltaRapida, r.abandono)
                return (
                  <tr key={r.userId} className={cn(r.abandono && 'opacity-50')}>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={r.posicion}
                        onChange={e => update(r.userId, 'posicion', parseInt(e.target.value))}
                        min={1}
                        max={rows.length}
                        className="w-14 bg-apex-surface border border-apex-border rounded-lg px-2 py-1 text-sm text-center focus:border-apex-red focus:outline-none"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-sm">{r.username}</td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={r.tiempo}
                        onChange={e => update(r.userId, 'tiempo', e.target.value)}
                        placeholder="1:23:45.234"
                        className="w-32 bg-apex-surface border border-apex-border rounded-lg px-2 py-1 text-sm focus:border-apex-red focus:outline-none"
                      />
                    </td>
                    {conVueltaRapida && (
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={r.vueltaRapida}
                          onChange={e => update(r.userId, 'vueltaRapida', e.target.checked)}
                          className="w-4 h-4 accent-purple-500"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={r.abandono}
                        onChange={e => update(r.userId, 'abandono', e.target.checked)}
                        className="w-4 h-4 accent-red-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn('font-bold', pts > 0 ? 'text-apex-red' : 'text-apex-muted')}>
                        {pts > 0 ? `+${pts}` : '0'}
                        {conVueltaRapida && r.vueltaRapida && <span className="text-purple-400 text-xs ml-1">(+1⚡)</span>}
                      </span>
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
