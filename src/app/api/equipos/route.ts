import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { colorValido, esEliteActivo, COLOR_EQUIPO_DEFECTO } from '@/lib/equipos'
import { etiquetaTemporada, getTemporadaActiva, mesYAnio, rankingEquiposMes } from '@/lib/temporadas'

export const dynamic = 'force-dynamic'

// Lista de equipos activos con el ranking del mes en curso
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { mes, anio } = mesYAnio()
  const [ranking, temporada] = await Promise.all([rankingEquiposMes(mes, anio), getTemporadaActiva()])

  return NextResponse.json({
    mes, anio,
    temporada: temporada ? { ...temporada, etiqueta: etiquetaTemporada(temporada).texto } : null,
    equipos: ranking,
  })
}

// Crear equipo — solo pilotos Elite sin equipo
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const userId = session.user.id

  if (!(await esEliteActivo(userId))) {
    return NextResponse.json({ error: 'Solo los pilotos Elite pueden crear un equipo', code: 'SOLO_ELITE' }, { status: 403 })
  }

  const body = await req.json()
  const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : ''
  const descripcion = typeof body.descripcion === 'string' ? body.descripcion.trim().slice(0, 500) || null : null
  const colorPrimario = colorValido(body.colorPrimario) ? body.colorPrimario : COLOR_EQUIPO_DEFECTO

  if (nombre.length < 3 || nombre.length > 40) {
    return NextResponse.json({ error: 'El nombre debe tener entre 3 y 40 caracteres' }, { status: 400 })
  }

  const [yaMiembro, nombreUsado] = await Promise.all([
    prisma.miembroEquipo.findUnique({ where: { userId } }),
    prisma.equipo.findFirst({ where: { nombre: { equals: nombre, mode: 'insensitive' } } }),
  ])
  if (yaMiembro) return NextResponse.json({ error: 'Ya perteneces a un equipo' }, { status: 409 })
  if (nombreUsado) return NextResponse.json({ error: 'Ya existe un equipo con ese nombre' }, { status: 409 })

  try {
    const equipo = await prisma.equipo.create({
      data: {
        nombre, descripcion, colorPrimario, liderId: userId,
        miembros: { create: { userId, rol: 'LIDER' } },
      },
    })
    // Las invitaciones que tuviera pendientes ya no tienen sentido
    await prisma.invitacionEquipo.updateMany({
      where: { invitadoId: userId, estado: 'PENDIENTE' },
      data: { estado: 'RECHAZADA' },
    })
    return NextResponse.json(equipo, { status: 201 })
  } catch (e: any) {
    // Carrera entre dos peticiones: userId único en miembros o nombre único en equipos
    if (e?.code === 'P2002') return NextResponse.json({ error: 'Nombre en uso o ya perteneces a un equipo' }, { status: 409 })
    throw e
  }
}
