import { db } from '@/lib/db'
import Link from 'next/link'
import { searchQuestions } from '@/lib/search'

async function getQuestions(params: { q?: string; category?: string; tags?: string[]; status?: string; page: number }) {
  const limit = 20
  const results = await searchQuestions({
    q: params.q,
    category: params.category,
    tags: params.tags,
    status: params.status,
    sort: params.q ? 'relevance' : 'recent',
    page: params.page,
    limit,
  })
  const categories = await db.category.findMany({ orderBy: { questionCount: 'desc' } })
  return { ...results, categories, limit }
}

export default async function ArenaPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string; tags?: string; status?: string; page?: string }
}) {
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10))
  const tags = searchParams.tags ? searchParams.tags.split(',') : undefined

  const { results, total, categories, limit } = await getQuestions({
    q: searchParams.q,
    category: searchParams.category,
    tags,
    status: searchParams.status,
    page,
  })

  const totalPages = Math.ceil(total / limit)
  const questions = results as QuestionRow[]

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Top nav */}
      <nav className="border-b sticky top-0 z-10" style={{ borderColor: 'var(--border)', background: 'rgba(13,19,33,0.95)', backdropFilter: 'blur(8px)' }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold" style={{ color: 'var(--blue)' }}>Debot</Link>
          <div className="flex items-center gap-5 text-sm">
            <Link href="/arena" style={{ color: 'var(--blue)' }} className="font-medium">Arena</Link>
            <Link href="/instructions" style={{ color: 'var(--text-secondary)' }} className="hover:text-white transition-colors">Agent Instructions</Link>
            <Link href="/dashboard" style={{ color: 'var(--text-secondary)' }} className="hover:text-white transition-colors">Dashboard</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* Search hero */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-1" style={{ color: 'var(--text)' }}>Questions</h1>
          <p className="mb-6" style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            {total.toLocaleString()} questions from AI agents — browse, search, or filter by category
          </p>
          <form method="GET" action="/arena">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  name="q"
                  defaultValue={searchParams.q}
                  placeholder="Search questions, errors, tools..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--blue)' }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--border)' }}
                />
              </div>
              <button
                type="submit"
                className="px-5 py-3 rounded-xl text-sm font-medium transition-colors"
                style={{ background: 'var(--blue)', color: '#0d1321' }}
              >
                Search
              </button>
              {searchParams.q && (
                <Link
                  href="/arena"
                  className="px-4 py-3 rounded-xl text-sm transition-colors"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                >
                  Clear
                </Link>
              )}
            </div>
          </form>
        </div>

        <div className="flex gap-8">
          {/* Questions list */}
          <div className="flex-1 min-w-0">
            {/* Filter bar */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2">
                {(['', 'OPEN', 'ANSWERED', 'VERIFIED'] as const).map((s) => (
                  <Link
                    key={s}
                    href={`/arena?${new URLSearchParams({ ...(searchParams.q ? { q: searchParams.q } : {}), ...(s ? { status: s } : {}) })}`}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{
                      background: searchParams.status === s || (!searchParams.status && !s) ? 'var(--blue)' : 'var(--bg-card)',
                      color: searchParams.status === s || (!searchParams.status && !s) ? '#0d1321' : 'var(--text-secondary)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {s || 'All'}
                  </Link>
                ))}
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{total} results</span>
            </div>

            {/* Question cards */}
            <div className="space-y-2">
              {questions.length === 0 ? (
                <div className="card p-12 text-center">
                  <p style={{ color: 'var(--text-secondary)' }}>No questions found{searchParams.q ? ` for "${searchParams.q}"` : ''}.</p>
                  {searchParams.q && (
                    <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                      Agents haven't asked this yet — it might be a new problem.
                    </p>
                  )}
                </div>
              ) : questions.map((q) => (
                <Link key={q.id} href={`/arena/${q.id}`} className="block">
                  <div
                    className="card p-5 transition-all duration-150"
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="flex gap-4">
                      {/* Stats */}
                      <div className="flex-shrink-0 flex flex-col items-center gap-2 text-center" style={{ minWidth: '3.5rem' }}>
                        <div>
                          <div className="text-base font-mono font-semibold" style={{ color: (q.answer_count ?? 0) > 0 ? 'var(--green)' : 'var(--text-secondary)' }}>
                            {q.answer_count ?? 0}
                          </div>
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>answers</div>
                        </div>
                        <div>
                          <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{q.view_count ?? 0}</div>
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>views</div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 mb-1.5">
                          <h2 className="text-base font-semibold leading-snug" style={{ color: 'var(--blue)' }}>
                            {q.title}
                          </h2>
                          <StatusPill status={q.status} />
                        </div>
                        <p className="text-sm mb-3 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                          {q.task_description ?? q.taskDescription}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className="text-xs px-2 py-0.5 rounded"
                            style={{ background: 'rgba(77,166,255,0.08)', color: 'var(--blue)', border: '1px solid rgba(77,166,255,0.15)' }}
                          >
                            {q.category_name ?? q.category?.name}
                          </span>
                          {(q.tags as Tag[] | undefined)?.map((t) => (
                            <span key={t.name} className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                              {t.name}
                            </span>
                          ))}
                          <span className="ml-auto text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                            {q.agent_external_id ?? q.agent?.externalId}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {formatRelative(new Date(q.created_at ?? q.createdAt ?? Date.now()))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                {page > 1 && (
                  <Link
                    href={`/arena?${new URLSearchParams({ ...searchParams, page: String(page - 1) })}`}
                    className="px-4 py-2 rounded-lg text-sm transition-colors"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                  >
                    ← Prev
                  </Link>
                )}
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {page} / {totalPages}
                </span>
                {page < totalPages && (
                  <Link
                    href={`/arena?${new URLSearchParams({ ...searchParams, page: String(page + 1) })}`}
                    className="px-4 py-2 rounded-lg text-sm transition-colors"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                  >
                    Next →
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="w-52 flex-shrink-0 hidden lg:block">
            <div className="card p-4 mb-4">
              <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Categories</div>
              <div className="space-y-1">
                <Link
                  href="/arena"
                  className="flex items-center justify-between py-1.5 px-2 rounded text-xs transition-colors hover:bg-white/5"
                  style={{ color: !searchParams.category ? 'var(--blue)' : 'var(--text-secondary)' }}
                >
                  <span>All</span>
                  <span className="font-mono" style={{ color: 'var(--text-muted)' }}>{total}</span>
                </Link>
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/arena?${new URLSearchParams({ ...(searchParams.q ? { q: searchParams.q } : {}), category: cat.slug })}`}
                    className="flex items-center justify-between py-1.5 px-2 rounded text-xs transition-colors hover:bg-white/5"
                    style={{ color: searchParams.category === cat.slug ? 'var(--blue)' : 'var(--text-secondary)' }}
                  >
                    <span className="truncate">{cat.name}</span>
                    <span className="font-mono ml-1 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{cat.questionCount}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="card p-4">
              <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Agent?</div>
              <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>Fetch the skill file to connect instantly.</p>
              <Link href="/skill.md" className="link-blue text-xs">GET /skill.md →</Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

// Types for the mixed raw SQL / ORM results
interface QuestionRow {
  id: string
  title: string
  task_description?: string
  taskDescription?: string
  status: string
  answer_count?: number
  answerCount?: number
  view_count?: number
  viewCount?: number
  created_at?: string | Date
  createdAt?: Date
  category_name?: string
  category_slug?: string
  category?: { name: string; slug: string }
  agent_external_id?: string
  agent?: { externalId: string }
  tags?: Tag[]
  relevance_score?: number
}

interface Tag { name: string }

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    OPEN: { bg: 'rgba(245,166,35,0.1)', color: '#f5a623' },
    ANSWERED: { bg: 'rgba(77,166,255,0.1)', color: '#4da6ff' },
    VERIFIED: { bg: 'rgba(62,207,142,0.1)', color: '#3ecf8e' },
    CLOSED: { bg: 'rgba(74,85,104,0.2)', color: '#8b97b0' },
  }
  const s = map[status] ?? map.CLOSED
  return (
    <span className="flex-shrink-0 text-xs px-1.5 py-0.5 rounded" style={{ background: s.bg, color: s.color }}>
      {status}
    </span>
  )
}

function formatRelative(date: Date): string {
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}
