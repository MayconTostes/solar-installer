-- =====================================================================
-- Solar Installer: schema do banco (Supabase / PostgreSQL)
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- Depois rode o seed-inicial.sql (uma única vez).
-- =====================================================================

-- ---------- Tabelas ----------

-- Perfil de cada usuário (ligado ao Auth). O papel é definido aqui, no banco.
create table if not exists public.perfis (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  nome      text not null,
  role      text not null check (role in ('admin', 'campo')),
  criado_em timestamptz not null default now()
);

create table if not exists public.equipes (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null,
  criado_em timestamptz not null default now()
);

create table if not exists public.equipe_membros (
  equipe_id uuid not null references public.equipes(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  primary key (equipe_id, user_id)
);

-- Obra: dados do cliente e dados técnicos do projeto.
-- O status não é guardado aqui: é calculado na view obras_resumo.
create table if not exists public.obras (
  id                  uuid primary key default gen_random_uuid(),
  cliente_nome        text not null,
  endereco            text not null,
  cidade              text not null,
  potencia_kwp        numeric(6,2),
  equipe_id           uuid references public.equipes(id) on delete set null,
  tecnico_chefe_id    uuid references public.perfis(user_id) on delete set null,
  num_modulos         integer check (num_modulos > 0),
  potencia_inversor_kw numeric(6,2) check (potencia_inversor_kw > 0),
  numero_strings      integer check (numero_strings > 0),
  modulos_por_string  integer check (modulos_por_string > 0),
  fases               text check (fases in ('monofasico', 'bifasico', 'trifasico')),
  tensao_rede_v       integer check (tensao_rede_v in (127, 220)),
  criado_em           timestamptz not null default now()
);

-- Progresso salvo pela equipe (rascunho no servidor). Uma linha por obra.
-- Some quando a OS é enviada, porque a obra passa a ser "Finalizado".
create table if not exists public.obra_progresso (
  obra_id          uuid primary key references public.obras(id) on delete cascade,
  respostas        jsonb not null default '{}'::jsonb,
  fotos            jsonb not null default '[]'::jsonb,   -- [{ id, caminho }]
  assinado         boolean not null default false,
  progresso_pct    integer not null default 0 check (progresso_pct between 0 and 100),
  atualizado_em    timestamptz not null default now(),
  atualizado_por   uuid default auth.uid() references auth.users(id)
);

-- Ordem de Serviço enviada ao final da instalação.
-- id_local é gerado no aparelho: um reenvio não cria OS duplicada.
create table if not exists public.ordens_servico (
  id                    uuid primary key default gen_random_uuid(),
  id_local              uuid not null unique,
  obra_id               uuid not null references public.obras(id) on delete restrict,
  criado_por            uuid not null default auth.uid() references auth.users(id),
  checklist             jsonb not null,
  tensao_rede_medida_v  numeric(6,1) not null check (tensao_rede_medida_v > 0),
  assinado              boolean not null default false,
  criado_em             timestamptz not null default now()
);

-- Fotos da OS. O arquivo fica no Storage; aqui fica só o caminho.
create table if not exists public.os_fotos (
  id          uuid primary key,
  os_id_local uuid not null references public.ordens_servico(id_local) on delete cascade,
  caminho     text not null,
  criado_em   timestamptz not null default now()
);

-- ---------- Funções auxiliares ----------

create or replace function public.papel_atual()
returns text
language sql stable security definer set search_path = public
as $$
  select role from public.perfis where user_id = auth.uid();
$$;

create or replace function public.obra_e_da_minha_equipe(p_obra uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.obras o
    join public.equipe_membros m on m.equipe_id = o.equipe_id
    where o.id = p_obra and m.user_id = auth.uid()
  );
$$;

-- Mesma regra, mas recebe texto (usada nas regras do Storage, onde o caminho é texto)
create or replace function public.obra_texto_e_da_minha_equipe(p_obra text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.obras o
    join public.equipe_membros m on m.equipe_id = o.equipe_id
    where o.id::text = p_obra and m.user_id = auth.uid()
  );
$$;

create or replace function public.os_e_da_minha_equipe(p_os_id_local uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.ordens_servico os
    where os.id_local = p_os_id_local and public.obra_e_da_minha_equipe(os.obra_id)
  );
$$;

-- ---------- View do painel (status e progresso calculados) ----------
-- security_invoker = true faz a view respeitar as regras RLS de quem consulta.

create or replace view public.obras_resumo
with (security_invoker = true) as
select
  o.id,
  o.cliente_nome,
  o.endereco,
  o.cidade,
  o.potencia_kwp,
  o.num_modulos,
  o.potencia_inversor_kw,
  o.numero_strings,
  o.modulos_por_string,
  o.fases,
  o.tensao_rede_v,
  o.criado_em,
  o.equipe_id,
  e.nome as equipe_nome,
  o.tecnico_chefe_id,
  pc.nome as tecnico_chefe_nome,
  coalesce(p.progresso_pct, 0) as progresso_pct,
  p.atualizado_em as progresso_atualizado_em,
  case
    when exists (select 1 from public.ordens_servico os where os.obra_id = o.id) then 'Finalizado'
    when coalesce(p.progresso_pct, 0) > 0 then 'Em Instalação'
    else 'Aguardando Início'
  end as status_atual
from public.obras o
left join public.equipes e on e.id = o.equipe_id
left join public.perfis pc on pc.user_id = o.tecnico_chefe_id
left join public.obra_progresso p on p.obra_id = o.id;

-- ---------- Row Level Security ----------

alter table public.perfis          enable row level security;
alter table public.equipes         enable row level security;
alter table public.equipe_membros  enable row level security;
alter table public.obras           enable row level security;
alter table public.obra_progresso  enable row level security;
alter table public.ordens_servico  enable row level security;
alter table public.os_fotos        enable row level security;

-- perfis: cada um vê o próprio; admin vê e gerencia todos
create policy "perfil: ver o proprio ou admin" on public.perfis
  for select using (user_id = auth.uid() or public.papel_atual() = 'admin');
create policy "perfil: admin gerencia" on public.perfis
  for all using (public.papel_atual() = 'admin') with check (public.papel_atual() = 'admin');

-- equipes: membros veem a própria equipe; admin gerencia
create policy "equipe: ver se for membro ou admin" on public.equipes
  for select using (
    public.papel_atual() = 'admin'
    or exists (select 1 from public.equipe_membros m where m.equipe_id = id and m.user_id = auth.uid())
  );
create policy "equipe: admin gerencia" on public.equipes
  for all using (public.papel_atual() = 'admin') with check (public.papel_atual() = 'admin');

-- membros: cada um vê os próprios vínculos; admin gerencia
create policy "membro: ver o proprio ou admin" on public.equipe_membros
  for select using (user_id = auth.uid() or public.papel_atual() = 'admin');
create policy "membro: admin gerencia" on public.equipe_membros
  for all using (public.papel_atual() = 'admin') with check (public.papel_atual() = 'admin');

-- obras: técnico vê as obras da equipe; admin gerencia
create policy "obra: ver da equipe ou admin" on public.obras
  for select using (public.papel_atual() = 'admin' or public.obra_e_da_minha_equipe(id));
create policy "obra: admin gerencia" on public.obras
  for all using (public.papel_atual() = 'admin') with check (public.papel_atual() = 'admin');

-- progresso: qualquer membro da equipe da obra lê e salva; admin tudo.
-- Se o admin trocar a equipe da obra, a nova equipe passa a enxergar o progresso.
create policy "progresso: equipe da obra ou admin" on public.obra_progresso
  for all using (public.papel_atual() = 'admin' or public.obra_e_da_minha_equipe(obra_id))
  with check (public.papel_atual() = 'admin' or public.obra_e_da_minha_equipe(obra_id));

-- OS: técnico cria OS só para obras da sua equipe, em seu próprio nome.
-- Técnico não edita nem apaga OS depois de enviada.
create policy "os: ver da equipe ou admin" on public.ordens_servico
  for select using (public.papel_atual() = 'admin' or public.obra_e_da_minha_equipe(obra_id));
create policy "os: criar na propria equipe" on public.ordens_servico
  for insert with check (criado_por = auth.uid() and public.obra_e_da_minha_equipe(obra_id));
create policy "os: admin edita e apaga" on public.ordens_servico
  for all using (public.papel_atual() = 'admin') with check (public.papel_atual() = 'admin');

-- Fotos da OS: mesma regra das OS
create policy "foto: ver da equipe ou admin" on public.os_fotos
  for select using (public.papel_atual() = 'admin' or public.os_e_da_minha_equipe(os_id_local));
create policy "foto: criar na propria OS" on public.os_fotos
  for insert with check (public.os_e_da_minha_equipe(os_id_local));
create policy "foto: admin apaga" on public.os_fotos
  for delete using (public.papel_atual() = 'admin');

-- ---------- Storage (fotos) ----------
-- Caminho dos arquivos: <user_id>/<obra_id>/<id_da_foto>.jpg
--  - quem envia grava só na própria pasta e só em obras da sua equipe;
--  - quem lê: o próprio, a equipe da obra ou o admin.

insert into storage.buckets (id, name, public)
values ('fotos-os', 'fotos-os', false)
on conflict (id) do nothing;

create policy "storage fotos: enviar na propria pasta" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'fotos-os'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.obra_texto_e_da_minha_equipe((storage.foldername(name))[2])
  );

create policy "storage fotos: atualizar na propria pasta" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'fotos-os'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.obra_texto_e_da_minha_equipe((storage.foldername(name))[2])
  );

create policy "storage fotos: ler proprias, da equipe ou admin" on storage.objects
  for select to authenticated
  using (bucket_id = 'fotos-os' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.obra_texto_e_da_minha_equipe((storage.foldername(name))[2])
    or public.papel_atual() = 'admin'
  ));
