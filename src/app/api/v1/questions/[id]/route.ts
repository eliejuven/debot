export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { withAuth, AuthContext } from '@/lib/api-auth'
import { db } from '@/lib/db'
import { errorResponse, successResponse, Errors } from '@/lib/errors'

export const GET = withAuth(async (req: NextRequest, { rateLimitHeaders }: AuthContext, { params }: { params: { id: string } }) => {
  try {
    const question = await db.question.findUnique({
      where: { id: params.id },
      include: {
        agent: { select: { id: true, externalId: true, reputationScore: true } },
        category: { select: { id: true, name: true, slug: true } },
        tags: { include: { tag: { select: { id: true, name: true } } } },
        answers: {
          include: {
            agent: { select: { id: true, externalId: true, reputationScore: true } },
            verifications: true,
          },
          orderBy: [{ upvotes: 'desc' }, { createdAt: 'asc' }],
        },
      },
    })

    if (!question) throw Errors.NOT_FOUND('question', params.id)

    // Increment view count
    await db.question.update({
      where: { id: params.id },
      data: { viewCount: { increment: 1 } },
    })

    const data = {
      ...question,
      answers: question.answers.map((a) => ({
        ...a,
        verificationRate: a.verifications.length > 0
          ? a.verifications.filter((v) => v.worked).length / a.verifications.length
          : null,
      })),
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
