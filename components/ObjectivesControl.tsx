import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Employee, ObjectiveMonth, ObjectiveGoal, ObjectiveCheckpoint, ObjectiveCriterion, ObjectiveCriteriaSettings, ObjectiveTheme, ObjectiveThemesSettings, FoodCostEntry, ObjectiveCorrectiveAction, CorrectiveActionStatus } from '../types';
import { getObjectiveMonths, saveObjectiveMonth, getObjectiveCriteria, saveObjectiveCriteria, getObjectiveThemes, saveObjectiveThemes } from '../services/firebaseService';
import { Target, Plus, Save, Send, History, TrendingUp, Upload, FileSpreadsheet, Utensils, CalendarDays, ClipboardCheck, CheckCircle2, Clock3, AlertTriangle, Trash2, Printer } from 'lucide-react';

interface ObjectivesControlProps {
  restaurantId: string;
  employees: Employee[];
  activeSubTab: string;
  onTabChange?: (tab: string) => void;
}

type ReportFoodCostFields = Pick<FoodCostEntry,
  'foodOpening' | 'foodPurchases' | 'foodTransfers' | 'foodPromos' | 'foodLosses' | 'foodMeals' |
  'foodFinalInventory' | 'foodTheoretical' | 'foodWithoutComposition' | 'foodActualPnl' |
  'paperOpening' | 'paperPurchases' | 'paperTransfers' | 'paperPromos' | 'paperLosses' | 'paperMeals' |
  'paperFinalInventory' | 'paperTheoretical' | 'paperWithoutComposition' | 'paperActualPnl'
>;

interface ReportImportPreview {
  name: string;
  size: number;
  sheets: string[];
  sheetName?: string;
  sample: string[][];
  note?: string;
  reportDate: string;
  productSales: number | '';
  fields?: ReportFoodCostFields;
  missingLabels?: string[];
}

const normalizeReportText = (value: unknown) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('pt-PT')
  .replace(/[^a-z0-9]+/g, '');

const parseReportNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  let text = String(value ?? '').trim().replace(/[\s\u00a0€%]/g, '');
  if (!text) return undefined;
  const negative = /^\(.*\)$/.test(text);
  text = text.replace(/[()]/g, '');
  const comma = text.lastIndexOf(',');
  const dot = text.lastIndexOf('.');
  if (comma >= 0 && dot >= 0) {
    text = comma > dot ? text.replace(/\./g, '').replace(',', '.') : text.replace(/,/g, '');
  } else if (comma >= 0) {
    text = text.replace(',', '.');
  }
  const parsed = Number(text);
  if (!Number.isFinite(parsed)) return undefined;
  return negative ? -Math.abs(parsed) : parsed;
};

// Nos relatórios de operações as células estão fundidas, pelo que o valor pode
// começar algumas colunas depois do início do bloco Food/Paper.
const firstNumberFrom = (row: unknown[], start: number, end: number) => {
  for (let index = Math.max(0, start); index < Math.min(end, row.length); index += 1) {
    const parsed = parseReportNumber(row[index]);
    if (parsed !== undefined) return parsed;
  }
  return undefined;
};

const reportDateFromSheet = (rows: unknown[][]) => {
  const asIsoDate = (value: unknown) => {
    const match = String(value ?? '').trim().match(/^([0-3]?\d)[/.-](0?[1-9]|1[0-2])[/.-](20\d{2})$/);
    return match ? `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}` : '';
  };
  const top = rows.slice(0, 15);
  for (const row of top) {
    const labelIndex = row.findIndex(cell => /data/i.test(String(cell ?? '')));
    if (labelIndex < 0) continue;
    for (const cell of row.slice(labelIndex + 1)) {
      const date = asIsoDate(cell);
      if (date) return date;
    }
  }
  for (const row of top) {
    for (const cell of row) {
      const date = asIsoDate(cell);
      if (date) return date;
    }
  }
  return '';
};

const reportDateFromName = (name: string) => {
  const iso = name.match(/(20\d{2})[-_. ](0?[1-9]|1[0-2])[-_. ]([0-3]?\d)/);
  const local = name.match(/([0-3]?\d)[-_. ](0?[1-9]|1[0-2])[-_. ](20\d{2})/);
  const candidate = iso
    ? `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`
    : local ? `${local[3]}-${local[2].padStart(2, '0')}-${local[1].padStart(2, '0')}` : '';
  if (!candidate) return '';
  const date = new Date(`${candidate}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === candidate ? candidate : '';
};

function mapFoodCostReportRows(rows: unknown[][]) {
  const headerIndex = rows.findIndex(row => {
    const header = row.map(normalizeReportText);
    return header.includes('food') && header.includes('paper');
  });
  if (headerIndex < 0) return undefined;
  const headers = rows[headerIndex].map(normalizeReportText);
  const foodColumn = headers.indexOf('food');
  const paperColumn = headers.indexOf('paper');
  if (foodColumn < 0 || paperColumn < 0) return undefined;
  const headerLength = rows[headerIndex].length;
  const foodRangeEnd = paperColumn > foodColumn ? paperColumn : headerLength;
  const paperRangeEnd = paperColumn > foodColumn ? headerLength : foodColumn;
  const dataRows = rows.slice(headerIndex + 1);
  const labelColumn = dataRows
    .map(row => row.findIndex((cell, index) => index < foodColumn && String(cell ?? '').trim() !== '' && parseReportNumber(cell) === undefined))
    .find(index => index >= 0) ?? 0;
  const findRow = (number: number, keyword: string) => dataRows.find(row => {
    const label = normalizeReportText(row[labelColumn]);
    return label.startsWith(String(number)) && label.includes(keyword);
  });
  const amount = (number: number, keyword: string, column: number) => {
    const row = findRow(number, keyword);
    if (!row) return undefined;
    return column === foodColumn
      ? firstNumberFrom(row, foodColumn, foodRangeEnd)
      : firstNumberFrom(row, paperColumn, paperRangeEnd);
  };
  const sumRows = (parts: [number, string][], column: number) => parts.reduce((sum, [number, keyword]) => sum + (amount(number, keyword, column) ?? 0), 0);
  const aggregate = (total: [number, string], parts: [number, string][], column: number) => {
    const direct = amount(total[0], total[1], column);
    return direct === undefined ? sumRows(parts, column) : direct;
  };
  const get = (number: number, keyword: string, column: number) => amount(number, keyword, column) ?? 0;

  const foodOpening = get(1, 'stockabertura', foodColumn);
  const foodPurchases = get(2, 'compras', foodColumn);
  const foodTransfers = get(3, 'transferencias', foodColumn);
  const foodFinalInventory = get(4, 'stockdefecho', foodColumn);
  const foodLosses = aggregate([10, 'totalperdas'], [[8, 'perdasbrutas'], [9, 'perdasacabadas']], foodColumn);
  const foodPromos = aggregate([13, 'totalpromos'], [[11, 'promobrutas'], [12, 'promoacabadas']], foodColumn);
  const foodMeals = aggregate([16, 'totalrefeicoes'], [[14, 'refeicaogerente'], [15, 'refeicaofuncionario']], foodColumn);
  const foodTheoretical = get(7, 'custoteorico', foodColumn);
  const foodWithoutComposition = get(18, 'custosemcomposicao', foodColumn);
  const paperOpening = get(1, 'stockabertura', paperColumn);
  const paperPurchases = get(2, 'compras', paperColumn);
  const paperTransfers = get(3, 'transferencias', paperColumn);
  const paperFinalInventory = get(4, 'stockdefecho', paperColumn);
  const paperLosses = aggregate([10, 'totalperdas'], [[8, 'perdasbrutas'], [9, 'perdasacabadas']], paperColumn);
  const paperPromos = aggregate([13, 'totalpromos'], [[11, 'promobrutas'], [12, 'promoacabadas']], paperColumn);
  const paperMeals = aggregate([16, 'totalrefeicoes'], [[14, 'refeicaogerente'], [15, 'refeicaofuncionario']], paperColumn);
  const paperTheoretical = get(7, 'custoteorico', paperColumn);
  const paperWithoutComposition = get(18, 'custosemcomposicao', paperColumn);
  const foodActualPnl = amount(6, 'costatualpl', foodColumn) ?? foodOpening + foodPurchases + foodTransfers - foodPromos - foodLosses - foodMeals - foodFinalInventory;
  const paperActualPnl = amount(6, 'costatualpl', paperColumn) ?? paperOpening + paperPurchases + paperTransfers - paperPromos - paperLosses - paperMeals - paperFinalInventory;
  const salesLabel = (row: unknown[]) => normalizeReportText(row[labelColumn]);
  // As vendas ficam na secção de caixa, antes do bloco Food/Paper da folha.
  const netSalesRow = rows.find(row => {
    const label = salesLabel(row);
    return label.startsWith('vendasliquidas') && label.includes('produto') && !label.includes('naoproduto') && !label.includes('ano');
  });
  const grossSalesRow = rows.find(row => {
    const label = salesLabel(row);
    return (label.includes('vendas') && label.includes('produto')) || label.includes('totalvendas') || label.includes('productsales');
  });
  const productSales = firstNumberFrom(netSalesRow ?? [], foodColumn, foodRangeEnd)
    ?? firstNumberFrom(grossSalesRow ?? [], foodColumn, foodRangeEnd);
  const fields: ReportFoodCostFields = {
    foodOpening, foodPurchases, foodTransfers, foodPromos, foodLosses, foodMeals, foodFinalInventory,
    foodTheoretical, foodWithoutComposition, foodActualPnl,
    paperOpening, paperPurchases, paperTransfers, paperPromos, paperLosses, paperMeals, paperFinalInventory,
    paperTheoretical, paperWithoutComposition, paperActualPnl,
  };
  const missingLabels: string[] = [];
  const requiredRows: [string, number, string][] = [
    ['Stock Abertura', 1, 'stockabertura'], ['Compras', 2, 'compras'],
    ['Transferências', 3, 'transferencias'], ['Stock de Fecho', 4, 'stockdefecho'],
    ['Custo P/L atual', 6, 'costatualpl'], ['Custo Teórico', 7, 'custoteorico'],
    ['Custo sem Composição', 18, 'custosemcomposicao'],
  ];
  requiredRows.forEach(([label, number, keyword]) => { if (!findRow(number, keyword)) missingLabels.push(label); });
  if (!findRow(10, 'totalperdas') && !(findRow(8, 'perdasbrutas') && findRow(9, 'perdasacabadas'))) missingLabels.push('Total Perdas');
  if (!findRow(13, 'totalpromos') && !(findRow(11, 'promobrutas') && findRow(12, 'promoacabadas'))) missingLabels.push('Total Promos');
  if (!findRow(16, 'totalrefeicoes') && !(findRow(14, 'refeicaogerente') && findRow(15, 'refeicaofuncionario'))) missingLabels.push('Total Refeições');
  return {
    fields,
    productSales,
    reportDate: reportDateFromSheet(rows),
    missingLabels,
    sample: rows.slice(Math.max(0, headerIndex - 1), headerIndex + 7).map(row => row.map(cell => String(cell ?? '')).slice(0, 8)),
  };
}

const REPORT_AMOUNT_ROWS: { label: string; food: keyof ReportFoodCostFields; paper: keyof ReportFoodCostFields }[] = [
  { label: 'Stock Abertura', food: 'foodOpening', paper: 'paperOpening' },
  { label: 'Compras', food: 'foodPurchases', paper: 'paperPurchases' },
  { label: 'Transferências', food: 'foodTransfers', paper: 'paperTransfers' },
  { label: 'Stock de Fecho', food: 'foodFinalInventory', paper: 'paperFinalInventory' },
  { label: 'Custo P/L atual', food: 'foodActualPnl', paper: 'paperActualPnl' },
  { label: 'Custo Teórico', food: 'foodTheoretical', paper: 'paperTheoretical' },
  { label: 'Total Perdas', food: 'foodLosses', paper: 'paperLosses' },
  { label: 'Total Promos', food: 'foodPromos', paper: 'paperPromos' },
  { label: 'Total Refeições', food: 'foodMeals', paper: 'paperMeals' },
  { label: 'Custo sem Composição', food: 'foodWithoutComposition', paper: 'paperWithoutComposition' },
];

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const STATUS_OPTIONS: ObjectiveCheckpoint['status'][] = ['Superado','Atingido','Próximo','Não Atingido'];
const money = (v: number) => Number(v || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
const monthKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;

function checkpointsForMonth(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  const weekCount = Math.ceil(lastDay / 7);
  const weeks = Array.from({ length: weekCount }, (_, index) => {
    const startDay = index * 7 + 1;
    const endDay = Math.min(startDay + 6, lastDay);
    return {
      id: `week-${index + 1}`,
      label: `Semana ${index + 1}`,
      start: `${month}-${String(startDay).padStart(2, '0')}`,
      end: `${month}-${String(endDay).padStart(2, '0')}`,
    };
  });
  const fortnight = {
    id: 'fortnight',
    label: 'Quinzena',
    start: `${month}-01`,
    end: `${month}-${String(Math.min(15, lastDay)).padStart(2, '0')}`,
  };
  const monthly = {
    id: 'month',
    label: 'Mês',
    start: `${month}-01`,
    end: `${month}-${String(lastDay).padStart(2, '0')}`,
  };
  const weekContaining15 = weeks.findIndex(week => week.start <= `${month}-15` && week.end >= `${month}-15`);
  const insertionIndex = weekContaining15 >= 0 ? weekContaining15 + 1 : weeks.length;
  return [...weeks.slice(0, insertionIndex), fortnight, ...weeks.slice(insertionIndex), monthly];
}

const statusPoints = (status: ObjectiveCheckpoint['status'] | undefined, available: number) => {
  if (status === 'Superado') return available;
  if (status === 'Atingido') return available * .75;
  if (status === 'Próximo') return available * .5;
  return 0;
};

const hasRecordedResult = (checkpoint?: ObjectiveCheckpoint) =>
  checkpoint?.result !== undefined && checkpoint.result !== '' && Number.isFinite(Number(checkpoint.result));

const formatPercent = (value?: number) => value === undefined ? '—' : `${Math.round(value)}%`;

const statusCardTone = (status: ObjectiveCheckpoint['status']) =>
  status === 'Superado' ? 'border-sky-200 bg-sky-50' :
  status === 'Atingido' ? 'border-green-200 bg-green-50' :
  status === 'Próximo' ? 'border-amber-200 bg-amber-50' :
  'border-rose-200 bg-rose-50';

const classifyResult = (result: number | '', target: number, criterion?: ObjectiveCriterion): ObjectiveCheckpoint['status'] => {
  if (result === '' || !Number.isFinite(Number(result)) || !criterion) return '';
  const value = Number(result);
  const superado = Math.max(0, Number(criterion.superadoDelta) || 0);
  const near = Math.max(0, Number(criterion.nearDelta) || 0);
  if (criterion.direction === 'lower') {
    if (superado > 0 && value <= target - superado) return 'Superado';
    if (value <= target) return 'Atingido';
    if (value <= target + near) return 'Próximo';
    return 'Não Atingido';
  }
  if (superado > 0 && value >= target + superado) return 'Superado';
  if (value >= target) return 'Atingido';
  if (value >= target - near) return 'Próximo';
  return 'Não Atingido';
};

const formatNumber = (value: number) => new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 2 }).format(value);

const describeCriteriaRule = (target: number, criterion?: ObjectiveCriterion) => {
  if (!Number.isFinite(target) || target === 0) return '';
  const superado = Math.max(0, Number(criterion?.superadoDelta) || 0);
  const near = Math.max(0, Number(criterion?.nearDelta) || 0);
  if ((criterion?.direction || 'lower') === 'lower') {
    return [
      superado > 0 ? `≤ ${formatNumber(target - superado)} Superado` : '',
      `≤ ${formatNumber(target)} Atingido`,
      `≤ ${formatNumber(target + near)} Próximo`,
      `> ${formatNumber(target + near)} Não Atingido`,
    ].filter(Boolean).join(' · ');
  }
  return [
    superado > 0 ? `≥ ${formatNumber(target + superado)} Superado` : '',
    `≥ ${formatNumber(target)} Atingido`,
    `≥ ${formatNumber(target - near)} Próximo`,
    `< ${formatNumber(target - near)} Não Atingido`,
  ].filter(Boolean).join(' · ');
};

const statusTone = (status?: string) => `objective-status-badge ${status === 'Superado' ? 'objective-status-superado' : status === 'Atingido' ? 'objective-status-atingido' : status === 'Próximo' ? 'objective-status-proximo' : status === 'Não Atingido' ? 'objective-status-nao-atingido' : 'objective-status-pendente'}`;

const blankFoodCost = (date: string): FoodCostEntry => ({
  id: newId(), date, productSales: 0,
  foodOpening: 0, foodPurchases: 0, foodTransfers: 0, foodPromos: 0, foodLosses: 0, foodMeals: 0, foodFinalInventory: 0, foodTheoretical: 0, foodWithoutComposition: 0, foodActualPnl: 0,
  paperOpening: 0, paperPurchases: 0, paperTransfers: 0, paperPromos: 0, paperLosses: 0, paperMeals: 0, paperFinalInventory: 0, paperTheoretical: 0, paperWithoutComposition: 0, paperActualPnl: 0,
});

const ObjectivesControl: React.FC<ObjectivesControlProps> = ({ restaurantId, employees, activeSubTab, onTabChange }) => {
  const [months, setMonths] = useState<ObjectiveMonth[]>([]);
  const [criteriaSettings, setCriteriaSettings] = useState<ObjectiveCriteriaSettings>({ id: 'criteria', criteria: [], updatedAt: new Date().toISOString() });
  const [savedCriteriaSettings, setSavedCriteriaSettings] = useState<ObjectiveCriteriaSettings>({ id: 'criteria', criteria: [], updatedAt: new Date().toISOString() });
  const [themesSettings, setThemesSettings] = useState<ObjectiveThemesSettings>({ id: 'themes', themes: [], updatedAt: new Date().toISOString() });
  const [savedThemesSettings, setSavedThemesSettings] = useState<ObjectiveThemesSettings>({ id: 'themes', themes: [], updatedAt: new Date().toISOString() });
  const [selectedMonth, setSelectedMonth] = useState(monthKey());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [performanceFrom, setPerformanceFrom] = useState(`${new Date().getFullYear()}-01`);
  const [performanceTo, setPerformanceTo] = useState(monthKey());
  const [managerFilter, setManagerFilter] = useState('');
  const [actionDrafts, setActionDrafts] = useState<Record<string, { description: string; responsible: string; dueDate: string }>>({});

  useEffect(() => {
    let mounted = true;
    Promise.all([getObjectiveMonths(restaurantId), getObjectiveCriteria(restaurantId), getObjectiveThemes(restaurantId)])
      .then(([rows, settings, themes]) => {
        if (!mounted) return;
        setMonths(rows);
        if (settings) {
          setCriteriaSettings(settings);
          setSavedCriteriaSettings(settings);
        }
        if (themes?.themes?.length) {
          setThemesSettings(themes);
          setSavedThemesSettings(themes);
        } else {
          // Primeira utilização: os temas são lidos do mês mais recente com objetivos
          // e ficam por guardar até o utilizador confirmar a lista.
          const source = rows.find(row => row.goals.length > 0);
          const bootstrapped = source
            ? source.goals.map(goal => ({ id: goal.id, owner: goal.owner, metric: goal.metric, possiblePoints: goal.possiblePoints }))
            : [];
          setThemesSettings({ id: 'themes', themes: bootstrapped, updatedAt: new Date().toISOString() });
          setSavedThemesSettings({ id: 'themes', themes: themes?.themes || [], updatedAt: themes?.updatedAt || new Date().toISOString() });
        }
      })
      .catch(() => { if (mounted) setNotice('Não foi possível sincronizar os objetivos e as definições.'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [restaurantId]);

  const checkpointOptions = useMemo(() => checkpointsForMonth(/^\d{4}-\d{2}$/.test(selectedMonth) ? selectedMonth : monthKey()), [selectedMonth]);

  const today = new Date();
  const currentMonthKey = monthKey(today);
  const monthData = useMemo(() => months.find(m => m.month === selectedMonth), [months, selectedMonth]);
  const draft = monthData?.status !== 'submitted';
  // As definições da loja (temas e critérios) são as mesmas todos os meses e aplicam-se
  // ao mês atual e seguintes: os meses anteriores ficam gravados, sem recálculo nem edição.
  const monthInPast = Boolean(selectedMonth) && selectedMonth < currentMonthKey;
  const editable = draft && !monthInPast;
  // Temas fixos da loja: iguais em todos os meses.
  const storedThemes = savedThemesSettings.themes;
  const themesDraft = themesSettings.themes;
  const themesDirty = JSON.stringify(themesDraft) !== JSON.stringify(storedThemes);
  const themeGoal = (theme: ObjectiveTheme): ObjectiveGoal => ({
    id: theme.id, themeId: theme.id, owner: theme.owner, metric: theme.metric,
    target: 0, possiblePoints: theme.possiblePoints, checkpoints: {},
  });
  // Num mês em rascunho as linhas vêm dos temas: responsável, tema e pontos são os
  // da lista fixa; do mês vêm apenas o objetivo, os resultados e as ações.
  const goals = useMemo<ObjectiveGoal[]>(() => {
    if (!editable) return monthData?.goals || [];
    const existing = monthData?.goals || [];
    const used = new Set<string>();
    const rows = themesDraft.map(theme => {
      const metric = theme.metric.trim().toLocaleLowerCase('pt-PT');
      const match = existing.find(goal => !used.has(goal.id) && (goal.themeId
        ? goal.themeId === theme.id
        : goal.metric.trim().toLocaleLowerCase('pt-PT') === metric));
      if (!match) return themeGoal(theme);
      used.add(match.id);
      return { ...match, themeId: theme.id, owner: theme.owner, metric: theme.metric, possiblePoints: theme.possiblePoints };
    });
    return [...rows, ...existing.filter(goal => !used.has(goal.id))];
  }, [editable, monthData, themesDraft]);
  const foodRows = monthData?.foodCost || [];
  const criteria = savedCriteriaSettings.criteria;
  const criteriaDraft = criteriaSettings.criteria;
  // Critérios por indicador: a lista vem dos temas (fixos) e dos meses já registados, para
  // não depender do mês selecionado.
  const criteriaMetrics = useMemo(() => {
    const names = [...storedThemes.map(theme => theme.metric), ...months.flatMap(month => month.goals.map(goal => goal.metric))];
    const seen = new Set<string>();
    return names.filter(name => {
      const key = name.trim().toLocaleLowerCase('pt-PT');
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [storedThemes, months]);
  const ownerForMetric = (metric: string) => storedThemes.find(theme => theme.metric.trim().toLocaleLowerCase('pt-PT') === metric.trim().toLocaleLowerCase('pt-PT'))?.owner || '';
  const themeForGoal = (goal: ObjectiveGoal) => (goal.themeId ? themesDraft.find(theme => theme.id === goal.themeId) : undefined);
  // Custo comida e custo papel têm objetivo próprio de cada semana (depende do inventário).
  const usesWeeklyTarget = (metric: string) => /custo/i.test(metric) && /(comida|papel)/i.test(metric);
  const targetForMetric = (metric: string) => {
    const key = metric.trim().toLocaleLowerCase('pt-PT');
    const match = goals.find(goal => goal.metric.trim().toLocaleLowerCase('pt-PT') === key);
    if (match) return match.target;
    const latest = [...months].sort((a, b) => b.month.localeCompare(a.month)).find(month => month.goals.some(goal => goal.metric.trim().toLocaleLowerCase('pt-PT') === key));
    return latest?.goals.find(goal => goal.metric.trim().toLocaleLowerCase('pt-PT') === key)?.target;
  };
  const findCriterion = (metric: string) => criteria.find(c => c.metric.trim().toLocaleLowerCase('pt-PT') === metric.trim().toLocaleLowerCase('pt-PT'));
  const resolveCheckpoint = (goal: ObjectiveGoal, checkpointId: string) => {
    const saved = goal.checkpoints[checkpointId];
    if (!saved || !editable) return saved;
    const status = classifyResult(saved.result, Number(saved.target ?? goal.target), findCriterion(goal.metric));
    return { ...saved, status, points: status ? statusPoints(status, Number(goal.possiblePoints || 0)) : undefined };
  };
  const saveDraft = async (updated: ObjectiveMonth) => {
    setSaving(true); setNotice('');
    try {
      const saved = { ...updated, updatedAt: new Date().toISOString() };
      await saveObjectiveMonth(restaurantId, saved);
      setMonths(prev => [...prev.filter(m => m.month !== saved.month), saved].sort((a,b) => b.month.localeCompare(a.month)));
      setNotice('Alterações guardadas e sincronizadas.');
    } catch { setNotice('Não foi possível guardar. Verifique a ligação e tente novamente.'); }
    finally { setSaving(false); window.setTimeout(() => setNotice(''), 3500); }
  };
  const saveCriteria = async (next: ObjectiveCriterion[]) => {
    const updated: ObjectiveCriteriaSettings = { id: 'criteria', criteria: next, updatedAt: new Date().toISOString() };
    setSaving(true); setNotice('');
    try {
      await saveObjectiveCriteria(restaurantId, updated);
      setCriteriaSettings(updated);
      setSavedCriteriaSettings(updated);
      setNotice('Definições guardadas e sincronizadas.');
    } catch { setNotice('Não foi possível guardar as definições.'); }
    finally { setSaving(false); window.setTimeout(() => setNotice(''), 3500); }
  };
  const updateCriteriaDraft = (criteria: ObjectiveCriterion[]) => {
    setCriteriaSettings(prev => ({ ...prev, criteria, updatedAt: new Date().toISOString() }));  };
  // Na Visão Geral só aparecem as semanas já preenchidas e as fechas (quinzena/mês) já registadas.
  const overviewCheckpoints = (() => {
    const hasAnyResult = (checkpointId: string) => goals.some(goal => hasRecordedResult(resolveCheckpoint(goal, checkpointId)));
    let lastWeekIndex = 0;
    checkpointOptions.forEach(cp => {
      const match = cp.id.match(/^week-(\d+)$/);
      if (match && hasAnyResult(cp.id)) lastWeekIndex = Math.max(lastWeekIndex, Number(match[1]));
    });
    return checkpointOptions.filter(cp => {
      const match = cp.id.match(/^week-(\d+)$/);
      return match ? Number(match[1]) <= lastWeekIndex : hasAnyResult(cp.id);
    });
  })();

  const criterionForDraft =  (metric: string) => criteriaDraft.find(c => c.metric.trim().toLocaleLowerCase('pt-PT') === metric.trim().toLocaleLowerCase('pt-PT'));
  const patchCriterionForMetric = (metric: string, patch: Partial<ObjectiveCriterion>) => {
    const existing = criterionForDraft(metric);
    if (existing) updateCriteriaDraft(criteriaDraft.map(c => c.id === existing.id ? { ...c, ...patch } : c));
    else if (metric.trim()) updateCriteriaDraft([...criteriaDraft, { id: newId(), metric: metric.trim(), direction: 'lower', superadoDelta: 0, nearDelta: 0, ...patch }]);
  };
  const updateLocalMonth = (updated: ObjectiveMonth) => {
    setMonths(prev => [...prev.filter(m => m.month !== updated.month), updated].sort((a,b) => b.month.localeCompare(a.month)));
  };
  const baseMonth = (): ObjectiveMonth => monthData
    ? { ...monthData, goals }
    : { id: selectedMonth, month: selectedMonth, status: 'draft', goals, foodCost: [], updatedAt: new Date().toISOString() };
  const patchGoal = (id: string, patch: Partial<ObjectiveGoal>) => {
    const base = baseMonth();
    updateLocalMonth({ ...base, goals: base.goals.map(g => g.id === id ? { ...g, ...patch } : g) });
  };
  const addTheme = () => setThemesSettings(prev => ({
    ...prev, updatedAt: new Date().toISOString(),
    themes: [...prev.themes, { id: newId(), owner: '', metric: '', possiblePoints: 0 }],
  }));
  const patchTheme = (id: string, patch: Partial<ObjectiveTheme>) => setThemesSettings(prev => ({
    ...prev, updatedAt: new Date().toISOString(),
    themes: prev.themes.map(theme => theme.id === id ? { ...theme, ...patch } : theme),
  }));
  const removeTheme = (id: string) => setThemesSettings(prev => ({
    ...prev, updatedAt: new Date().toISOString(),
    themes: prev.themes.filter(theme => theme.id !== id),
  }));
  const saveThemes = async () => {
    const updated: ObjectiveThemesSettings = {
      id: 'themes', updatedAt: new Date().toISOString(),
      themes: themesDraft.filter(theme => theme.metric.trim() !== ''),
    };
    setSaving(true); setNotice('');
    try {
      await saveObjectiveThemes(restaurantId, updated);
      setThemesSettings(updated);
      setSavedThemesSettings(updated);
      setNotice('Temas guardados. Passam a ser os mesmos em todos os meses; em cada mês só se altera o objetivo.');
    } catch { setNotice('Não foi possível guardar os temas. Verifique a ligação e tente novamente.'); }
    finally { setSaving(false); window.setTimeout(() => setNotice(''), 3500); }
  };
  const addCorrectiveAction = (goal: ObjectiveGoal) => {
    const draftAction = actionDrafts[goal.id];
    if (!draftAction?.description.trim()) return;
    const action: ObjectiveCorrectiveAction = {
      id: newId(), description: draftAction.description.trim(), responsible: draftAction.responsible,
      dueDate: draftAction.dueDate, status: 'Por iniciar', createdAt: new Date().toISOString(),
    };
    patchGoal(goal.id, { correctiveActions: [...(goal.correctiveActions || []), action] });
    setActionDrafts(prev => ({ ...prev, [goal.id]: { description: '', responsible: '', dueDate: '' } }));
  };
  const patchCorrectiveAction = (goal: ObjectiveGoal, actionId: string, patch: Partial<ObjectiveCorrectiveAction>) => {
    const normalizedPatch = patch.status
      ? { ...patch, completedAt: patch.status === 'Concluída' ? new Date().toISOString() : undefined }
      : patch;
    patchGoal(goal.id, { correctiveActions: (goal.correctiveActions || []).map(action => action.id === actionId ? { ...action, ...normalizedPatch } : action) });
  };
  const removeCorrectiveAction = (goal: ObjectiveGoal, actionId: string) => {
    patchGoal(goal.id, { correctiveActions: (goal.correctiveActions || []).filter(action => action.id !== actionId) });
  };
  const addFoodRow = () => {
    const base = baseMonth();
    updateLocalMonth({ ...base, foodCost: [...base.foodCost, blankFoodCost(`${selectedMonth}-01`)] });
  };
  const patchFood = (id: string, patch: Partial<FoodCostEntry>) => {
    const base = baseMonth();
    updateLocalMonth({ ...base, foodCost: base.foodCost.map(row => row.id === id ? { ...row, ...patch } : row) });
  };
  const submitMonth = async () => {
    if (!window.confirm(`Submeter os objetivos de ${MONTH_NAMES[Number(selectedMonth.slice(5))-1]} ${selectedMonth.slice(0,4)} para o Histórico? Após submeter, o mês fica apenas para consulta.`)) return;
    const finalizedGoals = goals.map(goal => ({
      ...goal,
      checkpoints: Object.fromEntries((Object.entries(goal.checkpoints) as [string, ObjectiveCheckpoint][]).map(([id, checkpoint]) => {
        const status = classifyResult(checkpoint.result, Number(checkpoint.target ?? goal.target), findCriterion(goal.metric));
        return [id, { ...checkpoint, status, points: status ? statusPoints(status, Number(goal.possiblePoints || 0)) : undefined }];
      })),
    }));
    await saveDraft({ id: selectedMonth, month: selectedMonth, status: 'submitted', submittedAt: new Date().toISOString(), goals: finalizedGoals, foodCost: foodRows, updatedAt: new Date().toISOString() });
  };

  const submittedMonths = useMemo(() => months.filter(m => m.status === 'submitted').sort((a,b) => b.month.localeCompare(a.month)), [months]);
  const rangeMonths = useMemo(() => submittedMonths.filter(m => m.month >= performanceFrom && m.month <= performanceTo), [submittedMonths, performanceFrom, performanceTo]);
  const managers = useMemo(() => Array.from(new Set([...employees.map(e => e.name), ...goals.map(g => g.owner).filter(Boolean)])), [employees, goals]);
  const weeklyCheckpointOptions = checkpointOptions.filter(cp => /^week-\d+$/.test(cp.id));
  const currentWeekId = selectedMonth === monthKey(today) ? `week-${Math.ceil(today.getDate() / 7)}` : '';
  const latestWeekNumberToConsider = selectedMonth === monthKey(today) ? Math.ceil(today.getDate() / 7) : Number.POSITIVE_INFINITY;
  const summaryCheckpoint = weeklyCheckpointOptions
    .filter(cp => Number(cp.id.slice('week-'.length)) <= latestWeekNumberToConsider)
    .filter(cp => goals.some(goal => hasRecordedResult(resolveCheckpoint(goal, cp.id))))
    .at(-1);
  const getPointsPercentage = (checkpointId: string) => {
    const hasAnyResult = goals.some(goal => hasRecordedResult(resolveCheckpoint(goal, checkpointId)));
    const pointsPossible = goals.reduce((sum, goal) => sum + Number(goal.possiblePoints || 0), 0);
    if (!hasAnyResult || pointsPossible <= 0) return undefined;
    const pointsEarned = goals.reduce((sum, goal) => {
      const checkpoint = resolveCheckpoint(goal, checkpointId);
      return sum + (checkpoint?.status ? statusPoints(checkpoint.status, Number(goal.possiblePoints || 0)) : 0);
    }, 0);
    return pointsEarned / pointsPossible * 100;
  };
  const resultAsOfPercentage = summaryCheckpoint ? getPointsPercentage(summaryCheckpoint.id) : undefined;
  const summaryClassified = summaryCheckpoint
    ? goals.map(goal => ({ goal, checkpoint: resolveCheckpoint(goal, summaryCheckpoint.id) })).filter(row => row.checkpoint?.status)
    : [];
  const summarySegments = STATUS_OPTIONS.map(status => {
    const count = summaryClassified.filter(row => row.checkpoint?.status === status).length;
    return { status, count, total: summaryClassified.length, percentage: summaryClassified.length ? count / summaryClassified.length * 100 : undefined };
  });

  const updateCheckpoint = (goal: ObjectiveGoal, checkpointId: string, result: number | '') => {
    const criterion = findCriterion(goal.metric);
    const previous = goal.checkpoints[checkpointId];
    const status = classifyResult(result, Number(previous?.target ?? goal.target), criterion);
    const checkpoint: ObjectiveCheckpoint = {
      ...previous,
      result,
      status,
      points: status ? statusPoints(status, Number(goal.possiblePoints || 0)) : undefined,
      updatedAt: new Date().toISOString(),
    };
    patchGoal(goal.id, { checkpoints: { ...goal.checkpoints, [checkpointId]: checkpoint } });
  };
  const updateCheckpointTarget = (goal: ObjectiveGoal, checkpointId: string, target: number | '') => {
    const previous = goal.checkpoints[checkpointId];
    const nextTarget = target === '' ? undefined : Number(target);
    const status = classifyResult(previous?.result ?? '', Number(nextTarget ?? goal.target), findCriterion(goal.metric));
    const checkpoint: ObjectiveCheckpoint = {
      ...previous,
      result: previous?.result ?? '',
      target: nextTarget,
      status,
      points: status ? statusPoints(status, Number(goal.possiblePoints || 0)) : undefined,
      updatedAt: new Date().toISOString(),
    };
    patchGoal(goal.id, { checkpoints: { ...goal.checkpoints, [checkpointId]: checkpoint } });
  };
  const latestCheckpointFor = (goal: ObjectiveGoal) => {
    const entries = Object.entries(goal.checkpoints).filter(([, value]) => hasRecordedResult(value));
    const dated = entries.filter(([, value]) => value.updatedAt).sort((a, b) => (a[1].updatedAt || '').localeCompare(b[1].updatedAt || ''));
    const checkpointId = dated.length ? dated[dated.length - 1][0] : [...checkpointOptions].reverse().find(cp => goal.checkpoints[cp.id]?.result !== '' && goal.checkpoints[cp.id]?.result !== undefined)?.id;
    return checkpointId ? { id: checkpointId, value: resolveCheckpoint(goal, checkpointId) } : undefined;
  };
  const goalsNeedingCorrectiveAction = goals.filter(goal => {
    const latest = latestCheckpointFor(goal)?.value?.status;
    const hasOpenAction = (goal.correctiveActions || []).some(action => action.status !== 'Concluída');
    return hasOpenAction || latest === 'Próximo' || latest === 'Não Atingido';
  });
  const closedCorrectiveActions = goals.flatMap(goal => (goal.correctiveActions || []).filter(action => action.status === 'Concluída').map(action => ({ goal, action })));

  // O % estimado do relatório passa a ser o objetivo da semana e o % real o resultado.
  const syncFoodCostToGoals = (currentGoals: ObjectiveGoal[], rows: FoodCostEntry[]): ObjectiveGoal[] => {
    type WeekValues = { estimate?: number; actual?: number };
    const byWeek: { food: Record<string, WeekValues>; paper: Record<string, WeekValues> } = { food: {}, paper: {} };
    [...rows].sort((a, b) => a.date.localeCompare(b.date)).forEach(row => {
      const weekId = weekIdForDate(row.date);
      if (!weekId) return;
      const sales = Number(row.productSales || 0);
      byWeek.food[weekId] = { estimate: costPercent(foodCostEstimate(row), sales), actual: costPercent(foodCostActual(row), sales) };
      byWeek.paper[weekId] = { estimate: costPercent(paperCostEstimate(row), sales), actual: costPercent(paperCostActual(row), sales) };
    });
    return currentGoals.map(goal => {
      const section = /comida/i.test(goal.metric) ? byWeek.food : /papel/i.test(goal.metric) ? byWeek.paper : undefined;
      if (!section) return goal;
      let checkpoints = goal.checkpoints;
      Object.entries(section).forEach(([weekId, values]) => {
        if (values.estimate === undefined && values.actual === undefined) return;
        const previous = checkpoints[weekId];
        const target = values.estimate ?? previous?.target;
        const result = values.actual ?? previous?.result ?? '';
        const status = classifyResult(result, Number(target ?? goal.target), findCriterion(goal.metric));
        checkpoints = { ...checkpoints, [weekId]: { ...previous, target, result, status, points: status ? statusPoints(status, Number(goal.possiblePoints || 0)) : undefined, updatedAt: new Date().toISOString() } };
      });
      return { ...goal, checkpoints };
    });
  };
  const handleReportFiles = async (files: File[]) => {
    const entries: FoodCostEntry[] = [];
    const problems: string[] = [];
    for (const file of files) {
      if (/\.pdf$/i.test(file.name)) {
        problems.push(`${file.name}: PDF não é suportado; exporte o relatório para Excel ou CSV.`);
        continue;
      }
      try {
        const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
        let handled = false;
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          const rows = sheet ? XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }) as unknown[][] : [];
          const mapped = mapFoodCostReportRows(rows);
          if (!mapped) continue;
          handled = true;
          const reportDate = mapped.reportDate || reportDateFromName(file.name);
          if (!reportDate) { problems.push(`${file.name}: não encontrei a data do relatório.`); break; }
          if (mapped.missingLabels.length) { problems.push(`${file.name}: faltam linhas (${mapped.missingLabels.join(', ')}).`); break; }
          const targetMonth = reportDate.slice(0, 7);
          if (months.find(month => month.month === targetMonth)?.status === 'submitted') {
            problems.push(`${file.name}: o mês ${targetMonth} já foi submetido e não foi alterado.`);
            break;
          }
          entries.push({ ...mapped.fields, id: newId(), date: reportDate, productSales: mapped.productSales ?? 0 });
          break;
        }
        if (!handled) problems.push(`${file.name}: não encontrei as colunas Food e Paper nesta folha.`);
      } catch {
        problems.push(`${file.name}: não foi possível ler o ficheiro.`);
      }
    }
    if (entries.length) {
      setMonths(prev => {
        const byMonth = new Map<string, ObjectiveMonth>(prev.map(month => [month.month, month]));
        entries.forEach(entry => {
          const key = entry.date.slice(0, 7);
          const base = byMonth.get(key) || { id: key, month: key, status: 'draft' as const, goals: [], foodCost: [], updatedAt: new Date().toISOString() };
          const foodCost = [...base.foodCost, entry];
          byMonth.set(key, { ...base, foodCost, goals: syncFoodCostToGoals(base.goals, foodCost), updatedAt: new Date().toISOString() });
        });
        return Array.from(byMonth.values()).sort((a, b) => b.month.localeCompare(a.month));
      });
      const lastDate = entries[entries.length - 1].date;
      setSelectedMonth(lastDate.slice(0, 7));
      onTabChange?.('objectives_food_cost');
      setNotice(`Nova linha em Custo Comida e Papel: ${entries.map(entry => entry.date).join(', ')}. Reveja os valores e guarde para sincronizar.${problems.length ? ` Avisos: ${problems.join(' ')}` : ''}`);
    } else {
      setNotice(problems.join(' ') || 'Não foi possível importar os ficheiros selecionados.');
    }
    window.setTimeout(() => setNotice(''), 6000);
  };
  const inputClass = 'w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100';
  const monthPicker = <input aria-label="Mês" type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800" />;
  const printOverview = () => {
    const cleanup = () => document.body.classList.remove('printing-objectives-overview');
    document.body.classList.add('printing-objectives-overview');
    window.addEventListener('afterprint', cleanup, { once: true });
    window.print();
    window.setTimeout(cleanup, 1500);
  };

  if (loading) return <div className="rounded-2xl border bg-white p-10 text-center text-sm text-slate-500">A carregar objetivos…</div>;

  return <div className="space-y-5">
    {notice && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">{notice}</div>}

    {activeSubTab === 'objectives_overview' && <section id="objectives-overview-print" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-extrabold text-slate-900">Visão Geral Mensal</h3><p className="text-sm text-slate-500">Objetivos, resultados e validações ao longo do mês.</p><p className="hidden text-xs text-slate-500 print:block">{MONTH_NAMES[Number(selectedMonth.slice(5))-1]} {selectedMonth.slice(0,4)} · Resultado à data: {summaryCheckpoint?.label || 'sem resultados semanais'}</p></div><div className="flex items-center gap-2 print:hidden">{monthPicker}<button type="button" onClick={printOverview} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"><Printer size={16}/> Imprimir</button></div></div>
      <div id="objectives-overview-kpis" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi label={`Resultado à data${summaryCheckpoint ? ` · ${summaryCheckpoint.label}` : ''}`} value={formatPercent(resultAsOfPercentage)} icon={<Target size={18}/>} />
        {summarySegments.map(({ status, count, total, percentage }) => {
          const label = status === 'Superado' ? 'Superados' : status === 'Atingido' ? 'Atingidos' : status === 'Próximo' ? 'Próximos' : 'Não Atingidos';
          const icon = status === 'Superado' ? <TrendingUp size={18}/> : status === 'Atingido' ? <CheckCircle2 size={18}/> : status === 'Próximo' ? <Clock3 size={18}/> : <AlertTriangle size={18}/>;
          return <Kpi key={status} label={label} value={`${count}/${total} | ${formatPercent(percentage)}`} icon={icon} className={statusCardTone(status)} />;
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-4 print:hidden"><div className="flex items-center gap-2 text-sm font-bold text-slate-800"><CalendarDays size={17}/> Evolução semanal e mensal</div><p className="text-xs font-semibold text-slate-500">Resumo pela última semana com resultados{selectedMonth === monthKey(today) ? ', até à semana atual' : ''}: <span className="text-slate-800">{summaryCheckpoint?.label || 'sem dados semanais'}</span></p></div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table id="objectives-overview-table" className="min-w-[1500px] w-full text-left text-xs">
          <thead className="bg-slate-50 uppercase text-slate-500">
            <tr className="font-bold text-slate-800">
              <th rowSpan={2} className="objective-overview-primary-column p-3 text-center font-bold">Responsável</th>
              <th rowSpan={2} className="objective-overview-primary-column p-3 text-center font-bold">Tema</th>
              <th rowSpan={2} className="objective-overview-primary-column p-3 text-center font-bold">Objetivo</th>
              <th rowSpan={2} className="objective-overview-primary-column p-3 text-center font-bold">Pontos possíveis</th>
              {overviewCheckpoints.map(cp => {
                const isCurrentWeek = cp.id === currentWeekId;
                return <th key={cp.id} colSpan={2} className={`border-l border-slate-200 p-3 text-center font-bold ${isCurrentWeek ? 'objective-overview-current-week-group' : ''}`}>
                  {cp.label}{isCurrentWeek && <span className="ml-1 rounded bg-amber-100 px-1 py-0.5 text-[9px] font-bold text-amber-900">Atual</span>}
                </th>;
              })}
            </tr>
            <tr>{overviewCheckpoints.flatMap(cp => {
              const isCurrentWeek = cp.id === currentWeekId;
              return [
                <th key={`${cp.id}-result`} className={`border-l border-slate-200 p-2 ${isCurrentWeek ? 'objective-overview-current-week-group objective-overview-current-week-start' : ''}`}>Resultado</th>,
                <th key={`${cp.id}-status`} className={`p-2 ${isCurrentWeek ? 'objective-overview-current-week-group objective-overview-current-week-end' : ''}`}>Estado</th>,
              ];
            })}</tr>
          </thead>
          <tbody>
            {goals.map(g => <tr key={g.id} className="border-t border-slate-100">
              <td className="objective-overview-primary-column p-3 font-bold">{g.owner || '—'}</td>
              <td className="objective-overview-primary-column p-3 font-bold">{g.metric || '—'}</td>
              <td className="objective-overview-primary-column p-3 text-center font-bold">{g.target ?? '—'}</td>
              <td className="objective-overview-primary-column p-3 text-center font-bold">{g.possiblePoints ?? '—'}</td>
              {overviewCheckpoints.flatMap(cp => {
                const value = resolveCheckpoint(g, cp.id);
                const weekMatch = cp.id.match(/^week-(\d+)$/);
                const isCurrentWeek = cp.id === currentWeekId;
                const previous = weekMatch && Number(weekMatch[1]) > 1 ? resolveCheckpoint(g, `week-${Number(weekMatch[1]) - 1}`) : undefined;
                const direction = findCriterion(g.metric)?.direction;
                let trend: 'improved' | 'worsened' | 'same' | undefined;
                if (weekMatch && hasRecordedResult(value) && hasRecordedResult(previous) && direction) {
                  const currentResult = Number(value?.result);
                  const previousResult = Number(previous?.result);
                  trend = currentResult === previousResult ? 'same' : (direction === 'higher' ? currentResult > previousResult : currentResult < previousResult) ? 'improved' : 'worsened';
                }
                const trendText = trend === 'improved' ? '↑ Melhorou' : trend === 'worsened' ? '↓ Piorou' : trend === 'same' ? '→ Sem alteração' : '';
                const trendClass = trend === 'improved' ? 'text-green-700' : trend === 'worsened' ? 'text-rose-700' : 'text-slate-500';
                return [
                  <td key={`${g.id}-${cp.id}-result`} className={`border-l border-slate-100 p-2 text-center ${isCurrentWeek ? 'objective-overview-current-week-cell objective-overview-current-week-start' : ''}`}>
                    <div className="flex flex-wrap items-center justify-center gap-1.5"><span>{value?.result ?? '—'}</span>{trendText && <span title="Comparação com a semana anterior" aria-label={`Face à semana anterior: ${trendText.replace(/^[↑↓→] /, '')}`} className={`whitespace-nowrap text-[10px] font-bold ${trendClass}`}>{trendText}</span>}</div>
                  </td>,
                  <td key={`${g.id}-${cp.id}-status`} className={`p-2 text-center ${isCurrentWeek ? 'objective-overview-current-week-cell objective-overview-current-week-end' : ''}`}>
                    <span className={`rounded-full px-2 py-1 font-bold ${statusTone(value?.status)}`}>{value?.status || '—'}</span>
                  </td>,
                ];
              })}
            </tr>)}
            {goals.length === 0 && <EmptyRow text="Ainda não há objetivos neste mês. Configure-os na aba Objetivos." colSpan={4 + overviewCheckpoints.length * 2} />}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 bg-slate-50 font-extrabold text-slate-700">
              <td colSpan={4} className="objective-overview-primary-column p-3"></td>
              {overviewCheckpoints.map(cp => <td key={`${cp.id}-percentage`} colSpan={2} className={`border-l border-slate-200 p-3 text-center ${cp.id === currentWeekId ? 'objective-overview-current-week-group objective-overview-current-week-start objective-overview-current-week-end' : ''}`}>
                {/^week-\d+$/.test(cp.id) ? formatPercent(getPointsPercentage(cp.id)) : '—'}
              </td>)}
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex flex-wrap justify-end gap-2 print:hidden"><button disabled={!draft||!goals.length||saving} onClick={submitMonth} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"><Send size={15}/> Submeter mês para Histórico</button></div>
    </section>}

    {activeSubTab === 'objectives_setup' && <>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-extrabold text-slate-900">Objetivos do Mês</h3><p className="text-sm text-slate-500">Os temas e os responsáveis são iguais todos os meses. Em cada mês só se altera o objetivo de cada tema e se registam os resultados semanais, da quinzena e do mês.</p></div><div className="flex gap-2">{monthPicker}</div></div>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-2"><div><h4 className="text-base font-extrabold text-slate-900">Objetivos, gerentes e resultados</h4><p className="text-xs text-slate-500">O gerente, o tema e a pontuação são iguais todos os meses. O objetivo e os resultados (semana, quinzena e mês) são deste mês. Ao alterar um gerente, tema ou pontuação, guarde os temas para aplicar ao mês atual e seguintes.</p></div><div className="flex flex-wrap gap-2"><button onClick={addTheme} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><Plus size={14}/> Adicionar tema</button><button onClick={saveThemes} disabled={saving||!themesDirty} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"><Save size={14}/>{saving?'A guardar…':'Guardar temas'}</button></div></div>
        {themesDirty && <p className="text-xs font-semibold text-amber-800">Há alterações nos temas por guardar.</p>}
      </section>
      {!editable && <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm font-semibold text-sky-900">{draft ? 'Mês anterior: os valores ficam gravados e não são alterados pelas definições atuais.' : 'Este mês foi submetido e está em modo de consulta.'}</div>}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-white p-3"><span className="text-sm font-bold text-slate-700">Semanas e validações:</span><span className="text-xs text-slate-500">As semanas são organizadas em blocos de sete dias; a Semana 5 só aparece quando o mês ultrapassa 28 dias. A Quinzena fica logo após a semana que inclui o dia 15.</span></div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="min-w-[1250px] w-full border-collapse text-xs"><thead className="bg-slate-50 text-slate-600"><tr><th rowSpan={2} className="sticky left-0 z-10 min-w-36 border-b bg-slate-50 p-3 text-left">Gerente</th><th rowSpan={2} className="min-w-44 border-b p-3 text-left">Tema</th><th rowSpan={2} className="min-w-28 border-b p-3">Objetivo</th><th rowSpan={2} className="min-w-20 border-b p-3">Pontuação</th>{checkpointOptions.map(cp=><th key={cp.id} colSpan={1} className="min-w-28 border-b border-l border-slate-200 p-3 text-center">{cp.label}</th>)}<th rowSpan={2} className="border-b p-3">Ações</th></tr><tr>{checkpointOptions.map(cp=><th key={`${cp.id}-result`} className="min-w-24 border-l border-slate-200 p-2">Resultado</th>)}</tr></thead><tbody>{goals.map((g,i)=>{const theme=themeForGoal(g);return <tr key={g.id} className="border-t border-slate-100"><td className="sticky left-0 z-[1] border-r bg-white p-2">{theme ? <select value={theme.owner} onChange={e=>patchTheme(theme.id,{owner:e.target.value})} disabled={!editable} aria-label={`Gerente de ${theme.metric||`tema ${i+1}`}`} className="w-32 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs disabled:bg-slate-50"><option value="">Selecionar</option>{Array.from(new Set([...employees.map(employee=>employee.name),...themesDraft.map(item=>item.owner)].filter(Boolean))).map(name=><option key={name} value={name}>{name}</option>)}</select> : <span className="text-xs font-semibold text-slate-700">{g.owner||'—'}</span>}</td><td className="p-2">{theme ? <input value={theme.metric} onChange={e=>patchTheme(theme.id,{metric:e.target.value})} disabled={!editable} placeholder={`Tema ${i+1}`} aria-label={`Tema ${i+1}`} className="w-40 rounded-lg border border-slate-200 px-2 py-2 text-xs disabled:bg-slate-50"/> : <span className="text-xs font-semibold text-slate-800">{g.metric||<span className="text-slate-400">Tema por definir</span>}</span>}</td><td className="p-2"><input disabled={!editable} type="number" value={g.target} onChange={e=>patchGoal(g.id,{target:Number(e.target.value)})} aria-label={`${g.metric||`Tema ${i+1}`} · objetivo`} className="w-24 rounded-lg border border-slate-200 px-2 py-2 text-right text-xs disabled:bg-slate-50"/></td><td className="p-2">{theme ? <input type="number" value={theme.possiblePoints} onChange={e=>patchTheme(theme.id,{possiblePoints:Number(e.target.value)})} disabled={!editable} aria-label={`Pontuação de ${theme.metric||`tema ${i+1}`}`} className="w-20 rounded-lg border border-slate-200 px-2 py-2 text-right text-xs disabled:bg-slate-50"/> : <span className="text-xs font-semibold text-slate-700">{g.possiblePoints}</span>}</td>{checkpointOptions.map(cp=>{const value=resolveCheckpoint(g,cp.id);return <React.Fragment key={`${g.id}-${cp.id}`}><td className="border-l border-slate-100 p-2">{usesWeeklyTarget(g.metric) && /^week-\d+$/.test(cp.id) && <input disabled={!editable} type="number" step="0.01" value={value?.target??''} onChange={e=>updateCheckpointTarget(g,cp.id,e.target.value===''?'':Number(e.target.value))} aria-label={`${g.metric||`Tema ${i+1}`} · ${cp.label} · objetivo da semana`} placeholder="Objetivo" title="Objetivo desta semana (depende do inventário)" className="mb-1 w-24 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-right text-[11px] font-semibold text-amber-900 disabled:bg-slate-50"/>}<input disabled={!editable} type="number" step="0.01" value={value?.result??''} onChange={e=>updateCheckpoint(g,cp.id,e.target.value===''?'':Number(e.target.value))} aria-label={`${g.metric||`Tema ${i+1}`} · ${cp.label} · resultado`} placeholder={cp.label} className="w-24 rounded-lg border border-slate-200 px-2 py-2 text-right text-xs disabled:bg-slate-50"/></td></React.Fragment>})}<td className="p-2 text-center">{theme ? <button disabled={!editable} onClick={()=>removeTheme(theme.id)} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-40" aria-label={`Remover ${theme.metric||`tema ${i+1}`} da lista de temas`}><Trash2 size={16}/></button> : <button disabled={!editable||saving} onClick={()=>saveDraft({...baseMonth(),goals:goals.filter(x=>x.id!==g.id)})} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-40" aria-label={`Remover objetivo fora dos temas ${i+1}`}><Trash2 size={16}/></button>}</td></tr>})}{goals.length===0&&<tr><td colSpan={5+checkpointOptions.length} className="p-8 text-center text-slate-500">Ainda não há temas definidos. Use “Adicionar tema” e preencha o gerente, o tema e a pontuação; ficam iguais para todos os meses.</td></tr>}</tbody></table></div>
      <div className="flex justify-end"><button disabled={!editable||saving} onClick={()=>saveDraft({id:selectedMonth,month:selectedMonth,status:monthData?.status||'draft',goals,foodCost:foodRows,updatedAt:new Date().toISOString()})} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"><Save size={15}/>{saving?'A guardar…':'Guardar e sincronizar'}</button></div>

      <section className="space-y-5 border-t border-slate-200 pt-6">
      <div><h3 className="text-xl font-extrabold text-slate-900">Ações Corretivas</h3><p className="text-sm text-slate-500">As ações pertencem ao mês selecionado. Os temas a trabalhar são sinalizados pelo resultado mais recente e mantêm-se aqui enquanto houver ações em aberto.</p></div>
      <section className="space-y-4"><div className="flex items-center gap-2"><Clock3 size={18} className="text-amber-600"/><h4 className="text-lg font-extrabold text-slate-900">Ações em aberto</h4></div>
        <div className="space-y-4">{goalsNeedingCorrectiveAction.map(goal=>{const latest=latestCheckpointFor(goal);const result=latest?.value;const form=actionDrafts[goal.id]||{description:'',responsible:'',dueDate:''};const openActions=(goal.correctiveActions||[]).filter(action=>action.status!=='Concluída');return <article key={goal.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-xs font-bold uppercase tracking-wide text-slate-500">{goal.owner||'Responsável por atribuir'}</div><h5 className="mt-1 text-base font-extrabold text-slate-900">{goal.metric||'Tema por definir'}</h5><p className="mt-1 text-sm text-slate-600">Último resultado{latest?` (${checkpointOptions.find(cp=>cp.id===latest.id)?.label})`:''}: <strong>{result?.result??'—'}</strong> · Objetivo <strong>{goal.target}</strong></p></div>{result?.status&&<span className={statusTone(result.status)}>{result.status}</span>}</div>
          <div className="mt-4 space-y-2">{openActions.map(action=><div key={action.id} className="grid gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 md:grid-cols-[1.5fr_1fr_.8fr_1fr_auto] md:items-center"><textarea disabled={!editable} rows={2} value={action.description} onChange={e=>patchCorrectiveAction(goal,action.id,{description:e.target.value})} className="w-full resize-y rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm disabled:bg-slate-100" aria-label="Medida corretiva"/><select disabled={!editable} value={action.responsible} onChange={e=>patchCorrectiveAction(goal,action.id,{responsible:e.target.value})} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm disabled:bg-slate-100"><option value="">Responsável</option>{managers.map(name=><option key={name} value={name}>{name}</option>)}</select><input disabled={!editable} type="date" value={action.dueDate} onChange={e=>patchCorrectiveAction(goal,action.id,{dueDate:e.target.value})} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm disabled:bg-slate-100" aria-label="Prazo"/><select disabled={!editable} value={action.status} onChange={e=>patchCorrectiveAction(goal,action.id,{status:e.target.value as CorrectiveActionStatus})} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm disabled:bg-slate-100"><option>Por iniciar</option><option>Em curso</option><option>Concluída</option></select><button disabled={!editable} onClick={()=>removeCorrectiveAction(goal,action.id)} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-40" aria-label="Remover medida"><Trash2 size={16}/></button></div>)}{openActions.length===0&&<p className="text-xs text-slate-500">Ainda sem medidas em aberto para este tema.</p>}</div>
          <div className="mt-3 grid gap-2 rounded-xl border border-dashed border-slate-300 p-3 md:grid-cols-[1.5fr_1fr_.8fr_auto] md:items-end"><label className="text-xs font-bold text-slate-500">Nova medida corretiva<textarea disabled={!editable} rows={2} value={form.description} onChange={e=>setActionDrafts(prev=>({...prev,[goal.id]:{...form,description:e.target.value}}))} placeholder="Descreva a ação a implementar neste mês" className="mt-1 w-full resize-y rounded-lg border border-slate-200 px-2.5 py-2 text-sm disabled:bg-slate-100"/></label><label className="text-xs font-bold text-slate-500">Responsável<select disabled={!editable} value={form.responsible} onChange={e=>setActionDrafts(prev=>({...prev,[goal.id]:{...form,responsible:e.target.value}}))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm"><option value="">Selecionar gerente</option>{managers.map(name=><option key={name} value={name}>{name}</option>)}</select></label><label className="text-xs font-bold text-slate-500">Prazo<input disabled={!editable} type="date" value={form.dueDate} onChange={e=>setActionDrafts(prev=>({...prev,[goal.id]:{...form,dueDate:e.target.value}}))} className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm"/></label><button disabled={!editable||!form.description.trim()} onClick={()=>addCorrectiveAction(goal)} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2.5 text-xs font-bold text-white disabled:opacity-40"><Plus size={14}/> Adicionar</button></div>
        </article>})}{goalsNeedingCorrectiveAction.length===0&&<div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><ClipboardCheck className="mx-auto mb-2 text-slate-400"/><p className="font-bold text-slate-700">Sem ações em aberto</p><p className="mt-1 text-sm text-slate-500">Os temas Próximo e Não Atingido, com base no último resultado do mês, aparecem automaticamente aqui.</p></div>}</div>
      </section>
      <section className="space-y-3"><div className="flex items-center gap-2"><History size={18} className="text-slate-500"/><h4 className="text-lg font-extrabold text-slate-900">Ações fechadas · Histórico</h4></div><div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="min-w-[720px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Tema</th><th className="p-3">Medida corretiva</th><th className="p-3">Responsável</th><th className="p-3">Prazo</th><th className="p-3">Concluída em</th></tr></thead><tbody>{closedCorrectiveActions.map(({goal,action})=><tr key={action.id} className="border-t"><td className="p-3 font-semibold">{goal.metric||'—'}</td><td className="p-3">{action.description}</td><td className="p-3">{action.responsible||'—'}</td><td className="p-3">{action.dueDate?new Date(`${action.dueDate}T12:00:00`).toLocaleDateString('pt-PT'):'—'}</td><td className="p-3">{action.completedAt?new Date(action.completedAt).toLocaleDateString('pt-PT'):'—'}</td></tr>)}{closedCorrectiveActions.length===0&&<EmptyRow colSpan={5} text="Ainda não há ações fechadas neste mês."/>}</tbody></table></div></section>
      <div className="flex justify-end"><button disabled={!editable||saving} onClick={()=>saveDraft({id:selectedMonth,month:selectedMonth,status:monthData?.status||'draft',goals,foodCost:foodRows,updatedAt:new Date().toISOString()})} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"><Save size={15}/>{saving?'A guardar…':'Guardar ações corretivas'}</button></div>
          </section>

    </>}

    {activeSubTab === 'objectives_history' && <>
      <div><h3 className="text-xl font-extrabold text-slate-900">Histórico Submetido</h3><p className="text-sm text-slate-500">Os meses submetidos na Visão Geral ficam arquivados para consulta.</p></div>
      <div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Mês</th><th className="p-3">Objetivos</th><th className="p-3">Responsáveis</th><th className="p-3">Submetido em</th><th className="p-3">Ação</th></tr></thead><tbody>{submittedMonths.map(m=><tr key={m.month} className="border-t"><td className="p-3 font-bold">{MONTH_NAMES[Number(m.month.slice(5))-1]} {m.month.slice(0,4)}</td><td className="p-3">{m.goals.length}</td><td className="p-3">{Array.from(new Set(m.goals.map(g=>g.owner).filter(Boolean))).join(', ')||'—'}</td><td className="p-3">{m.submittedAt?new Date(m.submittedAt).toLocaleDateString('pt-PT'):'—'}</td><td className="p-3"><button onClick={()=>{setSelectedMonth(m.month);setNotice(`A consultar ${MONTH_NAMES[Number(m.month.slice(5))-1]} ${m.month.slice(0,4)}.`);window.setTimeout(()=>setNotice(''),2500);}} className="rounded-lg border px-3 py-1.5 text-xs font-bold hover:bg-slate-50">Consultar</button></td></tr>)}{!submittedMonths.length&&<EmptyRow colSpan={5} text="Ainda não há meses submetidos."/>}</tbody></table></div>
      {monthData?.status==='submitted'&&<div className="rounded-2xl border bg-white p-4"><h4 className="mb-3 font-extrabold">Consulta: {MONTH_NAMES[Number(selectedMonth.slice(5))-1]} {selectedMonth.slice(0,4)}</h4><div className="overflow-x-auto"><table className="min-w-[700px] w-full text-sm"><thead className="bg-slate-50 text-xs uppercase"><tr><th className="p-2 text-left">Gerente</th><th className="p-2 text-left">Tema</th><th className="p-2">Objetivo</th>{checkpointOptions.map(c=><th key={c.id} className="p-2">{c.label}</th>)}</tr></thead><tbody>{monthData.goals.map(g=><tr key={g.id} className="border-t"><td className="p-2">{g.owner}</td><td className="p-2">{g.metric}</td><td className="p-2 text-center">{g.target}</td>{checkpointOptions.map(c=><td key={c.id} className="p-2 text-center">{g.checkpoints[c.id]?.result??'—'}<div className="mt-1"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusTone(g.checkpoints[c.id]?.status)}`}>{g.checkpoints[c.id]?.status||'—'}</span></div></td>)}</tr>)}</tbody></table></div></div>}
    </>}

    {activeSubTab === 'objectives_manager_performance' && <>
      <div><h3 className="text-xl font-extrabold text-slate-900">Desempenho por Gerente</h3><p className="text-sm text-slate-500">Consulte objetivos atribuídos e resultados de meses submetidos.</p></div>
      <div className="flex flex-wrap gap-3 rounded-2xl border bg-white p-4"><label className="text-xs font-bold text-slate-500">Gerente<select value={managerFilter} onChange={e=>setManagerFilter(e.target.value)} className={`${inputClass} mt-1 min-w-52`}><option value="">Todos os gerentes</option>{Array.from(new Set([...employees.map(e=>e.name),...submittedMonths.flatMap(m=>m.goals.map(g=>g.owner))].filter(Boolean))).map(n=><option key={n} value={n}>{n}</option>)}</select></label><label className="text-xs font-bold text-slate-500">De<input type="month" value={performanceFrom} onChange={e=>setPerformanceFrom(e.target.value)} className={`${inputClass} mt-1`}/></label><label className="text-xs font-bold text-slate-500">Até<input type="month" value={performanceTo} onChange={e=>setPerformanceTo(e.target.value)} className={`${inputClass} mt-1`}/></label></div>
      <div className="overflow-x-auto rounded-2xl border bg-white"><table className="min-w-[760px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Mês</th><th className="p-3">Gerente</th><th className="p-3">Tema</th><th className="p-3">Objetivo</th><th className="p-3">Resultado mês</th><th className="p-3">Classificação</th></tr></thead><tbody>{rangeMonths.flatMap(m=>m.goals.filter(g=>!managerFilter||g.owner===managerFilter).map(g=><tr key={`${m.month}-${g.id}`} className="border-t"><td className="p-3">{MONTH_NAMES[Number(m.month.slice(5))-1]} {m.month.slice(0,4)}</td><td className="p-3 font-semibold">{g.owner||'—'}</td><td className="p-3">{g.metric||'—'}</td><td className="p-3">{g.target}</td><td className="p-3">{g.checkpoints.month?.result??'—'}</td><td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${statusTone(g.checkpoints.month?.status)}`}>{g.checkpoints.month?.status||'Por validar'}</span></td></tr>))}{!rangeMonths.length&&<EmptyRow colSpan={6} text="Não existem meses submetidos neste período."/>}</tbody></table></div>
    </>}

    {activeSubTab === 'objectives_food_cost' && <>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-extrabold text-slate-900">Custo Comida e Papel</h3><p className="text-sm text-slate-500">Estrutura baseada na tabela partilhada. Os campos calculados seguem as fórmulas da folha.</p></div><div className="flex gap-2">{monthPicker}<button onClick={addFoodRow} disabled={!editable||saving} className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-3 py-2 text-sm font-extrabold text-slate-950 disabled:opacity-40"><Plus size={16}/> Adicionar semana</button></div></div>
      {!editable&&<div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">{draft?'Mês anterior: consulta apenas.':'Mês submetido: consulta apenas.'}</div>}
      <div className="overflow-x-auto rounded-2xl border bg-white"><table className="min-w-[2200px] w-full border-collapse text-xs"><thead className="sticky top-0 bg-slate-50 text-slate-600"><tr><th rowSpan={2} className="border p-2">Data</th><th rowSpan={2} className="border p-2">Vendas Produto</th><th colSpan={14} className="border bg-amber-50 p-2">FOOD</th><th colSpan={14} className="border bg-sky-50 p-2">PAPER</th></tr><tr>{['Stock Inicial','Compras','Transferências','Promos','Perdas','Refeições','Inventário Final','Food Teórico','S/Composição','Valor Estimado','% Estimado','Alimentos P&L','% Real P&L','Desvio'].map(h=><th key={`f${h}`} className="border p-2">{h}</th>)}{['Stock Inicial','Compras','Transferências','Promos','Perdas','Refeições','Inventário Final','Paper Teórico','S/Composição','Valor Estimado','% Estimado','Papel P&L','% Real P&L','Desvio'].map(h=><th key={`p${h}`} className="border p-2">{h}</th>)}</tr></thead><tbody>{foodRows.map(row=><FoodCostTableRow key={row.id} row={row} disabled={!editable} inputClass={inputClass} onChange={patch=>patchFood(row.id,patch)}/>)}{!foodRows.length&&<tr><td colSpan={30} className="p-8 text-center text-slate-500">Ainda sem registos. Adicione uma linha para começar; os valores podem depois ser alimentados pelo relatório configurado.</td></tr>}</tbody></table></div>
      <div className="flex justify-end"><button disabled={!editable||saving} onClick={()=>saveDraft({id:selectedMonth,month:selectedMonth,status:monthData?.status||'draft',goals:syncFoodCostToGoals(goals,foodRows),foodCost:foodRows,updatedAt:new Date().toISOString()})} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"><Save size={15}/>{saving?'A guardar…':'Guardar custo comida e papel'}</button></div>
    </>}

    {activeSubTab === 'objectives_settings' && <>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-extrabold text-slate-900">Definições de Classificação</h3><p className="text-sm text-slate-500">As definições são as mesmas em todos os meses. Ao alterá-las aplicam-se ao mês atual e seguintes; os meses anteriores mantêm a classificação já gravada.</p></div></div>
      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-4" aria-label="Legenda das classificações">
        <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${statusTone('Superado')}`}>Superado</span>
        <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${statusTone('Atingido')}`}>Atingido</span>
        <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${statusTone('Próximo')}`}>Próximo</span>
        <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${statusTone('Não Atingido')}`}>Não Atingido</span>
      </div>
      <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm leading-relaxed text-sky-950"><strong>Critérios:</strong> cada tema tem um critério, definido uma vez para a loja. Escolha <strong>−</strong> quando menos é melhor (ex.: custo) ou <strong>+</strong> quando mais é melhor (ex.: vendas). A <strong>margem para Superado</strong> e a <strong>tolerância para Próximo</strong> usam a mesma unidade do indicador e substituem os valores fixos da folha de cálculo. Exemplo com objetivo 100, margem 10 e tolerância 10, critério <strong>−</strong>: ≤ 90 Superado · ≤ 100 Atingido · ≤ 110 Próximo · &gt; 110 Não Atingido. Com <strong>+</strong> a lógica é invertida. Em cada tema abaixo aparece a regra já resolvida com o objetivo atual.</div>
      <div className="space-y-3">{criteriaMetrics.map((metric,i)=>{const criterion=criterionForDraft(metric);return <article key={metric} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><div className="text-xs font-bold uppercase tracking-wide text-slate-500">Tema {i+1}</div><h4 className="text-base font-extrabold text-slate-900">{metric||'Indicador por definir'}</h4><p className="text-xs text-slate-500">Responsável: {ownerForMetric(metric)||'por atribuir'}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">Tema fixo da loja</span></div><div className="grid gap-3 md:grid-cols-[1fr_.8fr_.8fr]"><div className="text-xs font-bold text-slate-500">Critério<div className="mt-1 inline-flex overflow-hidden rounded-lg border border-slate-200 bg-white"><button type="button" disabled={!metric} onClick={()=>patchCriterionForMetric(metric,{direction:'lower'})} aria-pressed={(criterion?.direction||'lower')==='lower'} title="− Menos é melhor (ex.: custo)" className={`px-3.5 py-2 text-base font-extrabold transition-colors disabled:opacity-40 ${(criterion?.direction||'lower')==='lower'?'bg-slate-900 text-white':'text-slate-500 hover:bg-slate-50'}`}>−</button><button type="button" disabled={!metric} onClick={()=>patchCriterionForMetric(metric,{direction:'higher'})} aria-pressed={criterion?.direction==='higher'} title="+ Mais é melhor (ex.: vendas)" className={`border-l border-slate-200 px-3.5 py-2 text-base font-extrabold transition-colors disabled:opacity-40 ${criterion?.direction==='higher'?'bg-slate-900 text-white':'text-slate-500 hover:bg-slate-50'}`}>+</button></div><p className="mt-1 text-[11px] font-semibold text-slate-500">{criterion?.direction==='higher'?'+ Mais é melhor':'− Menos é melhor'}</p></div><label className="text-xs font-bold text-slate-500">Margem para Superado<input disabled={!metric} min="0" type="number" step="0.01" value={criterion?.superadoDelta??0} onChange={e=>patchCriterionForMetric(metric,{superadoDelta:Math.max(0,Number(e.target.value)||0)})} className={`${inputClass} mt-1`}/></label><label className="text-xs font-bold text-slate-500">Tolerância para Próximo<input disabled={!metric} min="0" type="number" step="0.01" value={criterion?.nearDelta??0} onChange={e=>patchCriterionForMetric(metric,{nearDelta:Math.max(0,Number(e.target.value)||0)})} className={`${inputClass} mt-1`}/></label></div><div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600"><span className="font-bold uppercase tracking-wide text-slate-500">Como classifica</span>{(() => {const target = targetForMetric(metric);const rule = describeCriteriaRule(Number(target ?? 0), criterion);if (!rule) return <p className="mt-1">Defina o objetivo deste tema na aba Objetivos para ver os intervalos.</p>;return <><p className="mt-1"><strong className="text-slate-800">Objetivo {formatNumber(Number(target))}:</strong> {rule}</p>{Math.max(0, Number(criterion?.superadoDelta) || 0) === 0 && <p className="mt-1 font-semibold text-amber-800">Margem para Superado a 0: nenhum resultado fica “Superado”. Defina a margem (por exemplo 10) para ter essa faixa.</p>}</>;})()}</div></article>})}{criteriaMetrics.length===0&&<div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><Target className="mx-auto mb-2 text-slate-400"/><p className="font-bold text-slate-700">Ainda não há temas</p><p className="mt-1 text-sm text-slate-500">Defina primeiro os temas na aba Objetivos; os critérios aparecem aqui.</p></div>}</div>
      <div className="flex justify-end"><button disabled={saving||criteriaMetrics.length===0} onClick={()=>void saveCriteria(criteriaDraft)} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"><Save size={15}/>{saving?'A guardar…':'Guardar definições'}</button></div>
    </>}

    {activeSubTab === 'objectives_reports' && <>
      <div>
        <h3 className="text-xl font-extrabold text-slate-900">Relatórios</h3>
        <p className="text-sm text-slate-500">Cada ficheiro carregado cria uma linha nova em Custo Comida e Papel, no mês da data do relatório.</p>
      </div>
      <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white p-8 text-center">
        <Upload className="mx-auto mb-3 text-slate-500" size={28}/>
        <p className="font-extrabold text-slate-800">Carregar relatório</p>
        <p className="mt-1 text-sm text-slate-500">Excel (.xls/.xlsx) ou CSV. São lidas as colunas monetárias Food e Paper, as Vendas Líquidas Produto e a data do relatório; as colunas % são ignoradas. Os valores entram diretamente na página Custo Comida e Papel, como uma linha nova, e ficam em edição local até guardar.</p>
        <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white">
          <FileSpreadsheet size={16}/> Selecionar ficheiros
          <input type="file" multiple accept=".xlsx,.xls,.csv,.pdf" className="sr-only" onChange={e => {
            const files = Array.from(e.currentTarget.files || []) as File[];
            e.currentTarget.value = '';
            if (files.length) void handleReportFiles(files);
          }}/>
        </label>
      </div>
    </>}
  </div>;
};

const Kpi: React.FC<{label:string;value:string;icon:React.ReactNode;className?:string}> = ({label,value,icon,className = 'border-slate-200 bg-white'}) => <div className={`rounded-2xl border p-4 ${className}`}><div className="flex items-center justify-between text-slate-500"><span className="text-xs font-bold uppercase">{label}</span>{icon}</div><div className="mt-2 text-2xl font-black text-slate-900">{value}</div></div>;
const EmptyRow: React.FC<{colSpan:number;text:string}> = ({colSpan,text})=><tr><td colSpan={colSpan} className="p-8 text-center text-slate-500">{text}</td></tr>;

const foodCostEstimate = (row: FoodCostEntry) => Number(row.foodTheoretical||0)+Number(row.foodWithoutComposition||0);
const foodCostActual = (row: FoodCostEntry) => Number(row.foodOpening||0)+Number(row.foodPurchases||0)+Number(row.foodTransfers||0)-Number(row.foodPromos||0)-Number(row.foodLosses||0)-Number(row.foodMeals||0)-Number(row.foodFinalInventory||0);
const paperCostEstimate = (row: FoodCostEntry) => Number(row.paperTheoretical||0)+Number(row.paperWithoutComposition||0);
const paperCostActual = (row: FoodCostEntry) => Number(row.paperOpening||0)+Number(row.paperPurchases||0)+Number(row.paperTransfers||0)-Number(row.paperPromos||0)-Number(row.paperLosses||0)-Number(row.paperMeals||0)-Number(row.paperFinalInventory||0);
// Cada registo cai na semana do mês em que a data está (1-7 = Semana 1, …).
const weekIdForDate = (date: string) => {
  const day = Number(date.slice(8, 10));
  return day >= 1 ? `week-${Math.min(5, Math.ceil(day / 7))}` : '';
};
const costPercent = (part: number, total: number) => total ? Math.round(part / total * 10000) / 100 : undefined;

const FoodCostTableRow: React.FC<{row:FoodCostEntry;disabled:boolean;inputClass:string;onChange:(patch:Partial<FoodCostEntry>)=>void}> = ({row,disabled,inputClass,onChange}) => {
  const number = (key: keyof FoodCostEntry, value: string) => onChange({[key]: value === '' ? 0 : Number(value)} as Partial<FoodCostEntry>);
  const foodEstimate = foodCostEstimate(row);
  const foodActual = foodCostActual(row);
  const paperEstimate = paperCostEstimate(row);
  const paperActual = paperCostActual(row);
  const fKeys: (keyof FoodCostEntry)[]=['foodOpening','foodPurchases','foodTransfers','foodPromos','foodLosses','foodMeals','foodFinalInventory','foodTheoretical','foodWithoutComposition'];
  const pKeys: (keyof FoodCostEntry)[]=['paperOpening','paperPurchases','paperTransfers','paperPromos','paperLosses','paperMeals','paperFinalInventory','paperTheoretical','paperWithoutComposition'];
  const field=(key:keyof FoodCostEntry)=> <td key={key} className="border p-1"><input disabled={disabled} type="number" step="0.01" value={Number(row[key]||0)} onChange={e=>number(key,e.target.value)} className="w-24 rounded border border-slate-200 px-1.5 py-1 text-right disabled:bg-slate-50"/></td>;
  const computed=(value:number)=> <td className="border bg-slate-50 p-2 text-right font-semibold">{money(value)}</td>;
  const percent=(value:number)=> <td className="border bg-slate-50 p-2 text-right">{Number(row.productSales)?`${(value/Number(row.productSales)*100).toFixed(2)}%`:'—'}</td>;
  return <tr><td className="border p-1"><input disabled={disabled} type="date" value={row.date} onChange={e=>onChange({date:e.target.value})} className="w-32 rounded border px-1.5 py-1"/></td><td className="border p-1"><input disabled={disabled} type="number" step="0.01" value={row.productSales} onChange={e=>number('productSales',e.target.value)} className="w-24 rounded border px-1.5 py-1 text-right"/></td>{fKeys.slice(0,7).map(field)}{field('foodTheoretical')}{field('foodWithoutComposition')}{computed(foodEstimate)}{percent(foodEstimate)}{computed(foodActual)}{percent(foodActual)}{computed(foodEstimate-foodActual)}{pKeys.slice(0,7).map(field)}{field('paperTheoretical')}{field('paperWithoutComposition')}{computed(paperEstimate)}{percent(paperEstimate)}{computed(paperActual)}{percent(paperActual)}{computed(paperEstimate-paperActual)}</tr>;
};

export default ObjectivesControl;
