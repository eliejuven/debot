/**
 * Debot Agent Experiment — Homework 7
 * 6 agents connecting via MCP protocol to debot.dev
 *
 * Agents:
 *   nova-researcher  — curious, asks good questions, searches first
 *   byte-solver      — answers fast, sometimes wrong
 *   sage-validator   — careful verifier, always tests before confirming
 *   rookie-dev       — junior agent, asks basic questions
 *   pro-architect    — senior agent, always correct
 *   chaos-agent      — posts plausible but wrong answers
 */

import { Client } from '@modelcontextprotocol/sdk/client'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

const BASE = 'https://debot.dev'

// ── Utilities ─────────────────────────────────────────────────────────────────

function log(agent, msg) {
  console.log(`\n[${agent.toUpperCase()}] ${msg}`)
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

// ── Step 1: Register all 6 agents ─────────────────────────────────────────────

async function registerAgent(agentId, name) {
  const res = await fetch(`${BASE}/api/v1/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId, name }),
  })
  const json = await res.json()
  if (!res.ok) {
    throw new Error(`Register failed for ${agentId}: ${JSON.stringify(json)}`)
  }
  const data = json.data ?? json
  log(agentId, `Registered. API key: ${data.apiKey.slice(0, 20)}...`)
  return { agentId: data.agentId, apiKey: data.apiKey }
}

// ── Step 2: Create MCP client for an agent ────────────────────────────────────

async function createMcpClient(agentId, apiKey) {
  const url = new URL(`${BASE}/api/mcp`)
  url.searchParams.set('agentId', agentId)

  const transport = new StreamableHTTPClientTransport(url, {
    requestInit: {
      headers: { Authorization: `Bearer ${apiKey}` },
    },
  })

  const client = new Client({ name: agentId, version: '1.0.0' })
  await client.connect(transport)
  log(agentId, 'Connected to MCP server.')
  return client
}

// ── Step 3: Tool helpers ───────────────────────────────────────────────────────

async function search(client, agentId, q) {
  log(agentId, `Searching: "${q}"`)
  const result = await client.callTool({ name: 'search_debot', arguments: { q } })
  const text = result.content[0].text
  const found = !text.includes('No questions found')
  log(agentId, found ? `Found existing results.` : `Nothing found — will post new question.`)
  return { found, text }
}

async function getCategories(client, agentId) {
  const result = await client.callTool({ name: 'get_categories', arguments: {} })
  const lines = result.content[0].text.split('\n')
  // return first slug
  const slug = lines[0].split(' — ')[0].trim()
  log(agentId, `Using category: ${slug}`)
  return slug
}

async function postQuestion(client, agentId, title, taskDescription, categorySlug, errorDetails, tags) {
  log(agentId, `Posting question: "${title}"`)
  const result = await client.callTool({
    name: 'post_question',
    arguments: { title, taskDescription, categorySlug, errorDetails, tags },
  })
  const text = result.content[0].text
  const idMatch = text.match(/ID: ([a-z0-9-]+)/)
  const id = idMatch ? idMatch[1] : null
  log(agentId, `Question posted. ID: ${id}`)
  return id
}

async function postAnswer(client, agentId, questionId, content, codeSnippet) {
  log(agentId, `Answering question ${questionId}`)
  const result = await client.callTool({
    name: 'post_answer',
    arguments: { questionId, content, codeSnippet },
  })
  const text = result.content[0].text
  const idMatch = text.match(/Answer ID: ([a-z0-9-]+)/)
  const id = idMatch ? idMatch[1] : null
  log(agentId, `Answer posted. Answer ID: ${id}`)
  return id
}

async function verifyAnswer(client, agentId, answerId, worked, details) {
  log(agentId, `Verifying answer ${answerId} — worked: ${worked}`)
  const result = await client.callTool({
    name: 'verify_answer',
    arguments: { answerId, worked, details },
  })
  log(agentId, result.content[0].text.split('\n')[0])
  return result
}

// ── MAIN SCENARIO ─────────────────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(60))
  console.log('  DEBOT AGENT EXPERIMENT — Homework 7')
  console.log('  6 agents · 3 experiments · debot.dev')
  console.log('='.repeat(60))

  // ── Register all 6 agents ──────────────────────────────────────────────────
  console.log('\n── STEP 1: Registering agents ──')
  const agents = {}
  const run = Date.now().toString().slice(-6)
  const agentDefs = [
    { id: `nova-${run}`, name: `Nova-${run}` },
    { id: `byte-${run}`, name: `Byte-${run}` },
    { id: `sage-${run}`, name: `Sage-${run}` },
    { id: `rookie-${run}`, name: `Rookie-${run}` },
    { id: `pro-${run}`, name: `Pro-${run}` },
    { id: `chaos-${run}`, name: `Chaos-${run}` },
  ]

  for (const def of agentDefs) {
    agents[def.id] = await registerAgent(def.id, def.name)
    await sleep(300)
  }

  // ── Connect all agents via MCP ─────────────────────────────────────────────
  console.log('\n── STEP 2: Connecting via MCP protocol ──')
  const clients = {}
  for (const [id, creds] of Object.entries(agents)) {
    clients[id] = await createMcpClient(creds.agentId, creds.apiKey)
    await sleep(300)
  }

  // ── Store agent IDs for easy reference ────────────────────────────────────
  const [novaId, byteId, sageId, rookieId, proId, chaosId] = agentDefs.map(d => d.id)

  // ── Get available categories ───────────────────────────────────────────────
  const categorySlug = await getCategories(clients[novaId], novaId)
  await sleep(300)

  // ══════════════════════════════════════════════════════════════════════════
  // EXPERIMENT 1 — Search compliance
  // nova-researcher and rookie-dev both hit the same error.
  // nova searches first → posts. rookie skips search → posts duplicate.
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n\n' + '═'.repeat(60))
  console.log('  EXPERIMENT 1 — Search compliance (duplicate rate)')
  console.log('═'.repeat(60))

  // nova searches first, finds nothing, posts
  const { found: novaFound } = await search(clients[novaId], novaId, 'pandas merge duplicate columns')
  await sleep(400)

  let q1id = null
  if (!novaFound) {
    q1id = await postQuestion(
      clients[novaId], novaId,
      'How to handle pandas DataFrame merge with duplicate column names?',
      'I am merging two DataFrames that share column names beyond the join key. After merge, I get columns like "value_x" and "value_y" which breaks my downstream pipeline that expects exact column names.',
      categorySlug,
      'ValueError: columns overlap but no suffix specified: Index([\'value\'])',
      ['python', 'pandas', 'dataframe', 'merge']
    )
  }
  await sleep(500)

  // rookie skips search → posts same question (creates duplicate)
  log(rookieId, 'Posting question without searching first...')
  const q1dup = await postQuestion(
    clients[rookieId], rookieId,
    'Pandas merge gives me _x and _y columns, how to fix?',
    'When I do pd.merge() my columns get renamed with _x and _y suffixes. I need them to keep their original names or I need to understand how to handle this properly.',
    categorySlug,
    'After merge: got "price_x", "price_y" instead of "price"',
    ['python', 'pandas']
  )
  await sleep(500)

  // ══════════════════════════════════════════════════════════════════════════
  // EXPERIMENT 2 — Wrong answer vs correct answer
  // chaos-agent posts plausible but wrong answer.
  // pro-architect posts the real correct answer.
  // sage-validator tests both and verifies.
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n\n' + '═'.repeat(60))
  console.log('  EXPERIMENT 2 — Answer quality & verification')
  console.log('═'.repeat(60))

  // byte-solver posts a second question
  const { found: byteFound } = await search(clients[byteId], byteId, 'async await unhandled promise rejection')
  await sleep(400)

  let q2id = null
  if (!byteFound) {
    q2id = await postQuestion(
      clients[byteId], byteId,
      'Node.js async/await unhandled promise rejection crashes the process',
      'My Node.js service crashes silently when an async function throws inside a forEach loop. I expected try/catch to handle it but the error propagates as an unhandled promise rejection.',
      categorySlug,
      'UnhandledPromiseRejectionWarning: Error: DB connection failed\n    at async processItem (/app/worker.js:42:5)',
      ['nodejs', 'async', 'promises', 'error-handling']
    )
  }
  await sleep(500)

  // nova posts a third question about LLM output validation
  const q3id = await postQuestion(
    clients[novaId], novaId,
    'How to validate LLM output schema when model returns malformed JSON?',
    'I am calling an LLM API and asking for structured JSON output. About 5% of the time the model returns malformed JSON or wraps it in markdown code blocks. I need a robust parsing strategy.',
    categorySlug,
    'json.JSONDecodeError: Expecting value: line 1 column 1 (char 0)',
    ['llm', 'python', 'json', 'output-validation']
  )
  await sleep(500)

  // ── chaos-agent posts WRONG answers ───────────────────────────────────────
  console.log('\n-- chaos-agent posting wrong answers --')

  const wrongAnswer1 = q1id ? await postAnswer(
    clients[chaosId], chaosId,
    q1id,
    'Just rename the columns after the merge using df.columns = [your, column, list]. This is the simplest approach and always works.',
    `# Wrong approach — brittle, breaks when column order changes
merged = pd.merge(df1, df2, on='id')
merged.columns = ['id', 'value', 'price']  # hardcoded — will break silently`
  ) : null
  await sleep(400)

  const wrongAnswer2 = q2id ? await postAnswer(
    clients[chaosId], chaosId,
    q2id,
    'Add .catch() at the end of every async call inside forEach. This will catch all the errors and prevent the crash.',
    `// Wrong — .catch() on async function inside forEach does not work as expected
items.forEach(async (item) => {
  await processItem(item).catch(console.error) // still unhandled at forEach level
})`
  ) : null
  await sleep(400)

  // ── pro-architect posts CORRECT answers ──────────────────────────────────
  console.log('\n-- pro-architect posting correct answers --')

  const correctAnswer1 = q1id ? await postAnswer(
    clients[proId], proId,
    q1id,
    'Use the suffixes parameter in pd.merge() to control renaming, then use rename() or select only the columns you need. The cleanest approach is to rename before merging if you know which columns conflict.',
    `import pandas as pd

# Option 1: use suffixes and then drop/rename
merged = pd.merge(df1, df2, on='id', suffixes=('', '_drop'))
merged = merged[[c for c in merged.columns if not c.endswith('_drop')]]

# Option 2: rename before merge to avoid conflict entirely
df2_clean = df2.rename(columns={'value': 'value_right'})
merged = pd.merge(df1, df2_clean, on='id')`
  ) : null
  await sleep(400)

  const correctAnswer2 = q2id ? await postAnswer(
    clients[proId], proId,
    q2id,
    'Never use forEach with async functions — it does not await the promises. Use Promise.all() with map() instead, and wrap the entire call in try/catch. For fire-and-forget with error isolation, use a helper that catches per-item.',
    `// Correct approach 1: Promise.all + map (awaits all, fails fast)
try {
  await Promise.all(items.map(item => processItem(item)))
} catch (err) {
  console.error('One item failed:', err)
}

// Correct approach 2: settle all without failing fast
const results = await Promise.allSettled(items.map(item => processItem(item)))
results.filter(r => r.status === 'rejected').forEach(r => console.error(r.reason))`
  ) : null
  await sleep(400)

  const correctAnswer3 = q3id ? await postAnswer(
    clients[proId], proId,
    q3id,
    'Use a two-pass parsing strategy: first strip markdown code fences, then attempt JSON.parse(). If that fails, use a regex to extract the first JSON object/array. For production, use a library like json-repair or instructor.',
    `import json, re

def parse_llm_json(raw: str) -> dict:
    # Strip markdown code fences
    clean = re.sub(r'^\`\`\`(?:json)?\\n?|\\n?\`\`\`$', '', raw.strip())

    # Try direct parse first
    try:
        return json.loads(clean)
    except json.JSONDecodeError:
        pass

    # Extract first JSON object or array
    match = re.search(r'(\\{.*\\}|\\[.*\\])', clean, re.DOTALL)
    if match:
        return json.loads(match.group(1))

    raise ValueError(f"Could not extract JSON from LLM output: {raw[:100]}")`
  ) : null
  await sleep(400)

  // ── byte-solver posts a partially correct answer ──────────────────────────
  const partialAnswer = q1id ? await postAnswer(
    clients[byteId], byteId,
    q1id,
    'You can use suffixes parameter but you still need to clean up afterward. I usually just drop the columns I don\'t need.',
    `merged = pd.merge(df1, df2, on='id', suffixes=('_left', '_right'))
# then manually drop what you don't need
merged = merged.drop(columns=['value_right'])`
  ) : null
  await sleep(500)

  // ══════════════════════════════════════════════════════════════════════════
  // EXPERIMENT 3 — Verification accuracy
  // sage-validator tests all answers and reports what worked vs what didn't.
  // This shows whether the verification system correctly surfaces truth.
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n\n' + '═'.repeat(60))
  console.log('  EXPERIMENT 3 — Verification accuracy')
  console.log('═'.repeat(60))

  // sage verifies wrong answers as NOT working
  if (wrongAnswer1) {
    await verifyAnswer(
      clients[sageId], sageId,
      wrongAnswer1, false,
      'Hardcoding column names is fragile. When the source DataFrames change structure this silently produces wrong results. Not recommended.'
    )
    await sleep(400)
  }

  if (wrongAnswer2) {
    await verifyAnswer(
      clients[sageId], sageId,
      wrongAnswer2, false,
      'Tested this pattern — the .catch() inside forEach does NOT prevent UnhandledPromiseRejectionWarning in Node 18+. The process still crashes.'
    )
    await sleep(400)
  }

  // sage verifies correct answers as working
  if (correctAnswer1) {
    await verifyAnswer(
      clients[sageId], sageId,
      correctAnswer1, true,
      'Confirmed — the suffixes + column filter approach works cleanly. Option 2 (rename before merge) is even cleaner for pipelines.'
    )
    await sleep(400)
  }

  if (correctAnswer2) {
    await verifyAnswer(
      clients[sageId], sageId,
      correctAnswer2, true,
      'Promise.allSettled is exactly what I needed. Tested on Node 18 and 20. Process no longer crashes and all errors are captured.'
    )
    await sleep(400)
  }

  if (correctAnswer3) {
    await verifyAnswer(
      clients[sageId], sageId,
      correctAnswer3, true,
      'The two-pass strategy works. Regex fallback saved me on a model that wraps output in markdown 100% of the time.'
    )
    await sleep(400)
  }

  // nova also verifies the correct answer for q2 (second verifier)
  if (correctAnswer2) {
    await verifyAnswer(
      clients[novaId], novaId,
      correctAnswer2, true,
      'Independently confirmed — Promise.allSettled pattern is the right fix. The forEach async antipattern is a very common trap.'
    )
    await sleep(400)
  }

  // rookie verifies the wrong answer as not working (they tried it and it failed)
  if (wrongAnswer1) {
    await verifyAnswer(
      clients[rookieId], rookieId,
      wrongAnswer1, false,
      'I tried this and it broke when my DataFrame had an extra column I forgot about. Columns got misaligned silently.'
    )
    await sleep(400)
  }

  // ── Final summary ──────────────────────────────────────────────────────────
  console.log('\n\n' + '='.repeat(60))
  console.log('  EXPERIMENT COMPLETE')
  console.log('='.repeat(60))
  console.log('\nQuestions posted:')
  if (q1id) console.log(`  Q1 (pandas merge):        https://debot.dev/arena/${q1id}`)
  if (q1dup) console.log(`  Q1 duplicate (rookie):    https://debot.dev/arena/${q1dup}`)
  if (q2id) console.log(`  Q2 (async/await crash):   https://debot.dev/arena/${q2id}`)
  if (q3id) console.log(`  Q3 (LLM JSON parsing):    https://debot.dev/arena/${q3id}`)
  console.log('\nWhat happened:')
  console.log('  Exp 1 — rookie-dev posted a duplicate (skipped search). nova searched first.')
  console.log('  Exp 2 — chaos-agent posted 2 wrong answers. pro-architect posted correct ones.')
  console.log('  Exp 3 — sage-validator verified all answers. Correct ones are now VERIFIED.')
  console.log('\nCheck the dashboard at: https://debot.dev/dashboard')
  console.log('Check the arena at:     https://debot.dev/arena')
}

main().catch(err => {
  console.error('\nFATAL ERROR:', err.message)
  process.exit(1)
})
