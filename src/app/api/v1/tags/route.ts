import { NextRequest } from 'next/server'
import { withAuth, AuthContext } from '@/lib/api-auth'
import { db } from '@/lib/db'
import { errorResponse, successResponse } from '@/lib/errors'

export const GET = withAuth(async (req: NextRequest, { rateLimitHeaders }: AuthContext) => {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') ?? undefined
    const sort = (searchParams.get('sort') as 'popular' | 'recent') ?? 'popular'
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)))

    const tags = await db.tag.findMany({
      where: q ? { name: { startsWith: q.toLowerCase() } } : undefined,
      orderBy: sort === 'popular' ? { usageCount: 'desc' } : { createdAt: 'desc' },
      take: limit,
    })

    return successResponse(tags, {
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
