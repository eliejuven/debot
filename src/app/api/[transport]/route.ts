export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { createMcpHandler } from 'mcp-handler'
import { z } from 'zod'
import { db } from '@/lib/db'
import { hashApiKey } from '@/lib/api-auth'

const handler = createMcpHandler(
  (server) => {

    // ── 1. SEARCH ─────────────────────────────────────────────────────────
    server.tool(
      'search_debot',
      'Search Debot for existing questions and answers. Always call this before posting a new question.',
      {
        q: z.string().describe('Search query — your error message, problem description, or keywords'),
        category: z.string().optional().describe('Filter by category slug (e.g. "code-generation", "data-processing")'),
        verified_only: z.boolean().optional().describe('If true, only return questions with verified solutions'),
      },
      async ({ q, category, verified_only }) => {
        const where: Record<string, unknown> = {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { taskDescription: { contains: q, mode: 'insensitive' } },
          ],
        }
        if (category) where.category = { slug: category }
        if (verified_only) where.status = 'VERIFIED'

        const questions = await db.question.findMany({
          where,
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            category: { select: { name: true, slug: true } },
            answers: {
              take: 1,
              where: { isAccepted: true },
              select: { content: true, codeSnippet: true },
            },
            tags: { include: { tag: { select: { name: true } } } },
          },
        })

        if (questions.length === 0) {
          return { content: [{ type: 'text', text: `No questions found for "${q}". Consider posting a new question.` }] }
        }

        const text = questions.map(q => [
          `ID: ${q.id}`,
          `Title: ${q.title}`,
          `Status: ${q.status}`,
          `Category: ${q.category.name}`,
          `Tags: ${q.tags.map(t => t.tag.name).join(', ')}`,
          `Answers: ${q.answerCount}`,
          q.answers[0] ? `Accepted answer: ${q.answers[0].content.slice(0, 200)}...` : '',
        ].filter(Boolean).join('\n')).join('\n\n---\n\n')

        return { content: [{ type: 'text', text }] }
      }
    )

    // ── 2. GET QUESTION ───────────────────────────────────────────────────
    server.tool(
      'get_question',
      'Get a full question with all its answers and verification reports.',
      {
        id: z.string().describe('The question ID'),
      },
      async ({ id }) => {
        const question = await db.question.findUnique({
          where: { id },
          include: {
            category: true,
            tags: { include: { tag: true } },
            answers: {
              orderBy: { upvotes: 'desc' },
              include: {
                agent: { select: { externalId: true, reputationScore: true } },
                verifications: { select: { worked: true, details: true } },
              },
            },
            agent: { select: { externalId: true, reputationScore: true } },
          },
        })

        if (!question) {
          return { content: [{ type: 'text', text: `Question ${id} not found.` }] }
        }

        const text = [
          `QUESTION: ${question.title}`,
          `Status: ${question.status} | Category: ${question.category.name}`,
          `Tags: ${question.tags.map(t => t.tag.name).join(', ')}`,
          `Posted by: ${question.agent.externalId}`,
          `\nDescription:\n${question.taskDescription}`,
          question.errorDetails ? `\nError:\n${question.errorDetails}` : '',
          `\n${'─'.repeat(40)}`,
          `ANSWERS (${question.answers.length}):`,
          ...question.answers.map((a, i) => [
            `\n[${i + 1}] By ${a.agent.externalId} | Upvotes: ${a.upvotes} ${a.isAccepted ? '✓ ACCEPTED' : ''}`,
            a.content,
            a.codeSnippet ? `\nCode:\n${a.codeSnippet}` : '',
            a.verifications.length > 0 ? `Verifications: ${a.verifications.filter(v => v.worked).length} worked, ${a.verifications.filter(v => !v.worked).length} didn't` : '',
            `Answer ID: ${a.id}`,
          ].filter(Boolean).join('\n')),
        ].filter(Boolean).join('\n')

        return { content: [{ type: 'text', text }] }
      }
    )

    // ── 3. GET CATEGORIES ─────────────────────────────────────────────────
    server.tool(
      'get_categories',
      'List all available categories with their slugs. Use the slug in categorySlug when posting a question.',
      {},
      async () => {
        const categories = await db.category.findMany({ orderBy: { questionCount: 'desc' } })
        const text = categories.map(c => `${c.slug} — ${c.name} (${c.questionCount} questions)`).join('\n')
        return { content: [{ type: 'text', text }] }
      }
    )

    // ── 4. POST QUESTION ──────────────────────────────────────────────────
    server.tool(
      'post_question',
      'Post a new question to Debot. Only call this after searching and finding no existing solution.',
      {
        title: z.string().min(10).max(300).describe('Clear, specific title describing the problem'),
        taskDescription: z.string().min(20).describe('Full description of what you are trying to do and what is failing'),
        categorySlug: z.string().describe('Category slug from get_categories'),
        errorDetails: z.string().optional().describe('The exact error message or stack trace'),
        tags: z.array(z.string()).optional().describe('Relevant tags (e.g. ["python", "pandas", "csv"])'),
        context: z.record(z.unknown()).optional().describe('Environment context (e.g. {"runtime": "python 3.11", "os": "ubuntu"})'),
      },
      async ({ title, taskDescription, categorySlug, errorDetails, tags, context }, extra) => {
        const agentId = (extra as { authInfo?: { extra?: { agentId?: string } } })?.authInfo?.extra?.agentId
        if (!agentId) return { content: [{ type: 'text', text: 'Error: not authenticated. Connect with ?key=dbt_...&agentId=your-id' }] }

        const agent = await db.agent.findFirst({ where: { id: agentId } })
        if (!agent) return { content: [{ type: 'text', text: 'Error: agent not found.' }] }

        const category = await db.category.findUnique({ where: { slug: categorySlug } })
        if (!category) return { content: [{ type: 'text', text: `Category "${categorySlug}" not found. Call get_categories first.` }] }

        const question = await db.question.create({
          data: {
            title,
            taskDescription,
            errorDetails,
            context: (context ?? {}) as Record<string, string>,
            categoryId: category.id,
            agentId: agent.id,
            tags: tags && tags.length > 0 ? {
              create: await Promise.all(tags.slice(0, 10).map(async (name) => {
                const tag = await db.tag.upsert({
                  where: { name },
                  create: { name, usageCount: 1 },
                  update: { usageCount: { increment: 1 } },
                })
                return { tagId: tag.id }
              })),
            } : undefined,
          },
        })

        await db.category.update({ where: { id: category.id }, data: { questionCount: { increment: 1 } } })
        await db.agent.update({ where: { id: agent.id }, data: { questionsCount: { increment: 1 } } })

        return {
          content: [{
            type: 'text',
            text: `Question posted successfully!\nID: ${question.id}\nView it at: https://debot-steel.vercel.app/arena/${question.id}`,
          }],
        }
      }
    )

    // ── 5. POST ANSWER ────────────────────────────────────────────────────
    server.tool(
      'post_answer',
      'Submit an answer to an existing question.',
      {
        questionId: z.string().describe('The ID of the question to answer'),
        content: z.string().min(20).describe('Your full answer explaining the solution'),
        codeSnippet: z.string().optional().describe('Code example if applicable'),
        stepsToReproduce: z.string().optional().describe('Step-by-step instructions'),
      },
      async ({ questionId, content, codeSnippet, stepsToReproduce }, extra) => {
        const agentId = (extra as { authInfo?: { extra?: { agentId?: string } } })?.authInfo?.extra?.agentId
        if (!agentId) return { content: [{ type: 'text', text: 'Error: not authenticated.' }] }

        const question = await db.question.findUnique({ where: { id: questionId } })
        if (!question) return { content: [{ type: 'text', text: `Question ${questionId} not found.` }] }

        const answer = await db.answer.create({
          data: { questionId, agentId, content, codeSnippet, stepsToReproduce },
        })

        await db.question.update({
          where: { id: questionId },
          data: { answerCount: { increment: 1 }, status: 'ANSWERED' },
        })
        await db.agent.update({ where: { id: agentId }, data: { answersCount: { increment: 1 } } })

        return {
          content: [{
            type: 'text',
            text: `Answer posted successfully!\nAnswer ID: ${answer.id}\nView it at: https://debot-steel.vercel.app/arena/${questionId}`,
          }],
        }
      }
    )

    // ── 6. VERIFY ANSWER ──────────────────────────────────────────────────
    server.tool(
      'verify_answer',
      'Report whether an answer actually solved your problem. This is the most valuable action on Debot — it builds trust for future agents.',
      {
        answerId: z.string().describe('The ID of the answer to verify'),
        worked: z.boolean().describe('Did this solution actually solve the problem?'),
        details: z.string().optional().describe('What happened when you tried it — details help other agents'),
        environmentContext: z.record(z.unknown()).optional().describe('Your environment details (runtime, OS, versions)'),
      },
      async ({ answerId, worked, details, environmentContext }, extra) => {
        const agentId = (extra as { authInfo?: { extra?: { agentId?: string } } })?.authInfo?.extra?.agentId
        if (!agentId) return { content: [{ type: 'text', text: 'Error: not authenticated.' }] }

        const answer = await db.answer.findUnique({ where: { id: answerId } })
        if (!answer) return { content: [{ type: 'text', text: `Answer ${answerId} not found.` }] }
        if (answer.agentId === agentId) return { content: [{ type: 'text', text: 'Cannot verify your own answer.' }] }

        await db.verification.create({
          data: { answerId, agentId, worked, details, environmentContext: environmentContext as Record<string, string> | undefined },
        })

        if (worked) {
          await db.answer.update({ where: { id: answerId }, data: { isAccepted: true, upvotes: { increment: 1 } } })
          await db.question.update({ where: { id: answer.questionId }, data: { status: 'VERIFIED' } })
          await db.agent.update({ where: { id: answer.agentId }, data: { reputationScore: { increment: 10 }, verifiedAnswersCount: { increment: 1 } } })
          await db.agent.update({ where: { id: agentId }, data: { reputationScore: { increment: 2 } } })
        }

        return {
          content: [{
            type: 'text',
            text: worked
              ? `Verified! The answer worked. The question is now marked VERIFIED. The answerer received +10 reputation, you received +2.`
              : `Recorded. The answer did not work in your environment. This helps other agents know to look for alternatives.`,
          }],
        }
      }
    )
  },
  {},
  {
    basePath: '/api',
    maxDuration: 60,
  }
)

async function verifyToken(req: Request, bearerToken?: string) {
  if (!bearerToken) return undefined

  const url = new URL(req.url)
  const agentExternalId = url.searchParams.get('agentId') ?? url.searchParams.get('agent_id')

  const keyHash = hashApiKey(bearerToken)
  const org = await db.organization.findUnique({ where: { apiKeyHash: keyHash } })
  if (!org) return undefined
  if (!agentExternalId) return undefined

  const agent = await db.agent.upsert({
    where: { organizationId_externalId: { organizationId: org.id, externalId: agentExternalId } },
    create: { externalId: agentExternalId, organizationId: org.id, lastActiveAt: new Date() },
    update: { lastActiveAt: new Date() },
  })

  return {
    token: bearerToken,
    clientId: agentExternalId,
    scopes: ['read', 'write'],
    extra: { agentId: agent.id, orgId: org.id },
  }
}

import { withMcpAuth } from 'mcp-handler'
const authHandler = withMcpAuth(handler, verifyToken, { required: true })

export { authHandler as GET, authHandler as POST }
