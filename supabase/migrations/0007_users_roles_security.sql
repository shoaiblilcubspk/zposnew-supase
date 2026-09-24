-- =============================================================================
-- 0007_users_roles_security.sql  —  Phase 7: Auth Rebuild (Section 6)
--   Simple username/password staff accounts. NO license keys, NO P2P pairing.
--   roles       : non-additive config
--   staff_users : non-additive; password_hash ONLY (PBKDF2 "salt:hash:fallback"),
--                 never plaintext. Seeded default admin/admin (a normal, editable row).
--   audit_logs  : APPEND-ONLY tamper-evident trail.
-- =============================================================================

-- ---- roles ----
create table if not exists public.roles (
  id           uuid primary key,
  operation_id uuid not null unique,
  code         text not null unique,
  name         text not null,
  permissions  text not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
drop trigger if exists trg_roles_updated_at on public.roles;
create trigger trg_roles_updated_at before insert or update on public.roles
  for each row execute function public.set_updated_at();

insert into public.roles (id, operation_id, code, name, permissions, created_at, updated_at) values
  ('22222222-2222-4222-8222-000000000001','22222222-2222-4222-8222-a00000000001','admin','Administrator','{"all":true}',now(),now()),
  ('22222222-2222-4222-8222-000000000002','22222222-2222-4222-8222-a00000000002','manager','Manager','{"sales":true,"inventory":true,"reports":true,"expenses":true,"customers":true}',now(),now()),
  ('22222222-2222-4222-8222-000000000003','22222222-2222-4222-8222-a00000000003','cashier','Cashier','{"sales":true,"customers":true}',now(),now()),
  ('22222222-2222-4222-8222-000000000004','22222222-2222-4222-8222-a00000000004','salesman','Salesman','{"sales":true}',now(),now())
on conflict (id) do nothing;

-- ---- staff_users ----
create table if not exists public.staff_users (
  id                  uuid primary key,
  operation_id        uuid not null unique,
  username            text not null unique,
  password_hash       text not null,
  role                text not null default 'cashier',
  full_name           text,
  email               text,
  avatar              text,
  is_active           integer not null default 1,
  can_view_expiry     integer not null default 1,
  require_pin_on_sale integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_staff_users_username on public.staff_users(username);
drop trigger if exists trg_staff_users_updated_at on public.staff_users;
create trigger trg_staff_users_updated_at before insert or update on public.staff_users
  for each row execute function public.set_updated_at();

-- Default admin (Section 6.1): username 'admin', password 'admin'.
-- Hash = PBKDF2-SHA256(100k, 32B) "salt:hash:fallback" — compatible with pinCrypto.ts.
-- This is a NORMAL, editable/deletable row (not hardcoded in app logic).
insert into public.staff_users (
  id, operation_id, username, password_hash, role, full_name,
  is_active, can_view_expiry, require_pin_on_sale, created_at, updated_at
) values (
  '33333333-3333-4333-8333-000000000001',
  '33333333-3333-4333-8333-a00000000001',
  'admin',
  '0123456789abcdef0123456789abcdef:ff4c24ac0f96496324ebdf9cc8cb881671120fae0bd19b6a3d5169c93c7c4983:bb70727b9b05956cf567bb836398104206ff7b6bfc768c3292e180a80b374390',
  'admin',
  'Administrator',
  1, 1, 0, now(), now()
) on conflict (id) do nothing;

-- ---- audit_logs (APPEND-ONLY) ----
create table if not exists public.audit_logs (
  id           uuid primary key,
  operation_id uuid not null unique,
  user_id      uuid,
  device_id    text,
  action       text not null,
  entity_type  text,
  entity_id    uuid,
  details      text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_audit_logs_created on public.audit_logs(created_at);
