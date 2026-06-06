import { withAuth, NextRequestWithAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

// Rutas públicas que no requieren ni login ni suscripción
const PUBLIC_PATHS = ['/', '/login', '/register', '/registro', '/bloqueado']
const PUBLIC_PREFIXES = ['/api/auth', '/api/paypal', '/api/cron', '/_next', '/favicon']

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true
  return PUBLIC_PREFIXES.some(p => pathname.startsWith(p))
}

export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    if (isPublic(pathname)) return NextResponse.next()

    if (!token) {
      return NextResponse.redirect(new URL('/', req.url))
    }

    // Usuario baneado
    if (token.baneado) {
      if (pathname !== '/bloqueado') {
        return NextResponse.redirect(new URL('/bloqueado', req.url))
      }
      return NextResponse.next()
    }

    // Admin siempre tiene acceso (aunque no tenga suscripción en BD)
    if (token.role === 'ADMIN') return NextResponse.next()

    // Sin suscripción activa → redirigir a landing
    if (!token.hasSuscripcion) {
      // Permitir acceso a /planes para que puedan suscribirse
      if (pathname.startsWith('/planes')) return NextResponse.next()
      return NextResponse.redirect(new URL('/', req.url))
    }

    return NextResponse.next()
  },
  {
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
