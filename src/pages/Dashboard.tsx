import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useTransactions,
  useTransactionMonths,
  useSettings,
  useInstallmentDebts,
} from '@/hooks/useFinanceData'
import type { InstallmentDebt } from '@/vite-env'
import { Calendar } from 'lucide-react'
import { Select } from '@/components/ui/select'
import CashFlowAreaChart from '@/components/charts/CashFlowAreaChart'
import ExpensesDoughnutChart from '@/components/charts/ExpensesDoughnutChart'
import { CategoryIcon } from '@/lib/categoryIcons'
import { cn } from '@/lib/utils'

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

/** Adiciona N meses a YYYY-MM */
function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split('-').map(Number)
  let month = m + n
  let year = y
  while (month > 12) {
    month -= 12
    year += 1
  }
  while (month < 1) {
    month += 12
    year -= 1
  }
  return `${year}-${String(month).padStart(2, '0')}`
}

/** Valor total de parcelas vencendo em um mês e por categoria */
function getInstallmentAmountForMonth(
  installmentDebts: InstallmentDebt[],
  monthKey: string
): { total: number; byCategory: Record<string, number> } {
  const byCategory: Record<string, number> = {}
  let total = 0
  for (const debt of installmentDebts) {
    for (let i = 0; i < debt.installments; i++) {
      const dueMonth = addMonths(debt.firstDueMonth, i)
      if (dueMonth === monthKey) {
        const amount = debt.totalAmount / debt.installments
        total += amount
        byCategory[debt.categoryId] = (byCategory[debt.categoryId] ?? 0) + amount
        break
      }
    }
  }
  return { total, byCategory }
}

/** Retorna os últimos `count` meses terminando no mês dado (inclusive). Ex: 2025-02, 5 → [2024-10, 2024-11, 2024-12, 2025-01, 2025-02] */
function getMonthKeysEndingAt(endMonthKey: string, count = 5): string[] {
  const [y, m] = endMonthKey.split('-').map(Number)
  const keys: string[] = []
  for (let i = count - 1; i >= 0; i--) {
    let month = m - i
    let year = y
    while (month < 1) {
      month += 12
      year -= 1
    }
    keys.push(`${year}-${String(month).padStart(2, '0')}`)
  }
  return keys
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffMonths = Math.floor(diffDays / 30)
  const diffYears = Math.floor(diffDays / 365)
  if (diffDays === 0) return 'Hoje'
  if (diffDays === 1) return '1 dia atrás'
  if (diffDays < 30) return `${diffDays} dias atrás`
  if (diffMonths === 1) return '1 mês atrás'
  if (diffMonths < 12) return `${diffMonths} meses atrás`
  if (diffYears === 1) return '1 ano atrás'
  return `${diffYears} anos atrás`
}

function formatMonthOption(monthKey: string): string {
  const [y, m] = monthKey.split('-')
  const monthNum = parseInt(m, 10)
  const name = MONTH_NAMES[monthNum - 1] ?? m
  return `${name}/${y}`
}

function formatDayMonth(dateStr: string): string {
  const [, m, d] = dateStr.split('-')
  const monthNum = parseInt(m, 10)
  const name = MONTH_NAMES[monthNum - 1] ?? m
  return `${d}/${name}`
}

function sourceLabel(source: 'transaction' | 'fixed' | 'installment'): string {
  return source === 'transaction' ? 'Transação' : source === 'fixed' ? 'Conta fixa' : 'Parcela'
}

type DetailModalType = 'receitas' | 'despesas' | null

export default function Dashboard() {
  const navigate = useNavigate()
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [historyEndMonthKey, setHistoryEndMonthKey] = useState<string | null>(null)
  const [detailModal, setDetailModal] = useState<DetailModalType>(null)
  const { transactions, loading, error } = useTransactions()
  const { months: monthKeys } = useTransactionMonths()
  const { settings } = useSettings()
  const { installmentDebts } = useInstallmentDebts()

  const now = new Date()
  const currentMonthKey =
    selectedMonth ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const currentMonthLabel = useMemo(() => {
    const [, m] = currentMonthKey.split('-')
    const monthNum = parseInt(m, 10)
    return MONTH_NAMES[monthNum - 1] ?? m
  }, [currentMonthKey])

  const filterMonthOptions = useMemo(() => {
    const set = new Set(monthKeys)
    if (!set.has(currentMonthKey)) set.add(currentMonthKey)
    return Array.from(set).sort().reverse()
  }, [monthKeys, currentMonthKey])

  const historyEndKey = historyEndMonthKey ?? currentMonthKey
  const historyMonthOptions = useMemo(() => {
    const set = new Set(monthKeys)
    if (!set.has(historyEndKey)) set.add(historyEndKey)
    return Array.from(set).sort().reverse()
  }, [monthKeys, historyEndKey])

  /** Itens detalhados de receita/despesa do mês para os modais (apenas transações e parcelas; contas fixas só entram ao confirmar pagamento) */
  const { monthIncomeDetails, monthExpenseDetails } = useMemo(() => {
    const categories = settings?.categories ?? []
    const installmentCurrent = getInstallmentAmountForMonth(installmentDebts, currentMonthKey)

    const incomeDetails: { id: string; date: string; description: string; categoryName: string; amount: number; source: 'transaction' | 'fixed' }[] = []
    for (const t of transactions) {
      if (t.type !== 'income' || !t.date.startsWith(currentMonthKey)) continue
      const cat = categories.find((c) => c.id === t.categoryId)
      incomeDetails.push({
        id: `tx-${t.id}`,
        date: t.date,
        description: t.description,
        categoryName: cat?.name ?? t.categoryId,
        amount: t.amount,
        source: 'transaction',
      })
    }
    incomeDetails.sort((a, b) => a.date.localeCompare(b.date))

    const expenseDetails: { id: string; date: string; description: string; categoryName: string; amount: number; source: 'transaction' | 'fixed' | 'installment' }[] = []
    for (const t of transactions) {
      if (t.type !== 'expense' || !t.date.startsWith(currentMonthKey)) continue
      const cat = categories.find((c) => c.id === t.categoryId)
      expenseDetails.push({
        id: `tx-${t.id}`,
        date: t.date,
        description: t.description,
        categoryName: cat?.name ?? t.categoryId,
        amount: t.amount,
        source: 'transaction',
      })
    }
    for (const debt of installmentDebts) {
      for (let i = 0; i < debt.installments; i++) {
        const dueMonth = addMonths(debt.firstDueMonth, i)
        if (dueMonth !== currentMonthKey) continue
        const cat = categories.find((c) => c.id === debt.categoryId)
        const amount = debt.totalAmount / debt.installments
        expenseDetails.push({
          id: `inst-${debt.id}-${i}`,
          date: `${currentMonthKey}-${String(debt.dueDay).padStart(2, '0')}`,
          description: `${debt.name} (${i + 1}/${debt.installments})`,
          categoryName: cat?.name ?? debt.categoryId,
          amount,
          source: 'installment',
        })
        break
      }
    }
    expenseDetails.sort((a, b) => a.date.localeCompare(b.date))

    return { monthIncomeDetails: incomeDetails, monthExpenseDetails: expenseDetails }
  }, [transactions, settings?.categories, currentMonthKey, installmentDebts])

  const {
    balanceReal,
    balanceProjetado,
    monthIncome,
    monthExpense,
    pieData,
    cashFlowAreaData,
    recentTransactions,
    trendPercent,
    savingsRate,
  } = useMemo(() => {
    const installmentCurrent = getInstallmentAmountForMonth(installmentDebts, currentMonthKey)

    let income = 0
    let expense = 0
    let monthIn = 0
    let monthOut = 0
    const byCategory: Record<string, number> = {}
    const sorted = [...transactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    for (const t of sorted) {
      if (t.type === 'income') {
        income += t.amount
        if (t.date.startsWith(currentMonthKey)) monthIn += t.amount
      } else {
        expense += t.amount
        if (t.date.startsWith(currentMonthKey)) monthOut += t.amount
        byCategory[t.categoryId] = (byCategory[t.categoryId] ?? 0) + t.amount
      }
    }
    monthOut += installmentCurrent.total
    for (const [catId, val] of Object.entries(installmentCurrent.byCategory)) {
      byCategory[catId] = (byCategory[catId] ?? 0) + val
    }

    const categories = settings?.categories ?? []
    const pieData = Object.entries(byCategory)
      .map(([categoryId, value]) => {
        const cat = categories.find((c) => c.id === categoryId)
        return { name: cat?.name ?? categoryId, categoryId, value }
      })
      .filter((d) => d.value > 0)

    const monthKeys5 = getMonthKeysEndingAt(historyEndKey)
    const cashFlowAreaData = monthKeys5.map((monthKey) => {
      let receita = 0
      let despesa = 0
      for (const t of transactions) {
        if (!t.date.startsWith(monthKey)) continue
        if (t.type === 'income') receita += t.amount
        else despesa += t.amount
      }
      const inst = getInstallmentAmountForMonth(installmentDebts, monthKey)
      despesa += inst.total
      const [, m] = monthKey.split('-')
      const monthNum = parseInt(m, 10)
      const label = MONTH_NAMES[monthNum - 1] ?? m
      return { monthKey, name: label, receita, despesa }
    })

    const recentTransactions = sorted.slice(0, 8).map((t) => {
      const cat = categories.find((c) => c.id === t.categoryId)
      return {
        ...t,
        categoryName: cat?.name ?? t.categoryId,
        categoryIcon: cat?.icon ?? 'Circle',
      }
    })

    const balanceReal = income - expense
    const balanceProjetado = balanceReal - installmentCurrent.total
    const monthChangeTransactionsOnly = monthIn - (monthOut - installmentCurrent.total)
    const startOfMonthBalance = balanceReal - monthChangeTransactionsOnly
    const trendPercent =
      startOfMonthBalance !== 0
        ? (
            (monthChangeTransactionsOnly / Math.abs(startOfMonthBalance)) *
            100
          ).toFixed(1)
        : null
    const savingsRate =
      monthIn > 0 ? Math.round(((monthIn - monthOut) / monthIn) * 100) : 0

    return {
      balanceReal,
      balanceProjetado,
      monthIncome: monthIn,
      monthExpense: monthOut,
      pieData,
      cashFlowAreaData,
      recentTransactions,
      trendPercent,
      savingsRate,
    }
  }, [transactions, settings?.categories, currentMonthKey, historyEndKey, now, installmentDebts])

  const handlePieClick = (categoryId: string | null) => {
    if (categoryId) navigate(`/transactions?categoryId=${categoryId}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-muted-foreground">
        Carregando...
      </div>
    )
  }
  if (error) {
    return (
      <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-destructive">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Seletores de mês */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Mês em foco (projeção):</span>
          <Select
            value={currentMonthKey}
            onChange={(e) => setSelectedMonth(e.target.value || null)}
            className="w-[140px] h-9"
          >
            {filterMonthOptions.map((key) => (
              <option key={key} value={key}>
                {formatMonthOption(key)}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Histórico até:</span>
          <Select
            value={historyEndKey}
            onChange={(e) => setHistoryEndMonthKey(e.target.value || null)}
            className="w-[140px] h-9"
          >
            {historyMonthOptions.map((key) => (
              <option key={key} value={key}>
                {formatMonthOption(key)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Total Balance + Spending by Category row */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div
          className="rounded-2xl p-6 bg-card border border-border shadow-xl dark:bg-gradient-to-br dark:from-card dark:via-primary/10 dark:to-primary/5"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Saldo projetado (fim do mês)</p>
              <p
                className={cn(
                  'text-3xl font-bold mt-1',
                  balanceProjetado >= 0 ? 'text-foreground' : 'text-destructive'
                )}
              >
                {formatCurrency(balanceProjetado)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Inclui transações + parcelas do mês (contas fixas só após confirmar pagamento)
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Saldo atual (só transações): {formatCurrency(balanceReal)}
              </p>
              {trendPercent !== null && (
                <p
                  className={cn(
                    'text-sm mt-1 flex items-center gap-1',
                    Number(trendPercent) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
                  )}
                >
                  {Number(trendPercent) >= 0 ? '↑' : '↓'} {Math.abs(Number(trendPercent))}% este mês (transações)
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Gastos por categoria</h3>
          <div className="h-[200px]">
            {pieData.length > 0 ? (
              <ExpensesDoughnutChart data={pieData} onSegmentClick={handlePieClick} />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Nenhuma despesa no período
              </div>
            )}
          </div>
          {pieData.length > 0 && (
            <div className="mt-3 space-y-2">
              {pieData.slice(0, 5).map((d, i) => {
                const total = pieData.reduce((a, x) => a + x.value, 0)
                const pct = total > 0 ? Math.round((d.value / total) * 100) : 0
                const colors = [
                  'bg-emerald-500',
                  'bg-amber-500',
                  'bg-blue-500',
                  'bg-red-500',
                  'bg-cyan-500',
                ]
                return (
                  <div
                    key={d.categoryId}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span className={cn('w-2 h-2 rounded-full', colors[i % colors.length])} />
                      {d.name} ({pct}%)
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Income, Expenses, Savings Rate */}
      <div className="grid gap-4 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => setDetailModal('receitas')}
          className="rounded-2xl border border-border bg-card p-5 text-left hover:bg-accent/50 transition-colors cursor-pointer"
        >
          <p className="text-sm font-medium text-muted-foreground">Receita ({currentMonthLabel})</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(monthIncome)}
          </p>
          <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{
                width: `${monthIncome + monthExpense > 0 ? (monthIncome / (monthIncome + monthExpense)) * 100 : 0}%`,
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">Clique para ver detalhes</p>
        </button>
        <button
          type="button"
          onClick={() => setDetailModal('despesas')}
          className="rounded-2xl border border-border bg-card p-5 text-left hover:bg-accent/50 transition-colors cursor-pointer"
        >
          <p className="text-sm font-medium text-muted-foreground">Despesas ({currentMonthLabel}){installmentDebts.length > 0 ? ' · incl. parcelas' : ''}</p>
          <p className="text-2xl font-bold text-destructive mt-1">
            {formatCurrency(monthExpense)}
          </p>
          <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-red-500"
              style={{
                width: `${monthIncome + monthExpense > 0 ? (monthExpense / (monthIncome + monthExpense)) * 100 : 0}%`,
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">Clique para ver detalhes</p>
        </button>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm font-medium text-muted-foreground">Taxa de poupança</p>
          <p className="text-2xl font-bold text-primary mt-1">{savingsRate}%</p>
          <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.min(savingsRate, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Cash Flow History + Recent transactions */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-1">
            Histórico de fluxo de caixa (5 meses)
          </h3>
          <p className="text-xs text-muted-foreground mb-4">Receita e despesa por mês</p>
          <div className="h-[260px]">
            <CashFlowAreaChart data={cashFlowAreaData} />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Transações recentes</h3>
          <div className="space-y-1">
            {recentTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Nenhuma transação</p>
            ) : (
              recentTransactions.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => navigate('/transactions')}
                  className="w-full flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-accent text-left"
                >
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <CategoryIcon icon={t.categoryIcon} className="text-muted-foreground" size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {t.categoryName}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatTimeAgo(t.date)}</p>
                  </div>
                  <span
                    className={cn(
                      'text-sm font-semibold shrink-0',
                      t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
                    )}
                  >
                    {t.type === 'income' ? '+' : '-'}
                    {formatCurrency(t.amount)}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal detalhamento Receitas */}
      {detailModal === 'receitas' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setDetailModal(null)}
        >
          <div
            className="bg-card border border-border rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
              <h3 className="text-lg font-semibold">
                Receitas – {currentMonthLabel} {currentMonthKey.split('-')[0]}
              </h3>
              <button
                type="button"
                onClick={() => setDetailModal(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              {monthIncomeDetails.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4">Nenhuma receita neste mês.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="pb-2 pr-2 font-medium">Data</th>
                      <th className="pb-2 pr-2 font-medium">Descrição</th>
                      <th className="pb-2 pr-2 font-medium">Categoria</th>
                      <th className="pb-2 pr-2 font-medium text-center w-20">Origem</th>
                      <th className="pb-2 text-right font-medium">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthIncomeDetails.map((item) => (
                      <tr key={item.id} className="border-b border-border/60">
                        <td className="py-2.5 pr-2">{formatDayMonth(item.date)}</td>
                        <td className="py-2.5 pr-2 font-medium">{item.description}</td>
                        <td className="py-2.5 pr-2 text-muted-foreground">{item.categoryName}</td>
                        <td className="py-2.5 pr-2 text-center">
                          <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {sourceLabel(item.source)}
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          +{formatCurrency(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {monthIncomeDetails.length > 0 && (
              <div className="p-4 border-t border-border bg-muted/30 shrink-0 flex justify-end">
                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                  Total: {formatCurrency(monthIncomeDetails.reduce((s, i) => s + i.amount, 0))}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal detalhamento Despesas */}
      {detailModal === 'despesas' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setDetailModal(null)}
        >
          <div
            className="bg-card border border-border rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
              <h3 className="text-lg font-semibold">
                Despesas – {currentMonthLabel} {currentMonthKey.split('-')[0]}
              </h3>
              <button
                type="button"
                onClick={() => setDetailModal(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              {monthExpenseDetails.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4">Nenhuma despesa neste mês.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="pb-2 pr-2 font-medium">Data</th>
                      <th className="pb-2 pr-2 font-medium">Descrição</th>
                      <th className="pb-2 pr-2 font-medium">Categoria</th>
                      <th className="pb-2 pr-2 font-medium text-center w-20">Origem</th>
                      <th className="pb-2 text-right font-medium">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthExpenseDetails.map((item) => (
                      <tr key={item.id} className="border-b border-border/60">
                        <td className="py-2.5 pr-2">{formatDayMonth(item.date)}</td>
                        <td className="py-2.5 pr-2 font-medium">{item.description}</td>
                        <td className="py-2.5 pr-2 text-muted-foreground">{item.categoryName}</td>
                        <td className="py-2.5 pr-2 text-center">
                          <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {sourceLabel(item.source)}
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-semibold text-destructive">
                          -{formatCurrency(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {monthExpenseDetails.length > 0 && (
              <div className="p-4 border-t border-border bg-muted/30 shrink-0 flex justify-end">
                <span className="text-base font-bold text-destructive">
                  Total: {formatCurrency(monthExpenseDetails.reduce((s, i) => s + i.amount, 0))}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
