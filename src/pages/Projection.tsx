import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useFixedBills, useInstallmentDebts, useSettings, useFutureBillsPaid } from '@/hooks/useFinanceData'
import type { FixedBill, InstallmentDebt } from '@/vite-env'
import { TrendingUp, Calendar, Repeat, CreditCard, ChevronRight, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import {
  buildFutureItems,
  formatMonthKey,
  type FutureBillItem,
} from '@/pages/FutureBills'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

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

interface MonthProjection {
  monthKey: string
  label: string
  totalExpenses: number
  totalIncome: number
  items: FutureBillItem[]
}

function buildMonthProjections(
  fixedBills: FixedBill[],
  installmentDebts: InstallmentDebt[],
  monthsAhead: number,
  paidIds: string[]
): MonthProjection[] {
  const items = buildFutureItems(fixedBills, installmentDebts, monthsAhead)
  const unpaid = items.filter((i) => !paidIds.includes(i.id))

  const byMonth = new Map<string, FutureBillItem[]>()
  for (const item of unpaid) {
    const list = byMonth.get(item.monthKey) ?? []
    list.push(item)
    byMonth.set(item.monthKey, list)
  }

  const now = new Date()
  const startKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const result: MonthProjection[] = []

  const activeFixedIncome = fixedBills.filter((b) => b.active && b.type === 'income')

  for (let i = 0; i < monthsAhead; i++) {
    const monthKey = addMonths(startKey, i)
    const monthItems = byMonth.get(monthKey) ?? []
    const totalExpenses = monthItems.reduce((s, it) => s + it.amount, 0)
    const totalIncome = activeFixedIncome.reduce((s, b) => s + b.amount, 0)
    result.push({
      monthKey,
      label: formatMonthKey(monthKey),
      totalExpenses,
      totalIncome,
      items: monthItems.sort((a, b) => a.dueDay - b.dueDay),
    })
  }

  return result
}

export default function Projection() {
  const { fixedBills, loading: loadingFixed } = useFixedBills()
  const { installmentDebts, loading: loadingDebts } = useInstallmentDebts()
  const { settings } = useSettings()
  const { paidIds, loading: loadingPaid } = useFutureBillsPaid()
  const categories = settings?.categories ?? []
  const [selectedMonth, setSelectedMonth] = useState<MonthProjection | null>(null)

  const projections = useMemo(
    () => buildMonthProjections(fixedBills, installmentDebts, 12, paidIds),
    [fixedBills, installmentDebts, paidIds]
  )

  const activeFixedIncome = useMemo(
    () => fixedBills.filter((b) => b.active && b.type === 'income'),
    [fixedBills]
  )

  const loading = loadingFixed || loadingDebts || loadingPaid

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-muted-foreground">
        Carregando...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
          <TrendingUp className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Projeção</h2>
          <p className="text-sm text-muted-foreground">
            Clique no mês para ver os detalhes de entradas (salários) e saídas (contas fixas e parcelas)
          </p>
        </div>
      </div>

      <Card className="rounded-2xl overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Próximos 12 meses
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {projections.every((p) => p.totalExpenses === 0 && p.totalIncome === 0) ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground text-sm px-6">
              <Calendar className="w-10 h-10 mb-2 opacity-50" />
              <p>Nenhuma conta fixa nem parcela futura prevista.</p>
              <p className="mt-1">
                Cadastre contas fixas em &quot;Contas fixas&quot; ou dívidas em &quot;Contas futuras&quot;.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-3 border-b border-border bg-muted/30 text-sm font-medium text-muted-foreground">
                <span>Mês</span>
                <span className="text-green-600 dark:text-green-400 text-right tabular-nums">Entrada</span>
                <span className="text-destructive text-right tabular-nums">Saída</span>
                <span className="w-8" />
              </div>
              <ul className="divide-y divide-border">
                {projections.map((proj) => (
                  <li key={proj.monthKey}>
                    <button
                      type="button"
                      className="w-full grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-4 py-3 text-left hover:bg-accent/50 transition-colors"
                      onClick={() => setSelectedMonth(proj)}
                    >
                      <span className="font-medium text-foreground">{proj.label}</span>
                      <span className="text-green-600 dark:text-green-400 font-medium tabular-nums text-right">
                        {proj.totalIncome > 0 ? `+${formatCurrency(proj.totalIncome)}` : '—'}
                      </span>
                      <span className="text-destructive font-medium tabular-nums text-right">
                        {proj.totalExpenses > 0 ? `-${formatCurrency(proj.totalExpenses)}` : '—'}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal detalhes do mês */}
      {selectedMonth && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedMonth(null)}
        >
          <div
            className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border shrink-0">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                {selectedMonth.label}
              </h3>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-6">
              {/* Entradas (salários) */}
              <div>
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                  <ArrowDownCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                  Entradas (salários)
                </h4>
                {activeFixedIncome.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma receita fixa cadastrada.</p>
                ) : (
                  <ul className="space-y-2">
                    {activeFixedIncome.map((bill) => (
                      <li
                        key={bill.id}
                        className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg bg-muted/40 border border-border/50"
                      >
                        <span className="font-medium truncate">{bill.name}</span>
                        <span className="text-green-600 dark:text-green-400 font-semibold tabular-nums shrink-0">
                          +{formatCurrency(bill.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {activeFixedIncome.length > 0 && (
                  <p className="text-sm font-medium text-green-600 dark:text-green-400 mt-2">
                    Total: +{formatCurrency(selectedMonth.totalIncome)}
                  </p>
                )}
              </div>

              {/* Saídas (contas fixas e parcelas) */}
              <div>
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                  <ArrowUpCircle className="w-4 h-4 text-destructive" />
                  Saídas (contas fixas e parcelas)
                </h4>
                {selectedMonth.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma despesa prevista neste mês.</p>
                ) : (
                  <ul className="space-y-2">
                    {selectedMonth.items.map((item) => {
                      const cat = categories.find((c) => c.id === item.categoryId)
                      return (
                        <li
                          key={item.id}
                          className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg bg-muted/40 border border-border/50"
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            {item.type === 'fixed' ? (
                              <Repeat className="w-4 h-4 text-muted-foreground shrink-0" />
                            ) : (
                              <CreditCard className="w-4 h-4 text-muted-foreground shrink-0" />
                            )}
                            <span className="truncate">{item.name}</span>
                            {item.installmentLabel && (
                              <span className="text-muted-foreground text-xs shrink-0">
                                ({item.installmentLabel})
                              </span>
                            )}
                            {cat && (
                              <span
                                className="inline-block w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: cat.color }}
                                title={cat.name}
                              />
                            )}
                          </span>
                          <span className="text-destructive font-semibold tabular-nums shrink-0">
                            -{formatCurrency(item.amount)}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                )}
                {selectedMonth.items.length > 0 && (
                  <p className="text-sm font-medium text-destructive mt-2">
                    Total: -{formatCurrency(selectedMonth.totalExpenses)}
                  </p>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-border shrink-0">
              <Button variant="outline" className="w-full" onClick={() => setSelectedMonth(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
