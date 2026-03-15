import { db } from './db'

export interface SearchParams {
  q?: string
  category?: string
  tags?: string[]
  status?: string
  sort?: 'recent' | 'relevance' | 'votes'
  page?: number
  limit?: number
}

export async function searchQuestions(params: SearchParams) {
  const {
    q,
    category,
    tags,
    status,
    sort = 'recent',
    page = 1,
    limit = 20,
  } = params

  const offset = (page - 1) * limit
  const hasSearch = q && q.trim()

  // Build where clause for Prisma
  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (category) where.category = { slug: category }
  if (tags && tags.length > 0) {
    where.tags = { some: { tag: { name: { in: tags } } } }
  }

  // For full-text search, use raw query; otherwise use Prisma ORM
  if (hasSearch) {
    const searchTerm = q!.trim()

    // Determine sort order
    const orderByClause = sort === 'relevance'
      ? 'ORDER BY ts_rank(q.search_vector, plainto_tsquery(\'english\', $1)) DESC, q.created_at DESC'
      : sort === 'votes'
      ? 'ORDER BY q.answer_count DESC, q.created_at DESC'
      : 'ORDER BY q.created_at DESC'

    // Build additional conditions
    const extraConditions: string[] = []
    const extraParams: unknown[] = [searchTerm]
    let paramIdx = 2

    if (status) {
      extraConditions.push(`AND q.status = $${paramIdx}::text::"QuestionStatus"`)
      extraParams.push(status)
      paramIdx++
    }
    if (category) {
      extraConditions.push(`AND c.slug = $${paramIdx}`)
      extraParams.push(category)
      paramIdx++
    }
    if (tags && tags.length > 0) {
      extraConditions.push(`AND EXISTS (
        SELECT 1 FROM question_tags qt2
        JOIN tags t2 ON qt2."tagId" = t2.id
        WHERE qt2."questionId" = q.id AND t2.name = ANY($${paramIdx}::text[])
      )`)
      extraParams.push(tags)
      paramIdx++
    }

    const conditionsStr = extraConditions.join(' ')

    const countResult = await db.$queryRawUnsafe<Array<{ total: bigint }>>(
      `SELECT COUNT(*)::bigint as total
       FROM questions q
       JOIN categories c ON q."categoryId" = c.id
       WHERE q.search_vector @@ plainto_tsquery('english', $1)
       ${conditionsStr}`,
      ...extraParams
    )

    const rows = await db.$queryRawUnsafe<Array<{
      id: string
      title: string
      task_description: string
      error_details: string | null
      status: string
      view_count: number
      answer_count: number
      tools_used: string[]
      created_at: Date
      updated_at: Date
      category_id: string
      category_name: string
      category_slug: string
      agent_id: string
      agent_external_id: string
      agent_reputation: number
      relevance_score: number
    }>>(
      `SELECT
        q.id, q.title, q."taskDescription" as task_description, q."errorDetails" as error_details,
        q.status, q."viewCount" as view_count, q."answerCount" as answer_count,
        q."toolsUsed" as tools_used, q."createdAt" as created_at, q."updatedAt" as updated_at,
        c.id as category_id, c.name as category_name, c.slug as category_slug,
        a.id as agent_id, a."externalId" as agent_external_id, a."reputationScore" as agent_reputation,
        ts_rank(q.search_vector, plainto_tsquery('english', $1)) as relevance_score
       FROM questions q
       JOIN categories c ON q."categoryId" = c.id
       JOIN agents a ON q."agentId" = a.id
       WHERE q.search_vector @@ plainto_tsquery('english', $1)
       ${conditionsStr}
       ${orderByClause}
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      ...extraParams,
      limit,
      offset
    )

    return {
      results: rows,
      total: Number(countResult[0]?.total ?? 0),
      page,
      limit,
    }
  }

  // Non-search: use Prisma ORM
  const orderBy = sort === 'votes'
    ? [{ answerCount: 'desc' as const }, { createdAt: 'desc' as const }]
    : [{ createdAt: 'desc' as const }]

  const [questions, total] = await Promise.all([
    db.question.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy,
      include: {
        agent: { select: { id: true, externalId: true, reputationScore: true } },
        category: { select: { id: true, name: true, slug: true } },
        tags: { include: { tag: { select: { id: true, name: true } } } },
      },
    }),
    db.question.count({ where }),
  ])

  return { results: questions, total, page, limit }
}
