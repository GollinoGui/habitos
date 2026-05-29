import React, { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, Trash2, Tag } from 'lucide-react'

interface Category { id: number; name: string; type: string; icon: string; color: string }
interface Transaction { id: number; date: string; amount: number; description: string; category_id: number; type: string; category_name?: string; category_icon?: string; category_color?: string }
interface Summary { income: number; expense: number; balance: number }

const PRESET_ICONS = ['🏠', '🍔', '🚗', '💊', '🎮', '📚', '✈️', '👕', '💰', '📱', '⚽', '🎵', '💼', '🏋️', '🐾', '🎁']

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function Finance(): React.JSX.Element {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [summary, setSummary] = useState<Summary>({ income: 0, expense: 0, balance: 0 })
  const today = format(new Date(), 'yyyy-MM-dd')

  const [showTxForm, setShowTxForm] = useState(false)
  const [showCatForm, setShowCatForm] = useState(false)
  const [txDate, setTxDate] = useState(today)
  const [txAmount, setTxAmount] = useState('')
  const [txDesc, setTxDesc] = useState('')
  const [txCat, setTxCat] = useState<number | ''>('')
  const [txType, setTxType] = useState<'income' | 'expense'>('expense')
  const [catName, setCatName] = useState('')
  const [catType, setCatType] = useState<'income' | 'expense'>('expense')
  const [catIcon, setCatIcon] = useState('💰')
  const [activeTab, setActiveTab] = useState<'transactions' | 'categories'>('transactions')

  useEffect(() => { loadAll() }, [year, month])

  async function loadAll() {
    const [txs, cats, sum] = await Promise.all([
      window.api.finance.transactions.list(year, month),
      window.api.finance.categories.list(),
      window.api.finance.summary(year, month)
    ])
    setTransactions(txs as Transaction[])
    setCategories(cats as Category[])
    setSummary(sum as Summary)
  }

  function shiftMonth(delta: number) {
    let m = month + delta
    let y = year
    if (m > 12) { m = 1; y++ }
    if (m < 1) { m = 12; y-- }
    setMonth(m)
    setYear(y)
  }

  async function addTransaction() {
    const amount = parseFloat(txAmount.replace(',', '.'))
    if (!amount || !txDesc.trim()) return
    await window.api.finance.transactions.create({
      date: txDate, amount, description: txDesc,
      category_id: txCat || undefined, type: txType
    })
    setTxAmount(''); setTxDesc(''); setTxCat(''); setShowTxForm(false)
    loadAll()
  }

  async function deleteTransaction(id: number) {
    await window.api.finance.transactions.delete(id)
    loadAll()
  }

  async function addCategory() {
    if (!catName.trim()) return
    await window.api.finance.categories.create({ name: catName, type: catType, icon: catIcon, color: catType === 'income' ? '#10b981' : '#ef4444' })
    setCatName(''); setShowCatForm(false)
    loadAll()
  }

  async function deleteCategory(id: number) {
    await window.api.finance.categories.delete(id)
    loadAll()
  }

  const monthLabel = format(new Date(year, month - 1, 1), "MMMM 'de' yyyy", { locale: ptBR })

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Finanças</h1>
        <p className="text-text-secondary text-sm mt-1">Controle de receitas e despesas</p>
      </div>

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

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-bg-secondary border border-bg-border rounded-xl p-4 text-center">
          <p className="text-xs text-text-muted">Receitas</p>
          <p className="text-lg font-bold text-accent-green">{fmt(summary.income)}</p>
        </div>
        <div className="bg-bg-secondary border border-bg-border rounded-xl p-4 text-center">
          <p className="text-xs text-text-muted">Despesas</p>
          <p className="text-lg font-bold text-accent-red">{fmt(summary.expense)}</p>
        </div>
        <div className={`rounded-xl p-4 text-center border ${summary.balance >= 0 ? 'bg-emerald-950/30 border-accent-green/30' : 'bg-red-950/30 border-accent-red/30'}`}>
          <p className="text-xs text-text-muted">Saldo</p>
          <p className={`text-lg font-bold ${summary.balance >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>{fmt(summary.balance)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-bg-secondary border border-bg-border rounded-xl p-1">
        {(['transactions', 'categories'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab ? 'bg-accent-purple text-white' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab === 'transactions' ? 'Transações' : 'Categorias'}
          </button>
        ))}
      </div>

      {activeTab === 'transactions' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
              {transactions.length} transação{transactions.length !== 1 ? 'ões' : ''}
            </h2>
            <button
              onClick={() => setShowTxForm(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-purple hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus size={14} /> Adicionar
            </button>
          </div>

          {showTxForm && (
            <div className="bg-bg-secondary border border-bg-border rounded-xl p-4 space-y-3">
              <div className="flex gap-2">
                {(['expense', 'income'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTxType(t)}
                    className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      txType === t
                        ? t === 'income' ? 'border-accent-green bg-emerald-950/30 text-accent-green' : 'border-accent-red bg-red-950/30 text-accent-red'
                        : 'border-bg-border text-text-muted hover:bg-bg-border'
                    }`}
                  >
                    {t === 'income' ? '+ Receita' : '- Despesa'}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="date" value={txDate} max={today} onChange={e => setTxDate(e.target.value)}
                  className="bg-bg-primary border border-bg-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-purple" />
                <input type="text" value={txAmount} onChange={e => setTxAmount(e.target.value)} placeholder="Valor (R$)"
                  className="bg-bg-primary border border-bg-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-purple" />
              </div>
              <input type="text" value={txDesc} onChange={e => setTxDesc(e.target.value)} placeholder="Descrição"
                className="w-full bg-bg-primary border border-bg-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-purple" />
              <select value={txCat} onChange={e => setTxCat(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-bg-primary border border-bg-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-purple">
                <option value="">Sem categoria</option>
                {categories.filter(c => c.type === txType).map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button onClick={addTransaction} className="flex-1 py-2 bg-accent-purple hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors">
                  Salvar
                </button>
                <button onClick={() => setShowTxForm(false)} className="px-4 py-2 bg-bg-border text-text-secondary text-sm rounded-lg hover:bg-bg-border/70 transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {transactions.length === 0 && !showTxForm && (
            <p className="text-text-muted text-sm">Nenhuma transação neste mês.</p>
          )}

          {transactions.map(tx => (
            <div key={tx.id} className="flex items-center gap-3 p-3 bg-bg-secondary border border-bg-border rounded-xl">
              <span className="text-xl">{tx.category_icon || (tx.type === 'income' ? '💰' : '💸')}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{tx.description}</p>
                <p className="text-xs text-text-muted">
                  {format(new Date(tx.date + 'T12:00:00'), "d 'de' MMM", { locale: ptBR })}
                  {tx.category_name && <span className="ml-2">· {tx.category_name}</span>}
                </p>
              </div>
              <span className={`font-bold text-sm ${tx.type === 'income' ? 'text-accent-green' : 'text-accent-red'}`}>
                {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
              </span>
              <button onClick={() => deleteTransaction(tx.id)} className="text-text-muted hover:text-accent-red transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
              <Tag size={14} /> Categorias
            </h2>
            <button
              onClick={() => setShowCatForm(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-purple hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus size={14} /> Nova categoria
            </button>
          </div>

          {showCatForm && (
            <div className="bg-bg-secondary border border-bg-border rounded-xl p-4 space-y-3">
              <div className="flex gap-2">
                {(['expense', 'income'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setCatType(t)}
                    className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      catType === t
                        ? t === 'income' ? 'border-accent-green bg-emerald-950/30 text-accent-green' : 'border-accent-red bg-red-950/30 text-accent-red'
                        : 'border-bg-border text-text-muted hover:bg-bg-border'
                    }`}
                  >
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
                <button onClick={addCategory} className="flex-1 py-2 bg-accent-purple hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors">
                  Criar
                </button>
                <button onClick={() => setShowCatForm(false)} className="px-4 py-2 bg-bg-border text-text-secondary text-sm rounded-lg">
                  Cancelar
                </button>
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
                <button onClick={() => deleteCategory(cat.id)} className="text-text-muted hover:text-accent-red transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
