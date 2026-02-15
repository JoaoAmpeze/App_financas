import { useState, useEffect, useCallback } from 'react'
import type { Settings, Transaction, Goal } from '../vite-env.d'

const api = typeof window !== 'undefined' ? window.electronAPI : null

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!api) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.getSettings()
      setSettings(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar configurações')
    } finally {
      setLoading(false)
    }
  }, [])

  const save = useCallback(
    async (data: Settings) => {
      if (!api) return
      await api.saveSettings(data)
      setSettings(data)
    },
    []
  )

  useEffect(() => {
    load()
  }, [load])

  return { settings, loading, error, refresh: load, save }
}

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!api) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.getTransactions()
      setTransactions(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar transações')
    } finally {
      setLoading(false)
    }
  }, [])

  const addTransaction = useCallback(async (t: Omit<Transaction, 'id'>) => {
    if (!api) return
    const newT = await api.addTransaction(t)
    setTransactions((prev) => [newT, ...prev])
    return newT
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { transactions, loading, error, refresh: load, addTransaction }
}

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!api) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.getGoals()
      setGoals(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar metas')
    } finally {
      setLoading(false)
    }
  }, [])

  const addGoal = useCallback(async (g: Omit<Goal, 'id'>) => {
    if (!api) return
    const newGoal = await api.addGoal(g)
    setGoals((prev) => [...prev, newGoal])
    return newGoal
  }, [])

  const updateProgress = useCallback(async (id: string, currentAmount: number) => {
    if (!api) return
    await api.updateGoalProgress(id, currentAmount)
    setGoals((prev) =>
      prev.map((goal) => (goal.id === id ? { ...goal, currentAmount } : goal))
    )
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { goals, loading, error, refresh: load, addGoal, updateProgress }
}
