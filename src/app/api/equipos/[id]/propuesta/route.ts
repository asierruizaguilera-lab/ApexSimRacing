import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { esUltimoMesDeTemporada, getTemporadaActiva } from '@/lib/temporadas'

// Propuesta del equipo al admin: solo el líder, solo en el último mes de la temporada, una por temporada
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const equipo = await prisma.equipo.findUnique({ where: { id: params.id } })
  if (!equipo || !equipo.activo) return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 })
  if (equipo.liderId !== session.user.id) return NextResponse.json({ error: 'Solo el líder puede enviar propuestas' }, { status: 403 })

  const temporada = await getTemporadaActiva()
  if (!temporada) return NextResponse.json({ error: 'No hay ninguna temporada activa' }, { status: 400 })
  if (!esUltimoMesDeTemporada(temporada)) {
    return NextResponse.json({ error: 'Las propuestas solo se pueden enviar durante el último mes de la temporada' }, { status: 400 })
  }

  const { titulo, descripcion } = await req.json()
  const t = typeof titulo === 'string' ? titulo.trim() : ''
  const d = typeof descripcion === 'string' ? descripcion.trim() : ''
  if (t.length < 3 || t.length > 100) return NextResponse.json({ error: 'El título debe tener entre 3 y 100 caracteres' }, { status: 400 })
  if (d.length < 10 || d.length > 2000) return NextResponse.json({ error: 'La descripción debe tener entre 10 y 2000 caracteres' }, { status: 400 })

  try {
    const propuesta = await prisma.propuestaEquipo.create({
      data: { equipoId: equipo.id, liderId: session.user.id, temporadaId: temporada.id, titulo: t, descripcion: d },
    })
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } })
    if (admins.length > 0) {
      await prisma.notificacion.createMany({
        data: admins.map(a => ({
          userId: a.id, tipo: 'EQUIPO' as const, mensaje: `Nueva propuesta de ${equipo.nombre}: ${t}`, link: '/admin/propuestas',
        })),
      })
    }
    return NextResponse.json(propuesta, { status: 201 })
  } catch (e: any) {
    if (e?.code === 'P2002') return NextResponse.json({ error: 'Tu equipo ya envió su propuesta esta temporada' }, { status: 409 })
    throw e
  }
}
