import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Disciplina, PlanSuscripcion } from '@prisma/client'

// Validación de entrada con Zod para las rutas API. Patrón de uso:
//   const v = await validarBody(req, Esquema); if (!v.ok) return v.res
//   const { campo } = v.data

type Resultado<T> = { ok: true; data: T } | { ok: false; res: NextResponse }

function respuestaInvalida(error: z.ZodError) {
  const primero = error.issues[0]
  const campo = primero?.path.join('.')
  return NextResponse.json(
    { error: primero ? `Datos inválidos${campo ? ` (${campo})` : ''}: ${primero.message}` : 'Datos inválidos' },
    { status: 400 }
  )
}

export async function validarBody<T extends z.ZodTypeAny>(req: Request, esquema: T): Promise<Resultado<z.infer<T>>> {
  let json: unknown
  try {
    json = await req.json()
  } catch {
    json = {}
  }
  const r = esquema.safeParse(json)
  return r.success ? { ok: true, data: r.data } : { ok: false, res: respuestaInvalida(r.error) }
}

export function validarQuery<T extends z.ZodTypeAny>(params: URLSearchParams, esquema: T): Resultado<z.infer<T>> {
  const r = esquema.safeParse(Object.fromEntries(params))
  return r.success ? { ok: true, data: r.data } : { ok: false, res: respuestaInvalida(r.error) }
}

/** Para formularios multipart: valida los campos de texto (los ficheros se tratan aparte). */
export function validarForm<T extends z.ZodTypeAny>(form: FormData, esquema: T): Resultado<z.infer<T>> {
  const campos: Record<string, string> = {}
  form.forEach((v, k) => { if (typeof v === 'string') campos[k] = v })
  const r = esquema.safeParse(campos)
  return r.success ? { ok: true, data: r.data } : { ok: false, res: respuestaInvalida(r.error) }
}

// ── Piezas reutilizables ────────────────────────────────────────────────────────────────────────

export const id = z.string().min(1).max(64)

/** Texto con longitud máxima; '' se mantiene (cada ruta decide si lo convierte en null). */
export const texto = (max: number) => z.string().max(max)

/** URL que se renderiza en src/href: http(s) o ruta local. Acepta '' / null para borrar. */
export const urlSegura = z
  .string()
  .trim()
  .max(2000)
  .refine(v => v === '' || /^https?:\/\//i.test(v) || (v.startsWith('/') && !v.startsWith('//')), {
    message: 'Debe ser una URL http(s)',
  })

/** Números que llegan como number o como string desde formularios ('' = ausente). */
export const numeroFlexible = z
  .union([z.number(), z.string().max(20)])
  .transform((v, ctx) => {
    if (v === '') return null
    const n = typeof v === 'number' ? v : Number(v)
    if (!Number.isFinite(n)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Debe ser un número' })
      return z.NEVER
    }
    return n
  })

export const fecha = z.union([z.string().max(40), z.number()]).refine(v => !isNaN(new Date(v).getTime()), {
  message: 'Fecha inválida',
})

export const PASSWORD_MIN = 10
export const password = z.string().min(PASSWORD_MIN, `Mínimo ${PASSWORD_MIN} caracteres`).max(200)
export const email = z.string().trim().toLowerCase().email('Email inválido').max(254)

export const plan = z.nativeEnum(PlanSuscripcion)
export const disciplina = z.nativeEnum(Disciplina)

export { z }
