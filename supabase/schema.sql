-- Registro Cuccimix — execute no Supabase: SQL Editor > New query > Run.

create table if not exists public.registros (
  id               uuid primary key default gen_random_uuid(),
  data             date not null,
  cliente          text not null,
  modelo           text not null,
  chef             text not null,
  receita_evento   text not null,
  metodo_coccao    text not null,
  tempo            text not null,
  created_by       uuid default auth.uid() references auth.users (id) on delete set null,
  created_by_email text default (auth.jwt() ->> 'email'),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists registros_data_idx on public.registros (data desc);

-- Mantém updated_at e impede que o autor seja trocado em updates.
create or replace function public.registros_before_update()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  new.created_by := old.created_by;
  new.created_by_email := old.created_by_email;
  return new;
end $$;

drop trigger if exists registros_before_update on public.registros;
create trigger registros_before_update
  before update on public.registros
  for each row execute function public.registros_before_update();

-- Expõe a tabela à API apenas para usuários logados.
revoke all on public.registros from anon;
grant select, insert, update, delete on public.registros to authenticated;

-- Row Level Security: só usuários logados acessam;
-- todos veem todos os registros, mas só editam/excluem os próprios.
alter table public.registros enable row level security;

drop policy if exists "ler registros" on public.registros;
create policy "ler registros" on public.registros
  for select to authenticated using (true);

drop policy if exists "inserir registros" on public.registros;
create policy "inserir registros" on public.registros
  for insert to authenticated with check (created_by = auth.uid());

drop policy if exists "editar proprios registros" on public.registros;
create policy "editar proprios registros" on public.registros
  for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());

drop policy if exists "excluir proprios registros" on public.registros;
create policy "excluir proprios registros" on public.registros
  for delete to authenticated using (created_by = auth.uid());
