
import React, { useState, useEffect } from 'react';
import { Settings } from './components/Settings';
import { Criteria } from './components/Criteria';
import { HistoryForecast } from './components/HistoryForecast';
import { Positioning } from './components/Positioning';
import { Login } from './components/Login';
import { ModuleSelector } from './components/ModuleSelector';
import { ScheduleHistory } from './components/ScheduleHistory';
import { BillingControl } from './components/BillingControl';
import { AppSettings, Employee, StaffingTableEntry, DailySchedule, HourlyProjection, HistoryEntry, ShiftType } from './types';
import { DEFAULT_SETTINGS, MOCK_EMPLOYEES, DEFAULT_STAFFING_TABLE, STATIONS, INITIAL_RESTAURANTS, MOCK_HISTORY } from './constants';
import { Building2, LayoutDashboard, Sliders, TrendingUp, History, Settings as SettingsIcon, LogOut, Menu, ArrowLeft, FileText } from 'lucide-react';

type ModuleType = 'positioning' | 'finance' | 'billing';

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  expanded: boolean;
}

const NavButton: React.FC<NavButtonProps> = ({ active, onClick, icon, label, expanded }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors mb-1
      ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
    `}
    title={!expanded ? label : ''}
  >
    <div className={`${active ? 'text-white' : ''}`}>
      {icon}
    </div>
    {expanded && <span className="font-medium">{label}</span>}
  </button>
);

const App: React.FC = () => {
  const [authenticatedRestaurantId, setAuthenticatedRestaurantId] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState<ModuleType | null>(null);
  const [activeTab, setActiveTab] = useState<'positioning' | 'staffing' | 'sales_history' | 'schedule_history' | 'settings' | 'billing_main'>('positioning');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const SETTINGS_KEY = 'app_all_restaurants';
  const EMPLOYEES_KEY = (id: string) => `app_employees_${id}`;
  const STAFFING_TABLE_KEY = (id: string) => `app_staffing_table_${id}`; 
  const HISTORY_KEY = (id: string) => `app_history_detailed_${id}`;
  const SCHEDULES_KEY = (id: string) => `app_schedules_${id}`;

  const [allRestaurants, setAllRestaurants] = useState<AppSettings[]>(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    const parsed: AppSettings[] = saved ? JSON.parse(saved) : INITIAL_RESTAURANTS;
    return parsed.map(r => ({ ...r, customStations: r.customStations || STATIONS }));
  });

  const [currentEmployees, setCurrentEmployees] = useState<Employee[]>([]);
  const [currentStaffingTable, setCurrentStaffingTable] = useState<StaffingTableEntry[]>([]); 
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [savedSchedules, setSavedSchedules] = useState<DailySchedule[]>([]);
  
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [targetShift, setTargetShift] = useState<ShiftType | null>(null);
  const [targetSales, setTargetSales] = useState(0);
  const [hourlyData, setHourlyData] = useState<HourlyProjection[]>([]); 

  const [currentSchedule, setCurrentSchedule] = useState<DailySchedule>({
    date: targetDate,
    shifts: {}
  });

  // Carregamento de dados inicial por restaurante
  useEffect(() => {
    if (!authenticatedRestaurantId) {
      setIsLoaded(false);
      return;
    }
    const empSaved = localStorage.getItem(EMPLOYEES_KEY(authenticatedRestaurantId));
    setCurrentEmployees(empSaved ? JSON.parse(empSaved) : MOCK_EMPLOYEES);
    
    const staffingSaved = localStorage.getItem(STAFFING_TABLE_KEY(authenticatedRestaurantId));
    setCurrentStaffingTable(staffingSaved ? JSON.parse(staffingSaved) : DEFAULT_STAFFING_TABLE);
    
    const historySaved = localStorage.getItem(HISTORY_KEY(authenticatedRestaurantId));
    setHistoryEntries(historySaved ? JSON.parse(historySaved) : MOCK_HISTORY);
    
    const schedSaved = localStorage.getItem(SCHEDULES_KEY(authenticatedRestaurantId));
    setSavedSchedules(schedSaved ? JSON.parse(schedSaved) : []);
    
    setTimeout(() => setIsLoaded(true), 100);
  }, [authenticatedRestaurantId]);

  // Sincronização automática para LocalStorage - Ponto Único de Verdade
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(allRestaurants));
  }, [allRestaurants]);

  useEffect(() => {
    if (!authenticatedRestaurantId || !isLoaded) return;
    localStorage.setItem(EMPLOYEES_KEY(authenticatedRestaurantId), JSON.stringify(currentEmployees));
    localStorage.setItem(STAFFING_TABLE_KEY(authenticatedRestaurantId), JSON.stringify(currentStaffingTable));
    localStorage.setItem(HISTORY_KEY(authenticatedRestaurantId), JSON.stringify(historyEntries));
    localStorage.setItem(SCHEDULES_KEY(authenticatedRestaurantId), JSON.stringify(savedSchedules));
  }, [isLoaded, authenticatedRestaurantId, currentEmployees, currentStaffingTable, historyEntries, savedSchedules]);

  useEffect(() => {
    const existingSchedule = savedSchedules.find(s => s.date === targetDate);
    if (existingSchedule) {
        setCurrentSchedule({
          ...existingSchedule,
          lockedShifts: existingSchedule.lockedShifts || []
        });
    } else {
        setCurrentSchedule({ 
          date: targetDate, 
          shifts: {},
          lockedShifts: []
        });
    }
    const known = historyEntries.find(s => s.date === targetDate);
    if(known) setTargetSales(known.totalSales);
  }, [targetDate, historyEntries, savedSchedules]);

  const handleRegister = (newRest: AppSettings) => {
    const restWithStations = { ...newRest, customStations: STATIONS };
    setAllRestaurants(prev => [...prev, restWithStations]);
    setAuthenticatedRestaurantId(newRest.restaurantId);
    setActiveModule(null); 
  };

  const handleLogin = (restaurant: AppSettings) => {
    setAuthenticatedRestaurantId(restaurant.restaurantId);
    setActiveModule(null); 
  };

  const handleLogout = () => {
    setAuthenticatedRestaurantId(null);
    setActiveModule(null);
    setActiveTab('positioning');
    setIsLoaded(false);
  };

  const handleUpdateSettings = (updated: AppSettings) => {
    setAllRestaurants(prev => prev.map(r => r.restaurantId === updated.restaurantId ? updated : r));
  };

  const handleSaveSchedule = (scheduleToSave: DailySchedule) => {
    setSavedSchedules(prev => {
        const others = prev.filter(s => s.date !== scheduleToSave.date);
        return [...others, scheduleToSave];
    });
    setCurrentSchedule(scheduleToSave);
    // Nota: O salvamento no localStorage acontece via useEffect
  };

  const handleLoadFromHistory = (date: string, shift?: ShiftType) => {
    setTargetDate(date);
    if (shift) setTargetShift(shift);
    setActiveTab('positioning');
  };

  const handleDeleteSchedule = (date: string) => {
    if (confirm(`Tem a certeza que deseja eliminar o registo de ${date}?`)) {
      setSavedSchedules(prev => prev.filter(s => s.date !== date));
      if (targetDate === date) setCurrentSchedule({ date, shifts: {}, lockedShifts: [] });
    }
  };

  // Funções de Import/Export Global
  const exportAllData = () => {
    if (!authenticatedRestaurantId) return;
    
    const data = {
        restaurant: allRestaurants.find(r => r.restaurantId === authenticatedRestaurantId),
        employees: currentEmployees,
        staffing: currentStaffingTable,
        history: historyEntries,
        schedules: savedSchedules
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_${data.restaurant?.restaurantName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importAllData = (jsonData: any) => {
    try {
        if (jsonData.restaurant) {
            setAllRestaurants(prev => {
                const filtered = prev.filter(r => r.restaurantId !== jsonData.restaurant.restaurantId);
                return [...filtered, jsonData.restaurant];
            });
            setAuthenticatedRestaurantId(jsonData.restaurant.restaurantId);
        }
        if (jsonData.employees) setCurrentEmployees(jsonData.employees);
        if (jsonData.staffing) setCurrentStaffingTable(jsonData.staffing);
        if (jsonData.history) setHistoryEntries(jsonData.history);
        if (jsonData.schedules) setSavedSchedules(jsonData.schedules);
        
        alert("Dados importados com sucesso! O sistema irá reiniciar a sessão.");
        setActiveModule(null);
    } catch (e) {
        alert("Erro ao importar ficheiro. Formato inválido.");
    }
  };

  const activeRestaurant = allRestaurants.find(r => r.restaurantId === authenticatedRestaurantId);

  if (!authenticatedRestaurantId || !activeRestaurant) {
    return <Login restaurants={allRestaurants} onLogin={handleLogin} onRegister={handleRegister} />;
  }

  if (!activeModule) {
    return <ModuleSelector restaurant={activeRestaurant} onSelectModule={(mod) => {
      setActiveModule(mod);
      if (mod === 'billing') setActiveTab('billing_main');
      else setActiveTab('positioning');
    }} onLogout={handleLogout} />;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 text-white transition-all duration-300 flex flex-col shadow-xl z-20`}>
        <div className="p-4 flex items-center gap-3 border-b border-slate-700 h-16">
          <div className="p-1.5 bg-blue-600 rounded-lg shrink-0"><Building2 size={20} /></div>
          {sidebarOpen && (
              <div className="overflow-hidden">
                  <h1 className="font-bold text-sm tracking-tight truncate">{activeRestaurant.restaurantName}</h1>
                  <p className="text-xs text-slate-400 truncate">{activeModule === 'billing' ? 'Faturação' : 'Operações'}</p>
              </div>
          )}
        </div>
        <nav className="flex-1 p-4 space-y-2">
           <button onClick={() => setActiveModule(null)} className="w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-slate-400 hover:bg-slate-800 hover:text-white mb-6 border border-slate-700/50">
             <ArrowLeft size={20} />
             {sidebarOpen && <span className="font-medium">Menu Principal</span>}
           </button>
          
          {activeModule === 'positioning' && (
            <>
              <NavButton active={activeTab === 'positioning'} onClick={() => setActiveTab('positioning')} icon={<LayoutDashboard size={20} />} label="Posicionamento" expanded={sidebarOpen} />
              <NavButton active={activeTab === 'staffing'} onClick={() => setActiveTab('staffing')} icon={<Sliders size={20} />} label="Staffing" expanded={sidebarOpen} />
              <NavButton active={activeTab === 'sales_history'} onClick={() => setActiveTab('sales_history')} icon={<TrendingUp size={20} />} label="Histórico Vendas" expanded={sidebarOpen} />
              <NavButton active={activeTab === 'schedule_history'} onClick={() => setActiveTab('schedule_history')} icon={<History size={20} />} label="Histórico Turnos" expanded={sidebarOpen} />
              <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<SettingsIcon size={20} />} label="Definições" expanded={sidebarOpen} />
            </>
          )}

          {activeModule === 'billing' && (
            <>
              <NavButton active={activeTab === 'billing_main'} onClick={() => setActiveTab('billing_main')} icon={<FileText size={20} />} label="Controlo de Faturação" expanded={sidebarOpen} />
            </>
          )}
        </nav>
        <div className="p-4 border-t border-slate-700">
             <button onClick={handleLogout} className="w-full flex items-center gap-3 p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"><LogOut size={20} />{sidebarOpen && <span>Sair</span>}</button>
             <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-full mt-2 flex justify-center text-slate-500 hover:text-white"><Menu size={20} /></button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto flex flex-col">
        <header className="bg-white shadow-sm p-6 sticky top-0 z-10 print:hidden">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">
                {activeModule === 'billing' ? 'Controlo de Faturação' : (
                <>
                    {activeTab === 'positioning' && 'Posicionamento Diário'}
                    {activeTab === 'staffing' && 'Matriz de Staffing'}
                    {activeTab === 'sales_history' && 'Histórico & Previsão'}
                    {activeTab === 'schedule_history' && 'Histórico de Turnos'}
                    {activeTab === 'settings' && 'Definições & Staff'}
                </>
                )}
            </h2>
            <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-emerald-500 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 flex items-center gap-1">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    Sincronizado Localmente
                </span>
            </div>
          </div>
        </header>
        <div className="p-6 flex-1">
          {!isLoaded ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 animate-pulse">
                <Building2 size={48} className="mb-4" />
                <p className="font-medium">A carregar base de dados...</p>
            </div>
          ) : (
            <>
              {activeTab === 'settings' && activeModule === 'positioning' && (
                <Settings 
                  settings={activeRestaurant} 
                  onSaveSettings={handleUpdateSettings} 
                  employees={currentEmployees} 
                  setEmployees={setCurrentEmployees}
                  onExport={exportAllData}
                  onImport={importAllData}
                />
              )}
              {activeTab === 'staffing' && activeModule === 'positioning' && <Criteria staffingTable={currentStaffingTable} setStaffingTable={setCurrentStaffingTable} />}
              {activeTab === 'sales_history' && activeModule === 'positioning' && (
                <HistoryForecast 
                  history={historyEntries}
                  setHistory={setHistoryEntries}
                  targetDate={targetDate}
                  setTargetDate={setTargetDate}
                  targetSales={targetSales}
                  setTargetSales={setTargetSales}
                  setHourlyData={setHourlyData}
                  onNavigateToPositioning={() => setActiveTab('positioning')}
                />
              )}
              {activeTab === 'schedule_history' && activeModule === 'positioning' && <ScheduleHistory schedules={savedSchedules} onLoadSchedule={handleLoadFromHistory} onDeleteSchedule={handleDeleteSchedule} employees={currentEmployees} />}
              {activeTab === 'positioning' && activeModule === 'positioning' && (
                <Positioning 
                  date={targetDate}
                  setDate={setTargetDate}
                  projectedSales={targetSales}
                  employees={currentEmployees.filter(e => e.isActive)}
                  staffingTable={currentStaffingTable}
                  schedule={currentSchedule}
                  setSchedule={setCurrentSchedule}
                  settings={activeRestaurant}
                  hourlyData={hourlyData}
                  onSaveSchedule={handleSaveSchedule}
                  initialShift={targetShift}
                  onShiftChangeComplete={() => setTargetShift(null)}
                />
              )}
              {activeTab === 'billing_main' && activeModule === 'billing' && (
                <BillingControl 
                  restaurantId={activeRestaurant.restaurantId} 
                  employees={currentEmployees} 
                />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
