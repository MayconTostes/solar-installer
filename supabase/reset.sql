-- =====================================================================
-- RESET: apaga tudo que o schema.sql cria (tabelas, dados, view, funções
-- e regras de Storage deste projeto). ATENÇÃO: apaga os dados.
-- Use só para recomeçar do zero. Depois rode schema.sql e seed-inicial.sql.
-- Não apaga os usuários do Authentication.
-- =====================================================================

drop view if exists public.obras_resumo;

do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname like 'storage fotos%'
  loop
    execute format('drop policy if exists %I on storage.objects', r.policyname);
  end loop;
end $$;

drop table if exists
  public.os_fotos, public.ordens_servico, public.obra_progresso,
  public.equipe_membros, public.obras, public.equipes, public.perfis
cascade;

drop function if exists public.os_e_da_minha_equipe(uuid);
drop function if exists public.obra_e_da_minha_equipe(uuid);
drop function if exists public.obra_texto_e_da_minha_equipe(text);
drop function if exists public.papel_atual();
