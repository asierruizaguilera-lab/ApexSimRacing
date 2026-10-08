import { Prisma } from '@prisma/client'
import { prisma } from './prisma'

export const DESCUENTO_REFERIDO_PCT = 10 // % de descuento en el primer mes del referido
export const COMISION_REFERIDO = 0.12 // 12% del precio del plan por cada mes pagado
export const MESES_COMISION = 12 // la comisión se genera durante los primeros 12 pagos

export function redondear(n: number): number {
  return Math.round(n * 100) / 100
}

export function precioConDescuentoReferido(precio: number): number {
  return redondear(precio * (1 - DESCUENTO_REFERIDO_PCT / 100))
}

export function normalizarCodigo(codigo: string): string {
  return codigo.trim().toUpperCase()
}

// APEX-[USERNAME]-[4 dígitos]. El username se limpia a A-Z/0-9 para que el código sea seguro en URLs.
export async function generarCodigoUnico(username: string): Promise<string> {
  const base = username.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16) || 'PILOTO'
  for (let i = 0; i < 20; i++) {
    const digitos = Math.floor(1000 + Math.random() * 9000)
    const codigo = `APEX-${base}-${digitos}`
    const existe = await prisma.codigoReferido.findUnique({ where: { codigo }, select: { id: true } })
    if (!existe) return codigo
  }
  throw new Error('No se pudo generar un código único')
}

/**
 * Crea un código activo para el usuario desactivando cualquier otro que tuviera
 * (un usuario solo puede tener UN código activo a la vez).
 */
export async function crearCodigoParaUsuario(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } })
  if (!user) throw new Error('Usuario no encontrado')
  const codigo = await generarCodigoUnico(user.username)
  const [, creado] = await prisma.$transaction([
    prisma.codigoReferido.updateMany({ where: { creadoPorId: userId, activo: true }, data: { activo: false } }),
    prisma.codigoReferido.create({ data: { codigo, creadoPorId: userId } }),
  ])
  return creado
}

/** Devuelve el código si existe, está activo y su creador no está baneado. */
export async function buscarCodigoValido(codigo: string) {
  if (!codigo) return null
  const encontrado = await prisma.codigoReferido.findUnique({
    where: { codigo: normalizarCodigo(codigo) },
    include: { creadoPor: { select: { id: true, username: true, baneado: true } } },
  })
  if (!encontrado || !encontrado.activo || encontrado.creadoPor.baneado) return null
  return encontrado
}

/**
 * ¿Debe pagar este usuario su primer mes con el plan de descuento de referido?
 * Solo si se registró con un código y aún no se ha vinculado (= todavía no ha pagado nunca).
 */
export async function tieneDescuentoReferidoPendiente(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { descuentoReferido: true, codigoReferidoPendienteId: true, referidoPor: { select: { id: true } } },
  })
  return !!(user?.descuentoReferido && user.codigoReferidoPendienteId && !user.referidoPor)
}

/**
 * Crea el UsoReferido que vincula referido y referidor al completar el primer pago.
 * Idempotente: si ya existe o no hay código pendiente, no hace nada.
 */
export async function vincularReferido(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { codigoReferidoPendienteId: true, referidoPor: { select: { id: true } } },
  })
  if (!user?.codigoReferidoPendienteId || user.referidoPor) return

  const codigo = await prisma.codigoReferido.findUnique({
    where: { id: user.codigoReferidoPendienteId },
    select: { id: true, creadoPorId: true },
  })
  // Aunque el código se haya desactivado después del registro, el referido sigue contando:
  // el usuario se registró con él cuando era válido.
  if (!codigo || codigo.creadoPorId === userId) {
    await prisma.user.update({ where: { id: userId }, data: { codigoReferidoPendienteId: null } })
    return
  }

  try {
    await prisma.$transaction([
      prisma.usoReferido.create({
        data: { codigoId: codigo.id, referidoId: userId, referidorId: codigo.creadoPorId },
      }),
      prisma.user.update({ where: { id: userId }, data: { codigoReferidoPendienteId: null } }),
    ])
  } catch (err) {
    // Webhook y capture pueden llegar a la vez: si otro ya lo creó (unique referidoId), no es un error.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return
    throw err
  }
}

/**
 * Registra la comisión de un pago completado del referido (webhook PAYMENT.SALE.COMPLETED).
 * Idempotente por saleId: PayPal reintenta webhooks y no debe sumarse dos veces.
 */
export async function registrarComisionPago(referidoId: string, saleId: string, precioPlan: number): Promise<void> {
  if (!saleId || !(precioPlan > 0)) return

  // Por si el webhook del primer pago llega antes que capture-subscription
  await vincularReferido(referidoId)

  const uso = await prisma.usoReferido.findUnique({
    where: { referidoId },
    include: { referido: { select: { username: true } } },
  })
  if (!uso || !uso.activo) return
  if (uso.mesesActivos >= MESES_COMISION) {
    await prisma.usoReferido.update({ where: { id: uso.id }, data: { activo: false } })
    return
  }

  const importe = redondear(precioPlan * COMISION_REFERIDO)
  const meses = uso.mesesActivos + 1

  try {
    await prisma.$transaction([
      prisma.comisionReferido.create({
        data: { usoId: uso.id, referidorId: uso.referidorId, saleId, precioPlan, importe },
      }),
      prisma.usoReferido.update({
        where: { id: uso.id },
        data: {
          mesesActivos: { increment: 1 },
          comisionTotal: { increment: importe },
          activo: meses < MESES_COMISION,
        },
      }),
      prisma.saldoReferidor.upsert({
        where: { userId: uso.referidorId },
        update: { saldoPendiente: { increment: importe } },
        create: { userId: uso.referidorId, saldoPendiente: importe },
      }),
    ])
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return // pago ya procesado
    throw err
  }

  await prisma.notificacion.create({
    data: {
      userId: uso.referidorId,
      tipo: 'REFERIDO',
      mensaje: `💸 Has ganado ${importe.toFixed(2)}€ de comisión por el pago de ${uso.referido.username} (mes ${meses}/${MESES_COMISION})`,
      link: '/perfil',
    },
  }).catch(() => null)
}

/** El referido canceló: deja de generar comisiones. */
export async function desactivarUsoReferido(referidoId: string): Promise<void> {
  await prisma.usoReferido.updateMany({ where: { referidoId, activo: true }, data: { activo: false } })
}

/** Precio mensual que paga el referidor (0 si no tiene suscripción de pago activa). */
export async function precioSuscripcionReferidor(userId: string): Promise<number> {
  const sub = await prisma.suscripcion.findUnique({
    where: { userId },
    select: { estado: true, esGratuita: true, precioMensual: true },
  })
  if (!sub || sub.estado !== 'ACTIVA' || sub.esGratuita) return 0
  return sub.precioMensual
}

export function calcularCashAPagar(saldoPendiente: number, precioSuscripcion: number): number {
  return redondear(Math.max(0, saldoPendiente - precioSuscripcion))
}

/**
 * Liquida el saldo pendiente de un referidor. Se descuenta exactamente el importe leído
 * (no se pone a 0) para no perder comisiones que entren mientras se liquida.
 */
export async function liquidarReferidor(adminId: string, userId: string) {
  const saldo = await prisma.saldoReferidor.findUnique({ where: { userId } })
  const importe = redondear(saldo?.saldoPendiente ?? 0)
  if (!saldo || importe <= 0) return null

  const precioSuscripcion = await precioSuscripcionReferidor(userId)
  const cashPagado = calcularCashAPagar(importe, precioSuscripcion)
  const usos = await prisma.usoReferido.findMany({
    where: { referidorId: userId },
    select: { id: true, comisionTotal: true },
  })

  const liquidacion = await prisma.$transaction(async tx => {
    // Condicional: si otro admin liquidó a la vez, el saldo ya no alcanza y se aborta (evita saldo negativo)
    const { count } = await tx.saldoReferidor.updateMany({
      where: { userId, saldoPendiente: { gte: importe - 0.001 } },
      data: {
        saldoPendiente: { decrement: importe },
        saldoPagado: { increment: importe },
        ultimaLiquidacion: new Date(),
      },
    })
    if (count === 0) return null

    for (const u of usos) {
      await tx.usoReferido.update({ where: { id: u.id }, data: { comisionPagada: u.comisionTotal } })
    }
    await tx.logAccionAdmin.create({
      data: {
        adminId,
        targetUserId: userId,
        accion: 'LIQUIDACION_REFERIDO',
        detalle: `Liquidados ${importe.toFixed(2)}€ (suscripción ${Math.min(precioSuscripcion, importe).toFixed(2)}€, cash ${cashPagado.toFixed(2)}€)`,
      },
    })
    return tx.liquidacionReferido.create({
      data: {
        userId,
        adminId,
        importeLiquidado: importe,
        precioSuscripcion: Math.min(precioSuscripcion, importe),
        cashPagado,
      },
    })
  })
  if (!liquidacion) return null

  await prisma.notificacion.create({
    data: {
      userId,
      tipo: 'REFERIDO',
      mensaje: `✅ Se han liquidado tus ${importe.toFixed(2)}€ de comisiones de referido${cashPagado > 0 ? ` (${cashPagado.toFixed(2)}€ en cash)` : ''}`,
      link: '/perfil',
    },
  }).catch(() => null)

  return liquidacion
}

export function inicioDeMes(fecha = new Date()): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), 1)
}

/** Datos del panel admin: códigos, referidores con saldo (liquidación del mes) e historial. */
export async function getResumenAdminReferidos() {
  const inicioMes = inicioDeMes()
  const [codigos, saldos, comisionesMes, liquidaciones] = await Promise.all([
    prisma.codigoReferido.findMany({
      orderBy: [{ activo: 'desc' }, { creadoEn: 'desc' }],
      include: {
        creadoPor: { select: { id: true, username: true } },
        usos: { select: { comisionTotal: true } },
      },
    }),
    prisma.saldoReferidor.findMany({
      where: { saldoPendiente: { gt: 0.001 } },
      orderBy: { saldoPendiente: 'desc' },
      include: {
        user: {
          select: {
            id: true, username: true, email: true,
            suscripcion: { select: { estado: true, esGratuita: true, precioMensual: true, plan: true } },
            _count: { select: { referidosHechos: true } },
          },
        },
      },
    }),
    prisma.comisionReferido.groupBy({
      by: ['referidorId'],
      where: { creadoEn: { gte: inicioMes } },
      _sum: { importe: true },
    }),
    prisma.liquidacionReferido.findMany({
      orderBy: { creadoEn: 'desc' },
      take: 100,
      include: {
        user: { select: { id: true, username: true } },
        admin: { select: { username: true } },
      },
    }),
  ])

  const comisionMesPorUser = new Map(comisionesMes.map(c => [c.referidorId, c._sum.importe ?? 0]))

  return {
    codigos: codigos.map(c => ({
      id: c.id,
      codigo: c.codigo,
      activo: c.activo,
      creadoEn: c.creadoEn.toISOString(),
      creador: c.creadoPor,
      numUsos: c.usos.length,
      comisionGenerada: redondear(c.usos.reduce((acc, u) => acc + u.comisionTotal, 0)),
    })),
    pendientes: saldos.map(s => {
      const sub = s.user.suscripcion
      const precioSuscripcion = sub && sub.estado === 'ACTIVA' && !sub.esGratuita ? sub.precioMensual : 0
      const saldoPendiente = redondear(s.saldoPendiente)
      return {
        userId: s.userId,
        username: s.user.username,
        email: s.user.email,
        plan: sub?.plan ?? null,
        numReferidos: s.user._count.referidosHechos,
        comisionEsteMes: redondear(comisionMesPorUser.get(s.userId) ?? 0),
        saldoPendiente,
        precioSuscripcion,
        cashAPagar: calcularCashAPagar(saldoPendiente, precioSuscripcion),
        ultimaLiquidacion: s.ultimaLiquidacion?.toISOString() ?? null,
      }
    }),
    liquidaciones: liquidaciones.map(l => ({
      id: l.id,
      user: l.user,
      admin: l.admin.username,
      importeLiquidado: l.importeLiquidado,
      precioSuscripcion: l.precioSuscripcion,
      cashPagado: l.cashPagado,
      creadoEn: l.creadoEn.toISOString(),
    })),
  }
}

export type ResumenAdminReferidos = Awaited<ReturnType<typeof getResumenAdminReferidos>>
