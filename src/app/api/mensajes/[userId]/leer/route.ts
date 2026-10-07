import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canalDM, emitir } from '@/lib/equipos'

// Marca como leídos todos los mensajes que [userId] me ha enviado
export async function PATCH(_: NextRequest, { params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const yo = session.user.id

  const { count } = await prisma.mensajeDirecto.updateMany({
    where: { remitenteId: params.userId, destinatarioId: yo, leido: false },
    data: { leido: true },
  })
  // La notificación "te ha enviado un mensaje" deja de tener sentido
  await prisma.notificacion.updateMany({
    where: { userId: yo, tipo: 'MENSAJE_DIRECTO', leida: false, link: `/mensajes/${params.userId}` },
    data: { leida: true },
  })
  // Sincroniza el badge en el resto de pestañas del mismo usuario
  if (count > 0) {
    emitir(`user:${yo}`, 'dm:leidos', { userId: params.userId })
    // Confirmación de lectura para el remitente (doble check)
    emitir(canalDM(yo, params.userId), 'dm:read', { lectorId: yo })
  }

  return NextResponse.json({ ok: true, marcados: count })
}
