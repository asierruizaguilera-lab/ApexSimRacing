'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Trophy, Calendar, MessageSquare,
  User, Shield, TrendingUp, Menu, X, Star, Car, Users, GraduationCap,
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Inicio' },
  { href: '/campeonatos', icon: Trophy, label: 'Campeonatos' },
  { href: '/academia', icon: GraduationCap, label: 'Academia' },
  { href: '/ranking', icon: TrendingUp, label: 'Ranking' },
  { href: '/calendario', icon: Calendar, label: 'Calendario' },
  { href: '/planes', icon: Star, label: 'Planes' },
  { href: '/mi-garaje', icon: Car, label: 'Mi Garaje' },
  { href: '/chat', icon: MessageSquare, label: 'Chat' },
  { href: '/perfil', icon: User, label: 'Mi Perfil' },
]

const adminItems = [
  { href: '/admin', icon: Shield, label: 'Panel Admin' },
  { href: '/admin/usuarios', icon: Users, label: 'Usuarios' },
  { href: '/admin/academia', icon: GraduationCap, label: 'Academia' },
  { href: '/admin/coches', icon: Car, label: 'Coches' },
  { href: '/admin/suscriptores', icon: Star, label: 'Suscriptores' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [mobileOpen, setMobileOpen] = useState(false)
  const isAdmin = session?.user?.role === 'ADMIN'

  const NavLink = ({ href, icon: Icon, label }: { href: string; icon: any; label: string }) => {
    const active = pathname === href || pathname.startsWith(href + '/')
    return (
      <Link
        href={href}
        onClick={() => setMobileOpen(false)}
        className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
          active
            ? 'bg-apex-red text-white shadow-lg shadow-apex-red/20'
            : 'text-apex-muted hover:text-apex-text hover:bg-apex-card'
        )}
      >
        <Icon size={18} />
        <span>{label}</span>
        {active && (
          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />
        )}
      </Link>
    )
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-3 py-4 border-b border-apex-border flex justify-center">
        <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
          <img
            src="/logo-apex-a.jpg"
            alt="APEX SimRacing"
            className="w-12 h-12 rounded-lg object-cover"
          />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(item => <NavLink key={item.href} {...item} />)}

        {isAdmin && (
          <>
            <div className="pt-4 pb-2 px-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-apex-muted">
                Administración
              </span>
            </div>
            {adminItems.map(item => <NavLink key={item.href} {...item} />)}
          </>
        )}
      </nav>

      {/* User info bottom */}
      {session?.user && (
        <div className="p-3 border-t border-apex-border">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-apex-card flex-shrink-0">
              {session.user.image ? (
                <img src={session.user.image} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-apex-red flex items-center justify-center text-white text-xs font-bold">
                  {(session.user.name || 'U').slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-apex-text truncate">
                {session.user.username || session.user.name}
              </div>
              <div className={cn(
                'text-xs',
                isAdmin ? 'text-apex-red' : 'text-apex-muted'
              )}>
                {isAdmin ? 'Administrador' : 'Piloto'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-56 bg-apex-surface border-r border-apex-border z-30 flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed bottom-4 left-4 z-50 w-12 h-12 bg-apex-red rounded-full flex items-center justify-center shadow-lg"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={20} className="text-white" /> : <Menu size={20} className="text-white" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside className={cn(
        'lg:hidden fixed left-0 top-0 bottom-0 w-56 bg-apex-surface border-r border-apex-border z-50 flex flex-col transition-transform duration-300',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <SidebarContent />
      </aside>
    </>
  )
}
