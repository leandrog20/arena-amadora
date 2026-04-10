import { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { AppError, ValidationError } from '../errors'
import { ZodError } from 'zod'

export function errorHandler(
  error: FastifyError | AppError | Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Log do erro
  request.log.error(error)

  // Erros de validação Zod
  if (error instanceof ZodError) {
    const formattedErrors: Record<string, string[]> = {}
    error.errors.forEach((e) => {
      const path = e.path.join('.')
      if (!formattedErrors[path]) {
        formattedErrors[path] = []
      }
      formattedErrors[path].push(e.message)
    })

    return reply.status(422).send({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Erro de validação',
      errors: formattedErrors,
    })
  }

  // Erros de validação customizados
  if (error instanceof ValidationError) {
    return reply.status(error.statusCode).send({
      success: false,
      code: error.code,
      message: error.message,
      errors: error.errors,
    })
  }

  // Erros da aplicação
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      success: false,
      code: error.code,
      message: error.message,
    })
  }

  // Erro do Fastify (rate limit, etc.)
  if ('statusCode' in error && typeof error.statusCode === 'number') {
    return reply.status(error.statusCode).send({
      success: false,
      code: error.code || 'ERROR',
      message: error.message,
    })
  }

  // Erro desconhecido
  return reply.status(500).send({
    success: false,
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Erro interno do servidor',
  })
}
