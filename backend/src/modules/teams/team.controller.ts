import { FastifyReply, FastifyRequest } from 'fastify'
import { TeamService } from './team.service'
import { createTeamSchema, inviteMemberSchema } from './team.schemas'
import { sendSuccess, sendPaginated } from '../../common/utils'

const teamService = new TeamService()

export class TeamController {
  async create(request: FastifyRequest, reply: FastifyReply) {
    const data = createTeamSchema.parse(request.body)
    const result = await teamService.create(data, request.userId)
    return sendSuccess(reply, result, 201)
  }

  async getById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string }
    const result = await teamService.getById(id)
    return sendSuccess(reply, result)
  }

  async list(request: FastifyRequest, reply: FastifyReply) {
    const { page, limit } = request.query as { page?: number; limit?: number }
    const result = await teamService.list(Number(page) || 1, Number(limit) || 20)
    return sendPaginated(reply, result.teams, result.total, result.page, result.limit)
  }

  async addMember(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string }
    const { username } = inviteMemberSchema.parse(request.body)
    const result = await teamService.addMember(id, username, request.userId)
    return sendSuccess(reply, result, 201)
  }

  async removeMember(request: FastifyRequest, reply: FastifyReply) {
    const { id, memberId } = request.params as { id: string; memberId: string }
    await teamService.removeMember(id, memberId, request.userId)
    return sendSuccess(reply, { message: 'Membro removido' })
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string }
    const data = request.body as { name?: string; description?: string; logoUrl?: string }
    const result = await teamService.update(id, data, request.userId)
    return sendSuccess(reply, result)
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string }
    await teamService.delete(id, request.userId)
    return sendSuccess(reply, { message: 'Equipe deletada' })
  }

  async transferOwnership(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string }
    const { newOwnerId } = request.body as { newOwnerId: string }
    await teamService.transferOwnership(id, newOwnerId, request.userId)
    return sendSuccess(reply, { message: 'Propriedade transferida' })
  }
}
