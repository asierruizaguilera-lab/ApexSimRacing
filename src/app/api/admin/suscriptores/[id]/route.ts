import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { activarPlan } from '@/lib/suscripciones'
import { validarBody, z, plan } from '@/lib/validacion'

const Esquema = z.object({ plan })

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const v = await validarBody(req, Esquema)
  if (!v.ok) return v.res
  const { plan } = v.data

  // params.id es el userId
  await activarPlan(params.id, plan)

  return NextResponse.json({ ok: true })
}
