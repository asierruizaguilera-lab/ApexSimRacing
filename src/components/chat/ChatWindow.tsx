'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import toast from 'react-hot-toast'
import { Send, Hash, Users, Shield, Trash2 } from 'lucide-react'
import { formatTimeAgo, cn } from '@/lib/utils'

type Canal = 'GENERAL' | 'RALLY' | 'CIRCUITO' | 'DRIFT' | 'ANUNCIOS'

interface User { id: string; username: string; avatar: string | null; role: string }
interface Mensaje {
  id: string; userId: string; canal: Canal; contenido: string; creadoEn: string; eliminado: boolean; user: User
}

const CANALES: { id: Canal; label: string; icon: string }[] = [
  { id: 'GENERAL', label: 'general', icon: '💬' },
  { id: 'RALLY', label: 'rally', icon: '🪨' },
  { id: 'CIRCUITO', label: 'circuito', icon: '🏎️' },
  { id: 'DRIFT', label: 'drift', icon: '💨' },
  { id: 'ANUNCIOS', label: 'anuncios', icon: '📢' },
]

interface Props {
  initialMessages: Mensaje[]
  currentUser: { id: string; username: string; role: string } | null
}

export function ChatWindow({ initialMessages, currentUser }: Props) {
  const [canal, setCanal] = useState<Canal>('GENERAL')
  const [mensajes, setMensajes] = useState<Mensaje[]>(initialMessages)
  const [texto, setTexto] = useState('')
  const [online, setOnline] = useState(0)
  const [typing, setTyping] = useState('')
  const [socket, setSocket] = useState<Socket | null>(null)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const typingTimer = useRef<NodeJS.Timeout>()
  const isAdmin = currentUser?.role === 'ADMIN'
  const esAnuncios = canal === 'ANUNCIOS'
  const puedeEscribir = currentUser && (!esAnuncios || isAdmin)

  // Conectar socket
  useEffect(() => {
    const s = io({ transports: ['websocket', 'polling'] })
    setSocket(s)

    if (currentUser) {
      s.emit('user:join', { userId: currentUser.id, username: currentUser.username, canal })
    }

    s.on('chat:message', (msg: Mensaje) => {
      setMensajes(prev => {
        if (prev.find(m => m.id === msg.id)) return prev
        return [...prev, msg]
      })
    })

    s.on('users:online', (count: number) => setOnline(count))

    s.on('chat:typing', ({ username }: { username: string }) => {
      setTyping(`${username} está escribiendo...`)
      clearTimeout(typingTimer.current)
      typingTimer.current = setTimeout(() => setTyping(''), 2000)
    })

    return () => { s.disconnect() }
  }, [])

  // Cambiar canal
  function cambiarCanal(newCanal: Canal) {
    if (socket && currentUser) {
      socket.emit('canal:join', { canal: newCanal, prevCanal: canal })
    }
    setCanal(newCanal)
  }

  // Scroll al fondo al recibir mensajes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes, canal])

  const mensajesCanal = mensajes.filter(m => m.canal === canal && !m.eliminado)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!texto.trim() || !currentUser || !puedeEscribir) return
    setSending(true)

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contenido: texto.trim(), canal }),
      })
      const msg = await res.json()
      if (!res.ok) { toast.error(msg.error || 'Error'); return }

      // Emitir por socket para tiempo real
      socket?.emit('chat:message', msg)
      setTexto('')
    } catch {
      toast.error('Error de conexión')
    } finally {
      setSending(false)
    }
  }

  function handleTyping() {
    if (socket && currentUser) {
      socket.emit('chat:typing', { canal, username: currentUser.username })
    }
  }

  async function eliminarMensaje(id: string) {
    const res = await fetch(`/api/chat/messages/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setMensajes(prev => prev.map(m => m.id === id ? { ...m, eliminado: true } : m))
      toast.success('Mensaje eliminado')
    }
  }

  return (
    <div className="flex h-full bg-apex-card border border-apex-border rounded-xl overflow-hidden">
      {/* Sidebar canales */}
      <div className="w-44 flex-shrink-0 bg-apex-surface border-r border-apex-border flex flex-col">
        <div className="px-3 py-3 border-b border-apex-border">
          <div className="text-xs font-semibold uppercase tracking-wider text-apex-muted mb-0.5">Comunidad</div>
          <div className="flex items-center gap-1 text-xs text-green-400">
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
            {online} en línea
          </div>
        </div>
        <div className="flex-1 p-2 space-y-0.5">
          {CANALES.map(c => (
            <button key={c.id} onClick={() => cambiarCanal(c.id)}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-colors text-left',
                canal === c.id ? 'bg-apex-red/20 text-apex-red' : 'text-apex-muted hover:text-apex-text hover:bg-apex-card'
              )}>
              <Hash size={14} />
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header canal */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-apex-border">
          <Hash size={16} className="text-apex-muted" />
          <span className="font-semibold">{CANALES.find(c => c.id === canal)?.label}</span>
          {esAnuncios && (
            <span className="text-xs bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-full">
              Solo admins pueden escribir
            </span>
          )}
        </div>

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {mensajesCanal.length === 0 && (
            <div className="text-center text-apex-muted text-sm mt-8">
              No hay mensajes en este canal. ¡Sé el primero en escribir!
            </div>
          )}
          {mensajesCanal.map((m, i) => {
            const prevMsg = mensajesCanal[i - 1]
            const sameUser = prevMsg && prevMsg.userId === m.userId &&
              (new Date(m.creadoEn).getTime() - new Date(prevMsg.creadoEn).getTime()) < 300000
            const isOwn = currentUser?.id === m.userId

            return (
              <div key={m.id} className={cn('group flex gap-3', sameUser ? 'mt-0.5' : 'mt-3')}>
                {/* Avatar */}
                <div className="w-8 h-8 flex-shrink-0">
                  {!sameUser && (
                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold',
                      m.user.role === 'ADMIN' ? 'bg-apex-red' : 'bg-blue-600')}>
                      {m.user.username.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {!sameUser && (
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={cn('text-sm font-semibold', m.user.role === 'ADMIN' ? 'text-apex-red' : 'text-apex-text')}>
                        {m.user.username}
                      </span>
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
                    {isAdmin && !isOwn && (
                      <button onClick={() => eliminarMensaje(m.id)}
                        className="opacity-0 group-hover:opacity-100 text-apex-muted hover:text-red-400 transition-all flex-shrink-0 mt-0.5">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* Typing indicator */}
        {typing && (
          <div className="px-4 py-1 text-xs text-apex-muted italic">{typing}</div>
        )}

        {/* Input */}
        <div className="p-3 border-t border-apex-border">
          {!currentUser ? (
            <div className="text-center text-apex-muted text-sm py-2">
              <a href="/login" className="text-apex-red hover:underline">Inicia sesión</a> para chatear
            </div>
          ) : !puedeEscribir ? (
            <div className="text-center text-apex-muted text-sm py-2">
              Solo los administradores pueden escribir en #anuncios
            </div>
          ) : (
            <form onSubmit={enviar} className="flex gap-2">
              <input
                type="text"
                value={texto}
                onChange={e => setTexto(e.target.value)}
                onKeyDown={handleTyping}
                placeholder={`Escribe en #${CANALES.find(c => c.id === canal)?.label}...`}
                maxLength={500}
                className="flex-1 bg-apex-surface border border-apex-border rounded-lg px-3 py-2 text-sm focus:border-apex-red focus:outline-none transition-colors"
              />
              <button type="submit" disabled={!texto.trim() || sending}
                className="px-4 py-2 bg-apex-red hover:bg-apex-red-dark text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2">
                <Send size={16} />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
