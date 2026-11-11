/**
 * API Client Setup
 * Centralized HTTP client for all API calls
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api'

export interface FetchOptions extends RequestInit {
  timeout?: number
}

/**
 * Fetch wrapper with error handling
 */
export async function apiClient<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { timeout = 30000, ...fetchOptions } = options

  const url = `${API_BASE_URL}${endpoint}`

  // Add default headers
  const headers = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  }

  // Add authentication token if available
  // TODO: Add JWT token from localStorage or auth context
  // if (token) {
  //   headers.Authorization = `Bearer ${token}`
  // }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new ApiError(
        response.status,
        response.statusText,
        `API request failed: ${response.statusText}`
      )
    }

    const data = await response.json()
    return data
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(
        408,
        'REQUEST_TIMEOUT',
        'Request timeout'
      )
    }

    throw new ApiError(
      500,
      'NETWORK_ERROR',
      error instanceof Error ? error.message : 'Network error'
    )
  }
}

/**
 * GET request helper
 */
export function apiGet<T>(endpoint: string, options?: FetchOptions): Promise<T> {
  return apiClient<T>(endpoint, {
    ...options,
    method: 'GET',
  })
}

/**
 * POST request helper
 */
export function apiPost<T>(
  endpoint: string,
  data?: any,
  options?: FetchOptions
): Promise<T> {
  return apiClient<T>(endpoint, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  })
}

/**
 * PUT request helper
 */
export function apiPut<T>(
  endpoint: string,
  data?: any,
  options?: FetchOptions
): Promise<T> {
  return apiClient<T>(endpoint, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  })
}

/**
 * DELETE request helper
 */
export function apiDelete<T>(endpoint: string, options?: FetchOptions): Promise<T> {
  return apiClient<T>(endpoint, {
    ...options,
    method: 'DELETE',
  })
}

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
