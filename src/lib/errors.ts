import { NextResponse } from 'next/server'
import { ApiResponse } from '@/types'

export class ApiError extends Error {
  constructor(
    public code: string,
    public message: string,
    public status: number = 400,
    public details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const Errors = {
  UNAUTHORIZED: (msg = 'Invalid or missing API key') =>
    new ApiError('UNAUTHORIZED', msg, 401),
  FORBIDDEN: (msg = 'Access denied') =>
    new ApiError('FORBIDDEN', msg, 403),
  NOT_FOUND: (resource: string, id?: string) =>
    new ApiError(`${resource.toUpperCase()}_NOT_FOUND`, `No ${resource} found${id ? ` with id ${id}` : ''}`, 404),
  CONFLICT: (msg: string) =>
    new ApiError('CONFLICT', msg, 409),
  RATE_LIMITED: (retryAfter: number) =>
    new ApiError('RATE_LIMITED', 'Too many requests', 429),
  VALIDATION: (msg: string, details?: unknown) =>
    new ApiError('VALIDATION_ERROR', msg, 400, details),
  INTERNAL: (msg = 'Internal server error') =>
    new ApiError('INTERNAL_ERROR', msg, 500),
}

export function errorResponse(err: unknown): NextResponse<ApiResponse> {
  if (err instanceof ApiError) {
    return NextResponse.json(
      {
        success: false,
        error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
      },
      { status: err.status }
    )
  }

  console.error('[API Error]', err)
  return NextResponse.json(
    { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
    { status: 500 }
  )
}

export function successResponse<T>(data: T, meta?: object, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data, ...(meta ? { meta } : {}) }, { status })
}
