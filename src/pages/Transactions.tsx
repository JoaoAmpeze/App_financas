import { useState, useMemo, useEffect } from 'react'
import { useSearchParams, useLocation } from 'react-router-dom'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type RowSelectionState,
  type SortingState
} from '@tanstack/react-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useTransactions, useTransactionMonths, useSettings } from '@/hooks/useFinanceData'
import type { Transaction } from '../vite-env'
import { Plus, Pencil, Trash2, Calendar, ArrowUpDown, ArrowUp, ArrowDown, Filter } from 'lucide-react'

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function formatMonthKey(key: string): string {
  const [y, m] = key.split('-')
  const monthNum = parseInt(m, 10)
  return `${MONTH_NAMES[monthNum - 1] ?? m} ${y}`
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

export default function Transactions() {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const categoryIdFilter = searchParams.get('categoryId') ?? undefined

  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)

  const { transactions, loading, error, addTransaction, updateTransaction, updateTransactionsBulk, deleteTransaction } = useTransactions(selectedMonth ?? undefined)
  const { months: monthKeys, refresh: refreshMonths } = useTransactionMonths()

  const currentMonthKey = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }, [])
  const filterMonthOptions = useMemo(() => {
    const set = new Set(monthKeys)
    if (!set.has(currentMonthKey)) set.add(currentMonthKey)
    return Array.from(set).sort().reverse()
  }, [monthKeys, currentMonthKey])
  const { settings: appSettings } = useSettings()
  const categories = appSettings?.categories ?? []
  const tags = appSettings?.tags ?? []

  const [modalOpen, setModalOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [bulkCategoryId, setBulkCategoryId] = useState<string>('')
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [sorting, setSorting] = useState<SortingState>([{ id: 'amount', desc: true }])
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [tagIdFilter, setTagIdFilter] = useState<string>('')
  const [form, setForm] = useState<Omit<Transaction, 'id'>>({
    date: new Date().toISOString().slice(0, 10),
    description: '',
    amount: 0,
    type: 'expense',
    categoryId: categories[0]?.id ?? '',
    tagIds: []
  })

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((t) => !categoryIdFilter || t.categoryId === categoryIdFilter)
      .filter((t) => typeFilter === 'all' || t.type === typeFilter)
      .filter((t) => !tagIdFilter || (t.tagIds ?? []).includes(tagIdFilter))
  }, [transactions, categoryIdFilter, typeFilter, tagIdFilter])

  useEffect(() => {
    if (categories.length && !form.categoryId) setForm((f) => ({ ...f, categoryId: categories[0].id }))
  }, [categories])

  useEffect(() => {
    const state = location.state as {
      openNewTransaction?: boolean
      prefillFromFixedBill?: { description: string; amount: number; type: 'income' | 'expense'; categoryId: string; tagIds: string[]; dueDay: number }
    }
    if (state?.openNewTransaction) {
      setModalOpen(true)
      if (state.prefillFromFixedBill) {
        const p = state.prefillFromFixedBill
        const now = new Date()
        const y = now.getFullYear()
        const m = now.getMonth() + 1
        const lastDay = new Date(y, m, 0).getDate()
        const day = Math.min(p.dueDay, lastDay)
        const date = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        setForm({
          date,
          description: p.description,
          amount: p.amount,
          type: p.type,
          categoryId: p.categoryId,
          tagIds: p.tagIds ?? []
        })
      }
      window.history.replaceState({}, '', location.pathname + location.search)
    }
  }, [location.state, location.pathname, location.search])

  useEffect(() => {
    const open = () => setModalOpen(true)
    window.addEventListener('openNewTransaction', open)
    return () => window.removeEventListener('openNewTransaction', open)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.description || form.amount <= 0 || !form.categoryId) return
    if (editingTransaction) {
      await updateTransaction(editingTransaction.id, {
        date: form.date,
        description: form.description,
        amount: Number(form.amount),
        type: form.type,
        categoryId: form.categoryId,
        tagIds: form.tagIds ?? []
      })
      setEditingTransaction(null)
    } else {
      await addTransaction({
        ...form,
        amount: Number(form.amount),
        categoryId: form.categoryId,
        tagIds: form.tagIds ?? []
      })
      refreshMonths()
    }
    setForm((f) => ({
      ...f,
      date: new Date().toISOString().slice(0, 10),
      description: '',
      amount: 0,
      categoryId: categories[0]?.id ?? '',
      tagIds: []
    }))
    setModalOpen(false)
  }

  const openEditModal = (t: Transaction) => {
    setEditingTransaction(t)
    setForm({
      date: t.date.slice(0, 10),
      description: t.description,
      amount: t.amount,
      type: t.type,
      categoryId: t.categoryId,
      tagIds: t.tagIds ?? []
    })
    setModalOpen(true)
  }

  const openNewModal = () => {
    setEditingTransaction(null)
    setForm((f) => ({
      ...f,
      date: new Date().toISOString().slice(0, 10),
      description: '',
      amount: 0,
      categoryId: categories[0]?.id ?? '',
      tagIds: []
    }))
    setModalOpen(true)
  }

  const selectedIds = useMemo(
    () => Object.keys(rowSelection).filter((id) => rowSelection[id]),
    [rowSelection]
  )

  const handleBulkCategory = async () => {
    if (!bulkCategoryId || selectedIds.length === 0) return
    await updateTransactionsBulk(selectedIds, { categoryId: bulkCategoryId })
    setRowSelection({})
    setBulkCategoryId('')
  }

  const columns = useMemo<ColumnDef<Transaction>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
            className="rounded border-border"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={(e) => row.toggleSelected(e.target.checked)}
            onClick={(e) => e.stopPropagation()}
            className="rounded border-border"
          />
        )
      },
      {
        accessorKey: 'date',
        header: 'Data',
        cell: (c) => formatDate(c.getValue() as string),
        sortingFn: 'datetime'
      },
      {
        accessorKey: 'description',
        header: 'Descrição',
        cell: (c) => c.getValue() as string
      },
      {
        id: 'category',
        header: 'Categoria',
        cell: ({ row }) => {
          const cat = categories.find((c) => c.id === row.original.categoryId)
          if (!cat) return row.original.categoryId
          return (
            <span className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: cat.color }}
              />
              {cat.name}
            </span>
          )
        }
      },
      {
        id: 'tags',
        header: 'Tags',
        cell: ({ row }) => {
          const ids = row.original.tagIds ?? []
          const names = ids.map((id) => tags.find((t) => t.id === id)?.name ?? id)
          return names.length ? names.join(', ') : '—'
        }
      },
      {
        accessorKey: 'type',
        header: 'Tipo',
        cell: (c) => (
          <span
            className={
              (c.getValue() as string) === 'income'
                ? 'text-green-600 font-medium'
                : 'text-destructive font-medium'
            }
          >
            {(c.getValue() as string) === 'income' ? 'Receita' : 'Despesa'}
          </span>
        )
      },
      {
        accessorKey: 'amount',
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1 hover:text-foreground"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Valor
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="w-4 h-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="w-4 h-4" />
            ) : (
              <ArrowUpDown className="w-4 h-4 opacity-50" />
            )}
          </button>
        ),
        cell: ({ row }) => {
          const t = row.original
          const v = t.amount
          return (
            <span
              className={
                t.type === 'income' ? 'text-green-600 font-medium' : 'text-destructive font-medium'
              }
            >
              {t.type === 'income' ? '+' : '-'}
              {formatCurrency(v)}
            </span>
          )
        },
        sortingFn: 'basic'
      },
      {
        id: 'actions',
        header: 'Ações',
        cell: ({ row }) => {
          const t = row.original
          return (
            <div className="flex gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => openEditModal(t)}
                title="Editar"
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => deleteTransaction(t.id)}
                title="Excluir"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )
        }
      }
    ],
    [categories, tags, openEditModal, deleteTransaction]
  )

  const table = useReactTable({
    data: filteredTransactions,
    columns,
    state: { rowSelection, sorting },
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel()
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-muted-foreground">
        Carregando...
      </div>
    )
  }
  if (error) {
    return <div className="text-destructive p-4 rounded-md bg-destructive/10">{error}</div>
  }

  return (
    <div className="flex gap-6">
      {/* Filtros à esquerda */}
      <aside className="w-52 shrink-0 space-y-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Filter className="w-4 h-4 shrink-0" />
          <span className="text-sm font-medium">Filtros</span>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Período</label>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
            <Select
              value={selectedMonth ?? ''}
              onChange={(e) => setSelectedMonth(e.target.value || null)}
              className="w-full"
            >
              <option value="">Todos</option>
              {filterMonthOptions.map((key) => (
                <option key={key} value={key}>
                  {formatMonthKey(key)}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Categoria</label>
          <Select
            value={categoryIdFilter ?? ''}
            onChange={(e) => {
              const v = e.target.value || null
              setSearchParams((p) => {
                if (v) p.set('categoryId', v)
                else p.delete('categoryId')
                return p
              })
            }}
            className="w-full"
          >
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Tipo</label>
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'all' | 'income' | 'expense')}
            className="w-full"
          >
            <option value="all">Todos</option>
            <option value="income">Receita</option>
            <option value="expense">Despesa</option>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Tag</label>
          <Select
            value={tagIdFilter}
            onChange={(e) => setTagIdFilter(e.target.value || '')}
            className="w-full"
          >
            <option value="">Todas</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </Select>
        </div>
        {(categoryIdFilter || typeFilter !== 'all' || tagIdFilter) && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              setTypeFilter('all')
              setTagIdFilter('')
              setSearchParams((p) => { p.delete('categoryId'); return p })
            }}
          >
            Limpar filtros
          </Button>
        )}
      </aside>

      {/* Conteúdo principal */}
      <div className="flex-1 min-w-0 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Transações</h2>
            <p className="text-muted-foreground">Gerencie receitas e despesas</p>
          </div>
          <Button onClick={openNewModal}>
            <Plus className="w-4 h-4 mr-2" />
            Nova transação
          </Button>
        </div>

      {selectedIds.length > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="py-3 flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">{selectedIds.length} selecionada(s)</span>
            <Select
              value={bulkCategoryId}
              onChange={(e) => setBulkCategoryId(e.target.value)}
              className="w-48"
            >
              <option value="">Alterar categoria...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
            <Button size="sm" onClick={handleBulkCategory} disabled={!bulkCategoryId}>
              Aplicar categoria
            </Button>
            <Button size="sm" variant="outline" onClick={() => setRowSelection({})}>
              Desmarcar
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Lista de transações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id} className="border-b border-border bg-muted/50">
                    {hg.headers.map((h) => (
                      <th key={h.id} className="h-10 px-4 text-left font-medium">
                        {flexRender(h.column.columnDef.header, h.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                      Nenhuma transação. Clique em &quot;Nova transação&quot; para adicionar.
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className={`border-b border-border hover:bg-muted/30 ${row.getIsSelected() ? 'bg-primary/10' : ''}`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => { setModalOpen(false); setEditingTransaction(null) }}
        >
          <div
            className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">
              {editingTransaction ? 'Editar transação' : 'Nova transação'}
            </h3>
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
                  value={form.categoryId}
                  onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                  className="mt-1"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Tags (opcional)</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {tags.map((t) => (
                    <label key={t.id} className="flex items-center gap-1 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(form.tagIds ?? []).includes(t.id)}
                        onChange={(e) => {
                          const prev = form.tagIds ?? []
                          setForm((f) => ({
                            ...f,
                            tagIds: e.target.checked ? [...prev, t.id] : prev.filter((id) => id !== t.id)
                          }))
                        }}
                        className="rounded border-border"
                      />
                      {t.name}
                    </label>
                  ))}
                  {tags.length === 0 && (
                    <span className="text-muted-foreground text-sm">Crie tags em Configurações</span>
                  )}
                </div>
              </div>
              <div>
                <Label>Valor (R$)</Label>
                <CurrencyInput
                  value={form.amount}
                  onChange={(amount) => setForm((f) => ({ ...f, amount }))}
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
