import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import compress from '@fastify/compress'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'
import cookie from '@fastify/cookie'
import { env } from './config/env'
import { errorHandler } from './common/middlewares'

// Módulos
import { authRoutes } from './modules/auth/auth.routes'
import { userRoutes } from './modules/users/user.routes'
import { tournamentRoutes } from './modules/tournaments/tournament.routes'
import { matchRoutes } from './modules/matches/match.routes'
import { walletRoutes } from './modules/wallet/wallet.routes'
import { teamRoutes } from './modules/teams/team.routes'
import { socialRoutes } from './modules/social/social.routes'
import { notificationRoutes } from './modules/notifications/notification.routes'
import { disputeRoutes } from './modules/disputes/dispute.routes'
import { adminRoutes } from './modules/admin/admin.routes'
import { rankingRoutes } from './modules/rankings/ranking.routes'
import { achievementRoutes } from './modules/achievements/achievement.routes'

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'development' ? 'info' : 'warn',
      transport: env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
  })

  // Plugins de segurança
  await app.register(helmet, {
    contentSecurityPolicy: false,
  })

  // Suporta múltiplas origins separadas por vírgula no FRONTEND_URL
  const allowedOrigins = env.FRONTEND_URL.split(',').map(o => o.trim().replace(/\/$/, ''))

  await app.register(cors, {
    origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  })

  // Compressão — reduz tamanho das respostas em ~70%
  await app.register(compress, {
    threshold: 1024, // comprime respostas > 1KB
  })

  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
  })

  await app.register(multipart, {
    limits: {
      fileSize: env.MAX_FILE_SIZE,
    },
  })

  await app.register(cookie)

  // Error handler global
  app.setErrorHandler(errorHandler)

  // Health check
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }))

  // Rotas
  await app.register(authRoutes, { prefix: '/api/auth' })
  await app.register(userRoutes, { prefix: '/api/users' })
  await app.register(tournamentRoutes, { prefix: '/api/tournaments' })
  await app.register(matchRoutes, { prefix: '/api/matches' })
  await app.register(walletRoutes, { prefix: '/api/wallet' })
  await app.register(teamRoutes, { prefix: '/api/teams' })
  await app.register(socialRoutes, { prefix: '/api/social' })
  await app.register(notificationRoutes, { prefix: '/api/notifications' })
  await app.register(disputeRoutes, { prefix: '/api/disputes' })
  await app.register(adminRoutes, { prefix: '/api/admin' })
  await app.register(rankingRoutes, { prefix: '/api/rankings' })
  await app.register(achievementRoutes, { prefix: '/api/achievements' })

  return app
}
