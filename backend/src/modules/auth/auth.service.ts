import bcrypt from 'bcrypt'
import jwt, { type SignOptions } from 'jsonwebtoken'
import { v4 as uuid } from 'uuid'
import { prisma } from '../../config/prisma'
import { env } from '../../config/env'
import {
  UnauthorizedError,
  ConflictError,
  ForbiddenError,
} from '../../common/errors'
import { RegisterInput, LoginInput } from './auth.schemas'
import dayjs from 'dayjs'

export class AuthService {
  async register(data: RegisterInput, ip?: string, userAgent?: string) {
    const existingEmail = await prisma.user.findUnique({
      where: { email: data.email },
    })
    if (existingEmail) {
      throw new ConflictError('Email já cadastrado')
    }

    const existingUsername = await prisma.user.findUnique({
      where: { username: data.username },
    })
    if (existingUsername) {
      throw new ConflictError('Nome de usuário já em uso')
    }

    // Verificação anti-fraude: múltiplas contas do mesmo IP
    if (ip) {
      const recentAccountsFromIp = await prisma.ipLog.count({
        where: {
          ipAddress: ip,
          action: 'REGISTER',
          createdAt: { gte: dayjs().subtract(24, 'hour').toDate() },
        },
      })
      if (recentAccountsFromIp >= 3) {
        throw new ForbiddenError('Muitas contas criadas deste IP recentemente')
      }
    }

    const passwordHash = await bcrypt.hash(data.password, 12)

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: data.email,
          username: data.username,
          passwordHash,
          displayName: data.displayName || data.username,
          lastLoginIp: ip,
          lastLoginAt: new Date(),
        },
      })

      // Criar carteira
      await tx.wallet.create({
        data: { userId: newUser.id },
      })

      // Log de IP
      if (ip) {
        await tx.ipLog.create({
          data: {
            userId: newUser.id,
            ipAddress: ip,
            userAgent,
            action: 'REGISTER',
          },
        })
      }

      return newUser
    })

    const tokens = await this.generateTokens(user.id, user.role, ip, userAgent)

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      },
      ...tokens,
    }
  }

  async login(data: LoginInput, ip?: string, userAgent?: string) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (!user) {
      throw new UnauthorizedError('Credenciais inválidas')
    }

    if (user.isBanned) {
      throw new ForbiddenError(`Conta suspensa: ${user.banReason || 'Violação dos termos'}`)
    }

    const passwordValid = await bcrypt.compare(data.password, user.passwordHash)
    if (!passwordValid) {
      throw new UnauthorizedError('Credenciais inválidas')
    }

    // Atualizar último login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ip,
      },
    })

    // Log de IP
    if (ip) {
      await prisma.ipLog.create({
        data: {
          userId: user.id,
          ipAddress: ip,
          userAgent,
          action: 'LOGIN',
        },
      })
    }

    const tokens = await this.generateTokens(user.id, user.role, ip, userAgent)

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        role: user.role,
        level: user.level,
        xp: user.xp,
        eloRating: user.eloRating,
      },
      ...tokens,
    }
  }

  async refreshToken(token: string, ip?: string, userAgent?: string) {
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
      // Se token já foi usado (possível roubo), revogar todos os tokens do usuário
      if (storedToken && storedToken.isRevoked) {
        await prisma.refreshToken.updateMany({
          where: { userId: storedToken.userId },
          data: { isRevoked: true },
        })
      }
      throw new UnauthorizedError('Refresh token inválido')
    }

    if (storedToken.user.isBanned) {
      throw new ForbiddenError('Conta suspensa')
    }

    // Revogar token atual (rotação)
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    })

    const tokens = await this.generateTokens(
      storedToken.userId,
      storedToken.user.role,
      ip,
      userAgent
    )

    return {
      user: {
        id: storedToken.user.id,
        email: storedToken.user.email,
        username: storedToken.user.username,
        displayName: storedToken.user.displayName,
        avatarUrl: storedToken.user.avatarUrl,
        role: storedToken.user.role,
      },
      ...tokens,
    }
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { userId, token: refreshToken },
        data: { isRevoked: true },
      })
    } else {
      // Revogar todos os refresh tokens
      await prisma.refreshToken.updateMany({
        where: { userId },
        data: { isRevoked: true },
      })
    }
  }

  private async generateTokens(
    userId: string,
    role: string,
    ip?: string,
    userAgent?: string
  ) {
    const accessToken = jwt.sign(
      { sub: userId, role },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN } as SignOptions
    )

    const refreshToken = uuid()
    const refreshExpiresAt = dayjs().add(7, 'day').toDate()

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt: refreshExpiresAt,
        ipAddress: ip,
        userAgent,
      },
    })

    // Limpar tokens expirados do usuário
    await prisma.refreshToken.deleteMany({
      where: {
        userId,
        expiresAt: { lt: new Date() },
      },
    })

    return { accessToken, refreshToken }
  }

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true },
    })

    // Sempre retorna sucesso para não revelar se o email existe
    if (!user) return { message: 'Se o email existir, enviaremos um link de recuperação' }

    // Token JWT assinado com hash da senha — invalidado automaticamente quando a senha muda
    const resetToken = jwt.sign(
      { sub: user.id, purpose: 'password-reset' },
      env.JWT_SECRET + user.passwordHash,
      { expiresIn: '15m' } as SignOptions,
    )

    // TODO: Enviar email com link: ${env.FRONTEND_URL}/reset-password?token=${resetToken}
    // Por enquanto, loga no console (dev)
    if (env.NODE_ENV === 'development') {
      console.log(`🔑 Reset link: ${env.FRONTEND_URL}/reset-password?token=${resetToken}`)
    }

    return { message: 'Se o email existir, enviaremos um link de recuperação' }
  }

  async resetPassword(token: string, newPassword: string) {
    // Decodifica sem verificar para pegar o userId
    const unverified = jwt.decode(token) as { sub?: string; purpose?: string } | null
    if (!unverified?.sub || unverified.purpose !== 'password-reset') {
      throw new UnauthorizedError('Token inválido ou expirado')
    }

    const user = await prisma.user.findUnique({
      where: { id: unverified.sub },
      select: { id: true, passwordHash: true },
    })

    if (!user) {
      throw new UnauthorizedError('Token inválido ou expirado')
    }

    // Verifica o token com a senha atual como parte do secret
    try {
      jwt.verify(token, env.JWT_SECRET + user.passwordHash)
    } catch {
      throw new UnauthorizedError('Token inválido ou expirado')
    }

    const passwordHash = await bcrypt.hash(newPassword, 12)

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    })

    // Revogar todos os refresh tokens (força re-login)
    await prisma.refreshToken.updateMany({
      where: { userId: user.id },
      data: { isRevoked: true },
    })

    return { message: 'Senha alterada com sucesso' }
  }
}
