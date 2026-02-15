import { contextBridge, ipcRenderer } from 'electron'

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

const api = {
  getVersion: () => ipcRenderer.invoke('app:getVersion') as Promise<string>,
  checkForUpdate: () => ipcRenderer.invoke('app:checkForUpdate') as Promise<CheckForUpdateResult>,
  getSettings: () => ipcRenderer.invoke('fs:getSettings') as Promise<Settings>,
  saveSettings: (data: Settings) => ipcRenderer.invoke('fs:saveSettings', data),

  getTransactions: () => ipcRenderer.invoke('fs:getTransactions') as Promise<Transaction[]>,
  saveTransactions: (data: Transaction[]) => ipcRenderer.invoke('fs:saveTransactions', data),
  addTransaction: (data: Omit<Transaction, 'id'>) =>
    ipcRenderer.invoke('fs:addTransaction', data) as Promise<Transaction>,

  getGoals: () => ipcRenderer.invoke('fs:getGoals') as Promise<Goal[]>,
  saveGoals: (data: Goal[]) => ipcRenderer.invoke('fs:saveGoals', data),
  addGoal: (data: Omit<Goal, 'id'>) => ipcRenderer.invoke('fs:addGoal', data) as Promise<Goal>,
  updateGoalProgress: (id: string, currentAmount: number) =>
    ipcRenderer.invoke('fs:updateGoalProgress', id, currentAmount)
}

contextBridge.exposeInMainWorld('electronAPI', api)

export type ElectronAPI = typeof api
