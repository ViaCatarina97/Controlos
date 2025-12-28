
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
import { MOCK_EMPLOYEES, DEFAULT_STAFFING_TABLE, STATIONS, INITIAL_RESTAURANTS, MOCK_HISTORY } from './constants';
import { Building2, LayoutDashboard, Sliders, TrendingUp, History, Settings as SettingsIcon, LogOut, Menu, ArrowLeft, FileText, CheckCircle2 } from 'lucide-react';

type ModuleType = 'positioning' | 'finance' | 'billing';

const App: React.FC = () => {
  const [authenticatedRestaurantId, setAuthenticatedRestaurantId] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState<ModuleType | null>(null);
  const [activeTab, setActiveTab] = useState<'positioning' | 'staffing' | 'sales_history' | 'schedule_history' | 'settings' | 'billing_main'>('positioning');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  const [allRestaurants, setAllRestaurants] = useState<AppSettings[]>(() => {
    const saved = localStorage.getItem('app_all_restaurants');
    return saved ? JSON.parse(saved) : INITIAL_RESTAURANTS;
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

  // Carregamento inicial local
  useEffect(() => {
    if (!authenticatedRestaurantId) return;
    const id = authenticatedRestaurantId;
    
    const empSaved = localStorage.getItem(`app_employees_${id}`);
    setCurrentEmployees(empSaved ? JSON.parse(empSaved) : MOCK_EMPLOYEES);
    const staffingSaved = localStorage.getItem(`app_staffing_table_${id}`);
    setCurrentStaffingTable(staffingSaved ? JSON.parse(staffingSaved) : DEFAULT_STAFFING_TABLE);
    const historySaved = localStorage.getItem(`app_history_detailed_${id}`);
    setHistoryEntries(historySaved ? JSON.parse(historySaved) : MOCK_HISTORY);
    const schedSaved = localStorage.getItem(`app_schedules_${id}`);
    setSavedSchedules(schedSaved ? JSON.parse(schedSaved) : []);
    
    setIsLoaded(true);
  }, [authenticatedRestaurantId]);

  // Persistência Local Total
  useEffect(() => {
    if (!authenticatedRestaurantId || !isLoaded) return;
    const id = authenticatedRestaurantId;
    localStorage.setItem('app_all_restaurants', JSON.stringify(allRestaurants));
    localStorage.setItem(`app_employees_${id}`, JSON.stringify(currentEmployees));
    localStorage.setItem(`app_staffing_table_${id}`, JSON.stringify(currentStaffingTable));
    localStorage.setItem(`app_history_detailed_${id}`, JSON.stringify(historyEntries));
    localStorage.setItem(`app_schedules_${id}`, JSON.stringify(savedSchedules));
  }, [allRestaurants, currentEmployees, currentStaffingTable, historyEntries, savedSchedules, authenticatedRestaurantId, isLoaded]);

  useEffect(() => {
    const existingSchedule = savedSchedules.find(s => s.date === targetDate);
    setCurrentSchedule(existingSchedule ? { ...existingSchedule, lockedShifts: existingSchedule.lockedShifts || [] } : { date: targetDate, shifts: {}, lockedShifts: [] });
    const known = historyEntries.find(s => s.date === targetDate);
    if(known) setTargetSales(known.totalSales);
  }, [targetDate, historyEntries, savedSchedules]);

  const handleRegister = (newRest: AppSettings) => {
    setAllRestaurants(prev => [...prev, { ...newRest, customStations: STATIONS }]);
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
    setIsLoaded(false);
  };

  const handleSaveSchedule = (scheduleToSave: DailySchedule) => {
    setSavedSchedules(prev => {
        const others = prev.filter(s => s.date !== scheduleToSave.date);
        return [...others, scheduleToSave];
    });
    setCurrentSchedule(scheduleToSave);
  };

  // Funções de Import/Export Global para Portabilidade
  const exportAllData = () => {
    const data = {
        restaurant: allRestaurants.find(r => r.restaurantId === authenticatedRestaurantId),
        employees: currentEmployees,
        staffing: currentStaffingTable,
        history: historyEntries,
        schedules: savedSchedules,
        exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_controlos_${data.restaurant?.restaurantName.replace(/\s+/g, '_')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importAllData = (data: any) => {
    if (data.restaurant) {
      setAllRestaurants(prev => {
        const others = prev.filter(r => r.restaurantId !== data.restaurant.restaurantId);
        return [...others, data.restaurant];
      });
      setAuthenticatedRestaurantId(data.restaurant.restaurantId);
    }
    if (data.employees) setCurrentEmployees(data.employees);
    if (data.staffing) setCurrentStaffingTable(data.staffing);
    if (data.history) setHistoryEntries(data.history);
    if (data.schedules) setSavedSchedules(data.schedules);
    alert("Backup restaurado com sucesso!");
    setActiveModule(null);
  };

  const activeRestaurant = allRestaurants.find(r => r.restaurantId === authenticatedRestaurantId);

  if (!authenticatedRestaurantId || !activeRestaurant) {
    return <Login restaurants={allRestaurants} onLogin={handleLogin} onRegister={handleRegister} />;
  }

  if (!activeModule) {
    return <ModuleSelector restaurant={activeRestaurant} onSelectModule={setActiveModule} onLogout={handleLogout} />;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 text-white transition-all duration-300 flex flex-col shadow-xl z-20`}>
        <div className="p-4 flex items-center gap-3 border-b border-slate-700 h-16">
          <div className="p-1.5 bg-blue-600 rounded-lg shrink-0"><Building2 size={20} /></div>
          {sidebarOpen && (
              <div className="overflow-hidden">
                  <h1 className="font-bold text-sm tracking-tight truncate">{activeRestaurant.restaurantName}</h1>
                  <p className="text-xs text-slate-400 truncate">Controlos de Gestão</p>
              </div>
          )}
        </div>
        <nav className="flex-1 p-4 space-y-1">
           <button onClick={() => setActiveModule(null)} className="w-full flex items-center gap-3 p-3 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white mb-6 border border-slate-700/50">
             <ArrowLeft size={20} />
             {sidebarOpen && <span className="font-medium">Menu Principal</span>}
           </button>
          
          {activeModule === 'positioning' && (
            <>
              <button onClick={() => setActiveTab('positioning')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'positioning' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                <LayoutDashboard size={20} /> {sidebarOpen && <span>Posicionamento</span>}
              </button>
              <button onClick={() => setActiveTab('staffing')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'staffing' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                <Sliders size={20} /> {sidebarOpen && <span>Staffing</span>}
              </button>
              <button onClick={() => setActiveTab('sales_history')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'sales_history' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                <TrendingUp size={20} /> {sidebarOpen && <span>Vendas</span>}
              </button>
              <button onClick={() => setActiveTab('schedule_history')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'schedule_history' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                <History size={20} /> {sidebarOpen && <span>Histórico</span>}
              </button>
              <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                <SettingsIcon size={20} /> {sidebarOpen && <span>Definições</span>}
              </button>
            </>
          )}

          {activeModule === 'billing' && (
            <button onClick={() => setActiveTab('billing_main')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'billing_main' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
              <FileText size={20} /> {sidebarOpen && <span>Faturação</span>}
            </button>
          )}
        </nav>
        <div className="p-4 border-t border-slate-700">
             <button onClick={handleLogout} className="w-full flex items-center gap-3 p-2 text-slate-400 hover:text-red-400 transition-colors"><LogOut size={20} />{sidebarOpen && <span>Sair</span>}</button>
             <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-full mt-2 flex justify-center text-slate-500"><Menu size={20} /></button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto flex flex-col">
        <header className="bg-white shadow-sm px-6 py-4 sticky top-0 z-10 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">
            {activeTab === 'positioning' ? 'Posicionamento Diário' : 
             activeTab === 'staffing' ? 'Matriz de Staffing' :
             activeTab === 'sales_history' ? 'Histórico & Previsão' :
             activeTab === 'settings' ? 'Definições do Restaurante' : 'Controlo de Faturação'}
          </h2>
          <div className="text-[10px] font-black uppercase text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100 flex items-center gap-1">
             <CheckCircle2 size={12} className="text-emerald-500" />
             Dados Locais Seguros
          </div>
        </header>

        <div className="p-6 flex-1">
          {activeTab === 'settings' && <Settings settings={activeRestaurant} onSaveSettings={setAllRestaurants as any} employees={currentEmployees} setEmployees={setCurrentEmployees} onExport={exportAllData} onImport={importAllData} />}
          {activeTab === 'staffing' && <Criteria staffingTable={currentStaffingTable} setStaffingTable={setCurrentStaffingTable} />}
          {activeTab === 'sales_history' && <HistoryForecast history={historyEntries} setHistory={setHistoryEntries} targetDate={targetDate} setTargetDate={setTargetDate} setTargetSales={setTargetSales} setHourlyData={setHourlyData} onNavigateToPositioning={() => setActiveTab('positioning')} />}
          {activeTab === 'schedule_history' && <ScheduleHistory schedules={savedSchedules} onLoadSchedule={(d, s) => { setTargetDate(d); if(s) setTargetShift(s); setActiveTab('positioning'); }} onDeleteSchedule={(d) => setSavedSchedules(prev => prev.filter(s => s.date !== d))} employees={currentEmployees} />}
          {activeTab === 'positioning' && <Positioning date={targetDate} setDate={setTargetDate} projectedSales={targetSales} employees={currentEmployees.filter(e => e.isActive)} staffingTable={currentStaffingTable} schedule={currentSchedule} setSchedule={setCurrentSchedule} settings={activeRestaurant} hourlyData={hourlyData} onSaveSchedule={handleSaveSchedule} initialShift={targetShift} onShiftChangeComplete={() => setTargetShift(null)} />}
          {activeTab === 'billing_main' && <BillingControl restaurantId={activeRestaurant.restaurantId} employees={currentEmployees} />}
        </div>
      </main>
    </div>
  );
};

export default App;
