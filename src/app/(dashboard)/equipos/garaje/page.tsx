import { getServerSession } from 'next-auth'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getMembresia } from '@/lib/equipos'
import { etiquetaTemporada, getTemporadaActiva } from '@/lib/temporadas'
import { EquipoLogo } from '@/components/equipos/EquipoLogo'
import { Car, ChevronLeft, Download, History, Shield, Info } from 'lucide-react'

export const metadata = { title: 'Garaje de equipo' }
export const dynamic = 'force-dynamic'

/** Imagen del coche con la skin del equipo; si no hay skin subida, la imagen base teñida con el color del equipo. */
function CocheConSkin({ imagenSkin, imagenBase, color, nombre, alto = 'h-64' }: {
  imagenSkin: string | null
  imagenBase: string | null
  color: string
  nombre: string
  alto?: string
}) {
  return (
    <div className={`relative ${alto} rounded-xl overflow-hidden border border-apex-border`}
      style={{ background: `radial-gradient(ellipse at 50% 85%, ${color}55 0%, #1C1C1C 70%)` }}>
      {imagenSkin ? (
        <img src={imagenSkin} alt={`${nombre} con la skin del equipo`} className="w-full h-full object-contain" />
      ) : imagenBase ? (
        <>
          <img src={imagenBase} alt={nombre} className="w-full h-full object-contain" />
          {/* Sin skin propia: se aplica el color del equipo sobre la carrocería */}
          <div className="absolute inset-0 mix-blend-color pointer-events-none" style={{ background: color }} />
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Car size={72} style={{ color }} />
        </div>
      )}
      <div className="absolute bottom-0 inset-x-0 h-1.5" style={{ background: color }} />
    </div>
  )
}

export default async function GarajeEquipoPage() {
  const session = await getServerSession(authOptions)
  const membresia = await getMembresia(session!.user.id)

  if (!membresia) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <Shield size={48} className="mx-auto mb-4 text-apex-muted opacity-40" />
        <h1 className="text-xl font-bold mb-2">Garaje de equipo</h1>
        <p className="text-apex-muted mb-6">Solo los pilotos que pertenecen a un equipo tienen acceso a su garaje. Únete a uno o crea el tuyo.</p>
        <Link href="/equipos" className="inline-flex px-5 py-2.5 bg-apex-red hover:bg-apex-red-dark text-white rounded-xl font-semibold transition-colors">
          Ver equipos
        </Link>
      </div>
    )
  }

  const { equipo } = membresia
  const color = equipo.colorPrimario || '#C0392B'
  const temporada = await getTemporadaActiva()

  const [skinActual, anteriores] = await Promise.all([
    temporada?.cocheEquipoId
      ? prisma.skinEquipo.findUnique({ where: { cocheEquipoId_equipoId: { cocheEquipoId: temporada.cocheEquipoId, equipoId: equipo.id } } })
      : null,
    prisma.temporada.findMany({
      where: {
        cocheEquipoId: { not: null },
        activa: false,
        fechaFin: { lt: temporada?.fechaInicio ?? new Date() },
      },
      orderBy: [{ anio: 'desc' }, { numero: 'desc' }],
      include: {
        cocheEquipo: { include: { skins: { where: { equipoId: equipo.id } } } },
        equipoGanador: { select: { id: true, nombre: true } },
      },
    }),
  ])

  const coche = temporada?.cocheEquipo ?? null
  const colorSkin = skinActual?.colorPrimario || color

  return (
    <div className="space-y-6">
      <Link href={`/equipos/${equipo.id}`} className="inline-flex items-center gap-1 text-apex-muted hover:text-apex-text text-sm transition-colors">
        <ChevronLeft size={16} />Volver a {equipo.nombre}
      </Link>

      <div className="flex items-center gap-3">
        <EquipoLogo nombre={equipo.nombre} logoUrl={equipo.logoUrl} color={color} size={44} />
        <div>
          <h1 className="text-2xl font-bold">Garaje de equipo</h1>
          <p className="text-apex-muted text-sm">
            {equipo.nombre}{temporada ? ` · ${etiquetaTemporada(temporada).texto}` : ''} — independiente de tu garaje personal
          </p>
        </div>
      </div>

      {!temporada || !coche ? (
        <div className="bg-apex-card border border-apex-border rounded-xl p-10 text-center text-apex-muted">
          <Car size={48} className="mx-auto mb-4 opacity-30" />
          <p>{!temporada ? 'La temporada aún no ha comenzado.' : 'La organización todavía no ha asignado el coche de esta temporada.'}</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <CocheConSkin imagenSkin={skinActual?.imagenSkin ?? null} imagenBase={coche.imagenBase} color={colorSkin} nombre={coche.nombre} alto="h-72 lg:h-96" />
          </div>
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-apex-card border border-apex-border rounded-xl p-5">
              <div className="text-xs uppercase tracking-wider text-apex-muted mb-1">Coche de la temporada {temporada.numero} · {temporada.anio}</div>
              <h2 className="text-xl font-bold">{coche.nombre}</h2>
              {coche.descripcion && <p className="text-sm text-apex-muted mt-2 whitespace-pre-wrap">{coche.descripcion}</p>}
              <div className="flex items-center gap-2 mt-4 text-sm">
                <span className="w-4 h-4 rounded" style={{ background: colorSkin }} />
                <span className="text-apex-muted">{skinActual?.imagenSkin ? 'Skin oficial del equipo' : 'Colores del equipo'}</span>
              </div>
              {coche.linkDescarga && (
                <a href={coche.linkDescarga} target="_blank" rel="noopener noreferrer"
                  className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 text-white rounded-xl font-semibold transition-opacity hover:opacity-90"
                  style={{ background: color }}>
                  <Download size={16} />Descargar mod
                </a>
              )}
            </div>

            <div className="bg-apex-card border border-apex-border rounded-xl p-5">
              <h3 className="font-semibold flex items-center gap-2 mb-3"><Info size={16} className="text-apex-red" />Cómo instalar el mod</h3>
              <ol className="text-sm text-apex-muted space-y-2 list-decimal list-inside">
                <li>Descarga el archivo del mod con el botón de arriba.</li>
                <li>Abre <strong className="text-apex-text">Content Manager</strong> y arrastra el archivo .zip/.rar a la ventana.</li>
                <li>Pulsa <strong className="text-apex-text">Instalar</strong> y espera a que termine.</li>
                {skinActual?.imagenSkin && <li>Selecciona la skin de <strong className="text-apex-text">{equipo.nombre}</strong> en el selector de skins del coche.</li>}
                <li>Comprueba que el coche aparece en <strong className="text-apex-text">Coches</strong> antes de entrar al servidor.</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Histórico */}
      <div>
        <h2 className="font-semibold flex items-center gap-2 mb-3"><History size={16} />Temporadas anteriores</h2>
        {anteriores.length === 0 ? (
          <p className="text-sm text-apex-muted">Todavía no hay temporadas anteriores.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {anteriores.map(t => {
              const skin = t.cocheEquipo?.skins[0]
              return (
                <div key={t.id} className="bg-apex-card border border-apex-border rounded-xl p-3">
                  <CocheConSkin imagenSkin={skin?.imagenSkin ?? null} imagenBase={t.cocheEquipo?.imagenBase ?? null}
                    color={skin?.colorPrimario || color} nombre={t.cocheEquipo?.nombre ?? ''} alto="h-36" />
                  <div className="mt-3">
                    <div className="text-xs text-apex-muted">Temporada {t.numero} · {t.anio}</div>
                    <div className="font-semibold">{t.cocheEquipo?.nombre}</div>
                    {t.equipoGanador && (
                      <div className="text-xs mt-1">🏆 Campeón: <span className={t.equipoGanador.id === equipo.id ? 'text-yellow-400 font-semibold' : 'text-apex-muted'}>{t.equipoGanador.nombre}</span></div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
