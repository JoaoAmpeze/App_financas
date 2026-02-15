import { useState, useEffect, useCallback, useRef } from 'react'
import type { AppSettings, Transaction, Goal, FixedBill, InstallmentDebt } from '../vite-env'

const api = typeof window !== 'undefined' ? window.electronAPI : null

export { useSettings } from '../components/SettingsProvider'

export function useTransactionMonths() {
  const [months, setMonths] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!api) {
      setLoading(false)
      return
    }
    try {
      const data = await api.getTransactionMonths()
      setMonths(data)
    } catch {
      setMonths([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { months, loading, refresh: load }
}

export function useTransactions(month?: string) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!api) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await api.getTransactions(month)
      setTransactions(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar transações')
    } finally {
      setLoading(false)
    }
  }, [month])

  const addTransaction = useCallback(async (t: Omit<Transaction, 'id'>) => {
    if (!api) return
    const newT = await api.addTransaction(t)
    setTransactions((prev) => [newT, ...prev])
    return newT
  }, [])

  const updateTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
    if (!api) return
    const updated = await api.updateTransaction(id, updates)
    if (updated) setTransactions((prev) => prev.map((x) => (x.id === id ? updated : x)))
    return updated
  }, [])

  const updateTransactionsBulk = useCallback(async (ids: string[], updates: Partial<Pick<Transaction, 'categoryId' | 'tagIds'>>) => {
    if (!api) return 0
    const count = await api.updateTransactionsBulk(ids, updates)
    if (count > 0) load()
    return count
  }, [load])

  const deleteTransaction = useCallback(async (id: string) => {
    if (!api) return false
    const ok = await api.deleteTransaction(id)
    if (ok) setTransactions((prev) => prev.filter((x) => x.id !== id))
    return ok
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { transactions, loading, error, refresh: load, addTransaction, updateTransaction, updateTransactionsBulk, deleteTransaction }
}

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!api) {
      setLoading(false)
      return
    }
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

  const addGoal = useCallback(async (g: Omit<Goal, 'id' | 'depositHistory'>) => {
    if (!api) return
    const newGoal = await api.addGoal(g)
    setGoals((prev) => [...prev, newGoal])
    return newGoal
  }, [])

  const updateGoal = useCallback(async (id: string, updates: Partial<Goal>) => {
    if (!api) return
    const updated = await api.updateGoal(id, updates)
    if (updated) setGoals((prev) => prev.map((g) => (g.id === id ? updated : g)))
    return updated
  }, [])

  const depositToGoal = useCallback(async (goalId: string, amount: number, options?: { createExpenseTransaction?: boolean; expenseCategoryId?: string }) => {
    if (!api) return null
    const result = await api.depositToGoal(goalId, amount, options ?? {})
    if (result) setGoals((prev) => prev.map((g) => (g.id === goalId ? result.goal : g)))
    return result
  }, [])

  const markGoalAsPaid = useCallback(async (goalId: string, options?: { createInvestmentTransaction?: boolean; investmentCategoryId?: string }) => {
    if (!api) return null
    const result = await api.markGoalAsPaid(goalId, options ?? {})
    if (result) setGoals((prev) => prev.map((g) => (g.id === goalId ? result.goal : g)))
    return result
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { goals, loading, error, refresh: load, addGoal, updateGoal, depositToGoal, markGoalAsPaid }
}

export function useFixedBills() {
  const [fixedBills, setFixedBills] = useState<FixedBill[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!api) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await api.getFixedBills()
      setFixedBills(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar contas fixas')
    } finally {
      setLoading(false)
    }
  }, [])

  const addFixedBill = useCallback(async (b: Omit<FixedBill, 'id'>) => {
    if (!api) return
    const newBill = await api.addFixedBill(b)
    setFixedBills((prev) => [...prev, newBill])
    return newBill
  }, [])

  const updateFixedBill = useCallback(async (id: string, updates: Partial<FixedBill>) => {
    if (!api) return
    const updated = await api.updateFixedBill(id, updates)
    if (updated) setFixedBills((prev) => prev.map((x) => (x.id === id ? updated : x)))
    return updated
  }, [])

  const deleteFixedBill = useCallback(async (id: string) => {
    if (!api) return false
    const ok = await api.deleteFixedBill(id)
    if (ok) setFixedBills((prev) => prev.filter((x) => x.id !== id))
    return ok
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { fixedBills, loading, error, refresh: load, addFixedBill, updateFixedBill, deleteFixedBill }
}

export function useInstallmentDebts() {
  const [installmentDebts, setInstallmentDebts] = useState<InstallmentDebt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!api) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await api.getInstallmentDebts()
      setInstallmentDebts(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar dívidas parceladas')
    } finally {
      setLoading(false)
    }
  }, [])

  const addInstallmentDebt = useCallback(async (d: Omit<InstallmentDebt, 'id'>) => {
    if (!api) throw new Error('Aplicativo não está pronto. Feche e abra o app novamente.')
    const newDebt = await api.addInstallmentDebt(d)
    setInstallmentDebts((prev) => [...prev, newDebt])
    return newDebt
  }, [])

  const updateInstallmentDebt = useCallback(async (id: string, updates: Partial<InstallmentDebt>) => {
    if (!api) return null
    const updated = await api.updateInstallmentDebt(id, updates)
    if (updated) setInstallmentDebts((prev) => prev.map((x) => (x.id === id ? updated : x)))
    return updated
  }, [])

  const deleteInstallmentDebt = useCallback(async (id: string) => {
    if (!api) return false
    const ok = await api.deleteInstallmentDebt(id)
    if (ok) setInstallmentDebts((prev) => prev.filter((x) => x.id !== id))
    return ok
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { installmentDebts, loading, error, refresh: load, addInstallmentDebt, updateInstallmentDebt, deleteInstallmentDebt }
}

export function useFutureBillsPaid() {
  const [paidIds, setPaidIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const paidIdsRef = useRef<string[]>([])
  paidIdsRef.current = paidIds

  const load = useCallback(async () => {
    if (!api) {
      setLoading(false)
      return
    }
    try {
      const data = await api.getFutureBillsPaid()
      setPaidIds(data ?? [])
    } catch {
      setPaidIds([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const togglePaid = useCallback(async (itemId: string) => {
    if (!api) return
    const current = paidIdsRef.current
    const next = current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId]
    setPaidIds(next)
    try {
      await api.setFutureBillsPaid(next)
    } catch {
      setPaidIds(current)
    }
  }, [])

  const setPaid = useCallback(async (ids: string[]) => {
    if (!api) return
    await api.setFutureBillsPaid(ids)
    setPaidIds(ids)
  }, [])

  return { paidIds, loading, refresh: load, togglePaid, setPaid }
}
