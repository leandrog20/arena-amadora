import { prisma } from '../../config/prisma'

export class NotificationService {
  async getAll(userId: string, page = 1, limit = 20, unreadOnly = false) {
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = { userId }
    if (unreadOnly) where.isRead = false

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ])

    return { notifications, total, unreadCount, page, limit }
  }

  async markAsRead(notificationId: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    })
  }

  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    })
  }

  async create(
    userId: string,
    type: 'TOURNAMENT' | 'MATCH' | 'SOCIAL' | 'SYSTEM' | 'PAYMENT' | 'ACHIEVEMENT',
    title: string,
    message: string,
    data?: Record<string, unknown>
  ) {
    return prisma.notification.create({
      data: { userId, type, title, message, data: (data ?? undefined) as any },
    })
  }
}
