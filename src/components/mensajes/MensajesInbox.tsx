'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Mail, MessageSquarePlus } from 'lucide-react'
import { getSocket } from '@/lib/socketClient'
import { formatTimeAgo, cn } from '@/lib/utils'
import { Avatar } from '@/components/equipos/EquipoLogo'
import { BuscadorUsuarios } from '@/components/equipos/BuscadorUsuarios'
import type { Conversacion } from '@/lib/mensajes'

export function MensajesInbox({ iniciales }: { iniciales: Conversacion[] }) {
  const [conversaciones, setConversaciones] = useState(iniciales)

  // Mensaje nuevo (o leído en otra pestaña) → recargar la bandeja
  useEffect(() => {
    const s = getSocket()
    const recargar = async () => {
      try {
        const res = await fetch('/api/mensajes')
        if (res.ok) setConversaciones(await res.json())
      } catch {}
    }
    s.on('dm:notify', recargar)
    s.on('dm:leidos', recargar)
    return () => { s.off('dm:notify', recargar); s.off('dm:leidos', recargar) }
  }, [])

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Mail size={22} className="text-apex-red" />Mensajes</h1>
        <p className="text-apex-muted mt-1">Conversaciones privadas con otros pilotos</p>
      </div>

      <div className="bg-apex-card border border-apex-border rounded-xl p-4 mb-6">
        <div className="flex items-center gap-2 text-sm font-semibold mb-3"><MessageSquarePlus size={16} />Nueva conversación</div>
        <BuscadorUsuarios
          placeholder="Buscar piloto por nombre de usuario..."
          renderAccion={u => (
            <Link href={`/mensajes/${u.id}`}
              className="px-2.5 py-1 bg-apex-red hover:bg-apex-red-dark text-white rounded-lg text-xs font-medium transition-colors">
              Escribir
            </Link>
          )}
        />
      </div>

      <div className="bg-apex-card border border-apex-border rounded-xl overflow-hidden">
        {conversaciones.length === 0 ? (
          <div className="py-16 text-center text-apex-muted">
            <Mail size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No tienes conversaciones todavía</p>
          </div>
        ) : (
          <ul className="divide-y divide-apex-border/50">
            {conversaciones.map(c => (
              <li key={c.usuario.id}>
                <Link href={`/mensajes/${c.usuario.id}`}
                  className={cn('flex items-center gap-3 px-4 py-3 hover:bg-apex-surface/50 transition-colors', c.noLeidos > 0 && 'bg-apex-red/5')}>
                  <Avatar username={c.usuario.username} avatar={c.usuario.avatar} size={42} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn('truncate', c.noLeidos > 0 ? 'font-bold' : 'font-medium')}>{c.usuario.username}</span>
                      <span className="text-xs text-apex-muted flex-shrink-0">{formatTimeAgo(c.ultimoMensaje.creadoEn)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn('text-sm truncate', c.noLeidos > 0 ? 'text-apex-text' : 'text-apex-muted')}>
                        {c.ultimoMensaje.esMio && <span className="text-apex-muted">Tú: </span>}{c.ultimoMensaje.contenido}
                      </p>
                      {c.noLeidos > 0 && (
                        <span className="min-w-[20px] h-5 px-1.5 bg-apex-red text-white text-[11px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
                          {c.noLeidos > 9 ? '9+' : c.noLeidos}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
