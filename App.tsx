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
import { 
  AppSettings, Employee, StaffingTableEntry, DailySchedule, 
  HourlyProjection, HistoryEntry, ShiftType, RestaurantDataSnapshot 
} from './types';
import { 
  MOCK_EMPLOYEES, DEFAULT_STAFFING_TABLE, STATIONS, 
  INITIAL_RESTAURANTS, MOCK_HISTORY 
} from './constants';
import { 
  Building2, LayoutDashboard, Sliders, TrendingUp, History, 
  Settings as SettingsIcon, LogOut, Menu, ArrowLeft, FileText, 
  Cloud, CloudOff, RefreshCw 
} from 'lucide-react';

// --- Configuração do Supabase ---
const supabaseUrl = 'URL_DO_TEU_SUPABASE';
const supabaseAnonKey = 'CHAVE_ANON_DO_SUPABASE';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type ModuleType = 'positioning' | 'finance' | 'billing';
type SyncStatus = 'synced' | 'syncing' | 'error' | 'offline';

const App: React.FC = () => {
  const [authenticatedRestaurantId, setAuthenticatedRestaurantId] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState<ModuleType | null>(null);
  const [activeTab, setActiveTab] = useState<'positioning' | 'staffing' | 'sales_history' | 'schedule_history' | 'settings' | 'billing_main'>('positioning');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Estados dos Dados (O que queremos gravar)
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

  // --- FUNÇÃO MESTRE: Gravar tudo no Supabase ---
  const saveToCloud = useCallback(async () => {
    if (!authenticatedRestaurantId) return;
    
    setSyncStatus('syncing');
    
    const activeRest = allRestaurants.find(r => r.restaurantId === authenticatedRestaurantId);
    if (!activeRest) return;

    const snapshot: RestaurantDataSnapshot = {
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
    } catch (e) {
      setSyncStatus('error');
      console.error("Erro ao gravar na nuvem:", e);
    }
  }, [authenticatedRestaurantId, allRestaurants, currentEmployees, currentStaffingTable, historyEntries, savedSchedules]);

  // --- FUNÇÃO MESTRE: Carregar tudo do Supabase ---
  const loadFromCloud = useCallback(async (id: string) => {
    setSyncStatus('syncing');
    try {
      const { data, error } = await supabase
        .from('restaurant_data')
        .select('data')
        .eq('restaurant_id', id)
        .single();

      if (error || !data) throw error;

      const cloud: RestaurantDataSnapshot = data.data;
      
      setAllRestaurants(prev => {
        const others = prev.filter(r => r.restaurantId !== id);
        return [...others, cloud.settings];
      });
      setCurrentEmployees(cloud.employees);
      setCurrentStaffingTable(cloud.staffingTable);
      setHistoryEntries(cloud.history);
      setSavedSchedules(cloud.schedules);
      
      setSyncStatus('synced');
      return true;
    } catch (e) {
      console.error("Erro ao carregar da nuvem:", e);
      setSyncStatus('error');
      return false;
    }
  }, []);

  // Monitor de Auto-Save (Dispara 2s após qualquer alteração)
  useEffect(() => {
    if (!isLoaded || !authenticatedRestaurantId) return;
    
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      saveToCloud();
    }, 2000);

    return () => { if (syncTimerRef.current) clearTimeout(syncTimerRef.current); };
  }, [currentEmployees, currentStaffingTable, historyEntries, savedSchedules, allRestaurants, isLoaded, saveToCloud, authenticatedRestaurantId]);

  // Login Local Inicial
  useEffect(() => {
    if (!authenticatedRestaurantId) return;
    const id = authenticatedRestaurantId;
    
    // Tenta carregar do local primeiro para rapidez, depois sincroniza nuvem
    const localData = localStorage.getItem(`app_backup_${id}`);
    if (localData) {
      const parsed = JSON.parse(localData);
      setCurrentEmployees(parsed.employees || MOCK_EMPLOYEES);
      setCurrentStaffingTable(parsed.staffingTable || DEFAULT_STAFFING_TABLE);
      setHistoryEntries(parsed.history || MOCK_HISTORY);
      setSavedSchedules(parsed.schedules || []);
    }
    
    setIsLoaded(true);
    loadFromCloud(id); // Sincroniza com a nuvem logo após entrar
  }, [authenticatedRestaurantId, loadFromCloud]);

  // Backup Local de Segurança
  useEffect(() => {
    if (!authenticatedRestaurantId || !isLoaded) return;
    const id = authenticatedRestaurantId;
    const backup = {
      employees: currentEmployees,
      staffingTable: currentStaffingTable,
      history: historyEntries,
      schedules: savedSchedules
    };
    localStorage.setItem(`app_backup_${id}`, JSON.stringify(backup));
  }, [currentEmployees, currentStaffingTable, historyEntries, savedSchedules, authenticatedRestaurantId, isLoaded]);

  // Lógica de navegação de data
  useEffect(() => {
    const existingSchedule = savedSchedules.find(s => s.date === targetDate);
    setCurrentSchedule(existingSchedule ? { ...existingSchedule, lockedShifts: existingSchedule.lockedShifts || [] } : { date: targetDate, shifts: {}, lockedShifts: [] });
    const known = historyEntries.find(s => s.date === targetDate);
    if(known) setTargetSales(known.totalSales);
  }, [targetDate, historyEntries, savedSchedules]);

  const handleLogin = (restaurant: AppSettings) => {
    setAuthenticatedRestaurantId(restaurant.restaurantId);
    setActiveModule(null); 
  };

  const handleCloudLogin = async (key: string) => {
    const success = await loadFromCloud(key);
    if (success) {
      setAuthenticatedRestaurantId(key);
      setActiveModule(null);
    } else {
      alert("Restaurante não encontrado na base de dados Cloud.");
    }
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

  const activeRestaurant = allRestaurants.find(r => r.restaurantId === authenticatedRestaurantId);

  if (!authenticatedRestaurantId || !activeRestaurant) {
    return <Login restaurants={allRestaurants} onLogin={handleLogin} onRegister={(r) => setAllRestaurants(p => [...p, r])} onCloudLogin={handleCloudLogin} />;
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
                  <p className="text-xs text-slate-400 truncate">{activeModule === 'billing' ? 'Faturação' : 'Operações'}</p>
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
              <FileText size={20} /> {sidebarOpen && <span>Faturação HAVI</span>}
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
          
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase transition-all border ${
              syncStatus === 'synced' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
              syncStatus === 'syncing' ? 'bg-blue-50 text-blue-600 border-blue-100' :
              syncStatus === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-gray-50 text-gray-400 border-gray-100'
            }`}>
              {syncStatus === 'syncing' ? <RefreshCw size={12} className="animate-spin" /> : <Cloud size={12} />}
              {syncStatus === 'syncing' ? 'A Sincronizar...' : syncStatus === 'synced' ? 'Nuvem Atualizada' : 'Erro Nuvem'}
            </div>
            <button onClick={() => loadFromCloud(authenticatedRestaurantId!)} className="p-2 text-gray-400 hover:text-blue-600 transition-colors" title="Forçar Atualização">
              <RefreshCw size={18} />
            </button>
          </div>
        </header>

        <div className="p-6 flex-1">
          {activeTab === 'settings' && <Settings settings={activeRestaurant} onSaveSettings={setAllRestaurants as any} employees={currentEmployees} setEmployees={setCurrentEmployees} syncKey={authenticatedRestaurantId || ''} setSyncKey={() => {}} onRefresh={() => loadFromCloud(authenticatedRestaurantId!)} />}
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
