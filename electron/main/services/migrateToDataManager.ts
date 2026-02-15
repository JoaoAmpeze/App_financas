import { readFile, writeFile, rename } from 'fs/promises'
import { join } from 'path'
import type { DataManager } from './DataManager'

interface OldTransaction {
  id: string
  date: string
  description: string
  amount: number
  type: 'income' | 'expense'
  category: string
}

interface OldGoal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  deadline: string
}

export async function migrateIfNeeded(
  baseDir: string,
  dataManager: DataManager
): Promise<void> {
  const oldTransactionsPath = join(baseDir, 'transactions.json')
  const oldGoalsPath = join(baseDir, 'goals.json')
  let migrated = false

  try {
    const rawTx = await readFile(oldTransactionsPath, 'utf-8')
    const oldList: OldTransaction[] = JSON.parse(rawTx)
    if (Array.isArray(oldList) && oldList.length > 0) {
      const settings = await dataManager.getSettings()
          const nameToId = new Map<string, string>()
      settings.categories.forEach((c) => nameToId.set(c.name, c.id))
      const defaultCatId = settings.categories[0]?.id ?? 'cat-1'
      for (const t of oldList) {
        const categoryId = nameToId.get(t.category) ?? defaultCatId
        await dataManager.addTransaction({
          date: t.date,
          description: t.description,
          amount: t.amount,
          type: t.type,
          categoryId,
          tagIds: []
        })
      }
      await rename(oldTransactionsPath, join(baseDir, 'transactions.json.migrated'))
      migrated = true
    }
  } catch {
    // no old file or invalid
  }

  try {
    const rawGoals = await readFile(oldGoalsPath, 'utf-8')
    const oldGoals: OldGoal[] = JSON.parse(rawGoals)
    if (Array.isArray(oldGoals) && oldGoals.length > 0) {
      for (const g of oldGoals) {
        await dataManager.addGoal({
          name: g.name,
          targetAmount: g.targetAmount,
          currentAmount: g.currentAmount ?? 0,
          deadline: g.deadline
        })
      }
      await rename(oldGoalsPath, join(baseDir, 'goals.json.migrated'))
      migrated = true
    }
  } catch {
    // no old file
  }

  if (migrated) console.log('[DataManager] Migration from old format completed.')
}
