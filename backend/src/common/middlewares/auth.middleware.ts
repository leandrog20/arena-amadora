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

// Cache de usuários banidos — verificado a cada 60s
const bannedCache = new Map<string, boolean>()
let bannedCacheTime = 0
const BANNED_CACHE_TTL = 60_000

async function isBanned(userId: string): Promise<boolean> {
  const now = Date.now()
  if (now - bannedCacheTime > BANNED_CACHE_TTL) {
    bannedCache.clear()
    bannedCacheTime = now
  }

  if (bannedCache.has(userId)) return bannedCache.get(userId)!

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isBanned: true },
  })

  const banned = !user || user.isBanned
  bannedCache.set(userId, banned)
  return banned
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Token não fornecido')
  }

  const token = authHeader.substring(7)

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload

    // JWT já contém userId e role — usa direto sem query ao DB
    request.userId = decoded.sub
    request.userRole = decoded.role

    // Verifica ban com cache (não bloqueia se já verificou recentemente)
    if (await isBanned(decoded.sub)) {
      throw new ForbiddenError('Conta suspensa')
    }
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
