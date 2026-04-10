import { FastifyReply, FastifyRequest } from 'fastify'
import jwt from 'jsonwebtoken'
import { env } from '../../config/env'
import { UnauthorizedError, ForbiddenError } from '../errors'
import { prisma } from '../../config/prisma'

interface JwtPayload {
  sub: string
  role: string
  iat: number
  exp: number
}

declare module 'fastify' {
  interface FastifyRequest {
    userId: string
    userRole: string
  }
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Token não fornecido')
  }

  const token = authHeader.substring(7)

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { id: true, role: true, isBanned: true },
    })

    if (!user) {
      throw new UnauthorizedError('Usuário não encontrado')
    }

    if (user.isBanned) {
      throw new ForbiddenError('Conta suspensa')
    }

    request.userId = user.id
    request.userRole = user.role
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      throw error
    }
    throw new UnauthorizedError('Token inválido ou expirado')
  }
}

export function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    if (!roles.includes(request.userRole)) {
      throw new ForbiddenError('Permissão insuficiente')
    }
  }
}

export async function optionalAuth(request: FastifyRequest, _reply: FastifyReply) {
  const authHeader = request.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return
  }

  const token = authHeader.substring(7)

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload
    request.userId = decoded.sub
    request.userRole = decoded.role
  } catch {
    // Token inválido, continua sem autenticação
  }
}
