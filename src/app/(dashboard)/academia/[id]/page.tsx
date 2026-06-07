import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getEmbedUrl, getThumbnailUrl } from '@/lib/youtube'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { cn, DISCIPLINA_LABELS } from '@/lib/utils'
import { ChevronRight, Clock, Eye } from 'lucide-react'

export const dynamic = 'force-dynamic'

const BADGE_COLORS: Record<string, string> = {
  RALLY: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  CIRCUITO: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  DRIFT: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  KARTCROSS: 'bg-green-500/20 text-green-400 border-green-500/30',
  MONOPLAZA: 'bg-red-500/20 text-red-400 border-red-500/30',
}

export default async function ClasePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)

  const clase = await prisma.clase.findUnique({
    where: { id: params.id, publicada: true },
    include: { _count: { select: { vistas: true } } },
  })
  if (!clase) notFound()

  // Registrar vista automáticamente
  if (session?.user?.id) {
    await prisma.claseVista.upsert({
      where: { userId_claseId: { userId: session.user.id, claseId: clase.id } },
      update: {},
      create: { userId: session.user.id, claseId: clase.id },
    })
  }

  // Más clases de la misma disciplina
  const masClases = await prisma.clase.findMany({
    where: { publicada: true, disciplina: clase.disciplina, id: { not: clase.id } },
    orderBy: [{ orden: 'asc' }, { creadoEn: 'asc' }],
    take: 4,
    include: {
      _count: { select: { vistas: true } },
      vistas: session?.user?.id
        ? { where: { userId: session.user.id }, select: { id: true } }
        : undefined,
    },
  })

  const embedUrl = getEmbedUrl(clase.youtubeUrl)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-xs text-apex-muted">
        <Link href="/academia" className="hover:text-apex-text transition-colors">Academia</Link>
        <ChevronRight size={12} />
        <span className="text-apex-muted">{DISCIPLINA_LABELS[clase.disciplina as string]}</span>
        <ChevronRight size={12} />
        <span className="text-apex-text truncate max-w-[200px]">{clase.titulo}</span>
      </nav>

      {/* Player */}
      <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
        <iframe
          src={embedUrl}
          title={clase.titulo}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>

      {/* Info */}
      <div className="bg-apex-card border border-apex-border rounded-xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className={cn('text-xs px-2 py-0.5 rounded-full border', BADGE_COLORS[clase.disciplina as string])}>
              {DISCIPLINA_LABELS[clase.disciplina as string]}
            </span>
            {clase.duracionMin && (
              <span className="flex items-center gap-1 text-xs text-apex-muted">
                <Clock size={12} />{clase.duracionMin} min
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-apex-muted">
              <Eye size={12} />{clase._count.vistas + 1} vistas
            </span>
          </div>
          <div className="flex items-center gap-1 bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1 rounded-full text-xs font-medium">
            ✓ Vista
          </div>
        </div>
        <h1 className="text-xl font-bold mb-2">{clase.titulo}</h1>
        {clase.descripcion && (
          <p className="text-apex-muted text-sm leading-relaxed">{clase.descripcion}</p>
        )}
      </div>

      {/* Más clases */}
      {masClases.length > 0 && (
        <div>
          <h2 className="font-semibold mb-3 text-sm text-apex-muted uppercase tracking-wider">
            Más clases de {DISCIPLINA_LABELS[clase.disciplina as string]}
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {masClases.map(c => (
              <Link key={c.id} href={`/academia/${c.id}`} className="group flex gap-3 bg-apex-card border border-apex-border rounded-xl p-3 hover:border-apex-red/40 transition-all">
                <div className="relative w-24 aspect-video bg-apex-surface rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={getThumbnailUrl(c.youtubeUrl)}
                    alt={c.titulo}
                    className="w-full h-full object-cover"
                  />
                  {(c.vistas?.length ?? 0) > 0 && (
                    <div className="absolute top-1 right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-[8px] font-bold">✓</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug group-hover:text-apex-red transition-colors line-clamp-2">{c.titulo}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {c.duracionMin && <span className="text-xs text-apex-muted">{c.duracionMin} min</span>}
                    <span className="text-xs text-apex-muted">{c._count.vistas} vistas</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
