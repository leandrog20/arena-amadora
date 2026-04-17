import { FastifyReply, FastifyRequest } from 'fastify'
import { RankingService } from './ranking.service'
import { sendPaginated } from '../../common/utils'

const rankingService = new RankingService()

export class RankingController {
  async getGlobal(request: FastifyRequest, reply: FastifyReply) {
    const { page, limit } = request.query as { page?: number; limit?: number }
    const result = await rankingService.getGlobalRanking(Number(page) || 1, Number(limit) || 50)
    return sendPaginated(reply, result.players, result.total, result.page, result.limit)
  }

  async getByGame(request: FastifyRequest, reply: FastifyReply) {
    const { game } = request.params as { game: string }
    const { page, limit } = request.query as { page?: number; limit?: number }
    const result = await rankingService.getGameRanking(game, Number(page) || 1, Number(limit) || 50)
    return sendPaginated(reply, result.players, result.total, result.page, result.limit)
  }

  // Equipes desabilitadas
  // async getTeams(request: FastifyRequest, reply: FastifyReply) {
  //   const { page, limit } = request.query as { page?: number; limit?: number }
  //   const result = await rankingService.getTeamRanking(Number(page) || 1, Number(limit) || 50)
  //   return sendPaginated(reply, result.teams, result.total, result.page, result.limit)
  // }
}
