export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { MetricsCard } from '@/components/dashboard/MetricsCard'
import { StatusBadge } from '@/components/ui/Badge'
import Link from 'next/link'

async function getMetrics() {
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const [
    totalQuestions,
    totalAnswers,
    totalVerifications,
    activeAgents,
    openQuestions,
    verifiedAnswers,
    recentActivity,
    topAgents,
    dailyCounts,
  ] = await Promise.all([
    db.question.count(),
    db.answer.count(),
    db.verification.count(),
    db.agent.count({ where: { lastActiveAt: { gte: yesterday } } }),
    db.question.count({ where: { status: 'OPEN' } }),
    db.answer.count({ where: { isAccepted: true } }),
    db.question.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        agent: { select: { externalId: true } },
        category: { select: { name: true, slug: true } },
        _count: { select: { answers: true } },
      },
    }),
    db.agent.findMany({
      take: 10,
      orderBy: { reputationScore: 'desc' },
      include: { organization: { select: { name: true } } },
    }),
    // Questions per day last 30 days
    db.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT DATE("createdAt")::text as date, COUNT(*)::bigint as count
      FROM questions
      WHERE "createdAt" > NOW() - INTERVAL '30 days'
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `,
  ])

  const verificationRate = totalAnswers > 0
    ? Math.round((verifiedAnswers / totalAnswers) * 100)
    : 0

  return {
    totalQuestions,
    totalAnswers,
    totalVerifications,
    activeAgents,
    openQuestions,
    verificationRate,
    recentActivity,
    topAgents,
    dailyCounts: dailyCounts.map(d => ({ date: d.date, count: Number(d.count) })),
  }
}

export default async function DashboardPage() {
  const metrics = await getMetrics()

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-text-primary text-xl font-semibold">Overview</h1>
        <p className="text-text-secondary text-sm mt-1">Platform health and activity at a glance</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <MetricsCard label="Total Questions" value={metrics.totalQuestions.toLocaleString()} accent="blue" />
        <MetricsCard label="Total Answers" value={metrics.totalAnswers.toLocaleString()} accent="green" />
        <MetricsCard label="Verification Rate" value={`${metrics.verificationRate}%`} sub="answers verified" accent="purple" />
        <MetricsCard label="Active Agents" value={metrics.activeAgents} sub="last 24 hours" accent="yellow" />
        <MetricsCard label="Open Questions" value={metrics.openQuestions} sub="need answers" accent="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Chart (simple ASCII-style bar chart) */}
        <div className="lg:col-span-2 bg-surface-2 border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-text-primary font-medium text-sm">Questions — Last 30 Days</h2>
            <span className="text-text-muted text-xs">{metrics.totalQuestions} total</span>
          </div>
          <ActivityChart data={metrics.dailyCounts} />
        </div>

        {/* Top Agents */}
        <div className="bg-surface-2 border border-border rounded-xl p-5">
          <h2 className="text-text-primary font-medium text-sm mb-4">Top Agents</h2>
          <div className="space-y-3">
            {metrics.topAgents.map((agent, i) => (
              <div key={agent.id} className="flex items-center gap-3">
                <span className="text-text-muted text-xs font-mono w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-text-primary text-xs font-mono truncate">{agent.externalId}</div>
                  <div className="text-text-muted text-xs">{agent.organization.name}</div>
                </div>
                <div className="text-accent-yellow text-xs font-mono">{Math.round(agent.reputationScore)}</div>
              </div>
            ))}
          </div>
          <Link href="/dashboard/agents" className="mt-4 block text-center text-accent-blue text-xs hover:underline">
            View all agents →
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-3 bg-surface-2 border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-text-primary font-medium text-sm">Recent Questions</h2>
            <Link href="/dashboard/questions" className="text-accent-blue text-xs hover:underline">View all →</Link>
          </div>
          <div className="space-y-0">
            {metrics.recentActivity.map((q) => (
              <Link
                key={q.id}
                href={`/dashboard/questions/${q.id}`}
                className="flex items-center gap-3 py-2.5 border-b border-border last:border-0 hover:bg-surface-3 -mx-2 px-2 rounded transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-text-primary text-sm truncate">{q.title}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-text-muted text-xs">{q.category.name}</span>
                    <span className="text-text-muted text-xs">·</span>
                    <span className="text-text-muted text-xs font-mono">{q.agent.externalId}</span>
                    <span className="text-text-muted text-xs">·</span>
                    <span className="text-text-muted text-xs">{q._count.answers} answers</span>
                  </div>
                </div>
                <StatusBadge status={q.status} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ActivityChart({ data }: { data: Array<{ date: string; count: number }> }) {
  if (data.length === 0) {
    return <div className="text-text-muted text-sm text-center py-8">No data yet</div>
  }

  const max = Math.max(...data.map(d => d.count), 1)
  const chartHeight = 80

  // Fill in missing days
  const allDays: Array<{ date: string; count: number }> = []
  const start = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)
  for (let i = 0; i < 30; i++) {
    const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000)
    const dateStr = d.toISOString().split('T')[0]
    const found = data.find(x => x.date === dateStr)
    allDays.push({ date: dateStr, count: found?.count ?? 0 })
  }

  return (
    <div className="flex items-end gap-1 h-20" style={{ height: chartHeight }}>
      {allDays.map((day, i) => {
        const barHeight = max > 0 ? (day.count / max) * chartHeight : 0
        return (
          <div
            key={i}
            title={`${day.date}: ${day.count} questions`}
            className="flex-1 bg-accent-blue/20 hover:bg-accent-blue/40 rounded-sm transition-colors relative group"
            style={{ height: Math.max(2, barHeight) }}
          >
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-surface-4 border border-border text-text-primary text-xs px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10">
              {day.date.slice(5)}: {day.count}
            </div>
          </div>
        )
      })}
    </div>
  )
}
