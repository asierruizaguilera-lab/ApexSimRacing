'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Lightbulb, MessageSquareReply } from 'lucide-react'
import { cn, formatFecha } from '@/lib/utils'
import { Modal } from '@/components/equipos/Modal'

interface Propuesta {
  id: string
  titulo: string
  descripcion: string
  estado: 'PENDIENTE' | 'REVISANDO' | 'ACEPTADA' | 'RECHAZADA'
  respuestaAdmin: string | null
  creadoEn: string
  respondidoEn: string | null
  equipo: { id: string; nombre: string; colorPrimario: string | null }
  lider: { id: string; username: string }
  temporada: { numero: number; anio: number }
}

const ESTADOS: Record<Propuesta['estado'], { label: string; cls: string }> = {
  PENDIENTE: { label: 'Pendiente', cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  REVISANDO: { label: 'En revisión', cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  ACEPTADA: { label: 'Aceptada', cls: 'bg-green-500/20 text-green-400 border-green-500/30' },
  RECHAZADA: { label: 'Rechazada', cls: 'bg-red-500/20 text-red-400 border-red-500/30' },
}

export function AdminPropuestasClient({ propuestas }: { propuestas: Propuesta[] }) {
  const router = useRouter()
  const [filtro, setFiltro] = useState<'ABIERTAS' | 'TODAS'>('ABIERTAS')
  const [abierta, setAbierta] = useState<Propuesta | null>(null)
  const [estado, setEstado] = useState<Propuesta['estado']>('REVISANDO')
  const [respuesta, setRespuesta] = useState('')
  const [guardando, setGuardando] = useState(false)
  const cerrar = useCallback(() => setAbierta(null), [])

  const abiertas = propuestas.filter(p => p.estado === 'PENDIENTE' || p.estado === 'REVISANDO')
  const lista = filtro === 'ABIERTAS' ? abiertas : propuestas

  function responder(p: Propuesta) {
    setEstado(p.estado === 'PENDIENTE' ? 'REVISANDO' : p.estado)
    setRespuesta(p.respuestaAdmin ?? '')
    setAbierta(p)
  }

  async function guardar() {
    if (!abierta) return
    setGuardando(true)
    try {
      const res = await fetch(`/api/admin/equipos/propuestas/${abierta.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado, respuestaAdmin: respuesta }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Error'); return }
      toast.success('Respuesta enviada al líder del equipo')
      cerrar()
      router.refresh()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div>
      <div className="flex gap-1 bg-apex-card border border-apex-border rounded-lg p-1 w-fit mb-4">
        {(['ABIERTAS', 'TODAS'] as const).map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              filtro === f ? 'bg-apex-red text-white' : 'text-apex-muted hover:text-apex-text')}>
            {f === 'ABIERTAS' ? 'Pendientes' : 'Todas'}
            {f === 'ABIERTAS' && abiertas.length > 0 && (
              <span className={cn('min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center',
                filtro === f ? 'bg-white/25' : 'bg-apex-red text-white')}>
                {abiertas.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {lista.length === 0 ? (
        <div className="bg-apex-card border border-apex-border rounded-xl py-16 text-center text-apex-muted">
          <Lightbulb size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">{filtro === 'ABIERTAS' ? 'No hay propuestas pendientes' : 'Todavía no hay propuestas'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map(p => (
            <div key={p.id} className="bg-apex-card border border-apex-border rounded-xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full border', ESTADOS[p.estado].cls)}>{ESTADOS[p.estado].label}</span>
                    <span className="text-xs text-apex-muted">T{p.temporada.numero} {p.temporada.anio} · {formatFecha(p.creadoEn)}</span>
                  </div>
                  <h3 className="font-semibold">{p.titulo}</h3>
                  <Link href={`/equipos/${p.equipo.id}`} className="inline-flex items-center gap-1.5 text-sm text-apex-muted hover:text-apex-red transition-colors">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: p.equipo.colorPrimario || '#C0392B' }} />
                    {p.equipo.nombre} · líder {p.lider.username}
                  </Link>
                  <p className="text-sm text-apex-text/90 mt-2 whitespace-pre-wrap">{p.descripcion}</p>
                  {p.respuestaAdmin && (
                    <div className="mt-3 text-sm bg-apex-surface border border-apex-border rounded-lg p-3">
                      <span className="text-apex-muted">Respuesta:</span> {p.respuestaAdmin}
                    </div>
                  )}
                </div>
                <button onClick={() => responder(p)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-apex-surface border border-apex-border hover:border-apex-red/40 rounded-lg text-sm transition-colors flex-shrink-0">
                  <MessageSquareReply size={15} />Responder
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {abierta && (
        <Modal titulo={`Responder a ${abierta.equipo.nombre}`} onClose={cerrar}>
          <div className="space-y-4">
            <div className="text-sm">
              <div className="font-semibold">{abierta.titulo}</div>
              <p className="text-apex-muted whitespace-pre-wrap mt-1 max-h-40 overflow-y-auto">{abierta.descripcion}</p>
            </div>
            <div>
              <span className="block text-sm text-apex-muted mb-1.5">Estado</span>
              <div className="flex flex-wrap gap-2">
                {(['REVISANDO', 'ACEPTADA', 'RECHAZADA'] as const).map(e => (
                  <button key={e} type="button" onClick={() => setEstado(e)}
                    className={cn('text-xs px-3 py-1.5 rounded-lg border transition-colors',
                      estado === e ? ESTADOS[e].cls : 'border-apex-border text-apex-muted hover:text-apex-text')}>
                    {ESTADOS[e].label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="respuesta" className="block text-sm text-apex-muted mb-1.5">Respuesta para el líder</label>
              <textarea id="respuesta" value={respuesta} onChange={e => setRespuesta(e.target.value)} rows={4} maxLength={2000}
                className="w-full bg-apex-surface border border-apex-border rounded-xl px-3 py-2.5 text-sm focus:border-apex-red outline-none resize-none" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={cerrar} className="px-4 py-2 text-sm text-apex-muted hover:text-apex-text">Cancelar</button>
              <button onClick={guardar} disabled={guardando}
                className="px-5 py-2 bg-apex-red hover:bg-apex-red-dark text-white rounded-xl text-sm font-semibold disabled:opacity-50">
                {guardando ? 'Enviando...' : 'Enviar respuesta'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
