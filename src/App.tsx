import { useState, useEffect } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import { LayoutDashboard, ListOrdered, Target, Download, AlertCircle } from 'lucide-react'
import type { CheckForUpdateResult } from './vite-env'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Goals from './pages/Goals.tsx'

function UpdateRequiredScreen({ latestVersion, downloadUrl }: { latestVersion: string; downloadUrl?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-8 text-center">
      <div className="max-w-md space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-amber-500/20 p-4">
            <AlertCircle className="h-12 w-12 text-amber-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Atualização obrigatória</h1>
        <p className="text-muted-foreground">
          A versão que você está usando está desatualizada. Para continuar usando o App Finanças, instale a versão{' '}
          <strong className="text-foreground">v{latestVersion}</strong>.
        </p>
        {downloadUrl ? (
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Download className="h-4 w-4" />
            Baixar v{latestVersion}
          </a>
        ) : (
          <p className="text-sm text-muted-foreground">
            Obtenha o instalador mais recente no local onde você costuma baixar o app.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Feche o app após instalar a nova versão e abra-o novamente.
        </p>
      </div>
    </div>
  )
}

function App() {
  const [version, setVersion] = useState<string>('')
  const [updateInfo, setUpdateInfo] = useState<CheckForUpdateResult | null>(null)

  useEffect(() => {
    window.electronAPI?.getVersion().then(setVersion).catch(() => {})
  }, [])

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
    <div className="min-h-screen flex flex-col bg-background">
      <nav className="border-b border-border bg-card px-4 py-3 flex items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-semibold text-primary">App Finanças</h1>
          <div className="flex gap-2">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`
            }
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </NavLink>
          <NavLink
            to="/transactions"
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`
            }
          >
            <ListOrdered className="w-4 h-4" />
            Transações
          </NavLink>
          <NavLink
            to="/goals"
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`
            }
          >
            <Target className="w-4 h-4" />
            Metas
          </NavLink>
          </div>
        </div>
        {version && (
          <span className="text-xs text-muted-foreground tabular-nums">v{version}</span>
        )}
      </nav>
      <main className="flex-1 p-6 overflow-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/goals" element={<Goals />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
