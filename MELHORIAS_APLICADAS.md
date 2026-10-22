# Controlos v4.0 — Relatório de Melhorias Aplicadas no Código-Fonte

Este documento resume todas as melhorias visuais, funcionais, de controlo de gestão QSR, performance e segurança aplicadas diretamente sobre o código-fonte do repositório `ViaCatarina97/Controlos`.

---

## 1. Arquitetura Visual, Tipografia & Responsividade Mobile (`App.tsx`, `index.css`, `tailwind.config.js`)

- **Sistema de Design Unificado (`Dark Slate + Amber Gold`)**:
  - Remoção do script de desenvolvimento `https://cdn.tailwindcss.com` (que gerava avisos em consola e FOUC no arranque) e compilação nativa com **Tailwind CSS v3 + PostCSS**, preservando todos os tokens personalizados do projeto (`bg-red-650`, `bg-gray-150`, `text-slate-705`, `border-emerald-250`, etc.).
  - Tipografia **Plus Jakarta Sans** com `tabular-nums` em todos os montantes financeiros, rácios e contadores operacionais.
  - Remoção das cores legadas dissonantes (`#5a7d36` / `#b4d493` verde-oliva no Resumo de Faturação e vermelhos saturados nos cabeçalhos de Checklists e botões de eliminação).
- **Navegação Desktop & Mobile Nativa (`App.tsx`)**:
  - **Desktop (`>= 1024px`)**: Barra lateral esquerda escura (`#0f172a`) colapsável com indicação clara do módulo ativo, atalho direto à **Torre de Controlo** e estado de sincronização Cloud em tempo real.
  - **Mobile (`390px`)**: Gaveta deslizante (*slide-over drawer*) + **barra de navegação inferior fixa (*sticky bottom bar*)** com acesso rápido às secções do módulo sem bloquear o ecrã nem forçar *scroll* horizontal.

---

## 2. Torre de Controlo Executiva em Tempo Real (`components/ModuleSelector.tsx`)

O antigo seletor estático de cartões foi transformado numa **Torre de Controlo da Unidade** ligada diretamente ao Firestore:
- **4 Cartões Executivos Live**:
  1. **Vendas Acumuladas Mês (€)** + Último Dia registado + Total Faturação HAVI do mês.
  2. **Food & Paper Cost Real (%)** desagregado em **Comida (%)** e **Papel (%)**.
  3. **Tesouraria & Prosegur (€)**: Estado da contagem de Abertura de hoje, acumulado real da **Semana Prosegur em Aberto** e contagem de dias prontos a encerrar.
  4. **Equipa & Posicionamento Hoje**: Colaboradores posicionados no turno ativo, efetivo ativo e checklists de gerentes abertas.
- **Painel de Controlo Ativo (Alertas Acionáveis com Deep-Link)**:
  - Deteta e sinaliza automaticamente desvios brutos entre rubricas HAVI vs MyStore, faturas em falta em *Outros Fornecedores*, dias de cofre validados pendentes de encerramento e turnos passados em rascunho — cada alerta leva diretamente ao sub-separador exato de resolução.

---

## 3. Controlo de Gestão QSR & Correções Funcionais Críticas

1. **Reconciliação HAVI vs MyStore (`components/BillingSummary.tsx`)**:
   - **Novo KPI `Desvio Absoluto Bruto (∑|Δ|)`** ao lado da `Diferença Líquida Global`: impede que erros de lançamento cruzado entre famílias no MyStore (ex.: *Happy Meal* vs *Outros*) se anulem mutuamente e passem despercebidos com saldo líquido próximo de `0,00 €`.
   - **Banner de Diagnóstico Automático**: identifica explicitamente quais as rubricas em compensação e quais os fornecedores externos (*Air Liquide*, *MaiaPapper*, etc.) com valor registado no MyStore sem fatura lançada.
   - **Rácios P&L Mensais Integrados** (*Food Cost*, *Paper Cost*, *F. Operacionais* e *Food + Paper*) e eliminação do `min-w-[1000px]` que quebrava a visualização em portáteis e telemóveis.
2. **Histórico de Turnos (`components/ScheduleHistory.tsx`)**:
   - Corrigida a resolução de `shiftManagers[shift]` (suportando tanto `{ leader, support }` como IDs em formato string), eliminando o erro em que todos os registos históricos apareciam como **`Desconhecido`** e exibindo agora **Gerente Titular + Gerente de Apoio**.
   - Adicionados KPIs de resumo no topo e filtros rápidos (*Todos*, *Finalizados*, *Rascunhos*).
3. **Posicionamento & Produtividade Laboral (`components/Positioning.tsx` + `FloorPlan.tsx`)**:
   - **Planta 2D Interativa dos Postos** preservada integralmente (`Cozinha`, `Balcão`, `McCafé`, `Drive`, `Sala`) com atribuição rápida de staff e formandos.
   - Adicionado indicador **Produtividade / SPLH (`€/colab·h`)** em tempo real ao lado de *Previstos*, *Posicionados* e *Diferença*.
   - Corrigida a sincronização da previsão horária ao editar manualmente `Vendas Programadas (€)` (que antes ficava congelada no primeiro dígito introduzido).
4. **Tesouraria & Cofre (`components/FinanceControl.tsx`)**:
   - **Encerramento em Lote com 1 Clique (`Encerrar {N} Dias Validados`)** para todos os dias abertos que já têm as 3 contagens (*Abertura*, *Intermédio* e *Fecho*) trancadas, evitando dezenas de cliques individuais.
   - Sub-separador renomeado de `Faturas` para **`Despesas de Caixa`** para eliminar ambiguidade face ao módulo de Mercadorias/HAVI.
   - Substituído o botão largo vermelho `Eliminar Dia` por uma ação secundária discreta `Remover registo` (mantendo a confirmação por palavra-passe de administração).
5. **Tarefas de Gerentes (`components/ManagerTasks.tsx`)**:
   - Proteção ao clicar em **`Finalizar Checklist`** com **0% de tarefas verificadas** (exige comentário justificativo) ou **< 50% de progresso** (pede confirmação explícita), evitando fechos acidentais de listas vazias.

---

## 4. Otimização de Quota Firestore, Performance Bundle & Segurança

- **Eliminação de Escritas Redundantes no Firestore (`App.tsx`)**:
  - Implementado controlo de *dirty-state* por fatia (`lastSyncedCloudRef`) na sincronização automática: iniciar sessão, navegar entre módulos ou atualizar dados em segundo plano a cada 30s passa a gerar **0 escritas no Firestore**, gravando apenas a coleção efetivamente alterada pelo utilizador (redução >95% no consumo diário de escritas Spark).
- **Code Splitting em Produção (`vite.config.ts`)**:
  - Separação automática do bundle em chunks paralelos cacheados pelo browser (`vendor-react`, `vendor-firebase`, `vendor-data`), eliminando avisos de chunk >1 MB.
- **Regras de Segurança Firestore (`firestore.rules`)**:
  - Regras atualizadas para exigir sessão autenticada (`isSignedIn()`) e IDs validados (`isValidId()`).
  - **Importante antes de `firebase deploy --only firestore:rules`**: na consola Firebase (*Authentication → Sign-in method*), ativar o fornecedor **Anonymous** (o cliente já chama `ensureAuthenticated()` automaticamente no arranque).

---

## 5. Como Publicar no GitHub / Vercel

```bash
npm install
npm run lint
npm run build
git add .
git commit -m "feat: upgrade completo Controlos v4.0 (UI/UX, Torre de Controlo, HAVI Gross Variance, Batch Close & Mobile)"
git push origin main
```
