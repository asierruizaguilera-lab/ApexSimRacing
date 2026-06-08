import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getThumbnailUrl } from '@/lib/youtube'
import { AcademiaClient } from '@/components/academia/AcademiaClient'
import { GraduationCap } from 'lucide-react'

export const metadata = { title: 'Academia APEX' }

export default async function AcademiaPage() {
  const session = await getServerSession(authOptions)

  const [clases, patrocinadores] = await Promise.all([
    prisma.clase.findMany({
      where: { publicada: true },
      orderBy: [{ disciplina: 'asc' }, { orden: 'asc' }, { creadoEn: 'asc' }],
      include: {
        _count: { select: { vistas: true } },
        vistas: session?.user?.id
          ? { where: { userId: session.user.id }, select: { id: true } }
          : undefined,
      },
    }),
    prisma.patrocinador.findMany({
      where: { activo: true, ubicaciones: { hasSome: ['ACADEMIA', 'TODAS'] } },
      orderBy: [{ orden: 'asc' }, { creadoEn: 'asc' }],
      select: { id: true, nombre: true, descripcion: true, logoUrl: true, linkExterno: true, esColaborador: true },
    }),
  ])

  const clasesSerializadas = clases.map(c => ({
    id: c.id,
    titulo: c.titulo,
    descripcion: c.descripcion,
    disciplina: c.disciplina as string,
    thumbnailUrl: getThumbnailUrl(c.youtubeUrl),
    duracionMin: c.duracionMin,
    totalVistas: c._count.vistas,
    vistaPorMi: (c.vistas?.length ?? 0) > 0,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-apex-red/10 border border-apex-red/30 rounded-xl flex items-center justify-center">
          <GraduationCap size={24} className="text-apex-red" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Academia APEX</h1>
          <p className="text-apex-muted text-sm">Aprende, mejora, compite</p>
        </div>
      </div>

      <AcademiaClient clases={clasesSerializadas} patrocinadores={patrocinadores} />
    </div>
  )
}
