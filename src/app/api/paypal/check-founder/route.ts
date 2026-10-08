import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getFounderStatus, getPlanId } from '@/lib/paypal'
import { PLAN_PRECIOS, PLAN_PRECIOS_NORMAL } from '@/lib/utils'

export const dynamic = 'force-dynamic'

// Accesible sin autenticación — se usa en la landing y en /planes para todos los visitantes
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const { searchParams } = new URL(req.url)
  const plan = searchParams.get('plan')

  const { plazasRestantes, totalPlazas, hayPlazasDisponibles } = await getFounderStatus()

  let esUsuarioFounder = false
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { esFounder: true },
    })
    esUsuarioFounder = user?.esFounder ?? false
  }

  const modoPrecio: 'FOUNDER' | 'NORMAL' = (esUsuarioFounder || hayPlazasDisponibles) ? 'FOUNDER' : 'NORMAL'

  const body: Record<string, unknown> = {
    esFounder: esUsuarioFounder,
    plazasRestantes,
    totalPlazas,
    modoPrecio,
    precios: { FOUNDER: PLAN_PRECIOS, NORMAL: PLAN_PRECIOS_NORMAL },
  }

  // Si se solicita un plan concreto y hay sesión, devolvemos también el Plan ID de PayPal resuelto
  if (plan && session?.user?.id) {
    const { planId, esFounder, descuentoReferido } = await getPlanId(plan, session.user.id)
    body.planId = planId
    body.esFounderParaEstaCompra = esFounder
    body.descuentoReferido = descuentoReferido
  }

  return NextResponse.json(body)
}
