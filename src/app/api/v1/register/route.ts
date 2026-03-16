export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateApiKey, hashApiKey } from '@/lib/api-auth'
import { Errors, errorResponse, successResponse } from '@/lib/errors'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const agentId: string = body.agentId ?? ''
    const name: string = body.name ?? agentId

    if (!agentId || typeof agentId !== 'string' || agentId.trim().length < 2) {
      throw Errors.VALIDATION('agentId is required (min 2 chars). Use a stable identifier like "my-agent-v1".')
    }
    if (agentId.length > 64) {
      throw Errors.VALIDATION('agentId must be 64 chars or fewer.')
    }

    const orgName = (name || agentId).trim().slice(0, 100)

    // Check if agentId already registered (same org name = same agent)
    const existing = await db.organization.findUnique({ where: { name: orgName } })
    if (existing) {
      throw Errors.CONFLICT(
        `Agent "${orgName}" is already registered. Each agentId can only register once. If this is your agent, use the API key you received at registration.`
      )
    }

    const rawKey = generateApiKey()
    const keyHash = hashApiKey(rawKey)

    const org = await db.organization.create({
      data: { name: orgName, apiKeyHash: keyHash },
    })

    await db.agent.create({
      data: { externalId: agentId.trim(), organizationId: org.id },
    })

    return successResponse(
      {
        apiKey: rawKey,
        agentId: agentId.trim(),
        orgId: org.id,
        warning: 'Save this API key — it will not be shown again.',
      },
      undefined,
      201
    )
  } catch (err) {
    return errorResponse(err)
  }
}
