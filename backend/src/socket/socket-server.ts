import { Server as HttpServer } from 'http'
import { Server, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { prisma } from '../config/prisma'
import { sanitizeString } from '../common/utils'

let io: Server

export function getIO(): Server {
  return io
}

export function setupSocketServer(httpServer: HttpServer) {
  // Suporta múltiplas origins separadas por vírgula
  const allowedOrigins = env.FRONTEND_URL.split(',').map(o => o.trim().replace(/\/$/, ''))

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
  })

  // Middleware de autenticação
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token
    if (!token) {
      return next(new Error('Token não fornecido'))
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as { sub: string; role: string }
      const user = await prisma.user.findUnique({
        where: { id: decoded.sub },
        select: { id: true, username: true, displayName: true, avatarUrl: true, isBanned: true },
      })

      if (!user || user.isBanned) {
        return next(new Error('Não autorizado'))
      }

      socket.data.userId = user.id
      socket.data.username = user.username
      socket.data.displayName = user.displayName
      socket.data.avatarUrl = user.avatarUrl
      next()
    } catch {
      next(new Error('Token inválido'))
    }
  })

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId
    console.log(`🔌 Usuário conectado: ${socket.data.username}`)

    // Entrar na sala pessoal (para notificações)
    socket.join(`user:${userId}`)

    // ====== CHAT DO TORNEIO ======
    socket.on('tournament:join', (tournamentId: string) => {
      socket.join(`tournament:${tournamentId}`)
      socket.to(`tournament:${tournamentId}`).emit('tournament:user_joined', {
        userId,
        username: socket.data.username,
        displayName: socket.data.displayName,
      })
    })

    socket.on('tournament:leave', (tournamentId: string) => {
      socket.leave(`tournament:${tournamentId}`)
    })

    socket.on('tournament:message', async (data: { tournamentId: string; content: string }) => {
      if (!data.content || data.content.trim().length === 0) return
      if (data.content.length > 500) return

      const sanitizedContent = sanitizeString(data.content)

      try {
        const message = await prisma.chatMessage.create({
          data: {
            tournamentId: data.tournamentId,
            userId,
            content: sanitizedContent,
          },
        })

        io.to(`tournament:${data.tournamentId}`).emit('tournament:new_message', {
          id: message.id,
          content: sanitizedContent,
          userId,
          username: socket.data.username,
          displayName: socket.data.displayName,
          avatarUrl: socket.data.avatarUrl,
          createdAt: message.createdAt,
        })
      } catch (error) {
        socket.emit('error', { message: 'Erro ao enviar mensagem' })
      }
    })

    // ====== PARTIDAS EM TEMPO REAL ======
    socket.on('match:subscribe', (matchId: string) => {
      socket.join(`match:${matchId}`)
    })

    socket.on('match:unsubscribe', (matchId: string) => {
      socket.leave(`match:${matchId}`)
    })

    // ====== DESCONEXÃO ======
    socket.on('disconnect', () => {
      console.log(`❌ Usuário desconectado: ${socket.data.username}`)
    })
  })

  return io
}

// Funções helper para emitir eventos de outros módulos
export function emitToUser(userId: string, event: string, data: unknown) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data)
  }
}

export function emitToTournament(tournamentId: string, event: string, data: unknown) {
  if (io) {
    io.to(`tournament:${tournamentId}`).emit(event, data)
  }
}

export function emitMatchUpdate(matchId: string, data: unknown) {
  if (io) {
    io.to(`match:${matchId}`).emit('match:updated', data)
  }
}
