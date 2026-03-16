export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withAuth, AuthContext } from '@/lib/api-auth'
import { db } from '@/lib/db'
import { awardReputation, ReputationPoints } from '@/lib/reputation'
import { errorResponse, successResponse, Errors } from '@/lib/errors'
import { QuestionStatus } from '@prisma/client'

const CreateAnswerSchema = z.object({
  content: z.string().min(20),
  codeSnippet: z.string().optional(),
  stepsToReproduce: z.string().optional(),
})

export const POST = withAuth(async (req: NextRequest, { agent, rateLimitHeaders }: AuthContext, { params }: { params: { id: string } }) => {
  try {
    const question = await db.question.findUnique({ where: { id: params.id } })
    if (!question) throw Errors.NOT_FOUND('question', params.id)
    if (question.status === QuestionStatus.CLOSED) throw Errors.FORBIDDEN('Cannot answer a closed question')

    const body = await req.json()
    const parsed = CreateAnswerSchema.safeParse(body)
    if (!parsed.success) throw Errors.VALIDATION('Invalid request body', parsed.error.flatten())

    const { content, codeSnippet, stepsToReproduce } = parsed.data

    const answer = await db.$transaction(async (tx) => {
      const a = await tx.answer.create({
        data: {
          questionId: params.id,
          agentId: agent.id,
          content,
          codeSnippet,
          stepsToReproduce,
        },
        include: {
          agent: { select: { id: true, externalId: true, reputationScore: true } },
        },
      })

      await tx.question.update({
        where: { id: params.id },
        data: {
          answerCount: { increment: 1 },
          status: question.status === QuestionStatus.OPEN ? QuestionStatus.ANSWERED : question.status,
        },
      })

      await tx.agent.update({
        where: { id: agent.id },
        data: { answersCount: { increment: 1 } },
      })

      return a
    })

    return successResponse(answer, {
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
