import React, { useState, useEffect } from 'react'
import { Mail, Lock, Eye, EyeOff, User, ArrowRight, Loader2, Check, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import logo from '../assets/logo.png'

type Mode = 'login' | 'register' | 'forgot'

interface PasswordStrength {
  score: number
  label: string
  color: string
  checks: { label: string; ok: boolean }[]
}

function getPasswordStrength(password: string): PasswordStrength {
  const checks = [
    { label: 'Mínimo 8 caracteres', ok: password.length >= 8 },
    { label: 'Letra maiúscula', ok: /[A-Z]/.test(password) },
    { label: 'Número', ok: /[0-9]/.test(password) },
    { label: 'Caractere especial (!@#$...)', ok: /[^A-Za-z0-9]/.test(password) },
  ]
  const score = checks.filter(c => c.ok).length

  const levels = [
    { label: 'Muito fraca', color: 'bg-red-500' },
    { label: 'Fraca', color: 'bg-orange-400' },
    { label: 'Média', color: 'bg-yellow-400' },
    { label: 'Forte', color: 'bg-green-500' },
    { label: 'Muito forte', color: 'bg-emerald-400' },
  ]

  return { score, ...levels[score], checks }
}

export default function Login() {
  const { authError, clearAuthError } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (authError) {
      setError(authError)
      clearAuthError()
    }
  }, [authError, clearAuthError])

  const strength = getPasswordStrength(password)
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword

  function reset() {
    setError('')
    setSuccess('')
  }

  function switchMode(m: Mode) {
    setMode(m)
    reset()
    setPassword('')
    setConfirmPassword('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    reset()

    if (mode === 'register') {
      if (strength.score < 2) {
        setError('Sua senha é muito fraca. Use pelo menos 8 caracteres e um número.')
        return
      }
      if (password !== confirmPassword) {
        setError('As senhas não coincidem.')
        return
      }
    }

    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) setError(translateError(error.message))
      } else if (mode === 'register') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } }
        })
        if (error) setError(translateError(error.message))
        else setSuccess('Conta criada! Verifique seu email para confirmar o cadastro.')
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: 'habitos://auth/reset'
        })
        if (error) setError(translateError(error.message))
        else setSuccess('Email de recuperação enviado!')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    reset()
    setGoogleLoading(true)
    try {
      if (window.electronAuth) {
        // Electron: abre o navegador do sistema e captura o callback
        const CALLBACK_PORT = 54321
        const redirectTo = `http://localhost:${CALLBACK_PORT}/auth/callback`

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo, skipBrowserRedirect: true }
        })
        if (error) throw error
        if (!data.url) return

        const callbackUrl = await window.electronAuth.openOAuthBrowser(data.url, CALLBACK_PORT)
        if (!callbackUrl) return

        const parsed = new URL(callbackUrl)
        const code = parsed.searchParams.get('code')

        if (code) {
          // Pass the full URL so Supabase can verify the PKCE state parameter
          const { error: e } = await supabase.auth.exchangeCodeForSession(callbackUrl)
          if (e) setError(translateError(e.message))
        } else if (parsed.hash) {
          const params = new URLSearchParams(parsed.hash.substring(1))
          const access_token = params.get('access_token')
          const refresh_token = params.get('refresh_token')
          if (access_token && refresh_token) {
            const { error: e } = await supabase.auth.setSession({ access_token, refresh_token })
            if (e) setError(translateError(e.message))
          }
        }
      } else {
        // Mobile / Capacitor: abre com Browser plugin, callback chega via deep link
        const { Browser } = await import('@capacitor/browser')
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: 'com.guilherme.habitos://auth/callback',
            skipBrowserRedirect: true
          }
        })
        if (error) throw error
        if (data.url) {
          await Browser.open({ url: data.url })
        }
      }
    } catch (err: unknown) {
      setError((err as Error).message)
    } finally {
      setGoogleLoading(false)
    }
  }

  function translateError(msg: string): string {
    if (msg.includes('Invalid login credentials')) return 'Email ou senha incorretos.'
    if (msg.includes('Email not confirmed')) return 'Confirme seu email antes de entrar.'
    if (msg.includes('User already registered')) return 'Este email já está cadastrado.'
    if (msg.includes('Password should be')) return 'A senha precisa ter no mínimo 6 caracteres.'
    if (msg.includes('rate limit')) return 'Muitas tentativas. Aguarde alguns minutos.'
    return msg
  }

  return (
    <div className="w-full max-w-sm">

        {/* Branding */}
        <div className="text-center mb-8">
          <img src={logo} alt="Hábitos" className="w-16 h-16 mx-auto mb-3 select-none drop-shadow-lg" draggable={false} />
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Hábitos</h1>
          <p className="text-text-muted text-sm mt-1">Construa melhores hábitos, todo dia</p>
        </div>

        {/* Card */}
        <div className="bg-bg-secondary border border-bg-border rounded-2xl p-6 shadow-xl">

          {/* ── LOGIN ── */}
          {mode === 'login' && (
            <>
              <h2 className="text-base font-semibold text-text-primary mb-5">Entrar na sua conta</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Field label="Email">
                  <div className="relative">
                    <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="seu@email.com" required autoComplete="email"
                      className={inputCls('pl-9 pr-4')} />
                  </div>
                </Field>

                <Field label="Senha" right={
                  <button type="button" onClick={() => switchMode('forgot')}
                    className="text-xs text-text-muted hover:text-accent-purple transition-colors">
                    Esqueci a senha
                  </button>
                }>
                  <PasswordInput value={password} onChange={setPassword}
                    show={showPassword} onToggle={() => setShowPassword(v => !v)}
                    placeholder="••••••••" autoComplete="current-password" />
                </Field>

                {error && <ErrorBox>{error}</ErrorBox>}

                <button type="submit" disabled={loading} className={btnCls}>
                  {loading ? <Loader2 size={15} className="animate-spin" /> : <>Entrar <ArrowRight size={15} /></>}
                </button>
              </form>

              <Divider />
              <GoogleButton loading={googleLoading} onClick={handleGoogle} />

              <p className="text-center text-xs text-text-muted mt-5">
                Não tem conta?{' '}
                <button type="button" onClick={() => switchMode('register')}
                  className="text-accent-purple hover:underline font-medium">
                  Criar conta
                </button>
              </p>
            </>
          )}

          {/* ── CADASTRO ── */}
          {mode === 'register' && (
            <>
              <h2 className="text-base font-semibold text-text-primary mb-5">Criar sua conta</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Field label="Seu nome">
                  <div className="relative">
                    <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                    <input type="text" value={name} onChange={e => setName(e.target.value)}
                      placeholder="Como quer ser chamado?" required
                      className={inputCls('pl-9 pr-4')} />
                  </div>
                </Field>

                <Field label="Email">
                  <div className="relative">
                    <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="seu@email.com" required autoComplete="email"
                      className={inputCls('pl-9 pr-4')} />
                  </div>
                </Field>

                <div>
                  <Field label="Senha">
                    <PasswordInput value={password} onChange={setPassword}
                      show={showPassword} onToggle={() => setShowPassword(v => !v)}
                      placeholder="Mínimo 8 caracteres" autoComplete="new-password" />
                  </Field>

                  {/* Barra de força */}
                  {password.length > 0 && (
                    <div className="mt-2.5 space-y-2">
                      <div className="flex gap-1">
                        {[0, 1, 2, 3].map(i => (
                          <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                            i < strength.score ? strength.color : 'bg-bg-border'
                          }`} />
                        ))}
                      </div>
                      <p className={`text-xs font-medium ${
                        strength.score <= 1 ? 'text-red-400' :
                        strength.score === 2 ? 'text-yellow-400' :
                        'text-green-400'
                      }`}>{strength.label}</p>
                      <ul className="space-y-1">
                        {strength.checks.map(c => (
                          <li key={c.label} className="flex items-center gap-1.5 text-xs">
                            {c.ok
                              ? <Check size={11} className="text-green-400 shrink-0" />
                              : <X size={11} className="text-text-muted shrink-0" />}
                            <span className={c.ok ? 'text-text-secondary' : 'text-text-muted'}>{c.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div>
                  <Field label="Confirmar senha">
                    <PasswordInput value={confirmPassword} onChange={setConfirmPassword}
                      show={showConfirm} onToggle={() => setShowConfirm(v => !v)}
                      placeholder="Repita a senha" autoComplete="new-password" />
                  </Field>

                  {/* Feedback coincide */}
                  {confirmPassword.length > 0 && (
                    <p className={`mt-1.5 text-xs flex items-center gap-1.5 ${passwordsMatch ? 'text-green-400' : 'text-red-400'}`}>
                      {passwordsMatch
                        ? <><Check size={11} /> As senhas coincidem</>
                        : <><X size={11} /> As senhas não coincidem</>}
                    </p>
                  )}
                </div>

                {error && <ErrorBox>{error}</ErrorBox>}
                {success && <SuccessBox>{success}</SuccessBox>}

                <button type="submit" disabled={loading} className={btnCls}>
                  {loading ? <Loader2 size={15} className="animate-spin" /> : <>Criar conta <ArrowRight size={15} /></>}
                </button>
              </form>

              <Divider />
              <GoogleButton loading={googleLoading} onClick={handleGoogle} />

              <p className="text-center text-xs text-text-muted mt-5">
                Já tem conta?{' '}
                <button type="button" onClick={() => switchMode('login')}
                  className="text-accent-purple hover:underline font-medium">
                  Entrar
                </button>
              </p>
            </>
          )}

          {/* ── ESQUECI A SENHA ── */}
          {mode === 'forgot' && (
            <>
              <button type="button" onClick={() => switchMode('login')}
                className="text-sm text-text-muted hover:text-text-primary transition-colors mb-4 block">
                ← Voltar
              </button>
              <h2 className="text-base font-semibold text-text-primary mb-1">Recuperar senha</h2>
              <p className="text-text-muted text-xs mb-5">Enviaremos um link para seu email</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Field label="Email">
                  <div className="relative">
                    <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="seu@email.com" required autoComplete="email"
                      className={inputCls('pl-9 pr-4')} />
                  </div>
                </Field>

                {error && <ErrorBox>{error}</ErrorBox>}
                {success && <SuccessBox>{success}</SuccessBox>}

                <button type="submit" disabled={loading} className={btnCls}>
                  {loading ? <Loader2 size={15} className="animate-spin" /> : <>Enviar link <ArrowRight size={15} /></>}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const btnCls = 'w-full bg-accent-purple hover:opacity-90 active:opacity-80 disabled:opacity-50 text-white font-semibold rounded-xl py-2.5 flex items-center justify-center gap-2 transition-opacity text-sm mt-1'

function inputCls(extra = '') {
  return `w-full bg-bg-primary border border-bg-border rounded-xl ${extra} py-2.5 text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-accent-purple transition-colors`
}

function Field({ label, right, children }: { label: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-medium text-text-secondary">{label}</label>
        {right}
      </div>
      {children}
    </div>
  )
}

function PasswordInput({ value, onChange, show, onToggle, placeholder, autoComplete }: {
  value: string
  onChange: (v: string) => void
  show: boolean
  onToggle: () => void
  placeholder: string
  autoComplete?: string
}) {
  return (
    <div className="relative">
      <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
      <input type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} required minLength={6} autoComplete={autoComplete}
        className={inputCls('pl-9 pr-10')} />
      <button type="button" onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors">
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  )
}

function Divider() {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-bg-border" />
      <span className="text-xs text-text-muted">ou</span>
      <div className="flex-1 h-px bg-bg-border" />
    </div>
  )
}

function GoogleButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={loading}
      className="w-full bg-bg-primary border border-bg-border hover:border-text-muted disabled:opacity-50 text-text-primary rounded-xl py-2.5 flex items-center justify-center gap-2.5 text-sm font-medium transition-colors">
      {loading ? <Loader2 size={15} className="animate-spin" /> : <GoogleIcon />}
      Continuar com Google
    </button>
  )
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm rounded-xl px-3 py-2.5 bg-red-500/10 text-red-400 border border-red-500/20">{children}</p>
  )
}

function SuccessBox({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm rounded-xl px-3 py-2.5 bg-green-500/10 text-green-400 border border-green-500/20">{children}</p>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}
