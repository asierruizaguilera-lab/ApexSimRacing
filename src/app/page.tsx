import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { LandingClient } from '@/components/landing/LandingClient'
import { ErrorAcceso } from '@/components/acceso/ErrorAcceso'
import { ErrorLecturaFlag, getAccesoSesion } from '@/lib/accesoServidor'
import { diagAcceso } from '@/lib/acceso'

export default async function LandingPage() {
  const session = await getServerSession(authOptions)

  if (session?.user?.id) {
    // Misma regla y datos que el middleware; el flag se lee fresco de la BD, no del JWT
    let acceso: boolean
    const datos = { role: session.user.role, baneado: session.user.baneado, suscripcionActiva: !!session.user.hasSuscripcion }
    try {
      const r = await getAccesoSesion(session.user, 'landing')
      acceso = r.acceso
      diagAcceso('landing', { ...datos, temporadaGratuita: r.temporadaGratuita }, acceso ? 'redirect_dashboard' : 'landing')
    } catch (e) {
      if (e instanceof ErrorLecturaFlag) {
        diagAcceso('landing', datos, 'error_flag')
        return <ErrorAcceso />
      }
      throw e
    }
    if (acceso) redirect('/dashboard')
    // Logueado sin acceso: ve la landing (desde ahí puede ir a /planes). Nunca se le fuerza a /planes.
  }

  return <LandingClient />
}
