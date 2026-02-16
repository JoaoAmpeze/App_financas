import { contextBridge, ipcRenderer } from 'electron'

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

const api = {
  getVersion: () => ipcRenderer.invoke('app:getVersion') as Promise<string>,
  openExternalUrl: (url: string) => ipcRenderer.invoke('app:openExternalUrl', url) as Promise<void>,
  getDataFolderPath: () => ipcRenderer.invoke('app:getDataFolderPath') as Promise<string>,
  openDataFolder: () => ipcRenderer.invoke('app:openDataFolder') as Promise<void>,
  checkForUpdate: () => ipcRenderer.invoke('app:checkForUpdate') as Promise<CheckForUpdateResult>,
  downloadAndInstallUpdate: () => ipcRenderer.invoke('app:downloadAndInstallUpdate') as Promise<void>,
  resetAllData: () => ipcRenderer.invoke('data:resetAllData') as Promise<void>,

  getSettings: () => ipcRenderer.invoke('data:getSettings') as Promise<AppSettings>,
  saveSettings: (data: AppSettings) => ipcRenderer.invoke('data:saveSettings', data),

  getTransactions: (month?: string) => ipcRenderer.invoke('data:getTransactions', month) as Promise<Transaction[]>,
  getTransactionMonths: () => ipcRenderer.invoke('data:getTransactionMonths') as Promise<string[]>,
  addTransaction: (data: Omit<Transaction, 'id'>) => ipcRenderer.invoke('data:addTransaction', data) as Promise<Transaction>,
  updateTransaction: (id: string, updates: Partial<Transaction>) => ipcRenderer.invoke('data:updateTransaction', id, updates) as Promise<Transaction | null>,
  updateTransactionsBulk: (ids: string[], updates: Partial<Pick<Transaction, 'categoryId' | 'tagIds'>>) => ipcRenderer.invoke('data:updateTransactionsBulk', ids, updates) as Promise<number>,
  deleteTransaction: (id: string) => ipcRenderer.invoke('data:deleteTransaction', id) as Promise<boolean>,

  getGoals: () => ipcRenderer.invoke('data:getGoals') as Promise<Goal[]>,
  addGoal: (data: Omit<Goal, 'id' | 'depositHistory'>) => ipcRenderer.invoke('data:addGoal', data) as Promise<Goal>,
  updateGoal: (id: string, updates: Partial<Goal>) => ipcRenderer.invoke('data:updateGoal', id, updates) as Promise<Goal | null>,
  depositToGoal: (goalId: string, amount: number, options: { createExpenseTransaction?: boolean; expenseCategoryId?: string }) =>
    ipcRenderer.invoke('data:depositToGoal', goalId, amount, options) as Promise<{ goal: Goal; transaction?: Transaction } | null>,
  markGoalAsPaid: (goalId: string, options: { createInvestmentTransaction?: boolean; investmentCategoryId?: string }) =>
    ipcRenderer.invoke('data:markGoalAsPaid', goalId, options) as Promise<{ goal: Goal; transaction?: Transaction } | null>,

  getFixedBills: () => ipcRenderer.invoke('data:getFixedBills') as Promise<FixedBill[]>,
  addFixedBill: (data: Omit<FixedBill, 'id'>) => ipcRenderer.invoke('data:addFixedBill', data) as Promise<FixedBill>,
  updateFixedBill: (id: string, updates: Partial<FixedBill>) => ipcRenderer.invoke('data:updateFixedBill', id, updates) as Promise<FixedBill | null>,
  deleteFixedBill: (id: string) => ipcRenderer.invoke('data:deleteFixedBill', id) as Promise<boolean>,

  getInstallmentDebts: () => ipcRenderer.invoke('data:getInstallmentDebts') as Promise<InstallmentDebt[]>,
  addInstallmentDebt: (data: Omit<InstallmentDebt, 'id'>) => ipcRenderer.invoke('data:addInstallmentDebt', data) as Promise<InstallmentDebt>,
  updateInstallmentDebt: (id: string, updates: Partial<InstallmentDebt>) => ipcRenderer.invoke('data:updateInstallmentDebt', id, updates) as Promise<InstallmentDebt | null>,
  deleteInstallmentDebt: (id: string) => ipcRenderer.invoke('data:deleteInstallmentDebt', id) as Promise<boolean>,

  getFutureBillsPaid: () => ipcRenderer.invoke('data:getFutureBillsPaid') as Promise<string[]>,
  setFutureBillsPaid: (ids: string[]) => ipcRenderer.invoke('data:setFutureBillsPaid', ids) as Promise<void>
}

contextBridge.exposeInMainWorld('electronAPI', api)

export type ElectronAPI = typeof api
