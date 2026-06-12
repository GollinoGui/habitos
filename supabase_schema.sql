-- ============================================================
-- Hábitos — Schema Supabase
-- Execute este arquivo no SQL Editor do Supabase
-- ============================================================

-- ── Perfil e XP ──────────────────────────────────────────────

create table if not exists user_profile (
  id           bigserial primary key,
  user_id      uuid references auth.users(id) on delete cascade not null unique,
  name         text not null default '',
  total_xp     integer not null default 0,
  level        integer not null default 1,
  created_at   timestamptz default now()
);
alter table user_profile enable row level security;
create policy "own profile" on user_profile for all using (auth.uid() = user_id);

-- Cria perfil automaticamente ao cadastrar
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.user_profile (user_id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table if not exists xp_history (
  id         bigserial primary key,
  user_id    uuid references auth.users(id) on delete cascade not null,
  amount     integer not null,
  reason     text not null,
  created_at timestamptz default now()
);
alter table xp_history enable row level security;
create policy "own xp_history" on xp_history for all using (auth.uid() = user_id);

create table if not exists achievements (
  id          bigserial primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  key         text not null,
  name        text not null,
  description text not null default '',
  icon        text not null default '🏆',
  unlocked_at timestamptz default now(),
  unique (user_id, key)
);
alter table achievements enable row level security;
create policy "own achievements" on achievements for all using (auth.uid() = user_id);

-- ── Hábitos ──────────────────────────────────────────────────

create table if not exists habits (
  id          bigserial primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  description text default '',
  frequency   text not null default 'daily',
  target_time text,
  xp_reward   integer not null default 10,
  color       text not null default '#7c3aed',
  icon        text not null default '✅',
  is_active   boolean not null default true,
  created_at  timestamptz default now()
);
alter table habits enable row level security;
create policy "own habits" on habits for all using (auth.uid() = user_id);

create table if not exists habit_completions (
  id           bigserial primary key,
  user_id      uuid references auth.users(id) on delete cascade not null,
  habit_id     bigint references habits(id) on delete cascade not null,
  completed_at date not null,
  unique (user_id, habit_id, completed_at)
);
alter table habit_completions enable row level security;
create policy "own habit_completions" on habit_completions for all using (auth.uid() = user_id);

-- ── Academia ─────────────────────────────────────────────────

create table if not exists workouts (
  id           bigserial primary key,
  user_id      uuid references auth.users(id) on delete cascade not null,
  date         date not null,
  name         text not null,
  notes        text default '',
  duration_min integer,
  created_at   timestamptz default now()
);
alter table workouts enable row level security;
create policy "own workouts" on workouts for all using (auth.uid() = user_id);

create table if not exists exercises (
  id          bigserial primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  workout_id  bigint references workouts(id) on delete cascade not null,
  name        text not null,
  sets        integer,
  reps        integer,
  weight_kg   numeric,
  is_superset boolean default false
);
alter table exercises enable row level security;
create policy "own exercises" on exercises for all using (auth.uid() = user_id);

create table if not exists bioimpedance (
  id              bigserial primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  date            date not null,
  weight_kg       numeric,
  body_fat_pct    numeric,
  muscle_mass_kg  numeric,
  bmr_kcal        integer,
  created_at      timestamptz default now(),
  unique (user_id, date)
);
alter table bioimpedance enable row level security;
create policy "own bioimpedance" on bioimpedance for all using (auth.uid() = user_id);

create table if not exists workout_programs (
  id          bigserial primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  description text default '',
  created_at  timestamptz default now()
);
alter table workout_programs enable row level security;
create policy "own workout_programs" on workout_programs for all using (auth.uid() = user_id);

create table if not exists program_days (
  id         bigserial primary key,
  user_id    uuid references auth.users(id) on delete cascade not null,
  program_id bigint references workout_programs(id) on delete cascade not null,
  name       text not null,
  day_order  integer not null default 0
);
alter table program_days enable row level security;
create policy "own program_days" on program_days for all using (auth.uid() = user_id);

create table if not exists program_exercises (
  id              bigserial primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  day_id          bigint references program_days(id) on delete cascade not null,
  name            text not null,
  sets            integer,
  reps            integer,
  weight_kg       numeric,
  notes           text,
  exercise_order  integer not null default 0
);
alter table program_exercises enable row level security;
create policy "own program_exercises" on program_exercises for all using (auth.uid() = user_id);

-- ── Vícios ───────────────────────────────────────────────────

create table if not exists addictions (
  id              bigserial primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  name            text not null,
  started_free_at timestamptz not null,
  is_active       boolean not null default true,
  is_hidden_name  boolean not null default false,
  created_at      timestamptz default now()
);
alter table addictions enable row level security;
create policy "own addictions" on addictions for all using (auth.uid() = user_id);

create table if not exists addiction_relapses (
  id           bigserial primary key,
  user_id      uuid references auth.users(id) on delete cascade not null,
  addiction_id bigint references addictions(id) on delete cascade not null,
  relapsed_at  timestamptz not null,
  note         text default ''
);
alter table addiction_relapses enable row level security;
create policy "own addiction_relapses" on addiction_relapses for all using (auth.uid() = user_id);

-- ── Metas ────────────────────────────────────────────────────

create table if not exists goal_folders (
  id      bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name    text not null,
  icon    text default '📁',
  color   text default '#7c3aed'
);
alter table goal_folders enable row level security;
create policy "own goal_folders" on goal_folders for all using (auth.uid() = user_id);

create table if not exists goals (
  id           bigserial primary key,
  user_id      uuid references auth.users(id) on delete cascade not null,
  title        text not null,
  description  text default '',
  target_date  date,
  xp_reward    integer default 100,
  is_completed boolean not null default false,
  folder_id    bigint references goal_folders(id) on delete set null,
  created_at   timestamptz default now()
);
alter table goals enable row level security;
create policy "own goals" on goals for all using (auth.uid() = user_id);

create table if not exists goal_tasks (
  id           bigserial primary key,
  user_id      uuid references auth.users(id) on delete cascade not null,
  goal_id      bigint references goals(id) on delete cascade not null,
  title        text not null,
  is_completed boolean not null default false
);
alter table goal_tasks enable row level security;
create policy "own goal_tasks" on goal_tasks for all using (auth.uid() = user_id);

-- ── Calendário ───────────────────────────────────────────────

create table if not exists calendar_events (
  id      bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title   text not null,
  date    date not null,
  type    text default 'personal',
  color   text default '#7c3aed',
  is_done boolean not null default false
);
alter table calendar_events enable row level security;
create policy "own calendar_events" on calendar_events for all using (auth.uid() = user_id);

create table if not exists calendar_notes (
  id         bigserial primary key,
  user_id    uuid references auth.users(id) on delete cascade not null,
  date       date not null,
  content    text not null,
  updated_at timestamptz default now(),
  unique (user_id, date)
);
alter table calendar_notes enable row level security;
create policy "own calendar_notes" on calendar_notes for all using (auth.uid() = user_id);

-- ── Diário ───────────────────────────────────────────────────

create table if not exists journal_entries (
  id         bigserial primary key,
  user_id    uuid references auth.users(id) on delete cascade not null,
  date       date not null,
  content    text not null,
  mood       integer not null default 3,
  created_at timestamptz default now(),
  unique (user_id, date)
);
alter table journal_entries enable row level security;
create policy "own journal_entries" on journal_entries for all using (auth.uid() = user_id);

-- ── Sono ─────────────────────────────────────────────────────

create table if not exists sleep_logs (
  id         bigserial primary key,
  user_id    uuid references auth.users(id) on delete cascade not null,
  date       date not null,
  bedtime    text not null,
  wake_time  text not null,
  quality    integer not null default 3,
  notes      text default '',
  created_at timestamptz default now(),
  unique (user_id, date)
);
alter table sleep_logs enable row level security;
create policy "own sleep_logs" on sleep_logs for all using (auth.uid() = user_id);

-- ── Finanças ─────────────────────────────────────────────────

create table if not exists finance_categories (
  id      bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name    text not null,
  type    text not null default 'expense',
  icon    text default '📦',
  color   text default '#7c3aed'
);
alter table finance_categories enable row level security;
create policy "own finance_categories" on finance_categories for all using (auth.uid() = user_id);

create table if not exists finance_accounts (
  id      bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name    text not null,
  bank    text default '',
  icon    text default '🏦',
  color   text default '#7c3aed'
);
alter table finance_accounts enable row level security;
create policy "own finance_accounts" on finance_accounts for all using (auth.uid() = user_id);

create table if not exists finance_bills (
  id          bigserial primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  amount      numeric not null,
  due_day     integer not null,
  due_month   integer,
  category_id bigint references finance_categories(id) on delete set null,
  type        text not null default 'expense',
  recurrence  text not null default 'monthly',
  is_active   boolean not null default true,
  icon        text default '📄'
);
alter table finance_bills enable row level security;
create policy "own finance_bills" on finance_bills for all using (auth.uid() = user_id);

create table if not exists finance_transactions (
  id          bigserial primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  date        date not null,
  amount      numeric not null,
  description text not null,
  category_id bigint references finance_categories(id) on delete set null,
  type        text not null default 'expense',
  status      text not null default 'pending',
  bill_id     bigint references finance_bills(id) on delete set null,
  account_id  bigint references finance_accounts(id) on delete set null,
  created_at  timestamptz default now()
);
alter table finance_transactions enable row level security;
create policy "own finance_transactions" on finance_transactions for all using (auth.uid() = user_id);

-- ── Leitura / Mídia ──────────────────────────────────────────

create table if not exists media_items (
  id              bigserial primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  title           text not null,
  type            text not null default 'book',
  author          text default '',
  total_pages     integer,
  total_seasons   integer,
  current_page    integer default 0,
  current_season  integer default 1,
  current_episode integer default 0,
  total_episodes  integer,
  status          text not null default 'want_to_read',
  started_at      date,
  finished_at     date,
  rating          integer,
  cover_emoji     text default '📚',
  notes           text default '',
  created_at      timestamptz default now()
);
alter table media_items enable row level security;
create policy "own media_items" on media_items for all using (auth.uid() = user_id);

create table if not exists media_logs (
  id           bigserial primary key,
  user_id      uuid references auth.users(id) on delete cascade not null,
  media_id     bigint references media_items(id) on delete cascade not null,
  date         date not null,
  minutes_read integer default 0,
  pages_read   integer default 0
);
alter table media_logs enable row level security;
create policy "own media_logs" on media_logs for all using (auth.uid() = user_id);

-- ── Configurações de notificação ─────────────────────────────

create table if not exists notification_settings (
  id      bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  enabled boolean not null default false,
  hour    integer not null default 20,
  minute  integer not null default 0
);
alter table notification_settings enable row level security;
create policy "own notification_settings" on notification_settings for all using (auth.uid() = user_id);
