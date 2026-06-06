'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { PLAN_LABELS, PLAN_COLORS, PLAN_PRECIOS, PLAN_ORDER, getPaisFlag, formatFecha, cn } from '@/lib/utils'
import { Users, TrendingUp } from 'lucide-react'

interface Suscripcion {
  id: string; plan: string; estado: string; precioMensual: number
  fechaInicio: string; fechaRenovacion: string
  user: { id: string; username: string; email: string; pais: string | null }
}

interface Props {
  suscripciones: Suscripcion[]
  stats: { plan: string; _count: { id: number } }[]
}

const ESTADO_COLORS: Record<string, string> = {
  ACTIVA: 'bg-green-500/20 text-green-400 border-green-500/30',
  CANCELADA: 'bg-red-500/20 text-red-400 border-red-500/30',
  EXPIRADA: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  PENDIENTE: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
}

export function AdminSuscriptoresClient({ suscripciones, stats }: Props) {
  const router = useRouter()
  const [filtro, setFiltro] = useState('ACTIVA')
  const [changing, setChanging] = useState<string | null>(null)

  const filtradas = suscripciones.filter(s => filtro === 'TODOS' || s.estado === filtro)

  // Ingresos estimados (solo activas)
  const ingresosTotal = suscripciones
    .filter(s => s.estado === 'ACTIVA')
    .reduce((sum, s) => sum + s.precioMensual, 0)

  async function cambiarPlan(userId: string, plan: string) {
    setChanging(userId)
    const res = await fetch(`/api/admin/suscriptores/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    })
    setChanging(null)
    if (res.ok) { toast.success('Plan actualizado'); router.refresh() }
    else toast.error('Error al cambiar plan')
  }

  const totalActivos = suscripciones.filter(s => s.estado === 'ACTIVA').length

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-apex-card border border-apex-border rounded-xl p-4">
          <div className="text-apex-muted text-xs mb-1 flex items-center gap-1"><Users size={12} />Total activos</div>
          <div className="text-2xl font-bold">{totalActivos}</div>
          <div className="text-apex-red text-xs mt-0.5 font-medium">{ingresosTotal.toFixed(0)}€/mes</div>
        </div>
        {PLAN_ORDER.map(plan => {
          const count = suscripciones.filter(s => s.plan === plan && s.estado === 'ACTIVA').length
          const ingresos = count * PLAN_PRECIOS[plan]
          return (
            <div key={plan} className="bg-apex-card border border-apex-border rounded-xl p-4">
              <div className="text-apex-muted text-xs mb-1">{PLAN_LABELS[plan]}</div>
              <div className="text-xl font-bold">{count}</div>
              <div className={cn('text-xs mt-0.5', PLAN_COLORS[plan].split(' ')[1])}>{ingresos}€/mes</div>
            </div>
          )
        })}
      </div>

      {/* Filtros */}
      <div className="flex gap-1 bg-apex-card border border-apex-border rounded-xl p-1 w-fit">
        {['TODOS', 'ACTIVA', 'CANCELADA', 'EXPIRADA'].map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              filtro === f ? 'bg-apex-red text-white' : 'text-apex-muted hover:text-apex-text')}>
            {f === 'TODOS' ? 'Todos' : f === 'ACTIVA' ? 'Activos' : f === 'CANCELADA' ? 'Cancelados' : 'Expirados'}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-apex-card border border-apex-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-apex-border text-left">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted">Piloto</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted">Plan</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted hidden sm:table-cell">Estado</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted hidden md:table-cell">Desde</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted text-right">Cambiar Plan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-apex-border/50">
            {filtradas.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-apex-muted text-sm">No hay suscriptores en este filtro</td></tr>
            )}
            {filtradas.map(s => (
              <tr key={s.id}>
                <td className="px-4 py-3">
                  <div className="font-medium text-sm">{s.user.username}</div>
                  <div className="text-xs text-apex-muted">{getPaisFlag(s.user.pais)} {s.user.email}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full border', PLAN_COLORS[s.plan])}>
                    {PLAN_LABELS[s.plan]}
                  </span>
                  <div className="text-xs text-apex-muted mt-0.5">{s.precioMensual}€/mes</div>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full border', ESTADO_COLORS[s.estado])}>
                    {s.estado}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-apex-muted hidden md:table-cell">
                  {formatFecha(s.fechaInicio)}
                </td>
                <td className="px-4 py-3 text-right">
                  <select
                    value={s.plan}
                    onChange={e => cambiarPlan(s.user.id, e.target.value)}
                    disabled={changing === s.user.id}
                    className="bg-apex-surface border border-apex-border rounded-lg px-2 py-1.5 text-xs focus:border-apex-red focus:outline-none disabled:opacity-50 cursor-pointer"
                  >
                    {PLAN_ORDER.map(p => <option key={p} value={p}>{PLAN_LABELS[p]}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
