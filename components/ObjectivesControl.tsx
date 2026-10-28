import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Employee, ObjectiveMonth, ObjectiveGoal, ObjectiveCheckpoint, ObjectiveCriterion, ObjectiveCriteriaSettings, FoodCostEntry, ObjectiveCorrectiveAction, CorrectiveActionStatus } from '../types';
import { getObjectiveMonths, saveObjectiveMonth, getObjectiveCriteria, saveObjectiveCriteria } from '../services/firebaseService';
import { Target, Plus, Save, Send, History, TrendingUp, Upload, FileSpreadsheet, Utensils, CalendarDays, ClipboardCheck, CheckCircle2, Clock3, AlertTriangle, Trash2, Download, Printer } from 'lucide-react';

interface ObjectivesControlProps {
  restaurantId: string;
  employees: Employee[];
  activeSubTab: string;
}

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

const statusTone = (status?: string) => `objective-status-badge ${status === 'Superado' ? 'objective-status-superado' : status === 'Atingido' ? 'objective-status-atingido' : status === 'Próximo' ? 'objective-status-proximo' : status === 'Não Atingido' ? 'objective-status-nao-atingido' : 'objective-status-pendente'}`;

const blankFoodCost = (date: string): FoodCostEntry => ({
  id: newId(), date, productSales: 0,
  foodOpening: 0, foodPurchases: 0, foodTransfers: 0, foodPromos: 0, foodLosses: 0, foodMeals: 0, foodFinalInventory: 0, foodTheoretical: 0, foodWithoutComposition: 0, foodActualPnl: 0,
  paperOpening: 0, paperPurchases: 0, paperTransfers: 0, paperPromos: 0, paperLosses: 0, paperMeals: 0, paperFinalInventory: 0, paperTheoretical: 0, paperWithoutComposition: 0, paperActualPnl: 0,
});

const ObjectivesControl: React.FC<ObjectivesControlProps> = ({ restaurantId, employees, activeSubTab }) => {
  const [months, setMonths] = useState<ObjectiveMonth[]>([]);
  const [criteriaSettings, setCriteriaSettings] = useState<ObjectiveCriteriaSettings>({ id: 'criteria', criteria: [], updatedAt: new Date().toISOString() });
  const [savedCriteriaSettings, setSavedCriteriaSettings] = useState<ObjectiveCriteriaSettings>({ id: 'criteria', criteria: [], updatedAt: new Date().toISOString() });
  const [selectedMonth, setSelectedMonth] = useState(monthKey());
  const [selectedCheckpoint, setSelectedCheckpoint] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [performanceFrom, setPerformanceFrom] = useState(`${new Date().getFullYear()}-01`);
  const [performanceTo, setPerformanceTo] = useState(monthKey());
  const [managerFilter, setManagerFilter] = useState('');
  const [actionDrafts, setActionDrafts] = useState<Record<string, { description: string; responsible: string; dueDate: string }>>({});
  const [reportFiles, setReportFiles] = useState<File[]>([]);
  const [reportPreviews, setReportPreviews] = useState<{ name: string; sheets: string[]; sample: string[][]; note?: string }[]>([]);

  useEffect(() => {
    let mounted = true;
    Promise.all([getObjectiveMonths(restaurantId), getObjectiveCriteria(restaurantId)])
      .then(([rows, settings]) => {
        if (!mounted) return;
        setMonths(rows);
        if (settings) {
          setCriteriaSettings(settings);
          setSavedCriteriaSettings(settings);
        }
      })
      .catch(() => { if (mounted) setNotice('Não foi possível sincronizar os objetivos e as definições.'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [restaurantId]);

  const checkpointOptions = useMemo(() => checkpointsForMonth(selectedMonth), [selectedMonth]);
  useEffect(() => {
    if (!checkpointOptions.some(p => p.id === selectedCheckpoint)) setSelectedCheckpoint(checkpointOptions[0]?.id || '');
  }, [checkpointOptions, selectedCheckpoint]);

  const monthData = useMemo(() => months.find(m => m.month === selectedMonth), [months, selectedMonth]);
  const draft = monthData?.status !== 'submitted';
  const goals = monthData?.goals || [];
  const foodRows = monthData?.foodCost || [];
  const criteria = savedCriteriaSettings.criteria;
  const criteriaDraft = criteriaSettings.criteria;
  const findCriterion = (metric: string) => criteria.find(c => c.metric.trim().toLocaleLowerCase('pt-PT') === metric.trim().toLocaleLowerCase('pt-PT'));
  const resolveCheckpoint = (goal: ObjectiveGoal, checkpointId: string) => {
    const saved = goal.checkpoints[checkpointId];
    if (!saved || monthData?.status === 'submitted') return saved;
    const status = classifyResult(saved.result, Number(goal.target), findCriterion(goal.metric));
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
    setCriteriaSettings(prev => ({ ...prev, criteria, updatedAt: new Date().toISOString() }));
  };
  const criterionForDraft = (metric: string) => criteriaDraft.find(c => c.metric.trim().toLocaleLowerCase('pt-PT') === metric.trim().toLocaleLowerCase('pt-PT'));
  const patchCriterionForMetric = (metric: string, patch: Partial<ObjectiveCriterion>) => {
    const existing = criterionForDraft(metric);
    if (existing) updateCriteriaDraft(criteriaDraft.map(c => c.id === existing.id ? { ...c, ...patch } : c));
    else if (metric.trim()) updateCriteriaDraft([...criteriaDraft, { id: newId(), metric: metric.trim(), direction: 'lower', superadoDelta: 0, nearDelta: 0, ...patch }]);
  };
  const updateLocalMonth = (updated: ObjectiveMonth) => {
    setMonths(prev => [...prev.filter(m => m.month !== updated.month), updated].sort((a,b) => b.month.localeCompare(a.month)));
  };
  const baseMonth = (): ObjectiveMonth => monthData || { id: selectedMonth, month: selectedMonth, status: 'draft', goals: [], foodCost: [], updatedAt: new Date().toISOString() };
  const patchGoal = (id: string, patch: Partial<ObjectiveGoal>) => {
    const base = baseMonth();
    updateLocalMonth({ ...base, goals: base.goals.map(g => g.id === id ? { ...g, ...patch } : g) });
  };
  const addGoal = () => {
    const base = baseMonth();
    const goal: ObjectiveGoal = { id: newId(), owner: '', metric: '', target: 0, possiblePoints: 0, checkpoints: {} };
    updateLocalMonth({ ...base, goals: [...base.goals, goal] });
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
        const status = classifyResult(checkpoint.result, Number(goal.target), findCriterion(goal.metric));
        return [id, { ...checkpoint, status, points: status ? statusPoints(status, Number(goal.possiblePoints || 0)) : undefined }];
      })),
    }));
    await saveDraft({ id: selectedMonth, month: selectedMonth, status: 'submitted', submittedAt: new Date().toISOString(), goals: finalizedGoals, foodCost: foodRows, updatedAt: new Date().toISOString() });
  };

  const submittedMonths = useMemo(() => months.filter(m => m.status === 'submitted').sort((a,b) => b.month.localeCompare(a.month)), [months]);
  const rangeMonths = useMemo(() => submittedMonths.filter(m => m.month >= performanceFrom && m.month <= performanceTo), [submittedMonths, performanceFrom, performanceTo]);
  const managers = useMemo(() => Array.from(new Set([...employees.map(e => e.name), ...goals.map(g => g.owner).filter(Boolean)])), [employees, goals]);
  const statusCounts = useMemo(() => {
    const resolved = goals.map(g => resolveCheckpoint(g, selectedCheckpoint)).filter(cp => cp?.status);
    return { total: goals.length, recorded: resolved.length, reached: resolved.filter(cp => cp?.status === 'Atingido' || cp?.status === 'Superado').length };
  }, [goals, selectedCheckpoint, savedCriteriaSettings, monthData?.status]);

  const updateCheckpoint = (goal: ObjectiveGoal, checkpointId: string, result: number | '') => {
    const criterion = findCriterion(goal.metric);
    const status = classifyResult(result, Number(goal.target), criterion);
    const checkpoint: ObjectiveCheckpoint = {
      result,
      status,
      points: status ? statusPoints(status, Number(goal.possiblePoints || 0)) : undefined,
      updatedAt: new Date().toISOString(),
    };
    patchGoal(goal.id, { checkpoints: { ...goal.checkpoints, [checkpointId]: checkpoint } });
  };
  const latestCheckpointFor = (goal: ObjectiveGoal) => {
    const entries = Object.entries(goal.checkpoints).filter(([, value]) => value.result !== '' && value.result !== undefined);
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

  const handleReportFiles = async (files: File[]) => {
    setReportFiles(files);
    const previews = await Promise.all(files.map(async file => {
      if (/\.pdf$/i.test(file.name)) return { name: file.name, sheets: [], sample: [], note: 'PDF selecionado; leitura e mapeamento serão configurados depois.' };
      try {
        const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = firstSheet ? XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: false }) as unknown[][] : [];
        return { name: file.name, sheets: workbook.SheetNames, sample: rows.slice(0, 5).map(row => row.map(cell => String(cell ?? '')).slice(0, 8)) };
      } catch {
        return { name: file.name, sheets: [], sample: [], note: 'Não foi possível pré-visualizar este ficheiro.' };
      }
    }));
    setReportPreviews(previews);
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
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-extrabold text-slate-900">Visão Geral Mensal</h3><p className="text-sm text-slate-500">Objetivos, resultados e validações ao longo do mês.</p><p className="hidden text-xs text-slate-500 print:block">{MONTH_NAMES[Number(selectedMonth.slice(5))-1]} {selectedMonth.slice(0,4)} · Resumo da validação: {checkpointOptions.find(cp=>cp.id===selectedCheckpoint)?.label}</p></div><div className="flex items-center gap-2 print:hidden">{monthPicker}<button type="button" onClick={printOverview} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"><Printer size={16}/> Imprimir</button></div></div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Objetivos do mês" value={String(goals.length)} icon={<Target size={18}/>} />
        <Kpi label="Resultados validados" value={`${statusCounts.recorded} / ${statusCounts.total}`} icon={<CheckCircle2 size={18}/>} />
        <Kpi label="Atingidos ou superados" value={statusCounts.recorded ? `${Math.round(statusCounts.reached/statusCounts.recorded*100)}%` : '—'} icon={<TrendingUp size={18}/>} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-4 print:hidden"><div className="flex items-center gap-2 text-sm font-bold text-slate-800"><CalendarDays size={17}/> Evolução semanal e mensal</div><label className="text-xs font-semibold text-slate-500">Resumo KPI<select value={selectedCheckpoint} onChange={e => setSelectedCheckpoint(e.target.value)} className="ml-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800">{checkpointOptions.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label></div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="min-w-[1500px] w-full text-left text-xs"><thead className="bg-slate-50 uppercase text-slate-500"><tr><th rowSpan={2} className="p-3">Responsável</th><th rowSpan={2} className="p-3">Tema</th><th rowSpan={2} className="p-3">Objetivo</th><th rowSpan={2} className="p-3">Pontos possíveis</th>{checkpointOptions.map(cp=><th key={cp.id} colSpan={2} className="border-l border-slate-200 p-3 text-center">{cp.label}</th>)}</tr><tr>{checkpointOptions.flatMap(cp=>[<th key={`${cp.id}-result`} className="border-l border-slate-200 p-2">Resultado</th>,<th key={`${cp.id}-status`} className="p-2">Estado</th>])}</tr></thead><tbody>{goals.map(g => <tr key={g.id} className="border-t border-slate-100"><td className="p-3 font-semibold">{g.owner||'—'}</td><td className="p-3">{g.metric||'—'}</td><td className="p-3">{g.target ?? '—'}</td><td className="p-3">{g.possiblePoints ?? '—'}</td>{checkpointOptions.flatMap(cp=>{const value=resolveCheckpoint(g,cp.id);return [<td key={`${g.id}-${cp.id}-result`} className="border-l border-slate-100 p-2">{value?.result??'—'}</td>,<td key={`${g.id}-${cp.id}-status`} className="p-2"><span className={`rounded-full px-2 py-1 font-bold ${statusTone(value?.status)}`}>{value?.status||'—'}</span></td>];})}</tr>)}{goals.length===0 && <EmptyRow text="Ainda não há objetivos neste mês. Configure-os na aba Objetivos." colSpan={4+checkpointOptions.length*2}/>}</tbody></table></div>
      <div className="flex flex-wrap justify-end gap-2 print:hidden"><button disabled={!draft||!goals.length||saving} onClick={submitMonth} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"><Send size={15}/> Submeter mês para Histórico</button></div>
    </section>}

    {activeSubTab === 'objectives_corrective_actions' && <>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-extrabold text-slate-900">Ações Corretivas · {MONTH_NAMES[Number(selectedMonth.slice(5))-1]} {selectedMonth.slice(0,4)}</h3><p className="text-sm text-slate-500">As ações pertencem ao mês. Os objetivos a trabalhar são sinalizados pelo resultado mais recente e mantêm-se aqui enquanto houver ações em aberto.</p></div>{monthPicker}</div>
      {!draft&&<div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">Este mês foi submetido. As ações estão disponíveis apenas para consulta.</div>}
      <section className="space-y-4"><div className="flex items-center gap-2"><Clock3 size={18} className="text-amber-600"/><h4 className="text-lg font-extrabold text-slate-900">Ações em aberto</h4></div>
        <div className="space-y-4">{goalsNeedingCorrectiveAction.map(goal=>{const latest=latestCheckpointFor(goal);const result=latest?.value;const form=actionDrafts[goal.id]||{description:'',responsible:'',dueDate:''};const openActions=(goal.correctiveActions||[]).filter(action=>action.status!=='Concluída');return <article key={goal.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-xs font-bold uppercase tracking-wide text-slate-500">{goal.owner||'Responsável por atribuir'}</div><h5 className="mt-1 text-base font-extrabold text-slate-900">{goal.metric||'Tema por definir'}</h5><p className="mt-1 text-sm text-slate-600">Último resultado{latest?` (${checkpointOptions.find(cp=>cp.id===latest.id)?.label})`:''}: <strong>{result?.result??'—'}</strong> · Objetivo <strong>{goal.target}</strong></p></div>{result?.status&&<span className={statusTone(result.status)}>{result.status}</span>}</div>
          <div className="mt-4 space-y-2">{openActions.map(action=><div key={action.id} className="grid gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 md:grid-cols-[1.5fr_1fr_.8fr_1fr_auto] md:items-center"><textarea disabled={!draft} rows={2} value={action.description} onChange={e=>patchCorrectiveAction(goal,action.id,{description:e.target.value})} className="w-full resize-y rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm disabled:bg-slate-100" aria-label="Medida corretiva"/><select disabled={!draft} value={action.responsible} onChange={e=>patchCorrectiveAction(goal,action.id,{responsible:e.target.value})} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm disabled:bg-slate-100"><option value="">Responsável</option>{managers.map(name=><option key={name} value={name}>{name}</option>)}</select><input disabled={!draft} type="date" value={action.dueDate} onChange={e=>patchCorrectiveAction(goal,action.id,{dueDate:e.target.value})} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm disabled:bg-slate-100" aria-label="Prazo"/><select disabled={!draft} value={action.status} onChange={e=>patchCorrectiveAction(goal,action.id,{status:e.target.value as CorrectiveActionStatus})} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm disabled:bg-slate-100"><option>Por iniciar</option><option>Em curso</option><option>Concluída</option></select><button disabled={!draft} onClick={()=>removeCorrectiveAction(goal,action.id)} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-40" aria-label="Remover medida"><Trash2 size={16}/></button></div>)}{openActions.length===0&&<p className="text-xs text-slate-500">Ainda sem medidas em aberto para este tema.</p>}</div>
          <div className="mt-3 grid gap-2 rounded-xl border border-dashed border-slate-300 p-3 md:grid-cols-[1.5fr_1fr_.8fr_auto] md:items-end"><label className="text-xs font-bold text-slate-500">Nova medida corretiva<textarea disabled={!draft} rows={2} value={form.description} onChange={e=>setActionDrafts(prev=>({...prev,[goal.id]:{...form,description:e.target.value}}))} placeholder="Descreva a ação a implementar neste mês" className="mt-1 w-full resize-y rounded-lg border border-slate-200 px-2.5 py-2 text-sm disabled:bg-slate-100"/></label><label className="text-xs font-bold text-slate-500">Responsável<select disabled={!draft} value={form.responsible} onChange={e=>setActionDrafts(prev=>({...prev,[goal.id]:{...form,responsible:e.target.value}}))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm"><option value="">Selecionar gerente</option>{managers.map(name=><option key={name} value={name}>{name}</option>)}</select></label><label className="text-xs font-bold text-slate-500">Prazo<input disabled={!draft} type="date" value={form.dueDate} onChange={e=>setActionDrafts(prev=>({...prev,[goal.id]:{...form,dueDate:e.target.value}}))} className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm"/></label><button disabled={!draft||!form.description.trim()} onClick={()=>addCorrectiveAction(goal)} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2.5 text-xs font-bold text-white disabled:opacity-40"><Plus size={14}/> Adicionar</button></div>
        </article>})}{goalsNeedingCorrectiveAction.length===0&&<div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><ClipboardCheck className="mx-auto mb-2 text-slate-400"/><p className="font-bold text-slate-700">Sem ações em aberto</p><p className="mt-1 text-sm text-slate-500">Os temas Próximo e Não Atingido, com base no último resultado do mês, aparecem automaticamente aqui.</p></div>}</div>
      </section>
      <section className="space-y-3"><div className="flex items-center gap-2"><History size={18} className="text-slate-500"/><h4 className="text-lg font-extrabold text-slate-900">Ações fechadas · Histórico</h4></div><div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="min-w-[720px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Tema</th><th className="p-3">Medida corretiva</th><th className="p-3">Responsável</th><th className="p-3">Prazo</th><th className="p-3">Concluída em</th></tr></thead><tbody>{closedCorrectiveActions.map(({goal,action})=><tr key={action.id} className="border-t"><td className="p-3 font-semibold">{goal.metric||'—'}</td><td className="p-3">{action.description}</td><td className="p-3">{action.responsible||'—'}</td><td className="p-3">{action.dueDate?new Date(`${action.dueDate}T12:00:00`).toLocaleDateString('pt-PT'):'—'}</td><td className="p-3">{action.completedAt?new Date(action.completedAt).toLocaleDateString('pt-PT'):'—'}</td></tr>)}{closedCorrectiveActions.length===0&&<EmptyRow colSpan={5} text="Ainda não há ações fechadas neste mês."/>}</tbody></table></div></section>
      <div className="flex justify-end"><button disabled={!draft||saving} onClick={()=>saveDraft({id:selectedMonth,month:selectedMonth,status:monthData?.status||'draft',goals,foodCost:foodRows,updatedAt:new Date().toISOString()})} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"><Save size={15}/>{saving?'A guardar…':'Guardar ações corretivas'}</button></div>
    </>}

    {activeSubTab === 'objectives_setup' && <>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-extrabold text-slate-900">Objetivos do Mês</h3><p className="text-sm text-slate-500">Cada linha é um objetivo. Introduza apenas os resultados semanais, da quinzena e do mês; a classificação calculada é consultada na Visão Geral.</p></div><div className="flex gap-2">{monthPicker}<button onClick={addGoal} disabled={!draft||saving} className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-3 py-2 text-sm font-extrabold text-slate-950 disabled:opacity-40"><Plus size={16}/> Adicionar objetivo</button></div></div>
      {!draft && <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm font-semibold text-sky-900">Este mês foi submetido e está em modo de consulta.</div>}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-white p-3"><span className="text-sm font-bold text-slate-700">Semanas e validações:</span><span className="text-xs text-slate-500">As semanas são organizadas em blocos de sete dias; a Semana 5 só aparece quando o mês ultrapassa 28 dias. A Quinzena fica logo após a semana que inclui o dia 15.</span></div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="min-w-[1250px] w-full border-collapse text-xs"><thead className="bg-slate-50 text-slate-600"><tr><th className="sticky left-0 z-10 min-w-32 border-b bg-slate-50 p-3 text-left">Responsável</th><th className="min-w-36 border-b p-3 text-left">Tema</th><th className="min-w-28 border-b p-3">Objetivo</th><th className="min-w-24 border-b p-3">Pontos possíveis</th>{checkpointOptions.map(cp=><th key={cp.id} className="min-w-28 border-b border-l border-slate-200 p-3">{cp.label}</th>)}<th className="border-b p-3">Ações</th></tr></thead><tbody>{goals.map((g,i)=><tr key={g.id} className="border-t border-slate-100"><td className="sticky left-0 z-[1] border-r bg-white p-2"><select disabled={!draft} value={g.owner} onChange={e=>patchGoal(g.id,{owner:e.target.value})} className="w-32 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs disabled:bg-slate-50"><option value="">Selecionar</option>{managers.map(m=><option key={m} value={m}>{m}</option>)}</select></td><td className="p-2"><input disabled={!draft} value={g.metric} onChange={e=>patchGoal(g.id,{metric:e.target.value})} placeholder={`Tema ${i+1}`} className="w-36 rounded-lg border border-slate-200 px-2 py-2 text-xs disabled:bg-slate-50"/></td><td className="p-2"><input disabled={!draft} type="number" value={g.target} onChange={e=>patchGoal(g.id,{target:Number(e.target.value)})} className="w-24 rounded-lg border border-slate-200 px-2 py-2 text-right text-xs disabled:bg-slate-50"/></td><td className="p-2"><input disabled={!draft} type="number" value={g.possiblePoints} onChange={e=>patchGoal(g.id,{possiblePoints:Number(e.target.value)})} className="w-20 rounded-lg border border-slate-200 px-2 py-2 text-right text-xs disabled:bg-slate-50"/></td>{checkpointOptions.map(cp=>{const value=resolveCheckpoint(g,cp.id);return <td key={`${g.id}-${cp.id}`} className="border-l border-slate-100 p-2"><input disabled={!draft} type="number" step="0.01" value={value?.result??''} onChange={e=>updateCheckpoint(g,cp.id,e.target.value===''?'':Number(e.target.value))} aria-label={`${g.metric||`Tema ${i+1}`} · ${cp.label} · resultado`} placeholder="Resultado" className="w-24 rounded-lg border border-slate-200 px-2 py-2 text-right text-xs disabled:bg-slate-50"/></td>})}<td className="p-2"><button disabled={!draft||saving} onClick={()=>saveDraft({...baseMonth(),goals:goals.filter(x=>x.id!==g.id)})} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-40" aria-label={`Remover objetivo ${i+1}`}><Trash2 size={16}/></button></td></tr>)}{goals.length===0&&<tr><td colSpan={5+checkpointOptions.length} className="p-8 text-center text-slate-500">Ainda não há objetivos para este mês. Adicione uma linha para começar.</td></tr>}</tbody></table></div>
      <div className="flex justify-end"><button disabled={!draft||saving} onClick={()=>saveDraft({id:selectedMonth,month:selectedMonth,status:monthData?.status||'draft',goals,foodCost:foodRows,updatedAt:new Date().toISOString()})} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"><Save size={15}/>{saving?'A guardar…':'Guardar e sincronizar'}</button></div>
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
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-extrabold text-slate-900">Custo Comida e Papel</h3><p className="text-sm text-slate-500">Estrutura baseada na tabela partilhada. Os campos calculados seguem as fórmulas da folha.</p></div><div className="flex gap-2">{monthPicker}<button onClick={addFoodRow} disabled={!draft||saving} className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-3 py-2 text-sm font-extrabold text-slate-950 disabled:opacity-40"><Plus size={16}/> Adicionar semana</button></div></div>
      {!draft&&<div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">Mês submetido: consulta apenas.</div>}
      <div className="overflow-x-auto rounded-2xl border bg-white"><table className="min-w-[2200px] w-full border-collapse text-xs"><thead className="sticky top-0 bg-slate-50 text-slate-600"><tr><th rowSpan={2} className="border p-2">Data</th><th rowSpan={2} className="border p-2">Vendas Produto</th><th colSpan={14} className="border bg-amber-50 p-2">FOOD</th><th colSpan={14} className="border bg-sky-50 p-2">PAPER</th></tr><tr>{['Stock Inicial','Compras','Transferências','Promos','Perdas','Refeições','Inventário Final','Food Teórico','S/Composição','Valor Estimado','% Estimado','Alimentos P&L','% Real P&L','Desvio'].map(h=><th key={`f${h}`} className="border p-2">{h}</th>)}{['Stock Inicial','Compras','Transferências','Promos','Perdas','Refeições','Inventário Final','Paper Teórico','S/Composição','Valor Estimado','% Estimado','Papel P&L','% Real P&L','Desvio'].map(h=><th key={`p${h}`} className="border p-2">{h}</th>)}</tr></thead><tbody>{foodRows.map(row=><FoodCostTableRow key={row.id} row={row} disabled={!draft} inputClass={inputClass} onChange={patch=>patchFood(row.id,patch)}/>)}{!foodRows.length&&<tr><td colSpan={30} className="p-8 text-center text-slate-500">Ainda sem registos. Adicione uma linha para começar; os valores podem depois ser alimentados pelo relatório configurado.</td></tr>}</tbody></table></div>
      <div className="flex justify-end"><button disabled={!draft||saving} onClick={()=>saveDraft({id:selectedMonth,month:selectedMonth,status:monthData?.status||'draft',goals,foodCost:foodRows,updatedAt:new Date().toISOString()})} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"><Save size={15}/>{saving?'A guardar…':'Guardar custo comida e papel'}</button></div>
    </>}

    {activeSubTab === 'objectives_settings' && <>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-extrabold text-slate-900">Definições de Classificação</h3><p className="text-sm text-slate-500">Os objetivos abaixo são lidos da aba Objetivos do mês selecionado.</p></div>{monthPicker}</div>
      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-4" aria-label="Legenda das classificações">
        <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${statusTone('Superado')}`}>Superado</span>
        <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${statusTone('Atingido')}`}>Atingido</span>
        <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${statusTone('Próximo')}`}>Próximo</span>
        <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${statusTone('Não Atingido')}`}>Não Atingido</span>
      </div>
      <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm leading-relaxed text-sky-950"><strong>Critérios:</strong> cada indicador recebe um critério; objetivos com o mesmo nome de indicador partilham essas regras. Para indicadores em que menos é melhor, “Superado” fica abaixo da meta pela margem definida; “Atingido” chega à meta; “Próximo” fica até à margem acima. Para indicadores em que mais é melhor, a lógica é invertida. Fora desses intervalos, o resultado é “Não Atingido”. As margens usam a mesma unidade do indicador.</div>
      <div className="space-y-3">{goals.map((goal,i)=>{const criterion=criterionForDraft(goal.metric);return <article key={goal.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><div className="text-xs font-bold uppercase tracking-wide text-slate-500">Tema {i+1}</div><h4 className="text-base font-extrabold text-slate-900">{goal.metric||'Indicador por definir'}</h4><p className="text-xs text-slate-500">Responsável: {goal.owner||'por atribuir'} · Objetivo: {goal.target}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">Da aba Objetivos</span></div><div className="grid gap-3 md:grid-cols-[1fr_.8fr_.8fr]"><label className="text-xs font-bold text-slate-500">Direção<select disabled={!goal.metric} value={criterion?.direction||'lower'} onChange={e=>patchCriterionForMetric(goal.metric,{direction:e.target.value as ObjectiveCriterion['direction']})} className={`${inputClass} mt-1`}><option value="lower">Menor é melhor</option><option value="higher">Maior é melhor</option></select></label><label className="text-xs font-bold text-slate-500">Margem para Superado<input disabled={!goal.metric} min="0" type="number" step="0.01" value={criterion?.superadoDelta??0} onChange={e=>patchCriterionForMetric(goal.metric,{superadoDelta:Math.max(0,Number(e.target.value)||0)})} className={`${inputClass} mt-1`}/></label><label className="text-xs font-bold text-slate-500">Tolerância para Próximo<input disabled={!goal.metric} min="0" type="number" step="0.01" value={criterion?.nearDelta??0} onChange={e=>patchCriterionForMetric(goal.metric,{nearDelta:Math.max(0,Number(e.target.value)||0)})} className={`${inputClass} mt-1`}/></label></div></article>})}{goals.length===0&&<div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><Target className="mx-auto mb-2 text-slate-400"/><p className="font-bold text-slate-700">Não há objetivos para este mês</p><p className="mt-1 text-sm text-slate-500">Crie primeiro os objetivos na aba Objetivos; aparecerão aqui automaticamente.</p></div>}</div>
      <div className="flex justify-end"><button disabled={saving||goals.length===0} onClick={()=>void saveCriteria(criteriaDraft)} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"><Save size={15}/>{saving?'A guardar…':'Guardar definições'}</button></div>
    </>}

    {activeSubTab === 'objectives_reports' && <> 
      <div><h3 className="text-xl font-extrabold text-slate-900">Relatórios</h3><p className="text-sm text-slate-500">Carregue o ficheiro. O mapeamento e a importação automática serão configurados numa etapa seguinte.</p></div>
      <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white p-8 text-center"><Upload className="mx-auto mb-3 text-slate-500" size={28}/><p className="font-extrabold text-slate-800">Carregar relatório</p><p className="mt-1 text-sm text-slate-500">Excel, CSV ou PDF. A seleção fica nesta sessão; ainda não envia dados para a folha ou para a base de dados.</p><label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white"><FileSpreadsheet size={16}/> Selecionar ficheiros<input type="file" multiple accept=".xlsx,.xls,.csv,.pdf" className="sr-only" onChange={e=>void handleReportFiles(Array.from(e.target.files||[]))}/></label></div>
      {reportFiles.length>0&&<div className="space-y-3">{reportPreviews.map((preview,i)=><div key={`${preview.name}-${i}`} className="rounded-2xl border bg-white p-4"><div className="flex items-center gap-2"><FileSpreadsheet size={15} className="text-emerald-700"/><strong className="truncate text-sm">{preview.name}</strong><span className="ml-auto text-xs text-slate-500">{(reportFiles[i]?.size||0)/1024|0} KB</span></div>{preview.note?<p className="mt-2 text-sm text-slate-500">{preview.note}</p>:<><p className="mt-2 text-xs text-slate-500">Folhas detetadas: {preview.sheets.join(', ')||'—'}. Pré-visualização das primeiras linhas; ainda sem importação automática.</p>{preview.sample.length>0&&<div className="mt-3 overflow-x-auto"><table className="min-w-full text-xs"><tbody>{preview.sample.map((row,r)=><tr key={r} className="border-t">{row.map((cell,c)=><td key={c} className="max-w-56 truncate px-2 py-1.5">{cell}</td>)}</tr>)}</tbody></table></div>}</>}</div>)}</div>}
    </>}
  </div>;
};

const Kpi: React.FC<{label:string;value:string;icon:React.ReactNode}> = ({label,value,icon}) => <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between text-slate-500"><span className="text-xs font-bold uppercase">{label}</span>{icon}</div><div className="mt-2 text-2xl font-black text-slate-900">{value}</div></div>;
const EmptyRow: React.FC<{colSpan:number;text:string}> = ({colSpan,text})=><tr><td colSpan={colSpan} className="p-8 text-center text-slate-500">{text}</td></tr>;

const FoodCostTableRow: React.FC<{row:FoodCostEntry;disabled:boolean;inputClass:string;onChange:(patch:Partial<FoodCostEntry>)=>void}> = ({row,disabled,inputClass,onChange}) => {
  const number = (key: keyof FoodCostEntry, value: string) => onChange({[key]: value === '' ? 0 : Number(value)} as Partial<FoodCostEntry>);
  const foodEstimate = Number(row.foodTheoretical||0)+Number(row.foodWithoutComposition||0);
  const foodActual = Number(row.foodOpening||0)+Number(row.foodPurchases||0)+Number(row.foodTransfers||0)-Number(row.foodPromos||0)-Number(row.foodLosses||0)-Number(row.foodMeals||0)-Number(row.foodFinalInventory||0);
  const paperEstimate = Number(row.paperTheoretical||0)+Number(row.paperWithoutComposition||0);
  const paperActual = Number(row.paperOpening||0)+Number(row.paperPurchases||0)-Number(row.paperPromos||0)-Number(row.paperLosses||0)-Number(row.paperMeals||0)-Number(row.paperFinalInventory||0);
  const fKeys: (keyof FoodCostEntry)[]=['foodOpening','foodPurchases','foodTransfers','foodPromos','foodLosses','foodMeals','foodFinalInventory','foodTheoretical','foodWithoutComposition'];
  const pKeys: (keyof FoodCostEntry)[]=['paperOpening','paperPurchases','paperTransfers','paperPromos','paperLosses','paperMeals','paperFinalInventory','paperTheoretical','paperWithoutComposition'];
  const field=(key:keyof FoodCostEntry)=> <td key={key} className="border p-1"><input disabled={disabled} type="number" step="0.01" value={Number(row[key]||0)} onChange={e=>number(key,e.target.value)} className="w-24 rounded border border-slate-200 px-1.5 py-1 text-right disabled:bg-slate-50"/></td>;
  const computed=(value:number)=> <td className="border bg-slate-50 p-2 text-right font-semibold">{money(value)}</td>;
  const percent=(value:number)=> <td className="border bg-slate-50 p-2 text-right">{Number(row.productSales)?`${(value/Number(row.productSales)*100).toFixed(2)}%`:'—'}</td>;
  return <tr><td className="border p-1"><input disabled={disabled} type="date" value={row.date} onChange={e=>onChange({date:e.target.value})} className="w-32 rounded border px-1.5 py-1"/></td><td className="border p-1"><input disabled={disabled} type="number" step="0.01" value={row.productSales} onChange={e=>number('productSales',e.target.value)} className="w-24 rounded border px-1.5 py-1 text-right"/></td>{fKeys.slice(0,7).map(field)}{field('foodTheoretical')}{field('foodWithoutComposition')}{computed(foodEstimate)}{percent(foodEstimate)}{computed(foodActual)}{percent(foodActual)}{computed(foodEstimate-foodActual)}{pKeys.slice(0,7).map(field)}{field('paperTheoretical')}{field('paperWithoutComposition')}{computed(paperEstimate)}{percent(paperEstimate)}{computed(paperActual)}{percent(paperActual)}{computed(paperEstimate-paperActual)}</tr>;
};

export default ObjectivesControl;
