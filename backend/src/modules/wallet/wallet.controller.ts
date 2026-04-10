import { FastifyReply, FastifyRequest } from 'fastify'
import { WalletService } from './wallet.service'
import { depositSchema, withdrawSchema, listTransactionsSchema } from './wallet.schemas'
import { sendSuccess, sendPaginated } from '../../common/utils'

const walletService = new WalletService()

export class WalletController {
  async getBalance(request: FastifyRequest, reply: FastifyReply) {
    const result = await walletService.getBalance(request.userId)
    return sendSuccess(reply, result)
  }

  async deposit(request: FastifyRequest, reply: FastifyReply) {
    const data = depositSchema.parse(request.body)
    const result = await walletService.deposit(request.userId, data)
    return sendSuccess(reply, result, 201)
  }

  async withdraw(request: FastifyRequest, reply: FastifyReply) {
    const data = withdrawSchema.parse(request.body)
    const result = await walletService.withdraw(request.userId, data)
    return sendSuccess(reply, result, 201)
  }

  async listTransactions(request: FastifyRequest, reply: FastifyReply) {
    const params = listTransactionsSchema.parse(request.query)
    const { transactions, total, page, limit } = await walletService.listTransactions(
      request.userId,
      params
    )
    return sendPaginated(reply, transactions, total, page, limit)
  }
}
