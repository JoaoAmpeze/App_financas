import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useTransactions,
  useTransactionMonths,
  useSettings,
} from '@/hooks/useFinanceData'
import { ChevronDown } from 'lucide-react'
import CashFlowAreaChart from '@/components/charts/CashFlowAreaChart'
import ExpensesDoughnutChart from '@/components/charts/ExpensesDoughnutChart'
import { CategoryIcon } from '@/lib/categoryIcons'
import { cn } from '@/lib/utils'

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function getLast5MonthKeys(): string[] {
  const keys: string[] = []
  const now = new Date()
  for (let i = 4; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    keys.push(`${y}-${m}`)
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

export default function Dashboard() {
  const navigate = useNavigate()
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const { transactions, loading, error } = useTransactions(selectedMonth ?? undefined)
  const { months: monthKeys } = useTransactionMonths()
  const { settings } = useSettings()

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

  const {
    balance,
    monthIncome,
    monthExpense,
    pieData,
    cashFlowAreaData,
    recentTransactions,
    trendPercent,
    savingsRate,
  } = useMemo(() => {
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
    const categories = settings?.categories ?? []
    const pieData = Object.entries(byCategory)
      .map(([categoryId, value]) => {
        const cat = categories.find((c) => c.id === categoryId)
        return { name: cat?.name ?? categoryId, categoryId, value }
      })
      .filter((d) => d.value > 0)

    const monthKeys5 = getLast5MonthKeys()
    const cashFlowAreaData = monthKeys5.map((monthKey) => {
      let receita = 0
      let despesa = 0
      for (const t of transactions) {
        if (!t.date.startsWith(monthKey)) continue
        if (t.type === 'income') receita += t.amount
        else despesa += t.amount
      }
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

    const balance = income - expense
    const balanceChangeThisMonth = monthIn - monthOut
    const startOfMonthBalance = balance - balanceChangeThisMonth
    const trendPercent =
      startOfMonthBalance !== 0
        ? (
            (balanceChangeThisMonth / Math.abs(startOfMonthBalance)) *
            100
          ).toFixed(1)
        : null
    const savingsRate =
      monthIn > 0 ? Math.round(((monthIn - monthOut) / monthIn) * 100) : 0

    return {
      balance,
      monthIncome: monthIn,
      monthExpense: monthOut,
      pieData,
      cashFlowAreaData,
      recentTransactions,
      trendPercent,
      savingsRate,
    }
  }, [transactions, settings?.categories, currentMonthKey, now])

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
      {/* Total Balance + Spending by Category row */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div
          className="rounded-2xl p-6 bg-card border border-border shadow-xl dark:bg-gradient-to-br dark:from-card dark:via-primary/10 dark:to-primary/5"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Saldo total</p>
              <p
                className={cn(
                  'text-3xl font-bold mt-1',
                  balance >= 0 ? 'text-foreground' : 'text-destructive'
                )}
              >
                {formatCurrency(balance)}
              </p>
              {trendPercent !== null && (
                <p
                  className={cn(
                    'text-sm mt-1 flex items-center gap-1',
                    Number(trendPercent) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
                  )}
                >
                  {Number(trendPercent) >= 0 ? '↑' : '↓'} {Math.abs(Number(trendPercent))}% este mês
                </p>
              )}
            </div>
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-accent text-foreground text-sm font-medium"
            >
              Tendência
              <ChevronDown className="w-4 h-4" />
            </button>
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
        <div className="rounded-2xl border border-border bg-card p-5">
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
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm font-medium text-muted-foreground">Despesas ({currentMonthLabel})</p>
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
        </div>
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
    </div>
  )
}
