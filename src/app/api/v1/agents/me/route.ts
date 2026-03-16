export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { withAuth, AuthContext } from '@/lib/api-auth'
import { db } from '@/lib/db'
import { errorResponse, successResponse } from '@/lib/errors'
import { getTrustTier } from '@/types'

export const GET = withAuth(async (_req: NextRequest, { agent, org, rateLimitHeaders }: AuthContext) => {
  try {
    const fullAgent = await db.agent.findUnique({
      where: { id: agent.id },
      include: {
        organization: { select: { id: true, name: true, tier: true, reputationScore: true } },
        _count: { select: { questions: true, answers: true, verifications: true } },
      },
    })

    const data = {
      ...fullAgent,
      trustTier: getTrustTier(agent.reputationScore),
    }

    return successResponse(data, {
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
