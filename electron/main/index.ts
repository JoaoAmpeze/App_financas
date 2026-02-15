import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { FileSystemService } from './services/FileSystemService'

/**
 * URL do JSON com { latestVersion, downloadUrl } (link raw do version.json no GitHub).
 * Vazio = checagem desativada.
 */
const VERSION_CHECK_URL = 'https://raw.githubusercontent.com/JoaoAmpeze/App_financas/main/version.json'

let mainWindow: BrowserWindow | null = null
let fsService: FileSystemService

function parseVersion(v: string): number[] {
  const parts = v.replace(/^v/, '').split('.').map(Number)
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0]
}

function isVersionLessThan(current: string, latest: string): boolean {
  const a = parseVersion(current)
  const b = parseVersion(latest)
  for (let i = 0; i < 3; i++) {
    if (a[i] < b[i]) return true
    if (a[i] > b[i]) return false
  }
  return false
}

function getDataPath(): string {
  return join(app.getPath('userData'), 'finance-data')
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 700,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    show: false
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  const dataPath = getDataPath()
  fsService = new FileSystemService(dataPath)
  fsService.ensureDataDir().catch(console.error)

  registerIpcHandlers()
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

function registerIpcHandlers(): void {
  // App version (from package.json – single source of truth for releases)
  ipcMain.handle('app:getVersion', () => app.getVersion())

  // Check for forced update: fetch version JSON and compare
  ipcMain.handle('app:checkForUpdate', async (): Promise<{ updateRequired: boolean; latestVersion?: string; downloadUrl?: string }> => {
    if (!VERSION_CHECK_URL) return { updateRequired: false }
    try {
      const res = await fetch(VERSION_CHECK_URL)
      if (!res.ok) return { updateRequired: false }
      const data = (await res.json()) as { latestVersion?: string; downloadUrl?: string }
      const latest = data?.latestVersion
      if (!latest || typeof latest !== 'string') return { updateRequired: false }
      const current = app.getVersion()
      if (!isVersionLessThan(current, latest)) return { updateRequired: false }
      return {
        updateRequired: true,
        latestVersion: latest,
        downloadUrl: typeof data.downloadUrl === 'string' ? data.downloadUrl : undefined
      }
    } catch {
      return { updateRequired: false }
    }
  })

  // Settings
  ipcMain.handle('fs:getSettings', () => fsService.getSettings())
  ipcMain.handle('fs:saveSettings', (_e, data: Parameters<FileSystemService['saveSettings']>[0]) =>
    fsService.saveSettings(data)
  )

  // Transactions
  ipcMain.handle('fs:getTransactions', () => fsService.getTransactions())
  ipcMain.handle('fs:saveTransactions', (_e, data: Parameters<FileSystemService['saveTransactions']>[0]) =>
    fsService.saveTransactions(data)
  )
  ipcMain.handle('fs:addTransaction', (_e, data: Parameters<FileSystemService['addTransaction']>[0]) =>
    fsService.addTransaction(data)
  )

  // Goals
  ipcMain.handle('fs:getGoals', () => fsService.getGoals())
  ipcMain.handle('fs:saveGoals', (_e, data: Parameters<FileSystemService['saveGoals']>[0]) =>
    fsService.saveGoals(data)
  )
  ipcMain.handle('fs:addGoal', (_e, data: Parameters<FileSystemService['addGoal']>[0]) =>
    fsService.addGoal(data)
  )
  ipcMain.handle('fs:updateGoalProgress', (_e, id: string, currentAmount: number) =>
    fsService.updateGoalProgress(id, currentAmount)
  )
}
