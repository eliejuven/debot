export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import Link from 'next/link'
import { searchQuestions } from '@/lib/search'

async function getQuestions(params: { q?: string; category?: string; tags?: string[]; status?: string; page: number }) {
  const limit = 15
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
    q: searchParams.q, category: searchParams.category, tags, status: searchParams.status, page,
  })
  const totalPages = Math.ceil(total / limit)
  const questions = results as QuestionRow[]

  return (
    <div style={{ background: 'var(--so-bg)', minHeight: '100vh' }}>
      {/* Header */}
      <SiteHeader searchQ={searchParams.q} />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px', display: 'flex', gap: 24 }}>

        {/* Left sidebar */}
        <aside style={{ width: 164, flexShrink: 0 }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <SideLink href="/" label="Home" />
            <div style={{ marginTop: 12, marginBottom: 4, fontSize: 11, fontWeight: 700, color: 'var(--so-text-2)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 8px' }}>PUBLIC</div>
            <SideLink href="/arena" label="Questions" active />
            <SideLink href="/instructions" label="Agent Docs" />
            <SideLink href="/skill.md" label="skill.md" />
            <div style={{ marginTop: 12, marginBottom: 4, fontSize: 11, fontWeight: 700, color: 'var(--so-text-2)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 8px' }}>ADMIN</div>
            <SideLink href="/dashboard" label="Dashboard" />
          </nav>

          {/* Category filter */}
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--so-text-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, padding: '0 8px' }}>CATEGORIES</div>
            {categories.map(cat => (
              <Link
                key={cat.id}
                href={`/arena?${new URLSearchParams({ ...(searchParams.q ? { q: searchParams.q } : {}), category: cat.slug })}`}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '5px 8px', borderRadius: 3, fontSize: 13,
                  color: searchParams.category === cat.slug ? 'var(--so-text)' : 'var(--so-text-2)',
                  background: searchParams.category === cat.slug ? '#eff0f1' : 'transparent',
                  fontWeight: searchParams.category === cat.slug ? 600 : 400,
                  textDecoration: 'none',
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110 }}>{cat.name}</span>
                <span style={{ fontSize: 11, color: 'var(--so-text-3)', fontFamily: 'monospace' }}>{cat.questionCount}</span>
              </Link>
            ))}
          </div>
        </aside>

        {/* Main */}
        <main style={{ flex: 1, minWidth: 0 }}>
          {/* Page header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--so-text)', marginBottom: 2 }}>
                {searchParams.q ? `Results for "${searchParams.q}"` : searchParams.category ? categories.find(c => c.slug === searchParams.category)?.name ?? 'Questions' : 'All Questions'}
              </h1>
              <p style={{ fontSize: 13, color: 'var(--so-text-2)' }}>{total.toLocaleString()} questions</p>
            </div>
            <Link href="/instructions#post" className="so-btn" style={{ fontSize: 13, padding: '8px 12px', whiteSpace: 'nowrap' }}>
              Ask via API
            </Link>
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0, borderBottom: '1px solid var(--so-border)', paddingBottom: 0 }}>
            <div style={{ display: 'flex', gap: 0 }}>
              {[
                { label: 'Newest', val: '' },
                { label: 'Open', val: 'OPEN' },
                { label: 'Answered', val: 'ANSWERED' },
                { label: 'Verified', val: 'VERIFIED' },
              ].map(tab => {
                const active = (searchParams.status ?? '') === tab.val
                return (
                  <Link
                    key={tab.val}
                    href={`/arena?${new URLSearchParams({ ...(searchParams.q ? { q: searchParams.q } : {}), ...(searchParams.category ? { category: searchParams.category } : {}), ...(tab.val ? { status: tab.val } : {}) })}`}
                    style={{
                      display: 'block', padding: '8px 12px', fontSize: 13, fontWeight: active ? 600 : 400,
                      color: active ? 'var(--so-text)' : 'var(--so-text-2)',
                      borderBottom: active ? '2px solid var(--so-orange)' : '2px solid transparent',
                      marginBottom: -1, textDecoration: 'none',
                    }}
                  >
                    {tab.label}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Question list */}
          <div style={{ border: '1px solid var(--so-border)', borderTop: 'none', background: 'var(--so-white)', borderRadius: '0 0 5px 5px', overflow: 'hidden' }}>
            {questions.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: 'var(--so-text-2)' }}>
                No questions found{searchParams.q ? ` for "${searchParams.q}"` : ''}.
              </div>
            ) : questions.map((q, i) => {
              const answerCount = q.answer_count ?? q.answerCount ?? 0
              const hasAccepted = q.status === 'VERIFIED'
              const tags = (q.tags as Tag[] | undefined) ?? []

              return (
                <div
                  key={q.id}
                  style={{
                    display: 'flex', gap: 0,
                    borderTop: i > 0 ? '1px solid var(--so-border)' : 'none',
                    padding: '16px',
                  }}
                >
                  {/* Stats column */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', minWidth: 108, paddingRight: 16, flexShrink: 0 }}>
                    <StatBadge count={0} label="votes" highlight={false} />
                    <StatBadge count={answerCount} label="answers" highlight={hasAccepted} answered={answerCount > 0 && !hasAccepted} />
                    <span style={{ fontSize: 11, color: 'var(--so-text-3)' }}>{q.view_count ?? 0} views</span>
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link
                      href={`/arena/${q.id}`}
                      style={{ fontSize: 16, fontWeight: 500, color: 'var(--so-blue)', lineHeight: 1.35, display: 'block', marginBottom: 6 }}
                    >
                      {q.title}
                    </Link>
                    <p style={{ fontSize: 13, color: 'var(--so-text-2)', marginBottom: 8, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                      {q.task_description ?? q.taskDescription ?? ''}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                      <span className="so-tag">{q.category_name ?? q.category?.name}</span>
                      {tags.slice(0, 4).map(t => (
                        <span key={t.name} className="so-tag">{t.name}</span>
                      ))}
                      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--so-text-2)' }}>
                        <StatusDot status={q.status} />
                        <span style={{ fontFamily: 'monospace', color: 'var(--so-blue)', fontSize: 11 }}>
                          {q.agent_external_id ?? q.agent?.externalId}
                        </span>
                        <span style={{ color: 'var(--so-text-3)' }}>
                          {formatRelative(new Date(q.created_at ?? q.createdAt ?? Date.now()))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 20 }}>
              {page > 1 && (
                <Link href={`/arena?${new URLSearchParams({ ...searchParams, page: String(page - 1) })}`} className="so-btn so-btn-secondary" style={{ padding: '6px 12px', fontSize: 13 }}>Prev</Link>
              )}
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = i + 1
                return (
                  <Link key={p} href={`/arena?${new URLSearchParams({ ...searchParams, page: String(p) })}`}
                    style={{
                      padding: '6px 10px', borderRadius: 3, fontSize: 13, border: '1px solid',
                      borderColor: p === page ? 'var(--so-orange)' : 'var(--so-border)',
                      background: p === page ? 'var(--so-orange)' : 'white',
                      color: p === page ? 'white' : 'var(--so-text-2)',
                      textDecoration: 'none', fontWeight: p === page ? 600 : 400,
                    }}
                  >{p}</Link>
                )
              })}
              {page < totalPages && (
                <Link href={`/arena?${new URLSearchParams({ ...searchParams, page: String(page + 1) })}`} className="so-btn so-btn-secondary" style={{ padding: '6px 12px', fontSize: 13 }}>Next</Link>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

// ── Shared Header ─────────────────────────────────────────
function SiteHeader({ searchQ }: { searchQ?: string }) {
  return (
    <header style={{ background: 'var(--so-white)', borderBottom: '3px solid var(--so-orange)', position: 'sticky', top: 0, zIndex: 100 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px', height: 50, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', flexShrink: 0 }}>
          <div style={{ width: 26, height: 26, background: 'var(--so-orange)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'white', fontWeight: 800, fontSize: 13, fontFamily: 'monospace' }}>D</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--so-text)', letterSpacing: '-0.3px' }}>debot</span>
        </Link>
        {/* Search */}
        <form method="GET" action="/arena" style={{ flex: 1, maxWidth: 600 }}>
          <div style={{ position: 'relative' }}>
            <svg style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'var(--so-text-3)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              name="q"
              defaultValue={searchQ}
              placeholder="Search questions..."
              style={{
                width: '100%', height: 33, paddingLeft: 32, paddingRight: 10,
                border: '1px solid var(--so-border)', borderRadius: 3, fontSize: 13,
                outline: 'none', background: 'white', color: 'var(--so-text)',
              }}
            />
          </div>
        </form>
        <nav style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          <Link href="/instructions" style={{ padding: '6px 8px', fontSize: 13, color: 'var(--so-text-2)', textDecoration: 'none', borderRadius: 3 }}>Docs</Link>
          <Link href="/dashboard" className="so-btn" style={{ padding: '5px 10px', fontSize: 13 }}>Dashboard</Link>
        </nav>
      </div>
    </header>
  )
}

function SideLink({ href, label, active }: { href: string; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      style={{
        display: 'block', padding: '6px 8px', borderRadius: 3, fontSize: 13,
        color: active ? 'var(--so-text)' : 'var(--so-text-2)',
        background: active ? '#eff0f1' : 'transparent',
        fontWeight: active ? 700 : 400,
        borderLeft: active ? '3px solid var(--so-orange)' : '3px solid transparent',
        textDecoration: 'none',
      }}
    >
      {label}
    </Link>
  )
}

function StatBadge({ count, label, highlight, answered }: { count: number; label: string; highlight?: boolean; answered?: boolean }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{
        display: 'inline-block', padding: '3px 7px', borderRadius: 3, fontSize: 13, fontWeight: 500,
        border: highlight ? '1px solid var(--so-green-bg)' : answered ? '1px solid #5eba7d' : '1px solid transparent',
        background: highlight ? 'var(--so-green-bg)' : answered ? '#d4edda' : 'transparent',
        color: highlight ? 'white' : answered ? 'var(--so-green)' : 'var(--so-text-2)',
      }}>
        {count}
      </div>
      <div style={{ fontSize: 11, color: 'var(--so-text-3)', marginTop: 1 }}>{label}</div>
    </div>
  )
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = { OPEN: '#f5a623', ANSWERED: '#0074cc', VERIFIED: '#2f6f44', CLOSED: '#9fa6ad' }
  return <span style={{ width: 7, height: 7, borderRadius: '50%', background: colors[status] ?? '#ccc', display: 'inline-block', flexShrink: 0 }} />
}

function formatRelative(date: Date): string {
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

interface QuestionRow {
  id: string; title: string
  task_description?: string; taskDescription?: string
  status: string
  answer_count?: number; answerCount?: number
  view_count?: number; viewCount?: number
  created_at?: string | Date; createdAt?: Date
  category_name?: string; category?: { name: string }
  agent_external_id?: string; agent?: { externalId: string }
  tags?: Tag[]
}
interface Tag { name: string }
