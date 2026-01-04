
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
  const colorMap: Record<string, string> = {
    red: 'border-red-200 bg-red-50',
    blue: 'border-blue-200 bg-blue-50',
    yellow: 'border-yellow-200 bg-yellow-50',
    purple: 'border-purple-200 bg-purple-50',
    green: 'border-green-200 bg-green-50',
    slate: 'border-slate-200 bg-white',
  };
  const titleColorMap: Record<string, string> = {
    red: 'text-red-800',
    blue: 'text-blue-800',
    yellow: 'text-yellow-800',
    purple: 'text-purple-800',
    green: 'text-green-800',
    slate: 'text-gray-800',
  };

  const containerClass = colorMap[color] || 'border-gray-200 bg-white';
  const titleClass = titleColorMap[color] || 'text-gray-800';

  return (
    <div className={`rounded-xl border shadow-sm overflow-hidden ${containerClass}`}>
      <div className={`px-4 py-2 border-b border-black/5 font-bold text-sm uppercase tracking-wide flex justify-between items-center ${titleClass}`}>
        <span>{title}</span>
        <span className="bg-white/50 px-2 py-0.5 rounded text-xs">{stations.length}</span>
      </div>
      <div className="divide-y divide-black/5">
        {stations.map(station => {
          const assignedIds = schedule.shifts[selectedShift]?.[station.id] || [];
          const assignedTraineeIds = schedule.trainees?.[selectedShift]?.[station.id] || [];
          
          return (
            <div key={station.id} className="p-3 hover:bg-white/40 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <div>
                   <div className="font-bold text-gray-800 text-sm">{station.label}</div>
                   {station.designation && <div className="text-[10px] text-gray-500 font-mono">{station.designation}</div>}
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 bg-white px-1.5 py-0.5 rounded border border-gray-100">
                    <User size={10} />
                    <span>{assignedIds.length}/{station.defaultSlots}</span>
                </div>
              </div>

              <div className="space-y-1 mb-2">
                 {assignedIds.map(empId => {
                    const emp = employees.find(e => e.id === empId);
                    if(!emp) return null;
                    return (
                        <div key={empId} className="flex justify-between items-center bg-white border border-gray-200 rounded px-2 py-1 shadow-sm">
                            <span className="text-xs font-medium text-gray-700 truncate">{emp.name}</span>
                            {!isLocked && (
                                <button onClick={() => onRemove(station.id, empId)} className="text-gray-400 hover:text-red-500">
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
                        <div key={empId} className="flex justify-between items-center bg-yellow-50 border border-yellow-200 rounded px-2 py-1 shadow-sm">
                            <div className="flex items-center gap-1 overflow-hidden">
                                <GraduationCap size={12} className="text-yellow-600 shrink-0"/>
                                <span className="text-xs font-medium text-yellow-800 truncate">{emp.name}</span>
                            </div>
                            {!isLocked && (
                                <button onClick={() => onRemoveTrainee(station.id, empId)} className="text-yellow-400 hover:text-red-500">
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    );
                 })}
              </div>

              {!isLocked && (
                  <div className="flex gap-1">
                     {assignedIds.length < station.defaultSlots && (
                        <select 
                            className="flex-1 text-xs border rounded p-1 outline-none focus:ring-1 focus:ring-blue-500 bg-white/50 hover:bg-white transition-colors border-gray-200 text-gray-600"
                            value=""
                            onChange={(e) => {
                                if(e.target.value) onAssign(station.id, e.target.value);
                            }}
                        >
                            <option value="">+ Staff</option>
                            {employees
                                .filter(e => !assignedIds.includes(e.id)) 
                                .map(e => (
                                <option key={e.id} value={e.id}>{e.name}</option>
                            ))}
                        </select>
                     )}

                     <select 
                        className="w-8 text-xs border border-yellow-200 text-yellow-600 rounded p-1 outline-none focus:ring-1 focus:ring-yellow-500 bg-yellow-50/50 hover:bg-yellow-50 transition-colors"
                        value=""
                        onChange={(e) => {
                             if(e.target.value) onAssignTrainee(station.id, e.target.value);
                        }}
                     >
                        <option value="">🎓</option>
                        {employees
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
                                    {station.label.toUpperCase()}
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

interface PositioningProps {
  date: string; setDate: (date: string) => void; projectedSales: number; employees: Employee[]; staffingTable: StaffingTableEntry[];
  schedule: DailySchedule; setSchedule: (s: DailySchedule) => void; settings: AppSettings; hourlyData?: HourlyProjection[]; onSaveSchedule: (schedule: DailySchedule) => void;
  initialShift?: ShiftType | null; onShiftChangeComplete?: () => void;
}

export const Positioning: React.FC<PositioningProps> = ({ 
  date, setDate, employees, staffingTable, schedule, setSchedule, settings, hourlyData, onSaveSchedule, initialShift, onShiftChangeComplete
}) => {
  const [selectedShift, setSelectedShift] = useState<ShiftType>('ABERTURA');
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
    const match = staffingTable.find(row => sales >= row.minSales && sales <= row.maxSales);
    if (match) return { count: match.staffCount, label: match.stationLabel };
    const lastRow = staffingTable[staffingTable.length - 1];
    if (sales > lastRow.maxSales) return { count: lastRow.staffCount, label: lastRow.stationLabel };
    return { count: 0, label: '0' };
  };

  const requirement = useMemo(() => getRequiredStaff(activeSalesData.totalSales), [activeSalesData, staffingTable]);

  const currentAssignedCount = useMemo(() => {
     const shiftData: StationAssignment = schedule.shifts[selectedShift] || {};
     const uniqueIds = new Set<string>();
     
     // O gerente é a pessoa 1.
     const managerId = schedule.shiftManagers?.[selectedShift];
     if (managerId && typeof managerId === 'string' && managerId.trim() !== "") {
        uniqueIds.add(managerId.trim());
     }

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

  const recommendedStationLabels = useMemo(() => {
    // Ordenamos para garantir a progressividade
    const sortedTable = [...staffingTable].sort((a, b) => a.staffCount - b.staffCount);
    
    // CORREÇÃO CRÍTICA: Se precisamos de 21 pessoas, a primeira pessoa é o Gerente (dropdown).
    // Logo, precisamos de 20 cartões de postos. Se mostrarmos 21 cartões + gerente, teremos 22 visíveis.
    const stationsNeeded = Math.max(0, requirement.count - 1);
    
    const labels = new Set<string>();
    let count = 0;
    
    for (const row of sortedTable) {
        // Ignoramos postos que sejam explicitamente para o Gerente nos cartões recomendados
        const isManagerPost = row.stationLabel.toLowerCase().includes('gerente') || 
                             row.stationLabel.toLowerCase().includes('manager');
                             
        if (isManagerPost) continue;

        if (count < stationsNeeded) {
            labels.add(row.stationLabel);
            count++;
        } else {
            break;
        }
    }
    return labels;
  }, [staffingTable, requirement.count]);

  const handleManagerChange = (empId: string) => {
      if (isShiftLocked) return;
      setSchedule({ ...schedule, shiftManagers: { ...schedule.shiftManagers, [selectedShift]: empId } });
  };

  const handleObjectiveChange = (field: 'turnObjective' | 'productionObjective', value: string) => {
      if (isShiftLocked) return;
      const currentObjs = schedule.shiftObjectives || {};
      const shiftObjs = currentObjs[selectedShift] || {};
      setSchedule({ ...schedule, shiftObjectives: { ...currentObjs, [selectedShift]: { ...shiftObjs, [field]: value } } });
  };

  const handleAssign = (stationId: string, employeeId: string) => {
    if (isShiftLocked) return;
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
  const allStations = settings.customStations || STATIONS;

  const filteredStations = useMemo(() => {
    const activeBusinessAreas = settings.businessAreas || [];
    return allStations.filter(s => {
        if (!s.isActive) return false;
        if (s.area === 'drive' && !activeBusinessAreas.includes('Drive')) return false;
        if (s.area === 'mccafe' && !activeBusinessAreas.includes('McCafé')) return false;
        if (s.area === 'delivery' && !activeBusinessAreas.includes('Delivery')) return false;
        if (showAllStations) return true;
        
        const currentAssignments = schedule.shifts[selectedShift]?.[s.id] || [];
        const assigned = currentAssignments.some(id => id && id.trim() !== "");
        const traineeAssignments = schedule.trainees?.[selectedShift]?.[s.id] || [];
        const assignedTrainees = traineeAssignments.some(id => id && id.trim() !== "");
        
        // CORREÇÃO: Visível se estiver preenchido OU se estiver nos recomendados exatos
        return assigned || assignedTrainees || recommendedStationLabels.has(s.label);
    });
  }, [allStations, showAllStations, recommendedStationLabels, schedule.shifts, schedule.trainees, selectedShift, settings.businessAreas]);

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
      <div className="flex flex-col h-full space-y-4 animate-fade-in print:hidden">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Calendar size={20} /></div>
                <div><p className="text-xs text-gray-500 font-bold uppercase">Data</p><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="text-lg font-bold text-gray-800 bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none pb-0.5" /></div>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><UserCircle size={20} /></div>
                <div className="flex-1">
                    <p className="text-xs text-gray-500 font-bold uppercase">Gerente de Turno</p>
                    <select value={schedule.shiftManagers?.[selectedShift] || ''} onChange={(e) => handleManagerChange(e.target.value)} disabled={isShiftLocked} className={`w-full md:w-64 mt-1 p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none ${isShiftLocked ? 'opacity-70 cursor-not-allowed bg-gray-100' : ''}`}><option value="">Selecione o Gerente...</option>{employees.filter(e => e.role === 'GERENTE').map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}</select>
                </div>
            </div>
        </div>
        <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-200 flex gap-2 overflow-x-auto">
          {availableShifts.map(shift => (
            <button key={shift} onClick={() => setSelectedShift(shift)} className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-medium transition-all whitespace-nowrap ${selectedShift === shift ? 'bg-blue-600 text-white shadow-md' : 'bg-transparent text-gray-500 hover:bg-gray-50'}`}>
              <div className="relative">
                {getShiftIcon(shift)}
                {(schedule.lockedShifts || []).includes(shift) && (
                   <div className="absolute -top-2 -right-2 bg-emerald-500 text-white rounded-full p-0.5 border border-white shadow-sm">
                      <Lock size={8} />
                   </div>
                )}
              </div>
              {getShiftLabel(shift)}
            </button>
          ))}
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 border-r border-gray-100 pr-4">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2"><TrendingUp size={16} /> Previsão de Vendas</h3>
                    {shiftPeakData.length > 0 ? (
                      <div className="space-y-3">
                        {shiftPeakData.map((data, idx) => { 
                          const isActive = manualPeakHour === data.hour; 
                          return (
                            <button key={idx} onClick={() => setManualPeakHour(data.hour)} className={`w-full flex justify-between items-center p-3 rounded-lg border transition-all cursor-pointer relative overflow-hidden ${isActive ? 'bg-blue-50 border-blue-500 shadow-sm' : 'bg-white border-gray-100 hover:border-blue-200 hover:bg-gray-50'}`}>
                              {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>}
                              <div className="flex items-center gap-3">
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isActive ? 'border-blue-500' : 'border-gray-300'}`}>
                                  {isActive && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
                                </div>
                                <span className={`font-bold ${isActive ? 'text-blue-700' : 'text-gray-700'}`}>{data.hour}</span>
                              </div>
                              <div className="flex gap-6">
                                <div className="flex flex-col items-end">
                                  <span className="text-xs text-gray-400">Vendas</span>
                                  <span className={`font-bold ${isActive ? 'text-blue-800' : 'text-gray-800'}`}>{data.totalSales} €</span>
                                </div>
                              </div>
                            </button>
                          ); 
                        })}
                      </div>
                    ) : (
                      <div className="p-4 text-center bg-yellow-50 text-yellow-700 rounded-lg text-sm flex items-center gap-2 justify-center"><AlertCircle size={16} /> Sem dados de previsão.</div>
                    )}
                </div>
                <div className="lg:col-span-7 pl-2">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 flex flex-col items-center justify-center text-center"><span className="text-xs font-bold text-blue-400 uppercase mb-1">Necessários</span><div className="flex items-center gap-2"><Calculator className="text-blue-500" size={20} /><span className="text-3xl font-extrabold text-blue-700">{requirement.count}</span></div></div>
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex flex-col items-center justify-center text-center"><span className="text-xs font-bold text-gray-400 uppercase mb-1">Posicionados</span><div className="flex items-center gap-2"><Users className="text-gray-500" size={20} /><span className="text-3xl font-extrabold text-gray-700">{currentAssignedCount}</span></div></div>
                        <div className={`rounded-xl p-4 border flex flex-col items-center justify-center text-center ${gap > 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}><span className={`text-xs font-bold uppercase mb-1 ${gap > 0 ? 'text-red-400' : 'text-emerald-400'}`}>Diferença</span><div className="flex items-center gap-2">{gap > 0 ? <AlertTriangle className="text-red-500" size={20} /> : <CheckCircle2 className="text-emerald-500" size={20} />}<span className={`text-3xl font-extrabold ${gap > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{gap > 0 ? `-${gap}` : 'OK'}</span></div></div>
                    </div>
                </div>
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 mb-2 text-blue-800 font-bold text-sm"><Target size={16} /> Objetivo de Turno</div>
              <textarea value={currentObjectives.turnObjective || ''} onChange={(e) => handleObjectiveChange('turnObjective', e.target.value)} placeholder="Objetivos do turno..." disabled={isShiftLocked} className="w-full text-sm p-3 bg-blue-50/30 border border-blue-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-20 placeholder:text-gray-400" />
           </div>
           <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 mb-2 text-orange-800 font-bold text-sm"><Flame size={16} /> Objetivo de Produção</div>
              <textarea value={currentObjectives.productionObjective || ''} onChange={(e) => handleObjectiveChange('productionObjective', e.target.value)} placeholder="Objetivos de produção..." disabled={isShiftLocked} className="w-full text-sm p-3 bg-orange-50/30 border border-orange-100 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none h-20 placeholder:text-gray-400" />
           </div>
        </div>
        <div className="flex justify-between items-center pt-2 px-1">
          <h3 className="font-bold text-gray-700 flex items-center gap-2">
            <Briefcase size={20} /> Postos de Trabalho 
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">{totalVisibleStations} Visíveis</span>
          </h3>
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              {!isShiftLocked && !isExpired && (
                <button onClick={handleSaveAndLock} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm">
                  <Save size={16} /> Finalizar {getShiftLabel(selectedShift)}
                </button>
              )}
              {isShiftLocked && !isExpired && (
                <button onClick={handleUnlock} className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white text-sm font-medium rounded-lg hover:bg-yellow-600 transition-colors shadow-sm">
                  <Edit size={16} /> Editar {getShiftLabel(selectedShift)}
                </button>
              )}
              {!isShiftLocked && (
                <button onClick={handleClearAssignments} className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 text-sm font-medium rounded-lg hover:bg-red-200 transition-colors shadow-sm">
                  <Trash2 size={16} /> Limpar
                </button>
              )}
              <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors shadow-sm"><Printer size={16} /> Imprimir</button>
            </div>
            <div className="h-6 w-px bg-gray-300 mx-1"></div>
            <button onClick={() => setShowAllStations(!showAllStations)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${showAllStations ? 'bg-blue-600' : 'bg-gray-300'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showAllStations ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
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

      <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-1 text-slate-900 overflow-hidden min-h-screen">
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
