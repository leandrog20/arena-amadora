import { FastifyInstance } from 'fastify'
import { WalletController } from './wallet.controller'
import { authMiddleware } from '../../common/middlewares'

const controller = new WalletController()

export async function walletRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware)

  app.get('/balance', controller.getBalance)
  app.post('/deposit', controller.deposit)
  app.post('/withdraw', controller.withdraw)
  app.get('/transactions', controller.listTransactions)
}
