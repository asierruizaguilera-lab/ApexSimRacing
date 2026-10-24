import { UbicacionPatrocinador } from '@prisma/client'
import { z, urlSegura } from './validacion'

// Validación común de las rutas admin de patrocinadores (JSON y multipart)

export const Patrocinador = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(120),
  descripcion: z.string().max(2000).nullable().optional(),
  linkExterno: urlSegura.nullable().optional(),
  logoUrl: urlSegura.nullable().optional(),
  ubicaciones: z.array(z.nativeEnum(UbicacionPatrocinador)).max(10).optional(),
  activo: z.boolean().optional(),
  esColaborador: z.boolean().optional(),
  orden: z.number().int().min(-10000).max(10000).optional(),
})

// Campos de texto del multipart (todos llegan como string)
export const PatrocinadorForm = z.object({
  nombre: z.string().optional(),
  descripcion: z.string().max(2000).optional(),
  linkExterno: urlSegura.optional(),
  logoUrl: urlSegura.optional(),
  ubicaciones: z.string().max(500).optional(),
  activo: z.string().optional(),
  esColaborador: z.string().optional(),
  orden: z.string().max(10).optional(),
})

const EXT_LOGO = ['png', 'jpg', 'jpeg', 'webp', 'gif']
const MAX_LOGO = 2 * 1024 * 1024

/** Logos subidos a /public: solo imágenes rasterizadas (nada de SVG/HTML, que se servirían en el mismo origen). */
export function validarLogo(file: File): { ok: true; ext: string } | { ok: false; error: string } {
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  if (!EXT_LOGO.includes(ext) || !file.type.startsWith('image/') || file.type.includes('svg')) {
    return { ok: false, error: 'Formato de logo no permitido (png, jpg, webp o gif)' }
  }
  if (file.size > MAX_LOGO) return { ok: false, error: 'El logo no puede superar 2 MB' }
  return { ok: true, ext }
}

export function parsearUbicaciones(v: string | undefined): UbicacionPatrocinador[] | null {
  try {
    const r = z.array(z.nativeEnum(UbicacionPatrocinador)).max(10).safeParse(JSON.parse(v || '[]'))
    return r.success ? r.data : null
  } catch {
    return null
  }
}
