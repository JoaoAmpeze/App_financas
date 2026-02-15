import { useMemo } from 'react'
import { useTransactions } from '@/hooks/useFinanceData'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import CashFlowBarChart from '@/components/charts/CashFlowBarChart'

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function getLast6MonthKeys(): string[] {
  const keys: string[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    keys.push(`${y}-${m}`)
  }
  return keys
}

export default function CashFlowChart() {
  const { transactions, loading, error } = useTransactions(undefined)

  const chartData = useMemo(() => {
    const monthKeys = getLast6MonthKeys()
    return monthKeys.map((monthKey) => {
      let income = 0
      let expense = 0
      for (const t of transactions) {
        if (!t.date.startsWith(monthKey)) continue
        if (t.type === 'income') income += t.amount
        else expense += t.amount
      }
      const [, m] = monthKey.split('-')
      const monthNum = parseInt(m, 10)
      const label = `${MONTH_NAMES[monthNum - 1] ?? m} ${monthKey.split('-')[0]}`
      return {
        monthKey,
        name: label,
        receita: income,
        despesa: expense
      }
    })
  }, [transactions])

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Receitas vs Despesas</CardTitle>
          <p className="text-sm text-muted-foreground">Últimos 6 meses</p>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
            Carregando...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Receitas vs Despesas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-xl border-0 shadow-lg shadow-black/5 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Receitas vs Despesas</CardTitle>
        <p className="text-sm text-muted-foreground">Últimos 6 meses</p>
      </CardHeader>
      <CardContent>
        <div className="h-[260px]">
          <CashFlowBarChart data={chartData} />
        </div>
      </CardContent>
    </Card>
  )
}
