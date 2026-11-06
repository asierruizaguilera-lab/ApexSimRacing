import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { LandingClient } from '@/components/landing/LandingClient'
import { ErrorAcceso } from '@/components/acceso/ErrorAcceso'
import { ErrorLecturaFlag, getAccesoUsuario } from '@/lib/accesoServidor'

export default async function LandingPage() {
  const session = await getServerSession(authOptions)

  if (session?.user?.id) {
    // Acceso leído de la BD, no del JWT (puede estar desfasado respecto al modo temporada gratuita)
    let acceso: boolean
    try {
      acceso = (await getAccesoUsuario(session.user.id, 'landing')).acceso
    } catch (e) {
      if (e instanceof ErrorLecturaFlag) return <ErrorAcceso />
      throw e
    }
    if (acceso) redirect('/dashboard')
    // Logueado sin acceso: ve la landing (desde ahí puede ir a /planes). Nunca se le fuerza a /planes.
  }

  return <LandingClient />
}
