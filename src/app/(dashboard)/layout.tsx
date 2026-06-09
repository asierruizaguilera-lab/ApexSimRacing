import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { PatrocinadoresTopBar } from '@/components/layout/PatrocinadoresTopBar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const patrocinadores = await prisma.patrocinador.findMany({
    where: { activo: true },
    orderBy: [{ orden: 'asc' }, { creadoEn: 'asc' }],
    select: { id: true, nombre: true, logoUrl: true, linkExterno: true },
  })

  const topbarH = patrocinadores.length > 0 ? '2rem' : '0px'

  return (
    <div
      className="min-h-screen bg-apex-bg"
      style={{ '--topbar-height': topbarH } as React.CSSProperties}
    >
      <PatrocinadoresTopBar patrocinadores={patrocinadores} />
      <Sidebar />
      <Header />
      <main
        className="lg:ml-56 min-h-screen"
        style={{ paddingTop: 'calc(var(--topbar-height, 0px) + 3.5rem)' }}
      >
        <div className="p-4 lg:p-6 max-w-7xl mx-auto animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  )
}
