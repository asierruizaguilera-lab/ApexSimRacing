import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import bcrypt from 'bcryptjs'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { eliminarCuenta } from '@/lib/rgpd'
import { datosCliente, logActividad } from '@/lib/actividad'
import { validarBody, z } from '@/lib/validacion'
import { consumir, respuesta429 } from '@/lib/rateLimit'

const Esquema = z.object({
  password: z.string().max(200).optional(),
  confirmacion: z.literal('ELIMINAR', { errorMap: () => ({ message: 'Escribe ELIMINAR para confirmar' }) }),
})

// Eliminar la cuenta propia (derecho de supresión). Pide la contraseña actual y la palabra ELIMINAR.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (session.user.role === 'ADMIN') {
    return NextResponse.json({ error: 'Una cuenta de administrador no se puede eliminar desde el perfil' }, { status: 400 })
  }

  const claveRate = `eliminar:${session.user.id}`
  if (consumir(claveRate, { max: 5, ventanaMs: 15 * 60 * 1000 })) return respuesta429(claveRate, 'rate_limit_eliminar', { ruta: '/api/perfil/eliminar' })

  const v = await validarBody(req, Esquema)
  if (!v.ok) return v.res

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { password: true } })
  if (!user) return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })
  if (user.password && !(await bcrypt.compare(v.data.password ?? '', user.password))) {
    return NextResponse.json({ error: 'La contraseña no es correcta' }, { status: 400 })
  }

  const r = await eliminarCuenta(session.user.id)
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 })

  logActividad({ tipo: 'SEGURIDAD', userId: session.user.id, ruta: '/api/perfil/eliminar', ...datosCliente(req), detalle: { motivo: 'cuenta_eliminada' } })
  return NextResponse.json({ ok: true })
}
