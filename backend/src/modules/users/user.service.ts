import bcrypt from 'bcrypt'
import { prisma } from '../../config/prisma'
import { NotFoundError, UnauthorizedError } from '../../common/errors'
import { UpdateProfileInput, ChangePasswordInput, ListUsersInput } from './user.schemas'
import { sanitizeString } from '../../common/utils'

export class UserService {
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        role: true,
        xp: true,
        level: true,
        eloRating: true,
        gamesPlayed: true,
        gamesWon: true,
        winStreak: true,
        bestWinStreak: true,
        isVerified: true,
        createdAt: true,
        _count: {
          select: {
            participations: true,
            achievements: true,
            clanMemberships: true,
          },
        },
      },
    })

    if (!user) throw new NotFoundError('Usuário não encontrado')
    return user
  }

  async getPublicProfile(username: string) {
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        xp: true,
        level: true,
        eloRating: true,
        gamesPlayed: true,
        gamesWon: true,
        bestWinStreak: true,
        createdAt: true,
        achievements: {
          include: { achievement: true },
          orderBy: { unlockedAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            participations: true,
            achievements: true,
          },
        },
      },
    })

    if (!user) throw new NotFoundError('Usuário não encontrado')
    return user
  }

  async updateProfile(userId: string, data: UpdateProfileInput) {
    const sanitized: Partial<UpdateProfileInput> = {}
    if (data.displayName) sanitized.displayName = sanitizeString(data.displayName)
    if (data.bio) sanitized.bio = sanitizeString(data.bio)
    if (data.avatarUrl) sanitized.avatarUrl = data.avatarUrl

    const user = await prisma.user.update({
      where: { id: userId },
      data: sanitized,
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
      },
    })

    return user
  }

  async changePassword(userId: string, data: ChangePasswordInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    })

    if (!user) throw new NotFoundError('Usuário não encontrado')

    const valid = await bcrypt.compare(data.currentPassword, user.passwordHash)
    if (!valid) throw new UnauthorizedError('Senha atual incorreta')

    const newHash = await bcrypt.hash(data.newPassword, 12)

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    })

    // Revogar todos os refresh tokens
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    })
  }

  async listUsers(params: ListUsersInput) {
    const { page, limit, search, sortBy, order } = params
    const skip = (page - 1) * limit

    const where = search
      ? {
          OR: [
            { username: { contains: search, mode: 'insensitive' as const } },
            { displayName: { contains: search, mode: 'insensitive' as const } },
          ],
          isBanned: false,
        }
      : { isBanned: false }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          level: true,
          eloRating: true,
          gamesPlayed: true,
          gamesWon: true,
        },
        orderBy: { [sortBy]: order },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    return { users, total, page, limit }
  }

  async getMatchHistory(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit

    const [matches, total] = await Promise.all([
      prisma.match.findMany({
        where: {
          OR: [{ player1Id: userId }, { player2Id: userId }],
          status: 'COMPLETED',
        },
        include: {
          tournament: { select: { title: true, game: true } },
          player1: { select: { id: true, username: true, avatarUrl: true } },
          player2: { select: { id: true, username: true, avatarUrl: true } },
        },
        orderBy: { completedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.match.count({
        where: {
          OR: [{ player1Id: userId }, { player2Id: userId }],
          status: 'COMPLETED',
        },
      }),
    ])

    return { matches, total, page, limit }
  }

  async getUserStats(userId: string) {
    const [user, tournamentsWon, totalEarnings] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          gamesPlayed: true,
          gamesWon: true,
          eloRating: true,
          xp: true,
          level: true,
          winStreak: true,
          bestWinStreak: true,
        },
      }),
      prisma.participant.count({
        where: { userId, placement: 1 },
      }),
      prisma.transaction.aggregate({
        where: {
          wallet: { userId },
          type: 'TOURNAMENT_PRIZE',
          status: 'COMPLETED',
        },
        _sum: { amount: true },
      }),
    ])

    if (!user) throw new NotFoundError('Usuário não encontrado')

    return {
      ...user,
      winRate: user.gamesPlayed > 0
        ? Math.round((user.gamesWon / user.gamesPlayed) * 100)
        : 0,
      tournamentsWon,
      totalEarnings: totalEarnings._sum.amount || 0,
    }
  }
}
