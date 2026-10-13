import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getEstadoFounder, getPlanId } from '@/lib/paypal'
import { temporadaIniciacionFinalizada } from '@/lib/iniciacion'
import { PLAN_PRECIOS, PLAN_PRECIOS_NORMAL } from '@/lib/utils'

export const dynamic = 'force-dynamic'

// Accesible sin autenticación — los visitantes siempre ven el precio estándar
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const { searchParams } = new URL(req.url)
  const plan = searchParams.get('plan')

  let esFounder = false
  let founderActivo = false
  let esElegibleFounder = false
  let ventanaExpira: Date | null = null
  if (session?.user?.id) {
    ({ esFounder, founderActivo, esElegibleFounder, ventanaExpira } = await getEstadoFounder(session.user.id))
  }

  const horasRestantes = ventanaExpira
    ? Math.max(0, Math.round(((ventanaExpira.getTime() - Date.now()) / 3600000) * 10) / 10)
    : null

  const body: Record<string, unknown> = {
    esFounder,
    esElegibleFounder,
    ventanaExpira: ventanaExpira?.toISOString() ?? null,
    horasRestantes,
    modoPrecio: (founderActivo || esElegibleFounder) ? 'FOUNDER' : 'NORMAL',
    temporadaIniciacionFinalizada: await temporadaIniciacionFinalizada(),
    precios: { FOUNDER: PLAN_PRECIOS, NORMAL: PLAN_PRECIOS_NORMAL },
  }

  // Si se solicita un plan concreto y hay sesión, devolvemos también el Plan ID de PayPal resuelto
  if (plan && session?.user?.id) {
    const r = await getPlanId(session.user.id, plan)
    body.planId = r.planId
    body.esFounderParaEstaCompra = r.precioFounder
    body.descuentoReferido = r.descuentoReferido
    body.descuentoTransicionEquipo = r.descuentoTransicionEquipo
  }

  return NextResponse.json(body)
}
