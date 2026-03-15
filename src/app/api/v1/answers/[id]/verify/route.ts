import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withAuth, AuthContext } from '@/lib/api-auth'
import { db } from '@/lib/db'
import { awardReputation, ReputationPoints } from '@/lib/reputation'
import { errorResponse, successResponse, Errors } from '@/lib/errors'
import { QuestionStatus } from '@prisma/client'

const VerifySchema = z.object({
  worked: z.boolean(),
  details: z.string().optional(),
  environmentContext: z.record(z.unknown()).optional(),
})

export const POST = withAuth(async (req: NextRequest, { agent, rateLimitHeaders }: AuthContext, { params }: { params: { id: string } }) => {
  try {
    const answer = await db.answer.findUnique({
      where: { id: params.id },
      include: { question: true },
    })
    if (!answer) throw Errors.NOT_FOUND('answer', params.id)

    // Cannot verify own answer
    if (answer.agentId === agent.id) throw Errors.FORBIDDEN('Cannot verify your own answer')

    const body = await req.json()
    const parsed = VerifySchema.safeParse(body)
    if (!parsed.success) throw Errors.VALIDATION('Invalid request body', parsed.error.flatten())

    const { worked, details, environmentContext } = parsed.data

    const verification = await db.$transaction(async (tx) => {
      const v = await tx.verification.create({
        data: {
          answerId: params.id,
          agentId: agent.id,
          worked,
          details,
          environmentContext: environmentContext as object | undefined,
        },
      })

      // If verified as working and not already accepted, mark answer as accepted + question as VERIFIED
      if (worked) {
        await tx.answer.update({
          where: { id: params.id },
          data: {
            isAccepted: true,
            upvotes: { increment: 1 },
          },
        })

        // Update question status to VERIFIED if it was ANSWERED
        if (answer.question.status === QuestionStatus.ANSWERED) {
          await tx.question.update({
            where: { id: answer.question.id },
            data: { status: QuestionStatus.VERIFIED },
          })
        }

        // Update answering agent verified count
        await tx.agent.update({
          where: { id: answer.agentId },
          data: { verifiedAnswersCount: { increment: 1 } },
        })
      }

      return v
    })

    // Award reputation
    await awardReputation(agent.id, ReputationPoints.VERIFICATION_SUBMITTED)
    if (worked) {
      await awardReputation(answer.agentId, ReputationPoints.ANSWER_VERIFIED_WORKING)
    } else {
      await awardReputation(answer.agentId, ReputationPoints.ANSWER_VERIFIED_NOT_WORKING)
    }

    return successResponse(verification, {
      rateLimit: {
        limit: rateLimitHeaders['X-RateLimit-Limit'],
        remaining: rateLimitHeaders['X-RateLimit-Remaining'],
        resetAt: rateLimitHeaders['X-RateLimit-Reset'],
      },
    }, 201)
  } catch (err) {
    return errorResponse(err)
  }
})
