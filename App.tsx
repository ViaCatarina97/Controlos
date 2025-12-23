import React, { useState, useEffect } from 'react';
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
import { Building2, LayoutDashboard, Sliders, TrendingUp, History, Settings as SettingsIcon, LogOut, Menu, ArrowLeft, Construction } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'positioning' | 'staffing' | 'sales_history' | 'schedule_history' | 'settings'>('positioning');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [allRestaurants, setAllRestaurants] = useState<AppSettings[]>(INITIAL_RESTAURANTS);
  const [currentEmployees, setCurrentEmployees] = useState<Employee[]>([]);
  const [currentStaffingTable, setCurrentStaffingTable] = useState<StaffingTableEntry[]>([]); 
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [savedSchedules, setSavedSchedules] = useState<DailySchedule[]>([]);
  
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [targetSales, setTargetSales] = useState(0);
  const [hourlyData, setHourlyData] = useState<HourlyProjection[]>([]); 
  const [currentSchedule, setCurrentSchedule] = useState<DailySchedule>({ date: targetDate, shifts: {} });

  // --- LÓGICA DE SINCRONIZAÇÃO COMPLETA (SUPABASE) ---

  const loadDataFromCloud = async (restaurantId: string) => {
    setIsLoaded(false);
    try {
      const { data, error } = await supabase
        .from('restaurant_data')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .single();

      if (data) {
        // 1. Dados Operacionais
        setCurrentEmployees(data.employees || MOCK_EMPLOYEES);
        setCurrentStaffingTable(data.staffing_table || DEFAULT_STAFFING_TABLE);
        setHistoryEntries(data.history || MOCK_HISTORY);
        setSavedSchedules(data.schedules || []);
        
        // 2. Definições do Restaurante (Turnos, Plataformas, Postos)
        const cloudSettings = data.settings || {};
        const cloudStations = data.custom_stations || [];

        setAllRestaurants(prev => prev.map(r => 
          r.restaurantId === restaurantId 
            ? { ...r, ...cloudSettings, customStations: cloudStations.length > 0 ? cloudStations : r.customStations } 
            : r
        ));
      } else {
        // Restaurante novo
        setCurrentEmployees(MOCK_EMPLOYEES);
        setCurrentStaffingTable(DEFAULT_STAFFING_TABLE);
        setHistoryEntries(MOCK_HISTORY);
        setSavedSchedules([]);
      }
    } catch (err) {
      console.error("Erro ao carregar configurações da nuvem:", err);
    } finally {
      setTimeout(() => setIsLoaded(true), 600);
    }
  };

  const syncToCloud = async () => {
    if (!authenticatedRestaurantId || !isLoaded) return;

    const currentRest = allRestaurants.find(r => r.restaurantId === authenticatedRestaurantId);
    if (!currentRest) return;

    // Extraímos apenas as configurações (sem o ID que é a chave primária)
    const { restaurantId, customStations, ...otherSettings } = currentRest;

    await supabase
      .from('restaurant_data')
      .upsert({
        restaurant_id: authenticatedRestaurantId,
        employees: currentEmployees,
        staffing_table: currentStaffingTable,
        history: historyEntries,
        schedules: savedSchedules,
        settings: otherSettings, // Grava Turnos, Plataformas, etc.
        custom_stations: customStations || [], // Grava nomes dos postos
        updated_at: new Date().toISOString()
      });
  };

  useEffect(() => {
    if (authenticatedRestaurantId) {
      loadDataFromCloud(authenticatedRestaurantId);
    }
  }, [authenticatedRestaurantId]);

  useEffect(() => {
    if (!isLoaded) return;
    const timer = setTimeout(() => syncToCloud(), 2000);
    return () => clearTimeout(timer);
  }, [currentEmployees, currentStaffingTable, historyEntries, savedSchedules, allRestaurants]);

  // --- HANDLERS ---

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

  const handleUpdateSettings = (updated: AppSettings) => {
    setAllRestaurants(prev => prev.map(r => r.restaurantId === updated.restaurantId ? updated : r));
  };

  const handleSaveSchedule = (scheduleToSave: DailySchedule) => {
    setSavedSchedules(prev => {
      const others = prev.filter(s => s.date !== scheduleToSave.date);
      return [...others, scheduleToSave];
    });
    if(scheduleToSave.isLocked) alert("Configurações e Posicionamento guardados!");
  };

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
    return <Login restaurants={allRestaurants} onLogin={handleLogin} onRegister={handleRegister} />;
  }

  if (!activeModule) {
    return <ModuleSelector restaurant={activeRestaurant} onSelectModule={setActiveModule} onLogout={handleLogout} />;
  }

  if (activeModule === 'finance' || activeModule === 'billing') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-md border">
          <Construction size={48} className="mx-auto text-blue-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Em Desenvolvimento</h2>
          <p className="text-gray-500 mb-6">Módulo em breve.</p>
          <button onClick={() => setActiveModule(null)} className="flex items-center gap-2 mx-auto text-blue-600 font-medium">
            <ArrowLeft size={18} /> Voltar ao Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 text-white transition-all duration-300 flex flex-col z-20 shadow-2xl`}>
        <div className="p-4 flex items-center gap-3 border-b border-slate-700 h-16">
          <div className="p-1.5 bg-blue-600 rounded-lg shrink-0"><Building2 size={20} /></div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <h1 className="font-bold text-sm truncate">{activeRestaurant.restaurantName}</h1>
              <p className="text-[10px] text-emerald-400 uppercase tracking-wider font-bold">Cloud Sync Full</p>
            </div>
          )}
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveModule(null)} className="w-full flex items-center gap-3 p-3 rounded-lg text-slate-400 hover:bg-slate-800 mb-4 border border-slate-700/30 transition-all">
            <ArrowLeft size={20} /> {sidebarOpen && <span>Menu Principal</span>}
          </button>
          
          <NavButton active={activeTab === 'positioning'} onClick={() => setActiveTab('positioning')} icon={<LayoutDashboard size={20} />} label="Posicionamento" expanded={sidebarOpen} />
          <NavButton active={activeTab === 'staffing'} onClick={() => setActiveTab('staffing')} icon={<Sliders size={20} />} label="Staffing" expanded={sidebarOpen} />
          <NavButton active={activeTab === 'sales_history'} onClick={() => setActiveTab('sales_history')} icon={<TrendingUp size={20} />} label="Vendas" expanded={sidebarOpen} />
          <NavButton active={activeTab === 'schedule_history'} onClick={() => setActiveTab('schedule_history')} icon={<History size={20} />} label="Turnos" expanded={sidebarOpen} />
          <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<SettingsIcon size={20} />} label="Definições" expanded={sidebarOpen} />
        </nav>

        <div className="p-4 border-t border-slate-700">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 p-2 text-slate-400 hover:text-red-400 transition-colors">
            <LogOut size={20} /> {sidebarOpen && <span>Sair</span>}
          </button>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-full mt-2 flex justify-center text-slate-500 hover:text-white">
            <Menu size={20} />
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto flex flex-col">
        <header className="bg-white shadow-sm p-6 sticky top-0 z-10">
          <h2 className="text-2xl font-bold text-gray-800 capitalize">{activeTab.replace('_', ' ')}</h2>
        </header>

        <div className="p-6 flex-1">
          {!isLoaded ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 animate-pulse">
              <Building2 size={48} className="mb-4 text-blue-500" />
              <p className="font-medium text-lg">Sincronizando todas as definições...</p>
            </div>
          ) : (
            <>
              {activeTab === 'settings' && <Settings settings={activeRestaurant} onSaveSettings={handleUpdateSettings} employees={currentEmployees} setEmployees={setCurrentEmployees} />}
              {activeTab === 'staffing' && <Criteria staffingTable={currentStaffingTable} setStaffingTable={setCurrentStaffingTable} />}
              {activeTab === 'sales_history' && (
                <HistoryForecast history={historyEntries} setHistory={setHistoryEntries} targetDate={targetDate} setTargetDate={setTargetDate} targetSales={targetSales} setTargetSales={setTargetSales} setHourlyData={setHourlyData} onNavigateToPositioning={() => setActiveTab('positioning')} />
              )}
              {activeTab === 'schedule_history' && <ScheduleHistory schedules={savedSchedules} onLoadSchedule={(d) => {setTargetDate(d); setActiveTab('positioning');}} onDeleteSchedule={(d) => setSavedSchedules(prev => prev.filter(s => s.date !== d))} employees={currentEmployees} />}
              {activeTab === 'positioning' && (
                <Positioning date={targetDate} setDate={setTargetDate} projectedSales={targetSales} employees={currentEmployees.filter(e => e.isActive)} staffingTable={currentStaffingTable} schedule={currentSchedule} setSchedule={setCurrentSchedule} settings={activeRestaurant} hourlyData={hourlyData} onSaveSchedule={handleSaveSchedule} />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
