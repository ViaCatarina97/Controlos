import React, { useMemo } from 'react';
import { DailySchedule, Employee, ShiftType, StationConfig } from '../../types';
import { ChevronRight, GraduationCap, X, AlertTriangle, Flame, Monitor, Car, Coffee, Package, Users, CupSoda, Utensils } from 'lucide-react';

/**
 * Planta 2D do restaurante para o Posicionamento.
 *
 * Estrutura:
 *  - COZINHA  → linha de produção horizontal (Batch Cookers → Iniciadores → Finalizadores)
 *               com a zona BATATAS anexada ao lado.
 *  - BALCÃO   → linha de serviço horizontal (Expedidores → Runners → Apresentadores → Caixas)
 *               com a zona BEBIDAS anexada ao lado.
 *  - Plataformas (Drive-Thru, McCafé, Delivery) e Sala em blocos compactos — só aparecem
 *    quando existem postos ativos (dependem das áreas de negócio definidas para o restaurante).
 *
 * O mesmo componente serve o ecrã (interativo) e a impressão (só leitura, nomes grandes).
 */

type AreaKey = StationConfig['area'];

interface ZoneDef {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  line: AreaKey[];          // postos na linha principal
  side?: { title: string; areas: AreaKey[]; icon: React.ReactNode }; // anexo lateral
}

const LINE_ZONES: ZoneDef[] = [
  {
    id: 'kitchen',
    title: 'Cozinha',
    subtitle: 'Linha de produção',
    icon: <Flame size={14} />,
    line: ['kitchen'],
    side: { title: 'Batatas', areas: ['fries'], icon: <Utensils size={12} /> },
  },
  {
    id: 'counter',
    title: 'Balcão',
    subtitle: 'Linha de serviço',
    icon: <Monitor size={14} />,
    line: ['counter'],
    side: { title: 'Bebidas', areas: ['beverage'], icon: <CupSoda size={12} /> },
  },
];

const PLATFORM_ZONES: { id: string; title: string; areas: AreaKey[]; icon: React.ReactNode }[] = [
  { id: 'drive', title: 'Drive-Thru', areas: ['drive'], icon: <Car size={14} /> },
  { id: 'mccafe', title: 'McCafé', areas: ['mccafe'], icon: <Coffee size={14} /> },
  { id: 'delivery', title: 'Delivery', areas: ['delivery'], icon: <Package size={14} /> },
  { id: 'lobby', title: 'Sala', areas: ['lobby'], icon: <Users size={14} /> },
];

// Ordem dos postos dentro da linha de produção/serviço (por prefixo da designação/label)
const LINE_ORDER: Record<string, string[]> = {
  kitchen: ['batch', 'bc', 'inic', 'ini', 'final', 'fin'],
  counter: ['exped', 'exp', 'runner', 'run', 'apres', 'apr', 'caixa', 'cx'],
};

const BRAND_RED = '#DA291C';
const BRAND_YELLOW = '#FFC72C';

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
  stations: StationConfig[];          // já filtrados (visíveis)
  schedule: DailySchedule;
  selectedShift: ShiftType;
  employees: Employee[];
  isLocked?: boolean;
  onAssign?: (stationId: string, employeeId: string) => void;
  onRemove?: (stationId: string, employeeId: string) => void;
  onAssignTrainee?: (stationId: string, employeeId: string) => void;
  onRemoveTrainee?: (stationId: string, employeeId: string) => void;
}

/* ------------------------------------------------------------------ */
/* Cartão de posto                                                     */
/* ------------------------------------------------------------------ */

interface StationCardProps extends Omit<FloorPlanProps, 'stations'> {
  station: StationConfig;
  sortedEmployees: Employee[];
  compact?: boolean;
}

const StationCard: React.FC<StationCardProps> = ({
  mode, station, schedule, selectedShift, employees, sortedEmployees, isLocked,
  onAssign, onRemove, onAssignTrainee, onRemoveTrainee, compact,
}) => {
  const isPrint = mode === 'print';
  const assignedIds = schedule.shifts[selectedShift]?.[station.id] || [];
  const traineeIds = schedule.trainees?.[selectedShift]?.[station.id] || [];
  const isFull = assignedIds.length >= station.defaultSlots;
  const hasPeople = assignedIds.length > 0 || traineeIds.length > 0;
  const canEdit = !isPrint && !isLocked;

  const nameSize = isPrint ? 'text-[13px]' : compact ? 'text-xs' : 'text-sm';

  return (
    <div
      className={`relative bg-white rounded-lg border-2 flex flex-col overflow-hidden ${
        isPrint ? 'min-w-[96px] flex-1 min-h-[58px]' : compact ? 'w-[150px]' : 'w-[172px]'
      } ${hasPeople ? 'border-slate-800' : 'border-dashed border-slate-300'} ${!isPrint ? 'shadow-sm hover:shadow-md transition-shadow' : ''}`}
    >
      {/* Cabeçalho do posto */}
      <div
        className="flex items-center justify-between px-1.5 py-1 text-white"
        style={{ backgroundColor: hasPeople ? BRAND_RED : '#64748b' }}
      >
        <span className={`font-black uppercase tracking-tight leading-none truncate ${isPrint ? 'text-[8px]' : 'text-[10px]'}`} title={station.label}>
          {station.designation || station.label}
        </span>
        <span
          className={`font-black leading-none rounded px-1 py-0.5 ${isPrint ? 'text-[7px]' : 'text-[9px]'}`}
          style={{ backgroundColor: BRAND_YELLOW, color: '#1e293b' }}
        >
          {assignedIds.length}/{station.defaultSlots}
        </span>
      </div>

      {/* Corpo: nomes */}
      <div className={`flex-1 flex flex-col justify-center ${isPrint ? 'px-1 py-1 items-center text-center' : 'px-1.5 py-1.5 gap-1'}`}>
        {!isPrint && !compact && (
          <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider leading-none -mt-0.5 mb-0.5 truncate">{station.label}</div>
        )}

        {assignedIds.map(id => {
          const emp = employees.find(e => e.id === id);
          if (!emp) {
            if (isPrint) return null;
            return (
              <div key={id} className="flex items-center justify-between bg-rose-50 border border-rose-200 rounded px-1 py-0.5">
                <span className="text-[9px] font-bold text-rose-700 flex items-center gap-1"><AlertTriangle size={9} /> Inativo</span>
                {canEdit && <button onClick={() => onRemove?.(station.id, id)} className="text-rose-400 hover:text-rose-700"><X size={11} /></button>}
              </div>
            );
          }
          return (
            <div key={id} className={`flex items-center justify-between gap-1 ${isPrint ? '' : 'bg-slate-50 border border-slate-200 rounded px-1.5 py-1'}`}>
              <span className={`font-black text-slate-900 uppercase tracking-tight leading-tight truncate ${nameSize}`} title={emp.name}>
                {formatShortName(emp.name)}
              </span>
              {canEdit && (
                <button onClick={() => onRemove?.(station.id, id)} className="text-slate-400 hover:text-red-600 hover:bg-red-50 rounded p-0.5 shrink-0" title="Remover">
                  <X size={11} />
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
              className={`flex items-center justify-between gap-1 rounded px-1.5 py-0.5 ${isPrint ? 'mt-0.5' : ''}`}
              style={{ backgroundColor: '#FFF4CC', border: `1px solid ${BRAND_YELLOW}` }}
            >
              <span className={`font-black text-amber-800 uppercase tracking-tight leading-tight truncate flex items-center gap-1 ${isPrint ? 'text-[10px]' : 'text-[11px]'}`} title={`${emp.name} (formação)`}>
                <GraduationCap size={isPrint ? 10 : 11} className="shrink-0" /> {formatShortName(emp.name)}
              </span>
              {canEdit && (
                <button onClick={() => onRemoveTrainee?.(station.id, id)} className="text-amber-500 hover:text-red-600 rounded p-0.5 shrink-0" title="Remover formando">
                  <X size={11} />
                </button>
              )}
            </div>
          );
        })}

        {isPrint && !hasPeople && <span className="text-[9px] font-bold text-slate-300 uppercase">—</span>}

        {/* Atribuição */}
        {canEdit && (
          <div className="flex gap-1 mt-auto pt-0.5">
            {!isFull && (
              <select
                className="flex-1 min-w-0 text-[10px] font-bold border border-slate-200 rounded-md px-1 py-1 bg-white text-slate-700 outline-none focus:border-slate-800 cursor-pointer"
                value=""
                onChange={e => { if (e.target.value) onAssign?.(station.id, e.target.value); }}
              >
                <option value="">+ Colaborador</option>
                {sortedEmployees.filter(e => !assignedIds.includes(e.id)).map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            )}
            <select
              className="w-8 text-[10px] font-bold border rounded-md py-1 text-center cursor-pointer outline-none"
              style={{ borderColor: BRAND_YELLOW, backgroundColor: '#FFF4CC', color: '#92400e' }}
              value=""
              title="Adicionar formando"
              onChange={e => { if (e.target.value) onAssignTrainee?.(station.id, e.target.value); }}
            >
              <option value="">🎓</option>
              {sortedEmployees.filter(e => !traineeIds.includes(e.id)).map(e => (
                <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Blocos de zona                                                      */
/* ------------------------------------------------------------------ */

const ZoneHeader: React.FC<{ title: string; subtitle?: string; icon: React.ReactNode; count: number; filled: number; isPrint: boolean }> = ({ title, subtitle, icon, count, filled, isPrint }) => (
  <div className="flex items-center justify-between px-3 py-1.5 text-white" style={{ backgroundColor: BRAND_RED }}>
    <div className="flex items-center gap-2 min-w-0">
      <span className="shrink-0 opacity-90">{icon}</span>
      <span className={`font-black uppercase tracking-wider leading-none ${isPrint ? 'text-[10px]' : 'text-xs'}`}>{title}</span>
      {subtitle && <span className={`font-semibold opacity-80 leading-none truncate ${isPrint ? 'text-[8px]' : 'text-[10px]'}`}>· {subtitle}</span>}
    </div>
    <span className={`font-black leading-none rounded-full px-2 py-0.5 ${isPrint ? 'text-[8px]' : 'text-[10px]'}`} style={{ backgroundColor: BRAND_YELLOW, color: '#1e293b' }}>
      {filled}/{count}
    </span>
  </div>
);

const countFilled = (stations: StationConfig[], schedule: DailySchedule, shift: ShiftType) =>
  stations.filter(s => (schedule.shifts[shift]?.[s.id] || []).length > 0).length;

export const FloorPlan: React.FC<FloorPlanProps> = (props) => {
  const { mode, stations, schedule, selectedShift, employees } = props;
  const isPrint = mode === 'print';

  const sortedEmployees = useMemo(() => {
    const byName = (a: Employee, b: Employee) => a.name.localeCompare(b.name, 'pt', { sensitivity: 'base' });
    return [
      ...employees.filter(e => e.role !== 'GERENTE').sort(byName),
      ...employees.filter(e => e.role === 'GERENTE').sort(byName),
    ];
  }, [employees]);

  const byArea = useMemo(() => {
    const map: Partial<Record<AreaKey, StationConfig[]>> = {};
    stations.forEach(s => { (map[s.area] ||= []).push(s); });
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
      <section key={zone.id} className={`rounded-xl border-2 border-slate-800 overflow-hidden bg-white ${isPrint ? '' : 'shadow-sm'} break-inside-avoid`}>
        <ZoneHeader title={zone.title} subtitle={zone.subtitle} icon={zone.icon} count={all.length} filled={countFilled(all, schedule, selectedShift)} isPrint={isPrint} />
        <div className={`flex ${isPrint ? 'flex-row items-stretch' : 'flex-col lg:flex-row lg:items-stretch'}`}>
          {/* Linha principal */}
          <div className={`flex-1 ${isPrint ? 'p-1.5' : 'p-3'} bg-slate-50/60 min-w-0`}>
            <div className={`flex items-stretch ${isPrint ? 'gap-1' : 'gap-2 flex-wrap'}`}>
              {lineStations.map((s, i) => (
                <React.Fragment key={s.id}>
                  {i > 0 && (
                    <div className="flex items-center text-slate-300 shrink-0 self-center">
                      <ChevronRight size={isPrint ? 10 : 14} strokeWidth={3} />
                    </div>
                  )}
                  <StationCard {...cardProps} station={s} />
                </React.Fragment>
              ))}
              {lineStations.length === 0 && <span className="text-[10px] font-bold text-slate-300 uppercase py-2">Sem postos na linha</span>}
            </div>
          </div>
          {/* Anexo lateral */}
          {zone.side && sideStations.length > 0 && (
            <aside className={`${isPrint ? 'p-1.5 border-l-2' : 'p-3 border-t-2 lg:border-t-0 lg:border-l-2'} border-dashed border-slate-300 bg-white shrink-0`}>
              <div className="flex items-center gap-1.5 mb-1.5 text-slate-700">
                <span className="opacity-70">{zone.side.icon}</span>
                <span className={`font-black uppercase tracking-wider ${isPrint ? 'text-[8px]' : 'text-[10px]'}`}>{zone.side.title}</span>
              </div>
              <div className={`flex ${isPrint ? 'flex-col gap-1' : 'flex-row lg:flex-col gap-2 flex-wrap'}`}>
                {sideStations.map(s => <StationCard key={s.id} {...cardProps} station={s} compact />)}
              </div>
            </aside>
          )}
        </div>
      </section>
    );
  };

  const platforms = PLATFORM_ZONES.map(z => ({ ...z, stations: pick(z.areas) })).filter(z => z.stations.length > 0);

  return (
    <div className={`flex flex-col ${isPrint ? 'gap-1.5' : 'gap-4'}`}>
      {LINE_ZONES.map(renderLine)}

      {platforms.length > 0 && (
        <div className={`grid ${isPrint ? 'gap-1.5' : 'gap-4'}`} style={{ gridTemplateColumns: `repeat(${Math.min(platforms.length, 4)}, minmax(0, 1fr))` }}>
          {platforms.map(z => (
            <section key={z.id} className={`rounded-xl border-2 border-slate-800 overflow-hidden bg-white ${isPrint ? '' : 'shadow-sm'} break-inside-avoid`}>
              <ZoneHeader title={z.title} subtitle={z.id === 'lobby' ? 'Atendimento' : 'Plataforma'} icon={z.icon} count={z.stations.length} filled={countFilled(z.stations, schedule, selectedShift)} isPrint={isPrint} />
              <div className={`flex flex-wrap ${isPrint ? 'gap-1 p-1.5' : 'gap-2 p-3'} bg-slate-50/60`}>
                {z.stations.map(s => <StationCard key={s.id} {...cardProps} station={s} compact={!isPrint} />)}
              </div>
            </section>
          ))}
        </div>
      )}

      {stations.length === 0 && (
        <div className="p-8 text-center text-slate-400 text-sm font-bold border-2 border-dashed border-slate-200 rounded-xl">
          Sem postos a apresentar para este turno.
        </div>
      )}
    </div>
  );
};
