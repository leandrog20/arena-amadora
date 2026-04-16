import { FastifyInstance } from 'fastify'
import { ClanController } from './clan.controller'
import { authMiddleware } from '../../common/middlewares'

const controller = new ClanController()

export async function clanRoutes(app: FastifyInstance) {
  app.get('/', controller.list)
  app.get('/:id', controller.getById)
  app.get('/:id/chat', controller.getChatMessages)

  app.post('/', { preHandler: [authMiddleware] }, controller.create)
  app.post('/:id/members', { preHandler: [authMiddleware] }, controller.addMember)
  app.post('/:id/chat', { preHandler: [authMiddleware] }, controller.sendMessage)
  app.post('/:id/co-leader', { preHandler: [authMiddleware] }, controller.setCoLeader)

  app.delete('/:id/members/:memberId', { preHandler: [authMiddleware] }, controller.removeMember)
  app.delete('/:id/co-leader', { preHandler: [authMiddleware] }, controller.removeCoLeader)

  app.put('/:id', { preHandler: [authMiddleware] }, controller.update)
  app.delete('/:id', { preHandler: [authMiddleware] }, controller.delete)
  app.post('/:id/transfer', { preHandler: [authMiddleware] }, controller.transferOwnership)
}
