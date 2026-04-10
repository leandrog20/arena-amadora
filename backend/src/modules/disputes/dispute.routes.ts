import { FastifyInstance } from 'fastify'
import { DisputeController } from './dispute.controller'
import { authMiddleware, requireRole } from '../../common/middlewares'

const controller = new DisputeController()

export async function disputeRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware)

  app.post('/', controller.create)
  app.get('/', { preHandler: [requireRole('ADMIN', 'MODERATOR')] }, controller.list)
  app.post('/:id/resolve', { preHandler: [requireRole('ADMIN', 'MODERATOR')] }, controller.resolve)
}
