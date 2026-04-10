import { prisma } from '../../config/prisma'
import { NotFoundError, InsufficientFundsError, ConflictError, AppError } from '../../common/errors'
import { DepositInput, WithdrawInput, ListTransactionsInput } from './wallet.schemas'

export class WalletService {
  async getBalance(userId: string) {
    const wallet = await prisma.wallet.findUnique({
      where: { userId },
      select: {
        id: true,
        balance: true,
        frozenAmount: true,
        updatedAt: true,
      },
    })

    if (!wallet) throw new NotFoundError('Carteira não encontrada')
    return wallet
  }

  async deposit(userId: string, data: DepositInput) {
    // Idempotência
    if (data.idempotencyKey) {
      const existing = await prisma.transaction.findUnique({
        where: { idempotencyKey: data.idempotencyKey },
      })
      if (existing) {
        throw new ConflictError('Transação já processada')
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } })
      if (!wallet) throw new NotFoundError('Carteira não encontrada')

      const balance = Number(wallet.balance)
      const newBalance = balance + data.amount

      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: { balance: newBalance },
      })

      const transaction = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: 'DEPOSIT',
          amount: data.amount,
          balanceBefore: balance,
          balanceAfter: newBalance,
          status: 'COMPLETED',
          description: 'Depósito na carteira',
          idempotencyKey: data.idempotencyKey,
        },
      })

      return { wallet: updatedWallet, transaction }
    })

    return result
  }

  async withdraw(userId: string, data: WithdrawInput) {
    // Idempotência
    if (data.idempotencyKey) {
      const existing = await prisma.transaction.findUnique({
        where: { idempotencyKey: data.idempotencyKey },
      })
      if (existing) {
        throw new ConflictError('Transação já processada')
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } })
      if (!wallet) throw new NotFoundError('Carteira não encontrada')

      const balance = Number(wallet.balance)
      const frozen = Number(wallet.frozenAmount)
      const available = balance - frozen

      if (available < data.amount) {
        throw new InsufficientFundsError(
          `Saldo disponível: R$ ${available.toFixed(2)}`
        )
      }

      const newBalance = balance - data.amount

      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: { balance: newBalance },
      })

      const transaction = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: 'WITHDRAWAL',
          amount: -data.amount,
          balanceBefore: balance,
          balanceAfter: newBalance,
          status: 'COMPLETED',
          description: 'Saque da carteira',
          idempotencyKey: data.idempotencyKey,
        },
      })

      return { wallet: updatedWallet, transaction }
    })

    return result
  }

  async listTransactions(userId: string, params: ListTransactionsInput) {
    const { page, limit, type } = params
    const skip = (page - 1) * limit

    const wallet = await prisma.wallet.findUnique({
      where: { userId },
      select: { id: true },
    })

    if (!wallet) throw new NotFoundError('Carteira não encontrada')

    const where: Record<string, unknown> = { walletId: wallet.id }
    if (type) where.type = type

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ])

    return { transactions, total, page, limit }
  }
}
