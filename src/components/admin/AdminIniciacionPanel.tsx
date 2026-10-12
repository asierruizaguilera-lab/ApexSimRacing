'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Flag, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Iniciacion {
  id: string
  nombre: string
  estado: 'PENDIENTE' | 'ACTIVA' | 'CERRADA'
  ventanaExpira: string | null
  carrerasFinalizadas: number
  totalCarreras: number
  elegiblesPendientes: number
  convertidosFounder: number
}

const ESTADO_UI: Record<Iniciacion['estado'], { label: string; cls: string }> = {
  PENDIENTE: { label: 'Pendiente', cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  ACTIVA: { label: 'Ventana activa', cls: 'bg-green-500/20 text-green-400 border-green-500/30' },
  CERRADA: { label: 'Cerrada', cls: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
}

function tiempoRestante(expira: string, ahora: number): string {
  const s = Math.max(0, Math.floor((new Date(expira).getTime() - ahora) / 1000))
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  return `${d}d ${h}h ${m}m`
}

export function AdminIniciacionPanel({ iniciaciones }: { iniciaciones: Iniciacion[] }) {
  const router = useRouter()
  const [ahora, setAhora] = useState(() => Date.now())
  const [cerrando, setCerrando] = useState<string | null>(null)

  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  async function cerrarVentana(c: Iniciacion) {
    if (!confirm(`¿Cerrar ahora la ventana Founder de "${c.nombre}"?`)) return
    if (!confirm(`Confirmación final: ${c.elegiblesPendientes} pilotos elegibles perderán el precio Founder. Esta acción no se puede deshacer.`)) return
    setCerrando(c.id)
    try {
      const res = await fetch(`/api/admin/iniciacion/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'CERRAR_VENTANA' }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Error'); return }
      toast.success('Ventana Founder cerrada')
      router.refresh()
    } catch { toast.error('Error de conexión') }
    finally { setCerrando(null) }
  }

  return (
    <div className="bg-apex-card border border-apex-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-apex-border">
        <Flag size={16} className="text-emerald-400" />
        <h2 className="font-semibold">Iniciación</h2>
      </div>
      {iniciaciones.length === 0 ? (
        <p className="px-4 py-4 text-sm text-apex-muted">
          No hay campeonatos de iniciación. Marca &quot;¿Es temporada de iniciación?&quot; al crear un campeonato.
        </p>
      ) : (
        <div className="divide-y divide-apex-border/50">
          {iniciaciones.map(c => {
            const ui = ESTADO_UI[c.estado]
            return (
              <div key={c.id} className="px-4 py-4 flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/admin/campeonatos/${c.id}`} className="font-medium text-sm hover:text-apex-red truncate">{c.nombre}</Link>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full border', ui.cls)}>{ui.label}</span>
                  </div>
                  <div className="text-xs text-apex-muted mt-1">
                    {c.estado === 'PENDIENTE' && `Carreras finalizadas: ${c.carrerasFinalizadas}/${Math.min(4, c.totalCarreras) || 4} — la ventana se abre al terminar la carrera 4`}
                    {c.estado === 'ACTIVA' && c.ventanaExpira && <>Cierra en <strong className="text-apex-text">{tiempoRestante(c.ventanaExpira, ahora)}</strong></>}
                    {c.estado === 'CERRADA' && c.ventanaExpira && `Ventana cerrada (expiraba el ${new Date(c.ventanaExpira).toLocaleString('es-ES')})`}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-bold text-lg">{c.elegiblesPendientes}</div>
                    <div className="text-[11px] text-apex-muted">Elegibles sin pagar</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-lg text-yellow-400">{c.convertidosFounder}</div>
                    <div className="text-[11px] text-apex-muted">Nuevos Founders</div>
                  </div>
                  {c.estado === 'ACTIVA' && (
                    <button
                      onClick={() => cerrarVentana(c)}
                      disabled={cerrando === c.id}
                      className="px-3 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs hover:bg-red-500/30 transition-colors flex items-center gap-1 disabled:opacity-60">
                      <Lock size={12} />{cerrando === c.id ? 'Cerrando...' : 'Cerrar ventana manualmente'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
