'use client'

import { io, Socket } from 'socket.io-client'

// Conexión compartida para chat de equipo, mensajes directos y avisos de la sidebar.
// El servidor identifica al usuario por la cookie de sesión (no hace falta enviar el userId).
let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) socket = io({ transports: ['websocket', 'polling'] })
  return socket
}
