# Configurar o Supabase

Este guia liga o app ao banco de dados, ao login e ao armazenamento de fotos do Supabase. Leva cerca de 20 minutos.

---

## 1. Criar o projeto

1. Acesse [supabase.com](https://supabase.com) e crie uma conta.
2. Clique em **New project**. Escolha a região **South America (São Paulo)** e guarde a senha do banco.
3. Aguarde o projeto ficar pronto.

## 2. Criar as tabelas e as regras de acesso

Use sempre esta ordem no **SQL Editor** (**New query** para cada arquivo):

| Situação | Rodar, nesta ordem |
|---|---|
| Projeto novo | `supabase/schema.sql` → `supabase/seed-inicial.sql` |
| Projeto que já tem dados de teste | `supabase/reset.sql` → `supabase/schema.sql` → `supabase/seed-inicial.sql` |

- `reset.sql` **apaga** as tabelas do app (obras, equipes, ordens de serviço, progresso e registros de fotos). Não apaga os usuários de login. Os arquivos do bucket `fotos-os` também permanecem; só os registros são removidos.
- `schema.sql` cria as tabelas, as regras de acesso (RLS), as funções, a view `obras_resumo` e o bucket `fotos-os`.
- `seed-inicial.sql` cadastra os perfis, uma equipe e uma obra de exemplo. **Antes de rodar**, troque os UUIDs pelos dos seus usuários (ver passo 4).

Deve rodar sem erros. Se aparecer *"policy ... already exists"*, rode o `reset.sql` e repita a sequência.

## 3. Desativar o cadastro público

Só o administrador deve criar usuários. Em **Authentication**, procure a opção que permite novos cadastros (*Allow new users to sign up*) e **desative**. Os nomes dos menus podem mudar com o tempo; o objetivo é impedir que qualquer pessoa crie uma conta sozinha.

## 4. Criar os usuários e seus perfis

1. Em **Authentication → Users**, clique em **Add user → Create new user**.
2. Informe e-mail e senha, e marque **Auto Confirm User**. Repita para cada técnico e para o gestor.
3. Copie o **UUID** de cada usuário (aparece na lista).
4. No **SQL Editor**, cadastre o papel de cada um:

```sql
insert into perfis (user_id, nome, role) values ('UUID-DO-GESTOR', 'Seu nome', 'admin');
insert into perfis (user_id, nome, role) values ('UUID-DO-TECNICO', 'Nome do técnico', 'campo');
```

> O papel (`admin` ou `campo`) é definido **aqui, no banco**. A tela de login não permite escolher perfil.

## 5. Cadastrar equipes, membros e obras

Pode usar o **Table Editor** ou o SQL Editor. O `seed-inicial.sql` já faz este passo como exemplo; para cadastrar outras obras, use o modelo abaixo.

```sql
-- 1. Equipe (anote o id que aparece no resultado)
insert into equipes (nome) values ('Equipe Alpha') returning id;

-- 2. Vincular o técnico à equipe
insert into equipe_membros (equipe_id, user_id) values ('ID-DA-EQUIPE', 'UUID-DO-TECNICO');

-- 3. Criar uma obra para a equipe, com os dados técnicos
insert into obras (
  cliente_nome, endereco, cidade, potencia_kwp, equipe_id,
  tecnico_chefe_id, num_modulos, potencia_inversor_kw,
  numero_strings, modulos_por_string, fases, tensao_rede_v
) values (
  'João Silva', 'Rua das Flores, 153', 'Alegre - ES', 11.0, 'ID-DA-EQUIPE',
  'UUID-DO-TECNICO', 20, 5.0,
  2, 10, 'monofasico', 220
);
```

Campos técnicos:

- `fases`: `monofasico`, `bifasico` ou `trifasico`.
- `tensao_rede_v`: `127` ou `220`.
- `tecnico_chefe_id`: o técnico responsável pela instalação. Ele aparece no painel do gestor na coluna **Técnico Chefe**.

Um técnico só vê as obras das equipes às quais está vinculado. Obra sem equipe não aparece para nenhum técnico.

## 6. Ligar o app ao projeto

1. No Supabase, vá em **Project Settings → API**.
2. Copie a **Project URL** e a chave **anon public**.
3. Na pasta do projeto, copie `.env.example` para `.env.local` e preencha:

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

4. Reinicie o servidor (`npm run dev`). As variáveis são lidas só na inicialização.

> ⚠️ Use **somente** a chave *anon public* no app. A chave *service_role* dá acesso total ao banco e **nunca** deve ir para o código nem para o `.env.local` do app. O `.gitignore` já impede que o `.env.local` seja enviado ao GitHub.

## 7. Testar

1. **Técnico:** entre com o usuário de campo. Deve ver só as obras da sua equipe. Abra uma obra: os dados técnicos (módulos, inversor, strings e rede) aparecem no topo.
2. **Salvar progresso:** preencha alguns itens e clique em **Salvar progresso**. Saia da obra e entre de novo: o checklist deve estar como foi deixado. Esse progresso fica no servidor, então outra equipe que assumir a obra o vê também.
3. **Finalizar:** conclua todos os itens do checklist, colete a assinatura e clique em **Finalizar e Enviar Ordem de Serviço**. O app volta para a lista de obras.
4. **Gestor:** entre com o usuário admin. O painel deve mostrar a barra de progresso e o status atual de cada obra, com o técnico chefe na coluna **Técnico Chefe**.
5. Confira no Supabase: **Table Editor → ordens_servico** (a OS aparece) e **Storage → fotos-os** (as fotos aparecem).
6. **Modo offline:** desligue o Wi-Fi do celular, finalize uma OS, religue a rede e confira se ela aparece no banco sem ação manual.

---

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| Tela em branco e erro *"Supabase não configurado"* | Falta o `.env.local` ou os nomes das variáveis estão errados. Reinicie o `npm run dev`. |
| *"Seu usuário ainda não tem perfil cadastrado"* | Falta o `insert` na tabela `perfis` para aquele UUID. |
| Técnico não vê nenhuma obra | Falta vincular o técnico em `equipe_membros`, ou a obra não tem `equipe_id`. |
| *"new row violates row-level security policy"* | O técnico tentou gravar em uma obra de outra equipe. É o comportamento esperado. |
| *"policy ... already exists"* ao rodar o schema | Rode `reset.sql` antes e depois repita `schema.sql` e `seed-inicial.sql`. |
| *"violates check constraint"* ao cadastrar obra | Confira os valores de `fases` (`monofasico`, `bifasico`, `trifasico`) e de `tensao_rede_v` (`127` ou `220`). |
| Botão **Salvar progresso** dá erro | Confira a conexão e se o `schema.sql` rodou inteiro. Veja o console do navegador (F12). |
| Foto não sobe | Confirme que o `schema.sql` rodou inteiro e que o bucket `fotos-os` existe. |
| OS fica na fila e não envia | Veja o console do navegador (F12). Geralmente é sessão expirada: faça login de novo. |

## Limitações desta versão

- A tela de **Clientes** e de **Equipes** ainda não existe. Por enquanto, cadastre obras e equipes pelo Table Editor ou pelo SQL.
- Para abrir uma obra, o técnico precisa de conexão. A lista de obras também.
- A assinatura é apenas um registro (sim/não). A imagem da assinatura ainda não é guardada.
- O status da obra (**Aguardando Início**, **Em Instalação**, **Finalizado**) é calculado pelo app: depende do progresso salvo e do envio da OS. O técnico não altera o status diretamente.
