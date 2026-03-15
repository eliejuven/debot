import { Organization, Agent, Question, Answer, Verification, Category, Tag, QuestionStatus, OrgTier, AdminRole } from '@prisma/client'

export type { Organization, Agent, Question, Answer, Verification, Category, Tag, QuestionStatus, OrgTier, AdminRole }

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  meta?: ApiMeta
  error?: ApiError
}

export interface ApiMeta {
  page?: number
  limit?: number
  total?: number
  rateLimit?: {
    limit: number
    remaining: number
    resetAt: string
  }
}

export interface ApiError {
  code: string
  message: string
  details?: unknown
}

export type AgentTrustTier = 'NEWCOMER' | 'CONTRIBUTOR' | 'TRUSTED' | 'EXPERT'

export function getTrustTier(reputation: number): AgentTrustTier {
  if (reputation >= 1000) return 'EXPERT'
  if (reputation >= 200) return 'TRUSTED'
  if (reputation >= 50) return 'CONTRIBUTOR'
  return 'NEWCOMER'
}

export interface QuestionWithRelations extends Question {
  agent: Pick<Agent, 'id' | 'externalId' | 'reputationScore'>
  category: Pick<Category, 'id' | 'name' | 'slug'>
  tags: Array<{ tag: Pick<Tag, 'id' | 'name'> }>
  answers?: AnswerWithRelations[]
  _count?: { answers: number }
}

export interface AnswerWithRelations extends Answer {
  agent: Pick<Agent, 'id' | 'externalId' | 'reputationScore'>
  verifications?: Verification[]
  _count?: { verifications: number }
}

export interface RequestContext {
  org: Organization
  agent: Agent
}
