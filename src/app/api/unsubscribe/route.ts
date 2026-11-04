import { NextRequest, NextResponse } from 'next/server'
import { verificarBaja } from '@/lib/mail/baja'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const texto = 'Dejarás de recibir avisos de ronda, resultados y ofertas. Seguirás recibiendo los emails imprescindibles de tu cuenta (confirmaciones de inscripción y de pago).'

function escaparHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]!)
}

function pagina(titulo: string, contenido: string, status = 200): NextResponse {
  return new NextResponse(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${titulo}</title><style>body{background:#1C1C1C;color:#F5F5F5;font-family:monospace;margin:0;padding:2rem;line-height:1.6}main{max-width:36rem;margin:10vh auto}button{background:#C0392B;color:#F5F5F5;border:0;padding:.8rem 1.2rem;font:inherit;cursor:pointer}</style></head><body><main><h1>${titulo}</h1>${contenido}</main></body></html>`, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

function tokenValido(token: string | null): string | null {
  return token ? verificarBaja(token) : null
}

export function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!tokenValido(token)) {
    return pagina('Enlace de baja no válido o caducado', '<p>Enlace de baja no válido o caducado</p>', 400)
  }
  const escapedToken = escaparHtml(token!)
  const action = `/api/unsubscribe?token=${escapedToken}`
  return pagina('Confirmar baja', `<p>${texto}</p><form method="POST" action="${action}"><button type="submit">Confirmar baja</button></form>`)
}

export async function POST(request: NextRequest) {
  const userId = tokenValido(request.nextUrl.searchParams.get('token'))
  if (!userId) return NextResponse.json({ error: 'Enlace de baja no válido o caducado' }, { status: 400 })

  try {
    await prisma.user.updateMany({
      where: { id: userId, emailUnsubscribedAt: null },
      data: { emailUnsubscribedAt: new Date() },
    })
    if (request.headers.get('accept')?.includes('text/html')) return pagina('Baja confirmada', '<p>Baja confirmada</p>')
    return new NextResponse('OK', { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
