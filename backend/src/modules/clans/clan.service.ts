import { prisma } from '../../config/prisma'
import { NotFoundError, ConflictError, ForbiddenError, AppError } from '../../common/errors'
import { CreateClanInput, UpdateClanInput } from './clan.schemas'
import { notify } from '../../common/utils/notify'

export class ClanService {
  async create(data: CreateClanInput, ownerId: string) {
    const existing = await prisma.clan.findFirst({
      where: { OR: [{ name: data.name }, { tag: data.tag.toUpperCase() }] },
    })
    if (existing) throw new ConflictError('Nome ou tag já em uso')

    return prisma.$transaction(async (tx) => {
      const clan = await tx.clan.create({
        data: {
          name: data.name,
          tag: data.tag.toUpperCase(),
          description: data.description,
          logoUrl: data.logoUrl,
          ownerId,
          status: 'ACTIVE',
        },
      })

      await tx.clanMember.create({
        data: { clanId: clan.id, userId: ownerId, role: 'owner' },
      })

      return clan
    })
  }

  async getById(clanId: string) {
    const clan = await prisma.clan.findUnique({
      where: { id: clanId },
      include: {
        members: {
          include: {
            user: { select: { id: true, username: true, displayName: true, avatarUrl: true, eloRating: true } },
          },
        },
        _count: { select: { members: true, participants: true } },
      },
    })
    if (!clan) throw new NotFoundError('Clã não encontrado')
    return clan
  }

  async list(page = 1, limit = 20) {
    const skip = (page - 1) * limit
    const [clans, total] = await Promise.all([
      prisma.clan.findMany({
        include: { _count: { select: { members: true } } },
        orderBy: { eloRating: 'desc' },
        skip,
        take: limit,
      }),
      prisma.clan.count(),
    ])
    return { clans, total, page, limit }
  }

  async addMember(clanId: string, username: string, requesterId: string) {
    const clan = await prisma.clan.findUnique({ where: { id: clanId } })
    if (!clan) throw new NotFoundError('Clã não encontrado')

    const requester = await prisma.clanMember.findUnique({
      where: { clanId_userId: { clanId, userId: requesterId } },
    })

    // Apenas líder ou colíder pode adicionar membros
    if (!requester || (requester.role !== 'owner' && requester.role !== 'co-leader')) {
      throw new ForbiddenError('Apenas o líder ou colíder podem adicionar membros')
    }

    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    })
    if (!user) throw new NotFoundError('Usuário não encontrado')

    const existing = await prisma.clanMember.findUnique({
      where: { clanId_userId: { clanId, userId: user.id } },
    })
    if (existing) throw new ConflictError('Usuário já é membro')

    const member = await prisma.clanMember.create({
      data: { clanId, userId: user.id },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    })

    // Notificar o usuário adicionado
    notify(
      user.id,
      'SOCIAL',
      'Adicionado a um clã',
      `Você foi adicionado ao clã ${clan.name}!`,
      { clanId }
    ).catch(() => {})

    return member
  }

  async removeMember(clanId: string, memberId: string, requesterId: string) {
    const clan = await prisma.clan.findUnique({ where: { id: clanId } })
    if (!clan) throw new NotFoundError('Clã não encontrado')

    const requester = await prisma.clanMember.findUnique({
      where: { clanId_userId: { clanId, userId: requesterId } },
    })

    // Apenas líder ou colíder pode remover membros, além de si mesmo
    if (!requester || (requester.role !== 'owner' && requester.role !== 'co-leader')) {
      if (memberId !== requesterId) {
        throw new ForbiddenError('Sem permissão')
      }
    }

    if (memberId === clan.ownerId) throw new ForbiddenError('O líder não pode ser removido')

    await prisma.clanMember.delete({
      where: { clanId_userId: { clanId, userId: memberId } },
    })
  }

  async update(clanId: string, data: UpdateClanInput, requesterId: string) {
    const clan = await prisma.clan.findUnique({ where: { id: clanId } })
    if (!clan) throw new NotFoundError('Clã não encontrado')

    const requester = await prisma.clanMember.findUnique({
      where: { clanId_userId: { clanId, userId: requesterId } },
    })

    // Apenas líder ou colíder podem editar
    if (!requester || (requester.role !== 'owner' && requester.role !== 'co-leader')) {
      throw new ForbiddenError('Apenas o líder ou colíder podem editar')
    }

    const updateData: Record<string, unknown> = {}
    if (data.description !== undefined) updateData.description = data.description
    if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl
    if (data.status !== undefined) updateData.status = data.status

    return prisma.clan.update({ where: { id: clanId }, data: updateData })
  }

  async delete(clanId: string, requesterId: string) {
    const clan = await prisma.clan.findUnique({ where: { id: clanId } })
    if (!clan) throw new NotFoundError('Clã não encontrado')
    if (clan.ownerId !== requesterId) throw new ForbiddenError('Apenas o líder pode deletar')

    // Check if clan is in any active tournament
    const activePart = await prisma.participant.findFirst({
      where: { clanId, tournament: { status: { in: ['REGISTRATION', 'IN_PROGRESS'] } } },
    })
    if (activePart) throw new AppError('Não é possível deletar clã inscrito em torneio ativo')

    await prisma.$transaction([
      prisma.clanMember.deleteMany({ where: { clanId } }),
      prisma.clan.delete({ where: { id: clanId } }),
    ])
  }

  async setCoLeader(clanId: string, newCoLeaderId: string, requesterId: string) {
    const clan = await prisma.clan.findUnique({ where: { id: clanId } })
    if (!clan) throw new NotFoundError('Clã não encontrado')
    if (clan.ownerId !== requesterId) throw new ForbiddenError('Apenas o líder pode definir colíder')

    const member = await prisma.clanMember.findUnique({
      where: { clanId_userId: { clanId, userId: newCoLeaderId } },
    })
    if (!member) throw new AppError('Novo colíder deve ser membro do clã')

    await prisma.$transaction([
      prisma.clan.update({
        where: { id: clanId },
        data: { coLeaderId: newCoLeaderId },
      }),
      prisma.clanMember.update({
        where: { clanId_userId: { clanId, userId: newCoLeaderId } },
        data: { role: 'co-leader' },
      }),
      // Se havia um colíder anterior, reverter para member
      prisma.clanMember.updateMany({
        where: { clanId, userId: { not: newCoLeaderId }, role: 'co-leader' },
        data: { role: 'member' },
      }),
    ])

    notify(
      newCoLeaderId,
      'SOCIAL',
      'Você é colíder!',
      `Você agora é colíder do clã ${clan.name}`,
      { clanId }
    ).catch(() => {})
  }

  async removeCoLeader(clanId: string, requesterId: string) {
    const clan = await prisma.clan.findUnique({ where: { id: clanId } })
    if (!clan) throw new NotFoundError('Clã não encontrado')
    if (clan.ownerId !== requesterId) throw new ForbiddenError('Apenas o líder pode remover colíder')

    if (clan.coLeaderId) {
      await prisma.$transaction([
        prisma.clan.update({
          where: { id: clanId },
          data: { coLeaderId: null },
        }),
        prisma.clanMember.update({
          where: { clanId_userId: { clanId, userId: clan.coLeaderId } },
          data: { role: 'member' },
        }),
      ])
    }
  }

  async getClanChat(clanId: string, page = 1, limit = 50) {
    const clan = await prisma.clan.findUnique({ where: { id: clanId } })
    if (!clan) throw new NotFoundError('Clã não encontrado')

    const skip = (page - 1) * limit
    const [messages, total] = await Promise.all([
      prisma.chatMessage.findMany({
        where: { clanId },
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.chatMessage.count({ where: { clanId } }),
    ])

    return { messages: messages.reverse(), total, page, limit }
  }

  async sendClanMessage(clanId: string, userId: string, content: string) {
    const clan = await prisma.clan.findUnique({ where: { id: clanId } })
    if (!clan) throw new NotFoundError('Clã não encontrado')

    const member = await prisma.clanMember.findUnique({
      where: { clanId_userId: { clanId, userId } },
    })
    if (!member) throw new ForbiddenError('Você não é membro deste clã')

    return prisma.chatMessage.create({
      data: {
        clanId,
        userId,
        content,
      },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    })
  }

  async transferOwnership(clanId: string, newOwnerId: string, requesterId: string) {
    const clan = await prisma.clan.findUnique({ where: { id: clanId } })
    if (!clan) throw new NotFoundError('Clã não encontrado')
    if (clan.ownerId !== requesterId) throw new ForbiddenError('Apenas o líder pode transferir')

    const member = await prisma.clanMember.findUnique({
      where: { clanId_userId: { clanId, userId: newOwnerId } },
    })
    if (!member) throw new AppError('Novo líder deve ser membro do clã')

    await prisma.$transaction([
      prisma.clan.update({ where: { id: clanId }, data: { ownerId: newOwnerId } }),
      prisma.clanMember.update({
        where: { clanId_userId: { clanId, userId: newOwnerId } },
        data: { role: 'owner' },
      }),
      prisma.clanMember.update({
        where: { clanId_userId: { clanId, userId: requesterId } },
        data: { role: 'member' },
      }),
    ])

    notify(newOwnerId, 'SOCIAL', 'Você é o novo líder!', `Você agora é líder do clã ${clan.name}`, { clanId }).catch(
      () => {}
    )
  }
}
