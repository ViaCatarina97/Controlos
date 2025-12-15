import React, { useState, useEffect, useMemo } from 'react';
import { StaffingTableEntry, AppSettings, DailySchedule, Employee, HourlyProjection, ShiftType, StationAssignment, StationConfig } from '../types';
import { ROLE_COLORS, ROLE_LABELS, AVAILABLE_SHIFTS, STATIONS } from '../constants';
import { 
  Users, AlertCircle, X, 
  Bike, ShoppingBag, UtensilsCrossed, Monitor, Coffee, ChefHat, Flame, Sun, Moon, Sunrise, Store, MoonStar, 
  Car, CarFront, CupSoda, Headset, IceCream, HeartHandshake, Sandwich, Utensils, Thermometer, Droplets, ClipboardList, TrendingUp,
  Calculator, CheckCircle2, AlertTriangle, Smile, Calendar, UserCircle, Plus, Circle, Briefcase, Filter, Eye, EyeOff, Printer
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
}

export const Positioning: React.FC<PositioningProps> = ({ 
  date, 
  setDate,
  employees, 
  staffingTable,
  schedule, 
  setSchedule,
  settings,
  hourlyData 
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
    // 1. Sort table by staff count (ascending) to mimic priority order
    // We assume the staffing table defines the "order of appearance"
    const sortedTable = [...staffingTable].sort((a, b) => a.staffCount - b.staffCount);
    
    // 2. Filter rows where the staff count is less than or equal to the requirement
    // Example: If 9 people needed, we show all stations associated with count 1 to 9.
    const activeRows = sortedTable.filter(row => row.staffCount <= requirement.count);
    
    // 3. Extract station labels into a Set for fast lookup
    return new Set(activeRows.map(r => r.stationLabel));
  }, [staffingTable, requirement.count]);

  // --- Handlers ---
  const handleManagerChange = (empId: string) => {
      const currentManagers = schedule.shiftManagers || {};
      setSchedule({
          ...schedule,
          shiftManagers: {
              ...currentManagers,
              [selectedShift]: empId
          }
      });
  };

  const handlePrint = () => {
    window.print();
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
  // Use settings.customStations if available, otherwise fallback to STATIONS constant
  const allStations = settings.customStations || STATIONS;

  // Filter stations based on ACTIVE status AND Sales Requirement
  const filteredStations = useMemo(() => {
    return allStations.filter(s => {
        // 1. Must be active in settings
        if (!s.isActive) return false;

        // 2. If "Show All" is on, show everything active
        if (showAllStations) return true;

        // 3. Always show if someone is currently assigned (don't hide assigned staff!)
        const assigned = schedule.shifts[selectedShift]?.[s.id];
        if (assigned && assigned.length > 0) return true;

        // 4. Check if it's in the recommended list
        return recommendedStationLabels.has(s.label);
    });
  }, [allStations, showAllStations, recommendedStationLabels, schedule.shifts, selectedShift]);

  const serviceStations = filteredStations.filter(s => s.area === 'service');
  const kitchenStations = filteredStations.filter(s => s.area === 'kitchen');
  const deliveryStations = filteredStations.filter(s => s.area === 'delivery');
  const beverageStations = filteredStations.filter(s => s.area === 'beverage');
  const lobbyStations = filteredStations.filter(s => s.area === 'lobby');

  const handleAssign = (stationId: string, employeeId: string) => {
     if(!employeeId) return;
     const currentShift = schedule.shifts[selectedShift] || {};
     const currentAssigned = currentShift[stationId] || [];
     if (currentAssigned.includes(employeeId)) return;

     const newShift = { ...currentShift };
     // Remove from other stations (1 person = 1 station logic)
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

  const shiftManagerName = useMemo(() => {
      const id = schedule.shiftManagers?.[selectedShift];
      return employees.find(e => e.id === id)?.name || 'Não atribuído';
  }, [schedule.shiftManagers, selectedShift, employees]);

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
                    className="w-full md:w-64 mt-1 p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
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

      {/* 3. Station Grid Controls */}
      <div className="flex justify-between items-center pt-2 px-1">
          <h3 className="font-bold text-gray-700 flex items-center gap-2">
              <Briefcase size={20} />
              Postos de Trabalho
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                  {filteredStations.length} Visíveis
              </span>
          </h3>
          <div className="flex items-center gap-3">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors shadow-sm"
              >
                  <Printer size={16} /> Imprimir
              </button>
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

      {/* 4. Station Grid (Grouped by Area) */}
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
                    color="red"
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
                        color="purple"
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
                        color="blue"
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
                        color="green"
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
                        color="yellow"
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

    {/* ================= PRINT VIEW ================= */}
    <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-4 text-slate-800">
        
        {/* Print Header */}
        <div className="flex justify-between items-start mb-6 border-b-2 border-slate-800 pb-4">
            <div>
                <h1 className="text-3xl font-extrabold uppercase tracking-tight text-slate-900 mb-1">{settings.restaurantName}</h1>
                <p className="text-sm text-slate-500 font-medium">Plano de Posicionamento Operacional</p>
            </div>
            <div className="text-right">
                <div className="text-4xl font-black text-slate-900">{getShiftLabel(selectedShift)}</div>
                <div className="text-lg text-slate-600 font-medium">{new Date(date).toLocaleDateString('pt-PT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
        </div>

        {/* Print KPIs */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 flex justify-between items-center">
             <div className="flex items-center gap-4">
                 <div className="px-4 py-2 border-r border-slate-200">
                     <div className="text-xs uppercase font-bold text-slate-400">Gerente de Turno</div>
                     <div className="text-xl font-bold text-slate-800">{shiftManagerName}</div>
                 </div>
                 <div className="px-4 py-2">
                     <div className="text-xs uppercase font-bold text-slate-400">Previsão Vendas ({manualPeakHour || 'Hora de Pico'})</div>
                     <div className="text-xl font-bold text-slate-800">{activeSalesData.totalSales} €</div>
                 </div>
             </div>

             <div className="flex gap-4">
                 <div className="text-center px-4">
                     <div className="text-3xl font-black text-blue-600">{requirement.count}</div>
                     <div className="text-[10px] uppercase font-bold text-slate-400">Necessários</div>
                 </div>
                 <div className="text-center px-4 border-l border-slate-200">
                     <div className="text-3xl font-black text-slate-700">{currentAssignedCount}</div>
                     <div className="text-[10px] uppercase font-bold text-slate-400">Posicionados</div>
                 </div>
                 <div className="text-center px-4 border-l border-slate-200">
                     <div className={`text-3xl font-black ${gap > 0 ? 'text-red-500' : 'text-emerald-600'}`}>{gap > 0 ? `-${gap}` : 'OK'}</div>
                     <div className="text-[10px] uppercase font-bold text-slate-400">Diferença</div>
                 </div>
             </div>
        </div>

        {/* Print Grid */}
        <div className="grid grid-cols-4 gap-4 text-xs">
            {/* Column 1: Kitchen */}
            <div className="space-y-2">
                <div className="font-bold uppercase text-slate-400 border-b border-slate-200 pb-1 mb-2">Produção</div>
                {kitchenStations.map(s => <PrintCard key={s.id} station={s} schedule={schedule} selectedShift={selectedShift} employees={employees} />)}
            </div>

            {/* Column 2: Beverage & Service */}
            <div className="space-y-2">
                {beverageStations.length > 0 && (
                    <>
                    <div className="font-bold uppercase text-slate-400 border-b border-slate-200 pb-1 mb-2">Bebidas</div>
                    {beverageStations.map(s => <PrintCard key={s.id} station={s} schedule={schedule} selectedShift={selectedShift} employees={employees} />)}
                    <div className="h-4"></div>
                    </>
                )}
                 <div className="font-bold uppercase text-slate-400 border-b border-slate-200 pb-1 mb-2">Balcão</div>
                 {serviceStations.map(s => <PrintCard key={s.id} station={s} schedule={schedule} selectedShift={selectedShift} employees={employees} />)}
            </div>

            {/* Column 3: Delivery */}
            <div className="space-y-2">
                {deliveryStations.length > 0 && (
                    <>
                    <div className="font-bold uppercase text-slate-400 border-b border-slate-200 pb-1 mb-2">Delivery</div>
                    {deliveryStations.map(s => <PrintCard key={s.id} station={s} schedule={schedule} selectedShift={selectedShift} employees={employees} />)}
                    </>
                )}
            </div>

             {/* Column 4: Lobby */}
            <div className="space-y-2">
                {lobbyStations.length > 0 && (
                    <>
                    <div className="font-bold uppercase text-slate-400 border-b border-slate-200 pb-1 mb-2">Sala</div>
                    {lobbyStations.map(s => <PrintCard key={s.id} station={s} schedule={schedule} selectedShift={selectedShift} employees={employees} />)}
                    </>
                )}
            </div>

        </div>

        <div className="fixed bottom-0 left-0 w-full p-4 border-t border-slate-100 flex justify-between text-[10px] text-slate-400">
            <span>TeamPos - Documento Interno</span>
            <span>Impresso a {new Date().toLocaleString('pt-PT')}</span>
        </div>
    </div>
    </>
  );
};

// --- Sub-components ---

const StationGroup = ({ title, stations, schedule, selectedShift, employees, onAssign, onRemove, color }: any) => {
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
                        borderColor={borderColor}
                    />
                ))}
            </div>
        </div>
    );
};

const StationCard = ({ station, schedule, selectedShift, employees, onAssign, onRemove, borderColor }: any) => {
    const [isSelecting, setIsSelecting] = useState(false);
    
    const assignedIds = (schedule.shifts[selectedShift]?.[station.id] || []) as string[];
    const assignedEmployees = assignedIds
        .map(id => employees.find((e: Employee) => e.id === id))
        .filter(Boolean);

    const Icon = StationIcon(station.icon);
    
    // Get available employees (not assigned anywhere in this shift)
    const availableEmployees = useMemo(() => {
        const shiftData = schedule.shifts[selectedShift] || {};
        const allAssignedIds = Object.values(shiftData).flat();
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

    return (
        <div className={`bg-white rounded-lg border border-gray-200 shadow-sm border-l-4 ${borderColor} p-3 animate-scale-up`}>
             <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2 text-gray-700">
                    <div className="p-1.5 bg-gray-50 rounded text-gray-500">
                        <Icon size={16} />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-semibold text-sm leading-tight">{station.label}</span>
                        {station.designation && <span className="text-[10px] text-gray-400 font-mono">{station.designation}</span>}
                    </div>
                </div>
                <span className="text-xs text-gray-400 font-medium">{assignedEmployees.length}/{station.defaultSlots}</span>
            </div>

            <div className="space-y-2">
                {/* Assigned List */}
                <div className="flex flex-wrap gap-2">
                    {assignedEmployees.map((emp: Employee) => (
                         <div key={emp.id} className="flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs border border-slate-200">
                             <div className={`w-1.5 h-1.5 rounded-full ${ROLE_COLORS[emp.role].split(' ')[0]}`}></div>
                             <span className="font-medium max-w-[80px] truncate">{emp.name}</span>
                             <button onClick={() => onRemove(station.id, emp.id)} className="text-slate-400 hover:text-red-500 ml-1"><X size={12}/></button>
                         </div>
                    ))}
                </div>

                {/* Add Action */}
                {!isFull && (
                    <div className="mt-2">
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
                                onClick={() => setIsSelecting(true)}
                                className="w-full py-1 border border-dashed border-gray-300 rounded-lg text-gray-400 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-colors flex items-center justify-center gap-1"
                            >
                                <Plus size={14} />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Print Specific Components ---
const PrintCard = ({ station, schedule, selectedShift, employees }: any) => {
    const assignedIds = (schedule.shifts[selectedShift]?.[station.id] || []) as string[];
    const assignedEmployees = assignedIds
        .map((id: string) => employees.find((e: Employee) => e.id === id))
        .filter(Boolean);

    return (
        <div className="border border-slate-200 rounded p-2 bg-white break-inside-avoid shadow-sm">
            <div className="flex justify-between items-center mb-1">
                <div className="font-bold text-slate-800 text-xs truncate max-w-[80%]">
                    {station.designation || station.label}
                </div>
                <div className="text-[10px] text-slate-400 bg-slate-100 px-1 rounded">
                   {assignedEmployees.length}/{station.defaultSlots}
                </div>
            </div>
            {assignedEmployees.length > 0 ? (
                <div className="flex flex-col gap-1">
                    {assignedEmployees.map((emp: Employee) => (
                        <div key={emp.id} className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${ROLE_COLORS[emp.role].split(' ')[0]}`}></div>
                            <span className="text-xs font-medium text-slate-600 truncate">{emp.name}</span>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="h-4 bg-slate-50 rounded border border-dashed border-slate-200"></div>
            )}
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