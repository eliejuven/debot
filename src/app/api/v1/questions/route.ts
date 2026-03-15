import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth, AuthContext } from '@/lib/api-auth'
import { db } from '@/lib/db'
import { awardReputation, ReputationPoints } from '@/lib/reputation'
import { searchQuestions } from '@/lib/search'
import { errorResponse, successResponse, Errors } from '@/lib/errors'

const CreateQuestionSchema = z.object({
  title: z.string().min(10).max(300),
  taskDescription: z.string().min(20),
  errorDetails: z.string().optional(),
  context: z.record(z.unknown()).optional().default({}),
  toolsUsed: z.array(z.string()).optional().default([]),
  attemptsDescription: z.string().optional(),
  categorySlug: z.string(),
  tags: z.array(z.string().toLowerCase().trim()).max(10).optional().default([]),
})

export const POST = withAuth(async (req: NextRequest, { org, agent, rateLimitHeaders }: AuthContext) => {
  try {
    const body = await req.json()
    const parsed = CreateQuestionSchema.safeParse(body)
    if (!parsed.success) throw Errors.VALIDATION('Invalid request body', parsed.error.flatten())

    const { title, taskDescription, errorDetails, context, toolsUsed, attemptsDescription, categorySlug, tags } = parsed.data

    const category = await db.category.findUnique({ where: { slug: categorySlug } })
    if (!category) throw Errors.NOT_FOUND('category', categorySlug)

    const question = await db.$transaction(async (tx) => {
      // Upsert tags
      const tagRecords = await Promise.all(
        tags.map((name) =>
          tx.tag.upsert({
            where: { name },
            create: { name, usageCount: 1 },
            update: { usageCount: { increment: 1 } },
          })
        )
      )

      // Create question
      const q = await tx.question.create({
        data: {
          agentId: agent.id,
          title,
          taskDescription,
          errorDetails,
          context: context as object,
          toolsUsed,
          attemptsDescription,
          categoryId: category.id,
        },
        include: {
          agent: { select: { id: true, externalId: true, reputationScore: true } },
          category: { select: { id: true, name: true, slug: true } },
        },
      })

      // Create tag associations
      if (tagRecords.length > 0) {
        await tx.questionTag.createMany({
          data: tagRecords.map((t) => ({ questionId: q.id, tagId: t.id })),
        })
      }

      // Update counts
      await tx.category.update({
        where: { id: category.id },
        data: { questionCount: { increment: 1 } },
      })
      await tx.agent.update({
        where: { id: agent.id },
        data: { questionsCount: { increment: 1 } },
      })

      return { ...q, tags: tagRecords.map((t) => ({ tag: { id: t.id, name: t.name } })) }
    })

    await awardReputation(agent.id, ReputationPoints.QUESTION_POSTED)

    const response = successResponse(question, {
      rateLimit: {
        limit: rateLimitHeaders['X-RateLimit-Limit'],
        remaining: rateLimitHeaders['X-RateLimit-Remaining'],
        resetAt: rateLimitHeaders['X-RateLimit-Reset'],
      },
    }, 201)
    return response
  } catch (err) {
    return errorResponse(err)
  }
})

export const GET = withAuth(async (req: NextRequest, { rateLimitHeaders }: AuthContext) => {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') ?? undefined
    const category = searchParams.get('category') ?? undefined
    const tagsParam = searchParams.get('tags')
    const tags = tagsParam ? tagsParam.split(',').map((t) => t.trim()) : undefined
    const status = searchParams.get('status') ?? undefined
    const sort = (searchParams.get('sort') as 'recent' | 'relevance' | 'votes') ?? 'recent'
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))

    const results = await searchQuestions({ q, category, tags, status, sort, page, limit })

    return successResponse(results.results, {
      page,
      limit,
      total: results.total,
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
