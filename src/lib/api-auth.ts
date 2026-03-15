import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { db } from './db'
import { checkRateLimit } from './rate-limiter'
import { Errors, errorResponse } from './errors'
import { Organization, Agent } from '@prisma/client'

export function hashApiKey(rawKey: string): string {
  const salt = process.env.API_KEY_SALT ?? 'default-salt'
  return crypto.createHmac('sha256', salt).update(rawKey).digest('hex')
}

export function generateApiKey(): string {
  return `dbt_${crypto.randomBytes(32).toString('hex')}`
}

export interface AuthContext {
  org: Organization
  agent: Agent
  rateLimitHeaders: Record<string, string>
}

export async function authenticateRequest(req: NextRequest): Promise<AuthContext> {
  const apiKey = req.headers.get('x-api-key')
  const agentExternalId = req.headers.get('x-agent-id')

  if (!apiKey) throw Errors.UNAUTHORIZED('Missing X-API-Key header')
  if (!agentExternalId) throw Errors.UNAUTHORIZED('Missing X-Agent-Id header')

  const keyHash = hashApiKey(apiKey)
  const org = await db.organization.findUnique({ where: { apiKeyHash: keyHash } })
  if (!org) throw Errors.UNAUTHORIZED('Invalid API key')

  // Rate limiting
  const rl = checkRateLimit(org.id, org.rateLimitPerMinute)
  const rateLimitHeaders: Record<string, string> = {
    'X-RateLimit-Limit': String(rl.limit),
    'X-RateLimit-Remaining': String(rl.remaining),
    'X-RateLimit-Reset': rl.resetAt.toISOString(),
  }

  if (!rl.allowed) {
    const err = Errors.RATE_LIMITED(rl.retryAfter ?? 60)
    throw Object.assign(err, { rateLimitHeaders, retryAfter: rl.retryAfter })
  }

  // Upsert agent
  const now = new Date()
  const agent = await db.agent.upsert({
    where: { organizationId_externalId: { organizationId: org.id, externalId: agentExternalId } },
    create: {
      externalId: agentExternalId,
      organizationId: org.id,
      lastActiveAt: now,
    },
    update: { lastActiveAt: now },
  })

  return { org, agent, rateLimitHeaders }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withAuth(handler: (req: NextRequest, ctx: AuthContext, routeCtx: any) => Promise<NextResponse>) {
  return async (req: NextRequest, routeCtx: unknown) => {
    try {
      const authCtx = await authenticateRequest(req)
      const response = await handler(req, authCtx, routeCtx)

      // Attach rate limit headers
      Object.entries(authCtx.rateLimitHeaders).forEach(([k, v]) => {
        response.headers.set(k, v)
      })

      return response
    } catch (err: unknown) {
      const response = errorResponse(err)
      // Attach rate limit headers even on error if available
      if (err && typeof err === 'object' && 'rateLimitHeaders' in err) {
        const headers = (err as { rateLimitHeaders: Record<string, string> }).rateLimitHeaders
        Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v))
        if ('retryAfter' in err) {
          response.headers.set('Retry-After', String((err as { retryAfter: number }).retryAfter))
        }
      }
      return response
    }
  }
}
