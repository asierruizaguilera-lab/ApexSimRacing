import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { AdminUsuariosClient } from '@/components/admin/AdminUsuariosClient'

export const metadata = { title: 'Gestión de Usuarios' }

export default async function AdminUsuariosPage() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') redirect('/dashboard')

  const usuarios = await prisma.user.findMany({
    orderBy: { fechaRegistro: 'desc' },
    select: {
      id: true,
      username: true,
      email: true,
      pais: true,
      role: true,
      baneado: true,
      motivoBan: true,
      fechaRegistro: true,
      suscripcion: {
        select: {
          id: true,
          plan: true,
          estado: true,
          precioMensual: true,
          esGratuita: true,
          fechaInicio: true,
          fechaRenovacion: true,
          fechaExpiracionManual: true,
          notasAdmin: true,
        },
      },
    },
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>
        <p className="text-apex-muted mt-1">Administra planes, accesos manuales y estado de cuentas</p>
      </div>
      <AdminUsuariosClient
        usuarios={usuarios.map(u => ({
          ...u,
          fechaRegistro: u.fechaRegistro.toISOString(),
          suscripcion: u.suscripcion
            ? {
                ...u.suscripcion,
                plan: u.suscripcion.plan as string,
                estado: u.suscripcion.estado as string,
                fechaInicio: u.suscripcion.fechaInicio.toISOString(),
                fechaRenovacion: u.suscripcion.fechaRenovacion.toISOString(),
                fechaExpiracionManual: u.suscripcion.fechaExpiracionManual?.toISOString() ?? null,
              }
            : null,
        }))}
      />
    </div>
  )
}
