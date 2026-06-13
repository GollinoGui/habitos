// Returns true when running inside Electron (window.api is exposed by the preload script)
export const isElectron = (): boolean =>
  typeof window !== 'undefined' && typeof (window as { api?: unknown }).api !== 'undefined'
