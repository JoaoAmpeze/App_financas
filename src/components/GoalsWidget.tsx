import { useGoals } from '@/hooks/useFinanceData'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Target } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

export default function GoalsWidget() {
  const navigate = useNavigate()
  const { goals, loading, error } = useGoals()

  const activeGoals = (goals ?? []).filter(
    (g) => !g.completedAt && g.currentAmount < g.targetAmount && g.targetAmount > 0
  )

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="w-4 h-4" />
            Metas financeiras
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
            <Target className="w-4 h-4" />
            Metas financeiras
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
          <Target className="w-4 h-4" />
          Metas financeiras
        </CardTitle>
        <p className="text-sm text-muted-foreground">Metas ativas e progresso</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeGoals.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma meta ativa. Defina metas em Metas.
          </p>
        ) : (
          <ul className="space-y-4">
            {activeGoals.map((goal) => {
              const percent =
                goal.targetAmount > 0
                  ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)
                  : 0
              return (
                <li
                  key={goal.id}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => navigate('/goals')}
                  onKeyDown={(e) => e.key === 'Enter' && navigate('/goals')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{goal.name}</span>
                    <span className="text-muted-foreground">
                      {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                    </span>
                  </div>
                  <Progress value={goal.currentAmount} max={goal.targetAmount} />
                  <p className="text-xs text-muted-foreground mt-1">{percent.toFixed(0)}% concluído</p>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
