import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useSettings } from '@/hooks/useFinanceData'
import { CategoryIcon, CATEGORY_ICON_NAMES } from '@/lib/categoryIcons'
import type { Category, Tag, AppSettings } from '../vite-env'
import { Plus, Pencil, Trash2, Settings as SettingsIcon, Download, Loader2 } from 'lucide-react'
import type { CheckForUpdateResult } from '@/vite-env'

function CategoryForm({
  category,
  onSave,
  onCancel
}: {
  category: Partial<Category> | null
  onSave: (c: Omit<Category, 'id'> & { id?: string }) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(category?.name ?? '')
  const [color, setColor] = useState(category?.color ?? '#22c55e')
  const [icon, setIcon] = useState(category?.icon ?? 'Circle')

  return (
    <div className="flex flex-wrap items-end gap-2 p-3 rounded-lg border border-border bg-muted/30">
      <div className="flex-1 min-w-[140px]">
        <Label className="text-xs">Nome</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Alimentação" className="mt-1" />
      </div>
      <div className="w-24">
        <Label className="text-xs">Cor</Label>
        <div className="flex gap-1 mt-1">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-10 h-10 rounded border border-input cursor-pointer"
          />
          <Input value={color} onChange={(e) => setColor(e.target.value)} className="flex-1 font-mono text-xs" />
        </div>
      </div>
      <div className="w-full">
        <Label className="text-xs">Ícone</Label>
        <div className="flex flex-wrap gap-1.5 mt-1.5 p-2 rounded-md border border-input bg-background">
          {CATEGORY_ICON_NAMES.map((n) => (
            <button
              key={n}
              type="button"
              title={n}
              onClick={() => setIcon(n)}
              className={`p-2 rounded-md border transition-colors ${
                icon === n
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-transparent hover:bg-muted'
              }`}
            >
              <CategoryIcon icon={n} size={20} />
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-1">
        <Button size="sm" onClick={() => onSave({ name, color, icon, id: category?.id })} disabled={!name.trim()}>
          Salvar
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}

function TagForm({
  tag,
  onSave,
  onCancel
}: {
  tag: Partial<Tag> | null
  onSave: (t: Omit<Tag, 'id'> & { id?: string }) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(tag?.name ?? '')

  return (
    <div className="flex flex-wrap items-end gap-2 p-3 rounded-lg border border-border bg-muted/30">
      <div className="flex-1 min-w-[180px]">
        <Label className="text-xs">Nome da tag</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Viagem 2024" className="mt-1" />
      </div>
      <div className="flex gap-1">
        <Button size="sm" onClick={() => onSave({ name, id: tag?.id })} disabled={!name.trim()}>
          Salvar
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}

export default function Settings() {
  const { settings, loading, error, save } = useSettings()
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null)
  const [addingCategory, setAddingCategory] = useState(false)
  const [editingTag, setEditingTag] = useState<Partial<Tag> | null>(null)
  const [addingTag, setAddingTag] = useState(false)

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-muted-foreground">
        Carregando...
      </div>
    )
  }
  if (error) {
    return <div className="text-destructive p-4 rounded-md bg-destructive/10">{error}</div>
  }

  const handleSaveCategory = (c: Omit<Category, 'id'> & { id?: string }) => {
    const next: AppSettings = { ...settings }
    if (c.id) {
      const idx = next.categories.findIndex((x) => x.id === c.id)
      if (idx !== -1) next.categories[idx] = { ...next.categories[idx], name: c.name, color: c.color, icon: c.icon }
    } else {
      next.categories.push({ id: crypto.randomUUID(), name: c.name, color: c.color, icon: c.icon })
    }
    save(next)
    setEditingCategory(null)
    setAddingCategory(false)
  }

  const handleDeleteCategory = (id: string) => {
    if (settings.categories.length <= 1) return
    save({ ...settings, categories: settings.categories.filter((x) => x.id !== id) })
  }

  const handleSaveTag = (t: Omit<Tag, 'id'> & { id?: string }) => {
    const next: AppSettings = { ...settings }
    if (t.id) {
      const idx = next.tags.findIndex((x) => x.id === t.id)
      if (idx !== -1) next.tags[idx] = { ...next.tags[idx], name: t.name }
    } else {
      next.tags.push({ id: crypto.randomUUID(), name: t.name })
    }
    save(next)
    setEditingTag(null)
    setAddingTag(false)
  }

  const handleDeleteTag = (id: string) => {
    save({ ...settings, tags: settings.tags.filter((x) => x.id !== id) })
  }

  const handlePreferencesChange = (updates: Partial<Pick<AppSettings, 'theme' | 'monthlyBudgetLimit'>>) => {
    save({ ...settings, ...updates })
  }

  const [currentVersion, setCurrentVersion] = useState<string>('')
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const [updateResult, setUpdateResult] = useState<CheckForUpdateResult | null>(null)

  useEffect(() => {
    window.electronAPI?.getVersion().then(setCurrentVersion).catch(() => {})
  }, [])

  const handleCheckUpdate = () => {
    setCheckingUpdate(true)
    setUpdateResult(null)
    window.electronAPI?.checkForUpdate().then((result) => {
      setUpdateResult(result)
    }).catch(() => {
      setUpdateResult({ updateRequired: false })
    }).finally(() => {
      setCheckingUpdate(false)
    })
  }

  const handleDownloadUpdate = () => {
    if (updateResult?.downloadUrl) {
      window.electronAPI?.openExternalUrl(updateResult.downloadUrl)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-7 h-7" />
          Configurações
        </h2>
        <p className="text-muted-foreground">Categorias, tags e preferências do app</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Atualizações</CardTitle>
          <p className="text-sm text-muted-foreground">
            Versão instalada: {currentVersion || '…'}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            onClick={handleCheckUpdate}
            disabled={checkingUpdate}
          >
            {checkingUpdate ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verificando…
              </>
            ) : (
              'Verificar nova versão'
            )}
          </Button>
          {updateResult && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
              {updateResult.updateRequired && updateResult.latestVersion ? (
                <>
                  <p className="text-sm font-medium text-foreground">
                    Nova versão disponível: v{updateResult.latestVersion}
                  </p>
                  <Button size="sm" onClick={handleDownloadUpdate}>
                    <Download className="w-4 h-4 mr-2" />
                    Baixar atualização
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Você está na versão mais recente.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferências</CardTitle>
          <p className="text-sm text-muted-foreground">Tema e orçamento mensal padrão</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Tema</Label>
            <Select
              value={settings.theme}
              onChange={(e) => handlePreferencesChange({ theme: e.target.value as AppSettings['theme'] })}
              className="mt-1 max-w-xs"
            >
              <option value="light">Claro</option>
              <option value="dark">Escuro</option>
              <option value="system">Sistema</option>
            </Select>
          </div>
          <div>
            <Label>Orçamento mensal (R$)</Label>
            <Input
              type="number"
              min={0}
              step={100}
              value={settings.monthlyBudgetLimit}
              onChange={(e) => handlePreferencesChange({ monthlyBudgetLimit: Number(e.target.value) || 0 })}
              className="mt-1 max-w-xs"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Categorias</CardTitle>
            <p className="text-sm text-muted-foreground">Usadas em transações. Cor e ícone por categoria.</p>
          </div>
          <Button size="sm" onClick={() => { setAddingCategory(true); setEditingCategory(null) }} disabled={addingCategory}>
            <Plus className="w-4 h-4 mr-1" /> Nova
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {addingCategory && (
            <CategoryForm
              category={null}
              onSave={handleSaveCategory}
              onCancel={() => setAddingCategory(false)}
            />
          )}
          {settings.categories.map((c) =>
            editingCategory?.id === c.id ? (
              <CategoryForm
                key={c.id}
                category={c}
                onSave={handleSaveCategory}
                onCancel={() => setEditingCategory(null)}
              />
            ) : (
              <div
                key={c.id}
                className="flex items-center justify-between gap-2 p-3 rounded-lg border border-border hover:bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                    style={{ backgroundColor: c.color }}
                  >
                    <CategoryIcon icon={c.icon} className="text-white" size={20} />
                  </div>
                  <span className="font-medium">{c.name}</span>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => { setEditingCategory(c); setAddingCategory(false) }}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteCategory(c.id)}
                    disabled={settings.categories.length <= 1}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            )
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Tags</CardTitle>
            <p className="text-sm text-muted-foreground">Etiquetas para filtrar ou agrupar transações.</p>
          </div>
          <Button size="sm" onClick={() => { setAddingTag(true); setEditingTag(null) }} disabled={addingTag}>
            <Plus className="w-4 h-4 mr-1" /> Nova
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {addingTag && (
            <TagForm tag={null} onSave={handleSaveTag} onCancel={() => setAddingTag(false)} />
          )}
          {settings.tags.map((t) =>
            editingTag?.id === t.id ? (
              <TagForm key={t.id} tag={t} onSave={handleSaveTag} onCancel={() => setEditingTag(null)} />
            ) : (
              <div
                key={t.id}
                className="flex items-center justify-between gap-2 p-3 rounded-lg border border-border hover:bg-muted/30"
              >
                <span className="font-medium">{t.name}</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => { setEditingTag(t); setAddingTag(false) }}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDeleteTag(t.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            )
          )}
          {settings.tags.length === 0 && !addingTag && (
            <p className="text-sm text-muted-foreground">Nenhuma tag. Clique em &quot;Nova&quot; para criar.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
