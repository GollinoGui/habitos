import React, { useState } from 'react'
import { Mail, Lock, Eye, EyeOff, User, ArrowRight, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

type Mode = 'login' | 'register' | 'forgot'

export default function Login() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function reset() {
    setError('')
    setSuccess('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    reset()
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
        else setSuccess('Conta criada! Verifique seu email para confirmar.')
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
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'habitos://auth/callback',
          skipBrowserRedirect: true
        }
      })
      if (error) throw error
      if (data.url) window.open(data.url)
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
    if (msg.includes('Unable to validate')) return 'Email inválido.'
    if (msg.includes('rate limit')) return 'Muitas tentativas. Aguarde alguns minutos.'
    return msg
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Branding */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3 select-none">✅</div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Hábitos</h1>
          <p className="text-text-muted text-sm mt-1">Construa melhores hábitos, todo dia</p>
        </div>

        {/* Card */}
        <div className="bg-bg-secondary border border-bg-border rounded-2xl p-6 shadow-xl">

          {/* Tabs login/cadastro */}
          {mode !== 'forgot' && (
            <div className="flex gap-1 bg-bg-primary rounded-xl p-1 mb-6">
              {(['login', 'register'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMode(m); reset() }}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    mode === m
                      ? 'bg-accent-purple text-white shadow-sm'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  {m === 'login' ? 'Entrar' : 'Cadastrar'}
                </button>
              ))}
            </div>
          )}

          {/* Cabeçalho modo "esqueci a senha" */}
          {mode === 'forgot' && (
            <div className="mb-5">
              <button
                type="button"
                onClick={() => { setMode('login'); reset() }}
                className="text-sm text-text-muted hover:text-text-primary transition-colors"
              >
                ← Voltar
              </button>
              <h2 className="text-base font-semibold text-text-primary mt-3">Recuperar senha</h2>
              <p className="text-text-muted text-xs mt-0.5">Enviaremos um link para seu email</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Seu nome</label>
                <div className="relative">
                  <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Como quer ser chamado?"
                    required
                    className="w-full bg-bg-primary border border-bg-border rounded-xl pl-9 pr-4 py-2.5 text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-accent-purple transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Email</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  autoComplete="email"
                  className="w-full bg-bg-primary border border-bg-border rounded-xl pl-9 pr-4 py-2.5 text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-accent-purple transition-colors"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-text-secondary">Senha</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); reset() }}
                      className="text-xs text-text-muted hover:text-accent-purple transition-colors"
                    >
                      Esqueci a senha
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : '••••••••'}
                    required
                    minLength={6}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    className="w-full bg-bg-primary border border-bg-border rounded-xl pl-9 pr-10 py-2.5 text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-accent-purple transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm rounded-xl px-3 py-2.5 bg-red-500/10 text-red-400 border border-red-500/20">
                {error}
              </p>
            )}
            {success && (
              <p className="text-sm rounded-xl px-3 py-2.5 bg-green-500/10 text-green-400 border border-green-500/20">
                {success}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent-purple hover:opacity-90 active:opacity-80 disabled:opacity-50 text-white font-semibold rounded-xl py-2.5 flex items-center justify-center gap-2 transition-opacity text-sm mt-2"
            >
              {loading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'Entrar' : mode === 'register' ? 'Criar conta' : 'Enviar link'}
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Google OAuth */}
          {mode !== 'forgot' && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-bg-border" />
                <span className="text-xs text-text-muted">ou</span>
                <div className="flex-1 h-px bg-bg-border" />
              </div>

              <button
                type="button"
                onClick={handleGoogle}
                disabled={googleLoading}
                className="w-full bg-bg-primary border border-bg-border hover:border-text-muted disabled:opacity-50 text-text-primary rounded-xl py-2.5 flex items-center justify-center gap-2.5 text-sm font-medium transition-colors"
              >
                {googleLoading ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <GoogleIcon />
                )}
                Continuar com Google
              </button>
            </>
          )}
        </div>
      </div>
    </div>
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
