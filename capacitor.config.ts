import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.guilherme.habitos',
  appName: 'Hábitos',
  webDir: 'dist-mobile',
  plugins: {
    Browser: {},
    App: {},
    SplashScreen: {
      launchShowDuration: 2500,
      backgroundColor: '#0f0f0f',
      androidSplashResourceName: 'splash',
      showSpinner: false,
      launchAutoHide: true
    }
  }
}

export default config
