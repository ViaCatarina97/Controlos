import React, { useMemo } from 'react';
import { DailySchedule, Employee, ShiftType, StationConfig } from '../../types';
import {
  ChevronRight,
  GraduationCap,
  X,
  AlertTriangle,
  Flame,
  Monitor,
  Car,
  Coffee,
  Package,
  Users,
  CupSoda,
  Utensils,
  CheckCircle2,
  UserPlus,
} from 'lucide-react';

type AreaKey = StationConfig['area'];

interface ZoneDef {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  iconTint: string;
  line: AreaKey[];
  side?: { title: string; areas: AreaKey[]; icon: React.ReactNode };
}

const LINE_ZONES: ZoneDef[] = [
  {
    id: 'kitchen',
    title: 'Cozinha',
    subtitle: 'Linha de produção',
    icon: <Flame size={15} />,
    iconTint: 'bg-orange-50 text-orange-600 border-orange-200/70',
    line: ['kitchen'],
    side: { title: 'Batatas', areas: ['fries'], icon: <Utensils size={13} /> },
  },
  {
    id: 'counter',
    title: 'Balcão',
    subtitle: 'Linha de serviço',
    icon: <Monitor size={15} />,
    iconTint: 'bg-sky-50 text-sky-600 border-sky-200/70',
    line: ['counter'],
    side: { title: 'Bebidas', areas: ['beverage'], icon: <CupSoda size={13} /> },
  },
];

const PLATFORM_ZONES: {
  id: string;
  title: string;
  areas: AreaKey[];
  icon: React.ReactNode;
  iconTint: string;
}[] = [
  {
    id: 'drive',
    title: 'Drive-Thru',
    areas: ['drive'],
    icon: <Car size={15} />,
    iconTint: 'bg-emerald-50 text-emerald-600 border-emerald-200/70',
  },
  {
    id: 'mccafe',
    title: 'McCafé',
    areas: ['mccafe'],
    icon: <Coffee size={15} />,
    iconTint: 'bg-amber-50 text-amber-700 border-amber-200/70',
  },
  {
    id: 'delivery',
    title: 'Delivery',
    areas: ['delivery'],
    icon: <Package size={15} />,
    iconTint: 'bg-violet-50 text-violet-600 border-violet-200/70',
  },
  {
    id: 'lobby',
    title: 'Sala',
    areas: ['lobby'],
    icon: <Users size={15} />,
    iconTint: 'bg-indigo-50 text-indigo-600 border-indigo-200/70',
  },
];

const LINE_ORDER: Record<string, string[]> = {
  kitchen: ['batch', 'bc', 'inic', 'ini', 'final', 'fin'],
  counter: ['exped', 'exp', 'runner', 'run', 'apres', 'apr', 'caixa', 'cx'],
};

const PRINT_RED = '#DA291C';
const PRINT_YELLOW = '#FFC72C';

const AVATAR_TONES = [
  'bg-sky-100 text-sky-800',
  'bg-emerald-100 text-emerald-800',
  'bg-indigo-100 text-indigo-800',
  'bg-amber-100 text-amber-900',
  'bg-violet-100 text-violet-800',
  'bg-teal-100 text-teal-800',
];

function getAvatarTone(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function toCleanTitleCase(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map(w => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

export const formatShortName = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] || '';
  return `${parts[0]} ${parts[parts.length - 1]}`;
};

const orderLineStations = (zoneId: string, stations: StationConfig[]): StationConfig[] => {
  const order = LINE_ORDER[zoneId];
  if (!order) return stations;
  const rank = (s: StationConfig) => {
    const key = `${s.designation || ''} ${s.label}`.toLowerCase();
    const idx = order.findIndex(p => key.includes(p));
    return idx === -1 ? order.length : idx;
  };
  return [...stations].sort((a, b) => rank(a) - rank(b) || a.label.localeCompare(b.label, 'pt'));
};

export interface FloorPlanProps {
  mode: 'screen' | 'print';
  stations: StationConfig[];
  schedule: DailySchedule;
  selectedShift: ShiftType;
  employees: Employee[];
  isLocked?: boolean;
  onAssign?: (stationId: string, employeeId: string) => void;
  onRemove?: (stationId: string, employeeId: string) => void;
  onAssignTrainee?: (stationId: string, employeeId: string) => void;
  onRemoveTrainee?: (stationId: string, employeeId: string) => void;
}

interface StationCardProps extends Omit<FloorPlanProps, 'stations'> {
  station: StationConfig;
  sortedEmployees: Employee[];
  compact?: boolean;
}

const StationCard: React.FC<StationCardProps> = ({
  mode,
  station,
  schedule,
  selectedShift,
  employees,
  sortedEmployees,
  isLocked,
  onAssign,
  onRemove,
  onAssignTrainee,
  onRemoveTrainee,
  compact,
}) => {
  const isPrint = mode === 'print';
  const assignedIds = schedule.shifts[selectedShift]?.[station.id] || [];
  const traineeIds = schedule.trainees?.[selectedShift]?.[station.id] || [];
  const isFull = assignedIds.length >= station.defaultSlots;
  const hasPeople = assignedIds.length > 0 || traineeIds.length > 0;
  const canEdit = !isPrint && !isLocked;

  if (isPrint) {
    return (
      <div
        className={`relative bg-white rounded-lg border-2 flex flex-col overflow-hidden min-w-[96px] flex-1 min-h-[58px] ${
          hasPeople ? 'border-slate-800' : 'border-dashed border-slate-300'
        }`}
      >
        <div
          className="flex items-center justify-between px-1.5 py-1 text-white"
          style={{ backgroundColor: hasPeople ? PRINT_RED : '#64748b' }}
        >
          <span className="font-black uppercase tracking-tight leading-none truncate text-[8px]">
            {station.designation || station.label}
          </span>
          <span
            className="font-black leading-none rounded px-1 py-0.5 text-[7px]"
            style={{ backgroundColor: PRINT_YELLOW, color: '#1e293b' }}
          >
            {assignedIds.length}/{station.defaultSlots}
          </span>
        </div>
        <div className="flex-1 flex flex-col justify-center px-1 py-1 items-center text-center">
          {assignedIds.map(id => {
            const emp = employees.find(e => e.id === id);
            if (!emp) return null;
            return (
              <span
                key={id}
                className="font-black text-slate-900 uppercase tracking-tight leading-tight truncate text-[13px]"
              >
                {formatShortName(emp.name)}
              </span>
            );
          })}
          {traineeIds.map(id => {
            const emp = employees.find(e => e.id === id);
            if (!emp) return null;
            return (
              <div
                key={id}
                className="flex items-center gap-1 rounded px-1.5 py-0.5 mt-0.5"
                style={{ backgroundColor: '#FFF4CC', border: `1px solid ${PRINT_YELLOW}` }}
              >
                <span className="font-black text-amber-800 uppercase tracking-tight leading-tight truncate flex items-center gap-1 text-[10px]">
                  <GraduationCap size={10} className="shrink-0" /> {formatShortName(emp.name)}
                </span>
              </div>
            );
          })}
          {!hasPeople && <span className="text-[9px] font-bold text-slate-300 uppercase">—</span>}
        </div>
      </div>
    );
  }

  // Modern Semantic Screen Card
  return (
    <div
      className={`group relative rounded-xl flex flex-col overflow-hidden transition-all duration-150 ${
        compact ? 'w-full sm:w-[162px]' : 'w-full sm:w-[180px]'
      } ${
        hasPeople
          ? 'bg-white border border-slate-200/90 shadow-2xs hover:shadow-sm hover:border-slate-300'
          : 'bg-amber-50/35 border border-dashed border-amber-300/90 hover:border-amber-400'
      }`}
    >
      {/* Top Semantic Accent Strip */}
      <div
        className={`h-[3px] w-full ${
          isFull ? 'bg-emerald-500' : hasPeople ? 'bg-sky-500' : 'bg-amber-400/80'
        }`}
      />

      {/* Station Header */}
      <div className="flex items-center justify-between gap-1.5 px-2.5 pt-2 pb-1">
        <div className="min-w-0 flex items-center gap-1.5">
          <span
            className={`text-[10.5px] font-extrabold tracking-tight px-1.5 py-0.5 rounded-md leading-none shrink-0 ${
              hasPeople
                ? 'bg-slate-900 text-white'
                : 'bg-amber-100 text-amber-900 border border-amber-200/80'
            }`}
          >
            {station.designation || station.label}
          </span>
          {!compact && (
            <span
              className="text-[11px] font-medium text-slate-500 truncate"
              title={station.label}
            >
              {toCleanTitleCase(station.label)}
            </span>
          )}
        </div>

        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none tabular-nums shrink-0 ${
            isFull
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
              : 'bg-amber-100/80 text-amber-800 border border-amber-200/80'
          }`}
        >
          {assignedIds.length}/{station.defaultSlots}
        </span>
      </div>

      {/* Crew & Trainees */}
      <div className="flex-1 flex flex-col justify-center px-2.5 pb-2.5 pt-1 gap-1.5">
        {assignedIds.map(id => {
          const emp = employees.find(e => e.id === id);
          if (!emp) {
            return (
              <div
                key={id}
                className="flex items-center justify-between bg-rose-50 border border-rose-200 rounded-lg px-2 py-1"
              >
                <span className="text-[11px] font-semibold text-rose-700 flex items-center gap-1">
                  <AlertTriangle size={11} /> Inativo
                </span>
                {canEdit && (
                  <button
                    onClick={() => onRemove?.(station.id, id)}
                    className="text-rose-400 hover:text-rose-700 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            );
          }

          const shortClean = toCleanTitleCase(formatShortName(emp.name));
          return (
            <div
              key={id}
              className="flex items-center justify-between gap-1.5 bg-slate-50/90 border border-slate-200/70 rounded-lg px-2 py-1.5"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`w-5 h-5 rounded-full text-[9.5px] font-bold flex items-center justify-center shrink-0 ${getAvatarTone(
                    emp.name
                  )}`}
                >
                  {getInitials(emp.name)}
                </span>
                <span
                  className="text-[12px] font-semibold text-slate-900 leading-tight truncate"
                  title={emp.name}
                >
                  {shortClean}
                </span>
              </div>
              {canEdit && (
                <button
                  onClick={() => onRemove?.(station.id, id)}
                  className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md p-0.5 shrink-0 transition-colors cursor-pointer"
                  title="Remover colaborador do posto"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          );
        })}

        {traineeIds.map(id => {
          const emp = employees.find(e => e.id === id);
          if (!emp) return null;
          return (
            <div
              key={id}
              className="flex items-center justify-between gap-1.5 bg-amber-50 border border-amber-200/90 rounded-lg px-2 py-1"
            >
              <span
                className="text-[11px] font-semibold text-amber-900 leading-tight truncate flex items-center gap-1.5"
                title={`${emp.name} (Formação)`}
              >
                <GraduationCap size={12} className="text-amber-600 shrink-0" />
                {toCleanTitleCase(formatShortName(emp.name))}
              </span>
              {canEdit && (
                <button
                  onClick={() => onRemoveTrainee?.(station.id, id)}
                  className="text-amber-500 hover:text-rose-600 rounded p-0.5 shrink-0 cursor-pointer"
                  title="Remover formando"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          );
        })}

        {!hasPeople && !canEdit && (
          <div className="py-1 flex items-center gap-1.5 text-[11px] font-medium text-amber-700/80">
            <UserPlus size={12} className="shrink-0 opacity-75" />
            <span>Posto em aberto</span>
          </div>
        )}

        {/* Quick Assign Selectors when Editable */}
        {canEdit && (
          <div className="flex gap-1 mt-auto pt-0.5">
            {!isFull && (
              <select
                className="flex-1 min-w-0 text-[11px] font-semibold border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 outline-none focus:border-slate-900 cursor-pointer"
                value=""
                onChange={e => {
                  if (e.target.value) onAssign?.(station.id, e.target.value);
                }}
              >
                <option value="">+ Atribuir</option>
                {sortedEmployees
                  .filter(e => !assignedIds.includes(e.id))
                  .map(e => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
              </select>
            )}
            <select
              className="w-8 text-[11px] font-semibold border border-amber-200 rounded-lg py-1 bg-amber-50 text-amber-800 text-center cursor-pointer outline-none"
              value=""
              title="Adicionar formando"
              onChange={e => {
                if (e.target.value) onAssignTrainee?.(station.id, e.target.value);
              }}
            >
              <option value="">🎓</option>
              {sortedEmployees
                .filter(e => !traineeIds.includes(e.id))
                .map(e => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.role})
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
};

const ZoneHeader: React.FC<{
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  iconTint?: string;
  count: number;
  filled: number;
  isPrint: boolean;
}> = ({ title, subtitle, icon, iconTint = 'bg-slate-100 text-slate-700 border-slate-200', count, filled, isPrint }) => {
  if (isPrint) {
    return (
      <div
        className="flex items-center justify-between px-3 py-1.5 text-white"
        style={{ backgroundColor: PRINT_RED }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0 opacity-90">{icon}</span>
          <span className="font-black uppercase tracking-wider leading-none text-[10px]">
            {title}
          </span>
          {subtitle && (
            <span className="font-semibold opacity-80 leading-none truncate text-[8px]">
              · {subtitle}
            </span>
          )}
        </div>
        <span
          className="font-black leading-none rounded-full px-2 py-0.5 text-[8px]"
          style={{ backgroundColor: PRINT_YELLOW, color: '#1e293b' }}
        >
          {filled}/{count}
        </span>
      </div>
    );
  }

  const allComplete = count > 0 && filled >= count;
  const missing = Math.max(0, count - filled);

  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-100">
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${iconTint}`}
        >
          {icon}
        </span>
        <div className="flex items-baseline gap-2 min-w-0">
          <h4 className="font-bold text-slate-900 text-[13.5px] tracking-tight leading-none">
            {title}
          </h4>
          {subtitle && (
            <span className="text-xs font-medium text-slate-400 leading-none truncate hidden sm:inline">
              {subtitle}
            </span>
          )}
        </div>
      </div>

      {allComplete ? (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 tabular-nums">
          <CheckCircle2 size={12.5} className="text-emerald-600" />
          {filled}/{count} completo
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 tabular-nums">
          {filled}/{count} postos · {missing === 1 ? 'falta 1' : `faltam ${missing}`}
        </span>
      )}
    </div>
  );
};

const countFilled = (stations: StationConfig[], schedule: DailySchedule, shift: ShiftType) =>
  stations.filter(s => (schedule.shifts[shift]?.[s.id] || []).length > 0).length;

export const FloorPlan: React.FC<FloorPlanProps> = props => {
  const { mode, stations, schedule, selectedShift, employees } = props;
  const isPrint = mode === 'print';

  const sortedEmployees = useMemo(() => {
    const byName = (a: Employee, b: Employee) =>
      a.name.localeCompare(b.name, 'pt', { sensitivity: 'base' });
    return [
      ...employees.filter(e => e.role !== 'GERENTE').sort(byName),
      ...employees.filter(e => e.role === 'GERENTE').sort(byName),
    ];
  }, [employees]);

  const byArea = useMemo(() => {
    const map: Partial<Record<AreaKey, StationConfig[]>> = {};
    stations.forEach(s => {
      (map[s.area] ||= []).push(s);
    });
    return map;
  }, [stations]);

  const pick = (areas: AreaKey[]) => areas.flatMap(a => byArea[a] || []);

  const cardProps = { ...props, sortedEmployees };

  const renderLine = (zone: ZoneDef) => {
    const lineStations = orderLineStations(zone.id, pick(zone.line));
    const sideStations = zone.side ? pick(zone.side.areas) : [];
    if (lineStations.length === 0 && sideStations.length === 0) return null;
    const all = [...lineStations, ...sideStations];

    return (
      <section
        key={zone.id}
        className={`overflow-hidden bg-white break-inside-avoid ${
          isPrint
            ? 'rounded-xl border-2 border-slate-800'
            : 'rounded-2xl border border-slate-200/90 shadow-xs'
        }`}
      >
        <ZoneHeader
          title={zone.title}
          subtitle={zone.subtitle}
          icon={zone.icon}
          iconTint={zone.iconTint}
          count={all.length}
          filled={countFilled(all, schedule, selectedShift)}
          isPrint={isPrint}
        />
        <div
          className={`flex ${
            isPrint ? 'flex-row items-stretch' : 'flex-col lg:flex-row lg:items-stretch'
          }`}
        >
          {/* Main Production / Service Line */}
          <div className={`flex-1 ${isPrint ? 'p-1.5 bg-slate-50/60' : 'p-3.5 bg-slate-50/45'} min-w-0`}>
            <div className={`flex items-stretch ${isPrint ? 'gap-1' : 'gap-2.5 flex-wrap'}`}>
              {lineStations.map((s, i) => (
                <React.Fragment key={s.id}>
                  {i > 0 && (
                    <div
                      className={`items-center text-slate-300 shrink-0 self-center ${
                        isPrint ? 'flex' : 'hidden sm:flex'
                      }`}
                    >
                      <ChevronRight size={isPrint ? 10 : 14} strokeWidth={2.5} />
                    </div>
                  )}
                  <StationCard {...cardProps} station={s} />
                </React.Fragment>
              ))}
              {lineStations.length === 0 && (
                <span className="text-xs font-medium text-slate-400 py-2">
                  Sem postos configurados nesta linha
                </span>
              )}
            </div>
          </div>

          {/* Attached Station Group (Batatas / Bebidas) */}
          {zone.side && sideStations.length > 0 && (
            <aside
              className={`${
                isPrint
                  ? 'p-1.5 border-l-2 border-dashed border-slate-300'
                  : 'p-3.5 border-t lg:border-t-0 lg:border-l border-dashed border-slate-200/90'
              } bg-white shrink-0`}
            >
              <div className="flex items-center gap-1.5 mb-2 text-slate-500">
                <span className="text-slate-400">{zone.side.icon}</span>
                <span
                  className={
                    isPrint
                      ? 'font-black uppercase tracking-wider text-[8px]'
                      : 'text-[11px] font-bold text-slate-600'
                  }
                >
                  {zone.side.title}
                </span>
              </div>
              <div
                className={`flex ${
                  isPrint ? 'flex-col gap-1' : 'flex-row lg:flex-col gap-2.5 flex-wrap'
                }`}
              >
                {sideStations.map(s => (
                  <StationCard key={s.id} {...cardProps} station={s} compact />
                ))}
              </div>
            </aside>
          )}
        </div>
      </section>
    );
  };

  const platforms = PLATFORM_ZONES.map(z => ({ ...z, stations: pick(z.areas) })).filter(
    z => z.stations.length > 0
  );

  return (
    <div className={`flex flex-col ${isPrint ? 'gap-1.5' : 'gap-4'}`}>
      {LINE_ZONES.map(renderLine)}

      {platforms.length > 0 && (
        <div
          className={
            isPrint
              ? 'grid gap-1.5'
              : `grid gap-4 grid-cols-1 md:grid-cols-2 ${
                  platforms.length >= 3 ? 'xl:grid-cols-3' : ''
                } ${platforms.length >= 4 ? '2xl:grid-cols-4' : ''}`
          }
          style={
            isPrint
              ? { gridTemplateColumns: `repeat(${Math.min(platforms.length, 4)}, minmax(0, 1fr))` }
              : undefined
          }
        >
          {platforms.map(z => (
            <section
              key={z.id}
              className={`overflow-hidden bg-white break-inside-avoid ${
                isPrint
                  ? 'rounded-xl border-2 border-slate-800'
                  : 'rounded-2xl border border-slate-200/90 shadow-xs'
              }`}
            >
              <ZoneHeader
                title={z.title}
                subtitle={z.id === 'lobby' ? 'Atendimento' : 'Plataforma'}
                icon={z.icon}
                iconTint={z.iconTint}
                count={z.stations.length}
                filled={countFilled(z.stations, schedule, selectedShift)}
                isPrint={isPrint}
              />
              <div
                className={`flex flex-wrap ${
                  isPrint ? 'gap-1 p-1.5 bg-slate-50/60' : 'gap-2.5 p-3.5 bg-slate-50/45'
                }`}
              >
                {z.stations.map(s => (
                  <StationCard key={s.id} {...cardProps} station={s} compact={!isPrint} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {stations.length === 0 && (
        <div className="p-8 text-center text-slate-400 text-sm font-semibold border border-dashed border-slate-200 rounded-2xl bg-white">
          Sem postos visíveis para este turno.
        </div>
      )}
    </div>
  );
};
