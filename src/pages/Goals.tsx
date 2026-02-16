import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Label } from '@/components/ui/label'
import { useGoals, useSettings } from '@/hooks/useFinanceData'
import type { Goal } from '../vite-env'
import { Plus, Target, PiggyBank, CheckCircle } from 'lucide-react'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

function expectedCompletionDate(goal: Goal): string | null {
  const remaining = goal.targetAmount - goal.currentAmount
  if (remaining <= 0) return null
  const history = goal.depositHistory ?? []
  if (history.length === 0) return null
  const totalDeposited = history.reduce((s, d) => s + d.amount, 0)
  const firstDate = new Date(history[0].date)
  const lastDate = new Date(history[history.length - 1].date)
  const months = Math.max(0.1, (lastDate.getTime() - firstDate.getTime()) / (30 * 24 * 60 * 60 * 1000))
  const monthlyRate = totalDeposited / months
  if (monthlyRate <= 0) return null
  const monthsLeft = remaining / monthlyRate
  const d = new Date()
  d.setMonth(d.getMonth() + Math.ceil(monthsLeft))
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function Goals() {
  const { goals, loading, error, addGoal, depositToGoal, markGoalAsPaid } = useGoals()
  const { settings } = useSettings()
  const [modalOpen, setModalOpen] = useState(false)
  const [depositGoalId, setDepositGoalId] = useState<string | null>(null)
  const [depositAmount, setDepositAmount] = useState(0)
  const [form, setForm] = useState<Omit<Goal, 'id' | 'depositHistory'>>({
    name: '',
    targetAmount: 0,
    currentAmount: 0,
    deadline: new Date().toISOString().slice(0, 10)
  })

  const investmentCategoryId = useMemo(() => {
    const cats = settings?.categories ?? []
    const cat = cats.find((c) => /investimento|investment/i.test(c.name))
    return cat?.id ?? cats[0]?.id
  }, [settings?.categories])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || form.targetAmount <= 0) return
    await addGoal({
      ...form,
      targetAmount: Number(form.targetAmount),
      currentAmount: Number(form.currentAmount) || 0
    })
    setForm({
      name: '',
      targetAmount: 0,
      currentAmount: 0,
      deadline: new Date().toISOString().slice(0, 10)
    })
    setModalOpen(false)
  }

  const handleDeposit = async () => {
    if (!depositGoalId || !depositAmount || depositAmount <= 0) return
    await depositToGoal(depositGoalId, depositAmount, {
      createExpenseTransaction: true,
      expenseCategoryId: investmentCategoryId
    })
    setDepositGoalId(null)
    setDepositAmount(0)
  }

  const handleMarkAsPaid = async (goal: Goal) => {
    await markGoalAsPaid(goal.id, {
      createInvestmentTransaction: true,
      investmentCategoryId
    })
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
      <div className="text-destructive p-4 rounded-md bg-destructive/10">{error}</div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Metas</h2>
          <p className="text-muted-foreground">Acompanhe e deposite para seus objetivos</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova meta
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {goals.length === 0 ? (
          <Card className="md:col-span-2">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Target className="w-12 h-12 mb-4 opacity-50" />
              <p>Nenhuma meta cadastrada.</p>
              <Button variant="outline" className="mt-4" onClick={() => setModalOpen(true)}>
                Criar primeira meta
              </Button>
            </CardContent>
          </Card>
        ) : (
          goals.map((goal) => {
            const progress = goal.targetAmount > 0
              ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)
              : 0
            const expected = expectedCompletionDate(goal)
            const isCompleted = !!goal.completedAt
            return (
              <Card key={goal.id} className={isCompleted ? 'opacity-80' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base">{goal.name}</CardTitle>
                    {isCompleted && (
                      <span className="text-xs font-medium text-primary flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        Concluída
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Prazo: {new Date(goal.deadline).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>{formatCurrency(goal.currentAmount)}</span>
                    <span className="text-muted-foreground">{formatCurrency(goal.targetAmount)}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{progress.toFixed(0)}% concluído</p>
                  {expected && !isCompleted && (
                    <p className="text-xs text-muted-foreground">
                      Previsão de conclusão: {expected}
                    </p>
                  )}
                  {!isCompleted && (
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => { setDepositGoalId(goal.id); setDepositAmount(0) }}
                      >
                        <PiggyBank className="w-4 h-4 mr-2" />
                        Depositar
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        className="w-full"
                        onClick={() => handleMarkAsPaid(goal)}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Marcar como paga
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        O valor da meta será registrado como despesa na categoria Investimento.
                      </p>
                    </div>
                  )}
                  {isCompleted && (
                    <p className="text-xs text-muted-foreground">
                      O valor {formatCurrency(goal.currentAmount)} foi registrado como investimento.
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">Nova meta</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nome da meta</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Viagem, Carro..."
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label>Valor alvo (R$)</Label>
                <CurrencyInput
                  value={form.targetAmount}
                  onChange={(targetAmount) => setForm((f) => ({ ...f, targetAmount }))}
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label>Valor atual (R$)</Label>
                <CurrencyInput
                  value={form.currentAmount}
                  onChange={(currentAmount) => setForm((f) => ({ ...f, currentAmount }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Prazo</Label>
                <Input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Salvar</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {depositGoalId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setDepositGoalId(null)}
        >
          <div
            className="bg-card border border-border rounded-lg shadow-lg w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">Depositar na meta</h3>
            <div className="space-y-4">
              <div>
                <Label>Valor (R$)</Label>
                <CurrencyInput
                  value={depositAmount}
                  onChange={setDepositAmount}
                  className="mt-1"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                O valor será registrado como investimento e descontado do seu saldo.
              </p>
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => setDepositGoalId(null)}>
                  Cancelar
                </Button>
                <Button onClick={handleDeposit} disabled={!depositAmount || depositAmount <= 0}>
                  Depositar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
