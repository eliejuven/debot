export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'

async function getData() {
  const [adminUsers, categories, agentCount, orgCount] = await Promise.all([
    db.adminUser.findMany({ orderBy: { createdAt: 'asc' } }),
    db.category.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { questions: true } } } }),
    db.agent.count(),
    db.organization.count(),
  ])
  return { adminUsers, categories, agentCount, orgCount }
}

export default async function SettingsPage() {
  const { adminUsers, categories, agentCount, orgCount } = await getData()

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-text-primary text-xl font-semibold">Settings</h1>
        <p className="text-text-secondary text-sm mt-1">Platform configuration and administration</p>
      </div>

      <div className="space-y-6">
        {/* System Status */}
        <section className="bg-surface-2 border border-border rounded-xl p-5">
          <h2 className="text-text-primary font-semibold mb-4">System Health</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-accent-green" />
              <span className="text-text-secondary text-sm">Database</span>
              <span className="text-accent-green text-xs ml-auto">Connected</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-accent-green" />
              <span className="text-text-secondary text-sm">API</span>
              <span className="text-accent-green text-xs ml-auto">Operational</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-accent-green" />
              <span className="text-text-secondary text-sm">Search Index</span>
              <span className="text-accent-green text-xs ml-auto">Active</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-accent-green" />
              <span className="text-text-secondary text-sm">Rate Limiter</span>
              <span className="text-accent-green text-xs ml-auto">In-memory</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
            <div>
              <div className="text-text-muted text-xs uppercase tracking-wide">Total Agents</div>
              <div className="text-text-primary font-mono text-sm">{agentCount}</div>
            </div>
            <div>
              <div className="text-text-muted text-xs uppercase tracking-wide">Organizations</div>
              <div className="text-text-primary font-mono text-sm">{orgCount}</div>
            </div>
          </div>
        </section>

        {/* Admin Users */}
        <section className="bg-surface-2 border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-text-primary font-semibold">Admin Users</h2>
            <button className="text-xs bg-accent-blue text-white px-3 py-1.5 rounded-lg hover:bg-blue-500 transition-colors">
              + Add Admin
            </button>
          </div>
          <div className="space-y-2">
            {adminUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <div className="text-text-primary text-sm">{user.email}</div>
                  <div className="text-text-muted text-xs font-mono">{user.id}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded border ${
                    user.role === 'ADMIN'
                      ? 'text-accent-purple border-accent-purple/20 bg-accent-purple/10'
                      : 'text-text-secondary border-border bg-surface-3'
                  }`}>
                    {user.role}
                  </span>
                  <span className="text-text-muted text-xs">{user.createdAt.toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Categories */}
        <section className="bg-surface-2 border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-text-primary font-semibold">Categories</h2>
            <button className="text-xs bg-surface-3 text-text-secondary border border-border px-3 py-1.5 rounded-lg hover:text-text-primary transition-colors">
              + Add Category
            </button>
          </div>
          <div className="space-y-1">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="text-text-primary text-sm">{cat.name}</div>
                    <div className="text-text-muted text-xs">{cat.slug}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-text-secondary font-mono text-xs">{cat._count.questions} questions</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Default Rate Limits */}
        <section className="bg-surface-2 border border-border rounded-xl p-5">
          <h2 className="text-text-primary font-semibold mb-4">Default Rate Limits (per minute)</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { tier: 'FREE', limit: 30, color: 'text-text-secondary' },
              { tier: 'PRO', limit: 60, color: 'text-accent-blue' },
              { tier: 'ENTERPRISE', limit: 120, color: 'text-accent-purple' },
            ].map((tier) => (
              <div key={tier.tier} className="bg-surface-3 border border-border rounded-lg p-4">
                <div className={`text-xs font-medium mb-1 ${tier.color}`}>{tier.tier}</div>
                <div className="text-text-primary font-mono text-xl">{tier.limit}</div>
                <div className="text-text-muted text-xs">req/min</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
