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

// --- CONFIGURAÇÃO DIRETA SUPABASE ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const App: React.FC = () => {
  const [authenticatedRestaurantId, setAuthenticatedRestaurantId] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState<'positioning' | 'finance' | 'billing' | null>(null);
  const [activeTab, setActiveTab] = useState<string>('positioning');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');
  const [lastSync, setLastSync] = useState<string>('');
  
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Estados dos Dados para Persistência Total
  const [allRestaurants, setAllRestaurants] = useState<AppSettings[]>(INITIAL_RESTAURANTS);
  const [currentEmployees, setCurrentEmployees] = useState<Employee[]>([]);
  const [currentStaffingTable, setCurrentStaffingTable] = useState<StaffingTableEntry[]>([]); 
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [savedSchedules, setSavedSchedules] = useState<DailySchedule[]>([]);
  
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [targetShift, setTargetShift] = useState<ShiftType | null>(null);
  const [targetSales, setTargetSales] = useState(0);
  const [hourlyData, setHourlyData] = useState<HourlyProjection[]>([]); 
  const [currentSchedule, setCurrentSchedule] = useState<DailySchedule>({ date: targetDate, shifts: {}, lockedShifts: [] });

  // --- GRAVAÇÃO MESTRE NO SUPABASE ---
  const saveToCloud = useCallback(async () => {
    if (!authenticatedRestaurantId || !isLoaded) return;
    setSyncStatus('syncing');
    
    const activeRest = allRestaurants.find(r => r.restaurantId === authenticatedRestaurantId);
    
    // O Objeto que contém TUDO o que pediu para gravar
    const snapshot = {
      settings: activeRest,        // Definições e Postos
      employees: currentEmployees, // Lista de funcionários
      staffingTable: currentStaffingTable, // Staffing alterado
      history: historyEntries,     // Vendas importadas
      schedules: savedSchedules,   // Posicionamentos finalizados
      lastUpdated: new Date().toISOString()
    };

    try {
      await supabase.from('restaurant_data').upsert({ 
        restaurant_id: authenticatedRestaurantId, 
        data: snapshot,
        updated_at: new Date().toISOString()
      });
      setSyncStatus('synced');
      setLastSync(new Date().toLocaleTimeString());
    } catch (e) {
      setSyncStatus('error');
    }
  }, [authenticatedRestaurantId, allRestaurants, currentEmployees, currentStaffingTable, historyEntries, savedSchedules, isLoaded]);

  // Carregamento inicial da Nuvem
  useEffect(() => {
    if (!authenticatedRestaurantId) return;
    const loadData = async () => {
      const { data } = await supabase.from('restaurant_data').select('data').eq('restaurant_id', authenticatedRestaurantId).single();
      if (data?.data) {
        const cloud = data.data;
        if (cloud.settings) setAllRestaurants(prev => [cloud.settings, ...prev.filter(r => r.restaurantId !== authenticatedRestaurantId)]);
        setCurrentEmployees(cloud.employees || []);
        setCurrentStaffingTable(cloud.staffingTable || DEFAULT_STAFFING_TABLE);
        setHistoryEntries(cloud.history || []);
        setSavedSchedules(cloud.schedules || []);
      }
      setIsLoaded(true);
    };
    loadData();
  }, [authenticatedRestaurantId]);

  // Monitor de Auto-Save (Grava 2 segundos após a última alteração)
  useEffect(() => {
    if (!isLoaded || !authenticatedRestaurantId) return;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => saveToCloud(), 2000);
    return () => { if (syncTimerRef.current) clearTimeout(syncTimerRef.current); };
  }, [currentEmployees, currentStaffingTable, historyEntries, savedSchedules, allRestaurants, saveToCloud, isLoaded, authenticatedRestaurantId]);

  const activeRestaurant = allRestaurants.find(r => r.restaurantId === authenticatedRestaurantId);

  if (!authenticatedRestaurantId || !activeRestaurant) {
    return <Login restaurants={allRestaurants} onLogin={(r) => setAuthenticatedRestaurantId(r.restaurantId)} onRegister={(r) => setAllRestaurants(p => [...p, r])} />;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 text-white transition-all duration-300 flex flex-col shadow-xl z-20`}>
        <div className="p-4 border-b border-slate-700 h-16 flex items-center gap-3">
          <div className="p-1.5 bg-blue-600 rounded-lg"><Building2 size={20} /></div>
          {sidebarOpen && <h1 className="font-bold text-sm truncate">{activeRestaurant.restaurantName}</h1>}
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <button onClick={() => setActiveModule(null)} className="w-full flex items-center gap-3 p-3 rounded-lg text-slate-400 hover:bg-slate-800 mb-6 border border-slate-700/50">
            <ArrowLeft size={20} /> {sidebarOpen && <span>Menu Principal</span>}
          </button>
          {/* Navegação simplificada baseada no módulo ativo */}
          <button onClick={() => setActiveTab('positioning')} className={`w-full flex items-center gap-3 p-3 rounded-lg ${activeTab === 'positioning' ? 'bg-blue-600' : ''}`}><LayoutDashboard size={20} /> {sidebarOpen && <span>Posicionamento</span>}</button>
          <button onClick={() => setActiveTab('billing')} className={`w-full flex items-center gap-3 p-3 rounded-lg ${activeTab === 'billing' ? 'bg-blue-600' : ''}`}><FileText size={20} /> {sidebarOpen && <span>Faturação</span>}</button>
        </nav>
      </aside>

      <main className="flex-1 overflow-auto flex flex-col">
        <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800 uppercase">Sistema de Gestão Restaurante</h2>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase border border-emerald-100 bg-emerald-50 text-emerald-600">
            {syncStatus === 'syncing' ? <RefreshCw size={12} className="animate-spin" /> : <Cloud size={12} />}
            {syncStatus === 'syncing' ? 'A Gravar...' : `Nuvem OK: ${lastSync}`}
          </div>
        </header>

        <div className="p-6 flex-1">
          {activeTab === 'positioning' && <Positioning date={targetDate} setDate={setTargetDate} projectedSales={targetSales} employees={currentEmployees.filter(e => e.isActive)} staffingTable={currentStaffingTable} schedule={currentSchedule} setSchedule={setCurrentSchedule} settings={activeRestaurant} hourlyData={hourlyData} onSaveSchedule={(s) => setSavedSchedules(prev => [...prev.filter(x => x.date !== s.date), s])} initialShift={targetShift} onShiftChangeComplete={() => setTargetShift(null)} />}
          {activeTab === 'billing' && <BillingControl restaurantId={activeRestaurant.restaurantId} employees={currentEmployees} activeSubTab="deliveries" onTabChange={() => {}} />}
        </div>
      </main>
    </div>
  );
};

export default App;
