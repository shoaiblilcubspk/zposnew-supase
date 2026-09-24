-- 0018_staff_permissions.sql
-- Persist per-user privileges. staff_users only had role + can_view_expiry + require_pin_on_sale,
-- so the "New Staff" privilege toggles (Price Override, Manage Products, Void/Delete, Issue
-- Discounts, Inventory Adjust, PO, Transaction Records, Edit Completed Sales, View Profit) were
-- never saved, synced, or enforced. A single `permissions` jsonb holds the full per-user map so
-- it persists, syncs to every device (staff_users is pulled), and drives enforcement. Additive;
-- existing users default to '{}' and fall back to role defaults, so nobody is locked out.

alter table public.staff_users add column if not exists permissions jsonb not null default '{}';
