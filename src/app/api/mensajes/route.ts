import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getConversaciones } from '@/lib/mensajes'

export const dynamic = 'force-dynamic'

// Conversaciones del usuario ordenadas por último mensaje, con no leídos por conversación
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  return NextResponse.json(await getConversaciones(session.user.id))
}
