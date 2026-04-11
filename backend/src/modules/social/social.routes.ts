import { FastifyInstance } from 'fastify'
import { SocialController } from './social.controller'
import { authMiddleware } from '../../common/middlewares'

const controller = new SocialController()

export async function socialRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware)

  app.post('/friends/request', controller.sendRequest)
  app.post('/friends/request/:id/respond', controller.respondToRequest)
  app.get('/friends', controller.getFriends)
  app.get('/friends/pending', controller.getPendingRequests)
  app.delete('/friends/:friendId', controller.removeFriend)
  app.post('/block/:userId', controller.blockUser)
  app.delete('/block/:userId', controller.unblockUser)
  app.get('/blocked', controller.getBlockedUsers)
}
