import { getServerSession } from 'next-auth'
import { notFound, redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ConversacionClient } from '@/components/mensajes/ConversacionClient'

export const metadata = { title: 'Mensajes' }
export const dynamic = 'force-dynamic'

export default async function ConversacionPage({ params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions)
  const yo = session!.user.id
  if (params.userId === yo) redirect('/mensajes')

  const otro = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true, username: true, avatar: true, role: true, baneado: true },
  })
  if (!otro) notFound()

  const mensajes = await prisma.mensajeDirecto.findMany({
    where: {
      OR: [
        { remitenteId: yo, destinatarioId: otro.id },
        { remitenteId: otro.id, destinatarioId: yo },
      ],
    },
    orderBy: { creadoEn: 'desc' },
    take: 1000,
  })

  return (
    <ConversacionClient
      yo={yo}
      otro={{ id: otro.id, username: otro.username, avatar: otro.avatar, role: otro.role, baneado: otro.baneado }}
      iniciales={mensajes.reverse().map(m => ({ ...m, creadoEn: m.creadoEn.toISOString() }))}
    />
  )
}
