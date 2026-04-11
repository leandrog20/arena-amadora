import { FastifyInstance } from 'fastify'
import { TournamentController } from './tournament.controller'
import { authMiddleware, optionalAuth, requireRole } from '../../common/middlewares'

const controller = new TournamentController()

export async function tournamentRoutes(app: FastifyInstance) {
  // Rotas públicas
  app.get('/', controller.list)
  app.get('/:id', { preHandler: [optionalAuth] }, controller.getById)
  app.get('/:id/participants', controller.getParticipants)
  app.get('/:id/messages', { preHandler: [authMiddleware] }, controller.getChatMessages)

  // Rotas autenticadas
  app.post('/', { preHandler: [authMiddleware, requireRole('ADMIN', 'MODERATOR')] }, controller.create)
  app.put('/:id', { preHandler: [authMiddleware] }, controller.update)
  app.post('/:id/join', { preHandler: [authMiddleware] }, controller.join)
  app.post('/:id/leave', { preHandler: [authMiddleware] }, controller.leave)
  app.post('/:id/start', { preHandler: [authMiddleware] }, controller.start)
}
