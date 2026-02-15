import { mkdir, readFile, writeFile, readdir } from 'fs/promises'
import { join } from 'path'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface Category {
  id: string
  name: string
  color: string
  icon: string
}

export interface Tag {
  id: string
  name: string
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  monthlyBudgetLimit: number
  categories: Category[]
  tags: Tag[]
}

export interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  type: 'income' | 'expense'
  categoryId: string
  tagIds: string[]
  recurring?: 'weekly' | 'monthly' | null
  createdAt?: string
}

export interface GoalDeposit {
  date: string
  amount: number
  transactionId?: string
}

export interface Goal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  deadline: string
  depositHistory: GoalDeposit[]
}

export interface FixedBill {
  id: string
  name: string
  amount: number
  type: 'income' | 'expense'
  categoryId: string
  dueDay: number
  active: boolean
  tagIds: string[]
}

/** Dívida parcelada: valor total, N parcelas, vencendo a partir de firstDueMonth no dia dueDay */
export interface InstallmentDebt {
  id: string
  name: string
  totalAmount: number
  installments: number
  firstDueMonth: string // YYYY-MM
  dueDay: number
  categoryId: string
  tagIds: string[]
}

// ─── Defaults ──────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  monthlyBudgetLimit: 3000,
  categories: [
    { id: 'cat-1', name: 'Alimentação', color: '#22c55e', icon: 'UtensilsCrossed' },
    { id: 'cat-2', name: 'Transporte', color: '#3b82f6', icon: 'Car' },
    { id: 'cat-3', name: 'Moradia', color: '#8b5cf6', icon: 'Home' },
    { id: 'cat-4', name: 'Saúde', color: '#ef4444', icon: 'Heart' },
    { id: 'cat-5', name: 'Lazer', color: '#eab308', icon: 'Gamepad2' },
    { id: 'cat-6', name: 'Outros', color: '#64748b', icon: 'Circle' }
  ],
  tags: []
}

// ─── DataManager ────────────────────────────────────────────────────────────

export class DataManager {
  private readonly baseDir: string
  private readonly dataDir: string
  private readonly settingsPath: string
  private readonly goalsPath: string
  private readonly fixedBillsPath: string
  private readonly installmentDebtsPath: string
  private readonly futureBillsPaidPath: string

  constructor(userDataPath: string) {
    this.baseDir = join(userDataPath, 'finance-data')
    this.dataDir = join(this.baseDir, 'data')
    this.settingsPath = join(this.baseDir, 'settings.json')
    this.goalsPath = join(this.baseDir, 'goals.json')
    this.fixedBillsPath = join(this.baseDir, 'fixedBills.json')
    this.installmentDebtsPath = join(this.baseDir, 'installmentDebts.json')
    this.futureBillsPaidPath = join(this.baseDir, 'futureBillsPaid.json')
  }

  async ensureDirs(): Promise<void> {
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

  private monthKey(date: string): string {
    const d = new Date(date)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    return `${y}-${m}`
  }

  // ─── Settings ───────────────────────────────────────────────────────────

  async getSettings(): Promise<AppSettings> {
    await this.ensureDirs()
    return this.readJson(this.settingsPath, DEFAULT_SETTINGS)
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    await this.ensureDirs()
    await this.writeJson(this.settingsPath, settings)
  }

  // ─── Transactions (monthly files) ────────────────────────────────────────

  private transactionPath(month: string): string {
    return join(this.dataDir, `${month}.json`)
  }

  async getTransactions(month?: string): Promise<Transaction[]> {
    await this.ensureDirs()
    if (month) {
      const list = await this.readJson<Transaction[]>(this.transactionPath(month), [])
      return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }
    const files = await readdir(this.dataDir).catch(() => [])
    const months = files.filter((f) => /^\d{4}-\d{2}\.json$/.test(f)).sort().reverse()
    const all: Transaction[] = []
    for (const m of months) {
      const list = await this.readJson<Transaction[]>(join(this.dataDir, m), [])
      all.push(...list)
    }
    return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  async getTransactionMonths(): Promise<string[]> {
    await this.ensureDirs()
    const files = await readdir(this.dataDir).catch(() => [])
    return files.filter((f) => /^\d{4}-\d{2}\.json$/.test(f)).map((f) => f.replace('.json', '')).sort().reverse()
  }

  async addTransaction(t: Omit<Transaction, 'id'>): Promise<Transaction> {
    await this.ensureDirs()
    const id = crypto.randomUUID()
    const month = this.monthKey(t.date)
    const path = this.transactionPath(month)
    const list = await this.readJson<Transaction[]>(path, [])
    const newT: Transaction = { ...t, id, tagIds: t.tagIds ?? [], createdAt: new Date().toISOString() }
    list.push(newT)
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    await this.writeJson(path, list)
    return newT
  }

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | null> {
    const all = await this.getTransactions()
    const idx = all.findIndex((x) => x.id === id)
    if (idx === -1) return null
    const old = all[idx]
    const updated = { ...old, ...updates }
    const oldMonth = this.monthKey(old.date)
    const newMonth = this.monthKey(updated.date)
    const oldPath = this.transactionPath(oldMonth)
    const newPath = this.transactionPath(newMonth)
    const oldList = await this.readJson<Transaction[]>(oldPath, []).then((l) => l.filter((x) => x.id !== id))
    await this.writeJson(oldPath, oldList)
    const newList = await this.readJson<Transaction[]>(newPath, [])
    newList.push(updated)
    newList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    await this.writeJson(newPath, newList)
    return updated
  }

  async updateTransactionsBulk(ids: string[], updates: Partial<Pick<Transaction, 'categoryId' | 'tagIds'>>): Promise<number> {
    let count = 0
    for (const id of ids) {
      const r = await this.updateTransaction(id, updates)
      if (r) count++
    }
    return count
  }

  async deleteTransaction(id: string): Promise<boolean> {
    const all = await this.getTransactions()
    const t = all.find((x) => x.id === id)
    if (!t) return false
    const month = this.monthKey(t.date)
    const path = this.transactionPath(month)
    const list = await this.readJson<Transaction[]>(path, []).then((l) => l.filter((x) => x.id !== id))
    await this.writeJson(path, list)
    return true
  }

  // ─── Goals ───────────────────────────────────────────────────────────────

  async getGoals(): Promise<Goal[]> {
    await this.ensureDirs()
    const list = await this.readJson<Goal[]>(this.goalsPath, [])
    return list.map((g) => ({ ...g, depositHistory: g.depositHistory ?? [] }))
  }

  async saveGoals(goals: Goal[]): Promise<void> {
    await this.ensureDirs()
    await this.writeJson(this.goalsPath, goals)
  }

  async addGoal(g: Omit<Goal, 'id' | 'depositHistory'>): Promise<Goal> {
    const list = await this.getGoals()
    const id = crypto.randomUUID()
    const newGoal: Goal = { ...g, id, depositHistory: [] }
    list.push(newGoal)
    await this.saveGoals(list)
    return newGoal
  }

  async updateGoal(id: string, updates: Partial<Goal>): Promise<Goal | null> {
    const list = await this.getGoals()
    const idx = list.findIndex((g) => g.id === id)
    if (idx === -1) return null
    list[idx] = { ...list[idx], ...updates }
    await this.saveGoals(list)
    return list[idx]
  }

  async depositToGoal(
    goalId: string,
    amount: number,
    options: { createExpenseTransaction?: boolean; expenseCategoryId?: string }
  ): Promise<{ goal: Goal; transaction?: Transaction } | null> {
    const list = await this.getGoals()
    const idx = list.findIndex((g) => g.id === goalId)
    if (idx === -1 || amount <= 0) return null
    const goal = list[idx]
    const deposit: GoalDeposit = { date: new Date().toISOString().slice(0, 10), amount }
    goal.currentAmount = (goal.currentAmount ?? 0) + amount
    goal.depositHistory = [...(goal.depositHistory ?? []), deposit]
    list[idx] = goal
    await this.saveGoals(list)

    let transaction: Transaction | undefined
    if (options.createExpenseTransaction && options.expenseCategoryId) {
      transaction = await this.addTransaction({
        date: new Date().toISOString().slice(0, 10),
        description: `Depósito para meta: ${goal.name}`,
        amount,
        type: 'expense',
        categoryId: options.expenseCategoryId,
        tagIds: []
      })
      deposit.transactionId = transaction.id
      goal.depositHistory = goal.depositHistory.slice()
      list[idx] = goal
      await this.saveGoals(list)
    }

    return { goal, transaction }
  }

  // ─── Fixed bills (contas fixas) ───────────────────────────────────────────

  async getFixedBills(): Promise<FixedBill[]> {
    await this.ensureDirs()
    const list = await this.readJson<FixedBill[]>(this.fixedBillsPath, [])
    return list.map((b) => ({
      ...b,
      tagIds: b.tagIds ?? [],
      type: b.type === 'income' ? 'income' : 'expense'
    }))
  }

  async addFixedBill(b: Omit<FixedBill, 'id'>): Promise<FixedBill> {
    await this.ensureDirs()
    const list = await this.getFixedBills()
    const id = crypto.randomUUID()
    const newBill: FixedBill = { ...b, id, tagIds: b.tagIds ?? [] }
    list.push(newBill)
    await this.writeJson(this.fixedBillsPath, list)
    return newBill
  }

  async updateFixedBill(id: string, updates: Partial<FixedBill>): Promise<FixedBill | null> {
    const list = await this.getFixedBills()
    const idx = list.findIndex((x) => x.id === id)
    if (idx === -1) return null
    list[idx] = { ...list[idx], ...updates }
    await this.writeJson(this.fixedBillsPath, list)
    return list[idx]
  }

  async deleteFixedBill(id: string): Promise<boolean> {
    const list = await this.getFixedBills()
    const filtered = list.filter((x) => x.id !== id)
    if (filtered.length === list.length) return false
    await this.writeJson(this.fixedBillsPath, filtered)
    return true
  }

  // ─── Installment debts (dívidas parceladas) ───────────────────────────────

  async getInstallmentDebts(): Promise<InstallmentDebt[]> {
    await this.ensureDirs()
    const list = await this.readJson<InstallmentDebt[]>(this.installmentDebtsPath, [])
    return list.map((d) => ({ ...d, tagIds: d.tagIds ?? [] }))
  }

  async addInstallmentDebt(d: Omit<InstallmentDebt, 'id'>): Promise<InstallmentDebt> {
    await this.ensureDirs()
    const list = await this.getInstallmentDebts()
    const id = crypto.randomUUID()
    const newDebt: InstallmentDebt = { ...d, id, tagIds: d.tagIds ?? [] }
    list.push(newDebt)
    await this.writeJson(this.installmentDebtsPath, list)
    return newDebt
  }

  async updateInstallmentDebt(id: string, updates: Partial<InstallmentDebt>): Promise<InstallmentDebt | null> {
    const list = await this.getInstallmentDebts()
    const idx = list.findIndex((x) => x.id === id)
    if (idx === -1) return null
    list[idx] = { ...list[idx], ...updates }
    await this.writeJson(this.installmentDebtsPath, list)
    return list[idx]
  }

  async deleteInstallmentDebt(id: string): Promise<boolean> {
    const list = await this.getInstallmentDebts()
    const filtered = list.filter((x) => x.id !== id)
    if (filtered.length === list.length) return false
    await this.writeJson(this.installmentDebtsPath, filtered)
    return true
  }

  // ─── Contas futuras: marcar como pago (por item: fixed-billId-monthKey ou installment-debtId-index) ───

  async getFutureBillsPaid(): Promise<string[]> {
    await this.ensureDirs()
    const list = await this.readJson<string[]>(this.futureBillsPaidPath, [])
    return Array.isArray(list) ? list : []
  }

  async setFutureBillsPaid(ids: string[]): Promise<void> {
    await this.ensureDirs()
    await this.writeJson(this.futureBillsPaidPath, ids)
  }
}
