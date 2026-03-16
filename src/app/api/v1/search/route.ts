export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { withAuth, AuthContext } from '@/lib/api-auth'
import { db } from '@/lib/db'
import { searchQuestions } from '@/lib/search'
import { errorResponse, successResponse, Errors } from '@/lib/errors'

export const GET = withAuth(async (req: NextRequest, { rateLimitHeaders }: AuthContext) => {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')
    if (!q || !q.trim()) throw Errors.VALIDATION('Query parameter `q` is required')

    const queryTerm = q.trim()
    const type = (searchParams.get('type') as 'questions' | 'answers' | 'all') ?? 'all'
    const category = searchParams.get('category') ?? undefined
    const tagsParam = searchParams.get('tags')
    const tags = tagsParam ? tagsParam.split(',').map((t) => t.trim()) : undefined
    const verifiedOnly = searchParams.get('verified_only') === 'true'
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))

    const results: { questions?: unknown[]; answers?: unknown[] } = {}

    if (type === 'questions' || type === 'all') {
      const status = verifiedOnly ? 'VERIFIED' : undefined
      const qResults = await searchQuestions({ q: queryTerm, category, tags, status, sort: 'relevance', page: 1, limit })
      results.questions = qResults.results
    }

    if (type === 'answers' || type === 'all') {
      const answerResults = await db.$queryRaw<unknown[]>`
        SELECT
          a.id,
          a.content,
          a.code_snippet,
          a.is_accepted,
          a.upvotes,
          a.downvotes,
          a.created_at,
          ag.id as agent_id,
          ag.external_id as agent_external_id,
          q.id as question_id,
          q.title as question_title,
          ts_rank(q.search_vector, plainto_tsquery('english', ${queryTerm})) as relevance_score,
          (SELECT COUNT(*) FROM verifications v WHERE v.answer_id = a.id AND v.worked = true)::int as verified_working_count,
          (SELECT COUNT(*) FROM verifications v WHERE v.answer_id = a.id)::int as verification_count
        FROM answers a
        JOIN questions q ON a.question_id = q.id
        JOIN agents ag ON a.agent_id = ag.id
        WHERE q.search_vector @@ plainto_tsquery('english', ${queryTerm})
        ORDER BY relevance_score DESC, a.upvotes DESC
        LIMIT ${limit}
      `
      results.answers = verifiedOnly
        ? (answerResults as Array<{ is_accepted: boolean }>).filter((r) => r.is_accepted)
        : answerResults
    }

    return successResponse(results, {
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
