import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { bloqueoSpamHasta } from '@/lib/chatSpam'

export const metadata = { title: 'Chat de Comunidad' }

export default async function ChatPage() {
  const session = await getServerSession(authOptions)

  // Últimos 100 mensajes de todos los canales
  const mensajes = await prisma.mensajeChat.findMany({
    where: { eliminado: false },
    orderBy: { creadoEn: 'desc' },
    take: 100,
    include: {
      user: { select: { id: true, username: true, avatar: true, role: true } },
    },
  })

  // Si el usuario recarga la página durante un bloqueo anti-spam, el contador sigue visible
  const bloqueadoHasta = session?.user && session.user.role !== 'ADMIN'
    ? await bloqueoSpamHasta(session.user.id)
    : null

  return (
    <div className="h-[calc(100vh-120px)]">
      <ChatWindow
        initialMessages={mensajes.reverse().map(m => ({
          ...m,
          creadoEn: m.creadoEn.toISOString(),
        }))}
        currentUser={session?.user ? {
          id: session.user.id,
          username: session.user.username || session.user.name || '',
          role: session.user.role,
        } : null}
        bloqueadoHastaInicial={bloqueadoHasta?.toISOString() ?? null}
      />
    </div>
  )
}
