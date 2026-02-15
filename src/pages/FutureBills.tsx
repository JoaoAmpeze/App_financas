import { useMemo, useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useFixedBills, useInstallmentDebts, useSettings, useFutureBillsPaid, useTransactions } from '@/hooks/useFinanceData'
import type { FixedBill, InstallmentDebt } from '../vite-env'
import { Plus, CalendarClock, Trash2, CreditCard, Repeat, ChevronRight, Check } from 'lucide-react'

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

export function formatMonthKey(key: string): string {
  const [y, m] = key.split('-')
  const monthNum = parseInt(m, 10)
  return `${MONTH_NAMES[monthNum - 1] ?? m}/${y}`
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

export interface FutureBillItem {
  id: string
  type: 'fixed' | 'installment'
  monthKey: string
  dueDay: number
  dateLabel: string
  name: string
  amount: number
  categoryId: string
  installmentLabel?: string
  sourceId: string
}

export function buildFutureItems(
  fixedBills: FixedBill[],
  installmentDebts: InstallmentDebt[],
  monthsAhead: number
): FutureBillItem[] {
  const now = new Date()
  const startYear = now.getFullYear()
  const startMonth = now.getMonth() + 1
  const startKey = `${startYear}-${String(startMonth).padStart(2, '0')}`

  const items: FutureBillItem[] = []

  for (const bill of fixedBills.filter((b) => b.active && b.type !== 'income')) {
    for (let i = 0; i < monthsAhead; i++) {
      const monthKey = addMonths(startKey, i)
      const lastDay = new Date(parseInt(monthKey.slice(0, 4), 10), parseInt(monthKey.slice(5, 7), 10), 0).getDate()
      const safeDay = Math.min(bill.dueDay, lastDay)
      items.push({
        id: `fixed-${bill.id}-${monthKey}`,
        type: 'fixed',
        monthKey,
        dueDay: safeDay,
        dateLabel: `${String(safeDay).padStart(2, '0')}/${monthKey.slice(5, 7)}/${monthKey.slice(0, 4)}`,
        name: bill.name,
        amount: bill.amount,
        categoryId: bill.categoryId,
        sourceId: bill.id
      })
    }
  }

  for (const debt of installmentDebts) {
    const installmentAmount = debt.totalAmount / debt.installments
    for (let i = 0; i < debt.installments; i++) {
      const monthKey = addMonths(debt.firstDueMonth, i)
      const [y, m] = monthKey.split('-').map(Number)
      const lastDay = new Date(y, m, 0).getDate()
      const safeDay = Math.min(debt.dueDay, lastDay)
      items.push({
        id: `installment-${debt.id}-${i}`,
        type: 'installment',
        monthKey,
        dueDay: safeDay,
        dateLabel: `${String(safeDay).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`,
        name: debt.name,
        amount: installmentAmount,
        categoryId: debt.categoryId,
        installmentLabel: `${i + 1}/${debt.installments}`,
        sourceId: debt.id
      })
    }
  }

  return items.sort((a, b) => {
    const c = a.monthKey.localeCompare(b.monthKey)
    if (c !== 0) return c
    return a.dueDay - b.dueDay
  })
}

export type FutureBillGroup =
  | { type: 'fixed'; source: FixedBill; items: FutureBillItem[] }
  | { type: 'installment'; source: InstallmentDebt; items: FutureBillItem[] }

function buildGroups(
  fixedBills: FixedBill[],
  installmentDebts: InstallmentDebt[],
  monthsAhead: number
): FutureBillGroup[] {
  const items = buildFutureItems(fixedBills, installmentDebts, monthsAhead)
  const groups: FutureBillGroup[] = []

  const byFixed = new Map<string, FutureBillItem[]>()
  const byInstallment = new Map<string, FutureBillItem[]>()
  for (const item of items) {
    if (item.type === 'fixed') {
      const list = byFixed.get(item.sourceId) ?? []
      list.push(item)
      byFixed.set(item.sourceId, list)
    } else {
      const list = byInstallment.get(item.sourceId) ?? []
      list.push(item)
      byInstallment.set(item.sourceId, list)
    }
  }

  for (const bill of fixedBills.filter((b) => b.active && b.type !== 'income')) {
    const list = byFixed.get(bill.id) ?? []
    if (list.length) groups.push({ type: 'fixed', source: bill, items: list })
  }
  for (const debt of installmentDebts) {
    const list = byInstallment.get(debt.id) ?? []
    if (list.length) groups.push({ type: 'installment', source: debt, items: list })
  }

  return groups.sort((a, b) => {
    const nameA = a.source.name.toLowerCase()
    const nameB = b.source.name.toLowerCase()
    return nameA.localeCompare(nameB)
  })
}

const DUE_DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

export default function FutureBills() {
  const { fixedBills, loading: loadingFixed } = useFixedBills()
  const { installmentDebts, loading: loadingDebts, addInstallmentDebt, deleteInstallmentDebt } = useInstallmentDebts()
  const { settings } = useSettings()
  const { paidIds, togglePaid } = useFutureBillsPaid()
  const { addTransaction } = useTransactions()
  const categories = settings?.categories ?? []

  const [modalAddOpen, setModalAddOpen] = useState(false)
  const [detailGroup, setDetailGroup] = useState<FutureBillGroup | null>(null)
  const [paidDetailGroup, setPaidDetailGroup] = useState<FutureBillGroup | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [form, setForm] = useState<Omit<InstallmentDebt, 'id'>>({
    name: '',
    totalAmount: 0,
    installments: 1,
    firstDueMonth: new Date().toISOString().slice(0, 7),
    dueDay: 10,
    categoryId: categories[0]?.id ?? '',
    tagIds: []
  })

  useEffect(() => {
    if (categories.length && !form.categoryId) {
      setForm((f) => ({ ...f, categoryId: categories[0].id }))
    }
  }, [categories])

  const groups = useMemo(
    () => buildGroups(fixedBills, installmentDebts, 12),
    [fixedBills, installmentDebts]
  )

  const fullyPaidGroups = useMemo(
    () =>
      groups.filter(
        (g) => g.items.length > 0 && g.items.every((item) => paidIds.includes(item.id))
      ),
    [groups, paidIds]
  )

  const groupsWithUnpaid = useMemo(
    () => groups.filter((g) => g.items.some((item) => !paidIds.includes(item.id))),
    [groups, paidIds]
  )

  const handleSubmitDebt = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!form.name.trim()) {
      setFormError('Informe a descrição.')
      return
    }
    if (form.totalAmount <= 0) {
      setFormError('Informe o valor total.')
      return
    }
    if (form.installments < 1) {
      setFormError('Informe o número de parcelas.')
      return
    }
    if (!form.categoryId || !categories.length) {
      setFormError('Cadastre pelo menos uma categoria em Configurações.')
      return
    }
    try {
      await addInstallmentDebt({
        ...form,
        totalAmount: Number(form.totalAmount),
        installments: Number(form.installments) || 1,
        dueDay: Number(form.dueDay) || 1,
        tagIds: form.tagIds ?? []
      })
      setForm((f) => ({
        ...f,
        name: '',
        totalAmount: 0,
        installments: 1,
        firstDueMonth: new Date().toISOString().slice(0, 7),
        dueDay: 10,
        categoryId: categories[0]?.id ?? '',
        tagIds: []
      }))
      setModalAddOpen(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao salvar. Tente novamente.')
    }
  }

  const handleDeleteDebt = async (id: string) => {
    if (window.confirm('Excluir esta dívida parcelada? Todas as parcelas futuras serão removidas da previsão.')) {
      await deleteInstallmentDebt(id)
      setDetailGroup(null)
    }
  }

  const handleMarkAsPaid = async (item: FutureBillItem) => {
    const isPaid = paidIds.includes(item.id)
    if (!isPaid) {
      const [y, m] = item.monthKey.split('-').map(Number)
      const lastDay = new Date(y, m, 0).getDate()
      const day = Math.min(item.dueDay, lastDay)
      const date = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const description = item.installmentLabel
        ? `${item.name} (${item.installmentLabel})`
        : item.name
      await addTransaction({
        date,
        description,
        amount: item.amount,
        type: 'expense',
        categoryId: item.categoryId,
        tagIds: []
      })
    }
    await togglePaid(item.id)
  }

  const loading = loadingFixed || loadingDebts

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-muted-foreground">
        Carregando...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Contas futuras</h2>
          <p className="text-muted-foreground">
            Clique em uma conta para ver os detalhes e marcar como paga mês a mês
          </p>
        </div>
        <Button onClick={() => { setFormError(null); setModalAddOpen(true) }}>
          <Plus className="w-4 h-4 mr-2" />
          Lançar dívida
        </Button>
      </div>

      {groupsWithUnpaid.length === 0 && fullyPaidGroups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <CalendarClock className="w-12 h-12 mb-4 opacity-50" />
            <p>Nenhuma conta futura prevista.</p>
            <p className="text-sm mt-1">
              Cadastre contas fixas em &quot;Contas fixas&quot; ou lance uma dívida parcelada acima.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => { setFormError(null); setModalAddOpen(true) }}>
              Lançar dívida parcelada
            </Button>
          </CardContent>
        </Card>
      ) : groupsWithUnpaid.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <Check className="w-10 h-10 mb-2 text-primary opacity-70" />
            <p className="font-medium">Nenhuma conta pendente</p>
            <p className="text-sm mt-1">Todas as contas previstas foram marcadas como pagas. Veja o histórico abaixo.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {groupsWithUnpaid.map((group) => {
                const firstItem = group.items[0]
                const cat = categories.find((c) => c.id === group.source.categoryId)
                const paidCount = group.items.filter((i) => paidIds.includes(i.id)).length
                const subtitle =
                  group.type === 'fixed'
                    ? `Conta fixa · Dia ${group.source.dueDay} · ${group.items.length} meses`
                    : `Parcelado · ${group.items.length} parcelas de ${formatCurrency(firstItem.amount)}`
                return (
                  <li key={group.type + '-' + group.source.id}>
                    <button
                      type="button"
                      className="w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-accent/50 transition-colors"
                      onClick={() => setDetailGroup(group)}
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted shrink-0">
                        {group.type === 'fixed' ? (
                          <Repeat className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <CreditCard className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{group.source.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {subtitle}
                          {cat && (
                            <>
                              {' · '}
                              <span
                                className="inline-block w-1.5 h-1.5 rounded-full align-middle mr-0.5"
                                style={{ backgroundColor: cat.color }}
                              />
                              {cat.name}
                            </>
                          )}
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center gap-3">
                        <span className="text-destructive font-medium">
                          -{formatCurrency(group.type === 'fixed' ? group.source.amount : firstItem.amount)}
                          {group.type === 'installment' && (
                            <span className="text-muted-foreground font-normal text-sm">/parcela</span>
                          )}
                        </span>
                        {paidCount > 0 && (
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            {paidCount}/{group.items.length} pagas
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {fullyPaidGroups.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-primary" />
                Contas pagas
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Contas com todas as parcelas pagas. Apenas visualização.
              </p>
            </div>
            <ul className="divide-y divide-border">
              {fullyPaidGroups.map((group) => {
                const cat = categories.find((c) => c.id === group.source.categoryId)
                const totalPaid = group.items.reduce((s, i) => s + i.amount, 0)
                return (
                  <li key={group.type + '-' + group.source.id}>
                    <button
                      type="button"
                      className="w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-accent/50 transition-colors"
                      onClick={() => setPaidDetailGroup(group)}
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 shrink-0">
                        {group.type === 'fixed' ? (
                          <Repeat className="w-5 h-5 text-primary" />
                        ) : (
                          <CreditCard className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{group.source.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {cat && (
                            <>
                              <span
                                className="inline-block w-1.5 h-1.5 rounded-full align-middle mr-0.5"
                                style={{ backgroundColor: cat.color }}
                              />
                              {cat.name}
                              {' · '}
                            </>
                          )}
                          {group.type === 'fixed'
                            ? `${group.items.length} ${group.items.length === 1 ? 'mês' : 'meses'}`
                            : `${group.items.length} ${group.items.length === 1 ? 'parcela' : 'parcelas'}`
                          } · Total {formatCurrency(totalPaid)}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">Ver parcelas</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </button>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Modal visualização parcelas pagas */}
      {paidDetailGroup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setPaidDetailGroup(null)}
        >
          <div
            className="bg-card border border-border rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border shrink-0">
              <h3 className="text-lg font-semibold">{paidDetailGroup.source.name}</h3>
              {(() => {
                const cat = categories.find((c) => c.id === paidDetailGroup.source.categoryId)
                const totalPaid = paidDetailGroup.items.reduce((s, i) => s + i.amount, 0)
                return (
                  <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
                    {cat && (
                      <>
                        <span
                          className="inline-block w-2 h-2 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                        {' · '}
                      </>
                    )}
                    {paidDetailGroup.type === 'fixed'
                      ? `${paidDetailGroup.items.length} meses pagos`
                      : `${paidDetailGroup.items.length} parcelas pagas`
                    } · Total {formatCurrency(totalPaid)}
                  </p>
                )
              })()}
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <p className="text-sm font-medium text-muted-foreground mb-3">Parcelas pagas</p>
              <ul className="space-y-2">
                {paidDetailGroup.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg border border-border bg-muted/30"
                  >
                    <div>
                      <p className="font-medium">
                        {formatMonthKey(item.monthKey)}
                        {item.installmentLabel && (
                          <span className="text-muted-foreground font-normal ml-1">
                            (parcela {item.installmentLabel})
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">Venc. {item.dateLabel}</p>
                    </div>
                    <span className="font-semibold tabular-nums text-destructive">
                      -{formatCurrency(item.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-4 border-t border-border shrink-0">
              <Button variant="outline" className="w-full" onClick={() => setPaidDetailGroup(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalhes da conta */}
      {detailGroup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setDetailGroup(null)}
        >
          <div
            className="bg-card border border-border rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border shrink-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold">{detailGroup.source.name}</h3>
                  {(() => {
                    const cat = categories.find((c) => c.id === detailGroup.source.categoryId)
                    return (
                      <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
                        {cat && (
                          <>
                            <span
                              className="inline-block w-2 h-2 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                            {cat.name}
                          </>
                        )}
                        {detailGroup.type === 'fixed' && ` · Vencimento todo dia ${detailGroup.source.dueDay}`}
                        {detailGroup.type === 'installment' && (
                          <> · Total {formatCurrency(detailGroup.source.totalAmount)} em {detailGroup.source.installments} parcelas</>
                        )}
                      </p>
                    )
                  })()}
                </div>
                {detailGroup.type === 'installment' && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive shrink-0"
                    onClick={() => handleDeleteDebt(detailGroup.source.id)}
                    title="Excluir dívida"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <p className="text-sm font-medium text-muted-foreground mb-3">Marcar como paga por mês</p>
              <ul className="space-y-2">
                {detailGroup.items.map((item) => {
                  const isPaid = paidIds.includes(item.id)
                  return (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg border border-border hover:bg-muted/50"
                    >
                      <div>
                        <p className="font-medium">
                          {formatMonthKey(item.monthKey)}
                          {item.installmentLabel && (
                            <span className="text-muted-foreground font-normal ml-1">
                              (parcela {item.installmentLabel})
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">Venc. {item.dateLabel}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleMarkAsPaid(item)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors shrink-0 ${
                          isPaid
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {isPaid ? <Check className="w-4 h-4" /> : null}
                        {isPaid ? 'Paga' : 'Marcar como paga'}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
            <div className="p-4 border-t border-border shrink-0">
              <Button variant="outline" className="w-full" onClick={() => setDetailGroup(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal adicionar dívida */}
      {modalAddOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => { setModalAddOpen(false); setFormError(null) }}
        >
          <div
            className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">Lançar dívida parcelada</h3>
            {formError && (
              <p className="text-sm text-destructive mb-4 bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                {formError}
              </p>
            )}
            <p className="text-sm text-muted-foreground mb-4">
              Informe o valor total, em quantas parcelas e a partir de qual mês vence.
            </p>
            <form onSubmit={handleSubmitDebt} className="space-y-4">
              <div>
                <Label>Descrição</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Notebook, Curso, Empréstimo"
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label>Valor total (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.totalAmount || ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, totalAmount: parseFloat(e.target.value) || 0 }))
                  }
                  placeholder="0,00"
                  className="mt-1"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nº de parcelas</Label>
                  <Input
                    type="number"
                    min="1"
                    max="120"
                    value={form.installments || ''}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, installments: parseInt(e.target.value, 10) || 1 }))
                    }
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label>Dia do vencimento</Label>
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
              </div>
              <div>
                <Label>Primeiro vencimento (mês/ano)</Label>
                <Input
                  type="month"
                  value={form.firstDueMonth}
                  onChange={(e) => setForm((f) => ({ ...f, firstDueMonth: e.target.value }))}
                  className="mt-1"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  A primeira parcela vence neste mês; as demais nos meses seguintes.
                </p>
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
              {!categories.length && (
                <p className="text-sm text-amber-600 dark:text-amber-500 bg-amber-500/10 rounded-md px-3 py-2">
                  Cadastre pelo menos uma categoria em Configurações para poder lançar dívidas.
                </p>
              )}
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => setModalAddOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={!categories.length}>Salvar dívida</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
