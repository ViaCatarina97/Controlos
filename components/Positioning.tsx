import React, { useState, useEffect, useMemo } from 'react';
import { StaffingTableEntry, AppSettings, DailySchedule, Employee, HourlyProjection, ShiftType, StationAssignment, StationConfig } from '../types';
import { AVAILABLE_SHIFTS, STATIONS } from '../constants';
import { 
  Users, User, AlertCircle, X, 
  Bike, UtensilsCrossed, Coffee, Flame, Sun, Store, MoonStar, 
  Car, CupSoda, TrendingUp,
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
  };
  const titleColorMap: Record<string, string> = {
    red: 'text-red-800',
    blue: 'text-blue-800',
    yellow: 'text-yellow-800',
    purple: 'text-purple-800',
    green: 'text-green-800',
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
  icon: any;
  stations: StationConfig[];
  schedule: DailySchedule;
  selectedShift: ShiftType;
  employees: Employee[];
  className?: string;
  headerColor?: string;
  cols?: number;
}

const VisualPrintZone: React.FC<VisualPrintZoneProps> = ({
  title, icon: Icon, stations, schedule, selectedShift, employees, className = '', headerColor = '', cols = 2
}) => {
    return (
        <div className={`border-2 rounded-lg flex flex-col h-full shadow-sm ${className}`}>
            <div className={`p-1 flex items-center gap-1 border-b-2 border-black/10 ${headerColor} shrink-0`}>
                {Icon && <Icon size={14} />}
                <span className="font-black text-[11px] uppercase tracking-wider">{title}</span>
            </div>
            <div 
                className="flex-1 p-1.5 grid gap-1.5"
                style={{ 
                    gridTemplateColumns: `repeat(${cols}, 1fr)`,
                    gridAutoRows: '1fr' 
                }}
            >
                {stations.map(station => {
                    const assignedIds = schedule.shifts[selectedShift]?.[station.id] || [];
                    const assignedTraineeIds = schedule.trainees?.[selectedShift]?.[station.id] || [];
                    
                    return (
                        <div key={station.id} className="bg-white border-2 border-slate-300 rounded-lg flex flex-col overflow-hidden relative group">
                             {/* Station Header - Compact but Bold */}
                             <div className="bg-slate-50 border-b border-slate-200 px-1.5 py-0.5 flex justify-between items-center shrink-0">
                                <span className="font-black text-[10px] text-slate-600 uppercase truncate leading-none py-1">
                                    {station.label}
                                </span>
                                {assignedIds.length > 0 && (
                                    <span className="text-[8px] font-bold text-slate-400 bg-white px-1 rounded-sm border border-slate-100">
                                        {assignedIds.length}
                                    </span>
                                )}
                             </div>
                             
                             {/* Main Content: Center Employee Name and make it HUGE */}
                             <div className="flex-1 flex flex-col justify-center items-center p-1 text-center bg-white">
                                 {/* Staff Names - Big Relevancy */}
                                 {assignedIds.length > 0 ? (
                                     <div className="w-full flex flex-col gap-1">
                                        {assignedIds.map(id => {
                                            const emp = employees.find(e => e.id === id);
                                            return (
                                                <div key={id} className="text-[13px] sm:text-[14px] font-black text-slate-900 leading-[1.1] uppercase break-words px-1">
                                                    {emp?.name}
                                                </div>
                                            )
                                        })}
                                     </div>
                                 ) : assignedTraineeIds.length === 0 ? (
                                     <div className="w-full h-full flex items-center justify-center">
                                         <div className="w-4/5 h-px bg-slate-100"></div>
                                     </div>
                                 ) : null}

                                 {/* Trainee Names - Slightly smaller but still prominent with icon */}
                                 {assignedTraineeIds.length > 0 && (
                                     <div className="w-full flex flex-col gap-1 mt-0.5 border-t border-slate-100 pt-1">
                                        {assignedTraineeIds.map(id => {
                                            const emp = employees.find(e => e.id === id);
                                            return (
                                                <div key={id} className="text-[11px] font-black text-yellow-700 leading-none uppercase flex items-center justify-center gap-1">
                                                    <GraduationCap size={10} className="shrink-0" />
                                                    <span className="truncate">{emp?.name}</span>
                                                </div>
                                            )
                                        })}
                                     </div>
                                 )}
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

  const serviceStations = filteredStations.filter(s => s.area === 'service');
  const deliveryStations = filteredStations.filter(s => s.area === 'delivery');
  const beverageStations = filteredStations.filter(s => s.area === 'beverage');
  const lobbyStations = filteredStations.filter(s => s.area === 'lobby');
  const driveStations = filteredStations.filter(s => s.area === 'drive');
  const mccafeStations = filteredStations.filter(s => s.area === 'mccafe');

  const isFriesStation = (s: StationConfig) => {
      const label = s.label.toLowerCase();
      const id = s.id.toLowerCase();
      return s.area === 'fries' || label.includes('batata') || label.includes('fries') || label.includes('frit') || id.includes('fries');
  };

  const friesStations = filteredStations.filter(s => isFriesStation(s));
  const kitchenStations = filteredStations.filter(s => s.area === 'kitchen' && !isFriesStation(s));

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

  const shiftManagerName = useMemo(() => {
      const id = schedule.shiftManagers?.[selectedShift];
      return employees.find(e => e.id === id)?.name || 'Não atribuído';
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
         {kitchenStations.length > 0 && <div className="flex flex-col gap-4"><StationGroup title="Produção (Cozinha)" stations={kitchenStations} schedule={schedule} selectedShift={selectedShift} employees={employees} onAssign={handleAssign} onRemove={handleRemove} onAssignTrainee={handleAssignTrainee} onRemoveTrainee={handleRemoveTrainee} color="red" isLocked={schedule.isLocked} /></div>}
         {(serviceStations.length > 0 || driveStations.length > 0) && (
             <div className="flex flex-col gap-4">
                 {driveStations.length > 0 && <StationGroup title="Drive-Thru" stations={driveStations} schedule={schedule} selectedShift={selectedShift} employees={employees} onAssign={handleAssign} onRemove={handleRemove} onAssignTrainee={handleAssignTrainee} onRemoveTrainee={handleRemoveTrainee} color="blue" isLocked={schedule.isLocked} />}
                 {serviceStations.length > 0 && <StationGroup title="Serviço & Balcão" stations={serviceStations} schedule={schedule} selectedShift={selectedShift} employees={employees} onAssign={handleAssign} onRemove={handleRemove} onAssignTrainee={handleAssignTrainee} onRemoveTrainee={handleRemoveTrainee} color="blue" isLocked={schedule.isLocked} />}
             </div>
         )}
        {(beverageStations.length > 0 || mccafeStations.length > 0 || friesStations.length > 0) && (
            <div className="flex flex-col gap-4">
                {mccafeStations.length > 0 && <StationGroup title="McCafé" stations={mccafeStations} schedule={schedule} selectedShift={selectedShift} employees={employees} onAssign={handleAssign} onRemove={handleRemove} onAssignTrainee={handleAssignTrainee} onRemoveTrainee={handleRemoveTrainee} color="yellow" isLocked={schedule.isLocked} />}
                {beverageStations.length > 0 && <StationGroup title="Bebidas (Cell)" stations={beverageStations} schedule={schedule} selectedShift={selectedShift} employees={employees} onAssign={handleAssign} onRemove={handleRemove} onAssignTrainee={handleAssignTrainee} onRemoveTrainee={handleRemoveTrainee} color="purple" isLocked={schedule.isLocked} />}
                {friesStations.length > 0 && <StationGroup title="Batatas (Fries)" stations={friesStations} schedule={schedule} selectedShift={selectedShift} employees={employees} onAssign={handleAssign} onRemove={handleRemove} onAssignTrainee={handleAssignTrainee} onRemoveTrainee={handleRemoveTrainee} color="yellow" isLocked={schedule.isLocked} />}
            </div>
        )}
        {(deliveryStations.length > 0 || lobbyStations.length > 0) && (
             <div className="flex flex-col gap-4">
                {deliveryStations.length > 0 && <StationGroup title="Delivery" stations={deliveryStations} schedule={schedule} selectedShift={selectedShift} employees={employees} onAssign={handleAssign} onRemove={handleRemove} onAssignTrainee={handleAssignTrainee} onRemoveTrainee={handleRemoveTrainee} color="green" isLocked={schedule.isLocked} />}
                {lobbyStations.length > 0 && <StationGroup title="Sala (Lobby)" stations={lobbyStations} schedule={schedule} selectedShift={selectedShift} employees={employees} onAssign={handleAssign} onRemove={handleRemove} onAssignTrainee={handleAssignTrainee} onRemoveTrainee={handleRemoveTrainee} color="yellow" isLocked={schedule.isLocked} />}
             </div>
        )}
        {filteredStations.length === 0 && <div className="col-span-full py-12 text-center text-gray-400 bg-gray-50 border border-dashed border-gray-300 rounded-lg"><Filter size={48} className="mx-auto mb-4 opacity-20" /><p>Nenhum posto recomendado para o volume de vendas atual.</p><button onClick={() => setShowAllStations(true)} className="mt-2 text-blue-600 hover:underline font-bold">Mostrar todos os postos</button></div>}
      </div>
    </div>

    {/* ================= PRINT VIEW (VISUAL MAP) ================= */}
    <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-2 text-slate-800 overflow-visible min-h-screen">
        <div className="flex justify-between items-start mb-2 pb-1 border-b-2 border-slate-900">
            <div><h1 className="text-xl font-extrabold uppercase tracking-tight text-slate-900 mb-0 leading-none">{settings.restaurantName}</h1></div>
            <div className="text-right flex items-center gap-4"><div className="text-[10px] font-bold text-slate-700">{new Date(date).toLocaleDateString('pt-PT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div><div className="inline-block bg-slate-900 text-white px-2 py-0.5 rounded text-sm font-black uppercase">{getShiftLabel(selectedShift)}</div></div>
        </div>

        <div className="flex gap-2 mb-2">
            <div className="flex-1 bg-slate-100 rounded p-1.5 border border-slate-200 flex items-center justify-between"><div><span className="text-[8px] font-bold uppercase text-slate-400 block">Gerente</span><div className="font-bold text-xs leading-none truncate">{shiftManagerName}</div></div></div>
            <div className="flex-1 bg-slate-100 rounded p-1.5 border border-slate-200 flex items-center justify-between"><div><span className="text-[8px] font-bold uppercase text-slate-400 block">Previsão</span><div className="font-bold text-xs leading-none">{activeSalesData.totalSales} €</div></div></div>
            <div className="flex-1 bg-slate-100 rounded p-1.5 border border-slate-200 flex items-center justify-between"><div><span className="text-[8px] font-bold uppercase text-slate-400 block">Staff</span><div className="font-bold text-xs leading-none">{requirement.count}</div></div></div>
            <div className="flex-[2] bg-white border border-slate-200 rounded p-1.5 flex gap-2">
                 {(currentObjectives.turnObjective || currentObjectives.productionObjective) ? (
                    <>
                        {currentObjectives.turnObjective && <div className="flex-1 overflow-hidden"><span className="text-[8px] font-bold uppercase text-blue-500 mb-0 block">Obj. Turno</span><p className="text-[9px] font-medium leading-tight truncate">{currentObjectives.turnObjective}</p></div>}
                        {currentObjectives.productionObjective && <div className="flex-1 border-l border-slate-100 pl-2 overflow-hidden"><span className="text-[8px] font-bold uppercase text-orange-500 mb-0 block">Obj. Produção</span><p className="text-[9px] font-medium leading-tight truncate">{currentObjectives.productionObjective}</p></div>}
                    </>
                 ) : <span className="text-[9px] text-slate-400 italic flex items-center">Sem objetivos.</span>}
            </div>
        </div>

        <div className="grid grid-cols-12 gap-2 h-[85vh]">
            {driveStations.length > 0 && <div className="col-span-12 h-auto shrink-0"><VisualPrintZone title="Drive-Thru" icon={Car} stations={driveStations} schedule={schedule} selectedShift={selectedShift} employees={employees} className="bg-slate-50 border-slate-300" headerColor="text-slate-800" cols={driveStations.length || 1} /></div>}
            <div className="col-span-4 flex flex-col gap-2 h-full">
                {beverageStations.length > 0 && <div className="flex-1"><VisualPrintZone title="Bebidas" icon={CupSoda} stations={beverageStations} schedule={schedule} selectedShift={selectedShift} employees={employees} className="bg-purple-50 border-purple-200 h-full" headerColor="text-purple-800" cols={2} /></div>}
                {friesStations.length > 0 && <div className="flex-1"><VisualPrintZone title="Batatas" icon={UtensilsCrossed} stations={friesStations} schedule={schedule} selectedShift={selectedShift} employees={employees} className="bg-yellow-50 border-yellow-200 h-full" headerColor="text-yellow-700" cols={2} /></div>}
            </div>
            <div className="col-span-4 flex flex-col gap-2 h-full"><VisualPrintZone title="Cozinha (Produção)" icon={Flame} stations={kitchenStations} schedule={schedule} selectedShift={selectedShift} employees={employees} className="bg-red-50 border-red-200 h-full" headerColor="text-red-800" cols={2} /></div>
            <div className="col-span-4 grid grid-rows-2 gap-2 h-full">
                <div className="grid grid-cols-2 gap-2">
                     <VisualPrintZone title="Balcão (Serviço)" icon={Store} stations={serviceStations} schedule={schedule} selectedShift={selectedShift} employees={employees} className="bg-blue-50 border-blue-200 h-full" headerColor="text-blue-800" cols={2} />
                    {mccafeStations.length > 0 ? <VisualPrintZone title="McCafé" icon={Coffee} stations={mccafeStations} schedule={schedule} selectedShift={selectedShift} employees={employees} className="bg-amber-50 border-amber-200 h-full" headerColor="text-amber-900" cols={1} /> : <div />}
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {deliveryStations.length > 0 ? <VisualPrintZone title="Delivery" icon={Bike} stations={deliveryStations} schedule={schedule} selectedShift={selectedShift} employees={employees} className="bg-green-50 border-green-200 h-full" headerColor="text-green-800" cols={1} /> : <div className="border border-transparent" />}
                    {lobbyStations.length > 0 ? <VisualPrintZone title="Sala" icon={Users} stations={lobbyStations} schedule={schedule} selectedShift={selectedShift} employees={employees} className="bg-yellow-50 border-yellow-200 h-full" headerColor="text-yellow-800" cols={1} /> : <div />}
                </div>
            </div>
        </div>
        <div className="fixed bottom-0 left-0 w-full p-1 border-t border-slate-100 flex justify-between text-[8px] text-slate-400 bg-white"><span>TeamPos &bull; Documento de Gestão Interna</span></div>
    </div>
    </>
  );
};