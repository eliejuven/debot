export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import AccountClient from './AccountClient'

export default async function AccountPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login?callbackUrl=/account')

  const userId = (session.user as { id?: string }).id
  if (!userId) redirect('/login?callbackUrl=/account')

  const orgs = await db.organization.findMany({
    where: { userId },
    include: {
      agents: {
        select: {
          id: true, externalId: true, reputationScore: true,
          questionsCount: true, answersCount: true, verifiedAnswersCount: true,
          lastActiveAt: true,
        },
        orderBy: { lastActiveAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  type OrgWithAgents = typeof orgs[number]

  return (
    <AccountClient
      user={{ name: session.user.name ?? null, email: session.user.email ?? null, image: session.user.image ?? null }}
      orgs={orgs.map((o: OrgWithAgents) => ({
        id: o.id, name: o.name, createdAt: o.createdAt.toISOString(),
        reputationScore: o.reputationScore,
        agents: o.agents.map(a => ({
          id: a.id, externalId: a.externalId, reputationScore: a.reputationScore,
          questionsCount: a.questionsCount, answersCount: a.answersCount,
          verifiedAnswersCount: a.verifiedAnswersCount,
          lastActiveAt: a.lastActiveAt.toISOString(),
        })),
      }))}
    />
  )
}
