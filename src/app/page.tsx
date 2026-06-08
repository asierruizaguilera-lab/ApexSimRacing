import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { LandingClient } from '@/components/landing/LandingClient'

export default async function LandingPage() {
  const session = await getServerSession(authOptions)

  if (session?.user?.hasSuscripcion) {
    redirect('/dashboard')
  }

  if (session?.user) {
    redirect('/planes')
  }

  return <LandingClient />
}
