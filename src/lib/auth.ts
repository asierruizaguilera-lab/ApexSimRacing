import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import { leerTemporadaGratuita } from './accesoServidor'
import { esAccesoActivo } from './acceso'
import { logActividad, datosCliente } from './actividad'
import { LIMITES, bloqueado, consumir, reiniciar } from './rateLimit'

const SIETE_DIAS_S = 7 * 24 * 60 * 60

// [DIAG] temporal: motivo del rechazo del login, sin email, IP ni contraseña. QUITAR tras diagnosticar.
function diagLogin(motivo: string, extra: Record<string, string | boolean> = {}) {
  const resto = Object.entries(extra).map(([k, v]) => ` ${k}=${v}`).join('')
  console.log(`[DIAG] login rechazado: motivo=${motivo}${resto}`)
}

/** Formato del hash guardado ("$2a$12", "$2b$10"…) u "otro": detecta contraseñas sin hashear. No revela nada útil. */
function formatoHash(hash: string): string {
  const m = /^\$2[abxy]\$\d{2}\$/.exec(hash)
  return m && hash.length === 60 ? m[0].slice(0, -1) : 'otro'
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  secret: process.env.NEXTAUTH_SECRET ?? process.env.SECRET,
  // Sesión de 7 días. server.js además la corta a los 7 días desde el login aunque se renueve (authTime).
  session: { strategy: 'jwt', maxAge: SIETE_DIAS_S },
  jwt: { maxAge: SIETE_DIAS_S },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials, req) {
        // Sin validación de longitud mínima: esa regla (PASSWORD_MIN) solo aplica a registro y cambio de contraseña
        if (typeof credentials?.email !== 'string' || typeof credentials?.password !== 'string') { diagLogin('credenciales_no_string'); return null }
        const email = credentials.email.trim().toLowerCase().slice(0, 254)
        if (!email || !credentials.password || credentials.password.length > 200) { diagLogin('formato_invalido'); return null }
        const cliente = datosCliente(req as any)

        // 5 fallos en 15 min por IP + email. La clave solo vive en memoria (no se guarda el email en logs).
        const claveRate = `login:${cliente.ip ?? '?'}:${email}`
        if (bloqueado(claveRate, LIMITES.loginFallido)) {
          logActividad({ tipo: 'SEGURIDAD', estado: 429, ruta: '/api/auth/callback/credentials', ...cliente, detalle: { motivo: 'rate_limit_login' } })
          diagLogin('rate_limit', { sinIp: !cliente.ip })
          throw new Error('RATE_LIMIT')
        }

        // El email intentado no se guarda: si no existe la cuenta, solo queda el motivo
        const fallido = (motivo: string, userId?: string, extra: Record<string, string | boolean> = {}) => {
          consumir(claveRate, LIMITES.loginFallido)
          diagLogin(motivo, extra)
          logActividad({ tipo: 'LOGIN_FALLIDO', userId, ruta: '/api/auth/callback/credentials', metodo: 'POST', ...cliente, detalle: { motivo } })
          return null
        }

        const user = await prisma.user.findFirst({
          where: { email: { equals: email, mode: 'insensitive' } },
          include: { suscripcion: { select: { estado: true, fechaExpiracionManual: true } } },
        })

        if (!user) return fallido('usuario_inexistente')
        const esAdmin = user.role === 'ADMIN'
        if (user.eliminadoEn) return fallido('cuenta_eliminada', user.id, { admin: esAdmin })
        if (!user.password) return fallido('sin_password', user.id, { admin: esAdmin })

        // Mismo bcryptjs que registro/restablecer (coste 12). Los baneados sí entran: el middleware los lleva a /bloqueado.
        const valid = await bcrypt.compare(credentials.password, user.password)
        if (!valid) return fallido('password_incorrecta', user.id, { admin: esAdmin, hash: formatoHash(user.password) })

        reiniciar(claveRate)
        const hasSuscripcion = esAccesoActivo(user.suscripcion)
        // Si falla se registra como [SEGURIDAD]; el middleware vuelve a consultar el flag, así que no atrapa a nadie
        const temporadaGratuita = await leerTemporadaGratuita('login').catch(() => false)

        logActividad({
          tipo: 'LOGIN_OK',
          userId: user.id,
          ruta: '/api/auth/callback/credentials',
          metodo: 'POST',
          ...cliente,
          ...(user.baneado ? { detalle: { baneado: true } } : {}),
        })

        return {
          id: user.id,
          email: user.email,
          name: user.username,
          image: user.avatar,
          role: user.role,
          baneado: user.baneado,
          hasSuscripcion,
          temporadaGratuita,
        }
      },
    }),
  ],
  events: {
    async signOut({ token }) {
      logActividad({ tipo: 'LOGOUT', userId: (token?.id as string | undefined) ?? null })
    },
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.username = user.name ?? ''
        token.baneado = (user as any).baneado ?? false
        token.hasSuscripcion = (user as any).hasSuscripcion ?? false
        token.temporadaGratuita = (user as any).temporadaGratuita ?? false
        // Momento del login: no cambia al renovar la sesión. server.js lo usa para el límite absoluto de 7 días
        // y para invalidar sesiones anteriores a un restablecimiento de contraseña.
        token.authTime = Date.now()
      }

      if (trigger === 'update' && session) {
        token.username = session.username
        token.image = session.image
      }

      const CINCO_MINUTOS = 5 * 60 * 1000
      const necesitaRefresh = !token.lastChecked ||
        Date.now() - (token.lastChecked as number) > CINCO_MINUTOS

      if (token.id && necesitaRefresh) {
        await refreshSuscripcionToken(token)
      }

      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.username = token.username as string
        session.user.baneado = token.baneado as boolean
        session.user.hasSuscripcion = token.hasSuscripcion as boolean
        session.user.temporadaGratuita = !!token.temporadaGratuita
      }
      return session
    },
  },
}

async function refreshSuscripcionToken(token: any) {
  try {
    const [user, temporadaGratuita] = await Promise.all([prisma.user.findUnique({
      where: { email: token.email as string },
      select: {
        id: true,
        baneado: true,
        suscripcion: { select: { estado: true, fechaExpiracionManual: true } },
      },
    }), leerTemporadaGratuita('refresh-jwt').catch(() => null)])
    if (user) {
      token.id = user.id
      token.baneado = user.baneado
      token.hasSuscripcion = esAccesoActivo(user.suscripcion)
      // Fallo al leer el flag (ya registrado como [SEGURIDAD]): se conserva el valor anterior
      if (temporadaGratuita !== null) token.temporadaGratuita = temporadaGratuita
      token.lastChecked = Date.now()
    }
  } catch {}
}

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      image?: string | null
      role: string
      username: string
      baneado: boolean
      hasSuscripcion: boolean
      temporadaGratuita: boolean
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    username: string
    baneado: boolean
    hasSuscripcion: boolean
    temporadaGratuita?: boolean
    lastChecked?: number
    authTime?: number
  }
}
