import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getEmbedUrl } from '@/lib/youtube'
import { getPresentacionEmbedUrl } from '@/lib/presentacion'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Clock, ExternalLink, Eye, ListChecks } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ModuloPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)

  const clase = await prisma.clase.findUnique({
    where: { id: params.id, publicada: true },
    include: { _count: { select: { vistas: true } } },
  })
  // Sin presentación ni vídeo no hay nada que mostrar
  if (!clase || (!clase.linkPresentacion && !clase.youtubeUrl)) notFound()

  // Registrar vista automáticamente
  if (session?.user?.id) {
    await prisma.claseVista.upsert({
      where: { userId_claseId: { userId: session.user.id, claseId: clase.id } },
      update: {},
      create: { userId: session.user.id, claseId: clase.id },
    })
  }

  // Módulo anterior y siguiente en el orden de aprendizaje (solo los que tienen contenido)
  const conContenido = {
    publicada: true,
    numeroModulo: { not: null },
    OR: [{ linkPresentacion: { not: null } }, { youtubeUrl: { not: null } }],
  }
  const [anterior, siguiente] = await Promise.all([
    prisma.clase.findFirst({
      where: { ...conContenido, orden: { lt: clase.orden } },
      orderBy: { orden: 'desc' },
      select: { id: true, numeroModulo: true, titulo: true },
    }),
    prisma.clase.findFirst({
      where: { ...conContenido, orden: { gt: clase.orden } },
      orderBy: { orden: 'asc' },
      select: { id: true, numeroModulo: true, titulo: true },
    }),
  ])

  const duracion = clase.duracionTexto ?? (clase.duracionMin ? `${clase.duracionMin} MIN` : null)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-xs text-apex-muted">
        <Link href="/academia" className="hover:text-apex-text transition-colors">Academia</Link>
        <ChevronRight size={12} />
        <span className="text-apex-text truncate max-w-[240px]">
          {clase.numeroModulo !== null ? `Módulo ${clase.numeroModulo} — ` : ''}{clase.titulo}
        </span>
      </nav>

      {/* Cabecera */}
      <div className="bg-apex-card border border-apex-border rounded-xl p-5 flex items-start gap-4">
        {clase.numeroModulo !== null && (
          <div className="w-16 shrink-0 text-center">
            <span className="block text-[10px] font-semibold tracking-widest text-apex-muted uppercase">Módulo</span>
            <span className="block text-4xl font-black text-apex-red leading-none tabular-nums">{clase.numeroModulo}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold leading-snug">{clase.titulo}</h1>
          {clase.descripcion && (
            <p className="text-apex-muted text-sm leading-relaxed mt-1">{clase.descripcion}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-apex-muted">
            {duracion && <span className="flex items-center gap-1"><Clock size={12} />{duracion}</span>}
            {clase.numeroTecnicas !== null && (
              <span className="flex items-center gap-1">
                <ListChecks size={12} />{clase.numeroTecnicas} {clase.numeroTecnicas === 1 ? 'técnica' : 'técnicas'}
              </span>
            )}
            <span className="flex items-center gap-1"><Eye size={12} />{clase._count.vistas + 1} vistas</span>
          </div>
        </div>
      </div>

      {/* Presentación embebida */}
      {clase.linkPresentacion && (
        <div className="space-y-2">
          <div className="relative w-full aspect-video bg-apex-bg rounded-xl overflow-hidden shadow-2xl">
            <iframe
              src={getPresentacionEmbedUrl(clase.linkPresentacion)}
              title={`Presentación — ${clase.titulo}`}
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          </div>
          <div className="flex justify-end">
            <a
              href={clase.linkPresentacion}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-apex-card border border-apex-border hover:border-apex-red/40 text-apex-text text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <ExternalLink size={14} /> Ver en Google Slides
            </a>
          </div>
        </div>
      )}

      {/* Vídeo */}
      {clase.youtubeUrl && (
        <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
          <iframe
            src={getEmbedUrl(clase.youtubeUrl)}
            title={clase.titulo}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>
      )}

      {/* Navegación entre módulos */}
      {(anterior || siguiente) && (
        <div className="grid sm:grid-cols-2 gap-3">
          {anterior ? (
            <Link href={`/academia/${anterior.id}`} className="group bg-apex-card border border-apex-border rounded-xl p-4 hover:border-apex-red/40 transition-colors">
              <span className="flex items-center gap-1 text-xs text-apex-muted"><ChevronLeft size={12} />Anterior</span>
              <span className="block text-sm font-semibold mt-1 group-hover:text-apex-red transition-colors truncate">
                {anterior.numeroModulo} — {anterior.titulo}
              </span>
            </Link>
          ) : <div className="hidden sm:block" />}
          {siguiente && (
            <Link href={`/academia/${siguiente.id}`} className="group bg-apex-card border border-apex-border rounded-xl p-4 text-right hover:border-apex-red/40 transition-colors">
              <span className="flex items-center justify-end gap-1 text-xs text-apex-muted">Siguiente<ChevronRight size={12} /></span>
              <span className="block text-sm font-semibold mt-1 group-hover:text-apex-red transition-colors truncate">
                {siguiente.numeroModulo} — {siguiente.titulo}
              </span>
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
