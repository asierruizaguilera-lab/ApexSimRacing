import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getEstadoFounder, getPlanId } from '@/lib/paypal'
import { temporadaIniciacionFinalizada } from '@/lib/iniciacion'
import { getTemporadaGratuitaActiva } from '@/lib/config'
import { PLAN_PRECIOS, PLAN_PRECIOS_NORMAL } from '@/lib/utils'
import { usuarioDebeVerificarEmail } from '@/lib/tokensSeguridad'
import { validarQuery, z, plan } from '@/lib/validacion'

const Consulta = z.object({ plan: plan.optional() })

export const dynamic = 'force-dynamic'

// Accesible sin autenticación — los visitantes siempre ven el precio estándar
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const q = validarQuery(req.nextUrl.searchParams, Consulta)
  if (!q.ok) return q.res
  const { plan } = q.data

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
    modoTemporadaGratuita: false,
    precios: { FOUNDER: PLAN_PRECIOS, NORMAL: PLAN_PRECIOS_NORMAL },
  }

  // Modo "Temporada gratuita": acceso completo sin coste, no se venden planes
  if (await getTemporadaGratuitaActiva().catch(() => false)) {
    body.temporadaIniciacionFinalizada = false
    body.modoTemporadaGratuita = true
  }

  // Si se solicita un plan concreto y hay sesión, devolvemos también el Plan ID de PayPal resuelto
  // Sin email verificado no se entrega el Plan ID: el modal no llega a mostrar los botones de PayPal
  if (plan && session?.user?.id && await usuarioDebeVerificarEmail(session.user.id)) {
    body.emailNoVerificado = true
  } else if (plan && session?.user?.id) {
    const r = await getPlanId(session.user.id, plan)
    body.planId = r.planId
    body.esFounderParaEstaCompra = r.precioFounder
    body.descuentoReferido = r.descuentoReferido
    body.descuentoTransicionEquipo = r.descuentoTransicionEquipo
  }

  return NextResponse.json(body)
}
