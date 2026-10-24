import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { logActividad } from '@/lib/actividad'

export const dynamic = 'force-dynamic'

// Últimas vistas por usuario: descarta la misma ruta repetida en menos de 10 s (recargas, StrictMode)
const ultimas = new Map<string, { ruta: string; t: number }>()
const VENTANA_MS = 10_000

// Beacon de vistas de página (navigator.sendBeacon). Solo se guarda la ruta, nunca la query.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return new NextResponse(null, { status: 204 })

  let ruta: unknown
  try {
    ruta = (JSON.parse(await req.text()) as { ruta?: unknown }).ruta
  } catch {
    return new NextResponse(null, { status: 204 })
  }
  if (typeof ruta !== 'string' || !ruta.startsWith('/') || ruta.length > 200) {
    return new NextResponse(null, { status: 204 })
  }
  ruta = ruta.split(/[?#]/)[0]

  const userId = session.user.id
  const ahora = Date.now()
  const previa = ultimas.get(userId)
  if (previa && previa.ruta === ruta && ahora - previa.t < VENTANA_MS) {
    return new NextResponse(null, { status: 204 })
  }
  if (ultimas.size > 5000) ultimas.clear()
  ultimas.set(userId, { ruta: ruta as string, t: ahora })

  logActividad({ tipo: 'VISTA', userId, ruta: ruta as string })
  return new NextResponse(null, { status: 204 })
}
