import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { colorValido, urlOpcional } from '@/lib/equipos'

// Crear/actualizar la skin de un equipo para un coche. Body: { cocheEquipoId, equipoId, imagenSkin?, colorPrimario? }
// Sin imagen ni color se borra la skin y el equipo vuelve a usar su color.
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { cocheEquipoId, equipoId, imagenSkin, colorPrimario } = await req.json()
  if (!cocheEquipoId || !equipoId) return NextResponse.json({ error: 'Faltan coche o equipo' }, { status: 400 })

  const imagen = urlOpcional(imagenSkin)
  if (!imagen.ok) return NextResponse.json({ error: 'La skin debe ser una URL http(s)' }, { status: 400 })
  const color = colorPrimario ? (colorValido(colorPrimario) ? colorPrimario : undefined) : null
  if (color === undefined) return NextResponse.json({ error: 'Color inválido (formato #RRGGBB)' }, { status: 400 })

  const where = { cocheEquipoId_equipoId: { cocheEquipoId, equipoId } }
  if (!imagen.valor && !color) {
    await prisma.skinEquipo.deleteMany({ where: { cocheEquipoId, equipoId } })
    return NextResponse.json({ ok: true, eliminada: true })
  }

  const skin = await prisma.skinEquipo.upsert({
    where,
    update: { imagenSkin: imagen.valor, colorPrimario: color },
    create: { cocheEquipoId, equipoId, imagenSkin: imagen.valor, colorPrimario: color },
  })
  return NextResponse.json(skin)
}
