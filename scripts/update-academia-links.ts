/**
 * Asigna el link de presentación (Google Slides nativo) a cada módulo de la Academia.
 * Ejecutar con: npm run update:academia-links
 * O en el arranque con RUN_UPDATE_ACADEMIA_LINKS=true (ver server.js), después del seed.
 *
 * Upsert por numeroModulo: si el módulo existe solo se actualiza linkPresentacion; si no existe
 * (BD sin seed) se crea publicado y sin vídeo. linkPresentacion guarda directamente el link
 * embed (/embed?start=false&loop=false&delayms=3000), el que usa el iframe. Es idempotente.
 */
import { PrismaClient } from '@prisma/client'
import { getPresentacionEmbedUrl } from '../src/lib/presentacion'

const prisma = new PrismaClient()

const MODULOS = [
  { numeroModulo: '0', titulo: 'BIENVENIDA', link: 'https://docs.google.com/presentation/d/1uF4oNOmjcV00Ufh5KQul6PPhYhpgqvI1Hu3kAaYCtpw/embed?start=false&loop=false&delayms=3000' },
  { numeroModulo: '1.1', titulo: 'TÉCNICAS BASE DE VOLANTE', link: 'https://docs.google.com/presentation/d/1U86DYcN211aeEJEfwBOTEv4GtOCsrnnUaVRnEgJ1WpY/embed?start=false&loop=false&delayms=3000' },
  { numeroModulo: '1.2', titulo: 'TÉCNICAS DE PIES', link: 'https://docs.google.com/presentation/d/13Q10v2Wchz5aDcHto0MbiepxVTBCcSH7M9Y8BnEutbk/embed?start=false&loop=false&delayms=3000' },
  { numeroModulo: '1.3', titulo: 'TÉCNICAS DE VISIÓN Y POSICIÓN', link: 'https://docs.google.com/presentation/d/1R1JOx0bBRncQ3VBKle_IzbL7qviEpWVFAMcBNez3kIA/embed?start=false&loop=false&delayms=3000' },
  { numeroModulo: '2', titulo: 'FRENADA', link: 'https://docs.google.com/presentation/d/1furabOQKHEYeX3dNcC3xO27lIVkckCLw1Zds4Q6r1TQ/embed?start=false&loop=false&delayms=3000' },
  { numeroModulo: '3', titulo: 'TRAZADA', link: 'https://docs.google.com/presentation/d/1sWmLbS77j5xEmgtt1sh2nyf3tAYWaCzI1I8Jdosx5rE/embed?start=false&loop=false&delayms=3000' },
  { numeroModulo: '4', titulo: 'CÓMO FUNCIONA ASSETTO CORSA', link: 'https://docs.google.com/presentation/d/1TD7xZY7t5i2z3kzrSRvPdEjUipgWadhvKZ7xIAifIBY/embed?start=false&loop=false&delayms=3000' },
  { numeroModulo: '5', titulo: 'SETUPS', link: 'https://docs.google.com/presentation/d/1DIccgiL0Hfg18rNg2VqUKJqZeYUjAdlBRSy8DkpYyBQ/embed?start=false&loop=false&delayms=3000' },
  { numeroModulo: '6', titulo: 'TÉCNICAS DE CARRERA', link: 'https://docs.google.com/presentation/d/1otytwGVYGHjiY-0dhLjonufLJpb_A30wSSlLM8j9Lx8/embed?start=false&loop=false&delayms=3000' },
  { numeroModulo: '7', titulo: 'GESTIÓN MENTAL', link: 'https://docs.google.com/presentation/d/1i2MkKgHlv4awRqAy_Xm95awaVsV_VGKHxJxNqOSvQSU/embed?start=false&loop=false&delayms=3000' },
  { numeroModulo: '8', titulo: 'PLAN Y PRIMER CAMPEONATO', link: 'https://docs.google.com/presentation/d/1PGStqTaiDO_8fNke4lPID0uNXdfyHUdVT25IuBDHKeU/embed?start=false&loop=false&delayms=3000' },
]

async function main() {
  console.log('🔗 Links de presentaciones de la Academia\n')

  let actualizados = 0
  let creados = 0
  for (let orden = 0; orden < MODULOS.length; orden++) {
    const { numeroModulo, titulo, link } = MODULOS[orden]
    const linkPresentacion = getPresentacionEmbedUrl(link)
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
