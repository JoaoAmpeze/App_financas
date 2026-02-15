import { useMemo } from 'react'
import { useTransactions } from '@/hooks/useFinanceData'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CalendarClock } from 'lucide-react'
import type { Transaction } from '../vite-env'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

function getNextOccurrences(t: Transaction): string[] {
  const dueDates: string[] = []
  if (!t.recurring) return dueDates

  const base = new Date(t.date)
  base.setHours(0, 0, 0, 0)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const end = new Date(now)
  end.setDate(end.getDate() + 7)

  if (t.recurring === 'monthly') {
    const day = base.getDate()
    for (let i = 0; i <= 1; i++) {
      const y = now.getFullYear()
      const m = now.getMonth() + i
      const lastDay = new Date(y, m + 1, 0).getDate()
      const safeDay = Math.min(day, lastDay)
      const next = new Date(y, m, safeDay)
      next.setHours(0, 0, 0, 0)
      if (next >= now && next <= end) dueDates.push(next.toISOString().slice(0, 10))
    }
  } else if (t.recurring === 'weekly') {
    const oneWeek = 7 * 24 * 60 * 60 * 1000
    let nextTime = base.getTime()
    while (nextTime < now.getTime()) nextTime += oneWeek
    for (let i = 0; i < 2; i++) {
      const d = new Date(nextTime + i * oneWeek)
      d.setHours(0, 0, 0, 0)
      if (d >= now && d <= end) dueDates.push(d.toISOString().slice(0, 10))
    }
  }
  return dueDates
}

interface DueItem {
  date: string
  description: string
  amount: number
  type: 'income' | 'expense'
  transactionId: string
}

export default function UpcomingBills() {
  const { transactions, loading, error } = useTransactions(undefined)

  const upcoming = useMemo(() => {
    const recurring = transactions.filter(
      (t): t is Transaction & { recurring: 'weekly' | 'monthly' } =>
        !!t.recurring && (t.recurring === 'weekly' || t.recurring === 'monthly')
    )
    const items: DueItem[] = []
    for (const t of recurring) {
      const dates = getNextOccurrences(t)
      for (const date of dates) {
        items.push({
          date,
          description: t.description,
          amount: t.amount,
          type: t.type,
          transactionId: t.id
        })
      }
    }
    items.sort((a, b) => a.date.localeCompare(b.date))
    return items.slice(0, 10)
  }, [transactions])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="w-4 h-4" />
            Próximas contas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="w-4 h-4" />
            Próximas contas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-xl border-0 shadow-lg shadow-black/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="w-4 h-4" />
          Próximas contas
        </CardTitle>
        <p className="text-sm text-muted-foreground">Recorrentes nos próximos 7 dias</p>
      </CardHeader>
      <CardContent>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma transação recorrente nos próximos 7 dias.
          </p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((item, i) => (
              <li
                key={`${item.transactionId}-${item.date}-${i}`}
                className="flex justify-between items-center text-sm py-1 border-b border-border/50 last:border-0"
              >
                <div>
                  <p className="font-medium truncate max-w-[140px]" title={item.description}>
                    {item.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.date).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      weekday: 'short'
                    })}
                  </p>
                </div>
                <span
                  className={
                    item.type === 'income' ? 'text-green-600 font-medium' : 'text-destructive font-medium'
                  }
                >
                  {item.type === 'income' ? '+' : '-'}
                  {formatCurrency(item.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
