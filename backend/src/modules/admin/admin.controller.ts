import { FastifyReply, FastifyRequest } from 'fastify'
import { AdminService } from './admin.service'
import { sendSuccess, sendPaginated } from '../../common/utils'

const adminService = new AdminService()

export class AdminController {
  async getDashboard(request: FastifyRequest, reply: FastifyReply) {
    const result = await adminService.getDashboard()
    return sendSuccess(reply, result)
  }

  async banUser(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string }
    const { reason } = request.body as { reason: string }
    await adminService.banUser(id, reason)
    return sendSuccess(reply, { message: 'Usuário banido' })
  }

  async unbanUser(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string }
    await adminService.unbanUser(id)
    return sendSuccess(reply, { message: 'Ban removido' })
  }

  async setRole(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string }
    const { role } = request.body as { role: 'USER' | 'ADMIN' | 'MODERATOR' }
    const result = await adminService.setUserRole(id, role)
    return sendSuccess(reply, result)
  }

  async listUsers(request: FastifyRequest, reply: FastifyReply) {
    const { page, limit, search } = request.query as {
      page?: number; limit?: number; search?: string
    }
    const result = await adminService.listUsers(
      Number(page) || 1,
      Number(limit) || 20,
      search
    )
    return sendPaginated(reply, result.users, result.total, result.page, result.limit)
  }

  async getActionLogs(request: FastifyRequest, reply: FastifyReply) {
    const { page, limit } = request.query as { page?: number; limit?: number }
    const result = await adminService.getActionLogs(Number(page) || 1, Number(limit) || 50)
    return sendPaginated(reply, result.logs, result.total, result.page, result.limit)
  }

  async getStats(request: FastifyRequest, reply: FastifyReply) {
    const result = await adminService.getPlatformStats()
    return sendSuccess(reply, result)
  }
}
