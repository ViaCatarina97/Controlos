import React, { useState, useEffect } from 'react';
import { Settings } from './components/Settings';
import { Criteria } from './components/Criteria';
import { HistoryForecast } from './components/HistoryForecast';
import { Positioning } from './components/Positioning';
import { Login } from './components/Login';
import { ModuleSelector } from './components/ModuleSelector';
import { ScheduleHistory } from './components/ScheduleHistory';
import { AppSettings, Employee, StaffingTableEntry, SalesData, DailySchedule, HourlyProjection } from './types';
import { DEFAULT_SETTINGS, MOCK_EMPLOYEES, DEFAULT_STAFFING_TABLE, STATIONS, INITIAL_RESTAURANTS } from './constants';
import { LayoutDashboard, Sliders, CalendarDays, Settings as SettingsIcon, Menu, LogOut, Building2, ArrowLeft, Construction, History, TrendingUp } from 'lucide-react';

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
  // --- State Management ---
  
  // Auth & Navigation
  const [authenticatedRestaurantId, setAuthenticatedRestaurantId] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState<ModuleType | null>(null);

  // App Specific (Positioning)
  const [activeTab, setActiveTab] = useState<'positioning' | 'staffing' | 'sales_history' | 'schedule_history' | 'settings'>('positioning');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Data Persistence Keys
  const SETTINGS_KEY = 'app_all_restaurants';
  const EMPLOYEES_KEY = (id: string) => `app_employees_${id}`;
  const STAFFING_TABLE_KEY = (id: string) => `app_staffing_table_${id}`; 
  const SALES_KEY = (id: string) => `app_sales_${id}`;
  const SCHEDULES_KEY = (id: string) => `app_schedules_${id}`; // New key for saving schedules

  // Global Data (List of Restaurants)
  const [allRestaurants, setAllRestaurants] = useState<AppSettings[]>(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    const parsed: AppSettings[] = saved ? JSON.parse(saved) : INITIAL_RESTAURANTS;
    
    // Migration: Ensure customStations exists on load if missing (for legacy data)
    return parsed.map(r => ({
      ...r,
      customStations: r.customStations || STATIONS
    }));
  });

  // Active Restaurant Data (Loaded when authenticatedRestaurantId changes)
  const [currentEmployees, setCurrentEmployees] = useState<Employee[]>([]);
  const [currentStaffingTable, setCurrentStaffingTable] = useState<StaffingTableEntry[]>([]); 
  const [currentSales, setCurrentSales] = useState<SalesData[]>([]);
  const [savedSchedules, setSavedSchedules] = useState<DailySchedule[]>([]); // New State
  
  // Positioning context
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [targetSales, setTargetSales] = useState(0);
  const [hourlyData, setHourlyData] = useState<HourlyProjection[]>([]); 

  const [currentSchedule, setCurrentSchedule] = useState<DailySchedule>({
    date: targetDate,
    shifts: {}
  });

  // --- Effects ---

  // Persist Restaurant List
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(allRestaurants));
  }, [allRestaurants]);

  // Load Restaurant Specific Data
  useEffect(() => {
    if (!authenticatedRestaurantId) return;

    const empSaved = localStorage.getItem(EMPLOYEES_KEY(authenticatedRestaurantId));
    setCurrentEmployees(empSaved ? JSON.parse(empSaved) : MOCK_EMPLOYEES);

    const staffingSaved = localStorage.getItem(STAFFING_TABLE_KEY(authenticatedRestaurantId));
    setCurrentStaffingTable(staffingSaved ? JSON.parse(staffingSaved) : DEFAULT_STAFFING_TABLE);

    const salesSaved = localStorage.getItem(SALES_KEY(authenticatedRestaurantId));
    if (salesSaved) {
      setCurrentSales(JSON.parse(salesSaved));
    } else {
      setCurrentSales([
        { date: '2023-10-20', amount: 1500, isForecast: false },
        { date: '2023-10-21', amount: 2100, isForecast: false },
      ]);
    }

    // Load Schedules
    const schedSaved = localStorage.getItem(SCHEDULES_KEY(authenticatedRestaurantId));
    setSavedSchedules(schedSaved ? JSON.parse(schedSaved) : []);

  }, [authenticatedRestaurantId]);

  // Persist Active Data
  useEffect(() => {
    if (!authenticatedRestaurantId) return;
    localStorage.setItem(EMPLOYEES_KEY(authenticatedRestaurantId), JSON.stringify(currentEmployees));
    localStorage.setItem(STAFFING_TABLE_KEY(authenticatedRestaurantId), JSON.stringify(currentStaffingTable));
    localStorage.setItem(SALES_KEY(authenticatedRestaurantId), JSON.stringify(currentSales));
    localStorage.setItem(SCHEDULES_KEY(authenticatedRestaurantId), JSON.stringify(savedSchedules));
  }, [authenticatedRestaurantId, currentEmployees, currentStaffingTable, currentSales, savedSchedules]);

  // Update schedule date key & sales & Load existing schedule if exists
  useEffect(() => {
    // Check if we have a saved schedule for this date
    const existingSchedule = savedSchedules.find(s => s.date === targetDate);
    const today = new Date().toISOString().split('T')[0];
    const isPastDate = targetDate < today;
    
    if (existingSchedule) {
        // If date is past, ensure it's locked regardless of its saved state
        setCurrentSchedule({
          ...existingSchedule,
          isLocked: isPastDate ? true : existingSchedule.isLocked
        });
    } else {
        // Create new blank one
        setCurrentSchedule({ 
          date: targetDate, 
          shifts: {},
          isLocked: isPastDate // If trying to create positioning for a past date, start locked
        });
    }

    const known = currentSales.find(s => s.date === targetDate);
    if(known) setTargetSales(known.amount);
  }, [targetDate, currentSales, savedSchedules]);


  // --- Handlers ---

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
  };

  const handleUpdateSettings = (updated: AppSettings) => {
    setAllRestaurants(prev => prev.map(r => r.restaurantId === updated.restaurantId ? updated : r));
  };

  const handleSaveSchedule = (scheduleToSave: DailySchedule) => {
    // Update local state first
    setCurrentSchedule(scheduleToSave);

    // Update persistence array
    setSavedSchedules(prev => {
        const others = prev.filter(s => s.date !== scheduleToSave.date);
        return [...others, scheduleToSave];
    });

    if(scheduleToSave.isLocked) {
        alert("Posicionamento finalizado e guardado com sucesso!");
    }
  };

  const handleLoadFromHistory = (date: string) => {
    setTargetDate(date);
    setActiveTab('positioning');
  };

  const handleDeleteSchedule = (date: string) => {
    if (confirm(`Tem a certeza que deseja eliminar o registo de ${date}?`)) {
      setSavedSchedules(prev => prev.filter(s => s.date !== date));
      if (targetDate === date) {
        // Reset current schedule if we just deleted the one we are looking at
        setCurrentSchedule({ date, shifts: {} });
      }
    }
  };

  // --- Render Flow ---

  const activeRestaurant = allRestaurants.find(r => r.restaurantId === authenticatedRestaurantId);

  // 1. Not Logged In
  if (!authenticatedRestaurantId || !activeRestaurant) {
    return (
      <Login 
        restaurants={allRestaurants} 
        onLogin={handleLogin}
        onRegister={handleRegister}
      />
    );
  }

  // 2. Module Selector (Dashboard)
  if (!activeModule) {
    return (
      <ModuleSelector 
        restaurant={activeRestaurant} 
        onSelectModule={setActiveModule}
        onLogout={handleLogout}
      />
    );
  }

  // 3. Placeholder for Future Modules
  if (activeModule === 'finance' || activeModule === 'billing') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="bg-white p-12 rounded-2xl shadow-lg text-center max-w-lg border border-gray-200">
           <Construction size={64} className="mx-auto text-blue-500 mb-6" />
           <h2 className="text-3xl font-bold text-gray-800 mb-2">Em Desenvolvimento</h2>
           <p className="text-gray-500 mb-8">
             O módulo de {activeModule === 'finance' ? 'Controlo Financeiro' : 'Controlo de Faturação'} estará disponível em breve.
           </p>
           <button 
             onClick={() => setActiveModule(null)}
             className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
           >
             <ArrowLeft size={18} /> Voltar ao Menu
           </button>
        </div>
      </div>
    );
  }

  // 4. Main App (Positioning Module)
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 text-white transition-all duration-300 flex flex-col shadow-xl z-20`}>
        <div className="p-4 flex items-center gap-3 border-b border-slate-700 h-16">
          <div className="p-1.5 bg-blue-600 rounded-lg shrink-0">
             <Building2 size={20} />
          </div>
          {sidebarOpen && (
              <div className="overflow-hidden">
                  <h1 className="font-bold text-sm tracking-tight truncate">{activeRestaurant.restaurantName}</h1>
                  <p className="text-xs text-slate-400 truncate">Operações</p>
              </div>
          )}
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
           <button 
             onClick={() => setActiveModule(null)}
             className="w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-slate-400 hover:bg-slate-800 hover:text-white mb-6 border border-slate-700/50"
           >
             <ArrowLeft size={20} />
             {sidebarOpen && <span className="font-medium">Menu Principal</span>}
           </button>

          <NavButton 
            active={activeTab === 'positioning'} 
            onClick={() => setActiveTab('positioning')} 
            icon={<LayoutDashboard size={20} />} 
            label="Posicionamento" 
            expanded={sidebarOpen}
          />
           <NavButton 
            active={activeTab === 'staffing'} 
            onClick={() => setActiveTab('staffing')} 
            icon={<Sliders size={20} />} 
            label="Staffing" 
            expanded={sidebarOpen}
          />
           <NavButton 
            active={activeTab === 'sales_history'} 
            onClick={() => setActiveTab('sales_history')} 
            icon={<TrendingUp size={20} />} 
            label="Histórico Vendas" 
            expanded={sidebarOpen}
          />
           <NavButton 
            active={activeTab === 'schedule_history'} 
            onClick={() => setActiveTab('schedule_history')} 
            icon={<History size={20} />} 
            label="Histórico Turnos" 
            expanded={sidebarOpen}
          />
           <NavButton 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')} 
            icon={<SettingsIcon size={20} />} 
            label="Definições" 
            expanded={sidebarOpen}
          />
        </nav>

        <div className="p-4 border-t border-slate-700">
             <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
             >
                <LogOut size={20} />
                {sidebarOpen && <span>Sair</span>}
             </button>
             <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-full mt-2 flex justify-center text-slate-500 hover:text-white">
                <Menu size={20} />
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto flex flex-col">
        <header className="bg-white shadow-sm p-6 sticky top-0 z-10 print:hidden">
          <h2 className="text-2xl font-bold text-gray-800">
            {activeTab === 'positioning' && 'Posicionamento'}
            {activeTab === 'staffing' && 'Staffing'}
            {activeTab === 'sales_history' && 'Histórico de Vendas'}
            {activeTab === 'schedule_history' && 'Histórico de Turnos'}
            {activeTab === 'settings' && 'Definições & Staff'}
          </h2>
        </header>

        <div className="p-6 flex-1">
          {activeTab === 'settings' && (
            <Settings 
                settings={activeRestaurant} 
                onSaveSettings={handleUpdateSettings} 
                employees={currentEmployees} 
                setEmployees={setCurrentEmployees} 
            />
          )}
          {activeTab === 'staffing' && <Criteria staffingTable={currentStaffingTable} setStaffingTable={setCurrentStaffingTable} />}
          {activeTab === 'sales_history' && (
            <HistoryForecast 
              salesData={currentSales} 
              setSalesData={setCurrentSales} 
              targetDate={targetDate}
              setTargetDate={setTargetDate}
              targetSales={targetSales}
              setTargetSales={setTargetSales}
              setHourlyData={setHourlyData}
              onNavigateToPositioning={() => setActiveTab('positioning')}
            />
          )}
          {activeTab === 'schedule_history' && (
            <ScheduleHistory 
              schedules={savedSchedules} 
              onLoadSchedule={handleLoadFromHistory}
              onDeleteSchedule={handleDeleteSchedule}
              employees={currentEmployees}
            />
          )}
          {activeTab === 'positioning' && (
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
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;