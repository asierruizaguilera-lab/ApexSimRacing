import { withAuth, NextRequestWithAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import { diagAcceso, temporadaGratuitaForzada, tieneAcceso } from '@/lib/acceso'

// Rutas públicas que no requieren ni login ni suscripción
const PUBLIC_PATHS = [
  '/', '/login', '/register', '/registro', '/bloqueado',
  '/recuperar', '/restablecer', '/verificar-email', '/privacidad', '/terminos', '/cookies', '/acceso-error',
  '/api/health',
]
const PUBLIC_PREFIXES = ['/api/auth', '/api/paypal', '/api/cron', '/api/patrocinadores', '/api/referidos/validar', '/api/config/temporada-gratuita', '/_next', '/favicon']

function esZonaAdmin(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/api/admin')
}

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true
  return PUBLIC_PREFIXES.some(p => pathname.startsWith(p))
}

// El middleware corre en Edge y no puede usar Prisma: lee el flag por un fetch interno, cacheado 30 s.
// Los fallos no se cachean y nunca se interpretan como "modo apagado".
const TTL_FLAG_MS = 30_000
let cacheFlag: { valor: boolean; expira: number } | null = null
// Origen fijo del propio servidor (server.js escucha en 0.0.0.0:PORT). No se usa req.nextUrl.origin: sale de
// la cabecera Host y un atacante podría apuntar el fetch a un servidor suyo que responda { activa: true }.
const ORIGEN_INTERNO = `http://127.0.0.1:${process.env.PORT || '3000'}`

async function leerFlagTemporadaGratuita(): Promise<boolean | null> {
  if (temporadaGratuitaForzada()) return true
  if (cacheFlag && cacheFlag.expira > Date.now()) return cacheFlag.valor
  const control = new AbortController()
  const temporizador = setTimeout(() => control.abort(), 3000)
  try {
    const res = await fetch(`${ORIGEN_INTERNO}/api/config/temporada-gratuita`, {
      cache: 'no-store',
      signal: control.signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (typeof data?.activa !== 'boolean') throw new Error('respuesta sin "activa"')
    cacheFlag = { valor: data.activa, expira: Date.now() + TTL_FLAG_MS }
    return data.activa
  } catch (e) {
    console.error(`[SEGURIDAD] Middleware: no se pudo leer temporadaGratuitaActiva: ${(e as Error)?.message ?? 'desconocido'}`)
    return null
  } finally {
    clearTimeout(temporizador)
  }
}

export default withAuth(
  async function middleware(req: NextRequestWithAuth) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    if (isPublic(pathname)) return NextResponse.next()

    if (!token) {
      if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      return NextResponse.redirect(new URL('/', req.url))
    }

    // /admin y /api/admin solo para ADMIN (cada página y ruta lo vuelve a comprobar en el servidor)
    if (esZonaAdmin(pathname) && token.role !== 'ADMIN') {
      if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    // Usuario baneado
    if (token.baneado) {
      if (pathname !== '/bloqueado') {
        return NextResponse.redirect(new URL('/bloqueado', req.url))
      }
      return NextResponse.next()
    }

    // Regla única (src/lib/acceso.ts). El flag de temporada gratuita no se toma del JWT, que puede
    // estar desfasado: solo se consulta cuando el token no da acceso por sí solo.
    const accesoSinFlag = tieneAcceso({ role: token.role, baneado: false, suscripcionActiva: !!token.hasSuscripcion, temporadaGratuita: false })
    if (accesoSinFlag) return NextResponse.next()

    // Sin acceso propio: /planes (para suscribirse) y su perfil (verificar email, descargar sus datos o
    // eliminar la cuenta son derechos que no dependen de pagar) siguen abiertos sin consultar el flag
    if (pathname.startsWith('/planes')) return NextResponse.next()
    if (pathname === '/perfil' || pathname === `/perfil/${token.id}`) return NextResponse.next()
    if (pathname.startsWith('/api/perfil') || pathname === '/api/actividad/vista') return NextResponse.next()

    const temporadaGratuita = await leerFlagTemporadaGratuita()
    if (temporadaGratuita === null) {
      diagAcceso(`middleware ${pathname}`, { role: token.role, suscripcionActiva: !!token.hasSuscripcion }, 'error_flag')
      if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'No se pudo comprobar el acceso', code: 'ERROR_ACCESO' }, { status: 503 })
      return NextResponse.rewrite(new URL('/acceso-error', req.url))
    }
    const datos = { role: token.role, baneado: false, suscripcionActiva: false, temporadaGratuita }
    if (tieneAcceso(datos)) {
      diagAcceso(`middleware ${pathname}`, datos, 'permitido_temporada')
      return NextResponse.next()
    }
    diagAcceso(`middleware ${pathname}`, datos, 'redirect_landing')

    // Sin suscripción ni temporada gratuita → landing
    return NextResponse.redirect(new URL('/', req.url))
  },
  {
    secret: process.env.NEXTAUTH_SECRET ?? process.env.SECRET,
    callbacks: {
      // withAuth llama a este callback para decidir si ejecutar el middleware
      // Devolver true siempre para que nuestro middleware tome el control
      authorized: () => true,
    },
  }
)

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
