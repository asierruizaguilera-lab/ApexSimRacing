import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Asignar (o quitar) el coche de equipo de una temporada. Body: { cocheEquipoId: string | null }
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { cocheEquipoId } = await req.json()
  if (cocheEquipoId) {
    const coche = await prisma.cocheEquipo.findUnique({ where: { id: cocheEquipoId } })
    if (!coche) return NextResponse.json({ error: 'Coche de equipo no encontrado' }, { status: 404 })
  }

  const temporada = await prisma.temporada.update({
    where: { id: params.id },
    data: { cocheEquipoId: cocheEquipoId || null },
    include: { cocheEquipo: true },
  })
  return NextResponse.json(temporada)
}
