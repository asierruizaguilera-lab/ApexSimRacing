import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validarBody, z, disciplina, plan } from '@/lib/validacion'

const Coche = z.object({
  nombre: z.string().trim().min(1).max(120),
  disciplina,
  planMinimo: plan,
  imagen: z.string().max(500).nullable().optional(),
  descripcion: z.string().max(2000).nullable().optional(),
  modAC: z.string().max(500).nullable().optional(),
  imagenUrl: z.string().max(2000).nullable().optional(),
  linkDescarga: z.string().max(2000).nullable().optional(),
  activo: z.boolean().optional(),
})

// Normaliza campos opcionales: '' → null. Las URLs deben ser http(s) (se renderizan en href/src).
function opcional(v: unknown): string | null | undefined {
  if (v === undefined) return undefined
  if (typeof v !== 'string' || v.trim() === '') return null
  return v.trim()
}
function urlValida(v: string | null | undefined) {
  return v == null || /^https?:\/\//i.test(v) || v.startsWith('/')
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const coches = await prisma.coche.findMany({
    orderBy: [{ planMinimo: 'asc' }, { disciplina: 'asc' }],
    include: { _count: { select: { desbloqueos: true } } },
  })
  return NextResponse.json(coches)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const v = await validarBody(req, Coche)
  if (!v.ok) return v.res
  const body = v.data
  const { nombre, disciplina, planMinimo, imagen } = body
  if (!nombre || !disciplina || !planMinimo) {
    return NextResponse.json({ error: 'Nombre, disciplina y plan son requeridos' }, { status: 400 })
  }
  const descripcion = opcional(body.descripcion)
  const modAC = opcional(body.modAC)
  const imagenUrl = opcional(body.imagenUrl)
  const linkDescarga = opcional(body.linkDescarga)
  if (!urlValida(imagenUrl) || !urlValida(linkDescarga)) {
    return NextResponse.json({ error: 'Las URLs deben empezar por http:// o https://' }, { status: 400 })
  }

  const coche = await prisma.coche.create({
    data: { nombre, disciplina, planMinimo, descripcion, imagen, imagenUrl, linkDescarga, modAC, activo: true },
  })
  return NextResponse.json(coche, { status: 201 })
}
