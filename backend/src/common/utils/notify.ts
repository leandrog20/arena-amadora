import { prisma } from '../../config/prisma'
import { emitToUser } from '../../socket/socket-server'

type NotificationType = 'TOURNAMENT' | 'MATCH' | 'SOCIAL' | 'SYSTEM' | 'PAYMENT' | 'ACHIEVEMENT'

export async function notify(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  data?: Record<string, unknown>
) {
  const notification = await prisma.notification.create({
    data: { userId, type, title, message, data: (data ?? undefined) as any },
  })

  emitToUser(userId, 'notification', {
    id: notification.id,
    type,
    title,
    message,
    data,
    createdAt: notification.createdAt,
  })

  return notification
}

export async function notifyMany(
  userIds: string[],
  type: NotificationType,
  title: string,
  message: string,
  data?: Record<string, unknown>
) {
  await Promise.all(userIds.map((uid) => notify(uid, type, title, message, data)))
}
