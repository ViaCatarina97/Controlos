
import React, { useState, useEffect, useMemo } from 'react';
import { StaffingTableEntry, AppSettings, DailySchedule, Employee, HourlyProjection, ShiftType, StationAssignment, StationConfig } from '../types';
import { AVAILABLE_SHIFTS, STATIONS } from '../constants';
import { 
  Users, User, AlertCircle, X, 
  Flame, Sun, Store, MoonStar, 
  CupSoda, TrendingUp,
  Calculator, CheckCircle2, AlertTriangle, Calendar, UserCircle, Briefcase, Printer, Save, Lock, Unlock, Edit, Target, GraduationCap, Trash2, Sunrise
} from 'lucide-react';

// --- Helper Components ---

interface StationGroupProps {
  title: string;
  stations: StationConfig[];
  schedule: DailySchedule;
  selectedShift: ShiftType;
  employees: Employee[];
  onAssign: (stationId: string, employeeId: string) => void;
  onRemove: (stationId: string, employeeId: string) => void;
  onAssignTrainee: (stationId: string, employeeId: string) => void;
  onRemoveTrainee: (stationId: string, employeeId: string) => void;
  color: string;
  isLocked?: boolean;
}

const StationGroup: React.FC<StationGroupProps> = ({
  title, stations, schedule, selectedShift, employees, onAssign, onRemove, onAssignTrainee, onRemoveTrainee, color, isLocked
}) => {
  const sortedEmployeesForSelect = React.useMemo(() => {
    const nonManagers = employees
      .filter(e => e.role !== 'GERENTE')
      .sort((a, b) => a.name.localeCompare(b.name, 'pt', { sensitivity: 'base' }));
      
    const managers = employees
      .filter(e => e.role === 'GERENTE')
      .sort((a, b) => a.name.localeCompare(b.name, 'pt', { sensitivity: 'base' }));
      
    return [...nonManagers, ...managers];
  }, [employees]);

  const colorMap: Record<string, string> = {
    red: 'border-red-200/65 bg-red-50/15 shadow-[0_4px_20px_rgba(239,68,68,0.02)]',
    blue: 'border-blue-200/65 bg-blue-50/15 shadow-[0_4px_20px_rgba(59,130,246,0.02)]',
    yellow: 'border-amber-200/65 bg-amber-50/15 shadow-[0_4px_20px_rgba(245,158,11,0.02)]',
    purple: 'border-purple-200/65 bg-purple-50/15 shadow-[0_4px_20px_rgba(16,185,129,0.02)]',
    green: 'border-emerald-200/65 bg-emerald-50/15 shadow-[0_4px_20px_rgba(16,185,129,0.02)]',
    slate: 'border-slate-200/65 bg-slate-50/15 shadow-[0_4px_20px_rgba(100,116,139,0.02)]',
  };
  const titleColorMap: Record<string, string> = {
    red: 'text-red-900 bg-red-100/40',
    blue: 'text-blue-900 bg-blue-100/40',
    yellow: 'text-amber-900 bg-amber-100/40',
    purple: 'text-purple-900 bg-purple-100/40',
    green: 'text-emerald-900 bg-emerald-100/40',
    slate: 'text-slate-900 bg-slate-100/40',
  };
  const badgeColorMap: Record<string, string> = {
    red: 'bg-red-500/10 text-red-700 border-red-200/40',
    blue: 'bg-blue-500/10 text-blue-700 border-blue-200/40',
    yellow: 'bg-amber-500/10 text-amber-700 border-amber-200/40',
    purple: 'bg-purple-500/10 text-purple-700 border-purple-200/40',
    green: 'bg-emerald-500/10 text-emerald-700 border-emerald-200/40',
    slate: 'bg-slate-500/10 text-slate-700 border-slate-200/40',
  };

  const containerClass = colorMap[color] || 'border-gray-200 bg-white';
  const titleClass = titleColorMap[color] || 'text-gray-800';

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all duration-300 ${containerClass}`}>
      <div className={`px-4 py-3.5 border-b border-black/[0.04] font-black text-[11px] uppercase tracking-wider flex justify-between items-center ${titleClass}`}>
        <span>{title}</span>
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${badgeColorMap[color] || 'bg-white/50 border-gray-100'}`}>
          {stations.length}
        </span>
      </div>
      <div className="flex flex-col gap-3 p-3 bg-slate-50/10">
        {stations.map(station => {
          const assignedIds = schedule.shifts[selectedShift]?.[station.id] || [];
          const assignedTraineeIds = schedule.trainees?.[selectedShift]?.[station.id] || [];
          
          return (
            <div key={station.id} className="bg-white rounded-xl border border-black/[0.03] p-3.5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2.5">
                <div>
                   <div className="font-extrabold text-[#111827] text-sm tracking-tight">{station.label}</div>
                   {station.designation && (
                     <div className="text-[9px] font-bold text-gray-400 bg-gray-50 border border-gray-100/80 px-1.5 py-0.5 rounded leading-none mt-1 inline-block">
                       {station.designation.toUpperCase()}
                     </div>
                   )}
                </div>
                {(() => {
                  const currentSize = assignedIds.length;
                  const maxSlots = station.defaultSlots;
                  const isFull = currentSize >= maxSlots;
                  const isEmpty = currentSize === 0;
                  
                  let badgeColors = "text-gray-500 bg-gray-50 border-gray-200/60";
                  if (isFull) {
                    badgeColors = "text-emerald-700 bg-emerald-50 border-emerald-100";
                  } else if (!isEmpty) {
                    badgeColors = "text-blue-700 bg-blue-50 border-blue-100";
                  }
                  
                  return (
                    <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border transition-colors ${badgeColors}`}>
                      <Users size={10} className="shrink-0" />
                      <span>{currentSize}/{maxSlots}</span>
                    </div>
                  );
                })()}
              </div>

              {(assignedIds.length > 0 || assignedTraineeIds.length > 0) && (
                <div className="space-y-1.5 mb-3">
                   {assignedIds.map(empId => {
                      const emp = employees.find(e => e.id === empId);
                      if(!emp) return null;
                      return (
                          <div key={empId} className="flex justify-between items-center bg-slate-50 hover:bg-slate-105 border border-slate-200/60 rounded-lg pl-2 pr-1.5 py-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.01)] transition-colors animate-fade-in">
                              <div className="flex items-center gap-1.5 overflow-hidden">
                                  <div className="w-5 h-5 rounded-full bg-blue-600/10 text-blue-700 flex items-center justify-center font-extrabold text-[10px] uppercase shrink-0">
                                    {emp.name.charAt(0)}
                                  </div>
                                  <span className="text-xs font-bold text-gray-800 truncate leading-none">{emp.name}</span>
                                  <span className="text-[8px] font-extrabold text-slate-400 border border-slate-200 bg-white px-1 rounded uppercase tracking-wide shrink-0 scale-90">{emp.role}</span>
                              </div>
                              {!isLocked && (
                                  <button onClick={() => onRemove(station.id, empId)} className="text-gray-400 hover:text-red-550 hover:bg-red-50 p-1 rounded-md transition-all active:scale-90">
                                      <X size={12} />
                                  </button>
                              )}
                          </div>
                      );
                   })}
                   
                   {assignedTraineeIds.map(empId => {
                      const emp = employees.find(e => e.id === empId);
                      if(!emp) return null;
                      return (
                          <div key={empId} className="flex justify-between items-center bg-amber-50 hover:bg-amber-102 border border-amber-200 rounded-lg pl-2 pr-1.5 py-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.01)] transition-colors animate-fade-in">
                              <div className="flex items-center gap-1.5 overflow-hidden">
                                  <div className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-700 flex items-center justify-center font-black shrink-0">
                                    <GraduationCap size={11} />
                                  </div>
                                  <div className="flex flex-col overflow-hidden">
                                    <span className="text-xs font-black text-amber-900 truncate leading-none">{emp.name}</span>
                                    <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest mt-0.5">Formação</span>
                                  </div>
                              </div>
                              {!isLocked && (
                                  <button onClick={() => onRemoveTrainee(station.id, empId)} className="text-amber-400 hover:text-red-550 hover:bg-red-50 p-1 rounded-md transition-all active:scale-90">
                                      <X size={12} />
                                  </button>
                              )}
                          </div>
                      );
                   })}
                </div>
              )}

              {!isLocked && (
                  <div className="flex gap-1.5">
                     {assignedIds.length < station.defaultSlots && (
                        <select 
                            className="flex-1 text-[11px] font-bold border border-gray-200 rounded-lg p-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 bg-white hover:border-gray-300 transition-all duration-150 text-gray-700 cursor-pointer shadow-sm"
                            value=""
                            onChange={(e) => {
                                if(e.target.value) onAssign(station.id, e.target.value);
                             }}
                        >
                            <option value="">Nome</option>
                            {sortedEmployeesForSelect
                                .filter(e => !assignedIds.includes(e.id)) 
                                .map(e => (
                                <option key={e.id} value={e.id}>{e.name}</option>
                            ))}
                        </select>
                     )}

                     <select 
                        className="w-10 text-[11px] font-bold border border-amber-200 text-amber-700 rounded-lg p-2 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 bg-amber-50 hover:bg-amber-100 hover:border-amber-300 transition-all duration-150 cursor-pointer shadow-sm text-center"
                        value=""
                        onChange={(e) => {
                             if(e.target.value) onAssignTrainee(station.id, e.target.value);
                        }}
                     >
                        <option value="">🎓</option>
                        {sortedEmployeesForSelect
                            .filter(e => !assignedTraineeIds.includes(e.id))
                            .map(e => (
                            <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                        ))}
                     </select>
                  </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface VisualPrintZoneProps {
  title: string;
  stations: StationConfig[];
  schedule: DailySchedule;
  selectedShift: ShiftType;
  employees: Employee[];
  color: string;
  totalStationsCount: number;
}

const VisualPrintZone: React.FC<VisualPrintZoneProps> = ({
  title, stations, schedule, selectedShift, employees, color, totalStationsCount
}) => {
    const isVeryCrowded = totalStationsCount > 24;
    const cardHeight = isVeryCrowded ? 'min-h-[44px]' : 'min-h-[62px]';
    const nameBaseSize = isVeryCrowded ? 'text-[11px]' : 'text-[14px]';
    const stationTitleSize = isVeryCrowded ? 'text-[6.5px]' : 'text-[8px]';

    const borderColorMap: Record<string, string> = {
        red: 'border-red-500', blue: 'border-blue-500', yellow: 'border-yellow-500',
        purple: 'border-purple-500', green: 'border-green-500', slate: 'border-slate-500',
    };

    const titleColorMap: Record<string, string> = {
        red: 'text-red-700', blue: 'text-blue-700', yellow: 'text-yellow-600',
        purple: 'text-purple-700', green: 'text-green-700', slate: 'text-slate-700',
    };

    const borderClass = borderColorMap[color] || 'border-slate-200';
    const textClass = titleColorMap[color] || 'text-slate-800';

    return (
        <div className={`break-inside-avoid ${isVeryCrowded ? 'mb-1' : 'mb-2'} border-2 ${borderClass} rounded-lg overflow-hidden bg-white flex flex-col p-0.5 shadow-sm`}>
            <div className="px-1 py-0.5 flex items-center gap-2 mb-0.5 border-b border-slate-100">
                <span className={`font-black text-[9px] uppercase tracking-tighter leading-tight ${textClass}`}>{title.toUpperCase()}</span>
            </div>
            
            <div className={`grid gap-0.5 ${stations.length > 3 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {stations.map(station => {
                    const assignedIds = schedule.shifts[selectedShift]?.[station.id] || [];
                    const assignedTraineeIds = schedule.trainees?.[selectedShift]?.[station.id] || [];
                    
                    return (
                        <div key={station.id} className={`bg-white border border-slate-100 rounded-md overflow-hidden flex flex-col ${cardHeight} shadow-sm`}>
                             <div className={`bg-slate-950 px-1 flex justify-between items-center h-4 shrink-0`}>
                                <span className={`font-black ${stationTitleSize} text-white uppercase truncate tracking-tight`}>
                                    {`${station.label}${station.designation ? ` - ${station.designation}` : ''}`.toUpperCase()}
                                </span>
                                <span className="bg-yellow-400 text-slate-900 font-black text-[7px] px-1 rounded-sm leading-none py-0.5">
                                    {station.defaultSlots}
                                </span>
                             </div>
                             
                             <div className="flex-1 p-0.5 flex flex-col justify-center items-center text-center">
                                 {assignedIds.map(id => {
                                     const emp = employees.find(e => e.id === id);
                                     if (!emp) return null;
                                     const parts = emp.name.split(' ');
                                     const fullName = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]}` : parts[0];
                                     return (
                                        <div key={id} className={`${nameBaseSize} font-black text-slate-950 uppercase tracking-tighter leading-tight`}>
                                            {fullName}
                                        </div>
                                     );
                                 })}
                                 {assignedTraineeIds.map(id => (
                                     <div key={id} className="text-[13px] font-black text-yellow-600 flex flex-col items-center border-t border-yellow-50 mt-1 pt-0.5 w-full">
                                         <span className="truncate uppercase tracking-tighter leading-none">🎓 {employees.find(e => e.id === id)?.name.split(' ')[0]}</span>
                                     </div>
                                 ))}
                             </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const matchSingle = (rowLabel: string, targetStr: string): boolean => {
  if (!targetStr) return false;

  const getDigits = (str: string): string | null => {
    const match = str.match(/\d+/);
    return match ? match[0] : null;
  };

  const rDigit = getDigits(rowLabel);
  const tDigit = getDigits(targetStr);

  // Se ambas as partes têm números definidos, estes têm de coincidir exatamente
  if (rDigit !== null && tDigit !== null) {
    if (rDigit !== tDigit) return false;
  }
  // Se o utilizador escreveu um posto sem número (por exemplo, "Bebidas" ou "Apresentador"),
  // isto deve por padrão assumir e corresponder ao posto "1".
  else if (rDigit === null && tDigit !== null) {
    if (tDigit !== "1") return false;
  }
  // Se o utilizador especificou "Bebidas 1" mas a estação ativa não tem nenhum número (ex: "Bebidas" genérico)
  else if (rDigit !== null && tDigit === null) {
    if (rDigit !== "1") return false;
  }

  // Agora comparamos os textos sem os números
  const cleanTextOnly = (str: string) => {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/\d+/g, "") // remove digits
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " "); // collapse spaces
  };

  const rText = cleanTextOnly(rowLabel);
  const tText = cleanTextOnly(targetStr);

  // 1. Coincidência direta completa
  if (rText === tText) return true;
  
  // Para substring, vamos garantir que a correspondência de palavras é robusta
  if (rText.length > 2 && tText.length > 2) {
    if (rText.includes(tText) || tText.includes(rText)) {
      // Mas evitamos "bat" substring de "batch cooker"
      if (rText === "batch cooker" && tText === "bat") return false;
      if (tText === "batch cooker" && rText === "bat") return false;
      return true;
    }
  }

  // 2. Tokenização inteligente por palavras-chave com mapeamento de abreviaturas/variantes comuns em português
  const rTokens = rText.split(/[\s_\-\/]+/).filter(t => t.length > 1);
  const tTokens = tText.split(/[\s_\-\/]+/).filter(t => t.length > 1);

  const abbreviations: Record<string, string[]> = {
    "bc": ["batch", "cooker"],
    "batch": ["bc", "batch", "cooker"],
    "cooker": ["bc", "batch", "cooker"],
    "ini": ["iniciador"],
    "iniciador": ["ini"],
    "fin": ["finalizador"],
    "finalizador": ["fin"],
    "apr": ["apresentador", "apresentadora"],
    "apresentador": ["apr", "apresentadora"],
    "bat": ["batata", "batatas", "fries"],
    "batata": ["bat", "fries"],
    "prep": ["preparador", "preparacao"],
    "preparador": ["prep", "preparacao"],
    "del": ["delivery", "prep", "preparador"],
    "delivery": ["del"],
    "cax": ["caixa"],
    "caixa": ["cax"],
    "bev": ["bebidas", "beverage"],
    "bebidas": ["bev", "beverage"],
  };

  // Excluímos conectores semânticos ou fluffs
  const fluffWords = ["de", "da", "do", "em", "para", "o", "a", "os", "as", "um", "uma", "com", "sem", "interno", "externo"];
  const rCleanTokens = rTokens.filter(t => !fluffWords.includes(t));
  const tCleanTokens = tTokens.filter(t => !fluffWords.includes(t));

  for (const rt of rCleanTokens) {
    for (const tt of tCleanTokens) {
      if (rt === tt) return true;
      if (abbreviations[rt] && abbreviations[rt].includes(tt)) return true;
      if (abbreviations[tt] && abbreviations[tt].includes(rt)) return true;
    }
  }

  return false;
};

const stationLabelsMatchSelective = (rowLabel: string, sLabel: string, sDesig: string, useOnlyLabel: boolean): boolean => {
  if (useOnlyLabel) {
    return matchSingle(rowLabel, sLabel);
  }
  return matchSingle(rowLabel, sLabel) || matchSingle(rowLabel, sDesig);
};

const stationLabelsMatch = (rowLabel: string, sLabel: string, sDesig: string = ""): boolean => {
  return stationLabelsMatchSelective(rowLabel, sLabel, sDesig, false);
};

interface PositioningProps {
  date: string; setDate: (date: string) => void; projectedSales: number; employees: Employee[]; staffingTable: StaffingTableEntry[];
  schedule: DailySchedule; setSchedule: (s: DailySchedule) => void; settings: AppSettings; hourlyData?: HourlyProjection[]; onSaveSchedule: (schedule: DailySchedule) => void;
  initialShift?: ShiftType | null; onShiftChangeComplete?: () => void;
  selectedShift: ShiftType;
  setSelectedShift: (shift: ShiftType) => void;
}

export const Positioning: React.FC<PositioningProps> = ({ 
  date, setDate, employees, staffingTable, schedule, setSchedule, settings, hourlyData, onSaveSchedule, initialShift, onShiftChangeComplete,
  selectedShift, setSelectedShift
}) => {
  const [manualPeakHour, setManualPeakHour] = useState<string | null>(null);
  const [showAllStations, setShowAllStations] = useState(false);
  
  const availableShifts = settings.activeShifts;
  const today = new Date().toISOString().split('T')[0];
  const isExpired = date < today;
  const isShiftLocked = useMemo(() => {
    return isExpired || (schedule.lockedShifts || []).includes(selectedShift);
  }, [schedule.lockedShifts, selectedShift, isExpired]);

  // Handle initial shift from history
  useEffect(() => {
    if (initialShift && availableShifts.includes(initialShift)) {
      setSelectedShift(initialShift);
      if (onShiftChangeComplete) onShiftChangeComplete();
    }
  }, [initialShift, availableShifts, onShiftChangeComplete]);

  useEffect(() => {
    if (!availableShifts.includes(selectedShift) && availableShifts.length > 0) setSelectedShift(availableShifts[0]);
  }, [availableShifts, selectedShift]);

  const targetHourLabels = useMemo(() => {
    if (selectedShift === 'FECHO' || selectedShift === 'MADRUGADA') return ['19h-20h', '20h-21h'];
    return ['12h-13h', '13h-14h'];
  }, [selectedShift]);

  const shiftPeakData = useMemo(() => {
    if (!hourlyData) return [];
    return hourlyData.filter(d => targetHourLabels.includes(d.hour));
  }, [hourlyData, targetHourLabels]);

  useEffect(() => {
    if (shiftPeakData.length > 0) {
        const maxSalesHour = shiftPeakData.reduce((prev, current) => (prev.totalSales > current.totalSales) ? prev : current).hour;
        setManualPeakHour(maxSalesHour);
    } else setManualPeakHour(null);
  }, [shiftPeakData]);

  const activeSalesData = useMemo(() => {
      if (!manualPeakHour || shiftPeakData.length === 0) return { totalSales: 0, hour: '' };
      return shiftPeakData.find(d => d.hour === manualPeakHour) || { totalSales: 0, hour: '' };
  }, [manualPeakHour, shiftPeakData]);

  const getRequiredStaff = (sales: number): { count: number; label: string } => {
    if (!staffingTable || staffingTable.length === 0) return { count: 0, label: 'N/A' };
    const sorted = [...staffingTable].sort((a, b) => a.minSales - b.minSales);
    const match = sorted.find(row => sales >= row.minSales && sales <= row.maxSales);
    if (match) return { count: match.staffCount, label: match.stationLabel };
    const lastRow = sorted[sorted.length - 1];
    if (sales > lastRow.maxSales) return { count: lastRow.staffCount, label: lastRow.stationLabel };
    return { count: 0, label: '0' };
  };

  const manualAdj = useMemo(() => {
    if (!schedule) return 0;
    return schedule.manualAdjustments?.[selectedShift] || schedule.manualAdjustment || 0;
  }, [schedule, selectedShift]);

  const requirement = useMemo(() => {
    const base = getRequiredStaff(activeSalesData.totalSales);
    return {
      count: Math.max(0, base.count + manualAdj),
      label: base.label
    };
  }, [activeSalesData.totalSales, staffingTable, manualAdj]);

  const currentAssignedCount = useMemo(() => {
     const shiftData: StationAssignment = schedule.shifts[selectedShift] || {};
     const uniqueIds = new Set<string>();
     
     // CORREÇÃO: O gerente NÃO conta para a soma "Real" dos posicionados em postos.
     // Se a tabela diz 15, queremos ver 15 pessoas em postos reais.
     Object.values(shiftData).forEach((ids) => {
        if (Array.isArray(ids)) {
          ids.forEach((id: string) => {
            if (id && typeof id === 'string' && id.trim() !== "") {
              uniqueIds.add(id.trim());
            }
          });
        }
     });
     return uniqueIds.size;
  }, [schedule, selectedShift]);

  const gap = requirement.count - currentAssignedCount;

  const allStations = useMemo(() => settings.customStations || STATIONS, [settings.customStations]);

  const sortedStaffingTable = useMemo(() => {
    return [...staffingTable].sort((a, b) => a.minSales - b.minSales);
  }, [staffingTable]);

  const activeStations = useMemo(() => {
    const activeBusinessAreas = settings.businessAreas || [];
    const filtered = allStations.filter(s => {
        if (!s.isActive) return false;
        if (s.area === 'drive' && !activeBusinessAreas.includes('Drive')) return false;
        if (s.area === 'mccafe' && !activeBusinessAreas.includes('McCafé')) return false;
        if (s.area === 'delivery' && !activeBusinessAreas.includes('Delivery')) return false;
        return true;
    });

    const getStationOpeningIndex = (station: StationConfig) => {
      // Tentar correspondência exata de label primeiro para evitar indexação por desig errada
      let idx = sortedStaffingTable.findIndex(row => 
        stationLabelsMatchSelective(row.stationLabel, station.label, station.designation || "", true)
      );
      if (idx !== -1) return idx;

      // Fallback para desig
      idx = sortedStaffingTable.findIndex(row => 
        stationLabelsMatchSelective(row.stationLabel, station.label, station.designation || "", false)
      );
      if (idx !== -1) return idx;

      const originalIdx = allStations.findIndex(x => x.id === station.id);
      return 1000 + (originalIdx !== -1 ? originalIdx : 0);
    };

    return filtered.sort((a, b) => getStationOpeningIndex(a) - getStationOpeningIndex(b));
  }, [allStations, settings.businessAreas, sortedStaffingTable]);

  const recommendedStationIds = useMemo(() => {
    const chosenIds = new Set<string>();
    
    // 1. Descobrir em que intervalo de vendas se encaixa a previsão de vendas atual
    const sales = activeSalesData.totalSales;
    const matchIdx = sortedStaffingTable.findIndex(row => sales >= row.minSales && sales <= row.maxSales);
    
    let finalMatchIdx = matchIdx;
    if (finalMatchIdx === -1 && sortedStaffingTable.length > 0) {
      const lastRow = sortedStaffingTable[sortedStaffingTable.length - 1];
      if (sales > lastRow.maxSales) {
        finalMatchIdx = sortedStaffingTable.length - 1;
      }
    }

    if (manualAdj !== 0 && sortedStaffingTable.length > 0) {
      const baseStaffCount = finalMatchIdx !== -1 ? sortedStaffingTable[finalMatchIdx].staffCount : 0;
      const targetStaffCount = Math.max(0, baseStaffCount + manualAdj);
      
      let adjustedMatchIdx = sortedStaffingTable.findIndex(row => row.staffCount === targetStaffCount);
      
      if (adjustedMatchIdx === -1) {
        const lastLeIndex = [...sortedStaffingTable].reverse().findIndex(row => row.staffCount <= targetStaffCount);
        if (lastLeIndex !== -1) {
          adjustedMatchIdx = sortedStaffingTable.length - 1 - lastLeIndex;
        } else {
          adjustedMatchIdx = -1;
        }
      }
      
      const maxStaffInTable = sortedStaffingTable[sortedStaffingTable.length - 1].staffCount;
      if (targetStaffCount >= maxStaffInTable) {
        adjustedMatchIdx = sortedStaffingTable.length - 1;
      }

      finalMatchIdx = adjustedMatchIdx;
    }
    
    // 2. Os postos a abrir são os que estão na coluna da descrição (stationLabel) desde o início (índice 0) até à linha do intervalo de vendas (inclusive)
    const relevantRows = finalMatchIdx !== -1 ? sortedStaffingTable.slice(0, finalMatchIdx + 1) : [];
    
    for (const row of relevantRows) {
        // PASS 1: Tentar corresponder APENAS pelo label principal da estação (muito mais específico e autoritário)
        let matchedStation = activeStations.find(s => 
            !chosenIds.has(s.id) && stationLabelsMatchSelective(row.stationLabel, s.label, s.designation || "", true)
        );
        
        // PASS 2: Se não encontrar pelo label, tenta encontrar usando também a desig
        if (!matchedStation) {
            matchedStation = activeStations.find(s => 
                !chosenIds.has(s.id) && stationLabelsMatchSelective(row.stationLabel, s.label, s.designation || "", false)
            );
        }
        
        if (matchedStation) {
            chosenIds.add(matchedStation.id);
        } else {
            // Caso todas as instâncias daquela estação já estejam ocupadas mas precisamos abrir uma (ex: se o usuário colocou o mesmo nome várias vezes),
            // tentamos encontrar mesmo sem a restrição de "já escolhida", ou apenas mantemos a melhor correspondência possível.
            let looseMatch = activeStations.find(s => 
                stationLabelsMatchSelective(row.stationLabel, s.label, s.designation || "", true)
            );
            if (!looseMatch) {
                looseMatch = activeStations.find(s => 
                    stationLabelsMatchSelective(row.stationLabel, s.label, s.designation || "", false)
                );
            }
            if (looseMatch) {
                chosenIds.add(looseMatch.id);
            }
        }
    }
    
    return chosenIds;
  }, [sortedStaffingTable, activeSalesData.totalSales, activeStations, manualAdj]);

  const handleManagerChange = (field: 'leader' | 'support', empId: string) => {
      if (isShiftLocked) return;
      setSchedule({ 
        ...schedule, 
        shiftManagers: { 
          ...schedule.shiftManagers, 
          [selectedShift]: { 
            ...(typeof schedule.shiftManagers?.[selectedShift] === 'object' ? schedule.shiftManagers?.[selectedShift] : {}),
            [field]: empId 
          } 
        } 
      });
  };

  const handleObjectiveChange = (field: 'turnObjective' | 'productionObjective', value: string) => {
      if (isShiftLocked) return;
      const currentObjs = schedule.shiftObjectives || {};
      const shiftObjs = currentObjs[selectedShift] || {};
      setSchedule({ ...schedule, shiftObjectives: { ...currentObjs, [selectedShift]: { ...shiftObjs, [field]: value } } });
  };

  // Verifica se o colaborador já está atribuído a algum posto (staff ou formando) no turno atual
  const checkDuplicateAssignment = (employeeId: string): boolean => {
    const shiftData = schedule.shifts[selectedShift] || {};
    const traineeData = schedule.trainees?.[selectedShift] || {};
    
    // Procurar em staff normal
    // Fix: cast Object.values to string[][] to avoid "Property 'includes' does not exist on type 'unknown'"
    const alreadyAsStaff = (Object.values(shiftData) as string[][]).some(ids => ids.includes(employeeId));
    // Procurar em formandos
    // Fix: cast Object.values to string[][] to avoid "Property 'includes' does not exist on type 'unknown'"
    const alreadyAsTrainee = (Object.values(traineeData) as string[][]).some(ids => ids.includes(employeeId));

    if (alreadyAsStaff || alreadyAsTrainee) {
      const emp = employees.find(e => e.id === employeeId);
      const name = emp ? emp.name : 'Este colaborador';
      alert(`${name} já está posicionado(a) neste turno!`);
      return true;
    }
    return false;
  };

  const handleAssign = (stationId: string, employeeId: string) => {
    if (isShiftLocked) return;
    if (checkDuplicateAssignment(employeeId)) return;

    const shiftData = schedule.shifts[selectedShift] || {};
    const stationAssignments = shiftData[stationId] || [];
    if (stationAssignments.includes(employeeId)) return;
    
    setSchedule({ ...schedule, shifts: { ...schedule.shifts, [selectedShift]: { ...shiftData, [stationId]: [...stationAssignments, employeeId] } } });
  };

  const handleRemove = (stationId: string, employeeId: string) => {
    if (isShiftLocked) return;
    const shiftData = schedule.shifts[selectedShift] || {};
    const stationAssignments = shiftData[stationId] || [];
    setSchedule({ ...schedule, shifts: { ...schedule.shifts, [selectedShift]: { ...shiftData, [stationId]: stationAssignments.filter(id => id !== employeeId) } } });
  };

  const handleAssignTrainee = (stationId: string, employeeId: string) => {
    if (isShiftLocked) return;
    if (checkDuplicateAssignment(employeeId)) return;

    const shiftTrainees = schedule.trainees?.[selectedShift] || {};
    const stationTrainees = shiftTrainees[stationId] || [];
    if (stationTrainees.includes(employeeId)) return;
    
    setSchedule({ ...schedule, trainees: { ...schedule.trainees, [selectedShift]: { ...shiftTrainees, [stationId]: [...stationTrainees, employeeId] } } });
  };

  const handleRemoveTrainee = (stationId: string, employeeId: string) => {
    if (isShiftLocked) return;
    const shiftTrainees = schedule.trainees?.[selectedShift] || {};
    const stationTrainees = shiftTrainees[stationId] || [];
    setSchedule({ ...schedule, trainees: { ...schedule.trainees, [selectedShift]: { ...shiftTrainees, [stationId]: stationTrainees.filter(id => id !== employeeId) } } });
  };

  const handlePrint = () => window.print();

  const handleSaveAndLock = () => { 
    if (!isExpired) {
        const currentLocked = schedule.lockedShifts || [];
        if (!currentLocked.includes(selectedShift)) {
            const updatedSchedule = { 
                ...schedule, 
                lockedShifts: [...currentLocked, selectedShift] 
            };
            onSaveSchedule(updatedSchedule);
        }
    } 
  };

  const handleUnlock = () => { 
    if (!isExpired) {
        const currentLocked = schedule.lockedShifts || [];
        const updatedSchedule = { 
            ...schedule, 
            lockedShifts: currentLocked.filter(s => s !== selectedShift) 
        };
        onSaveSchedule(updatedSchedule);
    } 
  };

  const handleClearAssignments = () => { 
    if (!isShiftLocked && confirm('Limpar todos os posicionamentos deste turno?')) {
        setSchedule({ 
            ...schedule, 
            shifts: { ...schedule.shifts, [selectedShift]: {} }, 
            trainees: { ...schedule.trainees, [selectedShift]: {} } 
        });
    }
  };

  const getShiftIcon = (id: ShiftType) => {
    switch(id) {
      case 'ABERTURA': return <Sunrise size={18} />; case 'INTERMEDIO': return <Sun size={18} />; case 'FECHO': return <MoonStar size={18} />; default: return <Store size={18} />;
    }
  };

  const getShiftLabel = (id: ShiftType) => AVAILABLE_SHIFTS.find(s => s.id === id)?.label || id;

  const filteredStations = useMemo(() => {
    return activeStations.filter(s => {
        if (showAllStations) return true;
        
        const currentAssignments = schedule.shifts[selectedShift]?.[s.id] || [];
        const assigned = currentAssignments.some(id => id && id.trim() !== "");
        const traineeAssignments = schedule.trainees?.[selectedShift]?.[s.id] || [];
        const assignedTrainees = traineeAssignments.some(id => id && id.trim() !== "");
        
        // Visível se estiver preenchido OU se estiver nos recomendados exatos por ID
        return assigned || assignedTrainees || recommendedStationIds.has(s.id);
    });
  }, [activeStations, showAllStations, recommendedStationIds, schedule.shifts, schedule.trainees, selectedShift]);

  const stationsByArea = useMemo(() => {
    const groups: Record<string, StationConfig[]> = {};
    filteredStations.forEach(s => {
        const areaKey = s.area;
        if (!groups[areaKey]) groups[areaKey] = [];
        groups[areaKey].push(s);
    });
    // Ordem: Bebidas, Cozinha, Balcão, Batatas, Sala
    const order = ['beverage', 'kitchen', 'counter', 'fries', 'lobby', 'delivery', 'drive', 'mccafe'];
    return Object.keys(groups).sort((a, b) => order.indexOf(a) - order.indexOf(b)).reduce((acc, key) => { acc[key] = groups[key]; return acc; }, {} as Record<string, StationConfig[]>);
  }, [filteredStations]);

  const totalVisibleStations = filteredStations.length;
  const shiftManagerName = useMemo(() => {
      const id = schedule.shiftManagers?.[selectedShift];
      const emp = employees.find(e => e.id === id);
      if (!emp) return '-';
      const parts = emp.name.split(' ');
      return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]}` : parts[0];
  }, [schedule.shiftManagers, selectedShift, employees]);

  const currentObjectives = useMemo(() => (schedule.shiftObjectives || {})[selectedShift] || {}, [schedule.shiftObjectives, selectedShift]);

  const getAreaLabel = (area: string) => {
    const labels: Record<string, string> = { 
      kitchen: 'Cozinha (Produção)', 
      beverage: 'Bebidas', 
      fries: 'Batatas', 
      lobby: 'Sala', 
      counter: 'Balcão (Serviço)', 
      delivery: 'Delivery', 
      drive: 'Drive-Thru', 
      mccafe: 'McCafé' 
    };
    return labels[area] || area;
  };

  const getAreaColor = (area: string) => {
    const colors: Record<string, string> = { 
      kitchen: 'red', 
      beverage: 'purple', 
      fries: 'yellow', 
      lobby: 'yellow', 
      counter: 'blue', 
      delivery: 'green', 
      drive: 'blue', 
      mccafe: 'yellow' 
    };
    return colors[area] || 'slate';
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: landscape !important;
            margin: 5mm !important;
          }
        }
      `}} />
      <div className="flex flex-col h-full space-y-4 animate-fade-in print:hidden">
        {/* Header Bar: Date & Shift Manager selection */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-5">
            <div className="flex items-center gap-3.5 w-full md:w-auto">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0 shadow-sm"><Calendar size={20} /></div>
                <div className="flex-1">
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Data de Trabalho</p>
                  <input 
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)} 
                    className="text-base font-black text-gray-800 bg-transparent border-b-2 border-gray-150 focus:border-blue-500 outline-none pb-0.5 hover:border-gray-300 transition-colors w-full cursor-pointer" 
                  />
                </div>
            </div>
            
            <div className="flex items-center gap-3.5 w-full md:w-auto">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl shrink-0 shadow-sm"><UserCircle size={20} /></div>
                <div className="flex-1 w-full md:w-auto">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Gerente de Turno</p>
                    <select 
                      value={schedule.shiftManagers?.[selectedShift]?.leader || ''} 
                      onChange={(e) => handleManagerChange('leader', e.target.value)} 
                      disabled={isShiftLocked} 
                      className={`w-full md:w-64 mt-1 p-2.5 bg-gray-50/70 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:ring-2 focus:ring-purple-500/15 focus:border-purple-500 focus:outline-none transition-all cursor-pointer ${isShiftLocked ? 'opacity-70 cursor-not-allowed bg-gray-100' : ''}`}
                    >
                      <option value="">Selecione o Gerente...</option>
                      {employees
                        .filter(e => e.role === 'GERENTE')
                        .sort((a, b) => a.name.localeCompare(b.name, 'pt', { sensitivity: 'base' }))
                        .map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>
                </div>
                <div className="flex-1 w-full md:w-auto">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Gerente de Apoio</p>
                    <select 
                      value={schedule.shiftManagers?.[selectedShift]?.support || ''} 
                      onChange={(e) => handleManagerChange('support', e.target.value)} 
                      disabled={isShiftLocked} 
                      className={`w-full md:w-64 mt-1 p-2.5 bg-gray-50/70 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:ring-2 focus:ring-purple-500/15 focus:border-purple-500 focus:outline-none transition-all cursor-pointer ${isShiftLocked ? 'opacity-70 cursor-not-allowed bg-gray-100' : ''}`}
                    >
                      <option value="">Selecione o Gerente...</option>
                      {employees
                        .filter(e => e.role === 'GERENTE')
                        .sort((a, b) => a.name.localeCompare(b.name, 'pt', { sensitivity: 'base' }))
                        .map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>
                </div>
            </div>
        </div>

        {/* Console de Botões */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
             <button onClick={() => onSaveSchedule(schedule)} className="px-6 py-2 bg-slate-800 text-white rounded-lg font-bold">Gravar Rascunho</button>
             <button onClick={() => onSaveSchedule({ ...schedule, status: 'CONCLUIDO' })} className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold">Submeter Posicionamento</button>
             <div className="flex-1"></div>
             
             <div className="flex items-center gap-3">
                {manualAdj !== 0 && (
                  <span className="text-xs font-black text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                    Ajuste Ativo: {manualAdj > 0 ? `+${manualAdj}` : manualAdj} Colaboradores
                  </span>
                )}
                <button 
                   onClick={() => {
                      const pass = prompt('Introduza a password das definições:');
                      if (pass === settings.password || pass === 'Imperial96') {
                         const val = prompt('Indique o número de funcionários a acrescentar (ex: 2 para somar, -1 para subtrair, ou 0 para limpar):');
                         if (val !== null) {
                             const num = parseInt(val);
                             if (!isNaN(num)) {
                                const currentAdjustments = schedule.manualAdjustments || {};
                                setSchedule({ 
                                   ...schedule, 
                                   manualAdjustments: { 
                                      ...currentAdjustments, 
                                      [selectedShift]: num 
                                   } 
                                });
                             }
                         }
                      } else {
                        alert('Password incorreta!');
                      }
                   }}
                   className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold transition-all shadow-sm"
                >
                   Ajuste Manual
                </button>
             </div>
        </div>

        {/* Shift selector container: Modern Segment Controller pill bar */}
        <div className="bg-slate-100/55 p-1.5 rounded-2xl border border-gray-200/50 flex gap-1.5 overflow-x-auto shadow-sm">
          {availableShifts.map(shift => {
            const isActive = selectedShift === shift;
            return (
              <button 
                key={shift} 
                onClick={() => setSelectedShift(shift)} 
                className={`flex-1 py-2.5 px-4 rounded-xl flex items-center justify-center gap-2.5 font-bold text-xs uppercase tracking-wider transition-all duration-150 whitespace-nowrap cursor-pointer active:scale-98 ${
                  isActive 
                    ? 'bg-white text-blue-700 shadow-md border border-blue-100' 
                    : 'bg-transparent text-slate-550 hover:bg-white/40 hover:text-slate-700'
                }`}
              >
                <div className="relative">
                  {getShiftIcon(shift)}
                  {(schedule.lockedShifts || []).includes(shift) && (
                     <div className="absolute -top-2.5 -right-2.5 bg-emerald-500 text-white rounded-full p-0.5 border border-white shadow-sm flex items-center justify-center">
                        <Lock size={8} className="stroke-[2.5]" />
                     </div>
                   )}
                </div>
                <span>{getShiftLabel(shift)}</span>
              </button>
            );
          })}
        </div>

        {/* Sales Forecast & Metrics Bento Grid */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                <div className="lg:col-span-5 lg:border-r border-gray-100 lg:pr-6 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><TrendingUp size={16} className="text-blue-600" /> Previsão de Vendas</h3>
                      {shiftPeakData.length > 0 ? (
                        <div className="space-y-2.5">
                          {shiftPeakData.map((data, idx) => { 
                            const isActive = manualPeakHour === data.hour; 
                            return (
                              <button 
                                key={idx} 
                                onClick={() => setManualPeakHour(data.hour)} 
                                className={`w-full flex justify-between items-center p-3.5 rounded-xl border-2 transition-all cursor-pointer relative overflow-hidden active:scale-99 ${
                                  isActive 
                                    ? 'bg-blue-50/50 border-blue-500 shadow-sm' 
                                    : 'bg-white border-gray-100 hover:border-blue-200/60 hover:bg-gray-50/30'
                                }`}
                              >
                                {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>}
                                <div className="flex items-center gap-3">
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isActive ? 'border-blue-500 bg-blue-505' : 'border-gray-200 bg-white'}`}>
                                    {isActive && <div className="w-2 h-2 rounded-full bg-white"></div>}
                                  </div>
                                  <span className={`font-black text-sm tracking-tight ${isActive ? 'text-blue-900' : 'text-gray-600'}`}>{data.hour}</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-[10px] text-gray-400 block font-black uppercase tracking-wide">Previsão</span>
                                  <span className={`font-black text-sm ${isActive ? 'text-blue-800' : 'text-gray-800'}`}>{data.totalSales} €</span>
                                </div>
                              </button>
                            ); 
                          })}
                        </div>
                      ) : (
                        <div className="p-5 text-center bg-amber-50/50 text-amber-800 rounded-xl border border-amber-100 text-xs font-bold flex items-center gap-2 justify-center"><AlertCircle size={16} /> Sem dados de previsão.</div>
                      )}
                    </div>
                </div>
                <div className="lg:col-span-7 lg:pl-6 flex items-center">
                    <div className="grid grid-cols-3 gap-4 w-full">
                        {/* Necessários */}
                        <div className="bg-blue-50/40 rounded-2xl p-5 border border-blue-100 flex flex-col items-center justify-center text-center shadow-inner">
                          <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider mb-2">Necessários</span>
                          <div className="p-2.5 bg-blue-100/60 rounded-xl mb-2 text-blue-600">
                            <Calculator size={20} />
                          </div>
                          <span className="text-3xl font-black text-blue-900 leading-none">{requirement.count}</span>
                          <span className="text-[9px] text-blue-500 font-bold mt-1.5 uppercase">Colaboradores</span>
                        </div>
                        
                        {/* Posicionados */}
                        <div className="bg-slate-50/80 rounded-2xl p-5 border border-gray-200/60 flex flex-col items-center justify-center text-center shadow-sm">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Posicionados</span>
                          <div className="p-2.5 bg-slate-100 rounded-xl mb-2 text-slate-600">
                            <Users size={20} />
                          </div>
                          <span className="text-3xl font-black text-gray-800 leading-none">{currentAssignedCount}</span>
                          <span className="text-[9px] text-slate-500 font-bold mt-1.5 uppercase">Na Escala</span>
                        </div>
                        
                        {/* Diferença */}
                        <div className={`rounded-2xl p-5 border flex flex-col items-center justify-center text-center shadow-sm ${
                          gap > 0 
                            ? 'bg-rose-50/50 border-rose-200' 
                            : 'bg-emerald-50/50 border-emerald-200'
                        }`}>
                          <span className={`text-[10px] font-black uppercase tracking-wider mb-2 ${gap > 0 ? 'text-rose-500' : 'text-emerald-550'}`}>Diferença</span>
                          <div className={`p-2.5 rounded-xl mb-2 bg-white ${gap > 0 ? 'text-rose-650' : 'text-emerald-650'}`}>
                            {gap > 0 ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
                          </div>
                          <span className={`text-3xl font-black leading-none ${gap > 0 ? 'text-rose-600' : 'text-emerald-650'}`}>
                            {gap > 0 ? `-${gap}` : 'OK'}
                          </span>
                          <span className={`text-[9px] font-bold mt-1.5 uppercase ${gap > 0 ? 'text-rose-450' : 'text-emerald-550'}`}>
                            {gap > 0 ? 'Faltam' : 'Tudo Pronto'}
                          </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Turn Objectives and Production Goals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-3 text-blue-900 font-black text-xs uppercase tracking-wider"><Target size={16} className="text-blue-500" /> Objetivo de Turno</div>
              <textarea 
                value={currentObjectives.turnObjective || ''} 
                onChange={(e) => handleObjectiveChange('turnObjective', e.target.value)} 
                placeholder="Objetivos do turno (qualidade, serviço, tempos)..." 
                disabled={isShiftLocked} 
                className="w-full text-xs font-semibold p-3.5 bg-blue-50/15 border border-blue-100 rounded-xl focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 focus:outline-none outline-none h-20 placeholder:text-gray-400/85 transition-all resize-none" 
              />
           </div>
           <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-3 text-orange-900 font-black text-xs uppercase tracking-wider"><Flame size={16} className="text-orange-500" /> Objetivo de Produção</div>
              <textarea 
                value={currentObjectives.productionObjective || ''} 
                onChange={(e) => handleObjectiveChange('productionObjective', e.target.value)} 
                placeholder="Objetivos de produção (meta de tempo KVS, preparação)..." 
                disabled={isShiftLocked} 
                className="w-full text-xs font-semibold p-3.5 bg-orange-50/15 border border-orange-100 rounded-xl focus:ring-2 focus:ring-orange-500/15 focus:border-orange-500 focus:outline-none outline-none h-20 placeholder:text-gray-400/85 transition-all resize-none" 
              />
           </div>
        </div>

        {/* Stations Title and Action Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2 px-1">
          <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
            <Briefcase size={20} className="text-blue-600" /> Postos de Trabalho 
            <span className="bg-blue-50 border border-blue-100 text-blue-800 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">{totalVisibleStations} Visíveis</span>
          </h3>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
              {!isShiftLocked && !isExpired && (
                <button onClick={handleSaveAndLock} className="flex items-center gap-2 px-4.5 py-2.5 bg-emerald-600 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-emerald-700 transition-all shadow-sm active:scale-95 cursor-pointer">
                  <Save size={14} /> Finalizar {getShiftLabel(selectedShift)}
                </button>
              )}
              {isShiftLocked && !isExpired && (
                <button onClick={handleUnlock} className="flex items-center gap-2 px-4.5 py-2.5 bg-amber-500 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-amber-600 transition-all shadow-sm active:scale-95 cursor-pointer">
                  <Edit size={14} /> Editar {getShiftLabel(selectedShift)}
                </button>
              )}
              {!isShiftLocked && (
                <button onClick={handleClearAssignments} className="flex items-center gap-2 px-4.5 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-black uppercase tracking-wider rounded-xl border border-red-100 transition-all active:scale-95 cursor-pointer">
                  <Trash2 size={14} /> Limpar
                </button>
              )}
              <button onClick={handlePrint} className="flex items-center gap-2 px-4.5 py-2.5 bg-slate-900 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-slate-800 transition-all shadow-sm active:scale-95 cursor-pointer"><Printer size={14} /> Imprimir</button>
            </div>
            <div className="h-6 w-px bg-gray-200 mx-1 hidden sm:block"></div>
            <div className="flex items-center gap-2" title="Mostrar todos os postos de trabalho configurados">
              <span className="text-[10px] font-black uppercase text-slate-400 hidden lg:inline">Exibir Todos</span>
              <button onClick={() => setShowAllStations(!showAllStations)} className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${showAllStations ? 'bg-blue-600' : 'bg-slate-200'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showAllStations ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Primary Station Board Row of Columns */}
        <div className="flex-1 overflow-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 pb-20">
          {Object.entries(stationsByArea).map(([area, stations]) => (
            <div key={area} className="flex flex-col gap-4">
              <StationGroup 
                title={getAreaLabel(area)} 
                stations={stations} 
                schedule={schedule} 
                selectedShift={selectedShift} 
                employees={employees} 
                onAssign={handleAssign} 
                onRemove={handleRemove} 
                onAssignTrainee={handleAssignTrainee} 
                onRemoveTrainee={handleRemoveTrainee} 
                color={getAreaColor(area)} 
                isLocked={isShiftLocked} 
              />
            </div>
          ))}
        </div>
      </div>

      <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-1 text-slate-900 overflow-hidden min-h-screen print-landscape">
          <div className="flex justify-between items-end mb-1 border-b border-slate-900 pb-0.5">
            <h1 className="text-[18px] font-black uppercase tracking-tight text-slate-950 leading-none">{settings.restaurantName.toUpperCase()}</h1>
            <div className="flex items-center gap-4">
              <span className="text-[9px] font-bold text-slate-600 uppercase">{new Date(date).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
              <div className="bg-slate-950 text-white px-3 py-1 rounded-sm text-[13px] font-black uppercase tracking-wider leading-none">{getShiftLabel(selectedShift).toUpperCase()}</div>
            </div>
          </div>
          <div className="grid grid-cols-6 gap-1 mb-2">
              <div className="bg-slate-50 border border-slate-200 p-1 rounded min-h-[32px] col-span-1"><span className="text-[6.5px] font-black uppercase text-slate-400 block">Gerente</span><div className="font-black text-[10px] text-slate-900 truncate uppercase tracking-tighter">{shiftManagerName}</div></div>
              <div className="bg-slate-50 border border-slate-200 p-1 rounded min-h-[32px]"><span className="text-[6.5px] font-black uppercase text-slate-400 block">Previsão</span><div className="font-black text-[14px] text-slate-900 leading-none">{activeSalesData.totalSales} €</div></div>
              <div className="bg-blue-50 border border-blue-200 p-1 rounded min-h-[32px]"><span className="text-[6.5px] font-black uppercase text-blue-500 block">Sugerido</span><div className="font-black text-[14px] text-blue-900 leading-none">{requirement.count}</div></div>
              <div className="bg-slate-50 border border-slate-200 p-1 rounded min-h-[32px]"><span className="text-[6.5px] font-black uppercase text-slate-400 block">Real</span><div className="font-black text-[14px] text-slate-900 leading-none">{currentAssignedCount}</div></div>
              <div className="bg-white border border-slate-100 p-1 rounded overflow-hidden min-h-[32px]"><span className="text-[6px] font-black uppercase text-blue-600 block">Obj. Turno</span><div className="text-[8.5px] font-bold text-slate-800 leading-tight truncate">{currentObjectives.turnObjective || '-'}</div></div>
              <div className="bg-white border border-slate-100 p-1 rounded overflow-hidden min-h-[32px]"><span className="text-[6px] font-black uppercase text-orange-600 block">Obj. Produção</span><div className="text-[8.5px] font-bold text-slate-800 leading-tight truncate">{currentObjectives.productionObjective || '-'}</div></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1 items-start overflow-hidden">
              {Object.entries(stationsByArea).map(([area, stations]) => (<VisualPrintZone key={area} title={getAreaLabel(area)} stations={stations} schedule={schedule} selectedShift={selectedShift} employees={employees} color={getAreaColor(area)} totalStationsCount={totalVisibleStations} />))}
          </div>
          <div className="fixed bottom-1 left-2 w-full flex justify-between text-[6px] font-bold text-slate-200 uppercase tracking-widest bg-white"><span>TeamPos &bull; MCD OPS SYSTEM</span></div>
      </div>
    </>
  );
};
