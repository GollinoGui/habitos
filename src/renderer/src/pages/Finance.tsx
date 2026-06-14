import React, { useEffect, useState } from 'react'
import { format, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useLocation } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, Plus, Trash2, Tag, BarChart2,
  CheckCircle2, Circle, AlertCircle, Calendar, Download, Power,
  TrendingDown, TrendingUp
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface Category { id: number; name: string; type: string; icon: string; color: string }
interface Account { id: number; name: string; bank: string; icon: string; color: string }
interface Transaction {
  id: number; date: string; amount: number; description: string
  category_id: number; type: string; status: string; bill_id?: number; account_id?: number
  category_name?: string; category_icon?: string; category_color?: string
  account_name?: string; account_icon?: string; account_color?: string
}
interface Bill {
  id: number; name: string; amount: number; due_day: number; due_month?: number
  category_id?: number; type: string; recurrence: string; is_active: number; icon: string
  category_name?: string; category_icon?: string
}
interface Summary {
  paidIncome: number; pendingIncome: number; paidExpense: number; pendingExpense: number
  income: number; expense: number; balance: number; currentBalance: number; projectedBalance: number
  nextMonthIncome: number; nextMonthExpense: number; nextMonthBalance: number
}
interface ConfirmPay { id: number; amount: number; description: string }

const PRESET_ICONS   = ['🏠','🍔','🚗','💊','🎮','📚','✈️','👕','💰','📱','⚽','🎵','💼','🏋️','🐾','🎁','🛒','💻','🎬','☕']
const BILL_ICONS     = ['📋','🏠','💡','📱','🌐','🚗','🏥','💼','🎓','💳','🛡️','📺','🎵','💰','🍽️','☎️','💧','🔥']
const ACCOUNT_ICONS  = ['🏦','💳','💰','🏧','🟣','🔵','🔴','🟠','🟡','🟢','⚫','💼']
const ACCOUNT_COLORS = ['#7c3aed','#ea580c','#dc2626','#2563eb','#ca8a04','#16a34a','#0891b2','#4b5563','#ec4899','#14b8a6']

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function getDueUrgency(dateStr: string): 'overdue' | 'today' | 'soon' | 'upcoming' {
  const date = new Date(dateStr + 'T12:00:00')
  const now = new Date(); now.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)
  if (date < now) return 'overdue'
  if (date.getTime() === now.getTime()) return 'today'
  if (date <= addDays(now, 3)) return 'soon'
  return 'upcoming'
}

// ── Pending item row ──────────────────────────────────────────────────────────
interface PendingRowProps {
  tx: Transaction
  confirmingPay: ConfirmPay | null
  confirmAmount: string
  setConfirmAmount: (v: string) => void
  setConfirmingPay: (v: ConfirmPay | null) => void
  onConfirm: () => void
  onDelete: (id: number) => void
  onUnpay?: (id: number) => void
  paid?: boolean
}

function PendingRow({ tx, confirmingPay, confirmAmount, setConfirmAmount, setConfirmingPay, onConfirm, onDelete, onUnpay, paid }: PendingRowProps) {
  const urgency = paid ? 'upcoming' : getDueUrgency(tx.date)
  const isConfirming = confirmingPay?.id === tx.id

  const urgencyText: Record<string, string> = {
    overdue: 'text-red-400', today: 'text-yellow-400', soon: 'text-yellow-300', upcoming: 'text-text-muted'
  }
  const urgencyBorder: Record<string, string> = {
    overdue: 'border-red-500/30 bg-red-950/20',
    today:   'border-yellow-500/30 bg-yellow-950/20',
    soon:    'border-yellow-400/20 bg-yellow-950/10',
    upcoming: 'border-bg-border bg-bg-secondary'
  }

  return (
    <div className={`rounded-xl border p-3 transition-all ${paid ? 'border-bg-border bg-bg-secondary opacity-60' : urgencyBorder[urgency]}`}>
      {isConfirming ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-text-primary">
            Confirmar pagamento: <span className="text-accent-purple">{tx.description}</span>
          </p>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-text-muted block mb-1">Valor pago (R$)</label>
              <input
                type="text" value={confirmAmount} onChange={e => setConfirmAmount(e.target.value)}
                className="w-full bg-bg-primary border border-bg-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-purple"
                autoFocus
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onConfirm} className="flex-1 py-1.5 bg-accent-green/20 border border-accent-green/40 text-accent-green text-sm font-medium rounded-lg hover:bg-accent-green/30 transition-colors">
              ✓ Confirmar
            </button>
            <button onClick={() => setConfirmingPay(null)} className="px-4 py-1.5 bg-bg-border text-text-secondary text-sm rounded-lg hover:bg-bg-border/70 transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <button
            onClick={() => paid ? onUnpay?.(tx.id) : (setConfirmingPay({ id: tx.id, amount: tx.amount, description: tx.description }), setConfirmAmount(String(tx.amount).replace('.', ',')))}
            className={`shrink-0 transition-colors ${paid ? 'text-accent-green hover:text-text-muted' : 'text-text-muted hover:text-accent-green'}`}
          >
            {paid ? <CheckCircle2 size={20} /> : <Circle size={20} />}
          </button>
          <span className="text-xl">{tx.category_icon || (tx.type === 'income' ? '💰' : '💸')}</span>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium text-text-primary truncate ${paid ? 'line-through' : ''}`}>{tx.description}</p>
            <p className={`text-xs ${paid ? 'text-text-muted' : urgencyText[urgency]}`}>
              {paid
                ? `pago em ${format(new Date(tx.date + 'T12:00:00'), "d 'de' MMM", { locale: ptBR })}`
                : `vence dia ${format(new Date(tx.date + 'T12:00:00'), "d 'de' MMM", { locale: ptBR })}${urgency === 'overdue' ? ' · ATRASADO' : urgency === 'today' ? ' · HOJE' : ''}`
              }
              {tx.category_name && <span className="text-text-muted"> · {tx.category_name}</span>}
            </p>
          </div>
          <span className={`font-bold text-sm shrink-0 ${tx.type === 'income' ? 'text-accent-green' : paid ? 'text-text-muted' : 'text-accent-red'}`}>
            {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
          </span>
          <button onClick={() => onDelete(tx.id)} className="text-text-muted hover:text-accent-red transition-colors shrink-0">
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  )
}

// ── Transaction form (must be outside Finance to avoid remount on each keystroke) ─
interface TxFormProps {
  txType: 'income' | 'expense'; setTxType: (v: 'income' | 'expense') => void
  txDate: string; setTxDate: (v: string) => void
  txAmount: string; setTxAmount: (v: string) => void
  txDesc: string; setTxDesc: (v: string) => void
  txCat: number | ''; setTxCat: (v: number | '') => void
  txAccount: number | ''; setTxAccount: (v: number | '') => void
  txPending: boolean; setTxPending: (v: boolean) => void
  categories: Category[]; accounts: Account[]
  onSave: () => void; onClose: () => void
}

function TxForm({ txType, setTxType, txDate, setTxDate, txAmount, setTxAmount, txDesc, setTxDesc, txCat, setTxCat, txAccount, setTxAccount, txPending, setTxPending, categories, accounts, onSave, onClose }: TxFormProps) {
  return (
    <div className="bg-bg-secondary border border-bg-border rounded-xl p-4 space-y-3">
      <div className="flex gap-2">
        {(['expense', 'income'] as const).map(t => (
          <button key={t} onClick={() => setTxType(t)}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              txType === t
                ? t === 'income' ? 'border-accent-green bg-emerald-950/30 text-accent-green' : 'border-accent-red bg-red-950/30 text-accent-red'
                : 'border-bg-border text-text-muted hover:bg-bg-border'
            }`}>
            {t === 'income' ? '+ Receita' : '- Despesa'}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input type="date" value={txDate} onChange={e => setTxDate(e.target.value)}
          className="bg-bg-primary border border-bg-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-purple" />
        <input type="text" value={txAmount} onChange={e => setTxAmount(e.target.value)} placeholder="Valor (R$)"
          className="bg-bg-primary border border-bg-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-purple" />
      </div>
      <input type="text" value={txDesc} onChange={e => setTxDesc(e.target.value)} placeholder="Descrição"
        className="w-full bg-bg-primary border border-bg-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-purple" />
      <select value={txCat} onChange={e => setTxCat(e.target.value ? Number(e.target.value) : '')}
        className="w-full bg-bg-primary border border-bg-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-purple">
        <option value="">Sem categoria</option>
        {categories.filter(c => c.type === txType).map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
      </select>
      {accounts.length > 0 && (
        <select value={txAccount} onChange={e => setTxAccount(e.target.value ? Number(e.target.value) : '')}
          className="w-full bg-bg-primary border border-bg-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-purple">
          <option value="">Sem conta bancária</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}{a.bank ? ` · ${a.bank}` : ''}</option>)}
        </select>
      )}
      <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
        <input type="checkbox" checked={txPending} onChange={e => setTxPending(e.target.checked)}
          className="rounded accent-yellow-400" />
        Marcar como pendente (ainda não paguei)
      </label>
      <div className="flex gap-2">
        <button onClick={onSave} className="flex-1 py-2 bg-accent-purple hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors">Salvar</button>
        <button onClick={onClose} className="px-4 py-2 bg-bg-border text-text-secondary text-sm rounded-lg hover:bg-bg-border/70 transition-colors">Cancelar</button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Finance(): React.JSX.Element {
  const now = new Date()
  const location = useLocation()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [bills, setBills]               = useState<Bill[]>([])
  const [categories, setCategories]     = useState<Category[]>([])
  const [accounts, setAccounts]         = useState<Account[]>([])
  const [summary, setSummary] = useState<Summary>({
    paidIncome: 0, pendingIncome: 0, paidExpense: 0, pendingExpense: 0,
    income: 0, expense: 0, balance: 0, currentBalance: 0, projectedBalance: 0,
    nextMonthIncome: 0, nextMonthExpense: 0, nextMonthBalance: 0
  })

  const today = format(new Date(), 'yyyy-MM-dd')
  const [showBackupBanner, setShowBackupBanner] = useState(false)
  const [activeTab, setActiveTab] = useState<'pending' | 'history' | 'bills' | 'accounts' | 'categories'>('pending')

  // Transaction form
  const [showTxForm, setShowTxForm] = useState(false)
  const [txDate, setTxDate] = useState(today)
  const [txAmount, setTxAmount] = useState('')
  const [txDesc, setTxDesc] = useState('')
  const [txCat, setTxCat] = useState<number | ''>('')
  const [txAccount, setTxAccount] = useState<number | ''>('')
  const [txType, setTxType] = useState<'income' | 'expense'>('expense')
  const [txPending, setTxPending] = useState(false)

  // Account form
  const [showAccountForm, setShowAccountForm] = useState(false)
  const [accountName, setAccountName] = useState('')
  const [accountBank, setAccountBank] = useState('')
  const [accountIcon, setAccountIcon] = useState('🏦')
  const [accountColor, setAccountColor] = useState('#7c3aed')

  // OFX import
  const [ofxResult, setOfxResult]     = useState<{ imported: number; total: number } | null>(null)
  const [ofxAccountId, setOfxAccountId] = useState<number | ''>('')

  // Receipt OCR
  const [ocrLoading, setOcrLoading]   = useState(false)
  const [ocrError, setOcrError]       = useState('')

  // Category form
  const [showCatForm, setShowCatForm] = useState(false)
  const [catName, setCatName] = useState('')
  const [catType, setCatType] = useState<'income' | 'expense'>('expense')
  const [catIcon, setCatIcon] = useState('💰')
  const [catChartTab, setCatChartTab] = useState<'expense' | 'income'>('expense')

  // Bill form
  const [showBillForm, setShowBillForm] = useState(false)
  const [billName, setBillName] = useState('')
  const [billAmount, setBillAmount] = useState('')
  const [billDueDay, setBillDueDay] = useState('5')
  const [billDueMonth, setBillDueMonth] = useState('')
  const [billCat, setBillCat] = useState<number | ''>('')
  const [billType, setBillType] = useState<'income' | 'expense'>('expense')
  const [billRecurrence, setBillRecurrence] = useState<'monthly' | 'yearly'>('monthly')
  const [billIcon, setBillIcon] = useState('📋')

  // Pay confirmation
  const [confirmingPay, setConfirmingPay] = useState<ConfirmPay | null>(null)
  const [confirmAmount, setConfirmAmount] = useState('')

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState<{ message: string; onConfirm: () => Promise<void> } | null>(null)

  function askDelete(message: string, onConfirm: () => Promise<void>): void {
    setConfirmDelete({ message, onConfirm })
  }

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const action = (location.state as any)?.trayAction
    if (action === 'expense') { setTxType('expense'); setShowTxForm(true) }
    if (action === 'income')  { setTxType('income');  setShowTxForm(true) }
  }, [location.state])

  useEffect(() => { loadAll() }, [year, month])

  useEffect(() => {
    window.api.finance.backup.check().then((r: { shouldRemind: boolean }) => setShowBackupBanner(r.shouldRemind))
  }, [])

  async function loadAll() {
    await window.api.finance.bills.generateMonth(year, month)
    const [txs, cats, sum, bls, accs] = await Promise.all([
      window.api.finance.transactions.list(year, month),
      window.api.finance.categories.list(),
      window.api.finance.summary(year, month),
      window.api.finance.bills.list(),
      window.api.finance.accounts.list().catch(() => [])
    ])
    setTransactions(txs as Transaction[])
    setCategories(cats as Category[])
    setSummary(sum as Summary)
    setBills(bls as Bill[])
    setAccounts(accs as Account[])
  }

  function shiftMonth(delta: number) {
    let m = month + delta, y = year
    if (m > 12) { m = 1; y++ }
    if (m < 1)  { m = 12; y-- }
    setMonth(m); setYear(y)
  }

  async function addTransaction() {
    const amount = parseFloat(txAmount.replace(',', '.'))
    if (!amount || !txDesc.trim()) return
    await window.api.finance.transactions.create({
      date: txDate, amount, description: txDesc,
      category_id: txCat || undefined, type: txType,
      status: txPending ? 'pending' : 'paid',
      account_id: txAccount || undefined
    })
    setTxAmount(''); setTxDesc(''); setTxCat(''); setTxAccount(''); setShowTxForm(false); setTxPending(false)
    loadAll()
  }

  async function addAccount() {
    if (!accountName.trim()) return
    await window.api.finance.accounts.create({
      name: accountName, bank: accountBank, icon: accountIcon, color: accountColor
    })
    setAccountName(''); setAccountBank(''); setShowAccountForm(false)
    loadAll()
  }

  async function handleOFXFile(file: File) {
    const content = await file.text()
    const result = await window.api.finance.ofx.import(content, ofxAccountId || undefined) as { imported: number; total: number }
    setOfxResult(result)
    loadAll()
  }

  async function handleReceiptFile(file: File) {
    setOcrLoading(true)
    setOcrError('')
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result as string
      const base64 = dataUrl.split(',')[1]
      const mimeType = file.type || 'image/jpeg'
      const result = await window.api.finance.receipt.parse(base64, mimeType) as {
        amount?: number; date?: string; description?: string; type?: string; error?: string
      }
      setOcrLoading(false)
      if (result.error) { setOcrError(result.error); return }
      if (result.amount)      setTxAmount(String(result.amount).replace('.', ','))
      if (result.date)        setTxDate(result.date)
      if (result.description) setTxDesc(result.description)
      if (result.type === 'income' || result.type === 'expense') setTxType(result.type)
      setShowTxForm(true)
    }
    reader.readAsDataURL(file)
  }

  async function confirmPayment() {
    if (!confirmingPay) return
    const amount = parseFloat(confirmAmount.replace(',', '.'))
    if (amount > 0 && amount !== confirmingPay.amount) {
      await window.api.finance.transactions.updateAmount(confirmingPay.id, amount)
    }
    await window.api.finance.transactions.updateStatus(confirmingPay.id, 'paid')
    setConfirmingPay(null)
    loadAll()
  }

  async function markPending(id: number) {
    await window.api.finance.transactions.updateStatus(id, 'pending')
    loadAll()
  }

  async function addCategory() {
    if (!catName.trim()) return
    await window.api.finance.categories.create({
      name: catName, type: catType, icon: catIcon,
      color: catType === 'income' ? '#10b981' : '#ef4444'
    })
    setCatName(''); setShowCatForm(false); loadAll()
  }

  async function addBill() {
    const amount = parseFloat(billAmount.replace(',', '.'))
    if (!amount || !billName.trim()) return
    await window.api.finance.bills.create({
      name: billName, amount, due_day: parseInt(billDueDay) || 5,
      due_month: billRecurrence === 'yearly' ? (parseInt(billDueMonth) || month) : undefined,
      category_id: billCat || undefined, type: billType,
      recurrence: billRecurrence, icon: billIcon
    })
    setBillName(''); setBillAmount(''); setShowBillForm(false); loadAll()
  }

  async function doBackup() {
    const json = await window.api.app.exportData()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `habitos-backup-${today}.json`; a.click()
    URL.revokeObjectURL(url)
    await window.api.finance.backup.dismiss()
    setShowBackupBanner(false)
  }

  const monthLabel = format(new Date(year, month - 1, 1), "MMMM 'de' yyyy", { locale: ptBR })
  const nextMonthLabel = format(new Date(month === 12 ? year + 1 : year, month === 12 ? 0 : month, 1), 'MMMM', { locale: ptBR })

  const pendingExpenses = transactions.filter(t => t.type === 'expense' && t.status === 'pending')
    .sort((a, b) => a.date.localeCompare(b.date))
  const pendingIncomes = transactions.filter(t => t.type === 'income' && t.status === 'pending')
    .sort((a, b) => a.date.localeCompare(b.date))
  const paidExpenses = transactions.filter(t => t.type === 'expense' && t.status === 'paid')
  const paidIncomes  = transactions.filter(t => t.type === 'income'  && t.status === 'paid')

  const grouped = {
    overdue:  pendingExpenses.filter(t => getDueUrgency(t.date) === 'overdue'),
    today:    pendingExpenses.filter(t => getDueUrgency(t.date) === 'today'),
    soon:     pendingExpenses.filter(t => getDueUrgency(t.date) === 'soon'),
    upcoming: pendingExpenses.filter(t => getDueUrgency(t.date) === 'upcoming')
  }

  function buildCategoryData(type: 'expense' | 'income') {
    const acc: Record<string, { name: string; icon: string; total: number; color: string }> = {}
    transactions.filter(t => t.type === type).forEach(t => {
      const k = t.category_name || 'Sem categoria'
      if (!acc[k]) acc[k] = { name: k, icon: t.category_icon || (type === 'income' ? '💰' : '💸'), total: 0, color: t.category_color || (type === 'income' ? '#10b981' : '#ef4444') }
      acc[k].total += t.amount
    })
    return Object.values(acc).sort((a, b) => b.total - a.total).slice(0, 6)
  }

  const tooltipStyle = {
    contentStyle: { background: '#1e1e3a', border: '1px solid #2a2a4a', borderRadius: 8, color: '#e2e8f0' },
    labelStyle: { color: '#94a3b8', fontWeight: 600 },
    itemStyle: { color: '#e2e8f0' },
    cursor: { fill: 'rgba(255,255,255,0.04)' }
  }

  const rowProps = {
    confirmingPay, confirmAmount, setConfirmAmount, setConfirmingPay,
    onConfirm: confirmPayment,
    onDelete: (id: number) => askDelete('Excluir esta transação permanentemente?', async () => { await window.api.finance.transactions.delete(id); loadAll() })
  }

  return (
    <div className="space-y-6 animate-fadeIn">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary animate-slide-down">Finanças</h1>
        <p className="text-text-secondary text-sm mt-1 animate-slide-in-left" style={{ animationDelay: '60ms' }}>
          Controle de receitas e despesas
        </p>
      </div>

      {/* Backup reminder */}
      {showBackupBanner && (
        <div className="flex items-center gap-3 p-3 bg-accent-purple/10 border border-accent-purple/30 rounded-xl animate-slide-up">
          <Download size={15} className="text-accent-purple shrink-0" />
          <p className="flex-1 text-sm text-text-secondary">Lembrete mensal: faça um backup dos seus dados.</p>
          <button onClick={doBackup} className="px-3 py-1.5 bg-accent-purple text-white text-xs font-medium rounded-lg hover:bg-purple-600 transition-colors whitespace-nowrap">
            Baixar agora
          </button>
          <button onClick={async () => { await window.api.finance.backup.dismiss(); setShowBackupBanner(false) }}
            className="text-text-muted hover:text-text-secondary text-xs transition-colors">
            Ignorar
          </button>
        </div>
      )}

      {/* Month nav */}
      <div className="flex items-center gap-3">
        <button onClick={() => shiftMonth(-1)} className="p-1.5 rounded-lg bg-bg-secondary border border-bg-border hover:bg-bg-border transition-colors">
          <ChevronLeft size={16} className="text-text-secondary" />
        </button>
        <span className="flex-1 text-center font-semibold text-text-primary capitalize">{monthLabel}</span>
        <button onClick={() => shiftMonth(1)} className="p-1.5 rounded-lg bg-bg-secondary border border-bg-border hover:bg-bg-border transition-colors">
          <ChevronRight size={16} className="text-text-secondary" />
        </button>
      </div>

      {/* Dashboard */}
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          {/* Receitas */}
          <div className="bg-bg-secondary border border-accent-green/20 rounded-xl p-3 text-center">
            <p className="text-xs text-text-muted mb-0.5">Receitas</p>
            <p className="text-sm font-bold text-accent-green">{fmt(summary.income)}</p>
            {summary.pendingIncome > 0 && (
              <p className="text-xs text-text-muted mt-0.5">+{fmt(summary.pendingIncome)} a receber</p>
            )}
          </div>

          {/* Já paguei */}
          <div className="bg-bg-secondary border border-red-500/20 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <CheckCircle2 size={10} className="text-accent-green" />
              <p className="text-xs text-text-muted">Já paguei</p>
            </div>
            <p className="text-sm font-bold text-accent-red">{fmt(summary.paidExpense)}</p>
            {summary.pendingExpense > 0 && (
              <p className="text-xs text-yellow-400 mt-0.5">+{fmt(summary.pendingExpense)} falta</p>
            )}
          </div>

          {/* Vai sobrar */}
          <div className={`rounded-xl p-3 text-center border ${summary.projectedBalance >= 0 ? 'bg-emerald-950/30 border-accent-green/30' : 'bg-red-950/30 border-accent-red/30'}`}>
            <p className="text-xs text-text-muted mb-0.5">Vai sobrar</p>
            <p className={`text-sm font-bold ${summary.projectedBalance >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
              {fmt(summary.projectedBalance)}
            </p>
            <p className="text-xs text-text-muted mt-0.5">após tudo pago</p>
          </div>
        </div>

        {/* Next month estimate */}
        {(summary.nextMonthIncome > 0 || summary.nextMonthExpense > 0) && (
          <div className="flex items-center gap-3 p-3 bg-bg-secondary border border-bg-border rounded-xl">
            <Calendar size={13} className="text-text-muted shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-text-secondary capitalize">Estimativa para {nextMonthLabel}</p>
              <p className="text-xs text-text-muted">
                {fmt(summary.nextMonthIncome)} entram · {fmt(summary.nextMonthExpense)} saem
              </p>
            </div>
            <span className={`text-sm font-bold shrink-0 ${summary.nextMonthBalance >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
              {fmt(summary.nextMonthBalance)}
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-bg-secondary border border-bg-border rounded-xl p-1 overflow-x-auto scrollbar-none">
        {[
          { key: 'pending' as const, label: pendingExpenses.length > 0 ? `A Pagar (${pendingExpenses.length})` : 'A Pagar' },
          { key: 'history' as const, label: 'Histórico' },
          { key: 'bills' as const, label: 'Fixas' },
          { key: 'accounts' as const, label: 'Bancos' },
          { key: 'categories' as const, label: 'Categ.' }
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`shrink-0 py-2 px-3 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === key ? 'bg-accent-purple text-white' : 'text-text-secondary hover:text-text-primary'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB: A Pagar ─────────────────────────────────────────────────────── */}
      {activeTab === 'pending' && (
        <div className="space-y-4">

          {/* A receber */}
          {pendingIncomes.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-accent-green uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp size={12} /> A Receber
              </p>
              {pendingIncomes.map(tx => (
                <PendingRow key={tx.id} tx={tx} {...rowProps}
                  onUnpay={markPending}
                />
              ))}
            </div>
          )}

          {/* Atrasadas */}
          {grouped.overdue.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle size={12} /> Atrasadas ({grouped.overdue.length})
              </p>
              {grouped.overdue.map(tx => <PendingRow key={tx.id} tx={tx} {...rowProps} onUnpay={markPending} />)}
            </div>
          )}

          {/* Vencem hoje */}
          {grouped.today.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-yellow-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle size={12} /> Vencem Hoje
              </p>
              {grouped.today.map(tx => <PendingRow key={tx.id} tx={tx} {...rowProps} onUnpay={markPending} />)}
            </div>
          )}

          {/* Em breve */}
          {grouped.soon.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-yellow-300 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar size={12} /> Em Breve
              </p>
              {grouped.soon.map(tx => <PendingRow key={tx.id} tx={tx} {...rowProps} onUnpay={markPending} />)}
            </div>
          )}

          {/* Próximas */}
          {grouped.upcoming.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                <Calendar size={12} /> Próximas
              </p>
              {grouped.upcoming.map(tx => <PendingRow key={tx.id} tx={tx} {...rowProps} onUnpay={markPending} />)}
            </div>
          )}

          {/* Pagas */}
          {paidExpenses.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-accent-green uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 size={12} /> Pagas
              </p>
              {paidExpenses.map(tx => (
                <PendingRow key={tx.id} tx={tx} {...rowProps} onUnpay={markPending} paid />
              ))}
            </div>
          )}

          {/* Pagas receitas */}
          {paidIncomes.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-accent-green uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp size={12} /> Recebidas
              </p>
              {paidIncomes.map(tx => (
                <PendingRow key={tx.id} tx={tx} {...rowProps} onUnpay={markPending} paid />
              ))}
            </div>
          )}

          {/* Empty state */}
          {transactions.length === 0 && (
            <div className="text-center py-10">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-text-secondary text-sm">Nenhuma conta neste mês.</p>
              <p className="text-text-muted text-xs mt-1">Cadastre contas fixas para o controle automático.</p>
            </div>
          )}

          {pendingExpenses.length === 0 && paidExpenses.length > 0 && (
            <div className="text-center py-4">
              <p className="text-2xl mb-1">🎉</p>
              <p className="text-accent-green text-sm font-medium">Todas as contas pagas!</p>
            </div>
          )}

          {/* Manual entry + OCR */}
          <div className="space-y-2">
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setShowTxForm(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-secondary border border-bg-border text-text-secondary text-sm font-medium rounded-lg hover:bg-bg-border transition-colors">
                <Plus size={14} /> Lançamento manual
              </button>
              <label className={`flex items-center gap-1.5 px-3 py-1.5 border text-sm font-medium rounded-lg transition-colors cursor-pointer ${ocrLoading ? 'bg-accent-purple/10 border-accent-purple/40 text-accent-purple' : 'bg-bg-secondary border-bg-border text-text-secondary hover:bg-bg-border'}`}>
                {ocrLoading ? '⏳ Lendo...' : '📷 Ler comprovante'}
                <input type="file" accept="image/*,application/pdf" className="hidden" disabled={ocrLoading}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleReceiptFile(f); e.target.value = '' }} />
              </label>
            </div>
            {ocrError && (
              <div className="flex items-center gap-2 p-2 bg-red-950/30 border border-red-500/30 rounded-lg text-xs text-red-400">
                {ocrError}
                <button onClick={() => setOcrError('')} className="ml-auto">✕</button>
              </div>
            )}
            {showTxForm && <div className="mt-1"><TxForm
              txType={txType} setTxType={setTxType}
              txDate={txDate} setTxDate={setTxDate}
              txAmount={txAmount} setTxAmount={setTxAmount}
              txDesc={txDesc} setTxDesc={setTxDesc}
              txCat={txCat} setTxCat={setTxCat}
              txAccount={txAccount} setTxAccount={setTxAccount}
              txPending={txPending} setTxPending={setTxPending}
              categories={categories} accounts={accounts}
              onSave={addTransaction} onClose={() => setShowTxForm(false)}
            /></div>}
          </div>
        </div>
      )}

      {/* ── TAB: Histórico ──────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="space-y-4">

          {/* Chart: receitas vs despesas */}
          {(summary.income > 0 || summary.expense > 0) && (
            <div className="bg-bg-secondary border border-bg-border rounded-xl p-4">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
                <BarChart2 size={13} /> Receitas vs Despesas
              </p>
              <ResponsiveContainer width="100%" height={56}>
                <BarChart data={[{ name: 'Receitas', value: summary.income }, { name: 'Despesas', value: summary.expense }]}
                  layout="vertical" barCategoryGap="25%" margin={{ left: 0, right: 52, top: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} width={62} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => [fmt(v), '']} {...tooltipStyle} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={18}
                    label={{ position: 'right', formatter: (v: number) => fmt(v), fill: '#94a3b8', fontSize: 11 }}>
                    <Cell fill="#10b981" fillOpacity={0.85} />
                    <Cell fill="#ef4444" fillOpacity={0.85} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Chart: by category */}
          {transactions.length > 0 && (
            <div className="bg-bg-secondary border border-bg-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
                  <BarChart2 size={13} /> Por categoria
                </p>
                <div className="flex gap-1 bg-bg-primary border border-bg-border rounded-lg p-0.5">
                  <button onClick={() => setCatChartTab('expense')}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${catChartTab === 'expense' ? 'bg-red-500/20 text-accent-red' : 'text-text-muted hover:text-text-secondary'}`}>
                    Despesas
                  </button>
                  <button onClick={() => setCatChartTab('income')}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${catChartTab === 'income' ? 'bg-emerald-500/20 text-accent-green' : 'text-text-muted hover:text-text-secondary'}`}>
                    Receitas
                  </button>
                </div>
              </div>
              {(() => {
                const data = buildCategoryData(catChartTab)
                if (data.length === 0) return <p className="text-xs text-text-muted py-2">Nenhuma {catChartTab === 'expense' ? 'despesa' : 'receita'} com categoria.</p>
                return (
                  <ResponsiveContainer width="100%" height={data.length * 30 + 8}>
                    <BarChart data={data} layout="vertical" barCategoryGap="20%" margin={{ left: 0, right: 52, top: 4, bottom: 4 }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} width={90}
                        tickFormatter={(v, i) => `${data[i]?.icon || ''} ${v}`} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(v: number) => [fmt(v), 'Total']} {...tooltipStyle} />
                      <Bar dataKey="total" radius={[0, 4, 4, 0]} maxBarSize={18}
                        label={{ position: 'right', formatter: (v: number) => fmt(v), fill: '#94a3b8', fontSize: 11 }}>
                        {data.map((e, i) => <Cell key={i} fill={e.color} fillOpacity={0.85} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )
              })()}
            </div>
          )}

          {/* Full list */}
          <div className="space-y-3">
            <div className="flex justify-between items-center gap-2 flex-wrap">
              <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
                {transactions.length} transaç{transactions.length !== 1 ? 'ões' : 'ão'}
              </h2>
              <div className="flex gap-2">
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-secondary border border-bg-border text-text-secondary text-sm font-medium rounded-lg hover:bg-bg-border transition-colors cursor-pointer">
                  <Download size={14} /> Importar OFX
                  <input type="file" accept=".ofx,.qfx" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleOFXFile(f); e.target.value = '' }} />
                </label>
                <button onClick={() => setShowTxForm(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-purple hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors">
                  <Plus size={14} /> Adicionar
                </button>
              </div>
            </div>
            {accounts.length > 0 && (
              <select value={ofxAccountId} onChange={e => setOfxAccountId(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-bg-primary border border-bg-border text-text-secondary rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-accent-purple">
                <option value="">OFX: importar sem conta bancária</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name} — vincular ao importar</option>)}
              </select>
            )}
            {ofxResult && (
              <div className="flex items-center gap-2 p-3 bg-accent-green/10 border border-accent-green/30 rounded-xl text-sm text-accent-green">
                <CheckCircle2 size={14} />
                {ofxResult.imported} de {ofxResult.total} transações importadas.
                <button onClick={() => setOfxResult(null)} className="ml-auto text-text-muted hover:text-text-secondary text-xs">✕</button>
              </div>
            )}

            {showTxForm && <TxForm
              txType={txType} setTxType={setTxType}
              txDate={txDate} setTxDate={setTxDate}
              txAmount={txAmount} setTxAmount={setTxAmount}
              txDesc={txDesc} setTxDesc={setTxDesc}
              txCat={txCat} setTxCat={setTxCat}
              txAccount={txAccount} setTxAccount={setTxAccount}
              txPending={txPending} setTxPending={setTxPending}
              categories={categories} accounts={accounts}
              onSave={addTransaction} onClose={() => setShowTxForm(false)}
            />}

            {transactions.length === 0 && !showTxForm && (
              <p className="text-text-muted text-sm">Nenhuma transação neste mês.</p>
            )}

            {transactions.map((tx, i) => (
              <div key={tx.id}
                className={`flex items-center gap-3 p-3 rounded-xl border animate-slide-up ${tx.status === 'pending' ? 'bg-bg-secondary border-yellow-500/20 opacity-80' : 'bg-bg-secondary border-bg-border'}`}
                style={{ animationDelay: `${i * 35}ms` }}>
                <span className="text-xl">{tx.category_icon || (tx.type === 'income' ? '💰' : '💸')}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-text-primary truncate">{tx.description}</p>
                    {tx.status === 'pending' && (
                      <span className="text-xs px-1.5 py-0.5 bg-yellow-500/10 text-yellow-400 rounded font-medium shrink-0">pendente</span>
                    )}
                  </div>
                  <p className="text-xs text-text-muted">
                    {format(new Date(tx.date + 'T12:00:00'), "d 'de' MMM", { locale: ptBR })}
                    {tx.category_name && <span className="ml-2">· {tx.category_name}</span>}
                    {tx.account_name && <span className="ml-2">· {tx.account_icon} {tx.account_name}</span>}
                  </p>
                </div>
                <span className={`font-bold text-sm shrink-0 ${tx.type === 'income' ? 'text-accent-green' : 'text-accent-red'} ${tx.status === 'pending' ? 'opacity-60' : ''}`}>
                  {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
                </span>
                <button onClick={() => askDelete('Excluir esta transação permanentemente?', async () => { await window.api.finance.transactions.delete(tx.id); loadAll() })}
                  className="text-text-muted hover:text-accent-red transition-colors shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB: Contas Fixas ────────────────────────────────────────────────── */}
      {activeTab === 'bills' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Contas Recorrentes</h2>
            <button onClick={() => setShowBillForm(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-purple hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors">
              <Plus size={14} /> Nova conta
            </button>
          </div>

          {showBillForm && (
            <div className="bg-bg-secondary border border-bg-border rounded-xl p-4 space-y-3">
              <div className="flex gap-2">
                {(['expense', 'income'] as const).map(t => (
                  <button key={t} onClick={() => setBillType(t)}
                    className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      billType === t
                        ? t === 'income' ? 'border-accent-green bg-emerald-950/30 text-accent-green' : 'border-accent-red bg-red-950/30 text-accent-red'
                        : 'border-bg-border text-text-muted hover:bg-bg-border'
                    }`}>
                    {t === 'income' ? '+ Receita Fixa' : '- Despesa Fixa'}
                  </button>
                ))}
              </div>
              <input type="text" value={billName} onChange={e => setBillName(e.target.value)} placeholder="Nome (ex: Aluguel, Netflix, Salário)"
                className="w-full bg-bg-primary border border-bg-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-purple" />
              <div className="grid grid-cols-2 gap-3">
                <input type="text" value={billAmount} onChange={e => setBillAmount(e.target.value)} placeholder="Valor (R$)"
                  className="bg-bg-primary border border-bg-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-purple" />
                <input type="number" value={billDueDay} onChange={e => setBillDueDay(e.target.value)} placeholder="Dia do venc." min="1" max="31"
                  className="bg-bg-primary border border-bg-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-purple" />
              </div>
              <div className="flex gap-2">
                {(['monthly', 'yearly'] as const).map(r => (
                  <button key={r} onClick={() => setBillRecurrence(r)}
                    className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      billRecurrence === r ? 'border-accent-purple bg-accent-purple/10 text-accent-purple' : 'border-bg-border text-text-muted hover:bg-bg-border'
                    }`}>
                    {r === 'monthly' ? '🔁 Mensal' : '📅 Anual'}
                  </button>
                ))}
              </div>
              {billRecurrence === 'yearly' && (
                <select value={billDueMonth} onChange={e => setBillDueMonth(e.target.value)}
                  className="w-full bg-bg-primary border border-bg-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-purple">
                  <option value="">Mês do vencimento</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>{format(new Date(2024, m - 1, 1), 'MMMM', { locale: ptBR })}</option>
                  ))}
                </select>
              )}
              <select value={billCat} onChange={e => setBillCat(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-bg-primary border border-bg-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-purple">
                <option value="">Sem categoria</option>
                {categories.filter(c => c.type === billType).map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
              <div>
                <p className="text-xs text-text-muted mb-2">Ícone</p>
                <div className="flex flex-wrap gap-1.5">
                  {BILL_ICONS.map(icon => (
                    <button key={icon} onClick={() => setBillIcon(icon)}
                      className={`text-lg p-1.5 rounded-lg transition-all ${billIcon === icon ? 'bg-accent-purple/20 ring-2 ring-accent-purple' : 'hover:bg-bg-border'}`}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={addBill} className="flex-1 py-2 bg-accent-purple hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors">Salvar</button>
                <button onClick={() => setShowBillForm(false)} className="px-4 py-2 bg-bg-border text-text-secondary text-sm rounded-lg hover:bg-bg-border/70 transition-colors">Cancelar</button>
              </div>
            </div>
          )}

          {bills.length === 0 && !showBillForm && (
            <div className="text-center py-10">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-text-secondary text-sm">Nenhuma conta fixa cadastrada.</p>
              <p className="text-text-muted text-xs mt-1">Adicione contas recorrentes como aluguel, streaming, salário...</p>
            </div>
          )}

          {(['expense', 'income'] as const).map(type => {
            const list = bills.filter(b => b.type === type)
            if (list.length === 0) return null
            return (
              <div key={type} className="space-y-2">
                <p className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 ${type === 'income' ? 'text-accent-green' : 'text-accent-red'}`}>
                  {type === 'income' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {type === 'income' ? 'Receitas Fixas' : 'Despesas Fixas'}
                </p>
                {list.map(bill => (
                  <div key={bill.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all bg-bg-secondary ${bill.is_active ? 'border-bg-border' : 'border-bg-border opacity-50'}`}>
                    <span className="text-xl">{bill.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${bill.is_active ? 'text-text-primary' : 'text-text-muted line-through'}`}>{bill.name}</p>
                      <p className="text-xs text-text-muted">
                        {bill.recurrence === 'monthly'
                          ? `Todo dia ${bill.due_day}`
                          : `Dia ${bill.due_day} de ${format(new Date(2024, (bill.due_month ?? 1) - 1, 1), 'MMMM', { locale: ptBR })}`
                        }
                        {bill.category_name && ` · ${bill.category_name}`}
                      </p>
                    </div>
                    <span className={`font-bold text-sm shrink-0 ${type === 'income' ? 'text-accent-green' : 'text-accent-red'}`}>
                      {type === 'income' ? '+' : '-'}{fmt(bill.amount)}
                    </span>
                    <button onClick={async () => { await window.api.finance.bills.toggleActive(bill.id); loadAll() }}
                      className={`transition-colors shrink-0 ${bill.is_active ? 'text-accent-green hover:text-text-muted' : 'text-text-muted hover:text-accent-green'}`}
                      title={bill.is_active ? 'Desativar' : 'Ativar'}>
                      <Power size={14} />
                    </button>
                    <button onClick={() => askDelete(`Excluir a conta fixa "${bill.name}"?`, async () => { await window.api.finance.bills.delete(bill.id); loadAll() })}
                      className="text-text-muted hover:text-accent-red transition-colors shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* ── TAB: Bancos ─────────────────────────────────────────────────────── */}
      {activeTab === 'accounts' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
              🏦 Contas Bancárias
            </h2>
            <button onClick={() => setShowAccountForm(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-purple hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors">
              <Plus size={14} /> Nova conta
            </button>
          </div>

          {showAccountForm && (
            <div className="bg-bg-secondary border border-bg-border rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input type="text" value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="Nome (ex: Conta corrente)"
                  className="bg-bg-primary border border-bg-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-purple" />
                <input type="text" value={accountBank} onChange={e => setAccountBank(e.target.value)} placeholder="Banco (ex: Nubank)"
                  className="bg-bg-primary border border-bg-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-purple" />
              </div>
              <div>
                <p className="text-xs text-text-muted mb-2">Ícone</p>
                <div className="flex flex-wrap gap-1.5">
                  {ACCOUNT_ICONS.map(icon => (
                    <button key={icon} onClick={() => setAccountIcon(icon)}
                      className={`text-lg p-1.5 rounded-lg transition-all ${accountIcon === icon ? 'bg-accent-purple/20 ring-2 ring-accent-purple' : 'hover:bg-bg-border'}`}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-2">Cor</p>
                <div className="flex gap-2 flex-wrap">
                  {ACCOUNT_COLORS.map(c => (
                    <button key={c} onClick={() => setAccountColor(c)}
                      className={`w-7 h-7 rounded-full transition-all ${accountColor === c ? 'ring-2 ring-offset-2 ring-offset-bg-secondary ring-white scale-110' : 'opacity-70 hover:opacity-100'}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={addAccount} className="flex-1 py-2 bg-accent-purple hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors">Salvar</button>
                <button onClick={() => setShowAccountForm(false)} className="px-4 py-2 bg-bg-border text-text-secondary text-sm rounded-lg">Cancelar</button>
              </div>
            </div>
          )}

          {accounts.length === 0 && !showAccountForm && (
            <div className="text-center py-10">
              <p className="text-4xl mb-3">🏦</p>
              <p className="text-text-secondary text-sm">Nenhuma conta bancária cadastrada.</p>
              <p className="text-text-muted text-xs mt-1">Adicione suas contas para vincular transações e importar extratos.</p>
            </div>
          )}

          <div className="space-y-2">
            {accounts.map(account => {
              const accTxs = transactions.filter(t => t.account_id === account.id)
              const income  = accTxs.filter(t => t.type === 'income' && t.status === 'paid').reduce((s, t) => s + t.amount, 0)
              const expense = accTxs.filter(t => t.type === 'expense' && t.status === 'paid').reduce((s, t) => s + t.amount, 0)
              const balance = income - expense
              return (
                <div key={account.id} className="flex items-center gap-3 p-4 bg-bg-secondary border border-bg-border rounded-xl">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ backgroundColor: `${account.color}22` }}>
                    {account.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary">{account.name}</p>
                    {account.bank && <p className="text-xs text-text-muted">{account.bank}</p>}
                    {accTxs.length > 0 && (
                      <p className="text-xs text-text-muted mt-0.5">
                        <span className="text-accent-green">+{fmt(income)}</span>
                        <span className="mx-1">·</span>
                        <span className="text-accent-red">-{fmt(expense)}</span>
                        <span className="mx-1">·</span>
                        <span className={balance >= 0 ? 'text-accent-green' : 'text-accent-red'}>{fmt(balance)} saldo</span>
                      </p>
                    )}
                    {accTxs.length === 0 && <p className="text-xs text-text-muted mt-0.5">Nenhuma transação neste mês</p>}
                  </div>
                  <button onClick={() => askDelete(`Excluir a conta "${account.name}"? As transações vinculadas não serão apagadas.`, async () => { await window.api.finance.accounts.delete(account.id); loadAll() })}
                    className="text-text-muted hover:text-accent-red transition-colors shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
          </div>

        </div>
      )}

      {/* ── TAB: Categorias ──────────────────────────────────────────────────── */}
      {activeTab === 'categories' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
              <Tag size={14} /> Categorias
            </h2>
            <button onClick={() => setShowCatForm(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-purple hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors">
              <Plus size={14} /> Nova categoria
            </button>
          </div>

          {showCatForm && (
            <div className="bg-bg-secondary border border-bg-border rounded-xl p-4 space-y-3">
              <div className="flex gap-2">
                {(['expense', 'income'] as const).map(t => (
                  <button key={t} onClick={() => setCatType(t)}
                    className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      catType === t
                        ? t === 'income' ? 'border-accent-green bg-emerald-950/30 text-accent-green' : 'border-accent-red bg-red-950/30 text-accent-red'
                        : 'border-bg-border text-text-muted hover:bg-bg-border'
                    }`}>
                    {t === 'income' ? 'Receita' : 'Despesa'}
                  </button>
                ))}
              </div>
              <input type="text" value={catName} onChange={e => setCatName(e.target.value)} placeholder="Nome da categoria"
                className="w-full bg-bg-primary border border-bg-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-purple" />
              <div>
                <p className="text-xs text-text-muted mb-2">Ícone</p>
                <div className="flex flex-wrap gap-2">
                  {PRESET_ICONS.map(icon => (
                    <button key={icon} onClick={() => setCatIcon(icon)}
                      className={`text-xl p-1.5 rounded-lg transition-all ${catIcon === icon ? 'bg-accent-purple/20 ring-2 ring-accent-purple' : 'hover:bg-bg-border'}`}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={addCategory} className="flex-1 py-2 bg-accent-purple hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors">Criar</button>
                <button onClick={() => setShowCatForm(false)} className="px-4 py-2 bg-bg-border text-text-secondary text-sm rounded-lg">Cancelar</button>
              </div>
            </div>
          )}

          {categories.length === 0 && !showCatForm && (
            <p className="text-text-muted text-sm">Nenhuma categoria criada ainda.</p>
          )}

          <div className="grid grid-cols-2 gap-2">
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center gap-2 p-3 bg-bg-secondary border border-bg-border rounded-xl">
                <span className="text-xl">{cat.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{cat.name}</p>
                  <p className={`text-xs ${cat.type === 'income' ? 'text-accent-green' : 'text-accent-red'}`}>
                    {cat.type === 'income' ? 'Receita' : 'Despesa'}
                  </p>
                </div>
                <button onClick={() => askDelete(`Excluir a categoria "${cat.name}"? Todas as transações dessa categoria também serão apagadas.`, async () => { await window.api.finance.categories.delete(cat.id); loadAll() })}
                  className="text-text-muted hover:text-accent-red transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Confirm delete dialog ──────────────────────────────────────────────── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-4 bg-bg-secondary border border-bg-border rounded-2xl shadow-2xl p-6 space-y-4 animate-fadeIn">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-accent-red" />
              </div>
              <div>
                <p className="font-semibold text-text-primary">Confirmar exclusão</p>
                <p className="text-sm text-text-secondary mt-1">{confirmDelete.message}</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 bg-bg-border text-text-secondary text-sm rounded-lg hover:bg-bg-border/70 transition-colors">
                Cancelar
              </button>
              <button onClick={async () => { await confirmDelete.onConfirm(); setConfirmDelete(null) }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
