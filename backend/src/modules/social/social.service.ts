import { prisma } from '../../config/prisma'
import { NotFoundError, ConflictError, AppError } from '../../common/errors'

export class SocialService {
  async sendFriendRequest(senderId: string, receiverUsername: string) {
    const receiver = await prisma.user.findUnique({
      where: { username: receiverUsername },
      select: { id: true },
    })
    if (!receiver) throw new NotFoundError('Usuário não encontrado')
    if (receiver.id === senderId) throw new AppError('Não é possível adicionar a si mesmo')

    const existing = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId, receiverId: receiver.id },
          { senderId: receiver.id, receiverId: senderId },
        ],
      },
    })

    if (existing) {
      if (existing.status === 'BLOCKED') throw new AppError('Usuário bloqueado')
      if (existing.status === 'ACCEPTED') throw new ConflictError('Vocês já são amigos')
      if (existing.status === 'PENDING') throw new ConflictError('Solicitação já enviada')
    }

    return prisma.friendRequest.create({
      data: { senderId, receiverId: receiver.id },
      include: {
        receiver: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    })
  }

  async respondToRequest(requestId: string, userId: string, accept: boolean) {
    const request = await prisma.friendRequest.findUnique({
      where: { id: requestId },
    })
    if (!request) throw new NotFoundError('Solicitação não encontrada')
    if (request.receiverId !== userId) throw new AppError('Sem permissão')
    if (request.status !== 'PENDING') throw new AppError('Solicitação já processada')

    return prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: accept ? 'ACCEPTED' : 'REJECTED' },
    })
  }

  async getFriends(userId: string) {
    const friendships = await prisma.friendRequest.findMany({
      where: {
        OR: [
          { senderId: userId, status: 'ACCEPTED' },
          { receiverId: userId, status: 'ACCEPTED' },
        ],
      },
      include: {
        sender: { select: { id: true, username: true, displayName: true, avatarUrl: true, eloRating: true, level: true } },
        receiver: { select: { id: true, username: true, displayName: true, avatarUrl: true, eloRating: true, level: true } },
      },
    })

    return friendships.map((f) =>
      f.senderId === userId ? f.receiver : f.sender
    )
  }

  async getPendingRequests(userId: string) {
    return prisma.friendRequest.findMany({
      where: { receiverId: userId, status: 'PENDING' },
      include: {
        sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async removeFriend(userId: string, friendId: string) {
    const friendship = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId: friendId, status: 'ACCEPTED' },
          { senderId: friendId, receiverId: userId, status: 'ACCEPTED' },
        ],
      },
    })
    if (!friendship) throw new NotFoundError('Amizade não encontrada')

    await prisma.friendRequest.delete({ where: { id: friendship.id } })
  }
}
