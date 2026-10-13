import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { setTemporadaGratuitaActiva } from '@/lib/config'

// Activa o desactiva el modo "Temporada gratuita". Body: { activa: boolean }
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { activa } = await req.json().catch(() => ({}))
  if (typeof activa !== 'boolean') return NextResponse.json({ error: 'El campo "activa" debe ser booleano' }, { status: 400 })

  const config = await setTemporadaGratuitaActiva(activa)

  await prisma.logAccionAdmin.create({
    data: {
      adminId: session.user.id,
      targetUserId: session.user.id,
      accion: activa ? 'ACTIVAR_TEMPORADA_GRATUITA' : 'DESACTIVAR_TEMPORADA_GRATUITA',
    },
  })
  return NextResponse.json({ temporadaGratuitaActiva: config.temporadaGratuitaActiva })
}
