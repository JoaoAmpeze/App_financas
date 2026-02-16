/// <reference types="vite/client" />

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
  completedAt?: string
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

export interface InstallmentDebt {
  id: string
  name: string
  totalAmount: number
  installments: number
  firstDueMonth: string
  dueDay: number
  categoryId: string
  tagIds: string[]
}

export interface CheckForUpdateResult {
  updateRequired: boolean
  latestVersion?: string
  downloadUrl?: string
}

declare global {
  interface Window {
    electronAPI: {
      getVersion: () => Promise<string>
      openExternalUrl: (url: string) => Promise<void>
      getDataFolderPath: () => Promise<string>
      openDataFolder: () => Promise<void>
      checkForUpdate: () => Promise<CheckForUpdateResult>
      downloadAndInstallUpdate: () => Promise<void>
      resetAllData: () => Promise<void>
      getSettings: () => Promise<AppSettings>
      saveSettings: (data: AppSettings) => Promise<void>
      getTransactions: (month?: string) => Promise<Transaction[]>
      getTransactionMonths: () => Promise<string[]>
      addTransaction: (data: Omit<Transaction, 'id'>) => Promise<Transaction>
      updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<Transaction | null>
      updateTransactionsBulk: (ids: string[], updates: Partial<Pick<Transaction, 'categoryId' | 'tagIds'>>) => Promise<number>
      deleteTransaction: (id: string) => Promise<boolean>
      getGoals: () => Promise<Goal[]>
      addGoal: (data: Omit<Goal, 'id' | 'depositHistory'>) => Promise<Goal>
      updateGoal: (id: string, updates: Partial<Goal>) => Promise<Goal | null>
      depositToGoal: (goalId: string, amount: number, options: { createExpenseTransaction?: boolean; expenseCategoryId?: string }) => Promise<{ goal: Goal; transaction?: Transaction } | null>
      markGoalAsPaid: (goalId: string, options: { createInvestmentTransaction?: boolean; investmentCategoryId?: string }) => Promise<{ goal: Goal; transaction?: Transaction } | null>
      getFixedBills: () => Promise<FixedBill[]>
      addFixedBill: (data: Omit<FixedBill, 'id'>) => Promise<FixedBill>
      updateFixedBill: (id: string, updates: Partial<FixedBill>) => Promise<FixedBill | null>
      deleteFixedBill: (id: string) => Promise<boolean>
      getInstallmentDebts: () => Promise<InstallmentDebt[]>
      addInstallmentDebt: (data: Omit<InstallmentDebt, 'id'>) => Promise<InstallmentDebt>
      updateInstallmentDebt: (id: string, updates: Partial<InstallmentDebt>) => Promise<InstallmentDebt | null>
      deleteInstallmentDebt: (id: string) => Promise<boolean>
      getFutureBillsPaid: () => Promise<string[]>
      setFutureBillsPaid: (ids: string[]) => Promise<void>
    }
  }
}
