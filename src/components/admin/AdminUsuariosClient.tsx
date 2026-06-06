'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Search, X, Save, Ban, ShieldCheck, History } from 'lucide-react'
import { PLAN_LABELS, PLAN_COLORS, PLAN_ORDER, PLAN_PRECIOS, getPaisFlag, formatFecha, formatTimeAgo, cn } from '@/lib/utils'

interface Suscripcion {
  id: string; plan: string; estado: string; precioMensual: number; esGratuita: boolean
  fechaInicio: string; fechaRenovacion: string; fechaExpiracionManual: string | null; notasAdmin: string | null
}

interface Usuario {
  id: string; username: string; email: string; pais: string | null; role: string
  baneado: boolean; motivoBan: string | null; fechaRegistro: string
  suscripcion: Suscripcion | null
}

interface Log {
  id: string; accion: string; detalle: string | null; creadoEn: string
  admin: { username: string }
}

const ESTADO_COLORS: Record<string, string> = {
  ACTIVA: 'bg-green-500/20 text-green-400 border-green-500/30',
  GRATUITA: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  CANCELADA: 'bg-red-500/20 text-red-400 border-red-500/30',
  EXPIRADA: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  PENDIENTE: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
}

export function AdminUsuariosClient({ usuarios: initial }: { usuarios: Usuario[] }) {
  const router = useRouter()
  const [usuarios, setUsuarios] = useState(initial)
  const [busqueda, setBusqueda] = useState('')
  const [filtroPlan, setFiltroPlan] = useState('TODOS')
  const [filtroBan, setFiltroBan] = useState(false)
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null)
  const [logs, setLogs] = useState<Log[]>([])
  const [showLogs, setShowLogs] = useState(false)

  // Form del modal
  const [formPlan, setFormPlan] = useState('ROOKIE')
  const [formGratuito, setFormGratuito] = useState(false)
  const [formExpiracion, setFormExpiracion] = useState('')
  const [formNotas, setFormNotas] = useState('')
  const [formBanMotivo, setFormBanMotivo] = useState('')
  const [loading, setLoading] = useState(false)

  const filtrados = useMemo(() => {
    return usuarios.filter(u => {
      if (filtroBan && !u.baneado) return false
      if (filtroPlan !== 'TODOS' && u.suscripcion?.plan !== filtroPlan) return false
      if (busqueda) {
        const q = busqueda.toLowerCase()
        return u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      }
      return true
    })
  }, [usuarios, busqueda, filtroPlan, filtroBan])

  async function abrirFicha(user: Usuario) {
    setSelectedUser(user)
    setFormPlan(user.suscripcion?.plan || 'ROOKIE')
    setFormGratuito(user.suscripcion?.esGratuita || false)
    setFormExpiracion(user.suscripcion?.fechaExpiracionManual?.slice(0, 10) || '')
    setFormNotas(user.suscripcion?.notasAdmin || '')
    setFormBanMotivo(user.motivoBan || '')
    setShowLogs(false)

    // Cargar logs
    const res = await fetch(`/api/admin/usuarios/${user.id}`)
    if (res.ok) {
      const data = await res.json()
      setLogs(data.logs || [])
    }
  }

  async function accion(tipo: string, extra: object = {}) {
    if (!selectedUser) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/usuarios/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: tipo, ...extra }),
      })
      if (!res.ok) { const d = await res.json(); toast.error(d.error || 'Error'); return }
      toast.success('Cambio guardado')
      router.refresh()
      setSelectedUser(null)
    } catch { toast.error('Error') }
    finally { setLoading(false) }
  }

  // Stats
  const totalActivos = usuarios.filter(u => u.suscripcion?.estado === 'ACTIVA').length
  const totalGratuitos = usuarios.filter(u => u.suscripcion?.estado === 'GRATUITA').length
  const totalBaneados = usuarios.filter(u => u.baneado).length
  const ingresosMes = usuarios
    .filter(u => u.suscripcion?.estado === 'ACTIVA' && !u.suscripcion.esGratuita)
    .reduce((s, u) => s + (u.suscripcion?.precioMensual || 0), 0)

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Activos', value: totalActivos, sub: `${ingresosMes}€/mes` },
          { label: 'Gratuitos', value: totalGratuitos, sub: 'Sin cobro' },
          { label: 'Total usuarios', value: usuarios.length, sub: 'Registrados' },
          { label: 'Baneados', value: totalBaneados, sub: 'Suspendidos', red: true },
        ].map(s => (
          <div key={s.label} className="bg-apex-card border border-apex-border rounded-xl p-4">
            <div className="text-2xl font-bold">{s.value}</div>
            <div className={cn('text-sm', s.red ? 'text-red-400' : 'text-apex-muted')}>{s.label}</div>
            <div className="text-xs text-apex-muted mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-apex-muted" />
          <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por username o email..."
            className="w-full bg-apex-card border border-apex-border rounded-lg pl-8 pr-3 py-2 text-sm focus:border-apex-red focus:outline-none" />
        </div>
        <div className="flex gap-1 bg-apex-card border border-apex-border rounded-lg p-1">
          {['TODOS', ...PLAN_ORDER].map(p => (
            <button key={p} onClick={() => setFiltroPlan(p)}
              className={cn('px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                filtroPlan === p ? 'bg-apex-red text-white' : 'text-apex-muted hover:text-apex-text')}>
              {p === 'TODOS' ? 'Todos' : PLAN_LABELS[p]}
            </button>
          ))}
        </div>
        <button onClick={() => setFiltroBan(!filtroBan)}
          className={cn('flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium border transition-colors',
            filtroBan ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-apex-card border-apex-border text-apex-muted hover:text-apex-text')}>
          <Ban size={12} />Baneados
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-apex-card border border-apex-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-apex-border text-left">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted">Usuario</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted hidden sm:table-cell">Plan</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted hidden md:table-cell">Estado</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted hidden lg:table-cell">Renovación</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-apex-border/50">
            {filtrados.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-apex-muted text-sm">Sin resultados</td></tr>
            )}
            {filtrados.map(u => (
              <tr key={u.id} className={cn(u.baneado && 'opacity-60 bg-red-500/5')}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0', u.baneado ? 'bg-red-600' : 'bg-apex-red')}>
                      {u.username.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-sm flex items-center gap-1">
                        {u.username}
                        {u.baneado && <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">BANEADO</span>}
                        {u.suscripcion?.esGratuita && <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full">GRATIS</span>}
                        {u.role === 'ADMIN' && <span className="text-[10px] bg-apex-red/20 text-apex-red px-1.5 py-0.5 rounded-full">ADMIN</span>}
                      </div>
                      <div className="text-xs text-apex-muted">{getPaisFlag(u.pais)} {u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  {u.suscripcion ? (
                    <span className={cn('text-xs px-2 py-0.5 rounded-full border', PLAN_COLORS[u.suscripcion.plan])}>
                      {PLAN_LABELS[u.suscripcion.plan]}
                    </span>
                  ) : (
                    <span className="text-xs text-apex-muted">Sin plan</span>
                  )}
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  {u.suscripcion ? (
                    <span className={cn('text-xs px-2 py-0.5 rounded-full border', ESTADO_COLORS[u.suscripcion.estado] || '')}>
                      {u.suscripcion.estado}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-sm text-apex-muted hidden lg:table-cell">
                  {u.suscripcion?.fechaRenovacion ? formatFecha(u.suscripcion.fechaRenovacion) : '—'}
                  {u.suscripcion?.fechaExpiracionManual && (
                    <div className="text-xs text-orange-400">Expira: {formatFecha(u.suscripcion.fechaExpiracionManual)}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => abrirFicha(u)}
                    className="px-3 py-1.5 text-xs bg-apex-surface border border-apex-border rounded-lg hover:border-apex-red/50 transition-colors">
                    Gestionar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal ficha */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-apex-card border border-apex-border rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-apex-border sticky top-0 bg-apex-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-apex-red flex items-center justify-center text-white font-bold">
                  {selectedUser.username.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold">{selectedUser.username}</div>
                  <div className="text-xs text-apex-muted">{selectedUser.email}</div>
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-apex-muted hover:text-apex-text p-1">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Tabs */}
              <div className="flex gap-1 bg-apex-surface rounded-lg p-1">
                <button onClick={() => setShowLogs(false)}
                  className={cn('flex-1 py-1.5 rounded-md text-sm font-medium transition-colors', !showLogs ? 'bg-apex-red text-white' : 'text-apex-muted hover:text-apex-text')}>
                  Gestión
                </button>
                <button onClick={() => setShowLogs(true)}
                  className={cn('flex-1 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-1', showLogs ? 'bg-apex-red text-white' : 'text-apex-muted hover:text-apex-text')}>
                  <History size={13} />Historial
                </button>
              </div>

              {!showLogs ? (
                <>
                  {/* Plan */}
                  <div className="bg-apex-surface rounded-xl border border-apex-border p-4 space-y-3">
                    <h3 className="font-semibold text-sm">Plan de acceso</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-apex-muted mb-1 block">Plan</label>
                        <select value={formPlan} onChange={e => setFormPlan(e.target.value)}
                          className="w-full bg-apex-bg border border-apex-border rounded-lg px-3 py-2 text-sm focus:border-apex-red focus:outline-none">
                          {PLAN_ORDER.map(p => <option key={p} value={p}>{PLAN_LABELS[p]} — {PLAN_PRECIOS[p]}€/mes</option>)}
                        </select>
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={formGratuito} onChange={e => setFormGratuito(e.target.checked)} className="w-4 h-4 accent-blue-500" />
                          <span className="text-sm">Acceso gratuito</span>
                        </label>
                      </div>
                    </div>
                    {formGratuito && (
                      <div>
                        <label className="text-xs text-apex-muted mb-1 block">Fecha expiración (vacío = sin límite)</label>
                        <input type="date" value={formExpiracion} onChange={e => setFormExpiracion(e.target.value)}
                          className="w-full bg-apex-bg border border-apex-border rounded-lg px-3 py-2 text-sm focus:border-apex-red focus:outline-none" />
                      </div>
                    )}
                    <div>
                      <label className="text-xs text-apex-muted mb-1 block">Notas internas</label>
                      <input type="text" value={formNotas} onChange={e => setFormNotas(e.target.value)}
                        placeholder="ej: Influencer confirmado, colaborador técnico..."
                        className="w-full bg-apex-bg border border-apex-border rounded-lg px-3 py-2 text-sm focus:border-apex-red focus:outline-none" />
                    </div>
                    <button onClick={() => accion('CAMBIO_PLAN', { plan: formPlan, esGratuita: formGratuito, fechaExpiracion: formExpiracion || null, notas: formNotas })}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-apex-red text-white rounded-lg text-sm font-medium disabled:opacity-50">
                      <Save size={14} />{loading ? 'Guardando...' : 'Guardar Plan'}
                    </button>
                  </div>

                  {/* Cancelar suscripción */}
                  {selectedUser.suscripcion && ['ACTIVA', 'GRATUITA'].includes(selectedUser.suscripcion.estado) && (
                    <div className="bg-apex-surface rounded-xl border border-apex-border p-4">
                      <h3 className="font-semibold text-sm mb-3">Cancelar suscripción</h3>
                      <button onClick={() => accion('CANCELAR_SUSCRIPCION', { notas: 'Cancelado por admin' })}
                        className="px-4 py-2 bg-gray-600/20 text-gray-300 border border-gray-600/30 rounded-lg text-sm hover:bg-gray-600/30 transition-colors">
                        Revocar acceso
                      </button>
                    </div>
                  )}

                  {/* Ban */}
                  <div className="bg-apex-surface rounded-xl border border-apex-border p-4 space-y-3">
                    <h3 className="font-semibold text-sm">Estado de la cuenta</h3>
                    {!selectedUser.baneado ? (
                      <>
                        <div>
                          <label className="text-xs text-apex-muted mb-1 block">Motivo del ban</label>
                          <input type="text" value={formBanMotivo} onChange={e => setFormBanMotivo(e.target.value)}
                            placeholder="Conducta inapropiada, trampas, etc."
                            className="w-full bg-apex-bg border border-apex-border rounded-lg px-3 py-2 text-sm focus:border-apex-red focus:outline-none" />
                        </div>
                        <button onClick={() => accion('BAN', { baneado: true, motivoBan: formBanMotivo })}
                          disabled={!formBanMotivo || loading}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600/20 text-red-400 border border-red-600/30 rounded-lg text-sm disabled:opacity-40 hover:bg-red-600/30 transition-colors">
                          <Ban size={14} />Banear cuenta
                        </button>
                      </>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm text-red-400">Cuenta baneada. Motivo: {selectedUser.motivoBan}</p>
                        <button onClick={() => accion('BAN', { baneado: false })}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600/20 text-green-400 border border-green-600/30 rounded-lg text-sm hover:bg-green-600/30 transition-colors">
                          <ShieldCheck size={14} />Desbanear cuenta
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Logs */
                <div className="space-y-2">
                  {logs.length === 0 ? (
                    <p className="text-apex-muted text-sm text-center py-8">Sin acciones registradas</p>
                  ) : logs.map(log => (
                    <div key={log.id} className="bg-apex-surface border border-apex-border rounded-lg px-4 py-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-apex-red">{log.accion}</span>
                        <span className="text-xs text-apex-muted">{formatTimeAgo(log.creadoEn)}</span>
                      </div>
                      {log.detalle && <p className="text-sm text-apex-muted">{log.detalle}</p>}
                      <p className="text-xs text-apex-muted mt-1">por {log.admin.username}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
