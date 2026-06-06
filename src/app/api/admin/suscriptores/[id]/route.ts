import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { activarPlan } from '@/lib/suscripciones'
import type { PlanSuscripcion } from '@prisma/client'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { plan } = await req.json()
  const validPlans: PlanSuscripcion[] = ['ROOKIE', 'AMATEUR', 'PRO', 'ELITE']
  if (!validPlans.includes(plan)) return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })

  // params.id es el userId
  await activarPlan(params.id, plan as PlanSuscripcion)

  return NextResponse.json({ ok: true })
}
