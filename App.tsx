import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Settings } from './components/Settings';
import { Criteria } from './components/Criteria';
import { HistoryForecast } from './components/HistoryForecast';
import { Positioning } from './components/Positioning';
import { Login } from './components/Login';
import { ModuleSelector } from './components/ModuleSelector';
import { ScheduleHistory } from './components/ScheduleHistory';
import { AppSettings, Employee, StaffingTableEntry, DailySchedule, HourlyProjection, HistoryEntry } from './types';
import { INITIAL_RESTAURANTS, MOCK_EMPLOYEES, DEFAULT_STAFFING_TABLE, MOCK_HISTORY } from './constants';
import { Building2, LayoutDashboard, Sliders, TrendingUp, History, Settings as SettingsIcon, LogOut, Menu, ArrowLeft, Cloud, FileText, Loader2, Receipt } from 'lucide-react';

// --- CONFIGURAÇÃO SUPABASE ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

type ModuleType = 'positioning' | 'finance' | 'billing';

const App: React.FC = () => {
  const [authenticatedRestaurantId, setAuthenticatedRestaurantId] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState<ModuleType | null>(null);
  const [activeTab, setActiveTab] = useState<string>('positioning');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isProcessingInvoice, setIsProcessingInvoice] = useState(false);
  
  const [allRestaurants, setAllRestaurants] = useState<AppSettings[]>(INITIAL_RESTAURANTS);
  const [currentEmployees, setCurrentEmployees] = useState<Employee[]>([]);
  const [currentStaffingTable, setCurrentStaffingTable] = useState<StaffingTableEntry[]>([]); 
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [savedSchedules, setSavedSchedules] = useState<DailySchedule[]>([]);
  
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [targetSales, setTargetSales] = useState(0);
  const [hourlyData, setHourlyData] = useState<HourlyProjection[]>([]); 
  const [currentSchedule, setCurrentSchedule] = useState<DailySchedule>({ date: targetDate, shifts: {} });

  // --- FUNÇÃO DE GRAVAÇÃO MESTRE ---
  const forceSync = async (overrides: any = {}) => {
    if (!authenticatedRestaurantId) return;
    setIsSyncing(true);
    
    const dataToSave = {
      restaurant_id: authenticatedRestaurantId,
      employees: overrides.employees !== undefined ? overrides.employees : currentEmployees,
      staffing_table: overrides.staffing_table !== undefined ? overrides.staffing_table : currentStaffingTable,
      history: overrides.history !== undefined ? overrides.history : historyEntries,
      schedules: overrides.schedules !== undefined ? overrides.schedules : savedSchedules,
      settings: overrides.settings !== undefined ? overrides.settings : allRestaurants.find(r => r.restaurantId === authenticatedRestaurantId),
      updated_at: new Date().toISOString()
    };

    try {
      const { error } = await supabase.from('restaurant_data').upsert(dataToSave, { onConflict: 'restaurant_id' });
      if (error) throw error;
    } catch (err) {
      console.error("Erro ao gravar:", err);
    } finally {
      setTimeout(() => setIsSyncing(false), 500);
    }
  };

  const loadDataFromCloud = async (restaurantId: string) => {
    setIsLoaded(false);
    try {
      const { data } = await supabase.from('restaurant_data').select('*').eq('restaurant_id', restaurantId).single();
      if (data) {
        setCurrentEmployees(data.employees || MOCK_EMPLOYEES);
        setCurrentStaffingTable(data.staffing_table || DEFAULT_STAFFING_TABLE);
        setHistoryEntries(data.history || MOCK_HISTORY);
        setSavedSchedules(data.schedules || []);
        if (data.settings) {
          setAllRestaurants(prev => prev.map(r => r.restaurantId === restaurantId ? { ...r, ...data.settings } : r));
        }
      }
    } finally { setIsLoaded(true); }
  };

  // --- HANDLERS ---
  const handleSaveSettings = (updatedSettings: AppSettings) => {
    setAllRestaurants(prev => prev.map(r => r.restaurantId === updatedSettings.restaurantId ? updatedSettings : r));
    forceSync({ settings: updatedSettings });
  };

  const handleSaveSchedule = async (scheduleToSave: DailySchedule) => {
    setCurrentSchedule(scheduleToSave);
    const updated = [...savedSchedules.filter(s => s.date !== scheduleToSave.date), scheduleToSave];
    setSavedSchedules(updated);
    await forceSync({ schedules: updated });
  };

  const processarFaturaHavi = async (file: File, restaurantId: string) => {
    setIsProcessingInvoice(true);
    const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
    try {
      const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });

      const prompt = "Analise esta fatura da HAVI Logistics. Extraia o Nº DOCUMENTO, a DATA DOCUMENTO e a tabela TOTAL POR GRUPO PRODUTO. Devolva em JSON: {documento: string, data: string, grupos: [{nome: string, total: number}], total_liquido: number}";

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: file.type, data: base64Data } }] }] })
      });

      const data = await response.json();
      const textoLimpo = data.candidates[0].content.parts[0].text.replace(/```json|```/g, '');
      const f = JSON.parse(textoLimpo);

      await supabase.from('faturas_havi').insert({
        restaurant_id: restaurantId,
        num_documento: f.documento, // 
        data_documento: f.data, // 
        dados_grupos: f.grupos, // 
        valor_total_liquido: f.total_liquido // [cite: 58, 60]
      });
      alert("Fatura Gravada!");
    } catch (e) { alert("Erro ao processar"); } finally { setIsProcessingInvoice(false); }
  };

  useEffect(() => {
    if (authenticatedRestaurantId) loadDataFromCloud(authenticatedRestaurantId);
  }, [authenticatedRestaurantId]);

  useEffect(() => {
    const existing = savedSchedules.find(s => s.date === targetDate);
    setCurrentSchedule(existing || { date: targetDate, shifts: {} });
  }, [targetDate, savedSchedules]);

  const activeRestaurant = allRestaurants.find(r => r.restaurantId === authenticatedRestaurantId);

  if (!authenticatedRestaurantId || !activeRestaurant) {
    return <Login restaurants={allRestaurants} onLogin={(r) => setAuthenticatedRestaurantId(r.restaurantId)} onRegister={(r) => { setAllRestaurants(prev => [...prev, r]); setAuthenticatedRestaurantId(r.restaurantId); }} />;
  }

  if (!activeModule) {
    return <ModuleSelector restaurant={activeRestaurant} onSelectModule={(m) => { setActiveModule(m); setActiveTab(m === 'billing' ? 'havi_invoices' : 'positioning'); }} onLogout={() => setAuthenticatedRestaurantId(null)} />;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden text-slate-900">
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 text-white transition-all duration-300 flex flex-col z-20 shadow-2xl`}>
        <div className="p-4 border-b border-slate-700 h-16 flex items-center gap-3">
          <Building2 size={20} className="text-blue-500" />
          {sidebarOpen && <span className="font-bold truncate text-sm">{activeRestaurant.restaurantName}</span>}
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveModule(null)} className="w-full flex items-center gap-3 p-3 rounded-lg text-slate-400 hover:bg-slate-800 mb-4 border border-slate-700/30 transition-all">
            <ArrowLeft size={20} /> {sidebarOpen && <span>Menu Principal</span>}
          </button>
          {activeModule === 'positioning' ? (
            <>
              <button onClick={() => setActiveTab('positioning')} className={`w-full flex items-center gap-3 p-3 rounded-lg ${activeTab === 'positioning' ? 'bg-blue-600' : ''}`}><LayoutDashboard size={20} />{sidebarOpen && <span>Posicionamento</span>}</button>
              <button onClick={() => setActiveTab('staffing')} className={`w-full flex items-center gap-3 p-3 rounded-lg ${activeTab === 'staffing' ? 'bg-blue-600' : ''}`}><Sliders size={20} />{sidebarOpen && <span>Staffing</span>}</button>
              <button onClick={() => setActiveTab('sales_history')} className={`w-full flex items-center gap-3 p-3 rounded-lg ${activeTab === 'sales_history' ? 'bg-blue-600' : ''}`}><TrendingUp size={20} />{sidebarOpen && <span>Vendas</span>}</button>
              <button onClick={() => setActiveTab('schedule_history')} className={`w-full flex items-center gap-3 p-3 rounded-lg ${activeTab === 'schedule_history' ? 'bg-blue-600' : ''}`}><History size={20} />{sidebarOpen && <span>Turnos</span>}</button>
            </>
          ) : (
            <button onClick={() => setActiveTab('havi_invoices')} className={`w-full flex items-center gap-3 p-3 rounded-lg ${activeTab === 'havi_invoices' ? 'bg-blue-600' : ''}`}><FileText size={20} />{sidebarOpen && <span>Faturas HAVI</span>}</button>
          )}
          <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 p-3 rounded-lg ${activeTab === 'settings' ? 'bg-blue-600' : ''}`}><SettingsIcon size={20} />{sidebarOpen && <span>Definições</span>}</button>
        </nav>
      </aside>

      <main className="flex-1 overflow-auto flex flex-col">
        <header className="bg-white shadow-sm p-4 flex justify-between items-center h-16 sticky top-0 z-10 px-8 font-bold text-xs tracking-widest uppercase">
          {activeTab}
          {isSyncing && <div className="text-blue-600 flex items-center gap-2"><Cloud size={14} className="animate-pulse" /> GRAVANDO...</div>}
        </header>
        <div className="p-8">
          {!isLoaded ? <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-500" size={40} /></div> : (
            <>
              {activeTab === 'positioning' && <Positioning date={targetDate} setDate={setTargetDate} projectedSales={targetSales} employees={currentEmployees.filter(e => e.isActive)} staffingTable={currentStaffingTable} schedule={currentSchedule} setSchedule={setCurrentSchedule} settings={activeRestaurant} hourlyData={hourlyData} onSaveSchedule={handleSaveSchedule} />}
              {activeTab === 'havi_invoices' && (
                <div className="max-w-xl mx-auto bg-white p-12 rounded-3xl shadow-sm border-2 border-dashed border-gray-200 flex flex-col items-center">
                  <FileText size={48} className="text-blue-500 mb-4" />
                  <h3 className="text-xl font-bold mb-2">Controlo Faturação HAVI</h3>
                  <input type="file" accept="application/pdf,image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f && authenticatedRestaurantId) processarFaturaHavi(f, authenticatedRestaurantId); }} className="hidden" id="inv-up" />
                  <label htmlFor="inv-up" className="mt-4 px-10 py-4 bg-blue-600 text-white rounded-2xl font-bold cursor-pointer">{isProcessingInvoice ? 'Processando...' : 'Carregar Fatura'}</label>
                </div>
              )}
              {activeTab === 'settings' && <Settings settings={activeRestaurant} onSaveSettings={handleSaveSettings} employees={currentEmployees} setEmployees={(emps) => { setCurrentEmployees(emps); forceSync({ employees: emps }); }} />}
              {activeTab === 'staffing' && <Criteria staffingTable={currentStaffingTable} setStaffingTable={(st) => { setCurrentStaffingTable(st); forceSync({ staffing_table: st }); }} />}
              {activeTab === 'sales_history' && <HistoryForecast history={historyEntries} setHistory={(h) => { setHistoryEntries(h); forceSync({ history: h }); }} targetDate={targetDate} setTargetDate={setTargetDate} targetSales={targetSales} setTargetSales={setTargetSales} setHourlyData={setHourlyData} onNavigateToPositioning={() => setActiveTab('positioning')} />}
              {activeTab === 'schedule_history' && <ScheduleHistory schedules={savedSchedules} onLoadSchedule={(d) => {setTargetDate(d); setActiveTab('positioning');}} onDeleteSchedule={(d) => { const filtered = savedSchedules.filter(s => s.date !== d); setSavedSchedules(filtered); forceSync({ schedules: filtered }); }} employees={currentEmployees} />}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
