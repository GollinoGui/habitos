import React, { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { installMobileApi } from '../lib/mobileApi'
import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'

function maybeInstallMobileApi(userId: string | null): void {
  if (!userId) return
  installMobileApi(userId)  // installs on both desktop and mobile; Electron API saved internally
}

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  authError: string | null
  clearAuthError: () => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      maybeInstallMobileApi(session?.user?.id ?? null)
      if (session?.user && window.api?.db) {
        await window.api.db.setUser(session.user.id)
      }
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      maybeInstallMobileApi(session?.user?.id ?? null)
      if (session?.user) {
        if (window.api?.db) await window.api.db.setUser(session.user.id)
      } else {
        if (window.api?.db) await window.api.db.setUser(null)
      }
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Handle OAuth deep link callback — Electron or Capacitor
  useEffect(() => {
    if (window.electronAuth) {
      // Electron: habitos:// deep link
      const unsubscribe = window.electronAuth.onDeepLink(async (url: string) => {
        try {
          const parsed = new URL(url)
          const code = parsed.searchParams.get('code')
          if (code) {
            await supabase.auth.exchangeCodeForSession(code)
          }
        } catch {
          // ignore malformed URLs
        }
      })
      return unsubscribe
    }

    // Handle cold-start: app was killed and re-opened via deep link before listener registered
    App.getLaunchUrl().then(async (result) => {
      if (!result?.url) return
      try {
        const url = new URL(result.url)
        const code = url.searchParams.get('code')
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(result.url)
          try { await Browser.close() } catch { /* ignore */ }
          if (error) setAuthError('Erro ao fazer login com Google: ' + error.message)
        }
      } catch { /* ignore malformed URLs */ }
    })

    // Capacitor: com.guilherme.habitos:// deep link via App plugin
    let handle: { remove: () => Promise<void> } | null = null
    App.addListener('appUrlOpen', async (data: { url: string }) => {
      try {
        const url = new URL(data.url)

        // PKCE flow: pass the full URL so Supabase can extract both code + state
        // (state is needed to locate the stored PKCE verifier)
        const code = url.searchParams.get('code')
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(data.url)
          try { await Browser.close() } catch { /* browser may already be closed */ }
          if (error) setAuthError('Erro ao fazer login com Google: ' + error.message)
          return
        }

        // Implicit flow fallback: tokens in hash fragment
        const hashParams = new URLSearchParams(url.hash.substring(1))
        const access_token = hashParams.get('access_token')
        const refresh_token = hashParams.get('refresh_token')
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token })
          try { await Browser.close() } catch { /* browser may already be closed */ }
          if (error) setAuthError('Erro ao fazer login com Google: ' + error.message)
          return
        }

        // OAuth error returned in URL params
        const oauthError = url.searchParams.get('error_description') || url.searchParams.get('error')
        if (oauthError) {
          try { await Browser.close() } catch { /* browser may already be closed */ }
          setAuthError('Erro Google OAuth: ' + oauthError)
        }
      } catch {
        // ignore malformed URLs
      }
    }).then(h => { handle = h })

    return () => { handle?.remove() }
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, authError, clearAuthError: () => setAuthError(null), signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
