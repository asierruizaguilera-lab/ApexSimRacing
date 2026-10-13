/**
 * Asigna el link de presentación (Google Slides) a cada módulo de la Academia.
 * Ejecutar con: npm run update:academia-links
 * O en el arranque con RUN_UPDATE_ACADEMIA_LINKS=true (ver server.js), después del seed.
 *
 * Upsert por numeroModulo: si el módulo existe solo se actualiza linkPresentacion; si no existe
 * (BD sin seed) se crea publicado y sin vídeo. Los links se normalizan a /preview para que se
 * abran directamente en el navegador. Es idempotente.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const MODULOS = [
  { numeroModulo: '0', titulo: 'BIENVENIDA', link: 'https://docs.google.com/presentation/d/1qId2TBpEODAib5f7r5FYfpm7amynkRzR/preview' },
  { numeroModulo: '1.1', titulo: 'TÉCNICAS BASE DE VOLANTE', link: 'https://docs.google.com/presentation/d/14RL5nB2fmrqbqDf5nZQCIIurcionbEj7/preview' },
  { numeroModulo: '1.2', titulo: 'TÉCNICAS DE PIES', link: 'https://docs.google.com/presentation/d/1MS2GjEZCqqCv7C7Z-MKVqf0-gl_dDKr2/preview' },
  { numeroModulo: '1.3', titulo: 'TÉCNICAS DE VISIÓN Y POSICIÓN', link: 'https://docs.google.com/presentation/d/1C-To08bbovmNQDt5_ztjT4n29vbBgRvQ/preview' },
  { numeroModulo: '2', titulo: 'FRENADA', link: 'https://docs.google.com/presentation/d/1FFO-f6FQuQXn5uLu3rShP_MVULGmE3j3/preview' },
  { numeroModulo: '3', titulo: 'TRAZADA', link: 'https://docs.google.com/presentation/d/1nXt9tcHC1DWg7vzQVKjvM2iQ7XevezN3/preview' },
  { numeroModulo: '4', titulo: 'CÓMO FUNCIONA ASSETTO CORSA', link: 'https://docs.google.com/presentation/d/197LOqNg8a4y5SQSbLQuHNSHQ5IJgVtxu/preview' },
  { numeroModulo: '5', titulo: 'SETUPS', link: 'https://docs.google.com/presentation/d/1oyCBG2dEsVXxSG_KYgeIM3OB5a9aUqxZ/preview' },
  { numeroModulo: '6', titulo: 'TÉCNICAS DE CARRERA', link: 'https://docs.google.com/presentation/d/1c7ikdmbyEuWVnBggYWDmEfc0p1t9eKXn/preview' },
  { numeroModulo: '7', titulo: 'GESTIÓN MENTAL', link: 'https://docs.google.com/presentation/d/1fOV0OQ0Xk_-ayH5cS0HwYuLEWM-OSUpT/preview' },
  { numeroModulo: '8', titulo: 'PLAN Y PRIMER CAMPEONATO', link: 'https://docs.google.com/presentation/d/1NjSbaMZ6ebcatfX9uJ2PzJb2n0HDubMz/preview' },
]

// .../presentation/d/<id>/edit?usp=sharing (o /view, /pub...) → .../presentation/d/<id>/preview
function toPreview(url: string): string {
  const m = url.match(/^(https:\/\/docs\.google\.com\/presentation\/d\/[^/?#]+)/)
  return m ? `${m[1]}/preview` : url
}

async function main() {
  console.log('🔗 Links de presentaciones de la Academia\n')

  let actualizados = 0
  let creados = 0
  for (let orden = 0; orden < MODULOS.length; orden++) {
    const { numeroModulo, titulo, link } = MODULOS[orden]
    const linkPresentacion = toPreview(link)
    const existente = await prisma.clase.findFirst({ where: { numeroModulo }, select: { id: true } })
    if (existente) {
      await prisma.clase.update({ where: { id: existente.id }, data: { linkPresentacion } })
      actualizados++
    } else {
      await prisma.clase.create({
        data: { numeroModulo, titulo, linkPresentacion, orden, disciplina: 'CIRCUITO', youtubeUrl: null, publicada: true },
      })
      creados++
    }
    console.log(`   ✅ Módulo ${numeroModulo} — ${titulo}`)
  }

  console.log(`\n✅ ${actualizados} módulos actualizados, ${creados} creados`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
