import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { MAX_MIEMBROS_EQUIPO } from '@/lib/equipos'

// Invitar a un piloto (solo líder). Body: { username } o { userId }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const equipo = await prisma.equipo.findUnique({
    where: { id: params.id },
    include: { _count: { select: { miembros: true } } },
  })
  if (!equipo || !equipo.activo) return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 })
  if (equipo.liderId !== session.user.id) return NextResponse.json({ error: 'Solo el líder puede invitar pilotos' }, { status: 403 })
  if (equipo._count.miembros >= MAX_MIEMBROS_EQUIPO) {
    return NextResponse.json({ error: `El equipo ya tiene el máximo de ${MAX_MIEMBROS_EQUIPO} pilotos` }, { status: 400 })
  }

  const { username, userId } = await req.json()
  const invitado = await prisma.user.findFirst({
    where: userId ? { id: String(userId) } : { username: { equals: String(username ?? '').trim(), mode: 'insensitive' } },
    select: { id: true, username: true, baneado: true, miembroEquipo: { select: { equipoId: true } } },
  })
  if (!invitado || invitado.baneado) return NextResponse.json({ error: 'Piloto no encontrado' }, { status: 404 })
  if (invitado.id === session.user.id) return NextResponse.json({ error: 'No puedes invitarte a ti mismo' }, { status: 400 })
  if (invitado.miembroEquipo) {
    return NextResponse.json({
      error: invitado.miembroEquipo.equipoId === equipo.id ? 'Ya es miembro de tu equipo' : `${invitado.username} ya pertenece a otro equipo`,
    }, { status: 409 })
  }

  const existente = await prisma.invitacionEquipo.findUnique({
    where: { equipoId_invitadoId: { equipoId: equipo.id, invitadoId: invitado.id } },
  })
  if (existente?.estado === 'PENDIENTE') return NextResponse.json({ error: 'Ya tiene una invitación pendiente' }, { status: 409 })

  const invitacion = await prisma.invitacionEquipo.upsert({
    where: { equipoId_invitadoId: { equipoId: equipo.id, invitadoId: invitado.id } },
    update: { estado: 'PENDIENTE', creadoEn: new Date() },
    create: { equipoId: equipo.id, invitadoId: invitado.id },
  })

  await prisma.notificacion.create({
    data: {
      userId: invitado.id,
      tipo: 'INVITACION_EQUIPO',
      mensaje: `${session.user.username} te ha invitado a unirte a ${equipo.nombre}`,
      link: '/equipos',
    },
  })

  return NextResponse.json(invitacion, { status: 201 })
}
