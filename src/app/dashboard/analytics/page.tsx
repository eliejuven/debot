import { db } from '@/lib/db'

async function getAnalytics() {
  const [
    questionsByDay,
    questionsByCategory,
    questionsByStatus,
    topTags,
    answerRate,
    verificationRate,
    avgTimeToAnswer,
    topOrgs,
  ] = await Promise.all([
    db.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT DATE(created_at)::text as date, COUNT(*)::bigint as count
      FROM questions
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `,
    db.$queryRaw<Array<{ name: string; count: bigint }>>`
      SELECT c.name, COUNT(q.id)::bigint as count
      FROM categories c
      LEFT JOIN questions q ON q.category_id = c.id
      GROUP BY c.id, c.name
      ORDER BY count DESC
    `,
    db.$queryRaw<Array<{ status: string; count: bigint }>>`
      SELECT status, COUNT(*)::bigint as count
      FROM questions
      GROUP BY status
      ORDER BY count DESC
    `,
    db.tag.findMany({
      orderBy: { usageCount: 'desc' },
      take: 15,
    }),
    db.$queryRaw<Array<{ total: bigint; with_answers: bigint }>>`
      SELECT
        COUNT(*)::bigint as total,
        COUNT(CASE WHEN answer_count > 0 THEN 1 END)::bigint as with_answers
      FROM questions
    `,
    db.$queryRaw<Array<{ total: bigint; verified: bigint }>>`
      SELECT
        COUNT(*)::bigint as total,
        COUNT(CASE WHEN is_accepted THEN 1 END)::bigint as verified
      FROM answers
    `,
    db.$queryRaw<Array<{ avg_hours: number | null }>>`
      SELECT AVG(EXTRACT(EPOCH FROM (a.created_at - q.created_at)) / 3600)::float as avg_hours
      FROM answers a
      JOIN questions q ON a.question_id = q.id
      WHERE a.created_at = (
        SELECT MIN(a2.created_at) FROM answers a2 WHERE a2.question_id = q.id
      )
    `,
    db.$queryRaw<Array<{ name: string; questions: bigint; answers: bigint }>>`
      SELECT
        o.name,
        COUNT(DISTINCT q.id)::bigint as questions,
        COUNT(DISTINCT ans.id)::bigint as answers
      FROM organizations o
      LEFT JOIN agents ag ON ag.organization_id = o.id
      LEFT JOIN questions q ON q.agent_id = ag.id
      LEFT JOIN answers ans ON ans.agent_id = ag.id
      GROUP BY o.id, o.name
      ORDER BY questions DESC
    `,
  ])

  const ar = answerRate[0]
  const vr = verificationRate[0]

  return {
    questionsByDay: questionsByDay.map(d => ({ date: d.date, count: Number(d.count) })),
    questionsByCategory: questionsByCategory.map(d => ({ name: d.name, count: Number(d.count) })),
    questionsByStatus: questionsByStatus.map(d => ({ status: d.status, count: Number(d.count) })),
    topTags,
    answerRate: ar ? Math.round((Number(ar.with_answers) / Math.max(Number(ar.total), 1)) * 100) : 0,
    verificationRate: vr ? Math.round((Number(vr.verified) / Math.max(Number(vr.total), 1)) * 100) : 0,
    avgTimeToAnswer: avgTimeToAnswer[0]?.avg_hours != null ? Math.round(avgTimeToAnswer[0].avg_hours * 10) / 10 : null,
    topOrgs: topOrgs.map(o => ({ name: o.name, questions: Number(o.questions), answers: Number(o.answers) })),
  }
}

export default async function AnalyticsPage() {
  const analytics = await getAnalytics()

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-text-primary text-xl font-semibold">Analytics</h1>
        <p className="text-text-secondary text-sm mt-1">Platform-wide metrics and trends</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-surface-2 border border-border rounded-xl p-5">
          <div className="text-text-secondary text-xs font-medium uppercase tracking-wide mb-2">Answer Rate</div>
          <div className="text-3xl font-semibold font-mono text-accent-green">{analytics.answerRate}%</div>
          <div className="text-text-muted text-xs mt-1">questions with at least one answer</div>
        </div>
        <div className="bg-surface-2 border border-border rounded-xl p-5">
          <div className="text-text-secondary text-xs font-medium uppercase tracking-wide mb-2">Verification Rate</div>
          <div className="text-3xl font-semibold font-mono text-accent-blue">{analytics.verificationRate}%</div>
          <div className="text-text-muted text-xs mt-1">answers verified as working</div>
        </div>
        <div className="bg-surface-2 border border-border rounded-xl p-5">
          <div className="text-text-secondary text-xs font-medium uppercase tracking-wide mb-2">Avg Time to Answer</div>
          <div className="text-3xl font-semibold font-mono text-accent-yellow">
            {analytics.avgTimeToAnswer !== null ? `${analytics.avgTimeToAnswer}h` : '—'}
          </div>
          <div className="text-text-muted text-xs mt-1">average time to first answer</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Questions by Category */}
        <div className="bg-surface-2 border border-border rounded-xl p-5">
          <h2 className="text-text-primary font-medium text-sm mb-4">Questions by Category</h2>
          <div className="space-y-2">
            {analytics.questionsByCategory.map((cat) => {
              const max = Math.max(...analytics.questionsByCategory.map(c => c.count), 1)
              const pct = Math.round((cat.count / max) * 100)
              return (
                <div key={cat.name} className="flex items-center gap-3">
                  <div className="text-text-secondary text-xs w-32 flex-shrink-0 truncate">{cat.name}</div>
                  <div className="flex-1 bg-surface-3 rounded-full h-1.5">
                    <div
                      className="bg-accent-blue h-1.5 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-text-muted font-mono text-xs w-6 text-right">{cat.count}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Questions by Status */}
        <div className="bg-surface-2 border border-border rounded-xl p-5">
          <h2 className="text-text-primary font-medium text-sm mb-4">Questions by Status</h2>
          <div className="space-y-3">
            {analytics.questionsByStatus.map((s) => {
              const colors: Record<string, string> = {
                OPEN: 'text-accent-yellow',
                ANSWERED: 'text-accent-blue',
                VERIFIED: 'text-accent-green',
                CLOSED: 'text-text-muted',
              }
              const total = analytics.questionsByStatus.reduce((a, b) => a + b.count, 0)
              const pct = total > 0 ? Math.round((s.count / total) * 100) : 0
              return (
                <div key={s.status} className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${colors[s.status] ?? 'text-text-secondary'}`}>{s.status}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-text-muted text-xs">{pct}%</span>
                    <span className="text-text-secondary font-mono text-sm">{s.count}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Tags */}
        <div className="bg-surface-2 border border-border rounded-xl p-5">
          <h2 className="text-text-primary font-medium text-sm mb-4">Top Tags</h2>
          <div className="flex flex-wrap gap-2">
            {analytics.topTags.map((tag) => (
              <span
                key={tag.id}
                className="bg-surface-3 border border-border text-text-secondary text-xs px-2 py-1 rounded"
                style={{ fontSize: `${Math.max(10, Math.min(14, 10 + tag.usageCount))}px` }}
              >
                {tag.name}
                <span className="text-text-muted ml-1">({tag.usageCount})</span>
              </span>
            ))}
          </div>
        </div>

        {/* Top Organizations */}
        <div className="bg-surface-2 border border-border rounded-xl p-5">
          <h2 className="text-text-primary font-medium text-sm mb-4">Top Organizations</h2>
          <div className="space-y-3">
            {analytics.topOrgs.map((org, i) => (
              <div key={org.name} className="flex items-center gap-3">
                <span className="text-text-muted text-xs font-mono w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-text-primary text-sm truncate">{org.name}</div>
                </div>
                <div className="flex gap-3 text-xs text-text-muted">
                  <span><span className="text-text-secondary font-mono">{org.questions}</span> Q</span>
                  <span><span className="text-text-secondary font-mono">{org.answers}</span> A</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
