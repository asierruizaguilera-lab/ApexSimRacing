import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail, emailInscripcionConfirmada } from '@/lib/email'
import { planSuficiente, PLAN_LABELS } from '@/lib/utils'
import { esMiembroEquipoFounder } from '@/lib/equipos'
import { featureEquipos } from '@/lib/features'
import { usuarioDebeVerificarEmail, RESPUESTA_EMAIL_NO_VERIFICADO } from '@/lib/tokensSeguridad'
import { ErrorLecturaFlag, getAccesoUsuario } from '@/lib/accesoServidor'

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (await usuarioDebeVerificarEmail(session.user.id)) return NextResponse.json(RESPUESTA_EMAIL_NO_VERIFICADO, { status: 403 })

  const camp = await prisma.campeonato.findUnique({
    where: { id: params.id },
    include: { _count: { select: { inscripciones: { where: { estado: { in: ['PENDIENTE', 'CONFIRMADA'] } } } } } },
  })

  if (!camp) return NextResponse.json({ error: 'Campeonato no encontrado' }, { status: 404 })
  if (camp.esCampeonatoEquipos) {
    return NextResponse.json({ error: 'Este campeonato es por equipos: solo el líder puede inscribir a su equipo', code: 'SOLO_EQUIPOS' }, { status: 400 })
  }

  // Con FEATURE_EQUIPOS apagada no hay campeonatos de equipos a los que remitir: no se bloquea
  if (featureEquipos() && await esMiembroEquipoFounder(session.user.id)) {
    return NextResponse.json({
      error: 'Los miembros de un Equipo Founder solo pueden competir en campeonatos de equipos.',
      code: 'EQUIPO_FOUNDER',
    }, { status: 403 })
  }

  // La temporada de iniciación es gratuita: no exige suscripción ni plan mínimo
  if (!camp.esIniciacion) {
    let acceso
    try {
      acceso = await getAccesoUsuario(session.user.id, 'inscripcion')
    } catch (e) {
      if (e instanceof ErrorLecturaFlag) {
        return NextResponse.json({ error: 'No se pudo comprobar tu acceso. Inténtalo de nuevo en unos segundos.', code: 'ERROR_ACCESO' }, { status: 503 })
      }
      throw e
    }
    if (!acceso.acceso) {
      return NextResponse.json({
        error: 'Necesitas un plan activo para inscribirte en campeonatos',
        code: 'NO_SUBSCRIPTION',
        redirectTo: '/planes',
      }, { status: 403 })
    }
    // Con la temporada gratuita activa (o siendo admin) no se exige plan mínimo ni Elite
    if (!acceso.temporadaGratuita && !acceso.esAdmin) {
      const plan = acceso.plan ?? ''
      if (!planSuficiente(plan, camp.categoriaMinima)) {
        return NextResponse.json({
          error: `Necesitas el plan ${PLAN_LABELS[camp.categoriaMinima]} o superior para inscribirte en esta categoría. Ve a /planes`,
          code: 'PLAN_INSUFICIENTE',
          redirectTo: '/planes',
        }, { status: 403 })
      }
      if (camp.soloElite && plan !== 'ELITE') {
        return NextResponse.json({
          error: 'Este campeonato es exclusivo para pilotos Elite. Mejora tu plan en /planes',
          code: 'SOLO_ELITE',
          redirectTo: '/planes',
        }, { status: 403 })
      }
    }
  }
  if (camp.estado === 'FINALIZADO') return NextResponse.json({ error: 'Este campeonato ya ha finalizado' }, { status: 400 })
  if (camp._count.inscripciones >= camp.maxPilotos) return NextResponse.json({ error: 'Campeonato lleno' }, { status: 400 })

  const existing = await prisma.inscripcion.findUnique({
    where: { userId_campeonatoId: { userId: session.user.id, campeonatoId: params.id } },
  })

  if (existing) {
    if (existing.estado === 'CANCELADA') {
      const updated = await prisma.inscripcion.update({
        where: { id: existing.id },
        data: { estado: 'PENDIENTE', fechaInscripcion: new Date() },
      })
      return NextResponse.json(updated)
    }
    return NextResponse.json({ error: 'Ya estás inscrito en este campeonato' }, { status: 409 })
  }

  const inscripcion = await prisma.inscripcion.create({
    data: { userId: session.user.id, campeonatoId: params.id, estado: 'PENDIENTE' },
  })

  // Notificación
  await prisma.notificacion.create({
    data: {
      userId: session.user.id,
      tipo: 'INSCRIPCION_CONFIRMADA',
      mensaje: `Tu solicitud de inscripción a ${camp.nombre} ha sido recibida. Pendiente de confirmación.`,
      link: `/campeonatos/${params.id}`,
    },
  })

  return NextResponse.json(inscripcion, { status: 201 })
}
