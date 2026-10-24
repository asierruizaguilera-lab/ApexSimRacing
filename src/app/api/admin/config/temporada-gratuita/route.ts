import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { setTemporadaGratuitaActiva } from '@/lib/config'
import { registrarAccionAdmin } from '@/lib/actividad'
import { validarBody, z } from '@/lib/validacion'

const Esquema = z.object({ activa: z.boolean({ required_error: 'El campo "activa" debe ser booleano', invalid_type_error: 'El campo "activa" debe ser booleano' }) })

// Activa o desactiva el modo "Temporada gratuita". Body: { activa: boolean }
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const v = await validarBody(req, Esquema)
  if (!v.ok) return v.res
  const { activa } = v.data

  const config = await setTemporadaGratuitaActiva(activa)

  await registrarAccionAdmin({
    data: {
      adminId: session.user.id,
      targetUserId: session.user.id,
      accion: activa ? 'ACTIVAR_TEMPORADA_GRATUITA' : 'DESACTIVAR_TEMPORADA_GRATUITA',
    },
  })
  return NextResponse.json({ temporadaGratuitaActiva: config.temporadaGratuitaActiva })
}
