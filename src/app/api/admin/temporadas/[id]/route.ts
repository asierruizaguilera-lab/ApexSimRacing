import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validarBody, z } from '@/lib/validacion'

const Esquema = z.object({ cocheEquipoId: z.string().max(64).nullable().optional() })

// Asignar (o quitar) el coche de equipo de una temporada. Body: { cocheEquipoId: string | null }
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const v = await validarBody(req, Esquema)
  if (!v.ok) return v.res
  const { cocheEquipoId } = v.data
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
