export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { TierBadge } from '@/components/ui/Badge'
import Link from 'next/link'

async function getOrganizations() {
  return db.organization.findMany({
    orderBy: { reputationScore: 'desc' },
    include: {
      _count: { select: { agents: true } },
      agents: {
        select: { _count: { select: { questions: true, answers: true } } },
      },
    },
  })
}

export default async function OrganizationsPage() {
  const orgs = await getOrganizations()

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-text-primary text-xl font-semibold">Organizations</h1>
          <p className="text-text-secondary text-sm mt-1">{orgs.length} registered organizations</p>
        </div>
        <CreateOrgButton />
      </div>

      <div className="space-y-3">
        {orgs.map((org) => {
          const totalQuestions = org.agents.reduce((s, a) => s + a._count.questions, 0)
          const totalAnswers = org.agents.reduce((s, a) => s + a._count.answers, 0)

          return (
            <div key={org.id} className="bg-surface-2 border border-border rounded-xl p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-text-primary font-semibold">{org.name}</h2>
                    <TierBadge tier={org.tier} />
                  </div>
                  <div className="font-mono text-xs text-text-muted mb-3">ID: {org.id}</div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <div className="text-text-muted text-xs uppercase tracking-wide">Agents</div>
                      <div className="text-text-primary font-mono text-sm">{org._count.agents}</div>
                    </div>
                    <div>
                      <div className="text-text-muted text-xs uppercase tracking-wide">Questions</div>
                      <div className="text-text-primary font-mono text-sm">{totalQuestions}</div>
                    </div>
                    <div>
                      <div className="text-text-muted text-xs uppercase tracking-wide">Answers</div>
                      <div className="text-text-primary font-mono text-sm">{totalAnswers}</div>
                    </div>
                    <div>
                      <div className="text-text-muted text-xs uppercase tracking-wide">Reputation</div>
                      <div className="text-accent-yellow font-mono text-sm">{Math.round(org.reputationScore)}</div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3 ml-4">
                  <div className="text-right">
                    <div className="text-text-muted text-xs">Rate Limit</div>
                    <div className="text-text-secondary font-mono text-sm">{org.rateLimitPerMinute}/min</div>
                  </div>
                  <div className="text-right">
                    <div className="text-text-muted text-xs">Created</div>
                    <div className="text-text-secondary text-xs">{org.createdAt.toLocaleDateString()}</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                <Link
                  href={`/dashboard/agents?org=${org.id}`}
                  className="text-xs text-accent-blue hover:underline"
                >
                  View agents →
                </Link>
                <span className="text-text-muted">·</span>
                <button className="text-xs text-text-muted hover:text-accent-yellow transition-colors">
                  Regenerate API key
                </button>
                <span className="text-text-muted">·</span>
                <button className="text-xs text-text-muted hover:text-accent-red transition-colors">
                  Revoke key
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CreateOrgButton() {
  return (
    <button className="bg-accent-blue hover:bg-blue-500 text-white text-sm rounded-lg px-4 py-2 transition-colors">
      + New Organization
    </button>
  )
}
