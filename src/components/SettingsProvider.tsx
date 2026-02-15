import React, { useState, useEffect, useCallback, createContext, useContext } from 'react'
import type { AppSettings } from '../vite-env'

const api = typeof window !== 'undefined' ? window.electronAPI : null

type SettingsContextValue = {
  settings: AppSettings | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  save: (data: AppSettings) => Promise<void>
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!api) {
      setLoading(false)
      setError('API não disponível. Execute no Electron.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await api.getSettings()
      setSettings(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar configurações')
    } finally {
      setLoading(false)
    }
  }, [])

  const save = useCallback(async (data: AppSettings) => {
    if (!api) return
    await api.saveSettings(data)
    setSettings(data)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <SettingsContext.Provider value={{ settings, loading, error, refresh: load, save }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings deve ser usado dentro de SettingsProvider')
  return ctx
}
