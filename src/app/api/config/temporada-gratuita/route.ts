import { NextResponse } from 'next/server'
import { ErrorLecturaFlag, leerTemporadaGratuita } from '@/lib/accesoServidor'

// Público: el middleware (Edge, sin Prisma) lo consulta para saber si el modo temporada gratuita está activo.
// Si la BD falla responde 503: nunca devuelve "false" por error.
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const activa = await leerTemporadaGratuita('api/config/temporada-gratuita')
    return NextResponse.json({ activa }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    if (e instanceof ErrorLecturaFlag) {
      return NextResponse.json({ error: 'No se pudo leer la configuración' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
    }
    throw e
  }
}
