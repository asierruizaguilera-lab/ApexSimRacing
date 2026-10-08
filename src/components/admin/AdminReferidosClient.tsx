'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { Gift, Wallet, History, Plus, Loader2 } from 'lucide-react'
import { PLAN_LABELS, formatFecha, cn } from '@/lib/utils'
import type { ResumenAdminReferidos } from '@/lib/referidos'

const eur = (n: number) => `${n.toFixed(2)}€`
const th = 'px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted'

export function AdminReferidosClient({ inicial }: { inicial: ResumenAdminReferidos }) {
  const [data, setData] = useState(inicial)
  const [username, setUsername] = useState('')
  const [creando, setCreando] = useState(false)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [verInactivos, setVerInactivos] = useState(false)

  async function recargar() {
    const res = await fetch('/api/admin/referidos')
    if (res.ok) setData(await res.json())
  }

  async function crearCodigo(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim()) return
    setCreando(true)
    try {
      const res = await fetch('/api/admin/referidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Error al crear el código')
      toast.success(`Código ${d.codigo} creado`)
      setUsername('')
      await recargar()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setCreando(false)
    }
  }

  async function toggleCodigo(id: string, activo: boolean) {
    setOcupado(id)
    try {
      const res = await fetch(`/api/admin/referidos/codigos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Error')
      toast.success(activo ? 'Código activado' : 'Código desactivado')
      await recargar()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setOcupado(null)
    }
  }

  async function liquidar(userId: string, nombre: string, cash: number) {
    setOcupado(userId)
    try {
      const res = await fetch(`/api/admin/referidos/liquidar/${userId}`, { method: 'POST' })
      if (!res.ok) throw new Error((await res.json()).error || 'Error al liquidar')
      toast.success(`${nombre} liquidado${cash > 0 ? ` — ${eur(cash)} en cash` : ''}`)
      await recargar()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setOcupado(null)
    }
  }

  const codigos = verInactivos ? data.codigos : data.codigos.filter(c => c.activo)
  const totalPendiente = data.pendientes.reduce((s, p) => s + p.saldoPendiente, 0)
  const totalCash = data.pendientes.reduce((s, p) => s + p.cashAPagar, 0)

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Códigos activos', value: String(data.codigos.filter(c => c.activo).length) },
          { label: 'Saldo pendiente total', value: eur(totalPendiente) },
          { label: 'Cash a pagar este mes', value: eur(totalCash) },
        ].map(s => (
          <div key={s.label} className="bg-apex-card border border-apex-border rounded-xl p-5">
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-apex-muted text-sm mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Liquidación mensual */}
      <section className="bg-apex-card border border-apex-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-apex-border">
          <Wallet size={16} className="text-apex-red" />
          <h2 className="font-semibold">Liquidación mensual</h2>
          <span className="text-xs text-apex-muted ml-auto">cash = máx(0, saldo − precio suscripción)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-apex-border text-left">
                <th className={th}>Referidor</th>
                <th className={cn(th, 'hidden md:table-cell')}>Referidos</th>
                <th className={cn(th, 'hidden md:table-cell')}>Este mes</th>
                <th className={th}>Saldo</th>
                <th className={cn(th, 'hidden sm:table-cell')}>Suscripción</th>
                <th className={th}>Cash</th>
                <th className={cn(th, 'text-right')}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-apex-border/50">
              {data.pendientes.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-apex-muted text-sm">No hay saldos pendientes</td></tr>
              )}
              {data.pendientes.map(p => (
                <tr key={p.userId}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-sm">{p.username}</div>
                    <div className="text-xs text-apex-muted">{p.email}</div>
                  </td>
                  <td className="px-4 py-3 text-sm hidden md:table-cell">{p.numReferidos}</td>
                  <td className="px-4 py-3 text-sm hidden md:table-cell">{eur(p.comisionEsteMes)}</td>
                  <td className="px-4 py-3 text-sm font-medium">{eur(p.saldoPendiente)}</td>
                  <td className="px-4 py-3 text-sm text-apex-muted hidden sm:table-cell">
                    {p.precioSuscripcion > 0 ? `${eur(p.precioSuscripcion)}${p.plan ? ` · ${PLAN_LABELS[p.plan]}` : ''}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-green-400">{eur(p.cashAPagar)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => liquidar(p.userId, p.username, p.cashAPagar)}
                      disabled={ocupado === p.userId}
                      className="px-3 py-1.5 bg-apex-red hover:bg-apex-red-dark text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap">
                      {ocupado === p.userId ? <Loader2 size={12} className="animate-spin inline" /> : 'Marcar como liquidado'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Códigos */}
      <section className="bg-apex-card border border-apex-border rounded-xl overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-apex-border">
          <Gift size={16} className="text-apex-red" />
          <h2 className="font-semibold">Códigos</h2>
          <label className="flex items-center gap-1.5 text-xs text-apex-muted cursor-pointer">
            <input type="checkbox" checked={verInactivos} onChange={e => setVerInactivos(e.target.checked)} />
            Mostrar inactivos
          </label>
          <form onSubmit={crearCodigo} className="flex items-center gap-2 ml-auto">
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Username del piloto"
              className="bg-apex-surface border border-apex-border rounded-lg px-3 py-1.5 text-sm focus:border-apex-red focus:outline-none w-44"
            />
            <button
              type="submit"
              disabled={creando || !username.trim()}
              className="flex items-center gap-1 px-3 py-1.5 bg-apex-red hover:bg-apex-red-dark text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
              {creando ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}Crear código
            </button>
          </form>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-apex-border text-left">
                <th className={th}>Código</th>
                <th className={th}>Creador</th>
                <th className={th}>Usos</th>
                <th className={cn(th, 'hidden sm:table-cell')}>Comisión generada</th>
                <th className={cn(th, 'hidden md:table-cell')}>Creado</th>
                <th className={cn(th, 'text-right')}>Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-apex-border/50">
              {codigos.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-apex-muted text-sm">No hay códigos</td></tr>
              )}
              {codigos.map(c => (
                <tr key={c.id} className={c.activo ? '' : 'opacity-50'}>
                  <td className="px-4 py-3 font-mono text-sm">{c.codigo}</td>
                  <td className="px-4 py-3 text-sm">{c.creador.username}</td>
                  <td className="px-4 py-3 text-sm">{c.numUsos}</td>
                  <td className="px-4 py-3 text-sm hidden sm:table-cell">{eur(c.comisionGenerada)}</td>
                  <td className="px-4 py-3 text-sm text-apex-muted hidden md:table-cell">{formatFecha(c.creadoEn)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggleCodigo(c.id, !c.activo)}
                      disabled={ocupado === c.id}
                      className={cn(
                        'text-xs px-2.5 py-1 rounded-full border transition-colors disabled:opacity-50',
                        c.activo
                          ? 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30'
                          : 'bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-green-500/20 hover:text-green-400 hover:border-green-500/30'
                      )}
                      title={c.activo ? 'Desactivar' : 'Activar'}>
                      {c.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Historial */}
      <section className="bg-apex-card border border-apex-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-apex-border">
          <History size={16} className="text-apex-red" />
          <h2 className="font-semibold">Historial de liquidaciones</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-apex-border text-left">
                <th className={th}>Fecha</th>
                <th className={th}>Referidor</th>
                <th className={th}>Liquidado</th>
                <th className={cn(th, 'hidden sm:table-cell')}>Suscripción</th>
                <th className={th}>Cash</th>
                <th className={cn(th, 'hidden md:table-cell')}>Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-apex-border/50">
              {data.liquidaciones.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-apex-muted text-sm">Aún no hay liquidaciones</td></tr>
              )}
              {data.liquidaciones.map(l => (
                <tr key={l.id}>
                  <td className="px-4 py-3 text-sm text-apex-muted">{formatFecha(l.creadoEn)}</td>
                  <td className="px-4 py-3 text-sm">{l.user.username}</td>
                  <td className="px-4 py-3 text-sm">{eur(l.importeLiquidado)}</td>
                  <td className="px-4 py-3 text-sm text-apex-muted hidden sm:table-cell">{eur(l.precioSuscripcion)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-green-400">{eur(l.cashPagado)}</td>
                  <td className="px-4 py-3 text-sm text-apex-muted hidden md:table-cell">{l.admin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
