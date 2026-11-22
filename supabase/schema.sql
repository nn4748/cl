-- ═══════════════════════════════════════════════════════════════
--  دفتر الحلال — مخطط قاعدة بيانات Supabase
--  شغّل هذا الملف مرة واحدة من: Supabase → SQL Editor → New query
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.accounts (
  id         text primary key,
  name       text not null,
  kind       text not null check (kind in ('cash','asset','expense','revenue','equity','liability')),
  archived   boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.entries (
  id          uuid primary key,                 -- يولَّد على الجهاز: يمنع التكرار عند المزامنة
  number      integer not null unique check (number > 0),  -- رقم القيد التسلسلي (لا يتكرر)
  date        date not null,
  description text not null default '',
  type        text not null,
  lines       jsonb not null,
  flagged     boolean not null default false,
  flag_note   text,
  deleted     boolean not null default false,   -- حذف ناعم فقط
  source      text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid default auth.uid()
);

-- سجل تاريخي لكل نسخة من كل قيد (لا يُحذف منه شيء)
create table if not exists public.entry_history (
  id         bigserial primary key,
  entry_id   uuid not null,
  action     text not null,
  snapshot   jsonb not null,
  at         timestamptz not null default now(),
  by_user    uuid default auth.uid()
);

-- ─── التحقق من توازن القيد (مجموع المدين = مجموع الدائن) ───
create or replace function public.check_entry_balanced() returns trigger
language plpgsql as $$
declare
  d bigint; c bigint; n int;
begin
  select coalesce(sum((l->>'debit')::bigint),0),
         coalesce(sum((l->>'credit')::bigint),0),
         count(*)
    into d, c, n
    from jsonb_array_elements(new.lines) l;
  if n < 2 then raise exception 'القيد يحتاج سطرين على الأقل'; end if;
  if d <= 0 or d <> c then raise exception 'القيد غير متوازن: مدين % ≠ دائن %', d, c; end if;
  return new;
end $$;

-- ─── وقت التعديل يحدده الخادم دائماً + منع تغيير رقم القيد + حفظ التاريخ ───
create or replace function public.entries_before_write() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    if new.number <> old.number then raise exception 'لا يمكن تغيير رقم القيد بعد اعتماده'; end if;
    new.created_at := old.created_at;
    insert into public.entry_history(entry_id, action, snapshot) values (old.id, 'before_update', to_jsonb(old));
  end if;
  new.updated_at := clock_timestamp();
  return new;
end $$;

create or replace function public.entries_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.entry_history(entry_id, action, snapshot) values (new.id, 'insert', to_jsonb(new));
  return new;
end $$;

-- منع الحذف النهائي
create or replace function public.entries_no_delete() returns trigger
language plpgsql as $$
begin
  raise exception 'الحذف النهائي غير مسموح — استخدم الإلغاء (deleted = true)';
end $$;

drop trigger if exists trg_entries_balanced on public.entries;
create trigger trg_entries_balanced before insert or update on public.entries
  for each row execute function public.check_entry_balanced();

drop trigger if exists trg_entries_before_write on public.entries;
create trigger trg_entries_before_write before insert or update on public.entries
  for each row execute function public.entries_before_write();

drop trigger if exists trg_entries_after_insert on public.entries;
create trigger trg_entries_after_insert after insert on public.entries
  for each row execute function public.entries_after_insert();

drop trigger if exists trg_entries_no_delete on public.entries;
create trigger trg_entries_no_delete before delete on public.entries
  for each row execute function public.entries_no_delete();

create index if not exists entries_date_idx on public.entries(date);

-- ─── الصلاحيات: فقط المستخدمون المسجّلون (أفراد العائلة) ───
alter table public.accounts      enable row level security;
alter table public.entries       enable row level security;
alter table public.entry_history enable row level security;

drop policy if exists "auth read accounts"  on public.accounts;
drop policy if exists "auth write accounts" on public.accounts;
drop policy if exists "auth update accounts" on public.accounts;
create policy "auth read accounts"   on public.accounts for select to authenticated using (true);
create policy "auth write accounts"  on public.accounts for insert to authenticated with check (true);
create policy "auth update accounts" on public.accounts for update to authenticated using (true);

drop policy if exists "auth read entries"   on public.entries;
drop policy if exists "auth insert entries" on public.entries;
drop policy if exists "auth update entries" on public.entries;
create policy "auth read entries"   on public.entries for select to authenticated using (true);
create policy "auth insert entries" on public.entries for insert to authenticated with check (true);
create policy "auth update entries" on public.entries for update to authenticated using (true);

drop policy if exists "auth read history" on public.entry_history;
create policy "auth read history" on public.entry_history for select to authenticated using (true);

-- مهم: بعد إنشاء حسابات أفراد العائلة، عطّل التسجيل العام من
-- Authentication → Providers → Email → "Allow new users to sign up" = OFF
-- حتى لا يستطيع أحد غيركم إنشاء حساب.
