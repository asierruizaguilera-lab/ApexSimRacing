import fs from 'fs'
import path from 'path'
import { prisma } from './prisma'
import { cancelPayPalSubscription } from './paypal'
import { cancelarSuscripcion } from './suscripciones'
import { desactivarUsoReferido } from './referidos'
import { disolverEquipo } from './equipos'
import { invalidarCacheSesion } from './sesionCache'

// Derechos RGPD del usuario: acceso/portabilidad (exportar) y supresión (eliminar cuenta).

const MAX_FILAS = 5000 // tope por colección para no disparar la memoria (instancia de 512 MB)

/** Todos los datos personales del usuario en un objeto serializable a JSON. Nunca incluye el hash de la contraseña. */
export async function exportarDatosUsuario(userId: string) {
  const usuario = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, username: true, email: true, emailVerified: true, role: true, avatar: true, pais: true, bio: true,
      fechaRegistro: true, totalPuntos: true, totalCarreras: true, totalVictorias: true, totalPodios: true,
      esFounder: true, fechaFounder: true, descuentoMerch: true, descuentoReferido: true, silenciado: true, baneado: true, motivoBan: true,
      suscripcion: {
        select: {
          plan: true, estado: true, precioMensual: true, fechaInicio: true, fechaRenovacion: true, fechaCancelacion: true,
          esGratuita: true, esFounder: true, fechaExpiracionManual: true, creadoEn: true,
        },
      },
      miembroEquipo: { select: { rol: true, fechaUnion: true, equipo: { select: { id: true, nombre: true } } } },
    },
  })
  if (!usuario) return null

  const [
    inscripciones, resultados, mensajesChat, mensajesEquipo, mensajesEnviados, mensajesRecibidos,
    notificaciones, quejasPresentadas, quejasRecibidas, pruebas, clasesVistas, codigosReferido,
    referidoPor, comisiones, actividad,
  ] = await Promise.all([
    prisma.inscripcion.findMany({ where: { userId }, take: MAX_FILAS, select: { estado: true, fechaInscripcion: true, campeonato: { select: { nombre: true } } } }),
    prisma.resultado.findMany({ where: { userId }, take: MAX_FILAS, select: { posicion: true, puntos: true, vueltaRapida: true, abandono: true, tiempo: true, carrera: { select: { nombre: true, fecha: true } } } }),
    prisma.mensajeChat.findMany({ where: { userId }, take: MAX_FILAS, orderBy: { creadoEn: 'desc' }, select: { canal: true, contenido: true, creadoEn: true, eliminado: true } }),
    prisma.mensajeEquipo.findMany({ where: { userId }, take: MAX_FILAS, orderBy: { creadoEn: 'desc' }, select: { contenido: true, creadoEn: true } }),
    prisma.mensajeDirecto.findMany({ where: { remitenteId: userId }, take: MAX_FILAS, orderBy: { creadoEn: 'desc' }, select: { contenido: true, creadoEn: true, destinatario: { select: { username: true } } } }),
    prisma.mensajeDirecto.findMany({ where: { destinatarioId: userId }, take: MAX_FILAS, orderBy: { creadoEn: 'desc' }, select: { contenido: true, creadoEn: true, leido: true, remitente: { select: { username: true } } } }),
    prisma.notificacion.findMany({ where: { userId }, take: MAX_FILAS, orderBy: { creadoEn: 'desc' }, select: { tipo: true, mensaje: true, leida: true, creadoEn: true } }),
    prisma.queja.findMany({ where: { denuncianteId: userId }, take: MAX_FILAS, select: { tipo: true, titulo: true, descripcion: true, estado: true, creadoEn: true } }),
    prisma.queja.findMany({ where: { denunciadoId: userId }, take: MAX_FILAS, select: { tipo: true, titulo: true, estado: true, sancion: true, creadoEn: true } }),
    prisma.pruebaQueja.findMany({ where: { userId }, take: MAX_FILAS, select: { descripcion: true, linkPrueba: true, creadoEn: true } }),
    prisma.claseVista.findMany({ where: { userId }, take: MAX_FILAS, select: { vistoCEn: true, clase: { select: { titulo: true } } } }),
    prisma.codigoReferido.findMany({ where: { creadoPorId: userId }, select: { codigo: true, activo: true, creadoEn: true } }),
    prisma.usoReferido.findUnique({ where: { referidoId: userId }, select: { fechaInicio: true, activo: true } }),
    prisma.comisionReferido.findMany({ where: { referidorId: userId }, take: MAX_FILAS, select: { importe: true, creadoEn: true } }),
    prisma.logActividad.findMany({
      where: { userId, tipo: { not: 'VISTA' } }, take: MAX_FILAS, orderBy: { creadoEn: 'desc' },
      select: { tipo: true, ruta: true, metodo: true, estado: true, creadoEn: true },
    }),
  ])

  return {
    generadoEn: new Date().toISOString(),
    nota: 'Exportación de tus datos personales en APEX SimRacing (art. 15 y 20 RGPD).',
    usuario,
    inscripciones, resultados, mensajesChat, mensajesEquipo, mensajesEnviados, mensajesRecibidos,
    notificaciones, quejasPresentadas, quejasRecibidas, pruebas, clasesVistas, codigosReferido,
    referidoPor, comisiones, actividad,
  }
}

export type ResultadoEliminacion = { ok: true } | { ok: false; error: string }

/**
 * Elimina la cuenta: cancela la suscripción (también en PayPal), sale del equipo y anonimiza los datos
 * personales. El registro del usuario se conserva anonimizado para no romper el histórico deportivo
 * (resultados, clasificaciones) ni los registros de moderación.
 */
export async function eliminarCuenta(userId: string): Promise<ResultadoEliminacion> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, avatar: true, eliminadoEn: true,
      suscripcion: { select: { estado: true, paypalSubscriptionId: true } },
      miembroEquipo: { select: { equipoId: true, equipo: { select: { liderId: true, paypalSubIdEquipo: true, _count: { select: { miembros: true } } } } } },
    },
  })
  if (!user || user.eliminadoEn) return { ok: false, error: 'Cuenta no encontrada' }

  // Equipo: un líder con más pilotos debe transferir antes el liderazgo
  const miembro = user.miembroEquipo
  if (miembro && miembro.equipo.liderId === userId) {
    if (miembro.equipo._count.miembros > 1) {
      return { ok: false, error: 'Eres líder de un equipo con más pilotos. Transfiere el liderazgo antes de eliminar tu cuenta.' }
    }
    if (miembro.equipo.paypalSubIdEquipo) await cancelPayPalSubscription(miembro.equipo.paypalSubIdEquipo).catch(() => null)
    await disolverEquipo(miembro.equipoId)
  } else if (miembro) {
    await prisma.miembroEquipo.delete({ where: { userId } })
  }

  // Suscripción: se cancela en PayPal para que no se le siga cobrando
  if (user.suscripcion?.paypalSubscriptionId && ['ACTIVA', 'GRATUITA'].includes(user.suscripcion.estado)) {
    await cancelPayPalSubscription(user.suscripcion.paypalSubscriptionId).catch(err =>
      console.error('[RGPD] No se pudo cancelar la suscripción en PayPal:', err?.message))
  }
  await cancelarSuscripcion(userId)
  await desactivarUsoReferido(userId).catch(() => null)

  const sufijo = userId.slice(-8)
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        username: `eliminado-${sufijo}`,
        email: `eliminado-${userId}@eliminado.invalid`,
        password: null,
        avatar: null,
        bio: null,
        pais: null,
        emailVerified: null,
        silenciado: true,
        codigoReferidoPendienteId: null,
        eliminadoEn: new Date(),
      },
    }),
    prisma.session.deleteMany({ where: { userId } }),
    prisma.account.deleteMany({ where: { userId } }),
    prisma.notificacion.deleteMany({ where: { userId } }),
    prisma.tokenSeguridad.deleteMany({ where: { userId } }),
    prisma.invitacionEquipo.deleteMany({ where: { invitadoId: userId } }),
    prisma.codigoReferido.updateMany({ where: { creadoPorId: userId }, data: { activo: false } }),
    // Contenido escrito por el usuario: los DMs que envió y sus mensajes de equipo se borran; los del
    // chat público se ocultan (eliminado) para no dejar huecos en el hilo de moderación
    prisma.mensajeDirecto.deleteMany({ where: { remitenteId: userId } }),
    prisma.mensajeEquipo.deleteMany({ where: { userId } }),
    prisma.mensajeChat.updateMany({ where: { userId }, data: { eliminado: true } }),
  ])

  if (user.avatar?.startsWith('/avatars/') && !user.avatar.includes('..')) {
    try { fs.unlinkSync(path.join(process.cwd(), 'public', user.avatar)) } catch {}
  }

  invalidarCacheSesion(userId)
  return { ok: true }
}
