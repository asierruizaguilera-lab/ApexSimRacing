import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const patrocinadores = await prisma.patrocinador.findMany({
    orderBy: [{ orden: 'asc' }, { creadoEn: 'asc' }],
  })
  return NextResponse.json(patrocinadores)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const contentType = req.headers.get('content-type') || ''
  let nombre: string, descripcion: string | null, linkExterno: string | null,
    ubicaciones: string[], activo: boolean, orden: number, logoUrl: string | null = null

  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData()
    nombre = (form.get('nombre') as string)?.trim()
    descripcion = (form.get('descripcion') as string)?.trim() || null
    linkExterno = (form.get('linkExterno') as string)?.trim() || null
    ubicaciones = JSON.parse((form.get('ubicaciones') as string) || '[]')
    activo = form.get('activo') === 'true'
    orden = parseInt(form.get('orden') as string) || 0

    const file = form.get('logo') as File | null
    if (file && file.size > 0) {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
      const buffer = Buffer.from(await file.arrayBuffer())
      const dir = path.join(process.cwd(), 'public', 'patrocinadores')
      fs.mkdirSync(dir, { recursive: true })
      const filename = `${Date.now()}.${ext}`
      fs.writeFileSync(path.join(dir, filename), buffer)
      logoUrl = `/patrocinadores/${filename}`
    } else {
      logoUrl = (form.get('logoUrl') as string)?.trim() || null
    }
  } else {
    const body = await req.json()
    ;({ nombre, descripcion, linkExterno, ubicaciones, activo, orden, logoUrl } = body)
    descripcion = descripcion || null
    linkExterno = linkExterno || null
    logoUrl = logoUrl || null
  }

  if (!nombre) return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })

  const patrocinador = await prisma.patrocinador.create({
    data: { nombre, descripcion, logoUrl, linkExterno, ubicaciones: ubicaciones as any, activo: activo ?? true, orden: orden ?? 0 },
  })
  return NextResponse.json(patrocinador, { status: 201 })
}
