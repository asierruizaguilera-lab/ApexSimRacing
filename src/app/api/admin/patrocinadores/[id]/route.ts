import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const contentType = req.headers.get('content-type') || ''
  let updates: any = {}

  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData()
    if (form.has('nombre'))      updates.nombre      = (form.get('nombre') as string).trim()
    if (form.has('descripcion')) updates.descripcion = (form.get('descripcion') as string).trim() || null
    if (form.has('linkExterno')) updates.linkExterno = (form.get('linkExterno') as string).trim() || null
    if (form.has('ubicaciones')) updates.ubicaciones = JSON.parse(form.get('ubicaciones') as string)
    if (form.has('activo'))      updates.activo      = form.get('activo') === 'true'
    if (form.has('orden'))       updates.orden       = parseInt(form.get('orden') as string) || 0

    const file = form.get('logo') as File | null
    if (file && file.size > 0) {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
      const buffer = Buffer.from(await file.arrayBuffer())
      const dir = path.join(process.cwd(), 'public', 'patrocinadores')
      fs.mkdirSync(dir, { recursive: true })
      const filename = `${params.id}.${ext}`
      fs.writeFileSync(path.join(dir, filename), buffer)
      updates.logoUrl = `/patrocinadores/${filename}`
    } else if (form.has('logoUrl')) {
      updates.logoUrl = (form.get('logoUrl') as string).trim() || null
    }
  } else {
    updates = await req.json()
    if (updates.logoUrl === '') updates.logoUrl = null
    if (updates.linkExterno === '') updates.linkExterno = null
    if (updates.descripcion === '') updates.descripcion = null
  }

  const patrocinador = await prisma.patrocinador.update({
    where: { id: params.id },
    data: updates,
  })
  return NextResponse.json(patrocinador)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  // Intentar borrar el logo si existe en /public/patrocinadores/
  const existing = await prisma.patrocinador.findUnique({ where: { id: params.id }, select: { logoUrl: true } })
  if (existing?.logoUrl?.startsWith('/patrocinadores/')) {
    const filePath = path.join(process.cwd(), 'public', existing.logoUrl)
    try { fs.unlinkSync(filePath) } catch {}
  }

  await prisma.patrocinador.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
