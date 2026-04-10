export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly isOperational: boolean

  constructor(message: string, statusCode = 400, code = 'BAD_REQUEST') {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.isOperational = true
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Não autorizado') {
    super(message, 401, 'UNAUTHORIZED')
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Acesso negado') {
    super(message, 403, 'FORBIDDEN')
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso não encontrado') {
    super(message, 404, 'NOT_FOUND')
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflito de dados') {
    super(message, 409, 'CONFLICT')
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Muitas requisições, tente novamente mais tarde') {
    super(message, 429, 'TOO_MANY_REQUESTS')
  }
}

export class InsufficientFundsError extends AppError {
  constructor(message = 'Saldo insuficiente') {
    super(message, 402, 'INSUFFICIENT_FUNDS')
  }
}

export class ValidationError extends AppError {
  public readonly errors: Record<string, string[]>

  constructor(errors: Record<string, string[]>) {
    super('Erro de validação', 422, 'VALIDATION_ERROR')
    this.errors = errors
  }
}
