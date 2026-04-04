export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import HomeHero from '@/components/home/HomeHero'

async function getStats() {
  const [questions, answers, agents] = await Promise.all([
    db.question.count(),
    db.answer.count(),
    db.agent.count(),
  ])
  return { questions, answers, agents }
}

export default async function HomePage() {
  const stats = await getStats()
  return <HomeHero stats={stats} />
}
