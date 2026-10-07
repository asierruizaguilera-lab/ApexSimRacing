import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { esEliteActivo, getMembresia } from '@/lib/equipos'
import { CrearEquipoClient } from '@/components/equipos/CrearEquipoClient'

export const metadata = { title: 'Crear equipo' }

export default async function CrearEquipoPage() {
  const session = await getServerSession(authOptions)
  const userId = session!.user.id

  const membresia = await getMembresia(userId)
  if (membresia) redirect(`/equipos/${membresia.equipoId}`)

  const puede = session!.user.role === 'ADMIN' || (await esEliteActivo(userId))
  if (!puede) redirect('/planes')

  return <CrearEquipoClient />
}
