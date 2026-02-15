# App Finanças

Aplicativo desktop de finanças pessoais, **100% local**, usando Electron, React, TypeScript e Vite.

## Subir o projeto no Git (GitHub) e checagem de atualizações

1. **Criar o repositório no GitHub**  
   No GitHub: New repository (ex.: `App_financas`). Não inicialize com README se já tiver um.

2. **Inicializar Git e fazer o primeiro push** (na pasta do projeto):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/SEU_USER/App_financas.git
   git push -u origin main
   ```
   Substitua `SEU_USER` pelo seu utilizador do GitHub (e `App_financas` pelo nome do repo, se for outro).

3. **Ativar a checagem de atualizações**  
   Em **`electron/main/index.ts`**, defina a constante `VERSION_CHECK_URL` com o URL **raw** do `version.json` no repo:
   ```text
   https://raw.githubusercontent.com/SEU_USER/App_financas/main/version.json
   ```
   Depois faça novo build (`npm run make`).

4. **Quando lançar uma nova versão**  
   - Atualize o `version` no **package.json** e rode `npm run make`.  
   - No repositório, atualize o **`version.json`**: `latestVersion` igual à nova versão e, se quiser, `downloadUrl` com o link do instalador (por ex. o ficheiro de um [GitHub Release](https://docs.github.com/en/repositories/releasing-projects-on-github)).  
   - Quem tiver uma versão antiga, ao abrir o app, verá a tela de atualização obrigatória.

O ficheiro **`version.json`** na raiz do projeto deve ser commitado; o app vai buscá-lo via esse URL para saber se há versão mais recente.

## Stack

- **Electron** + **electron-vite** (build)
- **React 18** + **TypeScript** + **Vite**
- **TailwindCSS** + componentes no estilo ShadcnUI
- **Recharts** para gráficos
- **DataManager** com JSON em `app.getPath('userData')/finance-data/` (settings, goals, data/YYYY-MM.json)

## Scripts

- `npm run dev` — inicia em modo desenvolvimento (Electron + Vite HMR)
- `npm run build` — gera build de produção em `dist/`
- `npm run make` — faz o build e gera o instalador Windows (`.exe`) em `release/<versão>/`

## Versionamento

A versão do app tem **um único lugar**: o campo `"version"` no **package.json**.  
Sempre que for lançar uma nova versão:

1. Altere o valor em `package.json` (ex.: `"1.0.0"` → `"1.1.0"`).
2. Rode `npm run sync-version` — atualiza o `version.json` com a mesma versão (para a checagem de atualizações no GitHub).
3. Rode `npm run make`.

O instalador, o nome da pasta em `release/` e a versão exibida na barra do app (canto direito) passam a usar essa mesma versão automaticamente.

### Atualização obrigatória

O app pode exibir uma tela de **atualização obrigatória** e bloquear o uso até o utilizador instalar a versão mais recente.

1. **Coloque num servidor um JSON** com a versão e o link do instalador. Use o ficheiro **`version.json`** na raiz do projeto como modelo:
   - `latestVersion`: versão mais recente (ex.: `"1.0.1"`)
   - `downloadUrl`: (opcional) URL para baixar o instalador

2. **Configure a URL** no processo principal do Electron: em **`electron/main/index.ts`**, defina a constante `VERSION_CHECK_URL` com o URL desse JSON. Se usar GitHub, veja a secção **Subir o projeto no Git** acima (link raw do `version.json`).

3. Ao abrir o app, se a versão instalada for **inferior** à `latestVersion`, é mostrada uma tela a pedir para baixar e instalar a nova versão; o resto do app fica bloqueado até atualizar.

Se `VERSION_CHECK_URL` estiver vazia, a checagem é desativada (útil em desenvolvimento).

## Arquitetura de dados (DataManager)

Armazenamento **100% local** em `app.getPath('userData')/finance-data/`:

- **settings.json** — categorias (nome, cor, ícone), tags, tema e orçamento mensal
- **goals.json** — metas com histórico de depósitos (`depositHistory`)
- **data/YYYY-MM.json** — transações por mês (`id`, `date`, `description`, `amount`, `type`, `categoryId`, `tagIds`, `recurring`)

O **DataManager** (`electron/main/services/DataManager.ts`) centraliza leitura/escrita com `fs/promises`. Há migração automática dos ficheiros antigos (`transactions.json` / `goals.json`) para o novo formato.

## Funcionalidades

- **Configurações**: CRUD de categorias (cor + ícone) e tags; preferências (tema, orçamento)
- **Dashboard**: KPIs (saldo, receitas/despesas do mês, saldo previsto); gráfico de linha (histórico); gráfico de pizza por categoria (clique filtra transações)
- **Transações**: tabela com **@tanstack/react-table**; seleção múltipla (Shift+clique) e alteração em massa de categoria; modal com categoria e tags; filtro por categoria via URL (`?categoryId=`)
- **Metas**: criação de metas; botão **Depositar** (aumenta valor e opcionalmente cria despesa no extrato); barra de progresso e previsão de data de conclusão
- **Atalhos**: `Ctrl+N` (nova transação), `Ctrl+K` (paleta de comandos)

## Próximos passos (opcional)

- Importação **OFX/CSV** com modal de mapeamento de colunas
- Transações **recorrentes** (mensal/semanal) com geração automática
- Barra de título customizada (estilo Windows 11)

## IPC

O frontend usa `window.electronAPI` (preload). O processo principal expõe handlers `data:*` (getSettings, saveSettings, getTransactions, getTransactionMonths, addTransaction, updateTransaction, updateTransactionsBulk, deleteTransaction, getGoals, addGoal, updateGoal, depositToGoal).
