
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Settings } from './components/Settings';
import { Criteria } from './components/Criteria';
import { HistoryForecast } from './components/HistoryForecast';
import { Positioning } from './components/Positioning';
import { Login } from './components/Login';
import { ModuleSelector } from './components/ModuleSelector';
import { ScheduleHistory } from './components/ScheduleHistory';
import { BillingControl } from './components/BillingControl';
import { AppSettings, Employee, StaffingTableEntry, DailySchedule, HourlyProjection, HistoryEntry, ShiftType, RestaurantDataSnapshot } from './types';
import { MOCK_EMPLOYEES, DEFAULT_STAFFING_TABLE, STATIONS, INITIAL_RESTAURANTS, MOCK_HISTORY } from './constants';
import { Building2, LayoutDashboard, Sliders, TrendingUp, History, Settings as SettingsIcon, LogOut, Menu, ArrowLeft, FileText, Cloud, CloudOff, RefreshCw, CheckCircle2 } from 'lucide-react';

type ModuleType = 'positioning' | 'finance' | 'billing';
type SyncStatus = 'synced' | 'syncing' | 'error' | 'offline';

const App: React.FC = () => {
  const [authenticatedRestaurantId, setAuthenticatedRestaurantId] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState<ModuleType | null>(null);
  const [activeTab, setActiveTab] = useState<'positioning' | 'staffing' | 'sales_history' | 'schedule_history' | 'settings' | 'billing_main'>('positioning');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [syncKey, setSyncKey] = useState<string>(() => localStorage.getItem('app_sync_key') || '');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  
  // Use ReturnType to avoid NodeJS namespace dependency in browser environment
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // --- Serviço de Sincronização Online ---
  const saveToCloud = useCallback(async () => {
    if (!syncKey || !authenticatedRestaurantId) return;
    
    setSyncStatus('syncing');
    const snapshot: RestaurantDataSnapshot = {
      settings: allRestaurants.find(r => r.restaurantId === authenticatedRestaurantId)!,
      employees: currentEmployees,
      staffingTable: currentStaffingTable,
      history: historyEntries,
      schedules: savedSchedules,
      lastUpdated: new Date().toISOString()
    };

    try {
      // Usando uma API pública de KV Storage para demonstração de sincronização online real
      await fetch(`https://kvdb.io/B1N5Y9Xp7z8R2M4k6L9q/${syncKey}`, {
        method: 'POST',
        body: JSON.stringify(snapshot)
      });
      setSyncStatus('synced');
    } catch (e) {
      setSyncStatus('error');
      console.error("Erro na sincronização cloud:", e);
    }
  }, [syncKey, authenticatedRestaurantId, allRestaurants, currentEmployees, currentStaffingTable, historyEntries, savedSchedules]);

  const loadFromCloud = useCallback(async (key: string) => {
    setSyncStatus('syncing');
    try {
      const response = await fetch(`https://kvdb.io/B1N5Y9Xp7z8R2M4k6L9q/${key}`);
      if (response.ok) {
        const data: RestaurantDataSnapshot = await response.json();
        setAllRestaurants(prev => {
          const others = prev.filter(r => r.restaurantId !== data.settings.restaurantId);
          return [...others, data.settings];
        });
        setAuthenticatedRestaurantId(data.settings.restaurantId);
        setCurrentEmployees(data.employees);
        setCurrentStaffingTable(data.staffingTable);
        setHistoryEntries(data.history);
        setSavedSchedules(data.schedules);
        setSyncStatus('synced');
        return true;
      }
    } catch (e) {
      setSyncStatus('error');
    }
    return false;
  }, []);

  // Monitor de alterações para Auto-Save
  useEffect(() => {
    if (!isLoaded || !syncKey) return;
    
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      saveToCloud();
    }, 2000); // Grava 2 segundos após a última alteração

    return () => { if (syncTimerRef.current) clearTimeout(syncTimerRef.current); };
  }, [currentEmployees, currentStaffingTable, historyEntries, savedSchedules, allRestaurants, isLoaded, syncKey, saveToCloud]);

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

  // Persistência Local (Backup)
  useEffect(() => {
    if (!authenticatedRestaurantId || !isLoaded) return;
    const id = authenticatedRestaurantId;
    localStorage.setItem('app_all_restaurants', JSON.stringify(allRestaurants));
    localStorage.setItem(`app_employees_${id}`, JSON.stringify(currentEmployees));
    localStorage.setItem(`app_staffing_table_${id}`, JSON.stringify(currentStaffingTable));
    localStorage.setItem(`app_history_detailed_${id}`, JSON.stringify(historyEntries));
    localStorage.setItem(`app_schedules_${id}`, JSON.stringify(savedSchedules));
    if (syncKey) localStorage.setItem('app_sync_key', syncKey);
  }, [allRestaurants, currentEmployees, currentStaffingTable, historyEntries, savedSchedules, authenticatedRestaurantId, isLoaded, syncKey]);

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

  const handleCloudLogin = async (key: string) => {
    const success = await loadFromCloud(key);
    if (success) {
      setSyncKey(key);
      localStorage.setItem('app_sync_key', key);
    } else {
      alert("Chave de sincronização não encontrada ou erro de rede.");
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
    return <Login restaurants={allRestaurants} onLogin={handleLogin} onRegister={handleRegister} onCloudLogin={handleCloudLogin} />;
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
              {syncStatus === 'syncing' ? <RefreshCw size={12} className="animate-spin" /> : 
               syncStatus === 'synced' ? <Cloud size={12} /> : <CloudOff size={12} />}
              {syncStatus === 'syncing' ? 'A Sincronizar...' : 
               syncStatus === 'synced' ? 'Nuvem Atualizada' : 'Erro de Ligação'}
            </div>
            {syncKey && (
              <button onClick={() => loadFromCloud(syncKey)} className="p-2 text-gray-400 hover:text-blue-600 transition-colors" title="Forçar Atualização">
                <RefreshCw size={18} />
              </button>
            )}
          </div>
        </header>

        <div className="p-6 flex-1">
          {activeTab === 'settings' && <Settings settings={activeRestaurant} onSaveSettings={setAllRestaurants as any} employees={currentEmployees} setEmployees={setCurrentEmployees} syncKey={syncKey} setSyncKey={setSyncKey} onRefresh={() => loadFromCloud(syncKey)} />}
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
