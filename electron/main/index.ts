import { app, BrowserWindow, ipcMain, Menu, shell } from 'electron'
import { join } from 'path'
import { autoUpdater } from 'electron-updater'
import { DataManager } from './services/DataManager'
import { migrateIfNeeded } from './services/migrateToDataManager'

// Só baixamos quando o usuário clicar em atualizar
autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true

// Se os campos de digitação ainda não funcionarem no Windows após o build, descomente a linha abaixo:
// app.disableHardwareAcceleration()

let mainWindow: BrowserWindow | null = null
let dataManager: DataManager

function getDataPath(): string {
  return join(app.getPath('userData'), 'finance-data')
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    focusable: true,
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
    mainWindow?.focus()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  // Remove a barra de menu (File, Edit, View, Window, Help)
  Menu.setApplicationMenu(null)

  const dataPath = getDataPath()
  dataManager = new DataManager(dataPath)
  await dataManager.ensureDirs()
  await migrateIfNeeded(dataPath, dataManager)

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
  ipcMain.handle('app:getVersion', () => app.getVersion())
  ipcMain.handle('app:openExternalUrl', (_e, url: string) => {
    if (typeof url === 'string' && url.startsWith('http')) {
      shell.openExternal(url)
    }
  })
  ipcMain.handle('app:getDataFolderPath', () => getDataPath())
  ipcMain.handle('app:openDataFolder', () => {
    shell.openPath(getDataPath()).catch(() => {})
  })

  ipcMain.handle('app:checkForUpdate', async () => {
    try {
      const result = await autoUpdater.checkForUpdate()
      if (!result?.updateInfo?.version) return { updateRequired: false }
      const latestVersion = result.updateInfo.version
      const current = app.getVersion()
      // Comparação semântica: só exige atualização se a release for mais nova
      const [cMaj, cMin, cPatch] = current.replace(/^v/, '').split('.').map(Number)
      const [lMaj, lMin, lPatch] = latestVersion.replace(/^v/, '').split('.').map(Number)
      const needUpdate = lMaj > cMaj || (lMaj === cMaj && lMin > cMin) || (lMaj === cMaj && lMin === cMin && lPatch > cPatch)
      if (!needUpdate) return { updateRequired: false }
      const downloadUrl = result.updateInfo.files?.find((f: { url?: string }) => f.url)?.url ?? result.updateInfo.releaseUrl
      return { updateRequired: true, latestVersion, downloadUrl }
    } catch {
      return { updateRequired: false }
    }
  })

  ipcMain.handle('app:downloadAndInstallUpdate', () => {
    return new Promise<void>((resolve, reject) => {
      const onDownloaded = () => {
        autoUpdater.removeListener('error', onError)
        autoUpdater.quitAndInstall(false, true)
        resolve()
      }
      const onError = (err: Error) => {
        autoUpdater.removeListener('update-downloaded', onDownloaded)
        reject(err)
      }
      autoUpdater.once('update-downloaded', onDownloaded)
      autoUpdater.once('error', onError)
      autoUpdater.downloadUpdate().catch(reject)
    })
  })

  ipcMain.handle('data:getSettings', () => dataManager.getSettings())
  ipcMain.handle('data:saveSettings', (_e, data: Parameters<DataManager['saveSettings']>[0]) => dataManager.saveSettings(data))

  ipcMain.handle('data:getTransactions', (_e, month?: string) => dataManager.getTransactions(month))
  ipcMain.handle('data:getTransactionMonths', () => dataManager.getTransactionMonths())
  ipcMain.handle('data:addTransaction', (_e, data: Omit<Parameters<DataManager['addTransaction']>[0], 'id'>) => dataManager.addTransaction(data))
  ipcMain.handle('data:updateTransaction', (_e, id: string, updates: Parameters<DataManager['updateTransaction']>[1]) => dataManager.updateTransaction(id, updates))
  ipcMain.handle('data:updateTransactionsBulk', (_e, ids: string[], updates: Parameters<DataManager['updateTransactionsBulk']>[1]) => dataManager.updateTransactionsBulk(ids, updates))
  ipcMain.handle('data:deleteTransaction', (_e, id: string) => dataManager.deleteTransaction(id))

  ipcMain.handle('data:getGoals', () => dataManager.getGoals())
  ipcMain.handle('data:addGoal', (_e, data: Omit<Parameters<DataManager['addGoal']>[0], 'id'>) => dataManager.addGoal(data))
  ipcMain.handle('data:updateGoal', (_e, id: string, updates: Parameters<DataManager['updateGoal']>[1]) => dataManager.updateGoal(id, updates))
  ipcMain.handle('data:depositToGoal', (_e, goalId: string, amount: number, options: Parameters<DataManager['depositToGoal']>[2]) => dataManager.depositToGoal(goalId, amount, options))
  ipcMain.handle('data:markGoalAsPaid', (_e, goalId: string, options: Parameters<DataManager['markGoalAsPaid']>[1]) => dataManager.markGoalAsPaid(goalId, options))

  ipcMain.handle('data:getFixedBills', () => dataManager.getFixedBills())
  ipcMain.handle('data:addFixedBill', (_e, data: Omit<Parameters<DataManager['addFixedBill']>[0], 'id'>) => dataManager.addFixedBill(data))
  ipcMain.handle('data:updateFixedBill', (_e, id: string, updates: Parameters<DataManager['updateFixedBill']>[1]) => dataManager.updateFixedBill(id, updates))
  ipcMain.handle('data:deleteFixedBill', (_e, id: string) => dataManager.deleteFixedBill(id))

  ipcMain.handle('data:getInstallmentDebts', () => dataManager.getInstallmentDebts())
  ipcMain.handle('data:addInstallmentDebt', (_e, data: Omit<Parameters<DataManager['addInstallmentDebt']>[0], 'id'>) => dataManager.addInstallmentDebt(data))
  ipcMain.handle('data:updateInstallmentDebt', (_e, id: string, updates: Parameters<DataManager['updateInstallmentDebt']>[1]) => dataManager.updateInstallmentDebt(id, updates))
  ipcMain.handle('data:deleteInstallmentDebt', (_e, id: string) => dataManager.deleteInstallmentDebt(id))

  ipcMain.handle('data:getFutureBillsPaid', () => dataManager.getFutureBillsPaid())
  ipcMain.handle('data:setFutureBillsPaid', (_e, ids: string[]) => dataManager.setFutureBillsPaid(ids))

  ipcMain.handle('data:resetAllData', () => dataManager.resetAllData())
}
