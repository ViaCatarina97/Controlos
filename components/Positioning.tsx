import React, { useEffect, useMemo, useState } from 'react';
import {
  AppSettings,
  DailySchedule,
  Employee,
  FloorPlanZoneId,
  HourlyProjection,
  ShiftType,
  StaffingTableEntry,
  StationAssignment,
  StationConfig,
} from '../types';
import { AVAILABLE_SHIFTS, STATIONS } from '../constants';
import { FloorPlan, FloorPlanSlotClickPayload } from './positioning/FloorPlan';
import { StationAssignmentModal } from './positioning/StationAssignmentModal';
import { AreaAndStationEditorModal } from './positioning/AreaAndStationEditorModal';
import {
  buildStationPriorityMap,
  isZoneVisibleForBusinessAreas,
  resolveStationZone,
  sortStationsByPriority,
} from '../utils/floorPlanLayout';
import { PtDateNavigator } from './ui/PtDateNavigator';
import { useToast } from './ui/ToastProvider';
import {
  CheckCircle2,
  Eraser,
  Lock,
  Printer,
  Save,
  Sliders,
  Sparkles,
  Unlock,
} from 'lucide-react';

interface PositioningProps {
  date: string;
  setDate: (date: string) => void;
  projectedSales: number;
  employees: Employee[];
  staffingTable: StaffingTableEntry[];
  schedule: DailySchedule;
  setSchedule: (schedule: DailySchedule) => void;
  settings: AppSettings;
  onSaveSettings?: (settings: AppSettings) => Promise<void> | void;
  hourlyData?: HourlyProjection[];
  onSaveSchedule: () => Promise<void> | void;
  initialShift?: ShiftType;
  onShiftChangeComplete?: () => void;
  selectedShift: ShiftType;
  setSelectedShift: (shift: ShiftType) => void;
}

const WEEKDAY_NAMES_UPPER = [
  'DOMINGO',
  'SEGUNDA',
  'TERÇA',
  'QUARTA',
  'QUINTA',
  'SEXTA',
  'SÁBADO',
];

function formatHeaderPtDate(isoDate: string): string {
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return isoDate;
  const [y, m, d] = parts;
  const dt = new Date(y, m - 1, d);
  const wd = WEEKDAY_NAMES_UPPER[dt.getDay()] || '';
  const dd = String(d).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `${wd}, ${dd}/${mm}/${y}`;
}

export const Positioning: React.FC<PositioningProps> = ({
  date,
  setDate,
  employees,
  staffingTable,
  schedule,
  setSchedule,
  settings,
  onSaveSettings,
  hourlyData = [],
  onSaveSchedule,
  initialShift,
  onShiftChangeComplete,
  selectedShift,
  setSelectedShift,
}) => {
  const { showToast: toast } = useToast();

  // Active slot modal state
  const [activeSlot, setActiveSlot] = useState<FloorPlanSlotClickPayload | null>(null);

  // Area & Station Name/Zone Editor modal state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorInitialZone, setEditorInitialZone] = useState<FloorPlanZoneId | null>(null);
  const [editorInitialStationId, setEditorInitialStationId] = useState<string | null>(null);
  const [editorInitialTab, setEditorInitialTab] = useState<'areas' | 'stations'>('areas');

  const [isSaving, setIsSaving] = useState(false);

  const availableShifts: ShiftType[] = useMemo(
    () =>
      settings.activeShifts && settings.activeShifts.length > 0
        ? settings.activeShifts
        : ['ABERTURA', 'INTERMEDIO', 'FECHO'],
    [settings.activeShifts]
  );

  useEffect(() => {
    if (initialShift && availableShifts.includes(initialShift)) {
      setSelectedShift(initialShift);
      onShiftChangeComplete?.();
    }
  }, [initialShift, availableShifts, setSelectedShift, onShiftChangeComplete]);

  useEffect(() => {
    if (!availableShifts.includes(selectedShift) && availableShifts.length > 0) {
      setSelectedShift(availableShifts[0]);
    }
  }, [availableShifts, selectedShift, setSelectedShift]);

  const stations: StationConfig[] = useMemo(
    () =>
      settings.customStations && settings.customStations.length > 0
        ? settings.customStations
        : STATIONS,
    [settings.customStations]
  );

  const priorityMap = useMemo(
    () => buildStationPriorityMap(stations, staffingTable),
    [stations, staffingTable]
  );

  const isShiftLocked = useMemo(
    () => (schedule.lockedShifts || []).includes(selectedShift),
    [schedule.lockedShifts, selectedShift]
  );

  // Sales calculation (explicit shift sales -> hourly peak fallback)
  const effectiveSales = useMemo(() => {
    const manualSales = schedule.projectedSales?.[selectedShift];
    if (manualSales !== undefined && manualSales > 0) return manualSales;

    const targetHours =
      selectedShift === 'FECHO' || selectedShift === 'MADRUGADA'
        ? ['19h-20h', '20h-21h']
        : ['12h-13h', '13h-14h'];
    const matching = hourlyData.filter(d => targetHours.includes(d.hour));
    if (matching.length > 0) {
      return Math.max(...matching.map(m => m.totalSales));
    }
    return manualSales || 0;
  }, [schedule.projectedSales, selectedShift, hourlyData]);

  // Required staff from staffing table + manual adjustment
  const manualAdj = schedule.manualAdjustments?.[selectedShift] || 0;

  const predictedStaffCount = useMemo(() => {
    if (!staffingTable || staffingTable.length === 0) return Math.max(0, manualAdj);
    const sorted = [...staffingTable].sort((a, b) => a.minSales - b.minSales);
    const exactIdx = sorted.findIndex(
      r => effectiveSales >= r.minSales && effectiveSales <= r.maxSales
    );
    let idx = exactIdx;
    if (idx === -1) {
      sorted.forEach((r, i) => {
        if (effectiveSales >= r.minSales) idx = i;
      });
    }
    const base = idx === -1 ? 0 : sorted[idx].staffCount;
    return Math.max(0, base + manualAdj);
  }, [staffingTable, effectiveSales, manualAdj]);

  const currentShiftAssignments: StationAssignment = useMemo(
    () => schedule.shifts?.[selectedShift] || {},
    [schedule.shifts, selectedShift]
  );

  const currentShiftTrainees: StationAssignment = useMemo(
    () => schedule.trainees?.[selectedShift] || {},
    [schedule.trainees, selectedShift]
  );

  // Count distinct active crew assigned across visible stations
  const positionedStaffCount = useMemo(() => {
    const validIds = new Set(employees.map(e => e.id));
    const unique = new Set<string>();
    Object.values(currentShiftAssignments).forEach(arr => {
      if (Array.isArray(arr)) {
        arr.forEach(id => {
          if (id && validIds.has(id.trim())) {
            unique.add(id.trim());
          }
        });
      }
    });
    return unique.size;
  }, [currentShiftAssignments, employees]);

  const managersList = useMemo(
    () =>
      employees.filter(
        e =>
          e.role === 'GERENTE_RESTAURANTE' ||
          e.role === 'GERENTE' ||
          e.role === 'TREINADOR'
      ),
    [employees]
  );

  const leaderId = schedule.shiftManagers?.[selectedShift]?.leader || '';
  const supportId = schedule.shiftManagers?.[selectedShift]?.support || '';

  const resolveEmployeeDisplayName = (idOrName: string): string => {
    if (!idOrName) return '—';
    const found = employees.find(e => e.id === idOrName);
    return (found ? found.name : idOrName).toUpperCase();
  };

  const turnObjective = schedule.shiftObjectives?.[selectedShift]?.turnObjective || '';
  const productionObjective = schedule.shiftObjectives?.[selectedShift]?.productionObjective || '';

  const shiftLabelUpper = useMemo(() => {
    const found = AVAILABLE_SHIFTS.find(s => s.id === selectedShift);
    return (found ? found.label : selectedShift).toUpperCase();
  }, [selectedShift]);

  // --- Handlers ---

  const updateManagers = (field: 'leader' | 'support', val: string) => {
    if (isShiftLocked) return;
    setSchedule({
      ...schedule,
      shiftManagers: {
        ...(schedule.shiftManagers || {}),
        [selectedShift]: {
          ...(schedule.shiftManagers?.[selectedShift] || {}),
          [field]: val,
        },
      },
    });
  };

  const updateSales = (rawVal: string) => {
    if (isShiftLocked) return;
    const numeric = Math.max(0, Number(rawVal.replace(/[^\d.]/g, '')) || 0);
    setSchedule({
      ...schedule,
      projectedSales: {
        ...(schedule.projectedSales || {}),
        [selectedShift]: numeric,
      },
    });
  };

  const updateObjective = (field: 'turnObjective' | 'productionObjective', val: string) => {
    if (isShiftLocked) return;
    setSchedule({
      ...schedule,
      shiftObjectives: {
        ...(schedule.shiftObjectives || {}),
        [selectedShift]: {
          ...(schedule.shiftObjectives?.[selectedShift] || {}),
          [field]: val,
        },
      },
    });
  };

  const handleAssignEmployee = (stationId: string, slotIndex: number, employeeId: string) => {
    if (isShiftLocked) {
      toast('Este turno encontra-se bloqueado. Desbloqueie primeiro para editar.', 'info');
      return;
    }

    const updatedShift: StationAssignment = { ...currentShiftAssignments };

    // Remove employee from any previous slot in the same shift so there are never unintended duplicates
    if (employeeId) {
      Object.keys(updatedShift).forEach(stKey => {
        updatedShift[stKey] = (updatedShift[stKey] || []).map(existing =>
          existing === employeeId ? '' : existing
        );
      });
    }

    const targetArr = [...(updatedShift[stationId] || [])];
    targetArr[slotIndex] = employeeId;
    updatedShift[stationId] = targetArr;

    setSchedule({
      ...schedule,
      shifts: {
        ...(schedule.shifts || {}),
        [selectedShift]: updatedShift,
      },
    });
  };

  const handleAssignTrainee = (stationId: string, slotIndex: number, employeeId: string) => {
    if (isShiftLocked) {
      toast('Este turno encontra-se bloqueado.', 'info');
      return;
    }
    const updatedTrainees: StationAssignment = { ...currentShiftTrainees };
    const targetArr = [...(updatedTrainees[stationId] || [])];
    targetArr[slotIndex] = employeeId;
    updatedTrainees[stationId] = targetArr;

    setSchedule({
      ...schedule,
      trainees: {
        ...(schedule.trainees || {}),
        [selectedShift]: updatedTrainees,
      },
    });
  };

  const handleAutoFillByPriority = () => {
    if (isShiftLocked) {
      toast('Desbloqueie o turno antes de preencher automaticamente.', 'info');
      return;
    }
    const orderedStations = sortStationsByPriority(
      stations.filter(
        s => s.isActive && isZoneVisibleForBusinessAreas(resolveStationZone(s), settings.businessAreas)
      ),
      priorityMap
    );

    const target = predictedStaffCount > 0 ? predictedStaffCount : Math.min(employees.length, orderedStations.length);
    const managerIds = new Set([leaderId, supportId].filter(Boolean));
    const availableCrew = employees.filter(e => !managerIds.has(e.id));

    const nextShift: StationAssignment = {};
    let crewIdx = 0;

    for (const st of orderedStations) {
      if (crewIdx >= target || crewIdx >= availableCrew.length) break;
      const slots = Math.max(1, st.defaultSlots || 1);
      const arr: string[] = [];
      for (let i = 0; i < slots; i++) {
        if (crewIdx < target && crewIdx < availableCrew.length) {
          arr.push(availableCrew[crewIdx].id);
          crewIdx++;
        }
      }
      nextShift[st.id] = arr;
    }

    setSchedule({
      ...schedule,
      shifts: {
        ...(schedule.shifts || {}),
        [selectedShift]: nextShift,
      },
    });
    toast(`Posicionados ${crewIdx} colaboradores pela ordem de prioridade dos postos.`, 'success');
  };

  const handleClearShift = () => {
    if (isShiftLocked) return;
    setSchedule({
      ...schedule,
      shifts: {
        ...(schedule.shifts || {}),
        [selectedShift]: {},
      },
      trainees: {
        ...(schedule.trainees || {}),
        [selectedShift]: {},
      },
    });
    toast(`Turno ${shiftLabelUpper} limpo.`, 'info');
  };

  const toggleShiftLock = () => {
    const current = schedule.lockedShifts || [];
    const next = isShiftLocked
      ? current.filter(s => s !== selectedShift)
      : [...current, selectedShift];
    setSchedule({
      ...schedule,
      lockedShifts: next,
    });
  };

  const handleSaveClick = async () => {
    setIsSaving(true);
    try {
      await onSaveSchedule();
      toast('Posicionamento guardado com sucesso!', 'success');
    } catch {
      toast('Erro ao guardar o posicionamento.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* =====================================================================
          1. COMPACT SCREEN ACTION BAR (Hidden on Print)
         ===================================================================== */}
      <div className="no-print flex flex-wrap items-center justify-between gap-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <PtDateNavigator value={date} onChange={setDate} />

          {/* Quick Shift Pills */}
          <div className="inline-flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1 gap-0.5">
            {availableShifts.map(sh => {
              const meta = AVAILABLE_SHIFTS.find(a => a.id === sh);
              const active = sh === selectedShift;
              return (
                <button
                  key={sh}
                  type="button"
                  onClick={() => setSelectedShift(sh)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold uppercase tracking-tight transition-all ${
                    active
                      ? 'bg-[#FFC72C] text-slate-950 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  {meta ? meta.label : sh}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onSaveSettings && (
            <button
              type="button"
              onClick={() => {
                setEditorInitialZone(null);
                setEditorInitialStationId(null);
                setEditorInitialTab('areas');
                setEditorOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 transition-colors"
            >
              <Sliders className="w-3.5 h-3.5 text-[#DA291C]" />
              Editar Áreas / Postos
            </button>
          )}

          <button
            type="button"
            onClick={handleAutoFillByPriority}
            title="Distribuir automaticamente pelos postos segundo a ordem de prioridade 1..N"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            Auto-Preencher
          </button>

          <button
            type="button"
            onClick={handleClearShift}
            title="Limpar todos os postos deste turno"
            className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-red-700 hover:bg-red-50 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
          >
            <Eraser className="w-3.5 h-3.5" />
            Limpar
          </button>

          <button
            type="button"
            onClick={toggleShiftLock}
            title={isShiftLocked ? 'Desbloquear turno' : 'Bloquear turno contra edições acidentais'}
            className={`inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold border transition-colors ${
              isShiftLocked
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
            }`}
          >
            {isShiftLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveClick}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold bg-slate-900 hover:bg-slate-800 text-white shadow-2xs transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <CheckCircle2 className="w-3.5 h-3.5 animate-pulse" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Guardar
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold bg-[#DA291C] hover:bg-red-700 text-white shadow-2xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir A4
          </button>
        </div>
      </div>

      {/* =====================================================================
          2. INTERACTIVE SCREEN POSITIONING SHEET (Matches A4 Layout 1:1)
         ===================================================================== */}
      <div className="no-print bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-3.5">
        {/* Top Row: Red Title Block + Bordered Date Card + Yellow Shift Pill */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-stretch">
          <div className="lg:col-span-7 bg-[#DA291C] text-white rounded-xl px-4 py-2.5 flex flex-col justify-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/85 leading-none mb-1">
              POSICIONAMENTO
            </span>
            <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight leading-none">
              {settings.restaurantName}
            </h1>
          </div>

          <div className="lg:col-span-3 bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 rounded-xl px-3.5 py-2 flex flex-col justify-center">
            <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 leading-none mb-1">
              DATA
            </span>
            <span className="text-xs sm:text-sm font-black uppercase tracking-tight text-slate-950 dark:text-white leading-tight">
              {formatHeaderPtDate(date)}
            </span>
          </div>

          <div className="lg:col-span-2 bg-[#FFC72C] text-slate-950 rounded-xl px-3.5 py-2.5 flex items-center justify-center">
            <select
              aria-label="Selecionar Turno"
              value={selectedShift}
              onChange={e => setSelectedShift(e.target.value as ShiftType)}
              className="w-full bg-transparent text-center text-sm sm:text-base font-black uppercase tracking-wide text-slate-950 focus:outline-none cursor-pointer"
            >
              {availableShifts.map(sh => (
                <option key={sh} value={sh}>
                  {(AVAILABLE_SHIFTS.find(a => a.id === sh)?.label || sh).toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Second Row: 5 KPI / Management Boxes */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {/* 1. Gerente de Turno */}
          <div className="rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2">
            <label className="block text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
              GERENTE DE TURNO
            </label>
            <select
              value={leaderId}
              disabled={isShiftLocked}
              onChange={e => updateManagers('leader', e.target.value)}
              className="w-full bg-transparent text-xs sm:text-sm font-black uppercase tracking-tight text-slate-950 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="">— Selecionar —</option>
              {(managersList.length > 0 ? managersList : employees).map(m => (
                <option key={m.id} value={m.id}>
                  {m.name.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Gerente de Apoio */}
          <div className="rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2">
            <label className="block text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
              GERENTE DE APOIO
            </label>
            <select
              value={supportId}
              disabled={isShiftLocked}
              onChange={e => updateManagers('support', e.target.value)}
              className="w-full bg-transparent text-xs sm:text-sm font-black uppercase tracking-tight text-slate-950 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="">— Nenhum —</option>
              {(managersList.length > 0 ? managersList : employees).map(m => (
                <option key={m.id} value={m.id}>
                  {m.name.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Vendas Previstas */}
          <div className="rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2">
            <label className="block text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
              VENDAS PREVISTAS
            </label>
            <div className="flex items-baseline gap-1">
              <input
                type="number"
                min={0}
                step={50}
                disabled={isShiftLocked}
                value={effectiveSales || ''}
                placeholder="0"
                onChange={e => updateSales(e.target.value)}
                className="w-full bg-transparent text-xs sm:text-sm font-black tabular-nums text-slate-950 dark:text-white focus:outline-none"
              />
              <span className="text-xs sm:text-sm font-black text-slate-950 dark:text-white shrink-0">
                €
              </span>
            </div>
          </div>

          {/* 4. Previstos */}
          <div className="rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 flex items-center justify-between gap-2">
            <div>
              <span className="block text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                PREVISTOS
              </span>
              <span className="text-sm sm:text-base font-black tabular-nums text-slate-950 dark:text-white leading-none">
                {predictedStaffCount}
              </span>
            </div>
            {!isShiftLocked && (
              <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] font-bold">
                <button
                  type="button"
                  title="Ajuste manual -1"
                  onClick={() =>
                    setSchedule({
                      ...schedule,
                      manualAdjustments: {
                        ...(schedule.manualAdjustments || {}),
                        [selectedShift]: manualAdj - 1,
                      },
                    })
                  }
                  className="px-1.5 py-0.5 text-slate-500 hover:text-slate-950"
                >
                  -
                </button>
                <button
                  type="button"
                  title="Ajuste manual +1"
                  onClick={() =>
                    setSchedule({
                      ...schedule,
                      manualAdjustments: {
                        ...(schedule.manualAdjustments || {}),
                        [selectedShift]: manualAdj + 1,
                      },
                    })
                  }
                  className="px-1.5 py-0.5 text-slate-500 hover:text-slate-950 border-l border-slate-200 dark:border-slate-700"
                >
                  +
                </button>
              </div>
            )}
          </div>

          {/* 5. Posicionados */}
          <div className="rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 flex items-center justify-between gap-2">
            <div>
              <span className="block text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                POSICIONADOS
              </span>
              <span className="text-sm sm:text-base font-black tabular-nums text-slate-950 dark:text-white leading-none">
                {positionedStaffCount}
              </span>
            </div>
            {predictedStaffCount > 0 && (
              <span
                className={`text-[10.5px] font-extrabold px-2 py-0.5 rounded-full tabular-nums ${
                  positionedStaffCount === predictedStaffCount
                    ? 'bg-emerald-100 text-emerald-800'
                    : positionedStaffCount < predictedStaffCount
                    ? 'bg-amber-100 text-amber-900'
                    : 'bg-sky-100 text-sky-900'
                }`}
              >
                {positionedStaffCount - predictedStaffCount >= 0
                  ? `+${positionedStaffCount - predictedStaffCount}`
                  : positionedStaffCount - predictedStaffCount}
              </span>
            )}
          </div>
        </div>

        {/* Third Row: Shift & Production Objectives with Colored Left Accent Bars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          <div className="rounded-xl border border-slate-300 dark:border-slate-800 border-l-4 border-l-[#DA291C] bg-white dark:bg-slate-900 px-3.5 py-2">
            <label className="block text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 mb-0.5">
              OBJETIVO DE TURNO
            </label>
            <input
              type="text"
              disabled={isShiftLocked}
              value={turnObjective}
              onChange={e => updateObjective('turnObjective', e.target.value)}
              placeholder='Ex.: SOS < 160" | R2P < 90" | Hospitalidade 100%'
              className="w-full bg-transparent text-xs sm:text-sm font-extrabold text-slate-950 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none"
            />
          </div>

          <div className="rounded-xl border border-slate-300 dark:border-slate-800 border-l-4 border-l-[#FFC72C] bg-white dark:bg-slate-900 px-3.5 py-2">
            <label className="block text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 mb-0.5">
              OBJETIVO DE PRODUÇÃO
            </label>
            <input
              type="text"
              disabled={isShiftLocked}
              value={productionObjective}
              onChange={e => updateObjective('productionObjective', e.target.value)}
              placeholder='Ex.: KVS < 50" | Tabuleiros e EHC rigorosos'
              className="w-full bg-transparent text-xs sm:text-sm font-extrabold text-slate-950 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Interactive Spatial Floor Plan */}
        <FloorPlan
          stations={stations}
          staffingTable={staffingTable}
          businessAreas={settings.businessAreas}
          assignments={currentShiftAssignments}
          trainees={currentShiftTrainees}
          employees={employees}
          floorPlanLabels={settings.floorPlanLabels}
          printMode={false}
          onSlotClick={payload => setActiveSlot(payload)}
          onEditZoneClick={
            onSaveSettings
              ? zoneId => {
                  setEditorInitialZone(zoneId);
                  setEditorInitialStationId(null);
                  setEditorInitialTab('areas');
                  setEditorOpen(true);
                }
              : undefined
          }
          onAddStationToZone={
            onSaveSettings
              ? zoneId => {
                  setEditorInitialZone(zoneId);
                  setEditorInitialStationId(null);
                  setEditorInitialTab('stations');
                  setEditorOpen(true);
                }
              : undefined
          }
        />
      </div>

      {/* =====================================================================
          3. DEDICATED PORTRAIT A4 SINGLE-PAGE PRINT CONTAINER (.print-portrait)
         ===================================================================== */}
      <div className="hidden print:block print-container print-portrait bg-white text-slate-950 font-sans">
        <div className="space-y-2">
          {/* Print Row 1: Red Title + Bordered Date + Yellow Shift */}
          <div className="grid grid-cols-12 gap-2 items-stretch">
            <div className="col-span-7 bg-[#DA291C] text-white rounded-lg px-3.5 py-2 flex flex-col justify-center">
              <span className="text-[8.5px] font-bold uppercase tracking-widest text-white/90 leading-none mb-0.5">
                POSICIONAMENTO
              </span>
              <div className="text-base font-black uppercase tracking-tight leading-none">
                {settings.restaurantName}
              </div>
            </div>

            <div className="col-span-3 bg-white border-[1.5px] border-slate-900 rounded-lg px-3 py-1.5 flex flex-col justify-center">
              <span className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400 leading-none mb-0.5">
                DATA
              </span>
              <span className="text-[11px] font-black uppercase tracking-tight text-slate-950 leading-tight">
                {formatHeaderPtDate(date)}
              </span>
            </div>

            <div className="col-span-2 bg-[#FFC72C] text-slate-950 rounded-lg px-2.5 py-2 flex items-center justify-center text-center">
              <span className="text-xs font-black uppercase tracking-wide leading-none">
                {shiftLabelUpper}
              </span>
            </div>
          </div>

          {/* Print Row 2: 5 KPI Boxes */}
          <div className="grid grid-cols-5 gap-1.5">
            <div className="rounded-lg border border-slate-300 bg-white px-2.5 py-1">
              <div
                style={{ letterSpacing: '0.03em', wordSpacing: '0.16em' }}
                className="text-[7px] font-extrabold uppercase text-slate-400 leading-none mb-0.5"
              >
                GERENTE DE TURNO
              </div>
              <div
                style={{ letterSpacing: '0.02em', wordSpacing: '0.14em' }}
                className="text-[10px] font-black uppercase text-slate-950 leading-tight break-words"
              >
                {resolveEmployeeDisplayName(leaderId)}
              </div>
            </div>

            <div className="rounded-lg border border-slate-300 bg-white px-2.5 py-1">
              <div
                style={{ letterSpacing: '0.03em', wordSpacing: '0.16em' }}
                className="text-[7px] font-extrabold uppercase text-slate-400 leading-none mb-0.5"
              >
                GERENTE DE APOIO
              </div>
              <div
                style={{ letterSpacing: '0.02em', wordSpacing: '0.14em' }}
                className="text-[10px] font-black uppercase text-slate-950 leading-tight break-words"
              >
                {resolveEmployeeDisplayName(supportId)}
              </div>
            </div>

            <div className="rounded-lg border border-slate-300 bg-white px-2.5 py-1">
              <div
                style={{ letterSpacing: '0.03em', wordSpacing: '0.16em' }}
                className="text-[7px] font-extrabold uppercase text-slate-400 leading-none mb-0.5"
              >
                VENDAS PREVISTAS
              </div>
              <div className="text-[10.5px] font-black tabular-nums text-slate-950 leading-tight">
                {effectiveSales} €
              </div>
            </div>

            <div className="rounded-lg border border-slate-300 bg-white px-2.5 py-1">
              <div
                style={{ letterSpacing: '0.03em', wordSpacing: '0.16em' }}
                className="text-[7px] font-extrabold uppercase text-slate-400 leading-none mb-0.5"
              >
                PREVISTOS
              </div>
              <div className="text-[10.5px] font-black tabular-nums text-slate-950 leading-tight">
                {predictedStaffCount}
              </div>
            </div>

            <div className="rounded-lg border border-slate-300 bg-white px-2.5 py-1">
              <div
                style={{ letterSpacing: '0.03em', wordSpacing: '0.16em' }}
                className="text-[7px] font-extrabold uppercase text-slate-400 leading-none mb-0.5"
              >
                POSICIONADOS
              </div>
              <div className="text-[10.5px] font-black tabular-nums text-slate-950 leading-tight">
                {positionedStaffCount}
              </div>
            </div>
          </div>

          {/* Print Row 3: 2 Objective Strips */}
          <div className="grid grid-cols-2 gap-1.5">
            <div className="rounded-lg border border-slate-300 border-l-4 border-l-[#DA291C] bg-white px-2.5 py-1">
              <div
                style={{ letterSpacing: '0.03em', wordSpacing: '0.16em' }}
                className="text-[7px] font-extrabold uppercase text-slate-400 leading-none mb-0.5"
              >
                OBJETIVO DE TURNO
              </div>
              <div className="text-[9.5px] font-black text-slate-950 leading-tight break-words min-h-[11px]">
                {turnObjective || '—'}
              </div>
            </div>

            <div className="rounded-lg border border-slate-300 border-l-4 border-l-[#FFC72C] bg-white px-2.5 py-1">
              <div
                style={{ letterSpacing: '0.03em', wordSpacing: '0.16em' }}
                className="text-[7px] font-extrabold uppercase text-slate-400 leading-none mb-0.5"
              >
                OBJETIVO DE PRODUÇÃO
              </div>
              <div className="text-[9.5px] font-black text-slate-950 leading-tight break-words min-h-[11px]">
                {productionObjective || '—'}
              </div>
            </div>
          </div>

          {/* Print Spatial Floor Plan */}
          <FloorPlan
            stations={stations}
            staffingTable={staffingTable}
            businessAreas={settings.businessAreas}
            assignments={currentShiftAssignments}
            trainees={currentShiftTrainees}
            employees={employees}
            floorPlanLabels={settings.floorPlanLabels}
            printMode={true}
          />
        </div>
      </div>

      {/* =====================================================================
          4. MODALS: CREW PICKER + AREA & STATION CUSTOMIZER
         ===================================================================== */}
      <StationAssignmentModal
        isOpen={Boolean(activeSlot)}
        onClose={() => setActiveSlot(null)}
        station={activeSlot?.station || null}
        slotIndex={activeSlot?.slotIndex || 0}
        priorityRank={activeSlot ? priorityMap.get(activeSlot.station.id) : undefined}
        employees={employees}
        assignments={currentShiftAssignments}
        trainees={currentShiftTrainees}
        allStations={stations}
        onAssignEmployee={handleAssignEmployee}
        onAssignTrainee={handleAssignTrainee}
        onEditStationMeta={
          onSaveSettings
            ? stationId => {
                setEditorInitialZone(null);
                setEditorInitialStationId(stationId);
                setEditorInitialTab('stations');
                setEditorOpen(true);
              }
            : undefined
        }
      />

      {onSaveSettings && (
        <AreaAndStationEditorModal
          isOpen={editorOpen}
          onClose={() => setEditorOpen(false)}
          settings={settings}
          onSaveSettings={async updated => {
            await onSaveSettings(updated);
            toast('Nomes das áreas e postos atualizados!', 'success');
          }}
          initialZone={editorInitialZone}
          initialStationId={editorInitialStationId}
          initialTab={editorInitialTab}
        />
      )}
    </div>
  );
};
