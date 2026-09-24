-- 0019_staff_permissions_text.sql
-- Store staff_users.permissions as TEXT (JSON string), not jsonb. The local SQLite mirror keeps
-- this column as TEXT, and the write path (updateRow re-selects the row) pushes the JSON as a
-- string; a jsonb column would double-encode that string. TEXT keeps push + pull symmetric
-- (the app parses/stringifies the JSON itself). Safe: only '{}' defaults exist so far.

alter table public.staff_users
  alter column permissions type text using permissions::text,
  alter column permissions set default '{}';
