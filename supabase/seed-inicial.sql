-- =====================================================================
-- Dados iniciais (rode SOMENTE UMA VEZ, depois do schema.sql)
-- Troque os UUIDs e os dados de exemplo pelos da sua obra real.
-- Os UUIDs dos usuários estão em Authentication > Users.
-- =====================================================================

-- 1. Perfis: papel de cada usuário
insert into perfis (user_id, nome, role) values
  ('687a8027-c972-4b08-ab49-51beccce50db', 'Maycon Tostes', 'admin'),
  ('b3e15b62-50c1-4f51-8e15-c418b4d8ce52', 'Maycon Pinto', 'campo');

-- 2. Equipe, vínculo do técnico e obra de exemplo, em uma só execução
with nova_equipe as (
  insert into equipes (nome) values ('Equipe Alpha') returning id
),
vinculo as (
  insert into equipe_membros (equipe_id, user_id)
  select id, 'b3e15b62-50c1-4f51-8e15-c418b4d8ce52' from nova_equipe
  returning equipe_id
)
insert into obras (
  cliente_nome, endereco, cidade, potencia_kwp, equipe_id, tecnico_chefe_id,
  num_modulos, potencia_inversor_kw, numero_strings, modulos_por_string, fases, tensao_rede_v
)
select
  'João Silva', 'Rua das Flores, 153', 'Alegre - ES', 11.0, equipe_id,
  'b3e15b62-50c1-4f51-8e15-c418b4d8ce52',
  20, 5.0, 2, 10, 'monofasico', 220
from vinculo;
