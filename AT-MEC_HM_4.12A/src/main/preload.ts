/**
 * Preload - ponte sicuro tra renderer e processo principale Electron via IPC.
 *
 * Commento introdotto in AT-MEC HM 2.15 per rendere esplicite responsabilita,
 * flusso dati e punti critici di stabilita del modulo.
 */
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  getState: () => ipcRenderer.invoke('get-state'),
  getHardwareStatuses: () => ipcRenderer.invoke('get-hardware-statuses'),
  getProfessionalDevices: () => ipcRenderer.invoke('get-professional-devices'),
  userLogin: (username: string, password: string) => ipcRenderer.invoke('user-login', { username, password }),
  listRoles: () => ipcRenderer.invoke('list-roles'),
  listUsers: () => ipcRenderer.invoke('list-users'),
  createRole: (role: string, permissions: string[], level?: number) => ipcRenderer.invoke('create-role', { role, permissions, level }),
  createUser: (username: string, displayName: string, role: string, password: string) => ipcRenderer.invoke('create-user', { username, displayName, role, password }),
  deleteUser: (username: string) => ipcRenderer.invoke('delete-user', username),
  setUserEnabled: (username: string, enabled: boolean) => ipcRenderer.invoke('set-user-enabled', { username, enabled }),
  reconnectHardware: (configs: any[]) => ipcRenderer.invoke('reconnect-hardware', configs),
  connectEsp32Only: (cfg: { port: string; baud?: number }) => ipcRenderer.invoke('connect-esp32-only', cfg),
  scanSerialPorts: () => ipcRenderer.invoke('scan-serial-ports'),
  scanVisaResources: () => ipcRenderer.invoke('scan-visa-resources'),

  startTest: (recipe: any, serialDut: string, context: any = {}) => ipcRenderer.invoke('start-test', { recipe, serialDut, ...context }),
  stopTest: () => ipcRenderer.invoke('stop-test'),
  emergencyStopAll: () => ipcRenderer.invoke('emergency-stop-all'),
  pauseTest: () => ipcRenderer.invoke('pause-test'),
  resumeTest: () => ipcRenderer.invoke('resume-test'),
  setDebugMode: (enabled: boolean) => ipcRenderer.invoke('set-debug-mode', enabled),
  nextStep: () => ipcRenderer.invoke('next-step'),
  manualStepResponse: (requestId: number, response: any) => ipcRenderer.invoke('manual-step-response', { requestId, response }),
  failureAction: (action: string) => ipcRenderer.invoke('failure-action', action),
  recoverFault: () => ipcRenderer.invoke('recover-fault'),

  flashFirmware: (tool: string, operation: string, filePath: string) =>
    ipcRenderer.invoke('flash-firmware', { tool, operation, filePath }),
  queryMultimeter: (device: string, cmd: string) =>
    ipcRenderer.invoke('query-multimeter', { device, cmd }),
  connectPl303: (cfg: any) => ipcRenderer.invoke('connect-pl303', cfg),
  setPl303Output: (cfg: any) => ipcRenderer.invoke('set-pl303-output', cfg),
  queryPl303Status: (channel: number) => ipcRenderer.invoke('query-pl303-status', channel),
  safePl303Off: (reason: string) => ipcRenderer.invoke('safe-pl303-off', reason),
  measurePl303Current: (channel: number) => ipcRenderer.invoke('measure-pl303-current', channel),
  readDigitalInput: (channel: number) => ipcRenderer.invoke('read-digital-input', channel),
  readDigitalOutput: (channel: number) => ipcRenderer.invoke('read-digital-output', channel),
  readAnalogInput: (channel: number) => ipcRenderer.invoke('read-analog-input', channel),
  setDigitalOutput: (channel: number, state: boolean) => ipcRenderer.invoke('set-digital-output', { channel, state }),
  writeAnalogOutput: (channel: number, value: number) => ipcRenderer.invoke('write-analog-output', { channel, value }),
  getEsp32Info: () => ipcRenderer.invoke('get-esp32-info'),
  getEsp32IoCatalog: () => ipcRenderer.invoke('get-esp32-io-catalog'),
  setEsp32PinMap: (entries: any[]) => ipcRenderer.invoke('set-esp32-pin-map', entries),

  getAuditHistory: (filters?: any) => ipcRenderer.invoke('get-audit-history', filters || {}),
  checkSerialHistory: (serialDut: string, lotNumber: string) => ipcRenderer.invoke('check-serial-history', { serialDut, lotNumber }),
  getLocalDbStats: (filters?: any) => ipcRenderer.invoke('get-local-db-stats', filters || {}),
  getSerialHistory: (serialDut: string, lotNumber?: string) => ipcRenderer.invoke('get-serial-history', { serialDut, lotNumber }),
  addRepairRecord: (payload: any) => ipcRenderer.invoke('add-repair-record', payload || {}),
  listRecipeVersions: (name: string) => ipcRenderer.invoke('list-recipe-versions', name),
  loadRecipeVersion: (name: string, version: number) => ipcRenderer.invoke('load-recipe-version', { name, version }),
  exportLocalDatabase: () => ipcRenderer.invoke('export-local-database'),
  exportLocalReportsCsv: (filters?: any) => ipcRenderer.invoke('export-local-reports-csv', filters || {}),
  backupLocalDatabase: (label?: string) => ipcRenderer.invoke('backup-local-database', label || 'manuale'),
  getKpi: () => ipcRenderer.invoke('get-kpi'),

  saveRecipe: (name: string, recipe: any) => ipcRenderer.invoke('save-recipe', { name, recipe }),
  loadRecipe: (name: string) => ipcRenderer.invoke('load-recipe', name),
  listRecipes: () => ipcRenderer.invoke('list-recipes'),
  deleteRecipe: (name: string) => ipcRenderer.invoke('delete-recipe', name),
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  selectInstructionImage: () => ipcRenderer.invoke('select-instruction-image'),
  getAppSettings: () => ipcRenderer.invoke('get-app-settings'),
  saveAppSettings: (settings: any) => ipcRenderer.invoke('save-app-settings', settings),
  selectLogoFile: (kind: string) => ipcRenderer.invoke('select-logo-file', kind),
  resetDefaultLogos: () => ipcRenderer.invoke('reset-default-logos'),
  exportRecipeAs: (name: string, recipe: any) => ipcRenderer.invoke('export-recipe-as', { name, recipe }),
  importRecipeFrom: () => ipcRenderer.invoke('import-recipe-from'),
  openCertificatesFolder: () => ipcRenderer.invoke('open-certificates-folder'),

  commOpenSerial: (cfg: any) => ipcRenderer.invoke('comm-open-serial', cfg || {}),
  commOpenTcp: (cfg: any) => ipcRenderer.invoke('comm-open-tcp', cfg || {}),
  commSend: (payload: any) => ipcRenderer.invoke('comm-send', payload || {}),
  commClose: () => ipcRenderer.invoke('comm-close'),
  commReadLog: () => ipcRenderer.invoke('comm-read-log'),

  on: (channel: string, callback: (...args: any[]) => void) => {
    const validChannels = [
      'state-changed', 'hardware-statuses', 'system-ready',
      'step-started', 'step-detail', 'step-passed', 'step-failed', 'manual-step-request', 'failure-decision-required', 'run-completed',
      'recipe-loaded', 'system-fault', 'cli-log', 'keysight-live',
      'kpi-updated', 'comm-rx'
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args));
    }
  },
  off: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, callback);
  }
});
