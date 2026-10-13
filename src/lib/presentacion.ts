const EMBED_PARAMS = 'start=false&loop=false&delayms=3000'

// Convierte un link de Google Slides (/edit, /preview, /pub?...) al formato embed para un iframe.
// Los archivos de Drive (/file/d/<id>/view) se pasan a /preview, que es su formato embebible.
// Cualquier otro link se devuelve tal cual.
export function getPresentacionEmbedUrl(link: string): string {
  const url = link.trim()
  const slides = url.match(/^(https:\/\/docs\.google\.com\/presentation\/d\/(?:e\/)?[^/?#]+)/)
  if (slides) return `${slides[1]}/embed?${EMBED_PARAMS}`
  const drive = url.match(/^(https:\/\/drive\.google\.com\/file\/d\/[^/?#]+)/)
  if (drive) return `${drive[1]}/preview`
  return url
}
