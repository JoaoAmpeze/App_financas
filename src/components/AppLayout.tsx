import { useState, useEffect } from 'react'
import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  ListOrdered,
  Target,
  TrendingUp,
  Settings,
  Repeat,
  CalendarRange,
  Search,
  ChevronDown,
} from 'lucide-react'
import type { CheckForUpdateResult } from '@/vite-env'
import Dashboard from '@/pages/Dashboard'
import Transactions from '@/pages/Transactions'
import Goals from '@/pages/Goals'
import Projection from '@/pages/Projection'
import FixedBills from '@/pages/FixedBills'
import FutureBills from '@/pages/FutureBills'
import SettingsPage from '@/pages/Settings'
import ThemeSync from '@/components/ThemeSync'
import { cn } from '@/lib/utils'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Visão geral',
  '/transactions': 'Transações',
  '/goals': 'Metas',
  '/reports': 'Projeção',
  '/fixed-bills': 'Contas fixas',
  '/future-bills': 'Contas futuras',
  '/settings': 'Configurações',
}

function UpdateRequiredScreen({
  latestVersion,
}: {
  latestVersion: string
  downloadUrl?: string
}) {
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDownloadAndInstall = () => {
    if (!window.electronAPI?.downloadAndInstallUpdate) {
      setError('Atualização automática não disponível.')
      return
    }
    setError(null)
    setDownloading(true)
    window.electronAPI.downloadAndInstallUpdate().catch((err: unknown) => {
      setDownloading(false)
      setError(err instanceof Error ? err.message : 'Erro ao baixar.')
    })
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-8 text-center">
      <div className="max-w-md space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Atualização obrigatória</h1>
        <p className="text-muted-foreground">
          Uma nova versão está disponível. Instale a versão <strong className="text-foreground">v{latestVersion}</strong> para continuar.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="button"
          onClick={handleDownloadAndInstall}
          disabled={downloading}
          className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-70"
        >
          {downloading ? 'Baixando… O app será reiniciado em instantes.' : `Baixar e instalar v${latestVersion}`}
        </button>
      </div>
    </div>
  )
}

function AppLayoutContent({
  commandPaletteOpen,
  setCommandPaletteOpen,
}: {
  commandPaletteOpen: boolean
  setCommandPaletteOpen: (v: boolean) => void
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault()
        navigate('/transactions', { state: { openNewTransaction: true } })
        window.dispatchEvent(new CustomEvent('openNewTransaction'))
      }
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [navigate, setCommandPaletteOpen])

  const pageTitle = PAGE_TITLES[location.pathname] ?? 'App Finanças'

  return (
    <>
      <ThemeSync />
      <div className="flex h-screen bg-background text-foreground">
        {/* Sidebar */}
        <aside className="w-[240px] flex flex-col bg-card border-r border-border rounded-r-2xl shrink-0">
          <div className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg shadow-lg">
                F
              </div>
              <span className="font-semibold text-card-foreground">App Finanças</span>
            </div>
          </div>
          <nav className="flex-1 px-3 space-y-1">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/20 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )
              }
            >
              <LayoutDashboard className="w-5 h-5 shrink-0" />
              Visão geral
            </NavLink>
            <NavLink
              to="/transactions"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/20 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )
              }
            >
              <ListOrdered className="w-5 h-5 shrink-0" />
              Transações
            </NavLink>
            <NavLink
              to="/goals"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/20 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )
              }
            >
              <Target className="w-5 h-5 shrink-0" />
              Metas
            </NavLink>
            <NavLink
              to="/reports"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/20 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )
              }
            >
              <TrendingUp className="w-5 h-5 shrink-0" />
              Projeção
            </NavLink>
          </nav>
          <div className="p-3 border-t border-border space-y-1">
            <NavLink
              to="/fixed-bills"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/20 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )
              }
            >
              <Repeat className="w-5 h-5 shrink-0" />
              Contas fixas
            </NavLink>
            <NavLink
              to="/future-bills"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/20 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )
              }
            >
              <CalendarRange className="w-5 h-5 shrink-0" />
              Contas futuras
            </NavLink>
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/20 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )
              }
            >
              <Settings className="w-5 h-5 shrink-0" />
              Configurações
            </NavLink>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-16 shrink-0 flex items-center justify-between gap-4 px-6 border-b border-border bg-background/95">
            <h1 className="text-xl font-semibold text-foreground">{pageTitle}</h1>
            <div className="flex items-center gap-4 flex-1 max-w-md justify-center">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Pesquisar"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-9 pr-4 rounded-xl bg-muted/50 border border-input text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
                U
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-foreground">Usuário</p>
                <p className="text-xs text-muted-foreground">Conta local</p>
              </div>
              <button
                type="button"
                className="p-1 rounded-lg hover:bg-accent text-muted-foreground"
                aria-label="Menu"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </header>

        <main className="flex-1 overflow-auto p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/reports" element={<Projection />} />
            <Route path="/fixed-bills" element={<FixedBills />} />
            <Route path="/future-bills" element={<FutureBills />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>

      {commandPaletteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60"
          onClick={() => setCommandPaletteOpen(false)}
        >
          <div
            className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-2 border-b border-border">
              <input
                type="text"
                placeholder="Comando... (ex: nova transação)"
                className="w-full bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                autoFocus
                onKeyDown={(e) => e.key === 'Escape' && setCommandPaletteOpen(false)}
              />
            </div>
            <div className="py-1">
              <button
                type="button"
                className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent flex items-center gap-2"
                onClick={() => {
                  navigate('/transactions', { state: { openNewTransaction: true } })
                  window.dispatchEvent(new CustomEvent('openNewTransaction'))
                  setCommandPaletteOpen(false)
                }}
              >
                Nova transação
              </button>
              <button
                type="button"
                className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent"
                onClick={() => {
                  navigate('/')
                  setCommandPaletteOpen(false)
                }}
              >
                Ir para Visão geral
              </button>
              <button
                type="button"
                className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent"
                onClick={() => {
                  navigate('/transactions')
                  setCommandPaletteOpen(false)
                }}
              >
                Transações
              </button>
              <button
                type="button"
                className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent"
                onClick={() => {
                  navigate('/goals')
                  setCommandPaletteOpen(false)
                }}
              >
                Metas
              </button>
              <button
                type="button"
                className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent"
                onClick={() => {
                  navigate('/fixed-bills')
                  setCommandPaletteOpen(false)
                }}
              >
                Contas fixas
              </button>
              <button
                type="button"
                className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent"
                onClick={() => {
                  navigate('/future-bills')
                  setCommandPaletteOpen(false)
                }}
              >
                Contas futuras
              </button>
              <button
                type="button"
                className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent"
                onClick={() => {
                  navigate('/settings')
                  setCommandPaletteOpen(false)
                }}
              >
                Configurações
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  )
}

export default function AppLayout() {
  const [updateInfo, setUpdateInfo] = useState<CheckForUpdateResult | null>(null)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  useEffect(() => {
    window.electronAPI?.checkForUpdate().then((result) => {
      if (result.updateRequired && result.latestVersion) {
        setUpdateInfo(result)
      }
    }).catch(() => {})
  }, [])

  if (updateInfo?.updateRequired && updateInfo.latestVersion) {
    return (
      <UpdateRequiredScreen
        latestVersion={updateInfo.latestVersion}
        downloadUrl={updateInfo.downloadUrl}
      />
    )
  }

  return (
    <AppLayoutContent
      commandPaletteOpen={commandPaletteOpen}
      setCommandPaletteOpen={setCommandPaletteOpen}
    />
  )
}
