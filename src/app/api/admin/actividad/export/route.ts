import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import Papa from 'papaparse'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logActividad } from '@/lib/actividad'
import { whereActividad, nombresUsuarios } from '@/lib/actividadAdmin'

export const dynamic = 'force-dynamic'

// Tope de filas para no disparar la memoria (instancia de 512 MB)
const MAX_FILAS = 10_000

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const where = await whereActividad(req.nextUrl.searchParams)
  const items = await prisma.logActividad.findMany({
    where,
    orderBy: { creadoEn: 'desc' },
    take: MAX_FILAS,
  })
  const nombres = await nombresUsuarios(items.map(i => i.userId))

  const csv = Papa.unparse(items.map(i => ({
    fecha: i.creadoEn.toISOString(),
    tipo: i.tipo,
    userId: i.userId ?? '',
    usuario: i.userId ? nombres.get(i.userId) ?? '' : '',
    metodo: i.metodo ?? '',
    ruta: i.ruta ?? '',
    estado: i.estado ?? '',
    ipHash: i.ipHash ?? '',
    userAgent: i.userAgent ?? '',
    detalle: i.detalle ? JSON.stringify(i.detalle) : '',
  })))

  logActividad({
    tipo: 'ADMIN',
    userId: session.user.id,
    detalle: { accion: 'EXPORTAR_ACTIVIDAD', filas: items.length, filtros: Object.fromEntries(req.nextUrl.searchParams) },
  })

  const fecha = new Date().toISOString().slice(0, 10)
  return new NextResponse('﻿' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="actividad-${fecha}.csv"`,
    },
  })
}
