import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail, emailCarreraProxima } from '@/lib/email'
import { formatFechaHora } from '@/lib/utils'
import { rechazarCron } from '@/lib/cron'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const rechazo = rechazarCron(req)
  if (rechazo) return rechazo

  const ahora = new Date()
  // Ventana: carreras entre 23h y 25h desde ahora
  const desde = new Date(ahora.getTime() + 23 * 60 * 60 * 1000)
  const hasta = new Date(ahora.getTime() + 25 * 60 * 60 * 1000)

  const carreras = await prisma.carrera.findMany({
    where: {
      fecha: { gte: desde, lte: hasta },
      estado: 'PROGRAMADA',
    },
    include: {
      campeonato: {
        select: {
          id: true,
          nombre: true,
          inscripciones: {
            where: { estado: 'CONFIRMADA' },
            include: {
              user: { select: { id: true, email: true, username: true } },
            },
          },
        },
      },
    },
  })

  let emailsEnviados = 0

  for (const carrera of carreras) {
    const pilotos = carrera.campeonato.inscripciones.map(i => i.user)

    for (const piloto of pilotos) {
      sendEmail({
        to: piloto.email,
        subject: `Mañana tienes carrera: ${carrera.nombre} ⏱`,
        html: emailCarreraProxima(
          piloto.username,
          carrera.nombre,
          carrera.campeonato.nombre,
          formatFechaHora(carrera.fecha),
          carrera.campeonato.id,
          carrera.servidorIP,
          carrera.servidorPassword
        ),
      }).catch(() => null)
      emailsEnviados++
    }
  }

  console.log(`[Cron] race-reminders: ${carreras.length} carreras, ${emailsEnviados} emails enviados`)
  return NextResponse.json({ ok: true, carreras: carreras.length, emailsEnviados })
}
