import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { cerrarVentanaFounder } from '@/lib/iniciacion'
import { registrarAccionAdmin } from '@/lib/actividad'
import { validarBody, z } from '@/lib/validacion'

const Esquema = z.object({ accion: z.literal('CERRAR_VENTANA') })

// Cierre manual (emergencia) de la ventana Founder de un campeonato de iniciación. Body: { accion: 'CERRAR_VENTANA' }
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const v = await validarBody(req, Esquema)
  if (!v.ok) return v.res
  const { accion } = v.data

  const camp = await prisma.campeonato.findUnique({ where: { id: params.id }, select: { esIniciacion: true, nombre: true } })
  if (!camp?.esIniciacion) return NextResponse.json({ error: 'No es un campeonato de iniciación' }, { status: 404 })

  const cerrada = await cerrarVentanaFounder(params.id)
  if (!cerrada) return NextResponse.json({ error: 'La ventana ya estaba cerrada' }, { status: 400 })

  await registrarAccionAdmin({
    data: { adminId: session.user.id, targetUserId: session.user.id, accion: 'CERRAR_VENTANA_FOUNDER', detalle: camp.nombre },
  })
  return NextResponse.json({ ok: true })
}
