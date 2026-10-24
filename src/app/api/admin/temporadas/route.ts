import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { activarTemporadaActual, asegurarTemporadasAnio, mesYAnio } from '@/lib/temporadas'
import { validarBody, z, numeroFlexible } from '@/lib/validacion'

const Esquema = z.object({
  anio: numeroFlexible.nullable().optional(),
  cocheEquipoId: z.string().max(64).nullable().optional(),
})

// Iniciar temporada: crea las 3 temporadas del año si faltan, activa la del mes actual y le asigna el coche.
// Body: { anio?: number, cocheEquipoId?: string | null }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const v = await validarBody(req, Esquema)
  if (!v.ok) return v.res
  const body = v.data
  const { anio: anioActual } = mesYAnio()
  const anio = body.anio ? Math.trunc(body.anio) : anioActual
  if (anio !== anioActual) {
    return NextResponse.json({ error: `Solo se puede iniciar la temporada del año en curso (${anioActual})` }, { status: 400 })
  }

  const cocheEquipoId: string | null = body.cocheEquipoId || null
  if (cocheEquipoId) {
    const coche = await prisma.cocheEquipo.findUnique({ where: { id: cocheEquipoId } })
    if (!coche || !coche.activo) return NextResponse.json({ error: 'Coche de equipo no encontrado' }, { status: 404 })
  }

  await asegurarTemporadasAnio(anio)
  const temporada = await activarTemporadaActual(cocheEquipoId)

  const io = (global as any).io
  if (io) io.emit('temporada:nueva', { numero: temporada.numero, anio: temporada.anio, ganador: null })

  return NextResponse.json(temporada, { status: 201 })
}
