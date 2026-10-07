import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getConversaciones } from '@/lib/mensajes'
import { MensajesInbox } from '@/components/mensajes/MensajesInbox'

export const metadata = { title: 'Mensajes' }
export const dynamic = 'force-dynamic'

export default async function MensajesPage() {
  const session = await getServerSession(authOptions)
  const conversaciones = await getConversaciones(session!.user.id)
  return <MensajesInbox iniciales={conversaciones} />
}
