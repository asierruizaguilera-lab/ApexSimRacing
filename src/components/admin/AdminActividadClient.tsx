'use client'

import { useCallback, useEffect, useState } from 'react'
import { Users, ShieldAlert, AlertOctagon, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Item {
  id: string
  tipo: string
  userId: string | null
  username: string | null
  ruta: string | null
  metodo: string | null
  estado: number | null
  ipHash: string | null
  userAgent: string | null
  detalle: unknown
  creadoEn: string
}

interface Respuesta {
  items: Item[]
  total: number
  pagina: number
  paginas: number
  kpis: { activos: number; loginsFallidos: number; errores: number }
}

const TIPOS = ['LOGIN_OK', 'LOGIN_FALLIDO', 'LOGOUT', 'REGISTRO', 'VISTA', 'PAGO', 'CAMBIO_PLAN', 'ADMIN', 'SEGURIDAD', 'ERROR_API']

const TIPO_COLORS: Record<string, string> = {
  LOGIN_OK: 'bg-green-500/20 text-green-400 border-green-500/30',
  LOGIN_FALLIDO: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  LOGOUT: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  REGISTRO: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  VISTA: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  PAGO: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  CAMBIO_PLAN: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  ADMIN: 'bg-apex-red/20 text-apex-red border-apex-red/30',
  SEGURIDAD: 'bg-red-500/20 text-red-400 border-red-500/30',
  ERROR_API: 'bg-red-700/30 text-red-300 border-red-700/40',
}

const inputCls = 'bg-apex-bg border border-apex-border rounded-lg px-3 py-2 text-sm text-apex-text'

export function AdminActividadClient() {
  const [tipo, setTipo] = useState('')
  const [usuario, setUsuario] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [pagina, setPagina] = useState(1)
  const [datos, setDatos] = useState<Respuesta | null>(null)
  const [cargando, setCargando] = useState(false)

  const query = useCallback((extra: Record<string, string> = {}) => {
    const p = new URLSearchParams()
    if (tipo) p.set('tipo', tipo)
    if (usuario.trim()) p.set('usuario', usuario.trim())
    if (desde) p.set('desde', desde)
    if (hasta) p.set('hasta', hasta)
    for (const [k, v] of Object.entries(extra)) p.set(k, v)
    return p.toString()
  }, [tipo, usuario, desde, hasta])

  const cargar = useCallback(async (pag: number) => {
    setCargando(true)
    try {
      const res = await fetch(`/api/admin/actividad?${query({ pagina: String(pag) })}`)
      if (res.ok) setDatos(await res.json())
    } finally {
      setCargando(false)
    }
  }, [query])

  // Recarga al cambiar de página o de filtro (con un pequeño retardo para no disparar una petición por tecla)
  useEffect(() => {
    const t = setTimeout(() => cargar(pagina), 300)
    return () => clearTimeout(t)
  }, [cargar, pagina])

  function filtrar(fn: () => void) {
    fn()
    setPagina(1)
  }

  const kpis = datos?.kpis

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-apex-card border border-apex-border rounded-xl p-4">
          <div className="text-apex-muted text-xs mb-1 flex items-center gap-1"><Users size={12} />Usuarios activos 24h</div>
          <div className="text-2xl font-bold">{kpis?.activos ?? '—'}</div>
        </div>
        <div className="bg-apex-card border border-apex-border rounded-xl p-4">
          <div className="text-apex-muted text-xs mb-1 flex items-center gap-1"><ShieldAlert size={12} />Logins fallidos 24h</div>
          <div className={cn('text-2xl font-bold', (kpis?.loginsFallidos ?? 0) > 0 && 'text-orange-400')}>{kpis?.loginsFallidos ?? '—'}</div>
        </div>
        <div className="bg-apex-card border border-apex-border rounded-xl p-4">
          <div className="text-apex-muted text-xs mb-1 flex items-center gap-1"><AlertOctagon size={12} />Errores API 24h</div>
          <div className={cn('text-2xl font-bold', (kpis?.errores ?? 0) > 0 && 'text-red-400')}>{kpis?.errores ?? '—'}</div>
        </div>
      </div>

      <div className="bg-apex-card border border-apex-border rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <label className="text-xs text-apex-muted flex flex-col gap-1">
          Tipo
          <select value={tipo} onChange={e => filtrar(() => setTipo(e.target.value))} className={inputCls}>
            <option value="">Todos</option>
            {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="text-xs text-apex-muted flex flex-col gap-1 flex-1 min-w-[160px]">
          Usuario (nombre, email o id)
          <input value={usuario} onChange={e => filtrar(() => setUsuario(e.target.value))} placeholder="Buscar…" className={inputCls} />
        </label>
        <label className="text-xs text-apex-muted flex flex-col gap-1">
          Desde
          <input type="date" value={desde} onChange={e => filtrar(() => setDesde(e.target.value))} className={inputCls} />
        </label>
        <label className="text-xs text-apex-muted flex flex-col gap-1">
          Hasta
          <input type="date" value={hasta} onChange={e => filtrar(() => setHasta(e.target.value))} className={inputCls} />
        </label>
        <a href={`/api/admin/actividad/export?${query()}`}
          className="flex items-center gap-2 px-4 py-2 bg-apex-red hover:bg-apex-red-dark text-white rounded-lg text-sm font-medium transition-colors">
          <Download size={16} />Exportar CSV
        </a>
      </div>

      <div className="bg-apex-card border border-apex-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-apex-muted text-xs border-b border-apex-border">
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Usuario</th>
              <th className="px-4 py-3 font-medium">Ruta</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Detalle</th>
            </tr>
          </thead>
          <tbody className={cn(cargando && 'opacity-50')}>
            {datos?.items.map(i => (
              <tr key={i.id} className="border-b border-apex-border/50 align-top">
                <td className="px-4 py-2 whitespace-nowrap text-apex-muted">
                  {new Date(i.creadoEn).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'medium' })}
                </td>
                <td className="px-4 py-2">
                  <span className={cn('text-[11px] px-2 py-0.5 rounded-full border whitespace-nowrap', TIPO_COLORS[i.tipo])}>{i.tipo}</span>
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {i.username
                    ?? (i.userId
                      ? <span className="text-apex-muted text-xs font-mono">{i.userId}</span>
                      : <span className="text-apex-muted">—</span>)}
                </td>
                <td className="px-4 py-2 font-mono text-xs break-all">
                  {i.metodo && <span className="text-apex-muted mr-1">{i.metodo}</span>}{i.ruta ?? ''}
                </td>
                <td className="px-4 py-2">{i.estado ?? ''}</td>
                <td className="px-4 py-2 font-mono text-xs text-apex-muted break-all max-w-md">
                  {i.detalle ? JSON.stringify(i.detalle) : ''}
                </td>
              </tr>
            ))}
            {datos && datos.items.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-apex-muted">Sin actividad para estos filtros</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {datos && (
        <div className="flex items-center justify-between text-sm text-apex-muted">
          <span>{datos.total.toLocaleString('es-ES')} registros</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina <= 1}
              className="p-2 rounded-lg border border-apex-border disabled:opacity-30 hover:border-apex-red/40">
              <ChevronLeft size={16} />
            </button>
            <span>Página {datos.pagina} de {datos.paginas}</span>
            <button onClick={() => setPagina(p => Math.min(datos.paginas, p + 1))} disabled={pagina >= datos.paginas}
              className="p-2 rounded-lg border border-apex-border disabled:opacity-30 hover:border-apex-red/40">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
