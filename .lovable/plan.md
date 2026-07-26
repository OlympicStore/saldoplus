# Redesign V2 — Cabeçalho + Menu + Central de Contas

Foco em UI/UX. Sem alterações à base de dados, sem alterar lógica financeira, sem tocar em Home / Movimentos / Objetivos / Assistente / Investimentos.

---

## 1. Novo cabeçalho (`src/pages/Index.tsx`)

Substituir o header atual por uma barra minimalista com **3 zonas**:

```text
[ Saldo+ ]          [ Julho 2026 ▼ ]           [ 👤 ] [ ☰ ]
```

- **Esquerda**: logo `Saldo+` pequeno (h-8) — clica → Home.
- **Centro**: seletor de mês/ano (o atual `showMonthPicker` passa para aqui, com o mesmo popover de anos + grelha de meses).
- **Direita**: só dois ícones circulares — Perfil (`UserIcon` → abre `activeTab="account"`) e Menu (`Menu` → abre o Sheet lateral).
- Remover: nome do utilizador, plano em texto, "Categorias/Nomes/Admin/Sair" inline, `SubAccountSwitcher` do header (movido para dentro do drawer).
- Remover a segunda barra `nav` desktop com as tabs (Home/Assistente/…). No desktop passa a existir **só o drawer lateral** (aberto pelo ☰), igual ao mobile. `BottomNav` continua no mobile como está.
- Branding de parceiro (logo/consultor) preservado — mostrado à esquerda antes do "Saldo+" quando existe.

## 2. Menu lateral reorganizado

Um único componente para desktop e mobile (o `Sheet` já existente), com esta ordem:

1. Início → `dashboard`
2. Movimentos → `movements`
3. Objetivos → `goals`
4. Assistente IA → `assistente`
5. Modo Casal → abre `Objectives` no sub-tab casal (mantém funcionalidade existente via query param `?tab=goals&sub=casal`)
6. Empresa → item "em breve" (disabled, badge "Em breve") — placeholder visual sem lógica
7. Central de Contas → `annual` (renomeado)
8. Conta → `account`
9. Configurações → abre sub-secção com Categorias, Nomes, Admin (se admin), Sair — mantém as ações já existentes

Feature-gating por `allowedTabs` continua a filtrar itens não permitidos.

## 3. Central de Contas (reescrita de `AnnualOverview.tsx` → novo `CentralContas.tsx`)

Nova página premium, sem tabelas. Alimentada pelos mesmos dados (`fixedExpenses`, `billRecords`, `billAttachments`) — **sem alterações de schema**.

### Layout

- **Header da página**: título "Central de Contas" + subtítulo "As tuas contas recorrentes num só sítio" + botão "Adicionar conta".
- **Cartões resumo** (3): "A pagar este mês", "Pagas", "Em atraso" — contagens + soma €.
- **Grelha de cartões de conta** (1 col mobile, 2 desktop, `rounded-3xl`, sombra suave):

  ```text
  💧 Água                          [Pendente]
  Recorrente variável · Dia 11

  Valor esperado    Último valor
   42 €              39 €

  [ Atualizar mês ]   [ Ver histórico ]
  ```

- Ícone derivado do nome (mapa: água→💧, luz/eletricidade→⚡, gás→🔥, internet→🌐, netflix→🎬, spotify→🎵, seguro→🛡️, ginásio→🏋️, telemóvel→📱, default→🧾).
- Cor do estado usa os tokens já existentes (`status-pending/paid/negative`).
- **"Valor esperado"** = média dos meses com valor > 0 do ano corrente (fallback: último valor).
- **"Último valor"** = valor mais recente registado (mês anterior ao atual, ou último com valor).
- **"Atualizar mês"**:
  - Fixa → popover só com estado (Pago / Pendente / Em atraso).
  - Variável → popover com input de valor + estado.
  - Usa `updateFixedMonthly` já existente.

### Modal de detalhe (clicar no cartão)

`Dialog` full-height mobile, largura média desktop. Conteúdo:

- Cabeçalho: ícone + nome + categoria + tipo (Fixa/Variável) + dia de vencimento (editáveis via botão pequeno "Editar" — usa `updateFixed`).
- **Estatísticas rápidas**: média (12m), maior, menor, última atualização.
- **Histórico mensal** (lista vertical de 12 meses do ano ativo):
  - Mês · valor · estado · data (se paga) · comprovativo (📎 anexar / miniatura se existir) · observações (input inline opcional — guarda em memória local se não houver campo BD; nesta iteração sem persistência de observações para respeitar "não alterar BD").
- Botão eliminar conta (com confirmação).

### Tipo de despesa (fixa vs variável)

Já existe o campo `valueType` em `fixed_expenses` (memoria da última iteração de Despesas). Reutilizar diretamente:
- Toggle no formulário "Nova conta" e na edição.
- Não é preciso migração.

### Preparação para OCR (sem implementar)

- Botão "Enviar fatura (em breve)" desactivado no modal.
- Estrutura de `handleAttachClick` já aceita PDF/imagem; adicionar um wrapper `parseAttachment(file)` que hoje é no-op e no futuro chama edge function OCR. Documentar `// TODO: OCR pipeline` num único local.

### Integração com Assistente IA

- Adicionar cartão discreto "💬 Diz ao assistente: «Água 42€»" no topo da página com botão que abre o assistente com prompt pré-preenchido (`?tab=assistente&prompt=...` — já existe padrão de navegação por query, sem novas edge functions).
- **Não** alterar o edge function `ai-chat` nesta iteração (as tools `add_expense`/`update_expense` já cobrem o caso; o system prompt existente já entende "paguei a luz 68€").

## 4. Componentes a criar / editar

**Novos:**
- `src/components/CentralContas.tsx` — página completa
- `src/components/central-contas/BillCard.tsx` — cartão individual
- `src/components/central-contas/BillDetailDialog.tsx` — modal de detalhe/histórico
- `src/components/AppHeader.tsx` — novo cabeçalho minimalista (extraído de Index)
- `src/components/AppSideMenu.tsx` — conteúdo partilhado do Sheet (usado por mobile e desktop)

**Editados:**
- `src/pages/Index.tsx` — usar `AppHeader` + `AppSideMenu`, remover barra de tabs desktop, renomear rota "annual" → renderiza `CentralContas`, remover painel `Categorias` inline (passa para dentro do menu Configurações).

**Preservados sem alterações:** `Dashboard`, `Movements`, `Objectives`, `AIAssistant`, `Investments`, `Entries`, `Expenses`, `InitialBalance`, `AccountPanel`, `BottomNav`, `usePersistedData`, todas as edge functions.

## 5. Design tokens

Usar exclusivamente os tokens existentes (`--primary`, `--surface`, `--status-*`, fontes Sora/Manrope, `rounded-3xl`, `shadow-card`). Animações leves com Framer Motion (fade + translate curto, iguais aos já usados).

## 6. Fora do âmbito

- OCR real (só estrutura preparada)
- Novas tabelas ou colunas
- Alteração de qualquer edge function
- Modo Empresa funcional (só placeholder no menu)
- Alterações a Home / Movimentos / Objetivos / Assistente / Investimentos / Despesas / Receitas
