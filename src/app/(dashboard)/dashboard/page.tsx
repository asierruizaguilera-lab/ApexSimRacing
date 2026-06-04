import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { HeroBanner } from '@/components/dashboard/HeroBanner'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { formatFechaHora, DISCIPLINA_LABELS, DISCIPLINA_COLORS, cn } from '@/lib/utils'
import Link from 'next/link'
import { Trophy, Users, Flag } from 'lucide-react'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  const [proximaCarrera, campeonatosActivos, top10, recentResults, totalPilotos] = await Promise.all([
    prisma.carrera.findFirst({
      where: { fecha: { gt: new Date() }, estado: 'PROGRAMADA' },
      orderBy: { fecha: 'asc' },
      include: { campeonato: true },
    }),
    prisma.campeonato.findMany({
      where: { estado: 'ACTIVO' },
      include: { _count: { select: { inscripciones: true } } },
      take: 3,
    }),
    prisma.user.findMany({
      where: { role: 'PILOTO', totalPuntos: { gt: 0 } },
      orderBy: { totalPuntos: 'desc' },
      take: 10,
      select: { id: true, username: true, avatar: true, pais: true, totalPuntos: true },
    }),
    prisma.resultado.findMany({
      orderBy: { creadoEn: 'desc' },
      take: 5,
      include: {
        user: { select: { username: true, avatar: true } },
        carrera: { include: { campeonato: { select: { nombre: true, disciplina: true } } } },
      },
    }),
    prisma.user.count({ where: { role: 'PILOTO' } }),
  ])

  return (
    <div className="space-y-6">
      {/* Hero */}
      <HeroBanner proximaCarrera={proximaCarrera ? {
        id: proximaCarrera.id,
        nombre: proximaCarrera.nombre,
        circuito: proximaCarrera.circuito,
        fecha: proximaCarrera.fecha.toISOString(),
        campeonato: { nombre: proximaCarrera.campeonato.nombre, disciplina: proximaCarrera.campeonato.disciplina },
      } : null} />

      {/* Stats rápidas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Pilotos registrados', value: totalPilotos, icon: Users, color: 'text-blue-400' },
          { label: 'Campeonatos activos', value: campeonatosActivos.length, icon: Trophy, color: 'text-apex-red' },
          { label: 'Próxima carrera', value: proximaCarrera ? formatFechaHora(proximaCarrera.fecha).split(',')[0] : 'TBD', icon: Flag, color: 'text-green-400' },
          { label: 'Tu posición', value: session?.user ? '#—' : '—', icon: Trophy, color: 'text-yellow-400' },
        ].map((stat, i) => (
          <div key={i} className="bg-apex-card border border-apex-border rounded-xl p-4">
            <div className={`${stat.color} mb-2`}><stat.icon size={20} /></div>
            <div className="text-xl font-bold">{stat.value}</div>
            <div className="text-apex-muted text-xs mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* TOP 10 Ranking */}
        <div className="lg:col-span-1 bg-apex-card border border-apex-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-apex-border">
            <h2 className="font-semibold flex items-center gap-2">
              <Trophy size={16} className="text-yellow-400" />
              Top 10 Global
            </h2>
            <Link href="/ranking" className="text-xs text-apex-red hover:underline">Ver todo</Link>
          </div>
          <div className="divide-y divide-apex-border/50">
            {top10.map((p, i) => (
              <Link key={p.id} href={`/perfil/${p.id}`}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-apex-surface/50 transition-colors">
                <span className={cn(
                  'w-6 text-center text-sm font-bold',
                  i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-apex-muted'
                )}>
                  {i + 1}
                </span>
                <div className="w-7 h-7 rounded-full bg-apex-red flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {p.username.slice(0, 2).toUpperCase()}
                </div>
                <span className="flex-1 text-sm font-medium truncate">{p.username}</span>
                <span className="text-sm font-bold text-apex-red">{p.totalPuntos}pts</span>
              </Link>
            ))}
            {top10.length === 0 && (
              <div className="px-4 py-8 text-center text-apex-muted text-sm">
                Aún no hay clasificación
              </div>
            )}
          </div>
        </div>

        {/* Feed de actividad */}
        <div className="lg:col-span-2 space-y-4">
          {/* Campeonatos activos */}
          <div className="bg-apex-card border border-apex-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-apex-border">
              <h2 className="font-semibold">Campeonatos Activos</h2>
              <Link href="/campeonatos" className="text-xs text-apex-red hover:underline">Ver todos</Link>
            </div>
            <div className="p-4 space-y-3">
              {campeonatosActivos.length === 0 ? (
                <p className="text-apex-muted text-sm text-center py-4">No hay campeonatos activos</p>
              ) : campeonatosActivos.map(c => (
                <Link key={c.id} href={`/campeonatos/${c.id}`}
                  className="flex items-center gap-3 p-3 bg-apex-surface rounded-lg hover:border-apex-red/30 border border-apex-border transition-all group">
                  <div className="flex-1">
                    <div className="font-medium text-sm group-hover:text-apex-red transition-colors">{c.nombre}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full border', DISCIPLINA_COLORS[c.disciplina])}>
                        {DISCIPLINA_LABELS[c.disciplina]}
                      </span>
                      <span className="text-xs text-apex-muted">{c._count.inscripciones}/{c.maxPilotos} pilotos</span>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">
                    Activo
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Últimos resultados */}
          <ActivityFeed results={recentResults.map(r => ({
            id: r.id,
            posicion: r.posicion,
            puntos: r.puntos,
            creadoEn: r.creadoEn.toISOString(),
            user: r.user,
            carrera: {
              nombre: r.carrera.nombre,
              campeonato: {
                nombre: r.carrera.campeonato.nombre,
                disciplina: r.carrera.campeonato.disciplina,
              },
            },
          }))} />
        </div>
      </div>
    </div>
  )
}
