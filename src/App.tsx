import AppLayout from './components/AppLayout'
import { SettingsProvider } from './components/SettingsProvider'

export default function App() {
  return (
    <SettingsProvider>
      <AppLayout />
    </SettingsProvider>
  )
}
