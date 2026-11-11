/**
 * Standard Error Classes and Handlers
 */

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: Record<string, any>) {
    super(400, 'VALIDATION_ERROR', message, details)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends ApiError {
  constructor(message: string = 'Unauthorized') {
    super(401, 'AUTHENTICATION_ERROR', message)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends ApiError {
  constructor(message: string = 'Forbidden') {
    super(403, 'AUTHORIZATION_ERROR', message)
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string, details?: Record<string, any>) {
    super(404, 'NOT_FOUND', message, details)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends ApiError {
  constructor(message: string, details?: Record<string, any>) {
    super(409, 'CONFLICT', message, details)
    this.name = 'ConflictError'
  }
}

export class InternalServerError extends ApiError {
  constructor(message: string = 'Internal server error') {
    super(500, 'INTERNAL_SERVER_ERROR', message)
    this.name = 'InternalServerError'
  }
}

export const handleError = (error: any) => {
  if (error instanceof ApiError) {
    return {
      statusCode: error.statusCode,
      message: error.message,
      code: error.code,
      details: error.details,
    }
  }

  // Log unexpected errors
  console.error('Unexpected error:', error)

  return {
    statusCode: 500,
    message: 'Internal server error',
    code: 'INTERNAL_SERVER_ERROR',
  }
}
