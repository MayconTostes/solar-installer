# ☀️ Solar Installer — App de Campo e Gestão para Instalação Solar

> Aplicação web responsiva, desenvolvida em **React + Vite** e **Supabase**, para apoiar equipes técnicas na instalação, no comissionamento e no checklist de sistemas fotovoltaicos, com painel de gestão para o administrador.

> 📄 **[MELHORIAS.md](./MELHORIAS.md)**: histórico de correções e próximas etapas.
> 🗄️ **[SUPABASE.md](./SUPABASE.md)**: como criar o projeto, as tabelas e os usuários.

---

## 📌 Status das Funcionalidades

- [x] **Login real por perfil:** Campo ou Admin, com o papel definido no banco
- [x] **Obras por equipe:** o técnico vê só as obras da sua equipe (regras RLS)
- [x] **Checklist de comissionamento:** estrutura e módulos, cabeamento DC, proteções (conduletes), inversor, quadro AC, aterramento, configuração do inversor e Wi-Fi
- [x] **Medição de tensão da rede no disjuntor:** aceita decimal (ex.: `220,5`) e é obrigatória para finalizar
- [x] **Salvar progresso no servidor:** outra equipe pode retomar a obra de onde parou
- [x] **Painel do gestor:** barra de progresso, status atual e técnico chefe de cada obra
- [x] **Registro fotográfico:** captura pela câmera do celular, enviada ao Storage
- [x] **Envio ao Supabase:** OS, checklist e fotos, sem duplicar em caso de reenvio
- [x] **Fila offline:** OS guardadas no IndexedDB e enviadas ao recuperar a conexão
- [x] **Painel do Admin:** obras e indicadores vindos do banco
- [ ] **Termo de aceitação:** assinatura real (hoje é só um registro sim/não)
- [ ] **Cache do app para abrir sem internet** (service worker / PWA)
- [ ] **Telas de Clientes e Equipes** (hoje o cadastro é pelo painel do Supabase)
- [ ] **Cálculo de materiais:** grampos, trilhos e fixadores por tipo de telhado
- [ ] **Relatório em PDF:** Termo de Conclusão de Obra para assinatura do cliente

---

## 🛠️ Tecnologias

- [React](https://react.dev/): interface
- [Vite](https://vitejs.dev/): bundler e servidor de desenvolvimento
- [React Router](https://reactrouter.com/): rotas e proteção por perfil
- [Supabase](https://supabase.com/): banco PostgreSQL, login, armazenamento de fotos
- [Lucide](https://lucide.dev/): ícones
- IndexedDB: fila local das OS pendentes

---

## 🚀 Como Executar o Projeto Localmente

### Pré-requisitos
- [Node.js](https://nodejs.org/) 18 ou superior
- Um projeto no Supabase (veja [SUPABASE.md](./SUPABASE.md))

### Passo a passo

1. **Entre na pasta do projeto:**
   ```bash
   cd solar-installer
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```
   > Se a pasta `node_modules` veio de outro sistema operacional, apague-a antes de rodar `npm install`.

3. **Configure o Supabase:** copie `.env.example` para `.env.local` e preencha com a URL e a chave *anon public* do seu projeto.

4. **Rode em modo de desenvolvimento:**
   ```bash
   npm run dev
   ```
   Abra o endereço exibido no terminal. Para testar no celular, use `npm run dev -- --host` na mesma rede Wi-Fi.

5. **Verifique o código e gere a versão de produção:**
   ```bash
   npm run lint
   npm run build
   ```

### Acesso
Os usuários são criados pelo administrador no Supabase (Authentication → Users), e o papel de cada um é definido na tabela `perfis`. Veja o passo a passo em [SUPABASE.md](./SUPABASE.md).

---

## 📁 Estrutura

```
supabase/
└── schema.sql                   # Tabelas, regras de acesso (RLS) e bucket de fotos
src/
├── App.jsx                      # Rotas e sincronização automática
├── context/AuthContext.jsx      # Sessão e perfil (admin/campo) via Supabase Auth
├── components/
│   ├── ProtectedRoute.jsx       # Bloqueia rotas por perfil
│   └── HasRole.jsx              # Mostra elementos só para um perfil
├── pages/
│   ├── Login.jsx
│   ├── admin/                   # Painel, clientes, equipes, relatórios
│   └── campo/                   # Lista de obras e instalação (checklist, fotos, assinatura)
└── services/
    ├── supabase.js              # Cliente do Supabase
    ├── offlineStorage.js        # Fila de OS no IndexedDB
    ├── sincronizacao.js         # Envio ao Supabase e reenvio da fila
    └── ids.js                   # Geração de UUIDs
```
