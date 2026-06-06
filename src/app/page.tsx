import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { LandingClient } from '@/components/landing/LandingClient'

export default async function LandingPage() {
  const session = await getServerSession(authOptions)

  // Usuario con suscripción activa va al dashboard
  if (session?.user?.hasSuscripcion) {
    redirect('/dashboard')
  }

  return (
    <LandingClient
      isLoggedIn={!!session?.user}
      userId={session?.user?.id}
    />
  )
}
