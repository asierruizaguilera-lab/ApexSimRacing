import { NextRequest, NextResponse } from 'next/server'
import { buscarCodigoValido, DESCUENTO_REFERIDO_PCT } from '@/lib/referidos'
import { validarQuery, z } from '@/lib/validacion'

const Consulta = z.object({ codigo: z.string().max(40).default('') })

export const dynamic = 'force-dynamic'

// Público: se usa en el formulario de registro antes de tener cuenta
export async function GET(req: NextRequest) {
  const q = validarQuery(req.nextUrl.searchParams, Consulta)
  if (!q.ok) return NextResponse.json({ valido: false })
  const codigo = q.data.codigo
  if (!codigo.trim()) return NextResponse.json({ valido: false })

  const encontrado = await buscarCodigoValido(codigo)
  if (!encontrado) return NextResponse.json({ valido: false })

  return NextResponse.json({
    valido: true,
    codigo: encontrado.codigo,
    descuento: DESCUENTO_REFERIDO_PCT,
    creador: encontrado.creadoPor.username,
  })
}
