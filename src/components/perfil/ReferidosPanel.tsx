'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Gift, Copy, Link2, Loader2, Users, Wallet, TrendingUp } from 'lucide-react'
import { formatFecha, cn } from '@/lib/utils'

interface Stats {
  codigo: { codigo: string; creadoEn: string } | null
  config: { descuento: number; comision: number; meses: number }
  totalReferidos: number
  referidosActivos: number
  comisionEsteMes: number
  comisionHistorica: number
  saldoPendiente: number
  saldoPagado: number
  precioSuscripcion: number
  cashEstimado: number
  referidos: {
    id: string
    fechaInicio: string
    mesesActivos: number
    comisionTotal: number
    activo: boolean
    referido: { id: string; username: string }
  }[]
}

const eur = (n: number) => `${n.toFixed(2)}€`

export function ReferidosPanel() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [generando, setGenerando] = useState(false)
  const [origin, setOrigin] = useState('')

  async function cargar() {
    try {
      const res = await fetch('/api/referidos/mis-stats')
      if (res.ok) setStats(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setOrigin(window.location.origin)
    cargar()
  }, [])

  async function generar() {
    setGenerando(true)
    try {
      const res = await fetch('/api/referidos/generar', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al generar el código')
      toast.success(`Tu código: ${data.codigo}`)
      await cargar()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setGenerando(false)
    }
  }

  function copiar(texto: string, msg: string) {
    navigator.clipboard.writeText(texto).then(() => toast.success(msg)).catch(() => toast.error('No se pudo copiar'))
  }

  if (loading) {
    return (
      <div className="bg-apex-card border border-apex-border rounded-xl p-6 flex items-center gap-2 text-apex-muted text-sm">
        <Loader2 size={16} className="animate-spin" />Cargando programa de referidos...
      </div>
    )
  }
  if (!stats) return null

  const link = stats.codigo ? `${origin}/registro?ref=${stats.codigo.codigo}` : ''

  return (
    <div className="bg-apex-card border border-apex-border rounded-xl p-6 space-y-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-apex-red/10 flex items-center justify-center flex-shrink-0">
          <Gift size={20} className="text-apex-red" />
        </div>
        <div>
          <h3 className="font-semibold">Mi Código de Referido</h3>
          <p className="text-sm text-apex-muted">
            Tus amigos tienen un {stats.config.descuento}% de descuento en su primer mes y tú ganas
            un {stats.config.comision}% de su suscripción durante {stats.config.meses} meses.
          </p>
        </div>
      </div>

      {stats.codigo ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <code className="flex-1 min-w-0 truncate bg-apex-surface border border-apex-border rounded-lg px-4 py-3 font-mono text-lg font-bold tracking-wide">
              {stats.codigo.codigo}
            </code>
            <button
              onClick={() => copiar(stats.codigo!.codigo, 'Código copiado')}
              className="p-3 bg-apex-surface border border-apex-border rounded-lg hover:border-apex-red transition-colors"
              title="Copiar código">
              <Copy size={18} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 truncate text-xs text-apex-muted bg-apex-surface border border-apex-border rounded-lg px-3 py-2.5 font-mono">
              {link}
            </div>
            <button
              onClick={() => copiar(link, 'Link copiado')}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-apex-red hover:bg-apex-red-dark text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap">
              <Link2 size={14} />Copiar link
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={generar}
          disabled={generando}
          className="flex items-center gap-2 px-5 py-2.5 bg-apex-red hover:bg-apex-red-dark text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60">
          {generando ? <Loader2 size={16} className="animate-spin" /> : <Gift size={16} />}
          Generar mi código
        </button>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Users, label: 'Han usado tu código', value: String(stats.totalReferidos) },
          { icon: TrendingUp, label: 'Comisión este mes', value: eur(stats.comisionEsteMes) },
          { icon: Wallet, label: 'Total histórico', value: eur(stats.comisionHistorica) },
          { icon: Gift, label: 'Referidos activos', value: String(stats.referidosActivos) },
        ].map(s => (
          <div key={s.label} className="bg-apex-surface border border-apex-border rounded-lg p-3">
            <s.icon size={14} className="text-apex-muted mb-1" />
            <div className="text-lg font-bold">{s.value}</div>
            <div className="text-[11px] text-apex-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {stats.saldoPendiente > 0 && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 text-sm">
          <p className="text-green-400 font-medium">
            Tienes {eur(stats.saldoPendiente)} pendientes de cobro este mes
          </p>
          {stats.precioSuscripcion > 0 && (
            <p className="text-apex-muted text-xs mt-1">
              Se descuenta primero tu suscripción ({eur(stats.precioSuscripcion)}): recibirías {eur(stats.cashEstimado)} en cash en la liquidación de fin de mes.
            </p>
          )}
        </div>
      )}

      {stats.referidos.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Tus referidos</h4>
          <div className="divide-y divide-apex-border border border-apex-border rounded-lg overflow-hidden">
            {stats.referidos.map(r => (
              <div key={r.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm bg-apex-surface">
                <Link href={`/perfil/${r.referido.id}`} className="font-medium hover:text-apex-red truncate">
                  {r.referido.username}
                </Link>
                <div className="flex items-center gap-3 text-xs text-apex-muted flex-shrink-0">
                  <span>desde {formatFecha(r.fechaInicio)}</span>
                  <span>{r.mesesActivos}/{stats.config.meses} meses</span>
                  <span className="text-apex-text font-medium">{eur(r.comisionTotal)}</span>
                  <span className={cn('px-2 py-0.5 rounded-full', r.activo ? 'bg-green-500/15 text-green-400' : 'bg-apex-border text-apex-muted')}>
                    {r.activo ? 'Activo' : 'Finalizado'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.saldoPagado > 0 && (
        <p className="text-xs text-apex-muted">Total cobrado hasta ahora: {eur(stats.saldoPagado)}</p>
      )}
    </div>
  )
}
