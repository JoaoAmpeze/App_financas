import { mkdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'

export interface Settings {
  theme: 'light' | 'dark' | 'system'
  categories: string[]
  monthlyBudgetLimit: number
}

export interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  type: 'income' | 'expense'
  category: string
}

export interface Goal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  deadline: string
}

const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  categories: ['Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Lazer', 'Outros'],
  monthlyBudgetLimit: 3000
}

const DEFAULT_TRANSACTIONS: Transaction[] = []
const DEFAULT_GOALS: Goal[] = []

export class FileSystemService {
  private readonly dataDir: string
  private readonly settingsPath: string
  private readonly transactionsPath: string
  private readonly goalsPath: string

  constructor(dataDir: string) {
    this.dataDir = dataDir
    this.settingsPath = join(dataDir, 'settings.json')
    this.transactionsPath = join(dataDir, 'transactions.json')
    this.goalsPath = join(dataDir, 'goals.json')
  }

  async ensureDataDir(): Promise<void> {
    await mkdir(this.dataDir, { recursive: true })
  }

  private async readJson<T>(path: string, defaultValue: T): Promise<T> {
    try {
      const raw = await readFile(path, 'utf-8')
      return JSON.parse(raw) as T
    } catch {
      return defaultValue
    }
  }

  private async writeJson<T>(path: string, data: T): Promise<void> {
    await writeFile(path, JSON.stringify(data, null, 2), 'utf-8')
  }

  async getSettings(): Promise<Settings> {
    await this.ensureDataDir()
    return this.readJson(this.settingsPath, DEFAULT_SETTINGS)
  }

  async saveSettings(settings: Settings): Promise<void> {
    await this.ensureDataDir()
    await this.writeJson(this.settingsPath, settings)
  }

  async getTransactions(): Promise<Transaction[]> {
    await this.ensureDataDir()
    return this.readJson(this.transactionsPath, DEFAULT_TRANSACTIONS)
  }

  async saveTransactions(transactions: Transaction[]): Promise<void> {
    await this.ensureDataDir()
    await this.writeJson(this.transactionsPath, transactions)
  }

  async addTransaction(t: Omit<Transaction, 'id'>): Promise<Transaction> {
    const list = await this.getTransactions()
    const id = crypto.randomUUID()
    const newT: Transaction = { ...t, id }
    list.push(newT)
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    await this.saveTransactions(list)
    return newT
  }

  async getGoals(): Promise<Goal[]> {
    await this.ensureDataDir()
    return this.readJson(this.goalsPath, DEFAULT_GOALS)
  }

  async saveGoals(goals: Goal[]): Promise<void> {
    await this.ensureDataDir()
    await this.writeJson(this.goalsPath, goals)
  }

  async addGoal(g: Omit<Goal, 'id'>): Promise<Goal> {
    const list = await this.getGoals()
    const id = crypto.randomUUID()
    const newGoal: Goal = { ...g, id }
    list.push(newGoal)
    await this.saveGoals(list)
    return newGoal
  }

  async updateGoalProgress(id: string, currentAmount: number): Promise<void> {
    const list = await this.getGoals()
    const idx = list.findIndex((g) => g.id === id)
    if (idx === -1) return
    list[idx].currentAmount = currentAmount
    await this.saveGoals(list)
  }
}
