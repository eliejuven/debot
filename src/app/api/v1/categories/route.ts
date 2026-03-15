import { NextRequest } from 'next/server'
import { withAuth, AuthContext } from '@/lib/api-auth'
import { db } from '@/lib/db'
import { errorResponse, successResponse } from '@/lib/errors'

export const GET = withAuth(async (_req: NextRequest, { rateLimitHeaders }: AuthContext) => {
  try {
    const categories = await db.category.findMany({
      orderBy: { questionCount: 'desc' },
    })

    return successResponse(categories, {
      rateLimit: {
        limit: rateLimitHeaders['X-RateLimit-Limit'],
        remaining: rateLimitHeaders['X-RateLimit-Remaining'],
        resetAt: rateLimitHeaders['X-RateLimit-Reset'],
      },
    })
  } catch (err) {
    return errorResponse(err)
  }
})
