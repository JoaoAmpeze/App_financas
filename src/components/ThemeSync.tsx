import { useEffect } from 'react'
import { useSettings } from '@/hooks/useFinanceData'

function getPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export default function ThemeSync() {
  const { settings } = useSettings()

  useEffect(() => {
    const root = document.documentElement
    const theme = settings?.theme ?? 'system'

    const apply = (isDark: boolean) => {
      if (isDark) root.classList.add('dark')
      else root.classList.remove('dark')
    }

    if (theme === 'dark') {
      apply(true)
      return
    }
    if (theme === 'light') {
      apply(false)
      return
    }

    // system
    apply(getPrefersDark())
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = () => apply(mq.matches)
    mq.addEventListener('change', listener)
    return () => mq.removeEventListener('change', listener)
  }, [settings?.theme])

  return null
}
