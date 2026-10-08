import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  calcularCashAPagar, inicioDeMes, precioSuscripcionReferidor, redondear,
  COMISION_REFERIDO, DESCUENTO_REFERIDO_PCT, MESES_COMISION,
} from '@/lib/referidos'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const userId = session.user.id

  const [codigo, usos, saldo, comisionMes, comisionTotal, precioSuscripcion] = await Promise.all([
    prisma.codigoReferido.findFirst({
      where: { creadoPorId: userId, activo: true },
      select: { codigo: true, creadoEn: true },
    }),
    prisma.usoReferido.findMany({
      where: { referidorId: userId },
      orderBy: { creadoEn: 'desc' },
      select: {
        id: true, fechaInicio: true, mesesActivos: true, comisionTotal: true, activo: true,
        referido: { select: { id: true, username: true } },
      },
    }),
    prisma.saldoReferidor.findUnique({ where: { userId } }),
    prisma.comisionReferido.aggregate({
      where: { referidorId: userId, creadoEn: { gte: inicioDeMes() } },
      _sum: { importe: true },
    }),
    prisma.comisionReferido.aggregate({ where: { referidorId: userId }, _sum: { importe: true } }),
    precioSuscripcionReferidor(userId),
  ])

  const saldoPendiente = redondear(saldo?.saldoPendiente ?? 0)

  return NextResponse.json({
    codigo,
    config: { descuento: DESCUENTO_REFERIDO_PCT, comision: COMISION_REFERIDO * 100, meses: MESES_COMISION },
    totalReferidos: usos.length,
    referidosActivos: usos.filter(u => u.activo).length,
    comisionEsteMes: redondear(comisionMes._sum.importe ?? 0),
    comisionHistorica: redondear(comisionTotal._sum.importe ?? 0),
    saldoPendiente,
    saldoPagado: redondear(saldo?.saldoPagado ?? 0),
    ultimaLiquidacion: saldo?.ultimaLiquidacion ?? null,
    precioSuscripcion,
    cashEstimado: calcularCashAPagar(saldoPendiente, precioSuscripcion),
    referidos: usos,
  })
}
