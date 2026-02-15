import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useGoals } from '@/hooks/useFinanceData'
import type { Goal } from '../vite-env'
import { Plus, Target } from 'lucide-react'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

export default function Goals() {
  const { goals, loading, error, addGoal } = useGoals()
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<Omit<Goal, 'id'>>({
    name: '',
    targetAmount: 0,
    currentAmount: 0,
    deadline: new Date().toISOString().slice(0, 10)
  })

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
          <p className="text-muted-foreground">Acompanhe seus objetivos financeiros</p>
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
            return (
              <Card key={goal.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{goal.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Prazo: {new Date(goal.deadline).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
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
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.targetAmount || ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, targetAmount: parseFloat(e.target.value) || 0 }))
                  }
                  placeholder="0,00"
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label>Valor atual (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.currentAmount || ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, currentAmount: parseFloat(e.target.value) || 0 }))
                  }
                  placeholder="0,00"
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
    </div>
  )
}
