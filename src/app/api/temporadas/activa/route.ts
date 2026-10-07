import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { etiquetaTemporada, getTemporadaActiva } from '@/lib/temporadas'

export const dynamic = 'force-dynamic'

// Temporada activa (o null si el admin aún no ha iniciado ninguna)
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const temporada = await getTemporadaActiva()
  if (!temporada) return NextResponse.json(null)
  const { mesTemporada, texto } = etiquetaTemporada(temporada)
  return NextResponse.json({ ...temporada, mesTemporada, etiqueta: texto })
}
