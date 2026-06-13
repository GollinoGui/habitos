import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.guilherme.habitos',
  appName: 'Hábitos',
  webDir: 'dist-mobile',
  plugins: {
    Browser: {},
    App: {}
  }
}

export default config
