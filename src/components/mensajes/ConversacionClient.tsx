'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { ChevronLeft, Send, Ban, Shield, Check, CheckCheck } from 'lucide-react'
import { getSocket } from '@/lib/socketClient'
import { formatFechaHora, cn } from '@/lib/utils'
import { Avatar } from '@/components/equipos/EquipoLogo'

interface Mensaje {
  id: string
  remitenteId: string
  destinatarioId: string
  contenido: string
  leido: boolean
  creadoEn: string
}

interface Props {
  yo: string
  otro: { id: string; username: string; avatar: string | null; role: string; baneado: boolean }
  iniciales: Mensaje[]
}

function formatCuentaAtras(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

function etiquetaDia(iso: string) {
  const d = new Date(iso)
  const hoy = new Date()
  const ayer = new Date(); ayer.setDate(hoy.getDate() - 1)
  if (d.toDateString() === hoy.toDateString()) return 'Hoy'
  if (d.toDateString() === ayer.toDateString()) return 'Ayer'
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).format(d)
}

export function ConversacionClient({ yo, otro, iniciales }: Props) {
  const [mensajes, setMensajes] = useState<Mensaje[]>(iniciales)
  const [texto, setTexto] = useState('')
  const [sending, setSending] = useState(false)
  const [bloqueadoHasta, setBloqueadoHasta] = useState<number | null>(null)
  const [ahora, setAhora] = useState(() => Date.now())
  const listaRef = useRef<HTMLDivElement>(null)
  const restante = bloqueadoHasta ? bloqueadoHasta - ahora : 0

  const marcarLeidos = useCallback(async () => {
    try {
      await fetch(`/api/mensajes/${otro.id}/leer`, { method: 'PATCH' })
      window.dispatchEvent(new Event('mensajes:leidos')) // badge de la sidebar en esta pestaña
    } catch {}
  }, [otro.id])

  // Al entrar: todos los mensajes recibidos pasan a leídos
  useEffect(() => { marcarLeidos() }, [marcarLeidos])

  // Canal privado dm:[a]-[b]; el servidor lo calcula con el usuario autenticado
  useEffect(() => {
    const s = getSocket()
    const unirse = () => s.emit('dm:join', { otroUserId: otro.id })
    const onMensaje = (m: Mensaje) => {
      const deEstaConversacion = (m.remitenteId === otro.id && m.destinatarioId === yo) || (m.remitenteId === yo && m.destinatarioId === otro.id)
      if (!deEstaConversacion) return
      setMensajes(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m])
      if (m.remitenteId === otro.id) marcarLeidos()
    }
    const onLeido = ({ lectorId }: { lectorId: string }) => {
      if (lectorId === otro.id) setMensajes(prev => prev.map(m => m.remitenteId === yo ? { ...m, leido: true } : m))
    }
    unirse()
    s.on('connect', unirse)
    s.on('dm:message', onMensaje)
    s.on('dm:read', onLeido)
    return () => {
      s.emit('dm:leave', { otroUserId: otro.id })
      s.off('connect', unirse)
      s.off('dm:message', onMensaje)
      s.off('dm:read', onLeido)
    }
  }, [otro.id, yo, marcarLeidos])

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
      const res = await fetch(`/api/mensajes/${otro.id}`, {
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
      const m: Mensaje = { ...data.mensaje, creadoEn: new Date(data.mensaje.creadoEn).toISOString() }
      setMensajes(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m])
      setTexto('')
      if (data.bloqueadoHasta) {
        setAhora(Date.now())
        setBloqueadoHasta(new Date(data.bloqueadoHasta).getTime())
        toast.error('Demasiados mensajes seguidos: bloqueado 5 minutos')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col bg-apex-card border border-apex-border rounded-xl overflow-hidden max-w-3xl">
      {/* Cabecera */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-apex-border">
        <Link href="/mensajes" aria-label="Volver a la bandeja" className="text-apex-muted hover:text-apex-text transition-colors"><ChevronLeft size={20} /></Link>
        <Link href={`/perfil/${otro.id}`} className="flex items-center gap-3 min-w-0 hover:text-apex-red transition-colors">
          <Avatar username={otro.username} avatar={otro.avatar} size={36} />
          <span className="font-semibold truncate">{otro.username}</span>
        </Link>
        {otro.role === 'ADMIN' && (
          <span className="flex items-center gap-0.5 text-[10px] bg-apex-red/20 text-apex-red px-1.5 py-0.5 rounded-full"><Shield size={10} />ADMIN</span>
        )}
      </div>

      {/* Mensajes */}
      <div ref={listaRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {mensajes.length === 0 && (
          <div className="text-center text-apex-muted text-sm mt-10">Empieza la conversación con {otro.username}</div>
        )}
        {mensajes.map((m, i) => {
          const propio = m.remitenteId === yo
          const nuevoDia = i === 0 || new Date(mensajes[i - 1].creadoEn).toDateString() !== new Date(m.creadoEn).toDateString()
          const agrupado = !nuevoDia && mensajes[i - 1].remitenteId === m.remitenteId
          return (
            <div key={m.id}>
              {nuevoDia && (
                <div className="flex justify-center my-3">
                  <span className="text-[11px] text-apex-muted bg-apex-surface px-2.5 py-0.5 rounded-full">{etiquetaDia(m.creadoEn)}</span>
                </div>
              )}
              <div className={cn('flex', propio ? 'justify-end' : 'justify-start', agrupado ? 'mt-0.5' : 'mt-2')}>
                <div className={cn(
                  'max-w-[78%] px-3 py-2 rounded-2xl text-sm leading-relaxed break-words',
                  propio ? 'bg-apex-red text-white rounded-br-md' : 'bg-apex-surface border border-apex-border rounded-bl-md'
                )} title={formatFechaHora(m.creadoEn)}>
                  <p className="whitespace-pre-wrap">{m.contenido}</p>
                  <div className={cn('flex items-center justify-end gap-1 text-[10px] mt-0.5', propio ? 'text-white/70' : 'text-apex-muted')}>
                    {new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(new Date(m.creadoEn))}
                    {propio && (m.leido ? <CheckCheck size={12} aria-label="Leído" /> : <Check size={12} aria-label="Enviado" />)}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-apex-border">
        {otro.baneado ? (
          <div className="text-center text-apex-muted text-sm py-2">Este usuario no puede recibir mensajes</div>
        ) : restante > 0 ? (
          <div role="status" className="flex items-center justify-center gap-2 text-sm py-2 px-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg">
            <Ban size={15} className="flex-shrink-0" />
            <span>Demasiados mensajes seguidos. Podrás escribir en <span className="font-mono font-bold tabular-nums">{formatCuentaAtras(restante)}</span></span>
          </div>
        ) : (
          <form onSubmit={enviar} className="flex gap-2">
            <input value={texto} onChange={e => setTexto(e.target.value)} maxLength={500} autoFocus
              placeholder={`Mensaje para ${otro.username}...`} aria-label="Mensaje"
              className="flex-1 bg-apex-surface border border-apex-border rounded-lg px-3 py-2 text-sm focus:border-apex-red focus:outline-none transition-colors" />
            <button type="submit" disabled={!texto.trim() || sending} aria-label="Enviar"
              className="px-4 py-2 bg-apex-red hover:bg-apex-red-dark text-white rounded-lg transition-colors disabled:opacity-50">
              <Send size={16} />
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
