# Implementação Frontend CRM — Negócios / Kanban
## Plano baseado no protótipo Manus (referência visual)

> **Status:** Arquivado como referência. Não implementado ainda.  
> **Data da análise:** 17/09/2026  
> **Protótipo analisado:** `C:\Users\rodri\Downloads\negocios-kanban`

---

## 1. Análise do Projeto de Referência

### Stack encontrada

| Tecnologia | Versão | Papel |
|---|---|---|
| React | 19.2 | UI |
| TypeScript | 5.6 | Tipagem |
| Vite | 7.1 | Bundler |
| Tailwind CSS | 4.1 | Utilidades CSS (usado pouco — quase tudo é CSS puro) |
| Lucide React | 0.453 | Ícones |
| Framer Motion | 12.x | Animações (importado mas **não usado** na tela Kanban) |
| Radix UI | vários | ~40 componentes primitivos (quase nenhum usado na tela) |
| Shadcn/UI pattern | — | Pasta `components/ui/` com ~50 wrappers Radix (não utilizados na Home) |
| wouter | 3.3 | Router (não usado — App renderiza `<Home />` direto) |
| pnpm | 10.4 | Gerenciador de pacotes |

### Estrutura relevante

```
negocios-kanban/
├── client/
│   └── src/
│       ├── pages/
│       │   └── Home.tsx          ← TODO o frontend (800+ linhas)
│       ├── index.css             ← TODO o CSS (750+ regras)
│       ├── App.tsx               ← Apenas renderiza <Home />
│       ├── main.tsx              ← Entry point
│       ├── const.ts              ← OAuth (Manus-específico)
│       ├── components/
│       │   ├── ui/               ← ~50 componentes Shadcn (NÃO usados na Home)
│       │   ├── ManusDialog.tsx   ← Login Manus (NÃO necessário)
│       │   └── Map.tsx           ← Google Maps (NÃO necessário)
│       ├── contexts/             ← ThemeContext (NÃO usado)
│       ├── hooks/                ← useComposition, useMobile, usePersistFn
│       └── lib/
│           └── utils.ts          ← cn() (clsx + tailwind-merge)
├── server/                       ← Express simples servindo static files
├── shared/                       ← Constantes de cookie/session
└── vite.config.ts                ← Plugins Manus + Tailwind + React
```

### Principais arquivos responsáveis pela tela

| Arquivo | Linhas | Conteúdo |
|---|---|---|
| `Home.tsx` | ~112 (compactadas) | **Tudo**: tipos, dados mock, sidebar, toolbar, filtros, kanban board, cards, agrupamento, drawer detalhes, drawer novo negócio, toast, drag & drop |
| `index.css` | ~143 (compactadas) | **Tudo**: variáveis CSS, layout, sidebar, toolbar, cards, colunas, drawers, animações, responsividade |

> O protótipo inteiro é basicamente **1 arquivo TSX + 1 arquivo CSS**. Não há componentização. É um monólito funcional perfeito para protótipo.

### O que vale reaproveitar

- ✅ **CSS completo** — O `index.css` é excelente. Classes bem nomeadas, sem Tailwind inline. Podemos adaptar quase integralmente.
- ✅ **Dados mock** (`seedDeals`, `columns`, `owners`) — Estrutura realista e já validada.
- ✅ **Lógica de renderização** — `renderCard`, `renderGroup`, filtros, cálculos de portfolio.
- ✅ **Tipos TypeScript** — `Deal`, `Stage`, `Column` bem definidos.
- ✅ **Ícones Lucide** — Bom nível de maturidade, leve, tree-shakeable.
- ✅ **Layout/design** — Fundo `#f7f9fb`, cards brancos, indigo `#4f46e5` como primário, valores em verde `#005338`, fonte DM Sans, sidebar fixa de 72px.

### O que deve ser descartado

- ❌ **50 componentes `ui/`** (Shadcn) — Nenhum é usado na Home. Overhead enorme.
- ❌ **ManusDialog** — Login do Manus.
- ❌ **Map.tsx** — Google Maps.
- ❌ **`const.ts`** — OAuth Manus.
- ❌ **`contexts/ThemeContext`** — Não usado.
- ❌ **`hooks/useComposition`, `usePersistFn`** — Não usados na Home.
- ❌ **`server/`** — Express estático.
- ❌ **`shared/`** — Constantes de sessão.
- ❌ **Plugins Vite Manus** — `vite-plugin-manus-runtime`, debug collector, storage proxy, `jsx-loc`.
- ❌ **Tailwind como engine** — O CSS do protótipo é 99% CSS puro com classes próprias. Tailwind só é usado no `ManusDialog` (descartado).
- ❌ **Framer Motion** — Importado no `package.json` mas não utilizado na tela.
- ❌ **Radix UI (todos os ~20 pacotes)** — Nenhum primitivo Radix é usado diretamente na Home.
- ❌ **React Hook Form, Zod, cmdk, embla-carousel, recharts, sonner, vaul, react-resizable-panels, react-day-picker, input-otp, next-themes, axios, nanoid, streamdown** — Nenhum usado.

---

## 2. Estrutura Proposta para o Frontend CRM

```
CRM/
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── App.css                      ← Estilos globais (adaptado do protótipo)
│   ├── types.ts                     ← Deal, Stage, Column
│   ├── data/
│   │   └── mockDeals.ts             ← seedDeals, columns, owners
│   ├── utils/
│   │   └── format.ts                ← money, initials, compactMoney
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Sidebar.css
│   │   │   ├── Topbar.tsx
│   │   │   └── Topbar.css
│   │   ├── kanban/
│   │   │   ├── KanbanBoard.tsx
│   │   │   ├── KanbanBoard.css
│   │   │   ├── KanbanColumn.tsx
│   │   │   ├── KanbanColumn.css
│   │   │   ├── DealCard.tsx
│   │   │   ├── DealCard.css
│   │   │   └── GroupedDealCard.tsx   ← Usa DealCard.css + estilos de grupo
│   │   ├── toolbar/
│   │   │   ├── Toolbar.tsx
│   │   │   ├── Toolbar.css
│   │   │   └── SelectPill.tsx
│   │   ├── portfolio/
│   │   │   ├── PortfolioProgress.tsx
│   │   │   └── PortfolioProgress.css
│   │   └── drawers/
│   │       ├── DealDetailDrawer.tsx
│   │       ├── NewDealDrawer.tsx
│   │       └── Drawers.css
│   └── pages/
│       ├── DealsPage.tsx            ← Página principal Negócios/Kanban
│       └── DealsPage.css
```

> São **~20 arquivos** no total. Cada componente fica ao lado do seu CSS. Sem abstrações desnecessárias.

---

## 3. Componentes Necessários

| Componente | Responsabilidade | Baseado em |
|---|---|---|
| **Sidebar** | Barra lateral fixa 72px, logo "CRM", ícones Contatos e Negócios | Trecho inline da Home |
| **Topbar** | Barra superior 56px, avatar, botão ajuda | Trecho inline da Home |
| **Toolbar** | Busca, filtros (período, responsável, cliente), botão "Novo negócio" | Trecho inline + `SelectPill` |
| **SelectPill** | Filtro estilizado individual (ícone + select nativo oculto) | Função `SelectPill` da Home |
| **PortfolioProgress** | Barra de progresso da carteira + área expandível de resumo | Trecho inline da Home |
| **KanbanBoard** | Container do board, scroll horizontal, contagem, setas de navegação | Trecho inline da Home |
| **KanbanColumn** | Coluna individual: header (dot + título + count + total), body com cards | Trecho inline da Home |
| **DealCard** | Card de negócio: nome, telefone, valor, competência, atividades, avatar, menu contextual, expand info, activity popover | Função `renderCard` |
| **GroupedDealCard** | Card primário + subcards conectados, lock de grupo | Função `renderGroup` |
| **DealDetailDrawer** | Drawer lateral direito: detalhes do negócio, valor, resumo, timeline de atividades | Trecho inline da Home |
| **NewDealDrawer** | Drawer lateral direito: formulário de criação de negócio | Trecho inline da Home |

> **Toast de notificação** será um elemento simples no `DealsPage`, sem biblioteca externa.

---

## 4. Dependências

### Já fazem parte da stack

| Pacote | Papel |
|---|---|
| `react` + `react-dom` | Framework UI |
| `typescript` | Tipagem |
| `vite` | Bundler |
| `@vitejs/plugin-react` | Suporte React no Vite |

### Necessárias (adicionar)

| Pacote | Justificativa |
|---|---|
| `lucide-react` | Ícones — usado extensivamente no protótipo (~20 ícones diferentes). Leve, tree-shakeable. |

### Opcionais / Evitar

| Pacote | Veredicto | Razão |
|---|---|---|
| **Tailwind CSS** | ❌ Evitar | O protótipo usa CSS puro com classes próprias. |
| **Radix UI** | ❌ Evitar | Nenhum primitivo é usado na Home. |
| **Framer Motion** | ❌ Evitar | Não usado na tela. Animações são CSS puro. |
| **React Router** | ❌ Evitar nesta fase | Apenas 1 página real. |
| **Redux / Zustand** | ❌ Evitar | State local com `useState` é suficiente. |
| **React DnD / dnd-kit** | ❌ Evitar nesta fase | Drag & drop nativo HTML5 é suficiente para demonstração. |
| **Shadcn/UI** | ❌ Evitar | Componentes mais simples como HTML + CSS. |

> **Total de dependências adicionais: apenas 1** (`lucide-react`).

---

## 5. Dados Mockados

Arquivo TypeScript com dados estáticos (`src/data/mockDeals.ts`):
- Array `seedDeals: Deal[]` com ~16 negócios
- Array `columns: Column[]` com as 6 etapas e suas cores
- Array `owners: string[]` com os responsáveis

State local com `useState` no `DealsPage`. Sem servidor fake, sem API.

---

## 6. Etapas de Implementação

1. **Criar projeto React + Vite** — Inicializar, instalar `lucide-react`, importar fonte DM Sans, criar tipos e dados mock
2. **Layout geral: Sidebar + Topbar** — Sidebar fixa 72px + Topbar 56px + variáveis CSS globais
3. **Heading + Toolbar + Filtros** — Busca, filtros funcionais, botão "Novo negócio"
4. **Progresso da Carteira** — Barra compacta + área expandível de resumo
5. **Kanban Board + Colunas** — Scroll horizontal, setas de navegação, drop zones
6. **Deal Cards** — Nome, telefone, valor, competência, atividades, avatar, menu contextual, expand
7. **Agrupamento Visual** — Card principal + subcards conectados, lock de grupo
8. **Drawers** — DealDetailDrawer + NewDealDrawer com animações
9. **Toast de Notificação** — Simples, auto-dismiss
10. **Ajustes finais** — Responsividade, reduced-motion, validação visual

---

## 7. Pontos de Atenção

- **Fonte DM Sans** — Precisa importar do Google Fonts
- **CSS com 4 rounds de refinamento** — Consolidar para valores finais
- **Drag & Drop nativo** — Suficiente para demo, mas sem suporte touch/mobile
- **Tailwind removido** — CSS puro com mesmas classes do protótipo
- **Variáveis CSS** — Usar apenas valores finais (após sobrescritas do protótipo)
- **Home.tsx compactado** — Reorganizar em componentes legíveis
