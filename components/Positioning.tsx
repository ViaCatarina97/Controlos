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
  const [staffingAdjustmentOpen, setStaffingAdjustmentOpen] = useState(false);
  const [adjustmentMode, setAdjustmentMode] = useState<'add' | 'remove'>('add');
  const [adjustmentAmount, setAdjustmentAmount] = useState(1);
  const [adjustmentReason, setAdjustmentReason] = useState('');

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

  // O gerente escolhe a hora operacional de referência. O valor vem da previsão horária
  // calculada a partir dos dias históricos selecionados em «Previsão & Vendas».
  const staffingHourOptions = selectedShift === 'FECHO' || selectedShift === 'MADRUGADA'
    ? (['19h-20h', '20h-21h'] as const)
    : (['12h-13h', '13h-14h'] as const);
  const defaultStaffingHour = staffingHourOptions[0];
  const staffingHour = schedule.staffingHours?.[selectedShift] || defaultStaffingHour;
  const selectedHourProjection = (schedule.hourlyProjections?.[selectedShift] || [])
    .find(item => item.hour === staffingHour);
  const effectiveSales = Math.max(0, Number(
    selectedHourProjection?.totalSales ?? schedule.projectedSales?.[selectedShift] ?? 0
  ) || 0);

  const updateStaffingHour = (hour: typeof staffingHourOptions[number]) => {
    if (isShiftLocked) return;
    setSchedule({
      ...schedule,
      staffingHours: { ...(schedule.staffingHours || {}), [selectedShift]: hour },
    });
  };

  const openStaffingAdjustment = () => {
    setAdjustmentMode('add');
    setAdjustmentAmount(1);
    setAdjustmentReason('');
    setStaffingAdjustmentOpen(true);
  };

  const saveStaffingAdjustment = () => {
    const amount = Math.max(1, Math.floor(Number(adjustmentAmount) || 1));
    const operationDelta = adjustmentMode === 'add' ? amount : -amount;
    const previous = schedule.staffingAdjustments?.[selectedShift];
    const delta = (previous?.delta || 0) + operationDelta;
    const actionText = `${adjustmentMode === 'add' ? 'Acrescentado' : 'Retirado'} ${amount}: ${adjustmentReason.trim()}`;
    const reason = [previous?.reason, actionText].filter(Boolean).join(' | ');
    setSchedule({
      ...schedule,
      staffingAdjustments: {
        ...(schedule.staffingAdjustments || {}),
        [selectedShift]: { delta, reason },
      },
    });
    setStaffingAdjustmentOpen(false);
    setAdjustmentReason('');
    toast(`Ajustamento registado: ${delta > 0 ? '+' : ''}${delta} posto(s).`, 'success');
  };

  const toggleAllStations = () => {
    if (isShiftLocked) return;
    setSchedule({
      ...schedule,
      allStationsOpen: {
        ...(schedule.allStationsOpen || {}),
        [selectedShift]: !allStationsOpen,
      },
    });
  };

  // Previstos baseados na tabela Staffing; ajustamentos manuais são sempre justificados.
  const staffingBaseCount = useMemo(() => {
    if (!staffingTable || staffingTable.length === 0) return 0;
    const sorted = [...staffingTable].sort((a, b) => a.minSales - b.minSales);
    const exactMatches = sorted.filter(r => effectiveSales >= r.minSales && effectiveSales <= r.maxSales);
    const candidates = exactMatches.length
      ? exactMatches
      : sorted.filter(r => effectiveSales >= r.minSales);
    const selectedRule = candidates.reduce<StaffingTableEntry | undefined>(
      (best, row) => !best || row.staffCount > best.staffCount ? row : best,
      undefined
    );
    return Math.max(0, selectedRule?.staffCount || 0);
  }, [staffingTable, effectiveSales]);
  const staffingAdjustment = schedule.staffingAdjustments?.[selectedShift];
  const predictedStaffCount = Math.max(0, staffingBaseCount + (staffingAdjustment?.delta || 0));
  const allStationsOpen = Boolean(schedule.allStationsOpen?.[selectedShift]);

  // Abre apenas os primeiros N lugares pela ordem de prioridade definida em Staffing.
  // Cada posto pode ter mais do que uma vaga; a última estação pode ficar parcialmente aberta.
  const slotLimitByStation = useMemo(() => {
    const ordered = sortStationsByPriority(
      stations.filter(s => allStationsOpen
        ? s.isActive || priorityMap.has(s.id)
        : s.isActive && isZoneVisibleForBusinessAreas(resolveStationZone(s), settings.businessAreas)),
      priorityMap
    );
    let remaining = allStationsOpen
      ? ordered.reduce((sum, station) => sum + Math.max(1, station.defaultSlots || 1), 0)
      : predictedStaffCount;
    const limits: Record<string, number> = {};
    for (const station of ordered) {
      if (remaining <= 0) break;
      const capacity = Math.max(1, station.defaultSlots || 1);
      const openSlots = Math.min(capacity, remaining);
      limits[station.id] = openSlots;
      remaining -= openSlots;
    }
    return limits;
  }, [stations, settings.businessAreas, priorityMap, predictedStaffCount, allStationsOpen]);

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
          <button
            type="button"
            disabled={isShiftLocked}
            onClick={toggleAllStations}
            aria-pressed={allStationsOpen}
            title="Abrir ou fechar todos os postos ativos, independentemente dos previstos"
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold border transition-colors disabled:opacity-50 ${
              allStationsOpen
                ? 'bg-[#FFC72C] border-amber-300 text-slate-950'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50'
            }`}
          >
            Todos os Postos
          </button>

          <button
            type="button"
            disabled={isShiftLocked}
            onClick={openStaffingAdjustment}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-50"
          >
            Ajustar Postos
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
          <div className="rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-center">
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
          <div className="rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-center">
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
          <div className="rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-center">
            <label className="block text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
              VENDAS PREVISTAS
            </label>
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs sm:text-sm font-black tabular-nums text-slate-950 dark:text-white">
                {effectiveSales.toLocaleString('pt-PT')} €
              </span>
              <select
                aria-label="Hora de referência para Staffing"
                title="Escolha a hora usada para calcular os previstos"
                value={staffingHour}
                disabled={isShiftLocked}
                onChange={e => updateStaffingHour(e.target.value as typeof staffingHourOptions[number])}
                className="max-w-[82px] rounded-md border border-slate-200 bg-slate-50 px-1.5 py-1 text-[10px] font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {staffingHourOptions.map(hour => (
                  <option key={hour} value={hour}>{hour.slice(0, 3)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. Previstos */}
          <div className="rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 flex flex-col items-center justify-center gap-1 text-center">
            <div>
              <span className="block text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                PREVISTOS
              </span>
              <span className="text-sm sm:text-base font-black tabular-nums text-slate-950 dark:text-white leading-none">
                {predictedStaffCount}
              </span>
            </div>
            <span className="text-[9px] font-semibold text-slate-400">via Staffing</span>
          </div>

          {/* 5. Posicionados */}
          <div className="rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 flex flex-col items-center justify-center gap-1 text-center">
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
          slotLimitByStation={slotLimitByStation}
          allStaffingPostsOpen={allStationsOpen}
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
            slotLimitByStation={slotLimitByStation}
            allStaffingPostsOpen={allStationsOpen}
            printMode={true}
          />
        </div>
      </div>

      {/* =====================================================================
          4. MODALS: CREW PICKER + AREA & STATION CUSTOMIZER
         ===================================================================== */}
      {staffingAdjustmentOpen && (
        <div className="fixed inset-0 z-[70] no-print flex items-center justify-center bg-slate-950/60 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="staffing-adjustment-title" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <h2 id="staffing-adjustment-title" className="text-base font-black text-slate-950 dark:text-white">Ajustar postos previstos</h2>
            <p className="mt-1 text-xs text-slate-500">Base Staffing: {staffingBaseCount}. Indique a alteração e o motivo; o ajuste fica guardado neste turno.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setAdjustmentMode('add')} className={`rounded-lg border px-3 py-2 text-sm font-extrabold ${adjustmentMode === 'add' ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-600'}`}>Acrescentar</button>
              <button type="button" onClick={() => setAdjustmentMode('remove')} className={`rounded-lg border px-3 py-2 text-sm font-extrabold ${adjustmentMode === 'remove' ? 'border-red-500 bg-red-50 text-red-800' : 'border-slate-200 text-slate-600'}`}>Retirar</button>
            </div>
            <label className="mt-4 block text-xs font-bold text-slate-600 dark:text-slate-300">Número de postos</label>
            <input type="number" min={1} step={1} value={adjustmentAmount} onChange={e => setAdjustmentAmount(Math.max(1, Number(e.target.value) || 1))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
            <label className="mt-3 block text-xs font-bold text-slate-600 dark:text-slate-300">Motivo (obrigatório)</label>
            <textarea autoFocus rows={3} value={adjustmentReason} onChange={e => setAdjustmentReason(e.target.value)} placeholder="Ex.: evento especial, formação, ausência..." className="mt-1 w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setStaffingAdjustmentOpen(false)} className="rounded-lg px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100">Cancelar</button>
              <button type="button" disabled={!adjustmentReason.trim()} onClick={saveStaffingAdjustment} className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-extrabold text-white disabled:opacity-40">Aplicar ajuste</button>
            </div>
          </div>
        </div>
      )}

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
