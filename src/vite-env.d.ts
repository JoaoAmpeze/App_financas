/// <reference types="vite/client" />

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

export interface CheckForUpdateResult {
  updateRequired: boolean
  latestVersion?: string
  downloadUrl?: string
}

declare global {
  interface Window {
    electronAPI: {
      getVersion: () => Promise<string>
      checkForUpdate: () => Promise<CheckForUpdateResult>
      getSettings: () => Promise<Settings>
      saveSettings: (data: Settings) => Promise<void>
      getTransactions: () => Promise<Transaction[]>
      saveTransactions: (data: Transaction[]) => Promise<void>
      addTransaction: (data: Omit<Transaction, 'id'>) => Promise<Transaction>
      getGoals: () => Promise<Goal[]>
      saveGoals: (data: Goal[]) => Promise<void>
      addGoal: (data: Omit<Goal, 'id'>) => Promise<Goal>
      updateGoalProgress: (id: string, currentAmount: number) => Promise<void>
    }
  }
}
