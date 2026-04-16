import { FastifyReply, FastifyRequest } from 'fastify'
import { MatchService } from './match.service'
import { submitResultSchema, advancePlayerByAdminSchema } from './match.schemas'
import { sendSuccess } from '../../common/utils'

const matchService = new MatchService()

export class MatchController {
  async getById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string }
    const result = await matchService.getById(id)
    return sendSuccess(reply, result)
  }

  async getByTournament(request: FastifyRequest, reply: FastifyReply) {
    const { tournamentId } = request.params as { tournamentId: string }
    const result = await matchService.getByTournament(tournamentId)
    return sendSuccess(reply, result)
  }

  async submitResult(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string }
    const data = submitResultSchema.parse(request.body)
    const result = await matchService.submitResult(id, data, request.userId, request.userRole)
    return sendSuccess(reply, result)
  }

  async uploadProof(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string }
    const { proofUrl } = request.body as { proofUrl: string }
    const result = await matchService.uploadProof(id, proofUrl, request.userId)
    return sendSuccess(reply, result)
  }

  async advancePlayerByAdmin(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string }
    const data = advancePlayerByAdminSchema.parse(request.body)
    const result = await matchService.advancePlayerByAdmin(id, data, request.userRole)
    return sendSuccess(reply, result)
  }
}
