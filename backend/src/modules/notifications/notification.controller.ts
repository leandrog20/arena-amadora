import { FastifyReply, FastifyRequest } from 'fastify'
import { NotificationService } from './notification.service'
import { sendSuccess, sendPaginated } from '../../common/utils'

const notificationService = new NotificationService()

export class NotificationController {
  async getAll(request: FastifyRequest, reply: FastifyReply) {
    const { page, limit, unreadOnly } = request.query as {
      page?: number; limit?: number; unreadOnly?: string
    }
    const result = await notificationService.getAll(
      request.userId,
      Number(page) || 1,
      Number(limit) || 20,
      unreadOnly === 'true'
    )
    return reply.send({
      success: true,
      data: result.notifications,
      unreadCount: result.unreadCount,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
      },
    })
  }

  async markAsRead(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string }
    await notificationService.markAsRead(id, request.userId)
    return sendSuccess(reply, { message: 'Notificação marcada como lida' })
  }

  async markAllAsRead(request: FastifyRequest, reply: FastifyReply) {
    await notificationService.markAllAsRead(request.userId)
    return sendSuccess(reply, { message: 'Todas as notificações marcadas como lidas' })
  }
}
