
import React, { useState, useEffect, useMemo } from 'react';
import { StaffingTableEntry, AppSettings, DailySchedule, Employee, HourlyProjection, ShiftType, StationAssignment, StationConfig } from '../types';
import { AVAILABLE_SHIFTS, STATIONS } from '../constants';
import { 
  Users, User, AlertCircle, X, 
  Flame, Sun, Store, MoonStar, 
  CupSoda, TrendingUp,
  Calculator, CheckCircle2, AlertTriangle, Calendar, UserCircle, Briefcase, Filter, Printer, Save, Lock, Unlock, Edit, Target, GraduationCap, Trash2, Sunrise
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
    // Determine card sizing based on total load to fit on one page
    const cardHeight = totalStationsCount > 24 ? 'min-h-[110px]' : totalStationsCount > 15 ? 'min-h-[135px]' : 'min-h-[160px]';
    const nameBaseSize = totalStationsCount > 24 ? 'text-[22px]' : totalStationsCount > 15 ? 'text-[28px]' : 'text-[36px]';
    const subNameBaseSize = totalStationsCount > 24 ? 'text-[16px]' : totalStationsCount > 15 ? 'text-[20px]' : 'text-[26px]';

    const borderColorMap: Record<string, string> = {
        red: 'border-red-400',
        blue: 'border-blue-400',
        yellow: 'border-yellow-400',
        purple: 'border-purple-400',
        green: 'border-green-400',
        slate: 'border-slate-400',
    };

    const titleColorMap: Record<string, string> = {
        red: 'text-red-700',
        blue: 'text-blue-700',
        yellow: 'text-yellow-600',
        purple: 'text-purple-700',
        green: 'text-green-700',
        slate: 'text-slate-700',
    };

    const borderClass = borderColorMap[color] || 'border-slate-200';
    const textClass = titleColorMap[color] || 'text-slate-800';

    return (
        <div className={`break-inside-avoid-page mb-4 border-t-2 border-l border-r border-b ${borderClass} rounded-lg overflow-hidden bg-white flex flex-col p-2`}>
            <div className="px-1 py-0.5 flex items-center gap-2 mb-2">
                <span className={`font-black text-[12px] uppercase tracking-widest leading-none ${textClass}`}>{title.toUpperCase()}</span>
            </div>
            
            {/* Dynamic Grid: 1 col for few stations in area, 2 for more */}
            <div className={`grid gap-2 ${stations.length > 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {stations.map(station => {
                    const assignedIds = schedule.shifts[selectedShift]?.[station.id] || [];
                    const assignedTraineeIds = schedule.trainees?.[selectedShift]?.[station.id] || [];
                    
                    return (
                        <div key={station.id} className={`bg-white border-2 border-slate-200 rounded-lg overflow-hidden flex flex-col ${cardHeight} shadow-sm`}>
                             <div className="bg-slate-900 px-3 py-1 flex justify-between items-center h-8 shrink-0">
                                <span className="font-black text-[10px] text-white uppercase truncate tracking-tight">
                                    {station.label.toUpperCase()}
                                </span>
                                <span className="bg-yellow-400 text-slate-900 font-black text-[10px] px-2 rounded-sm leading-tight py-0.5">
                                    {station.defaultSlots}
                                </span>
                             </div>
                             
                             <div className="flex-1 p-2 flex flex-col justify-center items-center gap-1 text-center">
                                 {assignedIds.length > 0 ? (
                                     assignedIds.map(id => {
                                         const name = employees.find(e => e.id === id)?.name || '';
                                         const nameParts = name.split(' ');
                                         
                                         return (
                                            <div key={id} className="flex flex-col items-center">
                                                <div className={`${nameBaseSize} font-black text-slate-950 uppercase leading-[0.75] tracking-tighter`}>
                                                    {nameParts[0]}
                                                </div>
                                                {nameParts.length > 1 && (
                                                    <div className={`${subNameBaseSize} font-black text-slate-950 uppercase leading-[0.75] tracking-tighter mt-1`}>
                                                        {nameParts[nameParts.length - 1]}
                                                    </div>
                                                )}
                                            </div>
                                         );
                                     })
                                 ) : assignedTraineeIds.length === 0 ? (
                                     <div className="h-[2px] w-12 bg-slate-100 rounded-full" />
                                 ) : null}

                                 {assignedTraineeIds.map(id => (
                                     <div key={id} className="text-[10px] font-black text-yellow-600 flex flex-col items-center border-t border-yellow-50 mt-1 pt-1 w-full">
                                         <span className="truncate uppercase tracking-tighter">🎓 {employees.find(e => e.id === id)?.name}</span>
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
  date: string;
  setDate: (date: string) => void;
  projectedSales: number;
  employees: Employee[];
  staffingTable: StaffingTableEntry[];
  schedule: DailySchedule;
  setSchedule: (s: DailySchedule) => void;
  settings: AppSettings;
  hourlyData?: HourlyProjection[];
  onSaveSchedule: (schedule: DailySchedule) => void;
}

export const Positioning: React.FC<PositioningProps> = ({ 
  date, 
  setDate,
  employees, 
  staffingTable,
  schedule, 
  setSchedule,
  settings,
  hourlyData,
  onSaveSchedule
}) => {
  const [selectedShift, setSelectedShift] = useState<ShiftType>('ABERTURA');
  const [manualPeakHour, setManualPeakHour] = useState<string | null>(null);
  const [showAllStations, setShowAllStations] = useState(false);
  
  const availableShifts = settings.activeShifts;

  useEffect(() => {
    if (!availableShifts.includes(selectedShift) && availableShifts.length > 0) {
      setSelectedShift(availableShifts[0]);
    }
  }, [availableShifts, selectedShift]);

  const targetHourLabels = useMemo(() => {
    if (selectedShift === 'FECHO' || selectedShift === 'MADRUGADA') {
        return ['19h-20h', '20h-21h'];
    }
    return ['12h-13h', '13h-14h'];
  }, [selectedShift]);

  const shiftPeakData = useMemo(() => {
    if (!hourlyData) return [];
    return hourlyData.filter(d => targetHourLabels.includes(d.hour));
  }, [hourlyData, targetHourLabels]);

  useEffect(() => {
    if (shiftPeakData.length > 0) {
        const maxSalesHour = shiftPeakData.reduce((prev, current) => 
            (prev.totalSales > current.totalSales) ? prev : current
        ).hour;
        setManualPeakHour(maxSalesHour);
    } else {
        setManualPeakHour(null);
    }
  }, [shiftPeakData]);

  const activeSalesData = useMemo(() => {
      if (!manualPeakHour || shiftPeakData.length === 0) return { totalSales: 0, hour: '' };
      return shiftPeakData.find(d => d.hour === manualPeakHour) || { totalSales: 0, hour: '' };
  }, [manualPeakHour, shiftPeakData]);

  // Helper to determine required staff count based on sales
  const getRequiredStaff = (sales: number): { count: number; label: string } => {
    if (!staffingTable || staffingTable.length === 0) return { count: 0, label: 'N/A' };
    const match = staffingTable.find(row => sales >= row.minSales && sales <= row.maxSales);
    if (match) return { count: match.staffCount, label: match.stationLabel };
    const lastRow = staffingTable[staffingTable.length - 1];
    if (sales > lastRow.maxSales) return { count: lastRow.staffCount, label: lastRow.stationLabel };
    return { count: 0, label: '0' };
  };

  // Helper for area label
  const getAreaLabel = (area: string) => {
    const labels: Record<string, string> = {
      kitchen: 'Produção (Cozinha)',
      service: 'Serviço (Balcão)',
      delivery: 'Delivery',
      lobby: 'Sala (Lobby)',
      beverage: 'Bebidas (Cell)',
      drive: 'Drive-Thru',
      mccafe: 'McCafé',
      fries: 'Batatas (Fries)'
    };
    return labels[area] || area;
  };

  // Helper for area color scheme
  const getAreaColor = (area: string) => {
    const colors: Record<string, string> = {
      kitchen: 'red',
      service: 'blue',
      delivery: 'green',
      lobby: 'purple',
      beverage: 'yellow',
      drive: 'slate',
      mccafe: 'slate',
      fries: 'yellow'
    };
    return colors[area] || 'slate';
  };

  // Handler for assigning staff to stations
  const handleAssign = (stationId: string, employeeId: string) => {
    if (schedule.isLocked) return;
    const currentShifts = { ...schedule.shifts };
    const currentShiftData = { ...(currentShifts[selectedShift] || {}) };
    const stationAssignments = [...(currentShiftData[stationId] || [])];
    
    if (!stationAssignments.includes(employeeId)) {
        stationAssignments.push(employeeId);
        currentShiftData[stationId] = stationAssignments;
        currentShifts[selectedShift] = currentShiftData;
        setSchedule({ ...schedule, shifts: currentShifts });
    }
  };

  // Handler for removing staff from stations
  const handleRemove = (stationId: string, employeeId: string) => {
    if (schedule.isLocked) return;
    const currentShifts = { ...schedule.shifts };
    const currentShiftData = { ...(currentShifts[selectedShift] || {}) };
    const stationAssignments = (currentShiftData[stationId] || []).filter(id => id !== employeeId);
    
    currentShiftData[stationId] = stationAssignments;
    currentShifts[selectedShift] = currentShiftData;
    setSchedule({ ...schedule, shifts: currentShifts });
  };

  // Handler for assigning trainees to stations
  const handleAssignTrainee = (stationId: string, employeeId: string) => {
    if (schedule.isLocked) return;
    const currentTrainees = { ...(schedule.trainees || {}) };
    const shiftTrainees = { ...(currentTrainees[selectedShift] || {}) };
    const stationTrainees = [...(shiftTrainees[stationId] || [])];

    if (!stationTrainees.includes(employeeId)) {
        stationTrainees.push(employeeId);
        shiftTrainees[stationId] = stationTrainees;
        currentTrainees[selectedShift] = shiftTrainees;
        setSchedule({ ...schedule, trainees: currentTrainees });
    }
  };

  // Handler for removing trainees from stations
  const handleRemoveTrainee = (stationId: string, employeeId: string) => {
    if (schedule.isLocked) return;
    const currentTrainees = { ...(schedule.trainees || {}) };
    const shiftTrainees = { ...(currentTrainees[selectedShift] || {}) };
    const stationTrainees = (shiftTrainees[stationId] || []).filter(id => id !== employeeId);

    shiftTrainees[stationId] = stationTrainees;
    currentTrainees[selectedShift] = shiftTrainees;
    setSchedule({ ...schedule, trainees: currentTrainees });
  };

  const requirement = useMemo(() => getRequiredStaff(activeSalesData.totalSales), [activeSalesData, staffingTable]);

  const currentAssignedCount = useMemo(() => {
     const shiftData: StationAssignment = schedule.shifts[selectedShift] || {};
     const uniqueIds = new Set<string>();
     Object.values(shiftData).forEach((ids) => {
        if (Array.isArray(ids)) ids.forEach((id: string) => uniqueIds.add(id));
     });
     return uniqueIds.size;
  }, [schedule, selectedShift]);

  const gap = requirement.count - currentAssignedCount;

  const recommendedStationLabels = useMemo(() => {
    const sortedTable = [...staffingTable].sort((a, b) => a.staffCount - b.staffCount);
    const activeRows = sortedTable.filter(row => row.staffCount <= requirement.count);
    return new Set(activeRows.map(r => r.stationLabel));
  }, [staffingTable, requirement.count]);

  const handleManagerChange = (empId: string) => {
      if (schedule.isLocked) return;
      const currentManagers = schedule.shiftManagers || {};
      setSchedule({
          ...schedule,
          shiftManagers: { ...currentManagers, [selectedShift]: empId }
      });
  };

  const handleObjectiveChange = (field: 'turnObjective' | 'productionObjective', value: string) => {
      if (schedule.isLocked) return;
      const currentObjs = schedule.shiftObjectives || {};
      const shiftObjs = currentObjs[selectedShift] || {};
      setSchedule({
          ...schedule,
          shiftObjectives: {
              ...currentObjs,
              [selectedShift]: { ...shiftObjs, [field]: value }
          }
      });
  };

  const handlePrint = () => window.print();

  const handleSaveAndLock = () => onSaveSchedule({ ...schedule, isLocked: true });
  const handleUnlock = () => onSaveSchedule({ ...schedule, isLocked: false });

  const handleClearAssignments = () => {
      if (schedule.isLocked) return;
      if (confirm('Tem a certeza que deseja limpar todos os posicionamentos deste turno?')) {
          setSchedule({
              ...schedule,
              shifts: { ...schedule.shifts, [selectedShift]: {} },
              trainees: { ...schedule.trainees, [selectedShift]: {} }
          });
      }
  };

  const getShiftIcon = (id: ShiftType) => {
    switch(id) {
      case 'ABERTURA': return <Sunrise size={18} />;
      case 'INTERMEDIO': return <Sun size={18} />;
      case 'FECHO': return <MoonStar size={18} />;
      default: return <Store size={18} />;
    }
  };

  const getShiftLabel = (id: ShiftType) => AVAILABLE_SHIFTS.find(s => s.id === id)?.label || id;

  const allStations = settings.customStations || STATIONS;

  // Filter logic for both Screen and Print
  const filteredStations = useMemo(() => {
    const activeBusinessAreas = settings.businessAreas || [];
    return allStations.filter(s => {
        if (!s.isActive) return false;
        
        // Business area check
        if (s.area === 'drive' && !activeBusinessAreas.includes('Drive')) return false;
        if (s.area === 'mccafe' && !activeBusinessAreas.includes('McCafé')) return false;
        if (s.area === 'delivery' && !activeBusinessAreas.includes('Delivery')) return false;

        // "Show all" overrides assignment/recommendation logic
        if (showAllStations) return true;
        
        // Dynamic visibility logic
        const assigned = (schedule.shifts[selectedShift]?.[s.id] || []).length > 0;
        const assignedTrainees = (schedule.trainees?.[selectedShift]?.[s.id] || []).length > 0;
        if (assigned || assignedTrainees) return true;
        
        return recommendedStationLabels.has(s.label);
    });
  }, [allStations, showAllStations, recommendedStationLabels, schedule.shifts, schedule.trainees, selectedShift, settings.businessAreas]);

  // Grouping logic
  const stationsByArea = useMemo(() => {
    const groups: Record<string, StationConfig[]> = {};
    filteredStations.forEach(s => {
        if (!groups[s.area]) groups[s.area] = [];
        groups[s.area].push(s);
    });
    const order = ['beverage', 'kitchen', 'service', 'fries', 'lobby', 'drive', 'delivery', 'mccafe'];
    return Object.keys(groups)
        .sort((a, b) => order.indexOf(a) - order.indexOf(b))
        .reduce((acc, key) => {
            acc[key] = groups[key];
            return acc;
        }, {} as Record<string, StationConfig[]>);
  }, [filteredStations]);

  const totalVisibleStations = filteredStations.length;

  const shiftManagerName = useMemo(() => {
      const id = schedule.shiftManagers?.[selectedShift];
      return employees.find(e => e.id === id)?.name || '-';
  }, [schedule.shiftManagers, selectedShift, employees]);

  const currentObjectives = useMemo(() => {
    const shiftObjs = schedule.shiftObjectives || {};
    return shiftObjs[selectedShift] || {};
  }, [schedule.shiftObjectives, selectedShift]);

  return (
    <>
    {/* Screen View */}
    <div className="flex flex-col h-full space-y-4 animate-fade-in print:hidden">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Calendar size={20} /></div>
              <div>
                  <p className="text-xs text-gray-500 font-bold uppercase">Data</p>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="text-lg font-bold text-gray-800 bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none pb-0.5" />
              </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><UserCircle size={20} /></div>
              <div className="flex-1">
                  <p className="text-xs text-gray-500 font-bold uppercase">Gerente de Turno</p>
                  <select 
                    value={schedule.shiftManagers?.[selectedShift] || ''}
                    onChange={(e) => handleManagerChange(e.target.value)}
                    disabled={schedule.isLocked}
                    className={`w-full md:w-64 mt-1 p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none ${schedule.isLocked ? 'opacity-70 cursor-not-allowed bg-gray-100' : ''}`}
                  >
                      <option value="">Selecione o Gerente...</option>
                      {employees.filter(e => e.role === 'GERENTE').map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                  </select>
              </div>
          </div>
      </div>

      <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-200 flex gap-2 overflow-x-auto">
        {availableShifts.map(shift => (
          <button
            key={shift} onClick={() => setSelectedShift(shift)}
            className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-medium transition-all whitespace-nowrap ${selectedShift === shift ? 'bg-blue-600 text-white shadow-md' : 'bg-transparent text-gray-500 hover:bg-gray-50'}`}
          >
            {getShiftIcon(shift)} {getShiftLabel(shift)}
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
                                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isActive ? 'border-blue-500' : 'border-gray-300'}`}>{isActive && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}</div>
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
                      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 flex flex-col items-center justify-center text-center">
                          <span className="text-xs font-bold text-blue-400 uppercase mb-1">Necessários</span>
                          <div className="flex items-center gap-2"><Calculator className="text-blue-500" size={20} /><span className="text-3xl font-extrabold text-blue-700">{requirement.count}</span></div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex flex-col items-center justify-center text-center">
                          <span className="text-xs font-bold text-gray-400 uppercase mb-1">Posicionados</span>
                          <div className="flex items-center gap-2"><Users className="text-gray-500" size={20} /><span className="text-3xl font-extrabold text-gray-700">{currentAssignedCount}</span></div>
                      </div>
                      <div className={`rounded-xl p-4 border flex flex-col items-center justify-center text-center ${gap > 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
                          <span className={`text-xs font-bold uppercase mb-1 ${gap > 0 ? 'text-red-400' : 'text-emerald-400'}`}>Diferença</span>
                          <div className="flex items-center gap-2">{gap > 0 ? <AlertTriangle className="text-red-500" size={20} /> : <CheckCircle2 className="text-emerald-500" size={20} />}<span className={`text-3xl font-extrabold ${gap > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{gap > 0 ? `-${gap}` : 'OK'}</span></div>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
             <div className="flex items-center gap-2 mb-2 text-blue-800 font-bold text-sm"><Target size={16} /> Objetivo de Turno</div>
             <textarea value={currentObjectives.turnObjective || ''} onChange={(e) => handleObjectiveChange('turnObjective', e.target.value)} placeholder="Ex: Focar na rapidez do Drive..." disabled={schedule.isLocked} className="w-full text-sm p-3 bg-blue-50/30 border border-blue-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none h-20 placeholder:text-gray-400" />
         </div>
         <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
             <div className="flex items-center gap-2 mb-2 text-orange-800 font-bold text-sm"><Flame size={16} /> Objetivo de Produção</div>
             <textarea value={currentObjectives.productionObjective || ''} onChange={(e) => handleObjectiveChange('productionObjective', e.target.value)} placeholder="Ex: Manter tempos de KVS abaixo de 40s..." disabled={schedule.isLocked} className="w-full text-sm p-3 bg-orange-50/30 border border-orange-100 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none resize-none h-20 placeholder:text-gray-400" />
         </div>
      </div>

      <div className="flex justify-between items-center pt-2 px-1">
          <h3 className="font-bold text-gray-700 flex items-center gap-2"><Briefcase size={20} /> Postos de Trabalho <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">{totalVisibleStations} Visíveis</span></h3>
          <div className="flex items-center gap-3">
              <div className="flex gap-2">
                {!schedule.isLocked && <button onClick={handleSaveAndLock} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm"><Save size={16} /> Finalizar</button>}
                {schedule.isLocked && <button onClick={handleUnlock} className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white text-sm font-medium rounded-lg hover:bg-yellow-600 transition-colors shadow-sm"><Edit size={16} /> Editar</button>}
                <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors shadow-sm"><Printer size={16} /> Imprimir</button>
              </div>
              <div className="h-6 w-px bg-gray-300 mx-1"></div>
              <button onClick={() => setShowAllStations(!showAllStations)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${showAllStations ? 'bg-blue-600' : 'bg-gray-300'}`} title="Mostrar todos os postos"><span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showAllStations ? 'translate-x-6' : 'translate-x-1'}`} /></button>
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
                    isLocked={schedule.isLocked} 
                 />
             </div>
         ))}
      </div>
    </div>

    {/* ================= PRINT VIEW (ONE PAGE LANDSCAPE) ================= */}
    <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-4 text-slate-900 overflow-hidden min-h-screen">
        {/* Main Header */}
        <div className="flex justify-between items-end mb-4 border-b-2 border-slate-900 pb-2">
            <h1 className="text-[26px] font-black uppercase tracking-tight text-slate-950 leading-none">
                {settings.restaurantName.toUpperCase()}
            </h1>
            <div className="flex items-center gap-6">
                <span className="text-[13px] font-bold text-slate-500 uppercase">
                    {new Date(date).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
                <div className="bg-slate-950 text-white px-4 py-1.5 rounded-sm text-[16px] font-black uppercase tracking-wider leading-none">
                    {getShiftLabel(selectedShift).toUpperCase()}
                </div>
            </div>
        </div>

        {/* 5 Blocks Metric Grid */}
        <div className="grid grid-cols-5 gap-3 mb-5">
            <div className="bg-slate-50 border-2 border-slate-100 p-2 rounded flex flex-col justify-center min-h-[55px]">
                <span className="text-[8px] font-black uppercase text-slate-400 block mb-0.5">Gerente</span>
                <div className="font-black text-[14px] text-slate-900 truncate uppercase tracking-tighter">
                    {shiftManagerName}
                </div>
            </div>
            <div className="bg-slate-50 border-2 border-slate-100 p-2 rounded flex flex-col justify-center min-h-[55px]">
                <span className="text-[8px] font-black uppercase text-slate-400 block mb-0.5">Previsão</span>
                <div className="font-black text-[18px] text-slate-900">
                    {activeSalesData.totalSales} €
                </div>
            </div>
            <div className="bg-slate-50 border-2 border-slate-100 p-2 rounded flex flex-col justify-center min-h-[55px]">
                <span className="text-[8px] font-black uppercase text-slate-400 block mb-0.5">Staff</span>
                <div className="font-black text-[18px] text-slate-900">
                    {currentAssignedCount}
                </div>
            </div>
            <div className="bg-white border-2 border-slate-100 p-2 rounded flex flex-col justify-center overflow-hidden min-h-[55px]">
                <span className="text-[8px] font-black uppercase text-blue-600 block mb-0.5 leading-none">Obj. Turno</span>
                <div className="text-[11px] font-bold text-slate-800 leading-tight">
                    {currentObjectives.turnObjective || '-'}
                </div>
            </div>
            <div className="bg-white border-2 border-slate-100 p-2 rounded flex flex-col justify-center overflow-hidden min-h-[55px]">
                <span className="text-[8px] font-black uppercase text-orange-600 block mb-0.5 leading-none">Obj. Produção</span>
                <div className="text-[11px] font-bold text-slate-800 leading-tight">
                    {currentObjectives.productionObjective || '-'}
                </div>
            </div>
        </div>

        {/* Dynamic Multi-Column Flow Grid for Area Blocks */}
        {/* We use columns-3 or 4 depending on total count to ensure everything fits on one sheet */}
        <div className={`columns-2 lg:${totalVisibleStations > 20 ? 'columns-4' : 'columns-3'} gap-4 h-auto`}>
            {Object.entries(stationsByArea).map(([area, stations]) => (
                <VisualPrintZone 
                    key={area}
                    title={getAreaLabel(area)}
                    stations={stations}
                    schedule={schedule}
                    selectedShift={selectedShift}
                    employees={employees}
                    color={getAreaColor(area)}
                    totalStationsCount={totalVisibleStations}
                />
            ))}
        </div>

        {/* Print Footer */}
        <div className="fixed bottom-2 left-4 w-full flex justify-between text-[9px] font-bold text-slate-300 uppercase tracking-widest bg-white">
            <span>TeamPos &bull; Documento de Gestão Interna &bull; Impresso em {new Date().toLocaleString()}</span>
        </div>
    </div>
    </>
  );
};
