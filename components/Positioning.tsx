import React, { useState, useEffect, useMemo } from 'react';
import { StaffingTableEntry, AppSettings, DailySchedule, Employee, HourlyProjection, ShiftType, StationAssignment, StationConfig } from '../types';
import { ROLE_COLORS, ROLE_LABELS, AVAILABLE_SHIFTS, STATIONS } from '../constants';
import { 
  Users, AlertCircle, X, 
  Bike, ShoppingBag, UtensilsCrossed, Monitor, Coffee, ChefHat, Flame, Sun, Moon, Sunrise, Store, MoonStar, 
  Car, CarFront, CupSoda, Headset, IceCream, HeartHandshake, Sandwich, Utensils, Thermometer, Droplets, ClipboardList, TrendingUp,
  Calculator, CheckCircle2, AlertTriangle, Smile, Calendar, UserCircle, Plus, Circle, Briefcase, Filter, Eye, EyeOff, Printer, Save, Lock, Unlock, Edit, Target, GraduationCap
} from 'lucide-react';

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
  const [showAllStations, setShowAllStations] = useState(false); // Toggle for filtering
  
  // Available shifts based on settings
  const availableShifts = settings.activeShifts;

  // Ensure current shift is valid
  useEffect(() => {
    if (!availableShifts.includes(selectedShift) && availableShifts.length > 0) {
      setSelectedShift(availableShifts[0]);
    }
  }, [availableShifts, selectedShift]);

  // --- Logic for Specific Shift Hours ---
  const targetHourLabels = useMemo(() => {
    if (selectedShift === 'FECHO' || selectedShift === 'MADRUGADA') {
        return ['19h-20h', '20h-21h'];
    }
    return ['12h-13h', '13h-14h'];
  }, [selectedShift]);

  // Get Data for those specific hours
  const shiftPeakData = useMemo(() => {
    if (!hourlyData) return [];
    return hourlyData.filter(d => targetHourLabels.includes(d.hour));
  }, [hourlyData, targetHourLabels]);

  // Set default manual peak hour when shift changes (default to max sales)
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

  // Determine Peak Sales based on manual selection or fallback to max
  const activeSalesData = useMemo(() => {
      if (!manualPeakHour || shiftPeakData.length === 0) return { totalSales: 0, hour: '' };
      return shiftPeakData.find(d => d.hour === manualPeakHour) || { totalSales: 0, hour: '' };
  }, [manualPeakHour, shiftPeakData]);

  // Helper to find required staff based on sales
  const getRequiredStaff = (sales: number): { count: number; label: string } => {
    if (!staffingTable || staffingTable.length === 0) return { count: 0, label: 'N/A' };
    
    // Find the range
    const match = staffingTable.find(row => sales >= row.minSales && sales <= row.maxSales);
    
    if (match) {
        return { count: match.staffCount, label: match.stationLabel };
    }

    // If sales > max of last row, use last row
    const lastRow = staffingTable[staffingTable.length - 1];
    if (sales > lastRow.maxSales) {
        return { count: lastRow.staffCount, label: lastRow.stationLabel };
    }

    return { count: 0, label: '0' };
  };

  const requirement = useMemo(() => getRequiredStaff(activeSalesData.totalSales), [activeSalesData, staffingTable]);

  // --- Current Assignment Stats ---
  const currentAssignedCount = useMemo(() => {
     // Only count from 'shifts', explicitly ignoring 'trainees'
     const shiftData: StationAssignment = schedule.shifts[selectedShift] || {};
     const uniqueIds = new Set<string>();
     Object.values(shiftData).forEach((ids) => {
        if (Array.isArray(ids)) {
           ids.forEach((id: string) => uniqueIds.add(id));
        }
     });
     return uniqueIds.size;
  }, [schedule, selectedShift]);

  const gap = requirement.count - currentAssignedCount;

  // --- Filter Stations Logic ---
  // Determine which stations should be visible based on staffing table
  const recommendedStationLabels = useMemo(() => {
    const sortedTable = [...staffingTable].sort((a, b) => a.staffCount - b.staffCount);
    const activeRows = sortedTable.filter(row => row.staffCount <= requirement.count);
    return new Set(activeRows.map(r => r.stationLabel));
  }, [staffingTable, requirement.count]);

  // --- Handlers ---
  const handleManagerChange = (empId: string) => {
      if (schedule.isLocked) return;
      const currentManagers = schedule.shiftManagers || {};
      setSchedule({
          ...schedule,
          shiftManagers: {
              ...currentManagers,
              [selectedShift]: empId
          }
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
              [selectedShift]: {
                  ...shiftObjs,
                  [field]: value
              }
          }
      });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveAndLock = () => {
      const lockedSchedule = { ...schedule, isLocked: true };
      onSaveSchedule(lockedSchedule);
  };

  const handleUnlock = () => {
      const unlockedSchedule = { ...schedule, isLocked: false };
      onSaveSchedule(unlockedSchedule);
  };

  const getShiftIcon = (id: ShiftType) => {
    switch(id) {
      case 'ABERTURA': return <Sunrise size={18} />;
      case 'INTERMEDIO': return <Sun size={18} />;
      case 'FECHO': return <MoonStar size={18} />;
      default: return <Store size={18} />;
    }
  };

  const getShiftLabel = (id: ShiftType) => {
      return AVAILABLE_SHIFTS.find(s => s.id === id)?.label || id;
  };

  // --- Dynamic Stations Logic ---
  const allStations = settings.customStations || STATIONS;

  const filteredStations = useMemo(() => {
    return allStations.filter(s => {
        if (!s.isActive) return false;
        if (showAllStations) return true;
        
        // Show if assigned (Staff OR Trainee)
        const assigned = schedule.shifts[selectedShift]?.[s.id];
        const assignedTrainees = schedule.trainees?.[selectedShift]?.[s.id];
        
        if ((assigned && assigned.length > 0) || (assignedTrainees && assignedTrainees.length > 0)) return true;

        return recommendedStationLabels.has(s.label);
    });
  }, [allStations, showAllStations, recommendedStationLabels, schedule.shifts, schedule.trainees, selectedShift]);

  const serviceStations = filteredStations.filter(s => s.area === 'service');
  const kitchenStations = filteredStations.filter(s => s.area === 'kitchen');
  const deliveryStations = filteredStations.filter(s => s.area === 'delivery');
  const beverageStations = filteredStations.filter(s => s.area === 'beverage');
  const lobbyStations = filteredStations.filter(s => s.area === 'lobby');

  // --- Assignment Handlers (Staff) ---
  const handleAssign = (stationId: string, employeeId: string) => {
     if (schedule.isLocked) return;
     if(!employeeId) return;
     const currentShift = schedule.shifts[selectedShift] || {};
     const currentAssigned = currentShift[stationId] || [];
     if (currentAssigned.includes(employeeId)) return;

     const newShift = { ...currentShift };
     // Remove from other stations (1 person = 1 station logic for staff)
     Object.keys(newShift).forEach(key => {
        newShift[key] = newShift[key].filter(id => id !== employeeId);
     });
     newShift[stationId] = [...(newShift[stationId] || []), employeeId];

     setSchedule({
        ...schedule,
        shifts: { ...schedule.shifts, [selectedShift]: newShift }
     });
  };

  const handleRemove = (stationId: string, employeeId: string) => {
    if (schedule.isLocked) return;
    const currentShift = schedule.shifts[selectedShift] || {};
    const currentAssigned = currentShift[stationId] || [];
    setSchedule({
        ...schedule,
        shifts: {
            ...schedule.shifts,
            [selectedShift]: {
                ...currentShift,
                [stationId]: currentAssigned.filter(id => id !== employeeId)
            }
        }
     });
  };

  // --- Assignment Handlers (Trainees) ---
  const handleAssignTrainee = (stationId: string, employeeId: string) => {
     if (schedule.isLocked) return;
     if(!employeeId) return;
     
     const currentTrainees = schedule.trainees || {};
     const currentShiftTrainees = currentTrainees[selectedShift] || {};
     const currentAssigned = currentShiftTrainees[stationId] || [];
     
     if (currentAssigned.includes(employeeId)) return;

     const newShiftTrainees = { ...currentShiftTrainees };
     
     // Optional: Remove trainee from other stations in this shift? 
     // Usually yes, a trainee is in one place.
     Object.keys(newShiftTrainees).forEach(key => {
        newShiftTrainees[key] = newShiftTrainees[key].filter(id => id !== employeeId);
     });

     newShiftTrainees[stationId] = [...(newShiftTrainees[stationId] || []), employeeId];

     setSchedule({
        ...schedule,
        trainees: { ...currentTrainees, [selectedShift]: newShiftTrainees }
     });
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
            [selectedShift]: {
                ...currentShiftTrainees,
                [stationId]: currentAssigned.filter(id => id !== employeeId)
            }
        }
     });
  };


  const shiftManagerName = useMemo(() => {
      const id = schedule.shiftManagers?.[selectedShift];
      return employees.find(e => e.id === id)?.name || 'Não atribuído';
  }, [schedule.shiftManagers, selectedShift, employees]);

  // Current Objectives
  const currentObjectives = schedule.shiftObjectives?.[selectedShift] || {};

  return (
    <>
    {/* Screen View */}
    <div className="flex flex-col h-full space-y-4 animate-fade-in print:hidden">
      
      {/* 0. Header with Date and Manager */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Calendar size={20} />
              </div>
              <div>
                  <p className="text-xs text-gray-500 font-bold uppercase">Data</p>
                  <input 
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="text-lg font-bold text-gray-800 bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none pb-0.5"
                  />
              </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                  <UserCircle size={20} />
              </div>
              <div className="flex-1">
                  <p className="text-xs text-gray-500 font-bold uppercase">Gerente de Turno</p>
                  <select 
                    value={schedule.shiftManagers?.[selectedShift] || ''}
                    onChange={(e) => handleManagerChange(e.target.value)}
                    disabled={schedule.isLocked}
                    className={`
                        w-full md:w-64 mt-1 p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none
                        ${schedule.isLocked ? 'opacity-70 cursor-not-allowed bg-gray-100' : ''}
                    `}
                  >
                      <option value="">Selecione o Gerente...</option>
                      {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>
                              {emp.name} {emp.role === 'GERENTE' ? '★' : ''}
                          </option>
                      ))}
                  </select>
              </div>
          </div>
      </div>

      {/* 1. Shift Selector */}
      <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-200 flex gap-2 overflow-x-auto">
        {availableShifts.map(shift => (
          <button
            key={shift}
            onClick={() => setSelectedShift(shift)}
            className={`
              flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-medium transition-all whitespace-nowrap
              ${selectedShift === shift 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'bg-transparent text-gray-500 hover:bg-gray-50'}
            `}
          >
            {getShiftIcon(shift)}
            {AVAILABLE_SHIFTS.find(s => s.id === shift)?.label || shift}
          </button>
        ))}
      </div>

      {/* Locked Status Banner */}
      {schedule.isLocked && (
          <div className="bg-gray-800 text-white px-4 py-3 rounded-xl flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                  <Lock size={20} className="text-yellow-400" />
                  <div>
                      <h4 className="font-bold text-sm">Posicionamento Finalizado</h4>
                      <p className="text-xs text-gray-400">Modo de leitura ativo. Desbloqueie para editar.</p>
                  </div>
              </div>
              <button 
                onClick={handleUnlock}
                className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
              >
                  <Unlock size={14} /> Editar
              </button>
          </div>
      )}

      {/* 2. Dashboard Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              {/* Left: Forecast Data */}
              <div className="lg:col-span-5 border-r border-gray-100 pr-4">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <TrendingUp size={16} />
                      Previsão de Vendas
                  </h3>
                  
                  {shiftPeakData.length > 0 ? (
                      <div className="space-y-3">
                          {shiftPeakData.map((data, idx) => {
                              const isActive = manualPeakHour === data.hour;
                              return (
                                <button 
                                    key={idx} 
                                    onClick={() => setManualPeakHour(data.hour)}
                                    className={`
                                        w-full flex justify-between items-center p-3 rounded-lg border transition-all cursor-pointer relative overflow-hidden
                                        ${isActive 
                                            ? 'bg-blue-50 border-blue-500 shadow-sm' 
                                            : 'bg-white border-gray-100 hover:border-blue-200 hover:bg-gray-50'}
                                    `}
                                >
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
                      <div className="p-4 text-center bg-yellow-50 text-yellow-700 rounded-lg text-sm flex items-center gap-2 justify-center">
                          <AlertCircle size={16} />
                          Sem dados de previsão.
                      </div>
                  )}
              </div>

              {/* Right: Staffing KPIs */}
              <div className="lg:col-span-7 pl-2">
                  <div className="grid grid-cols-3 gap-4">
                      
                      {/* Necessários */}
                      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 flex flex-col items-center justify-center text-center relative overflow-hidden">
                          <span className="text-xs font-bold text-blue-400 uppercase mb-1">Necessários</span>
                          <div className="flex items-center gap-2">
                             <Calculator className="text-blue-500" size={20} />
                             <span className="text-3xl font-extrabold text-blue-700">{requirement.count}</span>
                          </div>
                      </div>

                      {/* Posicionados */}
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex flex-col items-center justify-center text-center">
                          <span className="text-xs font-bold text-gray-400 uppercase mb-1">Posicionados</span>
                          <div className="flex items-center gap-2">
                             <Users className="text-gray-500" size={20} />
                             <span className="text-3xl font-extrabold text-gray-700">{currentAssignedCount}</span>
                          </div>
                      </div>

                      {/* Diferença */}
                      <div className={`
                          rounded-xl p-4 border flex flex-col items-center justify-center text-center
                          ${gap > 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}
                      `}>
                          <span className={`text-xs font-bold uppercase mb-1 ${gap > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                             Diferença
                          </span>
                          <div className="flex items-center gap-2">
                             {gap > 0 ? <AlertTriangle className="text-red-500" size={20} /> : <CheckCircle2 className="text-emerald-500" size={20} />}
                             <span className={`text-3xl font-extrabold ${gap > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                {gap > 0 ? `-${gap}` : 'OK'}
                             </span>
                          </div>
                      </div>

                  </div>
              </div>
          </div>
      </div>

      {/* 3. Objectives & Targets Section (New) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
             <div className="flex items-center gap-2 mb-2 text-blue-800 font-bold text-sm">
                <Target size={16} />
                Objetivo de Turno
             </div>
             <textarea
                value={currentObjectives.turnObjective || ''}
                onChange={(e) => handleObjectiveChange('turnObjective', e.target.value)}
                placeholder="Ex: Focar na rapidez do Drive..."
                disabled={schedule.isLocked}
                className="w-full text-sm p-3 bg-blue-50/30 border border-blue-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none h-20 placeholder:text-gray-400 disabled:opacity-70 disabled:bg-gray-50"
             />
         </div>
         <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
             <div className="flex items-center gap-2 mb-2 text-orange-800 font-bold text-sm">
                <Flame size={16} />
                Objetivo de Produção
             </div>
             <textarea
                value={currentObjectives.productionObjective || ''}
                onChange={(e) => handleObjectiveChange('productionObjective', e.target.value)}
                placeholder="Ex: Manter tempos de KVS abaixo de 40s..."
                disabled={schedule.isLocked}
                className="w-full text-sm p-3 bg-orange-50/30 border border-orange-100 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none resize-none h-20 placeholder:text-gray-400 disabled:opacity-70 disabled:bg-gray-50"
             />
         </div>
      </div>

      {/* 4. Station Grid Controls */}
      <div className="flex justify-between items-center pt-2 px-1">
          <h3 className="font-bold text-gray-700 flex items-center gap-2">
              <Briefcase size={20} />
              Postos de Trabalho
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                  {filteredStations.length} Visíveis
              </span>
          </h3>
          <div className="flex items-center gap-3">
              {/* Action Buttons */}
              <div className="flex gap-2">
                {!schedule.isLocked && (
                    <button
                        onClick={handleSaveAndLock}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                    >
                        <Save size={16} /> Finalizar
                    </button>
                )}
                {schedule.isLocked && (
                    <button
                        onClick={handleUnlock}
                        className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white text-sm font-medium rounded-lg hover:bg-yellow-600 transition-colors shadow-sm"
                    >
                        <Edit size={16} /> Editar
                    </button>
                )}
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors shadow-sm"
                >
                    <Printer size={16} /> Imprimir
                </button>
              </div>

              <div className="h-6 w-px bg-gray-300 mx-1"></div>
              <span className="text-xs font-medium text-gray-500">
                  {showAllStations ? 'Mostrar todos' : `Sugestão (${requirement.count})`}
              </span>
              <button 
                onClick={() => setShowAllStations(!showAllStations)}
                className={`
                    relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                    ${showAllStations ? 'bg-blue-600' : 'bg-gray-300'}
                `}
              >
                <span 
                    className={`
                        inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                        ${showAllStations ? 'translate-x-6' : 'translate-x-1'}
                    `} 
                />
              </button>
          </div>
      </div>

      {/* 5. Station Grid (Grouped by Area) */}
      <div className="flex-1 overflow-auto grid grid-cols-1 xl:grid-cols-3 gap-6 pb-20">
         
         {kitchenStations.length > 0 && (
             <div className="flex flex-col gap-6">
                <StationGroup 
                    title="Produção (Cozinha)" 
                    stations={kitchenStations} 
                    schedule={schedule}
                    selectedShift={selectedShift}
                    employees={employees}
                    onAssign={handleAssign}
                    onRemove={handleRemove}
                    onAssignTrainee={handleAssignTrainee}
                    onRemoveTrainee={handleRemoveTrainee}
                    color="red"
                    isLocked={schedule.isLocked}
                />
             </div>
         )}

         {(beverageStations.length > 0 || serviceStations.length > 0) && (
             <div className="flex flex-col gap-6">
                 {beverageStations.length > 0 && (
                     <StationGroup 
                        title="Bebidas & Sobremesas" 
                        stations={beverageStations} 
                        schedule={schedule}
                        selectedShift={selectedShift}
                        employees={employees}
                        onAssign={handleAssign}
                        onRemove={handleRemove}
                        onAssignTrainee={handleAssignTrainee}
                        onRemoveTrainee={handleRemoveTrainee}
                        color="purple"
                        isLocked={schedule.isLocked}
                    />
                 )}
                 
                 {serviceStations.length > 0 && (
                     <StationGroup 
                        title="Serviço & Balcão" 
                        stations={serviceStations} 
                        schedule={schedule}
                        selectedShift={selectedShift}
                        employees={employees}
                        onAssign={handleAssign}
                        onRemove={handleRemove}
                        onAssignTrainee={handleAssignTrainee}
                        onRemoveTrainee={handleRemoveTrainee}
                        color="blue"
                        isLocked={schedule.isLocked}
                    />
                 )}
             </div>
         )}

        {(deliveryStations.length > 0 || lobbyStations.length > 0) && (
            <div className="flex flex-col gap-6">
                {deliveryStations.length > 0 && (
                    <StationGroup 
                        title="Delivery" 
                        stations={deliveryStations} 
                        schedule={schedule}
                        selectedShift={selectedShift}
                        employees={employees}
                        onAssign={handleAssign}
                        onRemove={handleRemove}
                        onAssignTrainee={handleAssignTrainee}
                        onRemoveTrainee={handleRemoveTrainee}
                        color="green"
                        isLocked={schedule.isLocked}
                    />
                )}

                {lobbyStations.length > 0 && (
                    <StationGroup 
                        title="Sala (Lobby)" 
                        stations={lobbyStations} 
                        schedule={schedule}
                        selectedShift={selectedShift}
                        employees={employees}
                        onAssign={handleAssign}
                        onRemove={handleRemove}
                        onAssignTrainee={handleAssignTrainee}
                        onRemoveTrainee={handleRemoveTrainee}
                        color="yellow"
                        isLocked={schedule.isLocked}
                    />
                )}
            </div>
        )}
        
        {filteredStations.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-400 bg-gray-50 border border-dashed border-gray-300 rounded-lg">
                <Filter size={48} className="mx-auto mb-4 opacity-20" />
                <p>Nenhum posto recomendado para o volume de vendas atual.</p>
                <button 
                    onClick={() => setShowAllStations(true)}
                    className="mt-2 text-blue-600 hover:underline font-bold"
                >
                    Mostrar todos os postos
                </button>
            </div>
        )}
      </div>
    </div>

    {/* ================= PRINT VIEW (VISUAL MAP) ================= */}
    <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-4 text-slate-800 overflow-hidden">
        
        {/* Print Header */}
        <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-slate-900">
            <div>
                <h1 className="text-3xl font-extrabold uppercase tracking-tight text-slate-900 mb-1">{settings.restaurantName}</h1>
                <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Mapa de Posicionamento Operacional</p>
            </div>
            <div className="text-right">
                <div className="inline-block bg-slate-900 text-white px-4 py-1 rounded-full text-2xl font-black uppercase mb-2">{getShiftLabel(selectedShift)}</div>
                <div className="text-lg font-bold text-slate-700">{new Date(date).toLocaleDateString('pt-PT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
        </div>

        {/* Top Stats Bar */}
        <div className="flex gap-4 mb-6">
            <div className="flex-1 bg-slate-100 rounded-xl p-3 border border-slate-200 flex items-center justify-between">
                 <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Gerente Turno</span>
                    <div className="font-bold text-lg leading-none">{shiftManagerName}</div>
                 </div>
                 <UserCircle className="text-slate-300" size={24} />
            </div>
            <div className="flex-1 bg-slate-100 rounded-xl p-3 border border-slate-200 flex items-center justify-between">
                 <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Previsão</span>
                    <div className="font-bold text-lg leading-none">{activeSalesData.totalSales} €</div>
                 </div>
                 <TrendingUp className="text-slate-300" size={24} />
            </div>
            <div className="flex-1 bg-slate-100 rounded-xl p-3 border border-slate-200 flex items-center justify-between">
                 <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Staff Necessário</span>
                    <div className="font-bold text-lg leading-none">{requirement.count}</div>
                 </div>
                 <Calculator className="text-slate-300" size={24} />
            </div>
            <div className="flex-[2] bg-white border-2 border-slate-200 rounded-xl p-3 flex gap-4">
                 {(currentObjectives.turnObjective || currentObjectives.productionObjective) ? (
                    <>
                        {currentObjectives.turnObjective && (
                            <div className="flex-1">
                                <span className="text-[10px] font-bold uppercase text-blue-500 mb-1 block">Obj. Turno</span>
                                <p className="text-xs font-medium leading-tight">{currentObjectives.turnObjective}</p>
                            </div>
                        )}
                        {currentObjectives.productionObjective && (
                             <div className="flex-1 border-l border-slate-100 pl-4">
                                <span className="text-[10px] font-bold uppercase text-orange-500 mb-1 block">Obj. Produção</span>
                                <p className="text-xs font-medium leading-tight">{currentObjectives.productionObjective}</p>
                            </div>
                        )}
                    </>
                 ) : (
                    <span className="text-xs text-slate-400 italic flex items-center">Sem objetivos definidos.</span>
                 )}
            </div>
        </div>

        {/* Visual Map Layout */}
        <div className="flex-1 grid grid-cols-12 gap-6 h-[75vh]">
            
            {/* COLUMN 1: SERVICE SUPPORT (Beverage, Drive, Counter) */}
            <div className="col-span-4 flex flex-col gap-6">
                
                {/* Beverage */}
                {beverageStations.length > 0 && (
                    <VisualPrintZone 
                        title="Bebidas & Sobremesas" 
                        icon={CupSoda} 
                        stations={beverageStations} 
                        schedule={schedule} 
                        selectedShift={selectedShift} 
                        employees={employees}
                        className="bg-purple-50 border-purple-200"
                        headerColor="text-purple-800"
                    />
                )}

                {/* Service / Counter */}
                <VisualPrintZone 
                    title="Balcão & Drive" 
                    icon={Store} 
                    stations={serviceStations} 
                    schedule={schedule} 
                    selectedShift={selectedShift} 
                    employees={employees}
                    className="bg-blue-50 border-blue-200 flex-1"
                    headerColor="text-blue-800"
                />

            </div>

            {/* COLUMN 2: PRODUCTION (Kitchen) - Center Stage */}
            <div className="col-span-5 flex flex-col">
                 <VisualPrintZone 
                    title="Cozinha (Produção)" 
                    icon={Flame} 
                    stations={kitchenStations} 
                    schedule={schedule} 
                    selectedShift={selectedShift} 
                    employees={employees}
                    className="bg-red-50 border-red-200 h-full"
                    headerColor="text-red-800"
                    stationClassName="w-full" // Make stations wide in kitchen
                />
            </div>

            {/* COLUMN 3: EXTENSIONS (Delivery, Lobby) */}
            <div className="col-span-3 flex flex-col gap-6">
                
                {/* Delivery */}
                {deliveryStations.length > 0 && (
                     <VisualPrintZone 
                        title="Delivery" 
                        icon={Bike} 
                        stations={deliveryStations} 
                        schedule={schedule} 
                        selectedShift={selectedShift} 
                        employees={employees}
                        className="bg-green-50 border-green-200"
                        headerColor="text-green-800"
                    />
                )}

                {/* Lobby */}
                {lobbyStations.length > 0 && (
                     <VisualPrintZone 
                        title="Sala (Lobby)" 
                        icon={Users} 
                        stations={lobbyStations} 
                        schedule={schedule} 
                        selectedShift={selectedShift} 
                        employees={employees}
                        className="bg-yellow-50 border-yellow-200 flex-1"
                        headerColor="text-yellow-800"
                    />
                )}
            </div>

        </div>

        <div className="fixed bottom-0 left-0 w-full p-4 border-t border-slate-100 flex justify-between text-[10px] text-slate-400 bg-white">
            <span>TeamPos &bull; Documento de Gestão Interna</span>
            <span>Impresso a {new Date().toLocaleString('pt-PT')}</span>
        </div>
    </div>
    </>
  );
};

// --- Sub-components ---

const StationGroup = ({ title, stations, schedule, selectedShift, employees, onAssign, onRemove, onAssignTrainee, onRemoveTrainee, color, isLocked }: any) => {
    const borderColor = {
        red: 'border-l-red-500',
        blue: 'border-l-blue-500',
        green: 'border-l-green-500',
        purple: 'border-l-purple-500',
        yellow: 'border-l-yellow-500'
    }[color as string] || 'border-l-gray-500';

    const headerColor = {
        red: 'text-red-700 bg-red-50',
        blue: 'text-blue-700 bg-blue-50',
        green: 'text-green-700 bg-green-50',
        purple: 'text-purple-700 bg-purple-50',
        yellow: 'text-yellow-700 bg-yellow-50'
    }[color as string] || 'text-gray-700';

    return (
        <div className="space-y-3">
            <h4 className={`font-bold uppercase text-xs tracking-wider flex items-center gap-2 pl-2 py-1 rounded ${headerColor}`}>
                {title}
                <span className="bg-white/50 px-1.5 py-0.5 rounded-full text-[10px] border border-black/5">{stations.length}</span>
            </h4>
            <div className="grid grid-cols-1 gap-3">
                {stations.map((station: StationConfig) => (
                    <StationCard 
                        key={station.id}
                        station={station}
                        schedule={schedule}
                        selectedShift={selectedShift}
                        employees={employees}
                        onAssign={onAssign}
                        onRemove={onRemove}
                        onAssignTrainee={onAssignTrainee}
                        onRemoveTrainee={onRemoveTrainee}
                        borderColor={borderColor}
                        isLocked={isLocked}
                    />
                ))}
            </div>
        </div>
    );
};

const StationCard = ({ station, schedule, selectedShift, employees, onAssign, onRemove, onAssignTrainee, onRemoveTrainee, borderColor, isLocked }: any) => {
    const [isSelecting, setIsSelecting] = useState(false);
    const [isSelectingTrainee, setIsSelectingTrainee] = useState(false);
    
    // Normal Staff
    const assignedIds = (schedule.shifts[selectedShift]?.[station.id] || []) as string[];
    const assignedEmployees = assignedIds
        .map(id => employees.find((e: Employee) => e.id === id))
        .filter(Boolean);

    // Trainees
    const traineeIds = (schedule.trainees?.[selectedShift]?.[station.id] || []) as string[];
    const traineeEmployees = traineeIds
        .map(id => employees.find((e: Employee) => e.id === id))
        .filter(Boolean);

    const Icon = StationIcon(station.icon);
    
    // Get available employees (not assigned anywhere in this shift)
    const availableEmployees = useMemo(() => {
        const shiftData = schedule.shifts[selectedShift] || {};
        const traineesData = schedule.trainees?.[selectedShift] || {};
        
        const allAssignedIds = [
            ...Object.values(shiftData).flat(),
            ...Object.values(traineesData).flat()
        ];
        
        return employees.filter((e: Employee) => !allAssignedIds.includes(e.id));
    }, [schedule, selectedShift, employees]);

    const isFull = assignedEmployees.length >= station.defaultSlots;

    const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (val) {
            onAssign(station.id, val);
            setIsSelecting(false);
        }
    };

    const handleSelectTrainee = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (val) {
            onAssignTrainee(station.id, val);
            setIsSelectingTrainee(false);
        }
    };

    return (
        <div className={`
            bg-white rounded-lg border border-gray-200 shadow-sm border-l-4 ${borderColor} p-3 animate-scale-up
            ${isLocked ? 'bg-opacity-50' : ''}
        `}>
             <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2 text-gray-700">
                    <div className={`p-1.5 bg-gray-50 rounded text-gray-500 ${isLocked ? 'opacity-50' : ''}`}>
                        <Icon size={16} />
                    </div>
                    <div className="flex flex-col">
                        <span className={`font-semibold text-sm leading-tight ${isLocked ? 'text-gray-600' : ''}`}>{station.label}</span>
                        {station.designation && <span className="text-[10px] text-gray-400 font-mono">{station.designation}</span>}
                    </div>
                </div>
                <span className="text-xs text-gray-400 font-medium">{assignedEmployees.length}/{station.defaultSlots}</span>
            </div>

            <div className="space-y-2">
                {/* Assigned List */}
                <div className="flex flex-wrap gap-2">
                    {/* Normal Staff */}
                    {assignedEmployees.map((emp: Employee) => (
                         <div key={emp.id} className={`flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs border border-slate-200 ${isLocked ? 'opacity-80' : ''}`}>
                             <div className={`w-1.5 h-1.5 rounded-full ${ROLE_COLORS[emp.role].split(' ')[0]}`}></div>
                             <span className="font-medium max-w-[80px] truncate">{emp.name}</span>
                             {!isLocked && (
                                <button onClick={() => onRemove(station.id, emp.id)} className="text-slate-400 hover:text-red-500 ml-1"><X size={12}/></button>
                             )}
                         </div>
                    ))}
                    
                    {/* Trainees */}
                    {traineeEmployees.map((emp: Employee) => (
                         <div key={emp.id} className={`flex items-center gap-1 bg-orange-50 text-orange-800 px-2 py-1 rounded text-xs border border-orange-200 ${isLocked ? 'opacity-80' : ''}`}>
                             <GraduationCap size={10} className="text-orange-600"/>
                             <span className="font-medium max-w-[80px] truncate">{emp.name}</span>
                             {!isLocked && (
                                <button onClick={() => onRemoveTrainee(station.id, emp.id)} className="text-orange-400 hover:text-red-500 ml-1"><X size={12}/></button>
                             )}
                         </div>
                    ))}
                </div>

                {/* Add Actions */}
                {!isLocked && (
                    <div className="flex gap-2 mt-2">
                        {/* Add Staff */}
                        {!isFull && (
                            <div className="flex-1">
                                {isSelecting ? (
                                    <select 
                                        autoFocus
                                        onBlur={() => setIsSelecting(false)}
                                        onChange={handleSelect}
                                        className="w-full text-xs p-1.5 border border-blue-300 rounded bg-blue-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        defaultValue=""
                                    >
                                        <option value="" disabled>Selecione...</option>
                                        {availableEmployees.length === 0 && <option disabled>Sem staff disponível</option>}
                                        {availableEmployees.map((emp: Employee) => (
                                            <option key={emp.id} value={emp.id}>{emp.name} ({ROLE_LABELS[emp.role]})</option>
                                        ))}
                                    </select>
                                ) : (
                                    <button 
                                        onClick={() => { setIsSelecting(true); setIsSelectingTrainee(false); }}
                                        className="w-full py-1 border border-dashed border-gray-300 rounded-lg text-gray-400 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-colors flex items-center justify-center gap-1"
                                        title="Adicionar Colaborador"
                                    >
                                        <Plus size={14} />
                                    </button>
                                )}
                            </div>
                        )}
                        
                        {/* Add Trainee */}
                        <div className={`${isFull ? 'w-full' : 'w-auto'}`}>
                             {isSelectingTrainee ? (
                                    <select 
                                        autoFocus
                                        onBlur={() => setIsSelectingTrainee(false)}
                                        onChange={handleSelectTrainee}
                                        className="w-full text-xs p-1.5 border border-orange-300 rounded bg-orange-50 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                        defaultValue=""
                                    >
                                        <option value="" disabled>Selecione Formando...</option>
                                        {availableEmployees.length === 0 && <option disabled>Sem staff disponível</option>}
                                        {availableEmployees.map((emp: Employee) => (
                                            <option key={emp.id} value={emp.id}>{emp.name}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <button 
                                        onClick={() => { setIsSelectingTrainee(true); setIsSelecting(false); }}
                                        className={`py-1 ${isFull ? 'w-full' : 'px-3'} border border-dashed border-orange-200 rounded-lg text-orange-300 hover:text-orange-600 hover:border-orange-400 hover:bg-orange-50 transition-colors flex items-center justify-center gap-1`}
                                        title="Adicionar Formando (Não conta para o staff)"
                                    >
                                        <GraduationCap size={14} />
                                    </button>
                                )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Visual Print Components ---

const VisualPrintZone = ({ title, icon: Icon, stations, schedule, selectedShift, employees, className, headerColor, stationClassName }: any) => (
    <div className={`rounded-3xl border-4 p-4 flex flex-col gap-4 ${className}`}>
        <div className="flex items-center gap-3 border-b-2 border-black/5 pb-2">
            <div className={`p-2 bg-white rounded-full shadow-sm`}>
                <Icon size={20} className={headerColor} />
            </div>
            <h3 className={`font-black uppercase tracking-wider text-sm ${headerColor}`}>{title}</h3>
        </div>
        <div className="flex flex-wrap gap-3">
            {stations.map((s: StationConfig) => (
                <VisualPrintStation 
                    key={s.id} 
                    station={s} 
                    schedule={schedule} 
                    selectedShift={selectedShift} 
                    employees={employees} 
                    className={stationClassName}
                />
            ))}
        </div>
    </div>
);

const VisualPrintStation = ({ station, schedule, selectedShift, employees, className }: any) => {
    const assignedIds = (schedule.shifts[selectedShift]?.[station.id] || []) as string[];
    const assignedEmployees = assignedIds
        .map(id => employees.find((e: Employee) => e.id === id))
        .filter(Boolean);

    const traineeIds = (schedule.trainees?.[selectedShift]?.[station.id] || []) as string[];
    const traineeEmployees = traineeIds
        .map(id => employees.find((e: Employee) => e.id === id))
        .filter(Boolean);

    const hasStaff = assignedEmployees.length > 0 || traineeEmployees.length > 0;

    return (
        <div className={`
            relative bg-white border-2 border-slate-300 rounded-2xl p-2 min-w-[140px] shadow-sm flex-1
            ${hasStaff ? 'border-slate-800' : ''}
            ${className}
        `}>
            {/* Station Label */}
            <div className="absolute -top-3 left-3 bg-white px-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 border border-slate-200 rounded-md">
                {station.designation || station.label}
            </div>

            <div className="mt-2 flex flex-col gap-1 min-h-[30px] justify-center">
                 {assignedEmployees.map((emp: Employee) => (
                     <div key={emp.id} className="flex items-center gap-2 bg-slate-100 rounded-lg px-2 py-1">
                         <div className={`w-2 h-2 rounded-full ${ROLE_COLORS[emp.role].split(' ')[0]}`}></div>
                         <span className="font-bold text-sm text-slate-900 truncate">{emp.name}</span>
                     </div>
                 ))}
                 
                 {traineeEmployees.map((emp: Employee) => (
                     <div key={emp.id} className="flex items-center gap-2 bg-orange-50 border border-orange-100 rounded-lg px-2 py-1">
                         <GraduationCap size={12} className="text-orange-500"/>
                         <span className="font-bold text-sm text-orange-700 truncate">{emp.name}</span>
                     </div>
                 ))}

                 {!hasStaff && (
                     <div className="text-center text-slate-300 text-xs py-1">
                         Vazio
                     </div>
                 )}
            </div>
        </div>
    );
};

// Helper for dynamic icons
const StationIcon = (iconName: string) => {
    const icons: any = { 
        Users, Headset, Car, CarFront, ShoppingBag, CupSoda, Monitor, Smile, IceCream, 
        Bike, HeartHandshake, Coffee, ChefHat, Sandwich, Utensils, Flame, Thermometer, 
        UtensilsCrossed, ClipboardList, Droplets, CheckCircle2, UserCircle, Circle, Briefcase 
    };
    return icons[iconName] || Circle;
};