'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { Bell, LogOut, Settings, User } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { formatTimeAgo } from '@/lib/utils'

interface Notificacion {
  id: string
  tipo: string
  mensaje: string
  leida: boolean
  creadoEn: string
  link?: string
}

const TIPO_ICONS: Record<string, string> = {
  CARRERA_PROXIMA: '⏰',
  RESULTADO_PUBLICADO: '🏁',
  INSCRIPCION_CONFIRMADA: '✅',
  NUEVA_CARRERA: '📅',
  NUEVO_CAMPEONATO: '🏆',
}

export function Header() {
  const { data: session } = useSession()
  const [notifs, setNotifs] = useState<Notificacion[]>([])
  const [showNotifs, setShowNotifs] = useState(false)
  const [showUser, setShowUser] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

  const noLeidas = notifs.filter(n => !n.leida).length

  useEffect(() => {
    if (!session?.user) return
    fetchNotifs()
    const interval = setInterval(fetchNotifs, 30000)
    return () => clearInterval(interval)
  }, [session])

  async function fetchNotifs() {
    try {
      const res = await fetch('/api/notificaciones?limit=10')
      if (res.ok) setNotifs(await res.json())
    } catch {}
  }

  async function marcarLeida(id: string) {
    await fetch(`/api/notificaciones/${id}`, { method: 'PATCH' })
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n))
  }

  async function marcarTodasLeidas() {
    await fetch('/api/notificaciones', { method: 'PATCH' })
    setNotifs(prev => prev.map(n => ({ ...n, leida: true })))
  }

  // Click outside
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false)
      if (userRef.current && !userRef.current.contains(e.target as Node)) setShowUser(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  return (
    <header
      className="fixed right-0 left-0 lg:left-56 z-20 h-14 bg-apex-surface/80 backdrop-blur-md border-b border-apex-border flex items-center justify-between px-4 lg:px-6"
      style={{ top: 'var(--topbar-height, 0px)' }}
    >
      {/* Left: breadcrumb / title area */}
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-apex-red rounded-full animate-pulse" />
        <span className="text-apex-muted text-sm hidden sm:block">En vivo</span>
      </div>

      {/* Right: notifications + user */}
      <div className="flex items-center gap-2">
        {session?.user && (
          <>
            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => { setShowNotifs(!showNotifs); setShowUser(false) }}
                className="relative w-9 h-9 rounded-lg flex items-center justify-center text-apex-muted hover:text-apex-text hover:bg-apex-card transition-colors"
              >
                <Bell size={18} />
                {noLeidas > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-apex-red text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {noLeidas > 9 ? '9+' : noLeidas}
                  </span>
                )}
              </button>

              {showNotifs && (
                <div className="absolute right-0 top-11 w-80 bg-apex-card border border-apex-border rounded-xl shadow-2xl overflow-hidden animate-fade-in">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-apex-border">
                    <span className="font-semibold text-sm">Notificaciones</span>
                    {noLeidas > 0 && (
                      <button onClick={marcarTodasLeidas} className="text-xs text-apex-red hover:underline">
                        Marcar todas leídas
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifs.length === 0 ? (
                      <div className="px-4 py-8 text-center text-apex-muted text-sm">
                        No tienes notificaciones
                      </div>
                    ) : (
                      notifs.map(n => (
                        <div
                          key={n.id}
                          onClick={() => marcarLeida(n.id)}
                          className={`flex gap-3 px-4 py-3 border-b border-apex-border/50 cursor-pointer hover:bg-apex-surface/50 transition-colors ${!n.leida ? 'bg-apex-red/5' : ''}`}
                        >
                          <span className="text-lg flex-shrink-0">{TIPO_ICONS[n.tipo] || '🔔'}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-apex-text line-clamp-2">{n.mensaje}</p>
                            <p className="text-xs text-apex-muted mt-1">{formatTimeAgo(n.creadoEn)}</p>
                          </div>
                          {!n.leida && (
                            <div className="w-2 h-2 bg-apex-red rounded-full flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User menu */}
            <div className="relative" ref={userRef}>
              <button
                onClick={() => { setShowUser(!showUser); setShowNotifs(false) }}
                className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-apex-card transition-colors"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden bg-apex-card flex-shrink-0">
                  {session.user.image ? (
                    <img src={session.user.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-apex-red flex items-center justify-center text-white text-xs font-bold">
                      {(session.user.username || session.user.name || 'U').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="text-sm font-medium hidden sm:block">
                  {session.user.username || session.user.name}
                </span>
              </button>

              {showUser && (
                <div className="absolute right-0 top-11 w-44 bg-apex-card border border-apex-border rounded-xl shadow-2xl overflow-hidden animate-fade-in">
                  <Link
                    href="/perfil"
                    onClick={() => setShowUser(false)}
                    className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-apex-surface transition-colors"
                  >
                    <User size={15} />Mi Perfil
                  </Link>
                  {session.user.role === 'ADMIN' && (
                    <Link
                      href="/admin"
                      onClick={() => setShowUser(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-apex-surface transition-colors text-apex-red"
                    >
                      <Settings size={15} />Panel Admin
                    </Link>
                  )}
                  <div className="border-t border-apex-border" />
                  <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-apex-surface transition-colors text-red-400"
                  >
                    <LogOut size={15} />Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  )
}
