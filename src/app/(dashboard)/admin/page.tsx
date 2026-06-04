import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Users, Trophy, Calendar, MessageSquare, Plus, ChevronRight } from 'lucide-react'
import { formatFecha, DISCIPLINA_LABELS, DISCIPLINA_COLORS, cn } from '@/lib/utils'

export const metadata = { title: 'Panel Admin' }

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') redirect('/dashboard')

  const [totalUsuarios, campeonatosActivos, carrerasEsteMes, totalMensajes, ultimosRegistros, campeonatos] = await Promise.all([
    prisma.user.count({ where: { role: 'PILOTO' } }),
    prisma.campeonato.count({ where: { estado: 'ACTIVO' } }),
    prisma.carrera.count({
      where: {
        fecha: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
        },
      },
    }),
    prisma.mensajeChat.count({ where: { eliminado: false } }),
    prisma.user.findMany({
      where: { role: 'PILOTO' },
      orderBy: { fechaRegistro: 'desc' },
      take: 5,
      select: { id: true, username: true, pais: true, fechaRegistro: true },
    }),
    prisma.campeonato.findMany({
      orderBy: { creadoEn: 'desc' },
      include: {
        _count: { select: { inscripciones: true, carreras: true } },
      },
    }),
  ])

  const stats = [
    { label: 'Total Pilotos', value: totalUsuarios, icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Campeonatos Activos', value: campeonatosActivos, icon: Trophy, color: 'text-apex-red', bg: 'bg-apex-red/10' },
    { label: 'Carreras este Mes', value: carrerasEsteMes, icon: Calendar, color: 'text-green-400', bg: 'bg-green-400/10' },
    { label: 'Mensajes en Chat', value: totalMensajes, icon: MessageSquare, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Panel de Administración</h1>
          <p className="text-apex-muted mt-1">Gestiona la plataforma APEX</p>
        </div>
        <Link href="/admin/campeonatos/nuevo"
          className="flex items-center gap-2 px-4 py-2 bg-apex-red hover:bg-apex-red-dark text-white rounded-xl font-medium transition-colors">
          <Plus size={18} />Nuevo Campeonato
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-apex-card border border-apex-border rounded-xl p-5">
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-3', s.bg)}>
              <s.icon size={20} className={s.color} />
            </div>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-apex-muted text-sm mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Gestión Campeonatos */}
        <div className="bg-apex-card border border-apex-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-apex-border">
            <h2 className="font-semibold">Campeonatos</h2>
            <Link href="/admin/campeonatos/nuevo" className="text-xs text-apex-red hover:underline flex items-center gap-1">
              <Plus size={12} />Nuevo
            </Link>
          </div>
          <div className="divide-y divide-apex-border/50">
            {campeonatos.map(c => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{c.nombre}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={cn('text-xs px-1.5 py-0.5 rounded-full border', DISCIPLINA_COLORS[c.disciplina])}>
                      {DISCIPLINA_LABELS[c.disciplina]}
                    </span>
                    <span className="text-xs text-apex-muted">{c._count.inscripciones} pilotos · {c._count.carreras} carreras</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full border', {
                    'bg-green-500/20 text-green-400 border-green-500/30': c.estado === 'ACTIVO',
                    'bg-blue-500/20 text-blue-400 border-blue-500/30': c.estado === 'PROXIMO',
                    'bg-gray-500/20 text-gray-400 border-gray-500/30': c.estado === 'FINALIZADO',
                  })}>
                    {c.estado === 'ACTIVO' ? 'Activo' : c.estado === 'PROXIMO' ? 'Próximo' : 'Finalizado'}
                  </span>
                  <Link href={`/admin/campeonatos/${c.id}`} className="text-apex-muted hover:text-apex-text transition-colors">
                    <ChevronRight size={16} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Últimos registros */}
        <div className="bg-apex-card border border-apex-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-apex-border">
            <h2 className="font-semibold">Últimos Registros</h2>
          </div>
          <div className="divide-y divide-apex-border/50">
            {ultimosRegistros.map(u => (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-apex-red flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {u.username.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{u.username}</div>
                  <div className="text-xs text-apex-muted">{u.pais} · {formatFecha(u.fechaRegistro)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { href: '/admin/campeonatos/nuevo', label: 'Crear Campeonato', desc: 'Nuevo campeonato de SimRacing', icon: '🏆' },
          { href: '/admin/inscripciones', label: 'Gestionar Inscripciones', desc: 'Confirmar o cancelar inscripciones pendientes', icon: '📋' },
          { href: '/chat', label: 'Moderar Chat', desc: 'Ir al chat de comunidad', icon: '💬' },
        ].map(a => (
          <Link key={a.href} href={a.href}
            className="bg-apex-card border border-apex-border rounded-xl p-5 hover:border-apex-red/30 transition-all group">
            <div className="text-3xl mb-3">{a.icon}</div>
            <div className="font-semibold group-hover:text-apex-red transition-colors">{a.label}</div>
            <div className="text-sm text-apex-muted mt-1">{a.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
