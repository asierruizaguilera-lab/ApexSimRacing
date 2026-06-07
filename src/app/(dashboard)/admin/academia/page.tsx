import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { AdminAcademiaClient } from '@/components/admin/AdminAcademiaClient'
import { GraduationCap } from 'lucide-react'

export const metadata = { title: 'Admin — Academia' }

export default async function AdminAcademiaPage() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') redirect('/dashboard')

  const inicioSemana = new Date()
  inicioSemana.setDate(inicioSemana.getDate() - 7)

  const [clases, totalVistaSemana, claseMasVista] = await Promise.all([
    prisma.clase.findMany({
      orderBy: [{ disciplina: 'asc' }, { orden: 'asc' }, { creadoEn: 'asc' }],
      include: { _count: { select: { vistas: true } } },
    }),
    prisma.claseVista.count({ where: { vistoCEn: { gte: inicioSemana } } }),
    prisma.clase.findFirst({
      where: { publicada: true },
      orderBy: { vistas: { _count: 'desc' } },
      include: { _count: { select: { vistas: true } } },
    }),
  ])

  const stats = {
    totalPublicadas: clases.filter(c => c.publicada).length,
    totalBorradores: clases.filter(c => !c.publicada).length,
    vistaSemana: totalVistaSemana,
    claseMasVista: claseMasVista ? { titulo: claseMasVista.titulo, vistas: claseMasVista._count.vistas } : null,
  }

  const clasesSerializadas = clases.map(c => ({
    ...c,
    creadoEn: c.creadoEn.toISOString(),
    actualizadoEn: c.actualizadoEn.toISOString(),
    disciplina: c.disciplina as string,
    totalVistas: c._count.vistas,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-apex-card border border-apex-border rounded-xl flex items-center justify-center">
          <GraduationCap size={20} className="text-apex-red" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Academia</h1>
          <p className="text-apex-muted text-sm">Gestión de clases en vídeo</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Publicadas', value: stats.totalPublicadas, color: 'text-green-400', bg: 'bg-green-400/10' },
          { label: 'Borradores', value: stats.totalBorradores, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
          { label: 'Vistas esta semana', value: stats.vistaSemana, color: 'text-blue-400', bg: 'bg-blue-400/10' },
          { label: 'Clase más vista', value: stats.claseMasVista?.vistas ?? 0, color: 'text-apex-red', bg: 'bg-apex-red/10' },
        ].map(s => (
          <div key={s.label} className="bg-apex-card border border-apex-border rounded-xl p-5">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${s.bg}`}>
              <GraduationCap size={20} className={s.color} />
            </div>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-apex-muted text-sm mt-0.5">{s.label}</div>
            {s.label === 'Clase más vista' && stats.claseMasVista && (
              <div className="text-xs text-apex-muted mt-0.5 truncate">{stats.claseMasVista.titulo}</div>
            )}
          </div>
        ))}
      </div>

      <AdminAcademiaClient clases={clasesSerializadas} />
    </div>
  )
}
