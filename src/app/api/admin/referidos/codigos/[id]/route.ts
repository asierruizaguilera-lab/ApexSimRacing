import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Activar / desactivar un código. Al activarlo se desactivan los demás del mismo usuario (uno activo a la vez).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { activo } = await req.json()
  const codigo = await prisma.codigoReferido.findUnique({ where: { id: params.id } })
  if (!codigo) return NextResponse.json({ error: 'Código no encontrado' }, { status: 404 })

  if (activo) {
    await prisma.$transaction([
      prisma.codigoReferido.updateMany({
        where: { creadoPorId: codigo.creadoPorId, activo: true, NOT: { id: codigo.id } },
        data: { activo: false },
      }),
      prisma.codigoReferido.update({ where: { id: codigo.id }, data: { activo: true } }),
    ])
  } else {
    await prisma.codigoReferido.update({ where: { id: codigo.id }, data: { activo: false } })
  }

  return NextResponse.json({ ok: true })
}
