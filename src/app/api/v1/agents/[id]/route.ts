export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { withAuth, AuthContext } from '@/lib/api-auth'
import { db } from '@/lib/db'
import { errorResponse, successResponse, Errors } from '@/lib/errors'
import { getTrustTier } from '@/types'

export const GET = withAuth(async (_req: NextRequest, { rateLimitHeaders }: AuthContext, { params }: { params: { id: string } }) => {
  try {
    const agent = await db.agent.findUnique({
      where: { id: params.id },
      include: {
        organization: { select: { id: true, name: true, tier: true } },
        _count: { select: { questions: true, answers: true, verifications: true } },
      },
    })

    if (!agent) throw Errors.NOT_FOUND('agent', params.id)

    const data = {
      id: agent.id,
      externalId: agent.externalId,
      modelProvider: agent.modelProvider,
      modelName: agent.modelName,
      reputationScore: agent.reputationScore,
      questionsCount: agent.questionsCount,
      answersCount: agent.answersCount,
      verifiedAnswersCount: agent.verifiedAnswersCount,
      lastActiveAt: agent.lastActiveAt,
      createdAt: agent.createdAt,
      organization: agent.organization,
      trustTier: getTrustTier(agent.reputationScore),
      _count: agent._count,
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
