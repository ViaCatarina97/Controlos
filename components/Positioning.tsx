import React, { useState, useEffect, useMemo } from 'react';
import { StaffingTableEntry, AppSettings, DailySchedule, Employee, HourlyProjection, ShiftType, StationAssignment, StationConfig } from '../types';
import { AVAILABLE_SHIFTS, STATIONS } from '../constants';
import { 
  Users, User, AlertCircle, X, 
  Bike, UtensilsCrossed, Coffee, Flame, Sun, Store, MoonStar, 
  Car, CupSoda, TrendingUp,
  Calculator, CheckCircle2, AlertTriangle, Calendar, UserCircle, Briefcase, Filter, Printer, Save, Lock, Unlock, Edit, Target, GraduationCap, Trash2, Sunrise, Layout
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
    slate: 'border-slate-200 bg-slate-50',
  };
  const titleColorMap: Record<string, string> = {
    red: 'text-red-800',
    blue: 'text-blue-800',
    yellow: 'text-yellow-800',
    purple: 'text-purple-800',
    green: 'text-green-800',
    slate: 'text-slate-800',
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
}

const VisualPrintZone: React.FC<VisualPrintZoneProps> = ({
  title, stations, schedule, selectedShift, employees
}) => {
    // Determine grid columns based on content to auto-adjust
    const getGridCols = (count: number) => {
        if (count <= 2) return 'grid-cols-1';
        return 'grid-cols-2'; 
    };

    return (
        <div className="break-inside-avoid mb-4 border-2 border-slate-900 rounded-lg overflow-hidden bg-white shadow-sm flex flex-col">
            <div className="bg-slate-900 px-3 py-1.5 flex justify-between items-center shrink-0">
                <span className="font-black text-[12px] text-white uppercase tracking-widest leading-none">{title}</span>
                <span className="text-[10px] font-black text-slate-900 bg-yellow-400 px-1.5 rounded-sm leading-none py-0.5">
                    {stations.length}
                </span>
            </div>
            
            <div className={`p-2 grid gap-2 ${getGridCols(stations.length)}`}>
                {stations.map(station => {
                    const assignedIds = schedule.shifts[selectedShift]?.[station.id] || [];
                    const assignedTraineeIds = schedule.trainees?.[selectedShift]?.[station.id] || [];
                    
                    return (
                        <div key={station.id} className="bg-white border-2 border-slate-300 rounded-md flex flex-col min-h-[54px] flex-grow">
                             <div className="bg-slate-100 px-2 py-0.5 border-b border-slate-200 flex justify-between items-center">
                                <span className="font-bold text-[9px] text-slate-600 uppercase truncate">
                                    {station.label}
                                </span>
                             </div>
                             
                             <div className="flex-1 p-1.5 flex flex-col justify-center gap-1">
                                 {assignedIds.length > 0 ? (
                                     assignedIds.map(id => (
                                         <div key={id} className="text-[14px] font-black text-slate-950 uppercase leading-none tracking-tighter">
                                             {employees.find(e => e.id === id)?.name}
                                         </div>
                                     ))
                                 ) : assignedTraineeIds.length === 0 ? (
                                     <div className="h-0.5 w-4 bg-slate-100 rounded mx-auto" />
                                 ) : null}

                                 {assignedTraineeIds.map(id => (
                                     <div key={id} className="text-[10px] font-bold text-yellow-600 flex items-center gap-1 italic border-t border-yellow-100 mt-0.5 pt-0.5">
                                         <GraduationCap size={10} className="shrink-0" />
                                         <span className="truncate uppercase">{employees.find(e => e.id === id)?.name}</span>
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
  const [selectedShift, setSelectedShift] = useState<ShiftType>('INTERMEDIO');
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

  const filteredStations = useMemo(() => {
    return allStations.filter(s => {
        if (!s.isActive) return false;
        if (showAllStations) return true;
        const assigned = schedule.shifts[selectedShift]?.[s.id];
        const assignedTrainees = schedule.trainees?.[selectedShift]?.[s.id];
        if ((assigned && assigned.length > 0) || (assignedTrainees && assignedTrainees.length > 0)) return true;
        return recommendedStationLabels.has(s.label);
    });
  }, [allStations, showAllStations, recommendedStationLabels, schedule.shifts, schedule.trainees, selectedShift]);

  // Group stations by Area for BOTH screen and print
  const stationsByArea = useMemo(() => {
    const groups: Record<string, StationConfig[]> = {};
    filteredStations.forEach(s => {
        if (!groups[s.area]) groups[s.area] = [];
        groups[s.area].push(s);
    });
    // Target Order: McCafe as the very last (optional) after Lobby
    const order = ['drive', 'kitchen', 'fries', 'service', 'beverage', 'delivery', 'lobby', 'mccafe'];
    return Object.keys(groups)
        .sort((a, b) => {
            const indexA = order.indexOf(a);
            const indexB = order.indexOf(b);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        })
        .reduce((acc, key) => {
            acc[key] = groups[key];
            return acc;
        }, {} as Record<string, StationConfig[]>);
  }, [filteredStations]);

  const handleAssign = (stationId: string, employeeId: string) => {
     if (schedule.isLocked || !employeeId) return;
     const currentShift = schedule.shifts[selectedShift] || {};
     const currentAssigned = currentShift[stationId] || [];
     if (currentAssigned.includes(employeeId)) return;
     const newShift = { ...currentShift };
     Object.keys(newShift).forEach(key => {
        newShift[key] = newShift[key].filter(id => id !== employeeId);
     });
     newShift[stationId] = [...(newShift[stationId] || []), employeeId];
     setSchedule({ ...schedule, shifts: { ...schedule.shifts, [selectedShift]: newShift } });
  };

  const handleRemove = (stationId: string, employeeId: string) => {
    if (schedule.isLocked) return;
    const currentShift = schedule.shifts[selectedShift] || {};
    const currentAssigned = currentShift[stationId] || [];
    setSchedule({
        ...schedule,
        shifts: {
            ...schedule.shifts,
            [selectedShift]: { ...currentShift, [stationId]: currentAssigned.filter(id => id !== employeeId) }
        }
     });
  };

  const handleAssignTrainee = (stationId: string, employeeId: string) => {
     if (schedule.isLocked || !employeeId) return;
     const currentTrainees = schedule.trainees || {};
     const currentShiftTrainees = currentTrainees[selectedShift] || {};
     const currentAssigned = currentShiftTrainees[stationId] || [];
     if (currentAssigned.includes(employeeId)) return;
     const newShiftTrainees = { ...currentShiftTrainees };
     Object.keys(newShiftTrainees).forEach(key => {
        newShiftTrainees[key] = newShiftTrainees[key].filter(id => id !== employeeId);
     });
     newShiftTrainees[stationId] = [...(newShiftTrainees[stationId] || []), employeeId];
     setSchedule({ ...schedule, trainees: { ...currentTrainees, [selectedShift]: newShiftTrainees } });
  };

  const handleRemoveTrainee = (stationId: string, employeeId: string) => {
    if (schedule.isLocked) return;
    const currentTrainees = schedule.trainees || {};
    const currentShiftTrainees = currentTrainees[selectedShift] || {};
    const currentAssigned = currentShiftTrainees[stationId] || [];
    setSchedule({
        ...schedule,
        trainees: {
            ...currentTrainees,
            [selectedShift]: { ...currentShiftTrainees, [stationId]: currentAssigned.filter(id => id !== employeeId) }
        }
     });
  };

  const getAreaLabel = (key: string) => {
      const labels: Record<string, string> = {
          kitchen: 'Cozinha / Produção',
          service: 'Balcão / Serviço',
          drive: 'Drive-Thru',
          delivery: 'Delivery',
          beverage: 'Bebidas (Cell)',
          mccafe: 'McCafé',
          fries: 'Batatas (Fries)',
          lobby: 'Sala (Lobby)'
      };
      return labels[key] || key.charAt(0).toUpperCase() + key.slice(1);
  };

  const getAreaColor = (key: string) => {
      const colors: Record<string, string> = {
          kitchen: 'red', service: 'blue', drive: 'blue', delivery: 'green', beverage: 'purple', mccafe: 'yellow', fries: 'yellow', lobby: 'yellow'
      };
      return colors[key] || 'slate';
  };

  const shiftManagerName = useMemo(() => {
      const id = schedule.shiftManagers?.[selectedShift];
      return employees.find(e => e.id === id)?.name || 'N/A';
  }, [schedule.shiftManagers, selectedShift, employees]);

  const currentObjectives = schedule.shiftObjectives?.[selectedShift] || {};

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

      {schedule.isLocked && (
          <div className="bg-gray-800 text-white px-4 py-3 rounded-xl flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                  <Lock size={20} className="text-yellow-400" />
                  <div>
                      <h4 className="font-bold text-sm">Posicionamento Finalizado</h4>
                      <p className="text-xs text-gray-400">Modo de leitura ativo. Desbloqueie para editar.</p>
                  </div>
              </div>
              <button onClick={handleUnlock} className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"><Unlock size={14} /> Editar</button>
          </div>
      )}

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
                      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 flex flex-col items-center justify-center text-center relative overflow-hidden">
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
             <textarea value={currentObjectives.turnObjective || ''} onChange={(e) => handleObjectiveChange('turnObjective', e.target.value)} placeholder="Ex: Focar na rapidez do Drive..." disabled={schedule.isLocked} className="w-full text-sm p-3 bg-blue-50/30 border border-blue-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none h-20 placeholder:text-gray-400 disabled:opacity-70 disabled:bg-gray-50" />
         </div>
         <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
             <div className="flex items-center gap-2 mb-2 text-orange-800 font-bold text-sm"><Flame size={16} /> Objetivo de Produção</div>
             <textarea value={currentObjectives.productionObjective || ''} onChange={(e) => handleObjectiveChange('productionObjective', e.target.value)} placeholder="Ex: Manter tempos de KVS abaixo de 40s..." disabled={schedule.isLocked} className="w-full text-sm p-3 bg-orange-50/30 border border-orange-100 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none resize-none h-20 placeholder:text-gray-400 disabled:opacity-70 disabled:bg-gray-50" />
         </div>
      </div>

      <div className="flex justify-between items-center pt-2 px-1">
          <h3 className="font-bold text-gray-700 flex items-center gap-2"><Briefcase size={20} /> Postos de Trabalho <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">{filteredStations.length} Visíveis</span></h3>
          <div className="flex items-center gap-3">
              <div className="flex gap-2">
                {!schedule.isLocked && <button onClick={handleSaveAndLock} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm"><Save size={16} /> Finalizar</button>}
                {schedule.isLocked && <button onClick={handleUnlock} className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white text-sm font-medium rounded-lg hover:bg-yellow-600 transition-colors shadow-sm"><Edit size={16} /> Editar</button>}
                {!schedule.isLocked && <button onClick={handleClearAssignments} className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 text-sm font-medium rounded-lg hover:bg-red-200 transition-colors shadow-sm"><Trash2 size={16} /> Limpar</button>}
                <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors shadow-sm"><Printer size={16} /> Imprimir</button>
              </div>
              <div className="h-6 w-px bg-gray-300 mx-1"></div>
              <span className="text-xs font-medium text-gray-500">{showAllStations ? 'Mostrar todos' : `Sugestão (${requirement.count})`}</span>
              <button onClick={() => setShowAllStations(!showAllStations)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${showAllStations ? 'bg-blue-600' : 'bg-gray-300'}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showAllStations ? 'translate-x-6' : 'translate-x-1'}`} /></button>
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
        {filteredStations.length === 0 && <div className="col-span-full py-12 text-center text-gray-400 bg-gray-50 border border-dashed border-gray-300 rounded-lg"><Filter size={48} className="mx-auto mb-4 opacity-20" /><p>Nenhum posto recomendado para o volume de vendas atual.</p><button onClick={() => setShowAllStations(true)} className="mt-2 text-blue-600 hover:underline font-bold">Mostrar todos os postos</button></div>}
      </div>
    </div>

    {/* ================= PRINT VIEW (DYNAMIC ADAPTIVE MAP) ================= */}
    <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-4 text-slate-900 overflow-visible min-h-screen">
        <div className="flex justify-between items-end mb-4 pb-2 border-b-4 border-slate-900">
            <div className="flex flex-col">
                <h1 className="text-2xl font-black uppercase tracking-tighter text-slate-900 leading-none">{settings.restaurantName}</h1>
                <div className="text-[12px] font-bold text-slate-500 mt-1 uppercase">Mapa de Posicionamento Operacional</div>
            </div>
            <div className="text-right">
                <div className="text-[14px] font-black text-slate-800">{new Date(date).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
                <div className="inline-block bg-slate-900 text-white px-3 py-1 rounded text-lg font-black uppercase mt-1 leading-none">{getShiftLabel(selectedShift)}</div>
            </div>
        </div>

        {/* Resumo e Objetivos */}
        <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="bg-slate-50 rounded border-2 border-slate-200 p-2">
                <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Gerente de Turno</span>
                <div className="font-black text-sm text-slate-900 uppercase">{shiftManagerName}</div>
            </div>
            <div className="bg-slate-50 rounded border-2 border-slate-200 p-2">
                <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Previsão Vendas</span>
                <div className="font-black text-sm text-slate-900">{activeSalesData.totalSales} € <span className="text-[10px] text-slate-400 font-bold ml-1">({manualPeakHour})</span></div>
            </div>
            <div className="col-span-2 bg-white rounded border-2 border-slate-200 p-2 flex gap-4">
                <div className="flex-1 overflow-hidden">
                    <span className="text-[9px] font-black uppercase text-blue-600 block mb-1">Objetivo Turno</span>
                    <p className="text-[10px] font-bold leading-tight line-clamp-2 text-slate-700">{currentObjectives.turnObjective || 'Sem objetivo definido.'}</p>
                </div>
                <div className="w-px bg-slate-100" />
                <div className="flex-1 overflow-hidden">
                    <span className="text-[9px] font-black uppercase text-orange-600 block mb-1">Objetivo Produção</span>
                    <p className="text-[10px] font-bold leading-tight line-clamp-2 text-slate-700">{currentObjectives.productionObjective || 'Sem objetivo definido.'}</p>
                </div>
            </div>
        </div>

        {/* Grelha Dinâmica de Áreas */}
        <div className="columns-2 gap-4 h-auto">
            {Object.entries(stationsByArea).map(([area, stations]) => (
                <VisualPrintZone 
                    key={area}
                    title={getAreaLabel(area)}
                    stations={stations}
                    schedule={schedule}
                    selectedShift={selectedShift}
                    employees={employees}
                />
            ))}
        </div>

        <div className="fixed bottom-2 left-4 w-full flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-white">
            <span>&copy; TeamPos &bull; Documento de Apoio Operacional</span>
            <span className="mr-8">Data de Impressão: {new Date().toLocaleString()}</span>
        </div>
    </div>
    </>
  );
};