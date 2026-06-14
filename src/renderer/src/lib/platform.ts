// Returns true when running inside Electron (window.electronApi is exposed by the preload script)
export const isElectron = (): boolean =>
  typeof window !== 'undefined' && typeof (window as { electronApi?: unknown }).electronApi !== 'undefined'
