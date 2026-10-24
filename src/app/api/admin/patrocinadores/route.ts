import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'
import type { UbicacionPatrocinador } from '@prisma/client'
import { validarBody, validarForm } from '@/lib/validacion'
import { Patrocinador, PatrocinadorForm, validarLogo, parsearUbicaciones } from '@/lib/patrocinadores'

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
  let nombre: string | undefined, descripcion: string | null, linkExterno: string | null,
    ubicaciones: UbicacionPatrocinador[], activo: boolean | undefined, esColaborador: boolean | undefined,
    orden: number | undefined, logoUrl: string | null = null

  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData()
    const v = validarForm(form, PatrocinadorForm)
    if (!v.ok) return v.res
    nombre = v.data.nombre?.trim()
    descripcion = v.data.descripcion?.trim() || null
    linkExterno = v.data.linkExterno?.trim() || null
    const ubic = parsearUbicaciones(v.data.ubicaciones)
    if (!ubic) return NextResponse.json({ error: 'Ubicaciones inválidas' }, { status: 400 })
    ubicaciones = ubic
    activo = v.data.activo === 'true'
    esColaborador = v.data.esColaborador === 'true'
    orden = parseInt(v.data.orden ?? '') || 0

    const file = form.get('logo')
    if (file instanceof File && file.size > 0) {
      const logo = validarLogo(file)
      if (!logo.ok) return NextResponse.json({ error: logo.error }, { status: 400 })
      const buffer = Buffer.from(await file.arrayBuffer())
      const dir = path.join(process.cwd(), 'public', 'patrocinadores')
      fs.mkdirSync(dir, { recursive: true })
      const filename = `${Date.now()}.${logo.ext}`
      fs.writeFileSync(path.join(dir, filename), buffer)
      logoUrl = `/patrocinadores/${filename}`
    } else {
      logoUrl = v.data.logoUrl?.trim() || null
    }
  } else {
    const v = await validarBody(req, Patrocinador)
    if (!v.ok) return v.res
    nombre = v.data.nombre
    descripcion = v.data.descripcion || null
    linkExterno = v.data.linkExterno || null
    logoUrl = v.data.logoUrl || null
    ubicaciones = v.data.ubicaciones ?? []
    activo = v.data.activo
    esColaborador = v.data.esColaborador
    orden = v.data.orden
  }

  if (!nombre || nombre.length > 120) return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })

  const patrocinador = await prisma.patrocinador.create({
    data: { nombre, descripcion, logoUrl, linkExterno, ubicaciones, activo: activo ?? true, esColaborador: esColaborador ?? false, orden: orden ?? 0 },
  })
  return NextResponse.json(patrocinador, { status: 201 })
}
