import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { crearCodigoParaUsuario } from '@/lib/referidos'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Un único código activo por usuario: si ya lo tiene, se devuelve el mismo
  const existente = await prisma.codigoReferido.findFirst({
    where: { creadoPorId: session.user.id, activo: true },
  })
  if (existente) return NextResponse.json(existente)

  try {
    const codigo = await crearCodigoParaUsuario(session.user.id)
    return NextResponse.json(codigo, { status: 201 })
  } catch (err) {
    console.error('[Referidos generar]', err)
    return NextResponse.json({ error: 'No se pudo generar el código' }, { status: 500 })
  }
}
