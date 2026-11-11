/**
 * Standard API Response Types
 */

export interface SuccessResponse<T = any> {
  success: true
  message: string
  data: T
  meta?: Record<string, any>
}

export interface ErrorDetail {
  code: string
  details?: Record<string, any>
}

export interface ErrorResponse {
  success: false
  message: string
  error: ErrorDetail
}

export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse

/**
 * Helper to check if response is successful
 */
export function isSuccessResponse<T>(
  response: ApiResponse<T>
): response is SuccessResponse<T> {
  return response.success === true
}

/**
 * Helper to check if response is error
 */
export function isErrorResponse(response: ApiResponse): response is ErrorResponse {
  return response.success === false
}
