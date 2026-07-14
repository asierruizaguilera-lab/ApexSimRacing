'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { RefreshCw, ExternalLink, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { cn, formatFechaHora } from '@/lib/utils'

interface SyncLog {
  id: string
  ejecutadoEn: string
  creadas: number
  omitidas: number
  errores: string | null
  tipo: string
}

export function AdminSyncSheetClient({ sheetUrl, historial }: { sheetUrl: string; historial: SyncLog[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const ultima = historial[0] || null

  async function sincronizarAhora() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/sync-sheet', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Error al sincronizar'); return }
      toast.success(`${data.creadas} carreras creadas, ${data.omitidas} omitidas`)
      router.refresh()
    } catch {
      toast.error('Error al sincronizar')
    } finally {
      setLoading(false)
    }
  }

  function errores(h: SyncLog): string[] {
    if (!h.errores) return []
    try { return JSON.parse(h.errores) } catch { return [h.errores] }
  }

  return (
    <div className="space-y-6">
      <div className="bg-apex-card border border-apex-border rounded-xl p-5">
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={sincronizarAhora} disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-apex-red text-white rounded-xl text-sm font-semibold hover:bg-apex-red-dark transition-colors disabled:opacity-50">
            <RefreshCw size={16} className={cn(loading && 'animate-spin')} />
            {loading ? 'Sincronizando...' : 'Sincronizar ahora'}
          </button>
          <a href={sheetUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 bg-apex-surface border border-apex-border rounded-xl text-sm font-medium hover:border-apex-red/30 transition-colors">
            <ExternalLink size={14} />Abrir Google Sheet
          </a>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mt-5 pt-5 border-t border-apex-border">
          <div>
            <div className="text-xs text-apex-muted mb-1">Última sincronización</div>
            <div className="text-sm font-medium">{ultima ? formatFechaHora(ultima.ejecutadoEn) : 'Nunca'}</div>
          </div>
          <div>
            <div className="text-xs text-apex-muted mb-1">Resultado</div>
            <div className="text-sm font-medium">
              {ultima ? `${ultima.creadas} carreras creadas, ${ultima.omitidas} omitidas` : '—'}
              {ultima && errores(ultima).length > 0 && (
                <span className="ml-2 text-xs text-yellow-400">({errores(ultima).length} errores)</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-apex-muted uppercase tracking-wider mb-3">Historial (últimas {historial.length})</h2>
        {historial.length === 0 ? (
          <div className="bg-apex-card border border-apex-border rounded-xl py-10 text-center text-apex-muted text-sm">
            Todavía no se ha ejecutado ninguna sincronización
          </div>
        ) : (
          <div className="bg-apex-card border border-apex-border rounded-xl overflow-hidden">
            {historial.map((h, i) => {
              const errs = errores(h)
              const expanded = expandedId === h.id
              return (
                <div key={h.id} className={cn(i > 0 && 'border-t border-apex-border/50')}>
                  <button
                    onClick={() => errs.length > 0 && setExpandedId(expanded ? null : h.id)}
                    className={cn('w-full flex items-center justify-between gap-3 px-4 py-3 text-left', errs.length > 0 && 'hover:bg-apex-surface/40 transition-colors')}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full border flex-shrink-0', h.tipo === 'MANUAL'
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                        : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                      )}>
                        {h.tipo === 'MANUAL' ? 'Manual' : 'Automática'}
                      </span>
                      <span className="text-sm text-apex-muted">{formatFechaHora(h.ejecutadoEn)}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm">
                        <span className="text-green-400 font-medium">{h.creadas}</span> creadas ·{' '}
                        <span className="text-apex-muted">{h.omitidas}</span> omitidas
                      </span>
                      {errs.length > 0 && (
                        <span className="flex items-center gap-1 text-xs text-yellow-400">
                          <AlertTriangle size={12} />{errs.length}
                          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </span>
                      )}
                    </div>
                  </button>
                  {expanded && errs.length > 0 && (
                    <div className="px-4 pb-3 space-y-1">
                      {errs.map((e, idx) => (
                        <p key={idx} className="text-xs text-apex-muted bg-apex-surface rounded-lg px-3 py-2">{e}</p>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
