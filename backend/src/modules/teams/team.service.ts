import { prisma } from '../../config/prisma'
import { NotFoundError, ConflictError, ForbiddenError } from '../../common/errors'
import { CreateTeamInput } from './team.schemas'

export class TeamService {
  async create(data: CreateTeamInput, ownerId: string) {
    const existing = await prisma.team.findFirst({
      where: { OR: [{ name: data.name }, { tag: data.tag.toUpperCase() }] },
    })
    if (existing) throw new ConflictError('Nome ou tag já em uso')

    return prisma.$transaction(async (tx) => {
      const team = await tx.team.create({
        data: {
          name: data.name,
          tag: data.tag.toUpperCase(),
          description: data.description,
          logoUrl: data.logoUrl,
          ownerId,
        },
      })

      await tx.teamMember.create({
        data: { teamId: team.id, userId: ownerId, role: 'owner' },
      })

      return team
    })
  }

  async getById(teamId: string) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: {
            user: { select: { id: true, username: true, displayName: true, avatarUrl: true, eloRating: true } },
          },
        },
        _count: { select: { members: true, participants: true } },
      },
    })
    if (!team) throw new NotFoundError('Equipe não encontrada')
    return team
  }

  async list(page = 1, limit = 20) {
    const skip = (page - 1) * limit
    const [teams, total] = await Promise.all([
      prisma.team.findMany({
        include: { _count: { select: { members: true } } },
        orderBy: { eloRating: 'desc' },
        skip,
        take: limit,
      }),
      prisma.team.count(),
    ])
    return { teams, total, page, limit }
  }

  async addMember(teamId: string, username: string, requesterId: string) {
    const team = await prisma.team.findUnique({ where: { id: teamId } })
    if (!team) throw new NotFoundError('Equipe não encontrada')
    if (team.ownerId !== requesterId) throw new ForbiddenError('Apenas o dono pode adicionar membros')

    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    })
    if (!user) throw new NotFoundError('Usuário não encontrado')

    const existing = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: user.id } },
    })
    if (existing) throw new ConflictError('Usuário já é membro')

    return prisma.teamMember.create({
      data: { teamId, userId: user.id },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    })
  }

  async removeMember(teamId: string, memberId: string, requesterId: string) {
    const team = await prisma.team.findUnique({ where: { id: teamId } })
    if (!team) throw new NotFoundError('Equipe não encontrada')
    if (team.ownerId !== requesterId && memberId !== requesterId) {
      throw new ForbiddenError('Sem permissão')
    }
    if (memberId === team.ownerId) throw new ForbiddenError('O dono não pode ser removido')

    await prisma.teamMember.delete({
      where: { teamId_userId: { teamId, userId: memberId } },
    })
  }
}
