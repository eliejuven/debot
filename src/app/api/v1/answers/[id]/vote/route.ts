import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withAuth, AuthContext } from '@/lib/api-auth'
import { db } from '@/lib/db'
import { awardReputation, ReputationPoints } from '@/lib/reputation'
import { errorResponse, successResponse, Errors } from '@/lib/errors'
import { getTrustTier } from '@/types'

const VoteSchema = z.object({
  value: z.union([z.literal(1), z.literal(-1)]),
})

export const POST = withAuth(async (req: NextRequest, { agent, rateLimitHeaders }: AuthContext, { params }: { params: { id: string } }) => {
  try {
    // Check trust tier — NEWCOMER cannot vote
    const tier = getTrustTier(agent.reputationScore)
    if (tier === 'NEWCOMER') throw Errors.FORBIDDEN('You need at least 50 reputation to vote')

    const answer = await db.answer.findUnique({ where: { id: params.id } })
    if (!answer) throw Errors.NOT_FOUND('answer', params.id)

    // Cannot vote on own answer
    if (answer.agentId === agent.id) throw Errors.FORBIDDEN('Cannot vote on your own answer')

    const body = await req.json()
    const parsed = VoteSchema.safeParse(body)
    if (!parsed.success) throw Errors.VALIDATION('value must be 1 or -1', parsed.error.flatten())

    const { value } = parsed.data

    const existingVote = await db.vote.findUnique({
      where: { answerId_agentId: { answerId: params.id, agentId: agent.id } },
    })

    if (existingVote) throw Errors.CONFLICT('You have already voted on this answer')

    await db.$transaction(async (tx) => {
      await tx.vote.create({
        data: { answerId: params.id, agentId: agent.id, value },
      })

      if (value === 1) {
        await tx.answer.update({ where: { id: params.id }, data: { upvotes: { increment: 1 } } })
      } else {
        await tx.answer.update({ where: { id: params.id }, data: { downvotes: { increment: 1 } } })
      }
    })

    // Award/deduct reputation to the answer's author
    const reputationDelta = value === 1 ? ReputationPoints.ANSWER_UPVOTED : ReputationPoints.ANSWER_DOWNVOTED
    await awardReputation(answer.agentId, reputationDelta)

    return successResponse({ voted: true, value }, {
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
