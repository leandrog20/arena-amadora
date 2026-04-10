import { FastifyInstance } from 'fastify'
import { RankingController } from './ranking.controller'

const controller = new RankingController()

export async function rankingRoutes(app: FastifyInstance) {
  app.get('/global', controller.getGlobal)
  app.get('/game/:game', controller.getByGame)
  app.get('/teams', controller.getTeams)
}
