import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { exportarDatosUsuario } from '@/lib/rgpd'
import { logActividad } from '@/lib/actividad'
import { consumir, respuesta429 } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

// Descarga de los datos personales del usuario en JSON (derecho de acceso y portabilidad)
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // La exportación es pesada: 5 por hora y usuario
  const claveRate = `exportar:${session.user.id}`
  if (consumir(claveRate, { max: 5, ventanaMs: 60 * 60 * 1000 })) return respuesta429(claveRate, 'rate_limit_exportar', { ruta: '/api/perfil/datos' })

  const datos = await exportarDatosUsuario(session.user.id)
  if (!datos) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  logActividad({ tipo: 'SEGURIDAD', userId: session.user.id, ruta: '/api/perfil/datos', detalle: { motivo: 'exportacion_datos' } })

  const fecha = new Date().toISOString().slice(0, 10)
  return new NextResponse(JSON.stringify(datos, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="apex-mis-datos-${fecha}.json"`,
      'Cache-Control': 'no-store',
    },
  })
}
