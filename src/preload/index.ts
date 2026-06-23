import { contextBridge, ipcRenderer } from 'electron'

const isDemo = process.argv.includes('--habitos-demo')

// ── Real IPC API ──────────────────────────────────────────────────────────────
const realApi = {
  profile: {
    get: () => ipcRenderer.invoke('profile:get'),
    updateName: (name: string) => ipcRenderer.invoke('profile:update-name', name),
    grantXP: (amount: number, reason: string) => ipcRenderer.invoke('profile:grant-xp', amount, reason)
  },
  achievements: {
    list: () => ipcRenderer.invoke('achievements:list'),
    check: () => ipcRenderer.invoke('achievements:check')
  },
  habits: {
    list: () => ipcRenderer.invoke('habits:list'),
    dueToday: () => ipcRenderer.invoke('habits:due-today'),
    create: (data: object) => ipcRenderer.invoke('habits:create', data),
    update: (id: number, data: object) => ipcRenderer.invoke('habits:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('habits:delete', id),
    toggleActive: (id: number, active: boolean) => ipcRenderer.invoke('habits:toggle-active', id, active),
    complete: (habitId: number, date: string) => ipcRenderer.invoke('habits:complete', habitId, date),
    uncomplete: (habitId: number, date: string) => ipcRenderer.invoke('habits:uncomplete', habitId, date),
    completions: (habitId: number) => ipcRenderer.invoke('habits:completions', habitId),
    completionsRange: (start: string, end: string) => ipcRenderer.invoke('habits:completions-range', start, end),
    completionsByMonth: (year: number, month: number) => ipcRenderer.invoke('habits:completions-by-month', year, month),
    streak: (habitId: number) => ipcRenderer.invoke('habits:streak', habitId)
  },
  gym: {
    listWorkouts: (limit?: number) => ipcRenderer.invoke('gym:list-workouts', limit),
    createWorkout: (data: object) => ipcRenderer.invoke('gym:create-workout', data),
    deleteWorkout: (id: number) => ipcRenderer.invoke('gym:delete-workout', id),
    listBioimpedance: () => ipcRenderer.invoke('gym:list-bioimpedance'),
    addBioimpedance: (data: object) => ipcRenderer.invoke('gym:add-bioimpedance', data),
    deleteBioimpedance: (id: number) => ipcRenderer.invoke('gym:delete-bioimpedance', id)
  },
  addictions: {
    list: () => ipcRenderer.invoke('addictions:list'),
    create: (data: object) => ipcRenderer.invoke('addictions:create', data),
    relapse: (id: number, note?: string, relapseAt?: string) => ipcRenderer.invoke('addictions:relapse', id, note, relapseAt),
    delete: (id: number) => ipcRenderer.invoke('addictions:delete', id),
    toggleHidden: (id: number) => ipcRenderer.invoke('addictions:toggle-hidden', id),
    checkMilestones: () => ipcRenderer.invoke('addictions:check-milestones')
  },
  goals: {
    list: () => ipcRenderer.invoke('goals:list'),
    create: (data: object) => ipcRenderer.invoke('goals:create', data),
    update: (id: number, data: object) => ipcRenderer.invoke('goals:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('goals:delete', id),
    addTask: (goalId: number, title: string) => ipcRenderer.invoke('goals:add-task', goalId, title),
    completeTask: (taskId: number, completed: boolean) => ipcRenderer.invoke('goals:complete-task', taskId, completed),
    deleteTask: (taskId: number) => ipcRenderer.invoke('goals:delete-task', taskId),
    updateTask: (taskId: number, title: string) => ipcRenderer.invoke('goals:update-task', taskId, title),
    complete: (id: number) => ipcRenderer.invoke('goals:complete', id)
  },
  goalFolders: {
    list: () => ipcRenderer.invoke('goals:folders:list'),
    create: (data: object) => ipcRenderer.invoke('goals:folders:create', data),
    update: (id: number, data: object) => ipcRenderer.invoke('goals:folders:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('goals:folders:delete', id)
  },
  calendar: {
    eventsByMonth: (year: number, month: number) => ipcRenderer.invoke('calendar:events-by-month', year, month),
    createEvent: (data: object) => ipcRenderer.invoke('calendar:create-event', data),
    toggleDone: (id: number) => ipcRenderer.invoke('calendar:toggle-done', id),
    deleteEvent: (id: number) => ipcRenderer.invoke('calendar:delete-event', id),
    getNote: (date: string) => ipcRenderer.invoke('calendar:get-note', date),
    saveNote: (date: string, content: string) => ipcRenderer.invoke('calendar:save-note', date, content),
    notesByMonth: (year: number, month: number) => ipcRenderer.invoke('calendar:notes-by-month', year, month)
  },
  notifications: {
    getSettings: () => ipcRenderer.invoke('notifications:get-settings'),
    saveSettings: (s: { enabled: boolean; hour: number; minute: number }) =>
      ipcRenderer.invoke('notifications:save-settings', s),
    test: () => ipcRenderer.invoke('notifications:test')
  },
  journal: {
    get: (date: string) => ipcRenderer.invoke('journal:get', date),
    recent: (limit?: number) => ipcRenderer.invoke('journal:recent', limit),
    save: (data: { date: string; content: string; mood: number }) => ipcRenderer.invoke('journal:save', data),
    delete: (id: number) => ipcRenderer.invoke('journal:delete', id),
    byMonth: (year: number, month: number) => ipcRenderer.invoke('journal:by-month', year, month)
  },
  sleep: {
    get: (date: string) => ipcRenderer.invoke('sleep:get', date),
    recent: (limit?: number) => ipcRenderer.invoke('sleep:recent', limit),
    save: (data: { date: string; bedtime: string; wake_time: string; quality: number; notes?: string; cycles?: number | null }) =>
      ipcRenderer.invoke('sleep:save', data),
    delete: (id: number) => ipcRenderer.invoke('sleep:delete', id)
  },
  finance: {
    categories: {
      list: () => ipcRenderer.invoke('finance:categories:list'),
      create: (data: object) => ipcRenderer.invoke('finance:categories:create', data),
      delete: (id: number) => ipcRenderer.invoke('finance:categories:delete', id)
    },
    bills: {
      list: () => ipcRenderer.invoke('finance:bills:list'),
      create: (data: object) => ipcRenderer.invoke('finance:bills:create', data),
      delete: (id: number) => ipcRenderer.invoke('finance:bills:delete', id),
      toggleActive: (id: number) => ipcRenderer.invoke('finance:bills:toggle-active', id),
      generateMonth: (year: number, month: number) => ipcRenderer.invoke('finance:bills:generate-month', year, month)
    },
    accounts: {
      list: () => ipcRenderer.invoke('finance:accounts:list'),
      create: (data: object) => ipcRenderer.invoke('finance:accounts:create', data),
      delete: (id: number) => ipcRenderer.invoke('finance:accounts:delete', id)
    },
    transactions: {
      list: (year: number, month: number) => ipcRenderer.invoke('finance:transactions:list', year, month),
      create: (data: object) => ipcRenderer.invoke('finance:transactions:create', data),
      delete: (id: number) => ipcRenderer.invoke('finance:transactions:delete', id),
      updateStatus: (id: number, status: string) => ipcRenderer.invoke('finance:transactions:update-status', id, status),
      updateAmount: (id: number, amount: number) => ipcRenderer.invoke('finance:transactions:update-amount', id, amount)
    },
    summary: (year: number, month: number) => ipcRenderer.invoke('finance:summary', year, month),
    ofx: {
      import: (content: string, accountId?: number) => ipcRenderer.invoke('finance:ofx:import', content, accountId)
    },
    receipt: {
      parse: (base64: string, mimeType: string) => ipcRenderer.invoke('finance:receipt:parse', base64, mimeType)
    },
    backup: {
      check: () => ipcRenderer.invoke('finance:backup:check'),
      dismiss: () => ipcRenderer.invoke('finance:backup:dismiss')
    }
  },
  media: {
    list: () => ipcRenderer.invoke('media:list'),
    create: (data: object) => ipcRenderer.invoke('media:create', data),
    update: (id: number, data: object) => ipcRenderer.invoke('media:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('media:delete', id),
    logSession: (data: object) => ipcRenderer.invoke('media:log-session', data),
    todayMinutes: (date: string) => ipcRenderer.invoke('media:today-minutes', date),
    logs: (mediaId: number) => ipcRenderer.invoke('media:logs', mediaId)
  },
  focus: {
    logSession: (data: { date: string; duration_minutes: number; label?: string }) =>
      ipcRenderer.invoke('focus:log-session', data),
    todayStats: (date: string) => ipcRenderer.invoke('focus:today-stats', date),
    weekStats: (start: string, end: string) => ipcRenderer.invoke('focus:week-stats', start, end),
    streak: () => ipcRenderer.invoke('focus:streak'),
    history: (limit?: number) => ipcRenderer.invoke('focus:history', limit)
  },
  gymPrograms: {
    list: () => ipcRenderer.invoke('gym:programs:list'),
    create: (data: object) => ipcRenderer.invoke('gym:programs:create', data),
    delete: (id: number) => ipcRenderer.invoke('gym:programs:delete', id),
    update: (id: number, data: object) => ipcRenderer.invoke('gym:programs:update', id, data),
    exerciseHistory: (name: string) => ipcRenderer.invoke('gym:exercise-history', name),
    exerciseNames: () => ipcRenderer.invoke('gym:exercise-names')
  },
  gymPhases: {
    list: () => ipcRenderer.invoke('gym:phases:list'),
    create: (data: object) => ipcRenderer.invoke('gym:phases:create', data),
    update: (id: number, data: object) => ipcRenderer.invoke('gym:phases:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('gym:phases:delete', id)
  },
  app: {
    exportData: () => ipcRenderer.invoke('app:export-data'),
    importData: (json: string) => ipcRenderer.invoke('app:import-data', json),
    resetSection: (section: string) => ipcRenderer.invoke('app:reset-section', section),
    exportExcel: (year: number, month: number) => ipcRenderer.invoke('app:export-excel', year, month)
  },
  demo: {
    open: () => ipcRenderer.invoke('demo:open')
  },
  db: {
    setUser: (userId: string | null) => ipcRenderer.invoke('db:set-user', userId)
  }
}

// ── Demo mock data ────────────────────────────────────────────────────────────
function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

function buildDemoApi() {
  const today = daysAgo(0)

  const demoProfile = {
    id: 1, name: 'Maria Silva', total_xp: 3240, level: 5,
    levelInfo: {
      current: { level: 5, rank: 'Exemplar', xp: 1500 },
      next: { level: 6, rank: 'Imparável', xp: 3000 }
    },
    history: [
      { id: 1, amount: 30, reason: 'Hábito: Exercitar', created_at: today },
      { id: 2, amount: 15, reason: 'Hábito: Meditar', created_at: today },
      { id: 3, amount: 20, reason: 'Hábito: Ler 30 min', created_at: daysAgo(1) },
      { id: 4, amount: 25, reason: 'Meta concluída: Economizar', created_at: daysAgo(2) },
      { id: 5, amount: 10, reason: 'Hábito: Beber água', created_at: daysAgo(2) },
    ]
  }

  const demoHabits = [
    { id: 1, name: 'Meditar', icon: '🧘', color: '#7c3aed', xp_reward: 15, frequency: 'daily', is_active: 1, created_at: '2026-01-15' },
    { id: 2, name: 'Ler 30 min', icon: '📚', color: '#3b82f6', xp_reward: 20, frequency: 'daily', is_active: 1, created_at: '2026-01-15' },
    { id: 3, name: 'Beber 2L de água', icon: '💧', color: '#06b6d4', xp_reward: 10, frequency: 'daily', is_active: 1, created_at: '2026-02-01' },
    { id: 4, name: 'Exercitar', icon: '🏃', color: '#10b981', xp_reward: 30, frequency: 'daily', is_active: 1, created_at: '2026-02-01' },
    { id: 5, name: 'Dormir 8h', icon: '😴', color: '#f59e0b', xp_reward: 25, frequency: 'daily', is_active: 1, created_at: '2026-03-01' },
  ]

  const completionPattern: Record<number, number[]> = {
    0: [1, 3, 4], 1: [1, 2, 3, 4, 5], 2: [1, 2, 3, 4],
    3: [1, 2, 4, 5], 4: [1, 3, 5], 5: [2, 3, 4], 6: [1, 2, 3],
  }
  const demoCompletions: Array<{ id: number; habit_id: number; completed_at: string }> = []
  let cid = 1
  for (const [day, hids] of Object.entries(completionPattern)) {
    const date = daysAgo(Number(day))
    for (const hid of hids) demoCompletions.push({ id: cid++, habit_id: hid, completed_at: date })
  }

  const demoStreaks: Record<number, number> = { 1: 7, 2: 14, 3: 7, 4: 7, 5: 5 }

  const demoAddictions = [
    {
      id: 1, name: 'Cigarro', started_free_at: '2026-03-15T08:00:00.000Z',
      is_active: 1, is_hidden_name: 0,
      relapses: []
    },
    {
      id: 2, name: 'Redes Sociais em excesso', started_free_at: '2026-05-01T10:30:00.000Z',
      is_active: 1, is_hidden_name: 0,
      relapses: [
        { id: 1, addiction_id: 2, relapsed_at: '2026-04-10T21:00:00.000Z', note: 'Noite difícil' }
      ]
    },
  ]

  const demoGoals = [
    {
      id: 1, title: 'Aprender inglês', description: 'Estudar 30 min por dia',
      target_date: '2026-12-31', xp_reward: 200, is_completed: 0, folder_id: null, created_at: '2026-01-01',
      tasks: [
        { id: 1, goal_id: 1, title: 'Baixar o Duolingo', is_completed: 1 },
        { id: 2, goal_id: 1, title: 'Fazer 30 dias seguidos no app', is_completed: 1 },
        { id: 3, goal_id: 1, title: 'Assistir série sem legendas em PT', is_completed: 0 },
        { id: 4, goal_id: 1, title: 'Fazer aula de conversação', is_completed: 0 },
      ]
    },
    {
      id: 2, title: 'Economizar R$ 5.000', description: 'Guardar dinheiro para viagem',
      target_date: '2026-09-30', xp_reward: 300, is_completed: 0, folder_id: null, created_at: '2026-02-01',
      tasks: [
        { id: 5, goal_id: 2, title: 'Criar planilha de gastos', is_completed: 1 },
        { id: 6, goal_id: 2, title: 'Cortar gastos desnecessários', is_completed: 1 },
        { id: 7, goal_id: 2, title: 'Atingir R$ 2.000 guardados', is_completed: 1 },
        { id: 8, goal_id: 2, title: 'Atingir R$ 5.000 guardados', is_completed: 0 },
      ]
    },
    {
      id: 3, title: 'Correr 5km sem parar', description: 'Treinar progressivamente',
      target_date: daysAgo(-4), xp_reward: 150, is_completed: 0, folder_id: null, created_at: '2026-04-01',
      tasks: [
        { id: 9, goal_id: 3, title: 'Correr 1km', is_completed: 1 },
        { id: 10, goal_id: 3, title: 'Correr 2km', is_completed: 1 },
        { id: 11, goal_id: 3, title: 'Correr 3km', is_completed: 0 },
        { id: 12, goal_id: 3, title: 'Correr 5km', is_completed: 0 },
      ]
    }
  ]

  const demoGymWorkouts = [
    {
      id: 1, date: daysAgo(1), name: 'Treino A — Peito e Tríceps', duration_min: 60, notes: 'Bom treino!',
      exercises: [
        { id: 1, name: 'Supino Reto', sets: 4, reps: 10, weight_kg: 60 },
        { id: 2, name: 'Crucifixo', sets: 3, reps: 12, weight_kg: 16 },
        { id: 3, name: 'Tríceps Corda', sets: 3, reps: 15, weight_kg: 25 },
      ]
    },
    {
      id: 2, date: daysAgo(3), name: 'Treino B — Costas e Bíceps', duration_min: 55, notes: '',
      exercises: [
        { id: 4, name: 'Puxada Frontal', sets: 4, reps: 10, weight_kg: 55 },
        { id: 5, name: 'Remada Curvada', sets: 3, reps: 12, weight_kg: 50 },
        { id: 6, name: 'Rosca Direta', sets: 3, reps: 15, weight_kg: 20 },
      ]
    },
    {
      id: 3, date: daysAgo(5), name: 'Treino C — Pernas', duration_min: 70, notes: 'Pesado mas valeu!',
      exercises: [
        { id: 7, name: 'Agachamento', sets: 4, reps: 8, weight_kg: 80 },
        { id: 8, name: 'Leg Press', sets: 3, reps: 12, weight_kg: 120 },
        { id: 9, name: 'Cadeira Extensora', sets: 3, reps: 15, weight_kg: 40 },
      ]
    },
  ]

  const demoBioimpedance = [
    { id: 1, date: daysAgo(30), weight_kg: 72.5, body_fat_pct: 22, muscle_mass_kg: 52, bmr_kcal: 1650 },
    { id: 2, date: daysAgo(15), weight_kg: 71.8, body_fat_pct: 21, muscle_mass_kg: 52.8, bmr_kcal: 1660 },
    { id: 3, date: daysAgo(1), weight_kg: 71.2, body_fat_pct: 20.5, muscle_mass_kg: 53.1, bmr_kcal: 1665 },
  ]

  const demoJournalEntries = [
    { id: 1, date: today, content: 'Hoje foi um dia produtivo! Completei minha rotina de exercícios e ainda tive tempo para ler um pouco. Me sinto bem encaminhada com meus objetivos.', mood: 4, created_at: today },
    { id: 2, date: daysAgo(1), content: 'Dia intenso no trabalho mas consegui manter meus hábitos. A consistência está valendo a pena.', mood: 3, created_at: daysAgo(1) },
    { id: 3, date: daysAgo(2), content: 'Excelente treino hoje! Quebrando recordes pessoais. Muito feliz com o progresso.', mood: 5, created_at: daysAgo(2) },
    { id: 4, date: daysAgo(5), content: 'Dia difícil, mas não desisti dos meus hábitos. Isso já é uma vitória.', mood: 3, created_at: daysAgo(5) },
  ]

  const demoSleepLogs = [
    { id: 1, date: today, bedtime: '22:30', wake_time: '06:30', quality: 4, notes: '', duration_h: 8 },
    { id: 2, date: daysAgo(1), bedtime: '23:00', wake_time: '07:00', quality: 4, notes: '', duration_h: 8 },
    { id: 3, date: daysAgo(2), bedtime: '22:00', wake_time: '06:15', quality: 5, notes: 'Dormi muito bem!', duration_h: 8.25 },
    { id: 4, date: daysAgo(3), bedtime: '23:30', wake_time: '07:30', quality: 3, notes: '', duration_h: 8 },
    { id: 5, date: daysAgo(4), bedtime: '00:00', wake_time: '07:00', quality: 2, notes: 'Demorei para pegar no sono', duration_h: 7 },
    { id: 6, date: daysAgo(5), bedtime: '22:45', wake_time: '06:45', quality: 5, notes: '', duration_h: 8 },
    { id: 7, date: daysAgo(6), bedtime: '22:30', wake_time: '06:30', quality: 4, notes: '', duration_h: 8 },
  ]

  const demoFinanceCategories = [
    { id: 1, name: 'Alimentação', type: 'expense', icon: '🍔', color: '#f97316' },
    { id: 2, name: 'Transporte', type: 'expense', icon: '🚗', color: '#3b82f6' },
    { id: 3, name: 'Salário', type: 'income', icon: '💼', color: '#10b981' },
    { id: 4, name: 'Lazer', type: 'expense', icon: '🎮', color: '#ec4899' },
    { id: 5, name: 'Saúde', type: 'expense', icon: '🏥', color: '#ef4444' },
    { id: 6, name: 'Moradia', type: 'expense', icon: '🏠', color: '#7c3aed' },
    { id: 7, name: 'Freelance', type: 'income', icon: '💻', color: '#06b6d4' },
  ]

  const demoFinanceAccounts = [
    { id: 1, name: 'Conta Principal', bank: 'Nubank', icon: '💜', color: '#7c3aed' },
    { id: 2, name: 'Poupança', bank: 'Caixa', icon: '🐷', color: '#10b981' },
  ]

  const demoFinanceBills = [
    { id: 1, name: 'Aluguel', amount: 1200, due_day: 5, recurrence: 'monthly', is_active: 1, category_id: 6, type: 'expense', icon: '🏠' },
    { id: 2, name: 'Internet', amount: 120, due_day: 10, recurrence: 'monthly', is_active: 1, category_id: 6, type: 'expense', icon: '🌐' },
    { id: 3, name: 'Academia', amount: 100, due_day: 15, recurrence: 'monthly', is_active: 1, category_id: 5, type: 'expense', icon: '🏋️' },
    { id: 4, name: 'Spotify', amount: 22.90, due_day: 20, recurrence: 'monthly', is_active: 1, category_id: 4, type: 'expense', icon: '🎵' },
    { id: 5, name: 'Salário', amount: 5000, due_day: 1, recurrence: 'monthly', is_active: 1, category_id: 3, type: 'income', icon: '💼' },
  ]

  const yy = new Date().getFullYear()
  const mm = String(new Date().getMonth() + 1).padStart(2, '0')

  const demoTransactions = [
    { id: 1, date: `${yy}-${mm}-01`, amount: 5000, description: 'Salário', type: 'income', category_id: 3, status: 'done', account_id: 1, bill_id: null },
    { id: 2, date: `${yy}-${mm}-03`, amount: 185.50, description: 'Mercado', type: 'expense', category_id: 1, status: 'done', account_id: 1, bill_id: null },
    { id: 3, date: `${yy}-${mm}-05`, amount: 1200, description: 'Aluguel', type: 'expense', category_id: 6, status: 'done', account_id: 1, bill_id: 1 },
    { id: 4, date: `${yy}-${mm}-06`, amount: 45.80, description: 'Farmácia', type: 'expense', category_id: 5, status: 'done', account_id: 1, bill_id: null },
    { id: 5, date: `${yy}-${mm}-07`, amount: 32, description: 'Uber', type: 'expense', category_id: 2, status: 'done', account_id: 1, bill_id: null },
    { id: 6, date: `${yy}-${mm}-08`, amount: 800, description: 'Projeto freelance', type: 'income', category_id: 7, status: 'done', account_id: 1, bill_id: null },
    { id: 7, date: `${yy}-${mm}-09`, amount: 78.90, description: 'Restaurante', type: 'expense', category_id: 1, status: 'done', account_id: 1, bill_id: null },
    { id: 8, date: `${yy}-${mm}-10`, amount: 120, description: 'Internet', type: 'expense', category_id: 6, status: 'done', account_id: 1, bill_id: 2 },
    { id: 9, date: `${yy}-${mm}-11`, amount: 55, description: 'Cinema', type: 'expense', category_id: 4, status: 'done', account_id: 1, bill_id: null },
  ]

  const demoMediaItems = [
    { id: 1, title: 'Atomic Habits', type: 'book', total_pages: 320, current_page: 247, status: 'reading', rating: null, notes: 'Muito bom!', started_at: daysAgo(22) },
    { id: 2, title: 'The Last of Us', type: 'show', total_seasons: 2, current_season: 2, current_episode: 4, total_episodes: 7, status: 'watching', rating: 5, notes: '', started_at: daysAgo(10) },
    { id: 3, title: 'Sapiens', type: 'book', total_pages: 460, current_page: 460, status: 'completed', rating: 5, notes: 'Incrível!', started_at: daysAgo(60) },
    { id: 4, title: 'O Poder do Hábito', type: 'book', total_pages: 350, current_page: 0, status: 'want_to_read', rating: null, notes: '', started_at: null },
  ]

  const demoAchievements = [
    { key: 'first_habit', name: 'Primeiro Hábito', description: 'Criou seu primeiro hábito', icon: '🌟', unlocked_at: daysAgo(145) },
    { key: 'week_streak', name: 'Uma Semana Forte', description: '7 dias seguidos completando hábitos', icon: '🔥', unlocked_at: daysAgo(139) },
    { key: 'first_workout', name: 'Atleta Iniciante', description: 'Registrou seu primeiro treino', icon: '💪', unlocked_at: daysAgo(130) },
    { key: 'first_journal', name: 'Escritor(a)', description: 'Escreveu sua primeira entrada no diário', icon: '📝', unlocked_at: daysAgo(125) },
    { key: 'sobriety_30', name: 'Um Mês Livre', description: '30 dias sem recaída', icon: '🛡️', unlocked_at: daysAgo(57) },
    { key: 'xp_1000', name: 'Mil Pontos!', description: 'Acumulou 1000 XP', icon: '⭐', unlocked_at: daysAgo(100) },
  ]

  const demoCalendarEvents = [
    { id: 1, date: today, title: 'Consulta médica', type: 'health', color: '#ef4444', is_done: 0 },
    { id: 2, date: daysAgo(-2), title: 'Reunião de trabalho', type: 'work', color: '#3b82f6', is_done: 0 },
    { id: 3, date: daysAgo(-5), title: 'Aniversário da Ana', type: 'personal', color: '#ec4899', is_done: 0 },
    { id: 4, date: daysAgo(1), title: 'Dentista', type: 'health', color: '#ef4444', is_done: 1 },
  ]

  return {
    profile: {
      get: async () => demoProfile,
      updateName: async () => true,
      grantXP: async () => ({ total_xp: demoProfile.total_xp, levelInfo: demoProfile.levelInfo }),
    },
    achievements: {
      list: async () => demoAchievements,
      check: async () => [],
    },
    habits: {
      list: async () => demoHabits,
      dueToday: async () => demoHabits,
      create: async () => ({ id: 99 }),
      update: async () => {},
      delete: async () => {},
      toggleActive: async () => {},
      complete: async () => {},
      uncomplete: async () => {},
      completions: async (habitId: number) => demoCompletions.filter(c => c.habit_id === habitId),
      completionsRange: async () => demoCompletions,
      completionsByMonth: async () => demoCompletions,
      streak: async (habitId: number) => demoStreaks[habitId] ?? 1,
    },
    gym: {
      listWorkouts: async () => demoGymWorkouts,
      createWorkout: async () => ({ id: 99 }),
      deleteWorkout: async () => {},
      listBioimpedance: async () => demoBioimpedance,
      addBioimpedance: async () => ({ id: 99 }),
      deleteBioimpedance: async () => {},
    },
    addictions: {
      list: async () => demoAddictions,
      create: async () => ({ id: 99 }),
      relapse: async () => {},
      delete: async () => {},
      toggleHidden: async () => {},
      checkMilestones: async () => [],
    },
    goals: {
      list: async () => demoGoals,
      create: async () => ({ id: 99 }),
      update: async () => {},
      delete: async () => {},
      addTask: async () => ({ id: 99, title: '', is_completed: 0 }),
      completeTask: async () => {},
      deleteTask: async () => {},
      updateTask: async () => {},
      complete: async () => {},
    },
    goalFolders: {
      list: async () => [],
      create: async () => ({ id: 99 }),
      update: async () => {},
      delete: async () => {},
    },
    calendar: {
      eventsByMonth: async () => demoCalendarEvents,
      createEvent: async () => ({ id: 99 }),
      toggleDone: async () => {},
      deleteEvent: async () => {},
      getNote: async () => null,
      saveNote: async () => {},
      notesByMonth: async () => [],
    },
    notifications: {
      getSettings: async () => ({ enabled: true, hour: 20, minute: 0 }),
      saveSettings: async () => {},
      test: async () => ({ sent: false }),
    },
    journal: {
      get: async (date: string) => demoJournalEntries.find(e => e.date === date) ?? null,
      recent: async () => demoJournalEntries,
      save: async () => {},
      delete: async () => {},
      byMonth: async () => demoJournalEntries,
    },
    sleep: {
      get: async (date: string) => demoSleepLogs.find(s => s.date === date) ?? null,
      recent: async () => demoSleepLogs,
      save: async () => {},
      delete: async () => {},
    },
    finance: {
      categories: {
        list: async () => demoFinanceCategories,
        create: async () => ({ id: 99 }),
        delete: async () => {},
      },
      bills: {
        list: async () => demoFinanceBills,
        create: async () => ({ id: 99 }),
        delete: async () => {},
        toggleActive: async () => {},
        generateMonth: async () => [],
      },
      accounts: {
        list: async () => demoFinanceAccounts,
        create: async () => ({ id: 99 }),
        delete: async () => {},
      },
      transactions: {
        list: async () => demoTransactions,
        create: async () => ({ id: 99 }),
        delete: async () => {},
        updateStatus: async () => {},
        updateAmount: async () => {},
      },
      summary: async () => ({
        paidIncome: 5800, pendingIncome: 0,
        paidExpense: 1717.20, pendingExpense: 242.90,
        income: 5800, expense: 1960.10,
        balance: 3839.90, currentBalance: 4082.80, projectedBalance: 3839.90,
        nextMonthIncome: 5000, nextMonthExpense: 1442.90, nextMonthBalance: 3557.10
      }),
      ofx: { import: async () => ({ imported: 0, skipped: 0 }) },
      receipt: { parse: async () => null },
      backup: { check: async () => ({ shouldRemind: false }), dismiss: async () => {} },
    },
    media: {
      list: async () => demoMediaItems,
      create: async () => ({ id: 99 }),
      update: async () => {},
      delete: async () => {},
      logSession: async () => {},
      todayMinutes: async () => 45,
      logs: async () => [],
    },
    focus: {
      logSession: async () => ({ xp: 25 }),
      todayStats: async () => ({ sessions: 2, minutes: 50 }),
      weekStats: async () => ({ sessions: 6, minutes: 150 }),
      streak: async () => 3,
      history: async () => [],
    },
    gymPrograms: {
      list: async () => [],
      create: async () => ({ id: 99 }),
      delete: async () => {},
      update: async () => {},
      exerciseHistory: async () => [],
      exerciseNames: async () => [],
    },
    gymPhases: {
      list: async () => [],
      create: async () => ({ id: 99 }),
      update: async () => {},
      delete: async () => {},
    },
    app: {
      exportData: async () => JSON.stringify({ demo: true }),
      importData: async () => {},
      resetSection: async () => {},
      exportExcel: async () => ({ success: false }),
    },
    demo: {
      open: async () => {},
    },
    db: {
      setUser: async () => {},
    },
  }
}

// ── Expose ────────────────────────────────────────────────────────────────────
const api = isDemo ? buildDemoApi() : realApi

// Exposed as electronApi so the renderer can freely set window.api to Supabase
contextBridge.exposeInMainWorld('electronApi', api)
if (isDemo) contextBridge.exposeInMainWorld('__demoMode__', true)

// Bridge for tray navigation
contextBridge.exposeInMainWorld('electronNav', {
  onNavigate: (cb: (path: string, action?: string) => void) => {
    const handler = (_: unknown, path: string, action?: string) => cb(path, action)
    ipcRenderer.on('tray:navigate', handler)
    return () => { ipcRenderer.removeListener('tray:navigate', handler) }
  }
})

// Bridge for Google OAuth deep link callback (habitos://auth/callback?code=...)
contextBridge.exposeInMainWorld('electronAuth', {
  openOAuthBrowser: (oauthUrl: string, port: number): Promise<string | null> =>
    ipcRenderer.invoke('auth:open-oauth-browser', oauthUrl, port),
  onDeepLink: (cb: (url: string) => void) => {
    const handler = (_: unknown, url: string) => cb(url)
    ipcRenderer.on('auth:deeplink', handler)
    return () => { ipcRenderer.removeListener('auth:deeplink', handler) }
  }
})

declare global {
  interface Window {
    electronApi?: typeof realApi
    __demoMode__?: boolean
    electronAuth?: {
      openOAuthBrowser: (oauthUrl: string, port: number) => Promise<string | null>
      onDeepLink: (cb: (url: string) => void) => () => void
    }
    electronNav?: {
      onNavigate: (cb: (path: string, action?: string) => void) => () => void
    }
  }
}
