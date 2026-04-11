import { FastifyInstance } from 'fastify'
import { TeamController } from './team.controller'
import { authMiddleware } from '../../common/middlewares'

const controller = new TeamController()

export async function teamRoutes(app: FastifyInstance) {
  app.get('/', controller.list)
  app.get('/:id', controller.getById)

  app.post('/', { preHandler: [authMiddleware] }, controller.create)
  app.post('/:id/members', { preHandler: [authMiddleware] }, controller.addMember)
  app.delete('/:id/members/:memberId', { preHandler: [authMiddleware] }, controller.removeMember)
  app.put('/:id', { preHandler: [authMiddleware] }, controller.update)
  app.delete('/:id', { preHandler: [authMiddleware] }, controller.delete)
  app.post('/:id/transfer', { preHandler: [authMiddleware] }, controller.transferOwnership)
}
