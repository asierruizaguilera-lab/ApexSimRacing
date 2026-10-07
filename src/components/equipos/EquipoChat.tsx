'use client'

import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Send, Ban, Trash2, Shield, Crown } from 'lucide-react'
import { getSocket } from '@/lib/socketClient'
import { formatTimeAgo, cn } from '@/lib/utils'
import { Avatar } from './EquipoLogo'

export interface MensajeEquipo {
  id: string
  userId: string
  contenido: string
  creadoEn: string
  user: { id: string; username: string; avatar: string | null; role: string }
}

interface Props {
  equipoId: string
  color: string
  liderId: string
  initialMessages: MensajeEquipo[]
  currentUserId: string
  puedeEscribir: boolean
  moderador?: boolean // admin: puede borrar mensajes
  className?: string
}

function formatCuentaAtras(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

export function EquipoChat({ equipoId, color, liderId, initialMessages, currentUserId, puedeEscribir, moderador = false, className }: Props) {
  const [mensajes, setMensajes] = useState<MensajeEquipo[]>(initialMessages)
  const [texto, setTexto] = useState('')
  const [sending, setSending] = useState(false)
  const [bloqueadoHasta, setBloqueadoHasta] = useState<number | null>(null)
  const [ahora, setAhora] = useState(() => Date.now())
  const listaRef = useRef<HTMLDivElement>(null)
  const restante = bloqueadoHasta ? bloqueadoHasta - ahora : 0

  useEffect(() => { setMensajes(initialMessages) }, [initialMessages])

  // Sala del equipo: el servidor comprueba que el usuario es miembro (o admin)
  useEffect(() => {
    const s = getSocket()
    const unirse = () => s.emit('equipo:join', { equipoId })
    const onMensaje = (m: MensajeEquipo) => {
      setMensajes(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m].slice(-100))
    }
    const onBorrado = ({ id }: { id: string }) => setMensajes(prev => prev.filter(m => m.id !== id))

    unirse()
    s.on('connect', unirse) // al reconectar hay que volver a entrar en la sala
    s.on('equipo:message', onMensaje)
    s.on('equipo:message-deleted', onBorrado)
    return () => {
      s.emit('equipo:leave', { equipoId })
      s.off('connect', unirse)
      s.off('equipo:message', onMensaje)
      s.off('equipo:message-deleted', onBorrado)
    }
  }, [equipoId])

  useEffect(() => {
    const el = listaRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [mensajes])

  useEffect(() => {
    if (!bloqueadoHasta) return
    const t = setInterval(() => {
      const n = Date.now()
      setAhora(n)
      if (n >= bloqueadoHasta) { setBloqueadoHasta(null); clearInterval(t) }
    }, 1000)
    return () => clearInterval(t)
  }, [bloqueadoHasta])

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!texto.trim() || sending || restante > 0) return
    setSending(true)
    try {
      const res = await fetch(`/api/equipos/${equipoId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contenido: texto.trim() }),
      })
      const data = await res.json()
      if (res.status === 429 && data.bloqueadoHasta) {
        setAhora(Date.now())
        setBloqueadoHasta(new Date(data.bloqueadoHasta).getTime())
        return
      }
      if (!res.ok) { toast.error(data.error || 'Error'); return }
      setMensajes(prev => prev.some(m => m.id === data.mensaje.id) ? prev : [...prev, data.mensaje].slice(-100))
      setTexto('')
      if (data.bloqueadoHasta) {
        setAhora(Date.now())
        setBloqueadoHasta(new Date(data.bloqueadoHasta).getTime())
        toast.error('Demasiados mensajes seguidos: chat bloqueado 5 minutos')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setSending(false)
    }
  }

  async function borrar(id: string) {
    const res = await fetch(`/api/admin/equipos/${equipoId}/chat/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setMensajes(prev => prev.filter(m => m.id !== id))
      toast.success('Mensaje eliminado')
    } else toast.error('No se pudo eliminar')
  }

  return (
    <div className={cn('flex flex-col bg-apex-card border border-apex-border rounded-xl overflow-hidden', className)}>
      <div className="px-4 py-3 border-b border-apex-border flex items-center gap-2" style={{ borderTop: `3px solid ${color}` }}>
        <span className="w-2 h-2 rounded-full" style={{ background: color }} />
        <span className="font-semibold text-sm">Chat del equipo</span>
        <span className="text-xs text-apex-muted ml-auto">Últimos 100 mensajes</span>
      </div>

      <div ref={listaRef} className="flex-1 overflow-y-auto p-4 space-y-1 min-h-[260px]">
        {mensajes.length === 0 && (
          <div className="text-center text-apex-muted text-sm mt-8">Aún no hay mensajes. ¡Saluda a tu equipo!</div>
        )}
        {mensajes.map((m, i) => {
          const prev = mensajes[i - 1]
          const mismo = prev && prev.userId === m.userId &&
            new Date(m.creadoEn).getTime() - new Date(prev.creadoEn).getTime() < 300000
          const propio = m.userId === currentUserId
          return (
            <div key={m.id} className={cn('group flex gap-3', mismo ? 'mt-0.5' : 'mt-3')}>
              <div className="w-8 flex-shrink-0">{!mismo && <Avatar username={m.user.username} avatar={m.user.avatar} size={32} />}</div>
              <div className="flex-1 min-w-0">
                {!mismo && (
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold" style={propio ? { color } : undefined}>{m.user.username}</span>
                    {m.userId === liderId && (
                      <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full border"
                        style={{ color, borderColor: `${color}66`, background: `${color}22` }}>
                        <Crown size={10} />Líder
                      </span>
                    )}
                    {m.user.role === 'ADMIN' && (
                      <span className="flex items-center gap-0.5 text-[10px] bg-apex-red/20 text-apex-red px-1.5 py-0.5 rounded-full">
                        <Shield size={10} />ADMIN
                      </span>
                    )}
                    <span className="text-xs text-apex-muted">{formatTimeAgo(m.creadoEn)}</span>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <p className="text-sm text-apex-text/90 leading-relaxed break-words">{m.contenido}</p>
                  {moderador && (
                    <button onClick={() => borrar(m.id)} title="Eliminar mensaje"
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-apex-muted hover:text-red-400 transition-all flex-shrink-0 mt-0.5">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="p-3 border-t border-apex-border">
        {!puedeEscribir ? (
          <div className="text-center text-apex-muted text-sm py-2">
            {moderador ? 'Vista de moderación (solo lectura)' : 'Solo los miembros del equipo pueden escribir'}
          </div>
        ) : restante > 0 ? (
          <div role="status" className="flex items-center justify-center gap-2 text-sm py-2 px-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg">
            <Ban size={15} className="flex-shrink-0" />
            <span>Demasiados mensajes seguidos. Podrás escribir en <span className="font-mono font-bold tabular-nums">{formatCuentaAtras(restante)}</span></span>
          </div>
        ) : (
          <form onSubmit={enviar} className="flex gap-2">
            <input value={texto} onChange={e => setTexto(e.target.value)} maxLength={500}
              placeholder="Escribe a tu equipo..." aria-label="Mensaje para el equipo"
              className="flex-1 bg-apex-surface border border-apex-border rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors"
              style={{ borderColor: undefined }}
              onFocus={e => (e.currentTarget.style.borderColor = color)}
              onBlur={e => (e.currentTarget.style.borderColor = '')} />
            <button type="submit" disabled={!texto.trim() || sending} aria-label="Enviar"
              className="px-4 py-2 text-white rounded-lg transition-opacity disabled:opacity-50 hover:opacity-90"
              style={{ background: color }}>
              <Send size={16} />
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
