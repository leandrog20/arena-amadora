import { prisma } from '../../config/prisma'
import { NotFoundError } from '../../common/errors'

export class AdminService {
  async getDashboard() {
    const [
      totalUsers,
      activeUsersToday,
      totalTournaments,
      activeTournaments,
      totalRevenue,
      totalTransactions,
      recentUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          lastLoginAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.tournament.count(),
      prisma.tournament.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.transaction.aggregate({
        where: { type: 'PLATFORM_FEE', status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      prisma.transaction.count(),
      prisma.user.findMany({
        select: {
          id: true,
          username: true,
          email: true,
          createdAt: true,
          role: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ])

    // Receita dos últimos 30 dias (agregação por dia via raw SQL)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const revenueByDay = await prisma.$queryRaw`
      SELECT DATE(created_at) as date, SUM(amount) as total
      FROM transactions
      WHERE type = 'PLATFORM_FEE' AND status = 'COMPLETED' AND created_at >= ${thirtyDaysAgo}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `

    return {
      users: { total: totalUsers, activeToday: activeUsersToday },
      tournaments: { total: totalTournaments, active: activeTournaments },
      revenue: {
        total: totalRevenue._sum.amount || 0,
        last30Days: revenueByDay,
      },
      transactions: { total: totalTransactions },
      recentUsers,
    }
  }

  async banUser(userId: string, reason: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })
    if (!user) throw new NotFoundError('Usuário não encontrado')

    await prisma.$transaction(async (tx) => {
      await Promise.all([
        tx.user.update({
          where: { id: userId },
          data: { isBanned: true, banReason: reason },
        }),
        tx.refreshToken.updateMany({
          where: { userId },
          data: { isRevoked: true },
        }),
      ])
    })
  }

  async unbanUser(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { isBanned: false, banReason: null },
    })
  }

  async setUserRole(userId: string, role: 'USER' | 'ADMIN' | 'MODERATOR') {
    return prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, username: true, role: true },
    })
  }

  async listUsers(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit
    const where = search
      ? {
          OR: [
            { username: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          role: true,
          isBanned: true,
          banReason: true,
          eloRating: true,
          level: true,
          createdAt: true,
          lastLoginAt: true,
          lastLoginIp: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    return { users, total, page, limit }
  }

  async getActionLogs(page = 1, limit = 50) {
    const skip = (page - 1) * limit

    const [logs, total] = await Promise.all([
      prisma.actionLog.findMany({
        include: {
          user: { select: { username: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.actionLog.count(),
    ])

    return { logs, total, page, limit }
  }

  async getPlatformStats() {
    const [totalPrizeDistributed, totalDeposits, totalWithdrawals] = await Promise.all([
      prisma.transaction.aggregate({
        where: { type: 'TOURNAMENT_PRIZE', status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { type: 'DEPOSIT', status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { type: 'WITHDRAWAL', status: 'COMPLETED' },
        _sum: { amount: true },
      }),
    ])

    return {
      prizeDistributed: totalPrizeDistributed._sum.amount || 0,
      totalDeposits: totalDeposits._sum.amount || 0,
      totalWithdrawals: Math.abs(Number(totalWithdrawals._sum.amount || 0)),
    }
  }
}
