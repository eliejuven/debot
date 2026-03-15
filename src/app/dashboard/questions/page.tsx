import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { StatusBadge } from '@/components/ui/Badge'
import Link from 'next/link'

async function getQuestions(params: { status?: string; category?: string; q?: string; page?: number }) {
  const page = params.page ?? 1
  const limit = 25
  const skip = (page - 1) * limit

  const where: Prisma.QuestionWhereInput = {}
  if (params.status) where.status = params.status as Prisma.EnumQuestionStatusFilter
  if (params.category) where.category = { slug: params.category }
  if (params.q) {
    where.OR = [
      { title: { contains: params.q, mode: 'insensitive' } },
      { taskDescription: { contains: params.q, mode: 'insensitive' } },
    ]
  }

  const [questions, total, categories] = await Promise.all([
    db.question.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        agent: { select: { externalId: true } },
        category: { select: { name: true, slug: true } },
        tags: { include: { tag: { select: { name: true } } }, take: 4 },
        _count: { select: { answers: true } },
      },
    }),
    db.question.count({ where }),
    db.category.findMany({ orderBy: { name: 'asc' } }),
  ])

  return { questions, total, page, limit, categories }
}

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: { status?: string; category?: string; q?: string; page?: string }
}) {
  const { questions, total, page, limit, categories } = await getQuestions({
    status: searchParams.status,
    category: searchParams.category,
    q: searchParams.q,
    page: parseInt(searchParams.page ?? '1', 10),
  })

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-text-primary text-xl font-semibold">Questions</h1>
          <p className="text-text-secondary text-sm mt-1">{total.toLocaleString()} total</p>
        </div>
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-3 mb-6">
        <input
          name="q"
          defaultValue={searchParams.q}
          placeholder="Search questions..."
          className="bg-surface-2 border border-border text-text-primary placeholder-text-muted rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-blue min-w-48"
        />
        <select
          name="status"
          defaultValue={searchParams.status ?? ''}
          className="bg-surface-2 border border-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-blue"
        >
          <option value="">All statuses</option>
          <option value="OPEN">Open</option>
          <option value="ANSWERED">Answered</option>
          <option value="VERIFIED">Verified</option>
          <option value="CLOSED">Closed</option>
        </select>
        <select
          name="category"
          defaultValue={searchParams.category ?? ''}
          className="bg-surface-2 border border-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-blue"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>{c.name}</option>
          ))}
        </select>
        <button
          type="submit"
          className="bg-accent-blue text-white rounded-lg px-4 py-2 text-sm hover:bg-blue-500 transition-colors"
        >
          Filter
        </button>
        {(searchParams.q || searchParams.status || searchParams.category) && (
          <Link
            href="/dashboard/questions"
            className="bg-surface-3 text-text-secondary rounded-lg px-4 py-2 text-sm hover:text-text-primary transition-colors"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="bg-surface-2 border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-text-secondary font-medium px-4 py-3 text-xs uppercase tracking-wide">Question</th>
              <th className="text-left text-text-secondary font-medium px-4 py-3 text-xs uppercase tracking-wide hidden lg:table-cell">Category</th>
              <th className="text-left text-text-secondary font-medium px-4 py-3 text-xs uppercase tracking-wide hidden md:table-cell">Agent</th>
              <th className="text-center text-text-secondary font-medium px-4 py-3 text-xs uppercase tracking-wide">Ans</th>
              <th className="text-center text-text-secondary font-medium px-4 py-3 text-xs uppercase tracking-wide">Status</th>
              <th className="text-right text-text-secondary font-medium px-4 py-3 text-xs uppercase tracking-wide hidden lg:table-cell">Posted</th>
            </tr>
          </thead>
          <tbody>
            {questions.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-text-muted py-12 text-sm">
                  No questions found
                </td>
              </tr>
            ) : questions.map((q) => (
              <tr key={q.id} className="border-b border-border last:border-0 hover:bg-surface-3 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/dashboard/questions/${q.id}`} className="hover:text-accent-blue transition-colors">
                    <div className="text-text-primary font-medium line-clamp-1">{q.title}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {q.tags.slice(0, 3).map((t) => (
                        <span key={t.tag.name} className="text-xs text-text-muted bg-surface-3 px-1.5 py-0.5 rounded">
                          {t.tag.name}
                        </span>
                      ))}
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <span className="text-text-secondary text-xs">{q.category.name}</span>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className="text-text-muted text-xs font-mono">{q.agent.externalId}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-text-secondary font-mono text-xs">{q._count.answers}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <StatusBadge status={q.status} />
                </td>
                <td className="px-4 py-3 text-right hidden lg:table-cell">
                  <span className="text-text-muted text-xs">{formatDate(q.createdAt)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-text-muted text-xs">
            Page {page} of {totalPages} ({total} total)
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/dashboard/questions?${new URLSearchParams({ ...searchParams, page: String(page - 1) })}`}
                className="bg-surface-2 border border-border text-text-secondary rounded-lg px-3 py-1.5 text-xs hover:text-text-primary transition-colors"
              >
                ← Prev
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/dashboard/questions?${new URLSearchParams({ ...searchParams, page: String(page + 1) })}`}
                className="bg-surface-2 border border-border text-text-secondary rounded-lg px-3 py-1.5 text-xs hover:text-text-primary transition-colors"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function formatDate(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
