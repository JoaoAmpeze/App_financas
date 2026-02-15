import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3 } from 'lucide-react'
import CashFlowChart from '@/components/CashFlowChart'
import { useTransactions } from '@/hooks/useFinanceData'
import { useMemo } from 'react'
import ExpensesDoughnutChart from '@/components/charts/ExpensesDoughnutChart'
import { useSettings } from '@/hooks/useFinanceData'

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export default function Reports() {
  const navigate = useNavigate()
  const { transactions, loading, error } = useTransactions(undefined)
  const { settings } = useSettings()
  const now = new Date()
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const pieData = useMemo(() => {
    const byCategory: Record<string, number> = {}
    for (const t of transactions) {
      if (t.type !== 'expense' || !t.date.startsWith(currentMonthKey)) continue
      byCategory[t.categoryId] = (byCategory[t.categoryId] ?? 0) + t.amount
    }
    const categories = settings?.categories ?? []
    return Object.entries(byCategory)
      .map(([categoryId, value]) => {
        const cat = categories.find((c) => c.id === categoryId)
        return { name: cat?.name ?? categoryId, categoryId, value }
      })
      .filter((d) => d.value > 0)
  }, [transactions, settings?.categories, currentMonthKey])

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
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
          <BarChart3 className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Relatórios</h2>
          <p className="text-sm text-muted-foreground">Visão consolidada de receitas e despesas</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CashFlowChart />
        <Card className="rounded-2xl overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base">Despesas por categoria</CardTitle>
            <p className="text-sm text-muted-foreground">Mês atual</p>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {pieData.length > 0 ? (
                <ExpensesDoughnutChart
                  data={pieData}
                  onSegmentClick={(categoryId) =>
                    categoryId && navigate(`/transactions?categoryId=${categoryId}`)
                  }
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Nenhuma despesa no mês
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
