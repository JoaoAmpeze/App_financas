import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useTransactions, useSettings } from '@/hooks/useFinanceData'
import type { Transaction } from '../vite-env.d'
import { Plus } from 'lucide-react'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

export default function Transactions() {
  const { transactions, loading, error, addTransaction } = useTransactions()
  const { settings } = useSettings()
  const [modalOpen, setModalOpen] = useState(false)
  const categories = settings?.categories ?? ['Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Lazer', 'Outros']
  const [form, setForm] = useState<Omit<Transaction, 'id'>>({
    date: new Date().toISOString().slice(0, 10),
    description: '',
    amount: 0,
    type: 'expense',
    category: categories[0]
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.description || form.amount <= 0 || !form.category) return
    await addTransaction({
      ...form,
      amount: Number(form.amount),
      category: form.category || categories[0]
    })
    setForm((f) => ({
      ...f,
      date: new Date().toISOString().slice(0, 10),
      description: '',
      amount: 0,
      category: categories[0]
    }))
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
          <h2 className="text-2xl font-bold tracking-tight">Transações</h2>
          <p className="text-muted-foreground">Gerencie receitas e despesas</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova transação
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de transações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="h-10 px-4 text-left font-medium">Data</th>
                  <th className="h-10 px-4 text-left font-medium">Descrição</th>
                  <th className="h-10 px-4 text-left font-medium">Categoria</th>
                  <th className="h-10 px-4 text-left font-medium">Tipo</th>
                  <th className="h-10 px-4 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="h-24 text-center text-muted-foreground">
                      Nenhuma transação. Clique em &quot;Nova transação&quot; para adicionar.
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => (
                    <tr key={t.id} className="border-b border-border hover:bg-muted/30">
                      <td className="px-4 py-3">{formatDate(t.date)}</td>
                      <td className="px-4 py-3">{t.description}</td>
                      <td className="px-4 py-3">{t.category}</td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            t.type === 'income'
                              ? 'text-green-600 font-medium'
                              : 'text-destructive font-medium'
                          }
                        >
                          {t.type === 'income' ? 'Receita' : 'Despesa'}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-medium ${
                          t.type === 'income' ? 'text-green-600' : 'text-destructive'
                        }`}
                      >
                        {t.type === 'income' ? '+' : '-'}
                        {formatCurrency(t.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">Nova transação</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Tipo</Label>
                <Select
                  value={form.type}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, type: e.target.value as 'income' | 'expense' }))
                  }
                  className="mt-1"
                >
                  <option value="income">Receita</option>
                  <option value="expense">Despesa</option>
                </Select>
              </div>
              <div>
                <Label>Data</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Descrição</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Ex: Supermercado"
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label>Categoria</Label>
                <Select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="mt-1"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount || ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))
                  }
                  placeholder="0,00"
                  className="mt-1"
                  required
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
