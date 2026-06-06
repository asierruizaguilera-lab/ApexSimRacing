import { prisma } from './prisma'
import { PlanSuscripcion } from '@prisma/client'

export const PLAN_ORDER: PlanSuscripcion[] = ['ROOKIE', 'AMATEUR', 'PRO', 'ELITE']

export const PLAN_PRECIOS: Record<PlanSuscripcion, number> = {
  ROOKIE: 5,
  AMATEUR: 10,
  PRO: 18,
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
    fechaExpiracionManual?: Date
    planAnterior?: PlanSuscripcion
    notasAdmin?: string
  } = {}
): Promise<void> {
  const precio = opts.esGratuita ? 0 : PLAN_PRECIOS[plan]
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
      fechaExpiracionManual: opts.fechaExpiracionManual ?? null,
      planAnterior: opts.planAnterior ?? null,
      notasAdmin: opts.notasAdmin ?? null,
      paypalSubscriptionId: opts.paypalSubscriptionId ?? null,
      paypalOrderId: opts.paypalOrderId ?? null,
    },
  })

  await desbloquearCoches(userId, plan)

  await prisma.notificacion.create({
    data: {
      userId,
      tipo: 'SUSCRIPCION_ACTIVA',
      mensaje: `¡Tu plan ${plan} está activo! Ya puedes inscribirte en campeonatos.`,
      link: '/mi-garaje',
    },
  })
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
