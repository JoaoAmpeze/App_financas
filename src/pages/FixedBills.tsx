import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useFixedBills, useSettings } from '@/hooks/useFinanceData'
import type { FixedBill } from '../vite-env'
import { Plus, Pencil, Trash2, Repeat } from 'lucide-react'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

const DUE_DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

export default function FixedBills() {
  const { fixedBills, loading, error, addFixedBill, updateFixedBill, deleteFixedBill } = useFixedBills()
  const { settings } = useSettings()
  const categories = settings?.categories ?? []
  const tags = settings?.tags ?? []

  const [modalOpen, setModalOpen] = useState(false)
  const [editingBill, setEditingBill] = useState<FixedBill | null>(null)
  const [form, setForm] = useState<Omit<FixedBill, 'id'>>({
    name: '',
    amount: 0,
    type: 'expense',
    categoryId: categories[0]?.id ?? '',
    dueDay: 10,
    active: true,
    tagIds: []
  })

  useEffect(() => {
    if (categories.length && !form.categoryId) {
      setForm((f) => ({ ...f, categoryId: categories[0].id }))
    }
  }, [categories])

  const openNewModal = () => {
    setEditingBill(null)
    setForm({
      name: '',
      amount: 0,
      type: 'expense',
      categoryId: categories[0]?.id ?? '',
      dueDay: 10,
      active: true,
      tagIds: []
    })
    setModalOpen(true)
  }

  const openEditModal = (bill: FixedBill) => {
    setEditingBill(bill)
    setForm({
      name: bill.name,
      amount: bill.amount,
      type: bill.type,
      categoryId: bill.categoryId,
      dueDay: bill.dueDay,
      active: bill.active,
      tagIds: bill.tagIds ?? []
    })
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || form.amount <= 0 || !form.categoryId) return
    const payload = {
      ...form,
      amount: Number(form.amount),
      dueDay: Number(form.dueDay) || 1
    }
    if (editingBill) {
      await updateFixedBill(editingBill.id, payload)
    } else {
      await addFixedBill(payload)
    }
    setModalOpen(false)
    setEditingBill(null)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Excluir esta conta fixa?')) {
      await deleteFixedBill(id)
    }
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
          <h2 className="text-2xl font-bold tracking-tight">Contas fixas</h2>
          <p className="text-muted-foreground">Receitas e despesas recorrentes (mensais)</p>
        </div>
        <Button onClick={openNewModal}>
          <Plus className="w-4 h-4 mr-2" />
          Nova conta fixa
        </Button>
      </div>

      {fixedBills.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <Repeat className="w-12 h-12 mb-4 opacity-50" />
            <p>Nenhuma conta fixa cadastrada.</p>
            <Button variant="outline" className="mt-4" onClick={openNewModal}>
              Adicionar primeira conta fixa
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Lista de contas fixas</CardTitle>
            <p className="text-sm text-muted-foreground">Dia = dia do mês de vencimento</p>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="h-10 px-4 text-left font-medium">Nome</th>
                    <th className="h-10 px-4 text-left font-medium">Tipo</th>
                    <th className="h-10 px-4 text-left font-medium">Categoria</th>
                    <th className="h-10 px-4 text-left font-medium">Valor</th>
                    <th className="h-10 px-4 text-left font-medium">Dia</th>
                    <th className="h-10 px-4 text-left font-medium">Ativa</th>
                    <th className="h-10 px-4 text-right font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {fixedBills.map((bill) => {
                    const cat = categories.find((c) => c.id === bill.categoryId)
                    return (
                      <tr key={bill.id} className="border-b border-border hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{bill.name}</td>
                        <td className="px-4 py-3">
                          <span
                            className={
                              bill.type === 'income'
                                ? 'text-green-600 font-medium'
                                : 'text-destructive font-medium'
                            }
                          >
                            {bill.type === 'income' ? 'Receita' : 'Despesa'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-2">
                            {cat && (
                              <>
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: cat.color }}
                                />
                                {cat.name}
                              </>
                            )}
                            {!cat && bill.categoryId}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={
                              bill.type === 'income'
                                ? 'text-green-600 font-medium'
                                : 'text-destructive font-medium'
                            }
                          >
                            {bill.type === 'income' ? '+' : '-'}
                            {formatCurrency(bill.amount)}
                          </span>
                        </td>
                        <td className="px-4 py-3">{bill.dueDay}</td>
                        <td className="px-4 py-3">{bill.active ? 'Sim' : 'Não'}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditModal(bill)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDelete(bill.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => {
            setModalOpen(false)
            setEditingBill(null)
          }}
        >
          <div
            className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">
              {editingBill ? 'Editar conta fixa' : 'Nova conta fixa'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Aluguel, Salário, Luz"
                  className="mt-1"
                  required
                />
              </div>
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
                <Label>Categoria</Label>
                <Select
                  value={form.categoryId}
                  onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                  className="mt-1"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
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
              <div>
                <Label>Dia do vencimento (1–31)</Label>
                <Select
                  value={String(form.dueDay)}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, dueDay: parseInt(e.target.value, 10) || 1 }))
                  }
                  className="mt-1"
                >
                  {DUE_DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </Select>
              </div>
              {tags.length > 0 && (
                <div>
                  <Label>Tags (opcional)</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {tags.map((t) => (
                      <label
                        key={t.id}
                        className="flex items-center gap-1 text-sm cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={(form.tagIds ?? []).includes(t.id)}
                          onChange={(e) => {
                            const prev = form.tagIds ?? []
                            setForm((f) => ({
                              ...f,
                              tagIds: e.target.checked
                                ? [...prev, t.id]
                                : prev.filter((id) => id !== t.id)
                            }))
                          }}
                          className="rounded border-border"
                        />
                        {t.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="fixed-bill-active"
                  checked={form.active}
                  onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                  className="rounded border-border"
                />
                <Label htmlFor="fixed-bill-active" className="cursor-pointer">
                  Conta ativa (incluída no planejamento)
                </Label>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setModalOpen(false)
                    setEditingBill(null)
                  }}
                >
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
