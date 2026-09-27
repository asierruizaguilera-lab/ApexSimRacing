import { prisma } from './prisma'
import { PlanSuscripcion } from '@prisma/client'
import { PLAN_PRECIOS_NORMAL, DESCUENTO_MERCH_POR_PLAN } from './utils'

export const PLAN_ORDER: PlanSuscripcion[] = ['ROOKIE', 'AMATEUR', 'PRO', 'ELITE']

// Precios Fundador (congelados de por vida para los primeros 60 pagadores)
export const PLAN_PRECIOS: Record<PlanSuscripcion, number> = {
  ROOKIE: 5,
  AMATEUR: 10,
  PRO: 15,
  ELITE: 25,
}

export function planesIncluidos(plan: PlanSuscripcion): PlanSuscripcion[] {
  const idx = PLAN_ORDER.indexOf(plan)
  return PLAN_ORDER.slice(0, idx + 1)
}

export function esAccesoActivo(suscripcion: { estado: string; fechaExpiracionManual: Date | null } | null): boolean {
  if (!suscripcion) return false
  if (suscripcion.estado === 'CANCELADA' || suscripcion.estado === 'EXPIRADA') return false
  if (suscripcion.fechaExpiracionManual && new Date(suscripcion.fechaExpiracionManual) < new Date()) return false
  return suscripcion.estado === 'ACTIVA' || suscripcion.estado === 'GRATUITA'
}

export async function desbloquearCoches(userId: string, plan: PlanSuscripcion): Promise<void> {
  const planesValidos = planesIncluidos(plan)
  const coches = await prisma.coche.findMany({
    where: { planMinimo: { in: planesValidos }, activo: true },
    select: { id: true },
  })
  if (coches.length === 0) return
  await prisma.cocheDesbloqueado.createMany({
    data: coches.map(c => ({ userId, cocheId: c.id })),
    skipDuplicates: true,
  })
}

export async function activarPlan(
  userId: string,
  plan: PlanSuscripcion,
  opts: {
    paypalSubscriptionId?: string
    paypalOrderId?: string
    esGratuita?: boolean
    esFounder?: boolean
    fechaExpiracionManual?: Date
    planAnterior?: PlanSuscripcion
    notasAdmin?: string
  } = {}
): Promise<{ precio: number; fechaRenovacion: Date; esFounder: boolean }> {
  // El precio fundador solo aplica a suscripciones de pago real (nunca a accesos gratuitos otorgados por admin)
  const esFounderPago = !opts.esGratuita && !!opts.esFounder

  const suscripcionAnterior = await prisma.suscripcion.findUnique({ where: { userId } })
  // Una vez fundador, la suscripción sigue marcada como fundadora al cambiar de plan (precio congelado de por vida)
  const marcarComoFounder = esFounderPago || (suscripcionAnterior?.esFounder ?? false)

  const precio = opts.esGratuita
    ? 0
    : marcarComoFounder
      ? PLAN_PRECIOS[plan]
      : PLAN_PRECIOS_NORMAL[plan]

  const fechaRenovacion = new Date()
  fechaRenovacion.setMonth(fechaRenovacion.getMonth() + 1)
  const estado = opts.esGratuita ? 'GRATUITA' : 'ACTIVA'

  await prisma.suscripcion.upsert({
    where: { userId },
    update: {
      plan,
      estado,
      precioMensual: precio,
      fechaInicio: new Date(),
      fechaRenovacion,
      fechaCancelacion: null,
      esGratuita: opts.esGratuita ?? false,
      esFounder: marcarComoFounder,
      precioFounder: marcarComoFounder ? PLAN_PRECIOS[plan] : null,
      fechaExpiracionManual: opts.fechaExpiracionManual ?? null,
      planAnterior: opts.planAnterior ?? null,
      notasAdmin: opts.notasAdmin ?? null,
      paypalSubscriptionId: opts.paypalSubscriptionId ?? null,
      paypalOrderId: opts.paypalOrderId ?? null,
    },
    create: {
      userId,
      plan,
      estado,
      precioMensual: precio,
      fechaRenovacion,
      esGratuita: opts.esGratuita ?? false,
      esFounder: marcarComoFounder,
      precioFounder: marcarComoFounder ? PLAN_PRECIOS[plan] : null,
      fechaExpiracionManual: opts.fechaExpiracionManual ?? null,
      planAnterior: opts.planAnterior ?? null,
      notasAdmin: opts.notasAdmin ?? null,
      paypalSubscriptionId: opts.paypalSubscriptionId ?? null,
      paypalOrderId: opts.paypalOrderId ?? null,
    },
  })

  // Badge de fundador permanente — solo se otorga una vez y nunca se revoca
  if (esFounderPago) {
    await prisma.user.updateMany({
      where: { id: userId, esFounder: false },
      data: { esFounder: true, fechaFounder: new Date() },
    })
  }

  // Descuento de merch según el plan activo (se actualiza en cada cambio de plan)
  await prisma.user.update({
    where: { id: userId },
    data: { descuentoMerch: DESCUENTO_MERCH_POR_PLAN[plan] ?? 0 },
  })

  await desbloquearCoches(userId, plan)

  const mensaje = plan === 'ELITE'
    ? '¡Bienvenido al plan Elite! Tu kit de bienvenida APEX está en camino. Te contactaremos por email para la dirección de envío.'
    : `¡Tu plan ${plan} está activo! Ya puedes inscribirte en campeonatos.`

  await prisma.notificacion.create({
    data: {
      userId,
      tipo: 'SUSCRIPCION_ACTIVA',
      mensaje,
      link: '/mi-garaje',
    },
  })

  // Notificar a los admins cuando alguien activa o mejora a Elite (nuevo o upgrade) para enviar el welcome kit
  if (plan === 'ELITE' && suscripcionAnterior?.plan !== 'ELITE') {
    const [user, admins] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { username: true } }),
      prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } }),
    ])
    if (admins.length > 0) {
      await prisma.notificacion.createMany({
        data: admins.map(a => ({
          userId: a.id,
          tipo: 'NUEVO_ELITE' as const,
          mensaje: `🎁 Nuevo suscriptor Elite: ${user?.username ?? 'un piloto'} — enviar welcome kit`,
          link: '/admin/usuarios',
        })),
      })
    }
  }

  return { precio, fechaRenovacion, esFounder: marcarComoFounder }
}

export async function cancelarSuscripcion(userId: string): Promise<void> {
  await prisma.suscripcion.updateMany({
    where: { userId, estado: { in: ['ACTIVA', 'GRATUITA'] } },
    data: { estado: 'CANCELADA', fechaCancelacion: new Date() },
  })
  await prisma.notificacion.create({
    data: {
      userId,
      tipo: 'SUSCRIPCION_CANCELADA',
      mensaje: 'Tu suscripción ha sido cancelada.',
      link: '/planes',
    },
  }).catch(() => null)
}

export async function darAccesoManual(
  adminId: string,
  userId: string,
  plan: PlanSuscripcion,
  fechaExpiracion?: Date,
  notas?: string
): Promise<void> {
  // Guardar el plan anterior si ya tiene suscripción
  const suscripcionActual = await prisma.suscripcion.findFirst({ where: { userId } })
  const planAnterior = suscripcionActual?.plan ?? undefined

  await activarPlan(userId, plan, {
    esGratuita: true,
    fechaExpiracionManual: fechaExpiracion,
    planAnterior,
    notasAdmin: notas,
  })

  await prisma.logAccionAdmin.create({
    data: {
      adminId,
      targetUserId: userId,
      accion: 'ACCESO_GRATUITO',
      detalle: `Plan ${plan} otorgado${fechaExpiracion ? ` hasta ${fechaExpiracion.toLocaleDateString('es-ES')}` : ' sin expiración'}. ${notas || ''}`,
    },
  })
}

export async function cambiarPlanAdmin(
  adminId: string,
  userId: string,
  plan: PlanSuscripcion,
  notas?: string
): Promise<void> {
  await activarPlan(userId, plan, { notasAdmin: notas })
  await prisma.logAccionAdmin.create({
    data: {
      adminId,
      targetUserId: userId,
      accion: 'CAMBIO_PLAN',
      detalle: `Plan cambiado a ${plan}. ${notas || ''}`,
    },
  })
}

export async function banearUsuario(adminId: string, userId: string, motivo: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { baneado: true, motivoBan: motivo },
  })
  await prisma.logAccionAdmin.create({
    data: { adminId, targetUserId: userId, accion: 'BAN', detalle: motivo },
  })
}

export async function desbanearUsuario(adminId: string, userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { baneado: false, motivoBan: null },
  })
  await prisma.logAccionAdmin.create({
    data: { adminId, targetUserId: userId, accion: 'DESBAN', detalle: 'Cuenta desbaneada' },
  })
}

export async function getSuscripcionActiva(userId: string) {
  return prisma.suscripcion.findFirst({
    where: { userId, estado: { in: ['ACTIVA', 'GRATUITA'] } },
  })
}
