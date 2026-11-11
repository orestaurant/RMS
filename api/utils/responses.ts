/**
 * Standard API Response Helper
 * Ensures all API responses follow a consistent format
 */

export interface SuccessResponse<T = any> {
  success: true
  message: string
  data: T
  meta?: Record<string, any>
}

export interface ErrorResponse {
  success: false
  message: string
  error: {
    code: string
    details?: Record<string, any>
  }
}

export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse

/**
 * Create a success response
 */
export const successResponse = <T>(
  data: T,
  message: string = 'Success',
  meta?: Record<string, any>
): SuccessResponse<T> => ({
  success: true,
  message,
  data,
  meta,
})

/**
 * Create an error response
 */
export const errorResponse = (
  message: string,
  code: string,
  details?: Record<string, any>
): ErrorResponse => ({
  success: false,
  message,
  error: {
    code,
    details,
  },
})

/**
 * Create a paginated response
 */
export const paginatedResponse = <T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  message: string = 'Success'
): SuccessResponse<T[]> => ({
  success: true,
  message,
  data,
  meta: {
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  },
})
