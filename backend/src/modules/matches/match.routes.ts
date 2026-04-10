import { FastifyInstance } from 'fastify'
import { MatchController } from './match.controller'
import { authMiddleware } from '../../common/middlewares'

const controller = new MatchController()

export async function matchRoutes(app: FastifyInstance) {
  app.get('/:id', controller.getById)
  app.get('/tournament/:tournamentId', controller.getByTournament)

  // Rotas autenticadas
  app.post('/:id/result', { preHandler: [authMiddleware] }, controller.submitResult)
  app.post('/:id/proof', { preHandler: [authMiddleware] }, controller.uploadProof)
}
