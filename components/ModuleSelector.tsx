import React, { useEffect, useMemo, useState } from 'react';
import {
  AppSettings,
  Employee,
  DailySchedule,
  HistoryEntry,
  CofreCount,
  DepositRecord,
  ProsegurWeeklyDeposit,
  DeliveryRecord,
  CreditNoteRecord,
  MonthlyOperationalData,
  ManagerTaskChecklist,
} from '../types';
import {
  getCofreCounts,
  getDeposits,
  getProsegurWeeklyDeposits,
  getDeliveries,
  getCredits,
  getMonthlyOps,
  getManagerChecklists,
} from '../services/firebaseService';
import {
  Users,
  Wallet,
  FileSpreadsheet,
  ArrowRight,
  ArrowUpRight,
  LogOut,
  ClipboardCheck,
  Settings,
  CalendarDays,
  Bell,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Moon,
  Sun,
  Target,
  ShieldCheck,
} from 'lucide-react';

type ModuleKey =
  | 'positioning'
  | 'finance'
  | 'billing'
  | 'manager_tasks'
  | 'agenda'
  | 'cleaning_plan'
  | 'safety'
  | 'objectives';

interface ModuleSelectorProps {
  restaurant: AppSettings;
  onSelectModule: (module: ModuleKey, subTab?: string) => void;
  onLogout: () => void;
  onSettingsClick: () => void;
  todayEventsCount?: number;
  onOpenTodayReminders?: () => void;
  employees?: Employee[];
  schedules?: DailySchedule[];
  history?: HistoryEntry[];
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
}

const HAVI_CODE_MAP: Record<string, string> = {
  Congelados: 'A',
  Refrigerados: 'B',
  'Secos Comida': 'C',
  'Secos Papel': 'D',
  'Manutenção & Limpeza': 'E',
  'Manutenção Limpeza': 'E',
  'Marketing IPL': 'F',
  'Marketing Geral': 'G',
  'Produtos Frescos': 'H',
  'Manutenção & Limpeza Compras': 'I',
  'Manutenção Limpeza Compras': 'I',
  Condimentos: 'J',
  'Condimentos Cozinha': 'L',
  'Material Adm': 'M',
  Manuais: 'N',
  'Ferramentas Utensilios': 'O',
  'Ferramentas Utensílios': 'O',
  'Ferramentas & Utensílios': 'O',
  'Marketing Geral Custo': 'P',
  Fardas: 'R',
  'Distribuição de Marketing': 'S',
  'Bulk Alimentar': 'T',
  'Bulk Papel': 'U',
};

const getCatFromGroup = (groupOrCode: string): string => {
  if (!groupOrCode) return 'Outros';
  const trimmed = groupOrCode.trim();
  if (
    ['Comida', 'Papel', 'F. Operacionais', 'Material Adm', 'Happy Meal', 'Outros'].includes(
      trimmed
    )
  ) {
    return trimmed;
  }
  const code = HAVI_CODE_MAP[trimmed] || trimmed;
  if (['A', 'B', 'C', 'H', 'J', 'L', 'T'].includes(code)) return 'Comida';
  if (['D', 'U'].includes(code)) return 'Papel';
  if (['E', 'I', 'O'].includes(code)) return 'F. Operacionais';
  if (['M'].includes(code)) return 'Material Adm';
  if (['F'].includes(code)) return 'Happy Meal';
  return 'Outros';
};

export const ModuleSelector: React.FC<ModuleSelectorProps> = ({
  restaurant,
  onSelectModule,
  onLogout,
  onSettingsClick,
  todayEventsCount = 0,
  onOpenTodayReminders,
  employees = [],
  schedules = [],
  history = [],
  darkMode = false,
  onToggleDarkMode,
}) => {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [loadingKpis, setLoadingKpis] = useState(true);
  const [cofreCounts, setCofreCounts] = useState<CofreCount[]>([]);
  const [deposits, setDeposits] = useState<DepositRecord[]>([]);
  const [weeklyProsegur, setWeeklyProsegur] = useState<ProsegurWeeklyDeposit[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [credits, setCredits] = useState<CreditNoteRecord[]>([]);
  const [monthlyOps, setMonthlyOps] = useState<MonthlyOperationalData | null>(null);
  const [checklists, setChecklists] = useState<ManagerTaskChecklist[]>([]);

  useEffect(() => {
    let active = true;
    const fetchSummary = async () => {
      setLoadingKpis(true);
      try {
        const [cofre, deps, weekly, dels, creds, mOps, chks] = await Promise.all([
          getCofreCounts(restaurant.restaurantId).catch(() => []),
          getDeposits(restaurant.restaurantId).catch(() => []),
          getProsegurWeeklyDeposits(restaurant.restaurantId).catch(() => []),
          getDeliveries(restaurant.restaurantId).catch(() => []),
          getCredits(restaurant.restaurantId).catch(() => []),
          getMonthlyOps(restaurant.restaurantId, currentMonthStr).catch(() => null),
          getManagerChecklists(restaurant.restaurantId).catch(() => []),
        ]);
        if (!active) return;
        setCofreCounts(cofre || []);
        setDeposits(deps || []);
        setWeeklyProsegur(weekly || []);
        setDeliveries(dels || []);
        setCredits(creds || []);
        setMonthlyOps(mOps);
        setChecklists(chks || []);
      } finally {
        if (active) setLoadingKpis(false);
      }
    };
    fetchSummary();
    return () => {
      active = false;
    };
  }, [restaurant.restaurantId, currentMonthStr]);

  const formatEUR = (v: number) =>
    v.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

  // Live Operational & Financial Telemetry
  const telemetry = useMemo(() => {
    // 1. Safe & Treasury
    const byDate: Record<string, { ab?: CofreCount; ta?: CofreCount; fe?: CofreCount; closed?: boolean }> = {};
    cofreCounts.forEach(c => {
      if (!byDate[c.date]) byDate[c.date] = {};
      if (c.turn === 'Abertura') byDate[c.date].ab = c;
      if (c.turn === 'Tarde') byDate[c.date].ta = c;
      if (c.turn === 'Fecho') byDate[c.date].fe = c;
      if (c.isDayClosed) byDate[c.date].closed = true;
    });

    const todaySafe = byDate[todayStr] || {};
    const readyToCloseDays = Object.entries(byDate).filter(
      ([, d]) => !d.closed && d.ab?.isLocked && d.ta?.isLocked && d.fe?.isLocked
    ).length;

    const getDepCash = (dep?: DepositRecord): number => {
      if (!dep) return 0;
      if (!dep.rows) return (dep as any).amount || 0;
      return dep.rows.reduce((sum, row) => sum + (row.dinheiro || 0) + (row.sangria || 0), 0);
    };

    const openWeek = weeklyProsegur.find(w => !w.endDate && w.status !== 'Encerrado');
    let openProsegurTotal = 0;
    if (openWeek) {
      let dailySum = 0;
      for (let idx = 0; idx < 7; idx++) {
        const dt = new Date(openWeek.startDate + 'T12:00:00');
        dt.setDate(dt.getDate() + idx);
        const dStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        const dayDeps = deposits.filter(d => d.date === dStr);
        const dayCash = dayDeps.reduce((s, d) => s + getDepCash(d), 0);
        const saved = openWeek.dailyDeposits?.find(d => d.dayIndex === idx)?.amount || 0;
        dailySum += dayCash > 0 ? dayCash : saved;
      }
      const coinSum = Number(openWeek.coinDepositsValue1 || 0) + Number(openWeek.coinDepositsValue2 || 0);
      openProsegurTotal = dailySum + coinSum;
    }

    // 2. Billing & HAVI vs MyStore Gross Variance
    const monthDeliveries = deliveries.filter(d => d.date?.startsWith(currentMonthStr));
    const monthCredits = credits.filter(c => c.date?.startsWith(currentMonthStr));

    let haviTotal = 0;
    const catNetDiffs: Record<string, number> = {
      Comida: 0,
      Papel: 0,
      'F. Operacionais': 0,
      'Material Adm': 0,
      'Happy Meal': 0,
      Outros: 0,
    };

    monthDeliveries.forEach(rec => {
      (rec.haviGroups || []).forEach(g => {
        haviTotal += g.total || 0;
      });
      Object.keys(catNetDiffs).forEach(cat => {
        const smsVal = rec.smsValues?.find(v => v.description === cat)?.amount || 0;
        const haviSub = rec.isManualInsertion
          ? (rec.manualHaviValues || {})[cat] || 0
          : (rec.haviGroups || [])
              .filter(g => getCatFromGroup(g.group || g.description) === cat)
              .reduce((s, g) => s + (g.total || 0), 0);
        const pDiff = (rec.priceDifferences || [])
          .filter(i => (i.category ? i.category === cat : getCatFromGroup(i.haviGroup || '') === cat))
          .reduce((s, i) => s + ((i.priceHavi || 0) - (i.priceSms || 0)), 0);
        const mDiff = (rec.missingProducts || [])
          .filter(m => getCatFromGroup(m.group) === cat)
          .reduce((s, m) => s + (m.priceHavi || 0), 0);
        catNetDiffs[cat] += haviSub - smsVal - pDiff - mDiff;
      });
    });

    monthCredits.forEach(c => {
      const valH = c.valueHavi ?? c.value ?? 0;
      const valS = c.valueMyStore ?? 0;
      haviTotal -= valH;
      const catH = getCatFromGroup(c.haviGroup || 'Outros');
      const catS = getCatFromGroup(c.myStoreGroup || 'Outros');
      catNetDiffs[catH] = (catNetDiffs[catH] || 0) - valH;
      catNetDiffs[catS] = (catNetDiffs[catS] || 0) + valS;
    });

    const netHaviDiff = Object.values(catNetDiffs).reduce((s, v) => s + v, 0);
    const grossHaviDiff = Object.values(catNetDiffs).reduce((s, v) => s + Math.abs(v), 0);

    // 3. Monthly P&L / Food & Paper Cost
    const vendasMes = monthlyOps?.vendasMes || 0;
    const foodPct =
      vendasMes > 0 && monthlyOps?.consumoComida
        ? (monthlyOps.consumoComida / vendasMes) * 100
        : null;
    const paperPct =
      vendasMes > 0 && monthlyOps?.consumoPapel
        ? (monthlyOps.consumoPapel / vendasMes) * 100
        : null;
    const missingSupplierInvoices = (monthlyOps?.otherSuppliers || []).filter(
      s => (s.myStoreValue || 0) > 0 && (!s.invoiceValue || s.invoiceValue === 0)
    ).length;

    // 4. Shifts & Checklists
    const todaySched = schedules.find(s => s.date === todayStr);
    const positionedToday = todaySched?.shifts?.ABERTURA
      ? new Set(Object.values(todaySched.shifts.ABERTURA).flat().filter(Boolean)).size
      : 0;
    const expiredDrafts = schedules.filter(s => {
      if (s.date >= todayStr) return false;
      const activeShifts = Object.keys(s.shifts || {}).filter(
        k => Object.keys((s.shifts as any)[k] || {}).length > 0
      );
      return activeShifts.some(sh => !(s.lockedShifts || []).includes(sh as any));
    }).length;

    const latestHistory = [...history].sort((a, b) => b.date.localeCompare(a.date))[0];
    const pendingChecklists = checklists.filter(c => !c.isApproved).length;

    return {
      todaySafe,
      readyToCloseDays,
      openProsegurTotal,
      haviTotal,
      netHaviDiff,
      grossHaviDiff,
      vendasMes,
      foodPct,
      paperPct,
      missingSupplierInvoices,
      positionedToday,
      expiredDrafts,
      latestHistory,
      pendingChecklists,
    };
  }, [cofreCounts, weeklyProsegur, deliveries, credits, monthlyOps, schedules, history, checklists, todayStr, currentMonthStr]);

  const formattedToday = now.toLocaleDateString('pt-PT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Executive Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-4 sm:px-8 h-16 flex justify-between items-center">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 font-black text-lg flex items-center justify-center shadow-sm shrink-0">
            M
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-extrabold text-slate-900 truncate">
                {restaurant.restaurantName}
              </h1>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                {restaurant.restaurantType}
              </span>
            </div>
            <p className="text-xs text-slate-500 capitalize truncate">{formattedToday}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {todayEventsCount > 0 && onOpenTodayReminders && (
            <button
              onClick={onOpenTodayReminders}
              className="flex items-center gap-1.5 text-amber-900 bg-amber-100/80 border border-amber-300 hover:bg-amber-200/70 transition-colors px-3 py-2 rounded-xl text-xs font-bold cursor-pointer"
              title="Ver lembretes de hoje"
            >
              <Bell size={15} className="text-amber-700" />
              <span className="hidden sm:inline">
                {todayEventsCount} {todayEventsCount === 1 ? 'Evento hoje' : 'Eventos hoje'}
              </span>
              <span className="sm:hidden">{todayEventsCount}</span>
            </button>
          )}
          {onToggleDarkMode && (
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="flex items-center gap-1.5 text-slate-600 bg-slate-100 hover:bg-slate-200/80 transition-colors px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer"
              title={darkMode ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
            >
              {darkMode ? <Sun size={15} className="text-amber-500" /> : <Moon size={15} />}
              <span className="hidden md:inline">{darkMode ? 'Claro' : 'Escuro'}</span>
            </button>
          )}
          <button
            onClick={onSettingsClick}
            className="flex items-center gap-2 text-slate-700 bg-slate-100 hover:bg-slate-200/80 transition-colors px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer"
          >
            <Settings size={16} />
            <span className="hidden sm:inline">Equipa ({employees.length})</span>
          </button>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      {/* Main Executive Cockpit */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-7 animate-fade-in">
        {/* Intro Heading */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-amber-600">
              Torre de Controlo da Unidade
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
              Visão Executiva &amp; Módulos para Menu Principal
            </h2>
          </div>
          {loadingKpis && (
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
              <RefreshCw size={13} className="animate-spin" /> A atualizar indicadores...
            </span>
          )}
        </div>

        {/* 6 Core Modules Grid (Clean Unified Design Language) */}
        <section>
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Módulos Operacionais &amp; Financeiros
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                key: 'positioning' as ModuleKey,
                title: 'Gestão Operacional & Turnos',
                desc: 'Planta 2D de posicionamento por posto, critérios de staffing, curva horária de vendas/GC e histórico.',
                icon: Users,
                accent: 'bg-blue-50 text-blue-700',
                meta:
                  telemetry.positionedToday > 0
                    ? `${telemetry.positionedToday} em turno hoje`
                    : 'Abrir posicionamento diário',
              },
              {
                key: 'finance' as ModuleKey,
                title: 'Tesouraria, Cofre & Depósitos',
                desc: 'Contagens de cofre (Abertura, Intermédio, Fecho), folhas de depósito, caixas surpresa, sangrias, Prosegur e despesas de caixa.',
                icon: Wallet,
                accent: 'bg-emerald-50 text-emerald-700',
                meta:
                  telemetry.readyToCloseDays > 0
                    ? `${telemetry.readyToCloseDays} dias prontos a encerrar`
                    : 'Cofre & Prosegur sincronizados',
              },
              {
                key: 'billing' as ModuleKey,
                title: 'Mercadorias, HAVI & Food Cost',
                desc: 'Conferência automática de faturas PDF HAVI vs MyStore, notas de crédito, quebras e apuramento mensal de Food & Paper Cost.',
                icon: FileSpreadsheet,
                accent: 'bg-purple-50 text-purple-700',
                meta:
                  telemetry.haviTotal > 0
                    ? `HAVI Mês: ${formatEUR(telemetry.haviTotal)}`
                    : 'Descargas, NC e Resumo P&L',
              },
              {
                key: 'manager_tasks' as ModuleKey,
                title: 'Tarefas & Checklists de Gerentes',
                desc: 'Acompanhamento semanal por departamento (Pessoas, Qualidade, Manutenção, Serviço), validação por supervisor e impressão oficial.',
                icon: ClipboardCheck,
                accent: 'bg-amber-50 text-amber-800',
                meta: `${checklists.length} checklists registadas`,
              },
              {
                key: 'agenda' as ModuleKey,
                title: 'Agenda Operacional Digital',
                desc: 'Calendário partilhado de auditorias, reuniões de gerência, aniversários de equipa, visitas e alertas automáticos.',
                icon: CalendarDays,
                accent: 'bg-indigo-50 text-indigo-700',
                meta:
                  todayEventsCount > 0
                    ? `${todayEventsCount} lembrete(s) ativo(s) hoje`
                    : 'Sem eventos pendentes hoje',
              },
              {
                key: 'cleaning_plan' as ModuleKey,
                title: 'Plano de Limpeza & Higiene',
                desc: 'Mapa semanal de higienização por turno, mapa do zelador, fluxograma de áreas por gerente e registo fotográfico.',
                icon: Sparkles,
                accent: 'bg-teal-50 text-teal-700',
                meta: 'Controlo semanal por área e turno',
              },
              {
                key: 'safety' as ModuleKey,
                title: 'Prevenção e Segurança',
                desc: 'Livro de verificações de HST, extintores e iluminação de emergência com mapas, mala de primeiros socorros, lista de funcionários e sensibilização mensal.',
                icon: ShieldCheck,
                accent: 'bg-rose-50 text-rose-700',
                meta: 'Controlo de segurança e conformidade',
              },
              {
                key: 'objectives' as ModuleKey,
                title: 'Objetivos',
                desc: 'Visão geral, histórico, desempenho por gerente, custo comida e relatórios.',
                icon: Target,
                accent: 'bg-amber-50 text-amber-700',
                meta: 'Acompanhamento de objetivos',
              },
            ].map(card => {
              const Icon = card.icon;
              return (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => onSelectModule(card.key)}
                  className="group bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm hover:shadow-lg hover:border-slate-300 transition-all duration-200 text-left flex flex-col justify-between min-h-[210px]"
                >
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${card.accent} group-hover:bg-amber-400 group-hover:text-slate-950`}
                      >
                        <Icon size={24} />
                      </div>
                      <span className="p-2 rounded-full text-slate-300 group-hover:text-slate-900 group-hover:bg-slate-100 transition-colors">
                        <ArrowUpRight size={18} />
                      </span>
                    </div>
                    <h4 className="text-lg font-extrabold text-slate-900 tracking-tight mb-1.5">
                      {card.title}
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed">{card.desc}</p>
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span className="tabular-nums truncate">{card.meta}</span>
                    <span className="inline-flex items-center gap-1 text-slate-900 font-bold group-hover:translate-x-0.5 transition-transform shrink-0">
                      Aceder <ArrowRight size={14} />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <footer className="pt-4 pb-6 text-center text-xs text-slate-400">
          Controlos de Gestão v4.0 • Plataforma Operacional &amp; Financeira Unificada
        </footer>
      </main>
    </div>
  );
};
