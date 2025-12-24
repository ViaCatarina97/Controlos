import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { Settings } from './components/Settings';
import { Criteria } from './components/Criteria';
import { HistoryForecast } from './components/HistoryForecast';
import { Positioning } from './components/Positioning';
import { Login } from './components/Login';
import { ModuleSelector } from './components/ModuleSelector';
import { ScheduleHistory } from './components/ScheduleHistory';
import { AppSettings, Employee, StaffingTableEntry, DailySchedule, HourlyProjection, HistoryEntry } from './types';
import { STATIONS, INITIAL_RESTAURANTS, MOCK_EMPLOYEES, DEFAULT_STAFFING_TABLE, MOCK_HISTORY } from './constants';
import { Building2, LayoutDashboard, Sliders, TrendingUp, History, Settings as SettingsIcon, LogOut, Menu, ArrowLeft, Construction, Cloud, FileText } from 'lucide-react';

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
  >
    <div className={active ? 'text-white' : ''}>{icon}</div>
    {expanded && <span className="font-medium">{label}</span>}
  </button>
);

const App: React.FC = () => {
  const [authenticatedRestaurantId, setAuthenticatedRestaurantId] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState<ModuleType | null>(null);
  const [activeTab, setActiveTab] = useState<'positioning' | 'staffing' | 'sales_history' | 'schedule_history' | 'settings' | 'invoices'>('positioning');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [allRestaurants, setAllRestaurants] = useState<AppSettings[]>(INITIAL_RESTAURANTS);
  const [currentEmployees, setCurrentEmployees] = useState<Employee[]>([]);
  const [currentStaffingTable, setCurrentStaffingTable] = useState<StaffingTableEntry[]>([]); 
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [savedSchedules, setSavedSchedules] = useState<DailySchedule[]>([]);
  
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [targetSales, setTargetSales] = useState(0);
  const [hourlyData, setHourlyData] = useState<HourlyProjection[]>([]); 
  const [currentSchedule, setCurrentSchedule] = useState<DailySchedule>({ date: targetDate, shifts: {} });

  const loadDataFromCloud = async (restaurantId: string) => {
    setIsLoaded(false);
    try {
      const { data, error } = await supabase
        .from('restaurant_data')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .single();

      if (data) {
        setCurrentEmployees(data.employees || MOCK_EMPLOYEES);
        setCurrentStaffingTable(data.staffing_table || DEFAULT_STAFFING_TABLE);
        setHistoryEntries(data.history || MOCK_HISTORY);
        setSavedSchedules(data.schedules || []);
        
        const cloudSettings = data.settings || {};
        const cloudStations = data.custom_stations || [];
        setAllRestaurants(prev => prev.map(r => 
          r.restaurantId === restaurantId 
            ? { ...r, ...cloudSettings, customStations: cloudStations.length > 0 ? cloudStations : r.customStations } 
            : r
        ));
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setTimeout(() => setIsLoaded(true), 600);
    }
  };

  const syncToCloud = useCallback(async (manualSchedules?: DailySchedule[]) => {
    if (!authenticatedRestaurantId || !isLoaded) return;
    setIsSyncing(true);

    const currentRest = allRestaurants.find(r => r.restaurantId === authenticatedRestaurantId);
    if (!currentRest) return;

    const { restaurantId, customStations, ...otherSettings } = currentRest;

    try {
      await supabase.from('restaurant_data').upsert({
        restaurant_id: authenticatedRestaurantId,
        employees: currentEmployees,
        staffing_table: currentStaffingTable,
        history: historyEntries,
        schedules: manualSchedules || savedSchedules,
        settings: otherSettings,
        custom_stations: customStations || [],
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      console.error("Erro na sincronização:", err);
    } finally {
      setTimeout(() => setIsSyncing(false), 500);
    }
  }, [authenticatedRestaurantId, isLoaded, allRestaurants, currentEmployees, currentStaffingTable, historyEntries, savedSchedules]);

  useEffect(() => {
    if (!isLoaded) return;
    const timer = setTimeout(() => syncToCloud(), 3000);
    return () => clearTimeout(timer);
  }, [currentEmployees, currentStaffingTable, historyEntries, allRestaurants, syncToCloud]);

  const handleSaveSchedule = async (scheduleToSave: DailySchedule) => {
    setCurrentSchedule(scheduleToSave);
    setSavedSchedules(prev => {
      const others = prev.filter(s => s.date !== scheduleToSave.date);
      const updated = [...others, scheduleToSave];
      syncToCloud(updated); 
      return updated;
    });
    if(scheduleToSave.isLocked) alert("Posicionamento Sincronizado!");
  };

  useEffect(() => {
    if (authenticatedRestaurantId) loadDataFromCloud(authenticatedRestaurantId);
  }, [authenticatedRestaurantId]);

  useEffect(() => {
    const existingSchedule = savedSchedules.find(s => s.date === targetDate);
    const today = new Date().toISOString().split('T')[0];
    if (existingSchedule) {
      setCurrentSchedule({ ...existingSchedule, isLocked: targetDate < today ? true : existingSchedule.isLocked });
    } else {
      setCurrentSchedule({ date: targetDate, shifts: {}, isLocked: targetDate < today });
    }
    const known = historyEntries.find(s => s.date === targetDate);
    if(known) setTargetSales(known.totalSales);
  }, [targetDate, historyEntries, savedSchedules]);

  const activeRestaurant = allRestaurants.find(r => r.restaurantId === authenticatedRestaurantId);

  if (!authenticatedRestaurantId || !activeRestaurant) {
    return <Login restaurants={allRestaurants} onLogin={(r) => setAuthenticatedRestaurantId(r.restaurantId)} onRegister={(r) => { setAllRestaurants(prev => [...prev, r]); setAuthenticatedRestaurantId(r.restaurantId); }} />;
  }

  if (!activeModule) {
    return <ModuleSelector restaurant={activeRestaurant} onSelectModule={setActiveModule} onLogout={() => setAuthenticatedRestaurantId(null)} />;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 text-white transition-all duration-300 flex flex-col z-20 shadow-2xl`}>
        <div className="p-4 flex items-center gap-3 border-b border-slate-700 h-16">
          <div className="p-1.5 bg-blue-600 rounded-lg shrink-0"><Building2 size={20} /></div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <h1 className="font-bold text-sm truncate">{activeRestaurant.restaurantName}</h1>
              <div className="flex items-center gap-1">
                <Cloud size={12} className={isSyncing ? "text-blue-400 animate-pulse" : "text-emerald-400"} />
                <p className="text-[10px] uppercase tracking-wider font-bold">{isSyncing ? "A Gravar..." : "Sincronizado"}</p>
              </div>
            </div>
          )}
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveModule(null)} className="w-full flex items-center gap-3 p-3 rounded-lg text-slate-400 hover:bg-slate-800 mb-4 border border-slate-700/30 transition-all">
            <ArrowLeft size={20} /> {sidebarOpen && <span>Menu Principal</span>}
          </button>
          
          <NavButton active={activeTab === 'positioning'} onClick={() => setActiveTab('positioning')} icon={<LayoutDashboard size={20} />} label="Posicionamento" expanded={sidebarOpen} />
          <NavButton active={activeTab === 'invoices'} onClick={() => setActiveTab('invoices')} icon={<FileText size={20} />} label="Faturas HAVI" expanded={sidebarOpen} />
          <NavButton active={activeTab === 'staffing'} onClick={() => setActiveTab('staffing')} icon={<Sliders size={20} />} label="Staffing" expanded={sidebarOpen} />
          <NavButton active={activeTab === 'sales_history'} onClick={() => setActiveTab('sales_history')} icon={<TrendingUp size={20} />} label="Vendas" expanded={sidebarOpen} />
          <NavButton active={activeTab === 'schedule_history'} onClick={() => setActiveTab('schedule_history')} icon={<History size={20} />} label="Turnos" expanded={sidebarOpen} />
          <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<SettingsIcon size={20} />} label="Definições" expanded={sidebarOpen} />
        </nav>

        <div className="p-4 border-t border-slate-700">
          <button onClick={() => setAuthenticatedRestaurantId(null)} className="w-full flex items-center gap-3 p-2 text-slate-400 hover:text-red-400">
            <LogOut size={20} /> {sidebarOpen && <span>Sair</span>}
          </button>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-full mt-2 flex justify-center text-slate-500 hover:text-white">
            <Menu size={20} />
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto flex flex-col">
        <header className="bg-white shadow-sm p-6 sticky top-0 z-10 flex justify-between items-center h-16">
          <h2 className="text-xl font-bold text-gray-800 capitalize">{activeTab}</h2>
        </header>

        <div className="p-6 flex-1">
          {!isLoaded ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500">
              <p className="animate-pulse">A sincronizar dados...</p>
            </div>
          ) : (
            <>
              {activeTab === 'settings' && <Settings settings={activeRestaurant} onSaveSettings={(u) => setAllRestaurants(prev => prev.map(r => r.restaurantId === u.restaurantId ? u : r))} employees={currentEmployees} setEmployees={setCurrentEmployees} />}
              {activeTab === 'staffing' && <Criteria staffingTable={currentStaffingTable} setStaffingTable={setCurrentStaffingTable} />}
              {activeTab === 'sales_history' && <HistoryForecast history={historyEntries} setHistory={setHistoryEntries} targetDate={targetDate} setTargetDate={setTargetDate} targetSales={targetSales} setTargetSales={setTargetSales} setHourlyData={setHourlyData} onNavigateToPositioning={() => setActiveTab('positioning')} />}
              {activeTab === 'schedule_history' && <ScheduleHistory schedules={savedSchedules} onLoadSchedule={(d) => {setTargetDate(d); setActiveTab('positioning');}} onDeleteSchedule={(d) => setSavedSchedules(prev => prev.filter(s => s.date !== d))} employees={currentEmployees} />}
              {activeTab === 'positioning' && <Positioning date={targetDate} setDate={setTargetDate} projectedSales={targetSales} employees={currentEmployees.filter(e => e.isActive)} staffingTable={currentStaffingTable} schedule={currentSchedule} setSchedule={setCurrentSchedule} settings={activeRestaurant} hourlyData={hourlyData} onSaveSchedule={handleSaveSchedule} />}
              {activeTab === 'invoices' && (
                <div className="bg-white p-8 rounded-xl shadow-sm border border-dashed border-gray-300 text-center">
                  <Construction className="mx-auto text-blue-500 mb-4" size={48} />
                  <h3 className="text-lg font-bold">Módulo de Faturas HAVI</h3>
                  <p className="text-gray-500">Pronto para integrar a extração via Gemini que planeámos.</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
