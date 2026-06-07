import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: 'jwt' },
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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { suscripcion: { select: { estado: true, fechaExpiracionManual: true } } },
        })

        if (!user || !user.password) return null

        const valid = await bcrypt.compare(credentials.password, user.password)
        if (!valid) return null

        const hasSuscripcion = esAccesoActivo(user.suscripcion)

        return {
          id: user.id,
          email: user.email,
          name: user.username,
          image: user.avatar,
          role: user.role,
          baneado: user.baneado,
          hasSuscripcion,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.username = user.name ?? ''
        token.baneado = (user as any).baneado ?? false
        token.hasSuscripcion = (user as any).hasSuscripcion ?? false
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
      }
      return session
    },
  },
}

function esAccesoActivo(suscripcion: { estado: string; fechaExpiracionManual: Date | null } | null): boolean {
  if (!suscripcion) return false
  if (suscripcion.estado === 'CANCELADA' || suscripcion.estado === 'EXPIRADA') return false
  if (suscripcion.fechaExpiracionManual && new Date(suscripcion.fechaExpiracionManual) < new Date()) return false
  return suscripcion.estado === 'ACTIVA' || suscripcion.estado === 'GRATUITA'
}

async function refreshSuscripcionToken(token: any) {
  try {
    const user = await prisma.user.findUnique({
      where: { email: token.email as string },
      select: {
        id: true,
        baneado: true,
        suscripcion: { select: { estado: true, fechaExpiracionManual: true } },
      },
    })
    if (user) {
      token.id = user.id
      token.baneado = user.baneado
      token.hasSuscripcion = esAccesoActivo(user.suscripcion)
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
    lastChecked?: number
  }
}
