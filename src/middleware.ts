import { withAuth, NextRequestWithAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

// Rutas públicas que no requieren ni login ni suscripción
const PUBLIC_PATHS = [
  '/', '/login', '/register', '/registro', '/bloqueado',
  '/recuperar', '/restablecer', '/verificar-email', '/privacidad', '/terminos', '/cookies',
  '/api/health',
]
const PUBLIC_PREFIXES = ['/api/auth', '/api/paypal', '/api/cron', '/api/patrocinadores', '/api/referidos/validar', '/_next', '/favicon']

function esZonaAdmin(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/api/admin')
}

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

    // Admin siempre tiene acceso (aunque no tenga suscripción en BD)
    if (token.role === 'ADMIN') return NextResponse.next()

    // Modo "Temporada gratuita": cualquier usuario registrado tiene acceso completo sin suscripción
    if (token.temporadaGratuita) return NextResponse.next()

    // Sin suscripción activa → redirigir a landing
    if (!token.hasSuscripcion) {
      // Permitir acceso a /planes para que puedan suscribirse, y a su perfil (verificar email,
      // descargar sus datos o eliminar la cuenta son derechos que no dependen de pagar)
      if (pathname.startsWith('/planes')) return NextResponse.next()
      if (pathname === '/perfil' || pathname === `/perfil/${token.id}`) return NextResponse.next()
      if (pathname.startsWith('/api/perfil') || pathname === '/api/actividad/vista') return NextResponse.next()
      return NextResponse.redirect(new URL('/', req.url))
    }

    return NextResponse.next()
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
