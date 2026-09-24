-- =============================================================================
-- 0006_expenses.sql  —  Phase 6: Expenses + Expense Categories (non-additive).
-- =============================================================================

create table if not exists public.expense_categories (
  id           uuid primary key,
  operation_id uuid not null unique,
  name         text not null unique,
  active       integer not null default 1,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
drop trigger if exists trg_expense_categories_updated_at on public.expense_categories;
create trigger trg_expense_categories_updated_at before insert or update on public.expense_categories
  for each row execute function public.set_updated_at();

create table if not exists public.expenses (
  id           uuid primary key,
  operation_id uuid not null unique,
  title        text not null,
  category     text not null,
  amount       numeric not null,
  payment_mode text,
  store_type   text default 'retail',
  notes        text,
  user_id      uuid,
  device_id    text,
  spent_at     timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_expenses_spent_at on public.expenses(spent_at);
drop trigger if exists trg_expenses_updated_at on public.expenses;
create trigger trg_expenses_updated_at before insert or update on public.expenses
  for each row execute function public.set_updated_at();
