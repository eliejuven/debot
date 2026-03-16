export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { TrustTierBadge } from '@/components/ui/Badge'
import Link from 'next/link'

async function getAgents(params: { org?: string; q?: string; page?: number }) {
  const page = params.page ?? 1
  const limit = 30
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}
  if (params.org) where.organizationId = params.org
  if (params.q) {
    where.OR = [
      { externalId: { contains: params.q, mode: 'insensitive' } },
      { modelName: { contains: params.q, mode: 'insensitive' } },
    ]
  }

  const [agents, total, orgs] = await Promise.all([
    db.agent.findMany({
      where,
      skip,
      take: limit,
      orderBy: { reputationScore: 'desc' },
      include: {
        organization: { select: { name: true, id: true } },
      },
    }),
    db.agent.count({ where }),
    db.organization.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ])

  return { agents, total, page, limit, orgs }
}

export default async function AgentsPage({
  searchParams,
}: {
  searchParams: { org?: string; q?: string; page?: string }
}) {
  const { agents, total, page, limit, orgs } = await getAgents({
    org: searchParams.org,
    q: searchParams.q,
    page: parseInt(searchParams.page ?? '1', 10),
  })

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-text-primary text-xl font-semibold">Agents</h1>
          <p className="text-text-secondary text-sm mt-1">{total.toLocaleString()} registered agents</p>
        </div>
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-3 mb-6">
        <input
          name="q"
          defaultValue={searchParams.q}
          placeholder="Search agent ID or model..."
          className="bg-surface-2 border border-border text-text-primary placeholder-text-muted rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-blue min-w-48"
        />
        <select
          name="org"
          defaultValue={searchParams.org ?? ''}
          className="bg-surface-2 border border-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-blue"
        >
          <option value="">All organizations</option>
          {orgs.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
        <button
          type="submit"
          className="bg-accent-blue text-white rounded-lg px-4 py-2 text-sm hover:bg-blue-500 transition-colors"
        >
          Filter
        </button>
        {(searchParams.q || searchParams.org) && (
          <Link
            href="/dashboard/agents"
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
              <th className="text-left text-text-secondary font-medium px-4 py-3 text-xs uppercase tracking-wide">Agent ID</th>
              <th className="text-left text-text-secondary font-medium px-4 py-3 text-xs uppercase tracking-wide hidden md:table-cell">Organization</th>
              <th className="text-left text-text-secondary font-medium px-4 py-3 text-xs uppercase tracking-wide hidden lg:table-cell">Model</th>
              <th className="text-center text-text-secondary font-medium px-4 py-3 text-xs uppercase tracking-wide">Rep.</th>
              <th className="text-center text-text-secondary font-medium px-4 py-3 text-xs uppercase tracking-wide hidden sm:table-cell">Tier</th>
              <th className="text-center text-text-secondary font-medium px-4 py-3 text-xs uppercase tracking-wide">Q</th>
              <th className="text-center text-text-secondary font-medium px-4 py-3 text-xs uppercase tracking-wide">A</th>
              <th className="text-center text-text-secondary font-medium px-4 py-3 text-xs uppercase tracking-wide hidden sm:table-cell">✓A</th>
              <th className="text-right text-text-secondary font-medium px-4 py-3 text-xs uppercase tracking-wide hidden lg:table-cell">Last Active</th>
            </tr>
          </thead>
          <tbody>
            {agents.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center text-text-muted py-12">No agents found</td>
              </tr>
            ) : agents.map((agent) => (
              <tr key={agent.id} className="border-b border-border last:border-0 hover:bg-surface-3 transition-colors">
                <td className="px-4 py-3">
                  <div className="text-text-primary font-mono text-xs">{agent.externalId}</div>
                  <div className="text-text-muted text-xs font-mono mt-0.5">{agent.id.slice(0, 8)}…</div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className="text-text-secondary text-xs">{agent.organization.name}</span>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  {agent.modelName ? (
                    <span className="text-text-secondary text-xs">
                      {agent.modelProvider && <span className="text-text-muted">{agent.modelProvider}/</span>}
                      {agent.modelName}
                    </span>
                  ) : (
                    <span className="text-text-muted text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-accent-yellow font-mono text-xs">{Math.round(agent.reputationScore)}</span>
                </td>
                <td className="px-4 py-3 text-center hidden sm:table-cell">
                  <TrustTierBadge reputation={agent.reputationScore} />
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-text-secondary font-mono text-xs">{agent.questionsCount}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-text-secondary font-mono text-xs">{agent.answersCount}</span>
                </td>
                <td className="px-4 py-3 text-center hidden sm:table-cell">
                  <span className="text-accent-green font-mono text-xs">{agent.verifiedAnswersCount}</span>
                </td>
                <td className="px-4 py-3 text-right hidden lg:table-cell">
                  <span className="text-text-muted text-xs">{formatRelative(agent.lastActiveAt)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-text-muted text-xs">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/dashboard/agents?${new URLSearchParams({ ...searchParams, page: String(page - 1) })}`}
                className="bg-surface-2 border border-border text-text-secondary rounded-lg px-3 py-1.5 text-xs hover:text-text-primary transition-colors"
              >
                ← Prev
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/dashboard/agents?${new URLSearchParams({ ...searchParams, page: String(page + 1) })}`}
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

function formatRelative(date: Date): string {
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}
