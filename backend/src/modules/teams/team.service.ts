import { prisma } from '../../config/prisma'
import { NotFoundError, ConflictError, ForbiddenError, AppError } from '../../common/errors'
import { CreateTeamInput } from './team.schemas'
import { notify } from '../../common/utils/notify'

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

    const member = await prisma.teamMember.create({
      data: { teamId, userId: user.id },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    })

    // Notificar o usuário adicionado
    notify(
      user.id,
      'SOCIAL',
      'Adicionado a uma equipe',
      `Você foi adicionado à equipe ${team.name}!`,
      { teamId }
    ).catch(() => {})

    return member
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

  async update(teamId: string, data: { name?: string; description?: string; logoUrl?: string }, requesterId: string) {
    const team = await prisma.team.findUnique({ where: { id: teamId } })
    if (!team) throw new NotFoundError('Equipe não encontrada')
    if (team.ownerId !== requesterId) throw new ForbiddenError('Apenas o dono pode editar')

    const updateData: Record<string, unknown> = {}
    if (data.name) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl

    return prisma.team.update({ where: { id: teamId }, data: updateData })
  }

  async delete(teamId: string, requesterId: string) {
    const team = await prisma.team.findUnique({ where: { id: teamId } })
    if (!team) throw new NotFoundError('Equipe não encontrada')
    if (team.ownerId !== requesterId) throw new ForbiddenError('Apenas o dono pode deletar')

    // Check if team is in any active tournament
    const activePart = await prisma.participant.findFirst({
      where: { teamId, tournament: { status: { in: ['REGISTRATION', 'IN_PROGRESS'] } } },
    })
    if (activePart) throw new AppError('Não é possível deletar equipe inscrita em torneio ativo')

    await prisma.$transaction([
      prisma.teamMember.deleteMany({ where: { teamId } }),
      prisma.team.delete({ where: { id: teamId } }),
    ])
  }

  async transferOwnership(teamId: string, newOwnerId: string, requesterId: string) {
    const team = await prisma.team.findUnique({ where: { id: teamId } })
    if (!team) throw new NotFoundError('Equipe não encontrada')
    if (team.ownerId !== requesterId) throw new ForbiddenError('Apenas o dono pode transferir')

    const member = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: newOwnerId } },
    })
    if (!member) throw new AppError('Novo dono deve ser membro da equipe')

    await prisma.$transaction([
      prisma.team.update({ where: { id: teamId }, data: { ownerId: newOwnerId } }),
      prisma.teamMember.update({
        where: { teamId_userId: { teamId, userId: newOwnerId } },
        data: { role: 'owner' },
      }),
      prisma.teamMember.update({
        where: { teamId_userId: { teamId, userId: requesterId } },
        data: { role: 'member' },
      }),
    ])

    notify(newOwnerId, 'SOCIAL', 'Você é o novo dono!', `Você agora é dono da equipe ${team.name}`, { teamId }).catch(() => {})
  }
}
