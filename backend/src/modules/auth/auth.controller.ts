import { FastifyReply, FastifyRequest } from 'fastify'
import { AuthService } from './auth.service'
import { registerSchema, loginSchema, refreshTokenSchema } from './auth.schemas'
import { sendSuccess, getClientIp } from '../../common/utils'

const authService = new AuthService()

export class AuthController {
  async register(request: FastifyRequest, reply: FastifyReply) {
    const data = registerSchema.parse(request.body)
    const ip = getClientIp(request)
    const userAgent = request.headers['user-agent']

    const result = await authService.register(data, ip, userAgent)
    return sendSuccess(reply, result, 201)
  }

  async login(request: FastifyRequest, reply: FastifyReply) {
    const data = loginSchema.parse(request.body)
    const ip = getClientIp(request)
    const userAgent = request.headers['user-agent']

    const result = await authService.login(data, ip, userAgent)
    return sendSuccess(reply, result)
  }

  async refresh(request: FastifyRequest, reply: FastifyReply) {
    const { refreshToken } = refreshTokenSchema.parse(request.body)
    const ip = getClientIp(request)
    const userAgent = request.headers['user-agent']

    const result = await authService.refreshToken(refreshToken, ip, userAgent)
    return sendSuccess(reply, result)
  }

  async logout(request: FastifyRequest, reply: FastifyReply) {
    const body = request.body as { refreshToken?: string } | undefined
    await authService.logout(request.userId, body?.refreshToken)
    return sendSuccess(reply, { message: 'Logout realizado com sucesso' })
  }

  async me(request: FastifyRequest, reply: FastifyReply) {
    const { prisma } = await import('../../config/prisma')
    const user = await prisma.user.findUnique({
      where: { id: request.userId },
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
        createdAt: true,
      },
    })
    return sendSuccess(reply, user)
  }
}
