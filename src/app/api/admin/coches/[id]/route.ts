import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Normaliza campos opcionales: '' → null. Las URLs deben ser http(s) (se renderizan en href/src).
function opcional(v: unknown): string | null | undefined {
  if (v === undefined) return undefined
  if (typeof v !== 'string' || v.trim() === '') return null
  return v.trim()
}
function urlValida(v: string | null | undefined) {
  return v == null || /^https?:\/\//i.test(v) || v.startsWith('/')
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body = await req.json()
  const { nombre, disciplina, planMinimo, imagen, activo } = body
  const descripcion = opcional(body.descripcion)
  const modAC = opcional(body.modAC)
  const imagenUrl = opcional(body.imagenUrl)
  const linkDescarga = opcional(body.linkDescarga)
  if (!urlValida(imagenUrl) || !urlValida(linkDescarga)) {
    return NextResponse.json({ error: 'Las URLs deben empezar por http:// o https://' }, { status: 400 })
  }

  const coche = await prisma.coche.update({
    where: { id: params.id },
    data: { nombre, disciplina, planMinimo, descripcion, imagen, imagenUrl, linkDescarga, modAC, activo },
  })
  return NextResponse.json(coche)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  await prisma.coche.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
