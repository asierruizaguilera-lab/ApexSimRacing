import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { AdminSyncSheetClient } from '@/components/admin/AdminSyncSheetClient'

export const metadata = { title: 'Sincronización Sheet' }

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1tQugc7od9EBUfd_-0D8scHx9dD8-2DiyFZO9AwMPPjw/edit#gid=0'

export default async function AdminSyncSheetPage() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') redirect('/dashboard')

  const historial = await prisma.syncLog.findMany({
    orderBy: { ejecutadoEn: 'desc' },
    take: 10,
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Sincronización Sheet</h1>
        <p className="text-apex-muted mt-1">Importa carreras automáticamente desde Google Sheets cada lunes a las 6:00 AM</p>
      </div>
      <AdminSyncSheetClient
        sheetUrl={SHEET_URL}
        historial={historial.map(h => ({ ...h, ejecutadoEn: h.ejecutadoEn.toISOString() }))}
      />
    </div>
  )
}
