import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Reporta un mensaje del chat: crea automáticamente una Queja (QUEJA_GENERAL) contra su autor.
export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const mensaje = await prisma.mensajeChat.findUnique({
    where: { id: params.id },
    include: { user: { select: { id: true, username: true } } },
  })
  if (!mensaje) return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 })
  if (mensaje.userId === session.user.id) {
    return NextResponse.json({ error: 'No puedes reportar tus propios mensajes' }, { status: 400 })
  }

  // Marca para identificar el mensaje en la queja y evitar reportes duplicados del mismo usuario
  const marca = `[chat:${mensaje.id}]`
  const yaReportado = await prisma.queja.findFirst({
    where: { denuncianteId: session.user.id, descripcion: { contains: marca } },
    select: { id: true },
  })
  if (yaReportado) return NextResponse.json({ error: 'Ya has reportado este mensaje' }, { status: 409 })

  const queja = await prisma.queja.create({
    data: {
      tipo: 'QUEJA_GENERAL',
      titulo: `Mensaje reportado en #${mensaje.canal.toLowerCase()} — ${mensaje.user.username}`,
      descripcion:
        `Reporte automático desde el chat de comunidad.\n\n` +
        `Autor: ${mensaje.user.username}\n` +
        `Canal: #${mensaje.canal.toLowerCase()}\n` +
        `Fecha: ${mensaje.creadoEn.toISOString()}\n\n` +
        `Mensaje:\n"${mensaje.contenido}"\n\n${marca}`,
      denuncianteId: session.user.id,
      denunciadoId: mensaje.userId,
    },
  })

  return NextResponse.json({ ok: true, quejaId: queja.id }, { status: 201 })
}
