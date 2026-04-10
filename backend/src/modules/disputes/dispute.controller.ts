import { FastifyReply, FastifyRequest } from 'fastify'
import { DisputeService } from './dispute.service'
import { createDisputeSchema, resolveDisputeSchema } from './dispute.schemas'
import { sendSuccess, sendPaginated } from '../../common/utils'

const disputeService = new DisputeService()

export class DisputeController {
  async create(request: FastifyRequest, reply: FastifyReply) {
    const data = createDisputeSchema.parse(request.body)
    const result = await disputeService.create(data, request.userId)
    return sendSuccess(reply, result, 201)
  }

  async resolve(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string }
    const data = resolveDisputeSchema.parse(request.body)
    await disputeService.resolve(id, data, request.userId)
    return sendSuccess(reply, { message: 'Disputa resolvida' })
  }

  async list(request: FastifyRequest, reply: FastifyReply) {
    const { page, limit, status } = request.query as {
      page?: number; limit?: number; status?: string
    }
    const result = await disputeService.list(
      Number(page) || 1,
      Number(limit) || 20,
      status
    )
    return sendPaginated(reply, result.disputes, result.total, result.page, result.limit)
  }
}
