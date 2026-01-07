
import React, { useState, useEffect } from 'react';
import { Settings } from './components/Settings';
import { Criteria } from './components/Criteria';
import { HistoryForecast } from './components/HistoryForecast';
import { Login } from './components/Login';
import { ModuleSelector } from './components/ModuleSelector';
import { ScheduleHistory } from './components/ScheduleHistory';
import { BillingControl } from './components/BillingControl';
// Added missing import for Positioning component
import { Positioning } from './components/Positioning';
import { AppSettings, Employee, StaffingTableEntry, DailySchedule, HourlyProjection, HistoryEntry, ShiftType } from './types';
import { MOCK_EMPLOYEES, DEFAULT_STAFFING_TABLE, STATIONS, INITIAL_RESTAURANTS, MOCK_HISTORY } from './constants';
import { 
  Building2, LayoutDashboard, Sliders, TrendingUp, History, 
  Settings as SettingsIcon, LogOut, Menu, ArrowLeft, FileText, 
  CheckCircle2, CloudCheck, Lock, ShieldAlert, KeyRound
} from 'lucide-react';

type ModuleType = 'positioning' | 'finance' | 'billing';

const ADMIN_PASSWORD = 'Imperial96';

const App: React.FC = () => {
  const [authenticatedRestaurantId, setAuthenticatedRestaurantId] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState<ModuleType | null>(null);
  const [activeTab, setActiveTab] = useState<string>('positioning');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [lastSync, setLastSync] = useState<string>(new Date().toLocaleTimeString());
  
  // Admin Protection State
  const [isAdminAuthorized, setIsAdminAuthorized] = useState(false);
  const [lockPassword, setLockPassword] = useState('');
  const [lockError, setLockError] = useState(false);

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

  // Persistência Local Automática Total
  useEffect(() => {
    if (!authenticatedRestaurantId || !isLoaded) return;
    const id = authenticatedRestaurantId;
    
    localStorage.setItem('app_all_restaurants', JSON.stringify(allRestaurants));
    localStorage.setItem(`app_employees_${id}`, JSON.stringify(currentEmployees));
    localStorage.setItem(`app_staffing_table_${id}`, JSON.stringify(currentStaffingTable));
    localStorage.setItem(`app_history_detailed_${id}`, JSON.stringify(historyEntries));
    localStorage.setItem(`app_schedules_${id}`, JSON.stringify(savedSchedules));
    
    setLastSync(new Date().toLocaleTimeString());
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
    handleModuleSelect(null); 
  };

  const handleLogin = (restaurant: AppSettings) => {
    setAuthenticatedRestaurantId(restaurant.restaurantId);
    handleModuleSelect(null); 
  };

  const handleLogout = () => {
    setAuthenticatedRestaurantId(null);
    setActiveModule(null);
    setIsLoaded(false);
    setIsAdminAuthorized(false);
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

  const handleUnlockAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (lockPassword === ADMIN_PASSWORD) {
        setIsAdminAuthorized(true);
        setLockPassword('');
        setLockError(false);
    } else {
        setLockError(true);
        setLockPassword('');
    }
  };

  const exportFullStoreData = () => {
    const restaurant = allRestaurants.find(r => r.restaurantId === authenticatedRestaurantId);
    if (!restaurant) return;
    const exportData = {
        restaurant,
        employees: currentEmployees,
        staffingTable: currentStaffingTable,
        history: historyEntries,
        schedules: savedSchedules,
        exportTimestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BASE_DADOS_OPERACIONAL_${restaurant.restaurantName.replace(/\s+/g, '_')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importFullStoreData = (data: any) => {
    if (!data.restaurant || !data.employees) {
        alert("Ficheiro de importação inválido.");
        return;
    }
    if (confirm("Isto irá substituir TODOS os dados locais deste restaurante pelos do ficheiro. Continuar?")) {
        setAllRestaurants(prev => {
            const others = prev.filter(r => r.restaurantId !== data.restaurant.restaurantId);
            return [...others, data.restaurant];
        });
        setAuthenticatedRestaurantId(data.restaurant.restaurantId);
        setCurrentEmployees(data.employees);
        setCurrentStaffingTable(data.staffingTable || DEFAULT_STAFFING_TABLE);
        setHistoryEntries(data.history || []);
        setSavedSchedules(data.schedules || []);
        alert("Dados restaurados com sucesso neste dispositivo.");
    }
  };

  const activeRestaurant = allRestaurants.find(r => r.restaurantId === authenticatedRestaurantId);

  if (!authenticatedRestaurantId || !activeRestaurant) {
    return <Login restaurants={allRestaurants} onLogin={handleLogin} onRegister={handleRegister} />;
  }

  if (!activeModule) {
    return <ModuleSelector restaurant={activeRestaurant} onSelectModule={handleModuleSelect} onLogout={handleLogout} />;
  }

  const renderProtectedTab = (content: React.ReactNode) => {
    if (!isAdminAuthorized) {
        return (
            <div className="h-full flex items-center justify-center animate-fade-in">
                <div className="bg-white p-12 rounded-3xl shadow-2xl border border-gray-100 max-w-md w-full text-center space-y-6">
                    <div className="inline-flex p-4 bg-blue-50 text-blue-600 rounded-full">
                        <Lock size={48} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">Área Restrita</h2>
                        <p className="text-sm text-gray-400 font-bold uppercase tracking-wider mt-1">Apenas Administradores</p>
                    </div>
                    
                    <form onSubmit={handleUnlockAdmin} className="space-y-4 pt-4">
                        <div className="relative">
                            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                                type="password" 
                                placeholder="Palavra-passe de gestão..."
                                value={lockPassword}
                                onChange={(e) => setLockPassword(e.target.value)}
                                className={`w-full pl-12 pr-4 py-4 bg-gray-50 border rounded-2xl outline-none transition-all font-bold ${lockError ? 'border-red-500 focus:ring-red-200' : 'border-gray-200 focus:ring-2 focus:ring-blue-500'}`}
                                autoFocus
                            />
                        </div>
                        {lockError && (
                            <p className="text-red-500 text-[10px] font-black uppercase flex items-center justify-center gap-1 animate-pulse">
                                <ShieldAlert size={12} /> Palavra-passe incorreta
                            </p>
                        )}
                        <button 
                            type="submit"
                            className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-slate-800 transition-all shadow-xl active:scale-95 uppercase text-xs tracking-widest"
                        >
                            Desbloquear Acesso
                        </button>
                    </form>
                </div>
            </div>
        );
    }
    return content;
  };

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
            {activeModule === 'billing' ? 'Módulo Financeiro / Faturação' : 'Gestão Operacional | Posicionamento'}
          </h2>
          <div className="flex items-center gap-4">
            <div className="text-[10px] font-black uppercase text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100 flex items-center gap-1">
                <CloudCheck size={12} className="text-emerald-500" />
                Dados Locais: {lastSync}
            </div>
          </div>
        </header>

        <div className="p-6 flex-1">
          {/* Definições (Protegido) */}
          {activeTab === 'settings' && renderProtectedTab(
             <Settings 
                settings={activeRestaurant} 
                onSaveSettings={handleSaveRestaurantSettings} 
                employees={currentEmployees} 
                setEmployees={setCurrentEmployees} 
                onExportFullData={exportFullStoreData} 
                onImportFullData={importFullStoreData} 
             />
          )}
          
          {/* Subpáginas do Módulo de Posicionamento */}
          {activeModule === 'positioning' && (
            <>
              {activeTab === 'positioning' && <Positioning date={targetDate} setDate={setTargetDate} projectedSales={targetSales} employees={currentEmployees.filter(e => e.isActive)} staffingTable={currentStaffingTable} schedule={currentSchedule} setSchedule={setCurrentSchedule} settings={activeRestaurant} hourlyData={hourlyData} onSaveSchedule={handleSaveSchedule} initialShift={targetShift} onShiftChangeComplete={() => setTargetShift(null)} />}
              
              {/* Staffing (Protegido) */}
              {activeTab === 'staffing' && renderProtectedTab(
                <Criteria 
                    staffingTable={currentStaffingTable} 
                    setStaffingTable={setCurrentStaffingTable} 
                />
              )}

              {activeTab === 'sales_history' && <HistoryForecast history={historyEntries} setHistory={setHistoryEntries} targetDate={targetDate} setTargetDate={setTargetDate} targetSales={targetSales} setTargetSales={setTargetSales} setHourlyData={setHourlyData} onNavigateToPositioning={() => setActiveTab('positioning')} />}
              {activeTab === 'schedule_history' && <ScheduleHistory schedules={savedSchedules} onLoadSchedule={(d, s) => { setTargetDate(d); if(s) setTargetShift(s); setActiveTab('positioning'); }} onDeleteSchedule={(d) => setSavedSchedules(prev => prev.filter(s => s.date !== d))} employees={currentEmployees} />}
            </>
          )}

          {/* Subpáginas do Módulo de Faturação */}
          {activeModule === 'billing' && (
            <>
              {(['deliveries', 'credits', 'summary'].includes(activeTab)) && (
                <BillingControl 
                  restaurantId={activeRestaurant.restaurantId} 
                  employees={currentEmployees} 
                  activeSubTab={activeTab as any}
                  onTabChange={setActiveTab}
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
