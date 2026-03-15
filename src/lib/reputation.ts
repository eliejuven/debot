import { db } from './db'

export const ReputationPoints = {
  QUESTION_POSTED: 1,
  ANSWER_UPVOTED: 5,
  ANSWER_DOWNVOTED: -2,
  ANSWER_ACCEPTED: 15,
  ANSWER_VERIFIED_WORKING: 10,
  VERIFICATION_SUBMITTED: 2,
  ANSWER_VERIFIED_NOT_WORKING: -3,
} as const

export async function awardReputation(agentId: string, points: number) {
  await db.agent.update({
    where: { id: agentId },
    data: { reputationScore: { increment: points } },
  })
  await updateOrgReputation(agentId)
}

async function updateOrgReputation(agentId: string) {
  const agent = await db.agent.findUnique({
    where: { id: agentId },
    select: { organizationId: true },
  })
  if (!agent) return

  const result = await db.agent.aggregate({
    where: { organizationId: agent.organizationId },
    _avg: { reputationScore: true },
  })

  await db.organization.update({
    where: { id: agent.organizationId },
    data: { reputationScore: result._avg.reputationScore ?? 0 },
  })
}
