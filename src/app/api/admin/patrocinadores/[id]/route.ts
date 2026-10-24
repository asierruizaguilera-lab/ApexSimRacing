import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'
import type { Prisma } from '@prisma/client'
import { validarBody, validarForm } from '@/lib/validacion'
import { Patrocinador, PatrocinadorForm, validarLogo, parsearUbicaciones } from '@/lib/patrocinadores'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const contentType = req.headers.get('content-type') || ''
  let updates: Prisma.PatrocinadorUpdateInput = {}

  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData()
    const v = validarForm(form, PatrocinadorForm)
    if (!v.ok) return v.res
    const d = v.data
    if (d.nombre !== undefined) {
      if (!d.nombre.trim() || d.nombre.length > 120) return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
      updates.nombre = d.nombre.trim()
    }
    if (d.descripcion !== undefined)   updates.descripcion   = d.descripcion.trim() || null
    if (d.linkExterno !== undefined)   updates.linkExterno   = d.linkExterno.trim() || null
    if (d.ubicaciones !== undefined) {
      const ubic = parsearUbicaciones(d.ubicaciones)
      if (!ubic) return NextResponse.json({ error: 'Ubicaciones inválidas' }, { status: 400 })
      updates.ubicaciones = ubic
    }
    if (d.activo !== undefined)        updates.activo        = d.activo === 'true'
    if (d.esColaborador !== undefined) updates.esColaborador = d.esColaborador === 'true'
    if (d.orden !== undefined)         updates.orden         = parseInt(d.orden) || 0

    const file = form.get('logo')
    if (file instanceof File && file.size > 0) {
      const logo = validarLogo(file)
      if (!logo.ok) return NextResponse.json({ error: logo.error }, { status: 400 })
      const buffer = Buffer.from(await file.arrayBuffer())
      const dir = path.join(process.cwd(), 'public', 'patrocinadores')
      fs.mkdirSync(dir, { recursive: true })
      // El nombre del fichero sale del id del patrocinador: se exige que sea un id simple (sin rutas)
      if (!/^[a-zA-Z0-9_-]+$/.test(params.id)) return NextResponse.json({ error: 'Id inválido' }, { status: 400 })
      const filename = `${params.id}.${logo.ext}`
      fs.writeFileSync(path.join(dir, filename), buffer)
      updates.logoUrl = `/patrocinadores/${filename}`
    } else if (d.logoUrl !== undefined) {
      updates.logoUrl = d.logoUrl.trim() || null
    }
  } else {
    const v = await validarBody(req, Patrocinador.partial())
    if (!v.ok) return v.res
    updates = { ...v.data }
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
  if (existing?.logoUrl?.startsWith('/patrocinadores/') && !existing.logoUrl.includes('..')) {
    const filePath = path.join(process.cwd(), 'public', existing.logoUrl)
    try { fs.unlinkSync(filePath) } catch {}
  }

  await prisma.patrocinador.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
