import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
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
import { Building2, LayoutDashboard, Sliders, TrendingUp, History, Settings as SettingsIcon, LogOut, Menu, ArrowLeft, FileText, Cloud, RefreshCw, CloudOff } from 'lucide-react';

// --- CONFIGURAÇÃO SUPABASE (Definição Direta para evitar erros de ficheiro lib) ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type ModuleType = 'positioning' | 'finance' | 'billing';
type SyncStatus = 'synced' | 'syncing' | 'error';

const App: React.FC = () => {
  const [authenticatedRestaurantId, setAuthenticatedRestaurantId] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState<ModuleType | null>(null);
  const [activeTab, setActiveTab] = useState<string>('positioning');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [lastSync, setLastSync] = useState<string>('');
  
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Estados Globais de Dados
  const [allRestaurants, setAllRestaurants] = useState<AppSettings[]>(INITIAL_RESTAURANTS);
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
    shifts: {},
    lockedShifts: []
  });

  // --- FUNÇÃO MESTRE: Gravar TUDO no Supabase ---
  const saveToCloud = useCallback(async () => {
    if (!authenticatedRestaurantId || !isLoaded) return;
    
    setSyncStatus('syncing');
    const activeRest = allRestaurants.find(r => r.restaurantId === authenticatedRestaurantId);

    const snapshot = {
      settings: activeRest,
      employees: currentEmployees,
      staffingTable: currentStaffingTable,
      history: historyEntries,
      schedules: savedSchedules,
      lastUpdated: new Date().toISOString()
    };

    try {
      const { error } = await supabase
        .from('restaurant_data')
        .upsert({ 
          restaurant_id: authenticatedRestaurantId, 
          data: snapshot,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      setSyncStatus('synced');
      setLastSync(new Date().toLocaleTimeString());
    } catch (e) {
      setSyncStatus('error');
      console.error("Erro na sincronização Cloud:", e);
    }
  }, [authenticatedRestaurantId, allRestaurants, currentEmployees, currentStaffingTable, historyEntries, savedSchedules, isLoaded]);

  // --- FUNÇÃO MESTRE: Carregar TUDO do Supabase ---
  const loadFromCloud = useCallback(async (id: string) => {
    setSyncStatus('syncing');
    try {
      const { data, error } = await supabase
        .from('restaurant_data')
        .select('data')
        .eq('restaurant_id', id)
        .single();

      if (error || !data) throw error;

      const cloud = data.data;
      if (cloud.settings) setAllRestaurants(prev => [cloud.settings, ...prev.filter(r => r.restaurantId !== id)]);
      setCurrentEmployees(cloud.employees || []);
      setCurrentStaffingTable(cloud.staffingTable || DEFAULT_STAFFING_TABLE);
      setHistoryEntries(cloud.history || []);
      setSavedSchedules(cloud.schedules || []);
      
      setSyncStatus('synced');
      setLastSync(new Date().toLocaleTimeString());
      return true;
    } catch (e) {
      setSyncStatus('error');
      return false;
    }
  }, []);

  // Monitor de Alterações para Auto-Save (2 segundos de debounce)
  useEffect(() => {
    if (!isLoaded || !authenticatedRestaurantId) return;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    
    syncTimerRef.current = setTimeout(() => {
      saveToCloud();
    }, 2000);

    return () => { if (syncTimerRef.current) clearTimeout(syncTimerRef.current); };
  }, [currentEmployees, currentStaffingTable, historyEntries, savedSchedules, allRestaurants, saveToCloud, isLoaded, authenticatedRestaurantId]);

  // Login Inicial
  useEffect(() => {
    if (!authenticatedRestaurantId) return;
    const id = authenticatedRestaurantId;
    
    // Tenta carregar local para rapidez, depois Cloud para atualizar
    const local = localStorage.getItem(`app_backup_${id}`);
    if (local) {
      const p = JSON.parse(local);
      setCurrentEmployees(p.employees || MOCK_EMPLOYEES);
      setCurrentStaffingTable(p.staffingTable || DEFAULT_STAFFING_TABLE);
      setHistoryEntries(p.history || MOCK_HISTORY);
      setSavedSchedules(p.schedules || []);
    }
    
    setIsLoaded(true);
    loadFromCloud(id);
  }, [authenticatedRestaurantId, loadFromCloud]);

  // Backup Local de Segurança (LocalStorage)
  useEffect(() => {
    if (!authenticatedRestaurantId || !isLoaded) return;
    const backup = {
      employees: currentEmployees,
      staffingTable: currentStaffingTable,
      history: historyEntries,
      schedules: savedSchedules
    };
    localStorage.setItem(`app_backup_${authenticatedRestaurantId}`, JSON.stringify(backup));
  }, [currentEmployees, currentStaffingTable, historyEntries, savedSchedules, authenticatedRestaurantId, isLoaded]);

  useEffect(() => {
    const existingSchedule = savedSchedules.find(s => s.date === targetDate);
    setCurrentSchedule(existingSchedule ? { ...existingSchedule, lockedShifts: existingSchedule.lockedShifts || [] } : { date: targetDate, shifts: {}, lockedShifts: [] });
    const known = historyEntries.find(s => s.date === targetDate);
    if(known) setTargetSales(known.totalSales);
  }, [targetDate, historyEntries, savedSchedules]);

  const handleLogin = (restaurant: AppSettings) => {
    setAuthenticatedRestaurantId(restaurant.restaurantId);
    handleModuleSelect(null); 
  };

  const handleLogout = () => {
    setAuthenticatedRestaurantId(null);
    setActiveModule(null);
    setIsLoaded(false);
  };

  const handleModuleSelect = (module: ModuleType | null) => {
    setActiveModule(module);
    if (module === 'positioning') setActiveTab('positioning');
    else if (module === 'billing') setActiveTab('deliveries');
    else if (module === 'finance') setActiveTab('finance_summary');
  };

  const handleSaveRestaurantSettings = (updated: AppSettings) => {
    setAllRestaurants(prev => prev.map(r => r.restaurantId === updated.restaurantId ? updated : r));
  };

  const handleSaveSchedule = (scheduleToSave: DailySchedule) => {
    setSavedSchedules(prev => {
        const others = prev.filter(s => s.date !== scheduleToSave.date);
        return [...others, scheduleToSave];
    });
    setCurrentSchedule(scheduleToSave);
  };

  const activeRestaurant = allRestaurants.find(r => r.restaurantId === authenticatedRestaurantId);

  if (!authenticatedRestaurantId || !activeRestaurant) {
    return <Login restaurants={allRestaurants} onLogin={handleLogin} onRegister={(r) => setAllRestaurants(p => [...p, r])} />;
  }

  if (!activeModule) {
    return <ModuleSelector restaurant={activeRestaurant} onSelectModule={handleModuleSelect} onLogout={handleLogout} />;
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
           <button onClick={() => handleModuleSelect(null)} className="w-full flex items-center gap-3 p-3 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white mb-6 border border-slate-700/50">
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
            <>
              <button onClick={() => setActiveTab('deliveries')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${['deliveries', 'credits', 'summary'].includes(activeTab) ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                <FileText size={20} /> {sidebarOpen && <span>Controlo Entregas</span>}
              </button>
              <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                <SettingsIcon size={20} /> {sidebarOpen && <span>Definições Loja</span>}
              </button>
            </>
          )}
        </nav>
        <div className="p-4 border-t border-slate-700">
             <button onClick={handleLogout} className="w-full flex items-center gap-3 p-2 text-slate-400 hover:text-red-400 transition-colors"><LogOut size={20} />{sidebarOpen && <span>Sair</span>}</button>
             <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-full mt-2 flex justify-center text-slate-500"><Menu size={20} /></button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto flex flex-col">
        <header className="bg-white shadow-sm px-6 py-4 sticky top-0 z-10 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800 uppercase tracking-tight">
            {activeModule === 'billing' ? 'Módulo Financeiro / Faturação' : 'Módulo Operacional / Posicionamento'}
          </h2>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase transition-all border ${
              syncStatus === 'synced' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
              syncStatus === 'syncing' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-red-50 text-red-600 border-red-100'
            }`}>
              {syncStatus === 'syncing' ? <RefreshCw size={12} className="animate-spin" /> : syncStatus === 'synced' ? <Cloud size={12} /> : <CloudOff size={12} />}
              {syncStatus === 'syncing' ? 'Sincronizar...' : syncStatus === 'synced' ? `Nuvem OK: ${lastSync}` : 'Erro Nuvem'}
            </div>
          </div>
        </header>

        <div className="p-6 flex-1">
          {activeTab === 'settings' && <Settings settings={activeRestaurant} onSaveSettings={handleSaveRestaurantSettings} employees={currentEmployees} setEmployees={setCurrentEmployees} onExportFullData={() => {}} onImportFullData={() => {}} />}
          
          {activeModule === 'positioning' && (
            <>
              {activeTab === 'positioning' && <Positioning date={targetDate} setDate={setTargetDate} projectedSales={targetSales} employees={currentEmployees.filter(e => e.isActive)} staffingTable={currentStaffingTable} schedule={currentSchedule} setSchedule={setCurrentSchedule} settings={activeRestaurant} hourlyData={hourlyData} onSaveSchedule={handleSaveSchedule} initialShift={targetShift} onShiftChangeComplete={() => setTargetShift(null)} />}
              {activeTab === 'staffing' && <Criteria staffingTable={currentStaffingTable} setStaffingTable={setCurrentStaffingTable} />}
              {activeTab === 'sales_history' && <HistoryForecast history={historyEntries} setHistory={setHistoryEntries} targetDate={targetDate} setTargetDate={setTargetDate} setTargetSales={setTargetSales} setHourlyData={setHourlyData} onNavigateToPositioning={() => setActiveTab('positioning')} />}
              {activeTab === 'schedule_history' && <ScheduleHistory schedules={savedSchedules} onLoadSchedule={(d, s) => { setTargetDate(d); if(s) setTargetShift(s); setActiveTab('positioning'); }} onDeleteSchedule={(d) => setSavedSchedules(prev => prev.filter(s => s.date !== d))} employees={currentEmployees} />}
            </>
          )}

          {activeModule === 'billing' && (
            <BillingControl 
              restaurantId={activeRestaurant.restaurantId} 
              employees={currentEmployees} 
              activeSubTab={activeTab as any}
              onTabChange={setActiveTab}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
