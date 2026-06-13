import { createClient } from '@supabase/supabase-js'
import { isElectron } from './platform'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'habitos-auth',
    autoRefreshToken: true,
    // On Electron the OAuth callback is handled via deep link (not URL detection)
    detectSessionInUrl: !isElectron()
  }
})
