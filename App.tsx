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
import { STATIONS, INITIAL_RESTAURANTS, MOCK_EMPLOYEES, DEFAULT_STAFFING_TABLE, MOCK_HISTORY } from './constants';
import { Building2, LayoutDashboard, Sliders, TrendingUp, History, Settings as SettingsIcon, LogOut, Menu, ArrowLeft, Cloud, FileText, Loader2, Receipt } from 'lucide-react';

// --- CONFIGURAÇÃO SUPABASE ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

type ModuleType = 'positioning' | 'finance' | 'billing';

const App: React.FC = () => {
  const [authenticatedRestaurantId, setAuthenticatedRestaurantId] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState<ModuleType | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
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

  // --- SINCRONIZAÇÃO NUVEM (GRAVAÇÃO E LEITURA) ---

  const syncToCloud = useCallback(async (manualSchedules?: DailySchedule[]) => {
    if (!authenticatedRestaurantId || !isLoaded) return;
    setIsSyncing(true);
    
    try {
      const { error } = await supabase.from('restaurant_data').upsert({
        restaurant_id: authenticatedRestaurantId,
        employees: currentEmployees,
        staffing_table: currentStaffingTable,
        history: historyEntries,
        schedules: manualSchedules || savedSchedules,
        updated_at: new Date().toISOString()
      }, { onConflict: 'restaurant_id' });

      if (error) throw error;
    } catch (err) {
      console.error("Erro na sincronização:", err);
    } finally {
      setTimeout(() => setIsSyncing(false), 500);
    }
  }, [authenticatedRestaurantId, isLoaded, currentEmployees, currentStaffingTable, historyEntries, savedSchedules]);

  const loadDataFromCloud = async (restaurantId: string) => {
    setIsLoaded(false);
    try {
      const { data } = await supabase.from('restaurant_data').select('*').eq('restaurant_id', restaurantId).single();
      if (data) {
        setCurrentEmployees(data.employees || MOCK_EMPLOYEES);
        setCurrentStaffingTable(data.staffing_table || DEFAULT_STAFFING_TABLE);
        setHistoryEntries(data.history || MOCK_HISTORY);
        setSavedSchedules(data.schedules || []);
      }
    } catch (err) { console.error(err); } 
    finally { setIsLoaded(true); }
  };

  // --- HANDLERS ESPECÍFICOS ---

  const handleSaveSchedule = async (scheduleToSave: DailySchedule) => {
    // 1. Atualiza o estado visual
    setCurrentSchedule(scheduleToSave);
    
    // 2. Prepara a nova lista de turnos
    const updatedSchedules = [...savedSchedules.filter(s => s.date !== scheduleToSave.date), scheduleToSave];
    setSavedSchedules(updatedSchedules);
    
    // 3. Força a gravação imediata na nuvem
    await syncToCloud(updatedSchedules);
    
    if(scheduleToSave.isLocked) alert("Posicionamento Finalizado e Gravado!");
  };

  // Processamento de faturas HAVI
  const processarFaturaHavi = async (file: File, restaurantId: string) => {
    setIsProcessingInvoice(true);
    const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
    if (!GEMINI_KEY) { alert("Configure VITE_GEMINI_API_KEY"); setIsProcessingInvoice(false); return; }
    
    try {
      const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });

      [cite_start]const prompt = "Analise esta fatura da HAVI Logistics[cite: 1]. [cite_start]Extraia Nº DOCUMENTO [cite: 29, 65][cite_start], DATA DOCUMENTO [cite: 30] [cite_start]e a tabela TOTAL POR GRUPO PRODUTO[cite: 57, 58]. [cite_start]Devolva JSON: {documento, data, grupos: [{nome, total}], total_liquido [cite: 58, 60]}";

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: file.type, data: base64Data } }] }] })
      });

      const data = await response.json();
      const textoLimpo = data.candidates[0].content.parts[0].text.replace(/```json|```/g, '');
      const faturaExtraida = JSON.parse(textoLimpo);

      await supabase.from('faturas_havi').insert({
        restaurant_id: restaurantId,
        num_documento: faturaExtraida.documento,
        data_documento: faturaExtraida.data,
        dados_grupos: faturaExtraida.grupos,
        valor_total_liquido: faturaExtraida.total_liquido
      });
      alert("Fatura Gravada!");
    } catch (error) { alert("Erro ao processar"); } 
    finally { setIsProcessingInvoice(false); }
  };

  useEffect(() => {
    if (authenticatedRestaurantId) loadDataFromCloud(authenticatedRestaurantId);
  }, [authenticatedRestaurantId]);

  // Auto-save para definições e funcionários (3 segundos)
  useEffect(() => {
    if (!isLoaded) return;
    const timer = setTimeout(() => syncToCloud(), 3000);
    return () => clearTimeout(timer);
  }, [currentEmployees, currentStaffingTable, historyEntries, syncToCloud]);

  useEffect(() => {
    const existing = savedSchedules.find(s => s.date === targetDate);
    if (existing) setCurrentSchedule(existing);
    else setCurrentSchedule({ date: targetDate, shifts: {} });
  }, [targetDate, savedSchedules]);

  const activeRestaurant = allRestaurants.find(r => r.restaurantId === authenticatedRestaurantId);

  if (!authenticatedRestaurantId || !activeRestaurant) {
    return <Login restaurants={allRestaurants} onLogin={(r) => setAuthenticatedRestaurantId(r.restaurantId)} onRegister={(r) => { setAllRestaurants(prev => [...prev, r]); setAuthenticatedRestaurantId(r.restaurantId); }} />;
  }

  if (!activeModule) {
    return <ModuleSelector restaurant={activeRestaurant} onSelectModule={(m) => { setActiveModule(m); setActiveTab(m === 'billing' ? 'havi_invoices' : 'positioning'); }} onLogout={() => setAuthenticatedRestaurantId(null)} />;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 text-white transition-all duration-300 flex flex-col z-20`}>
        <div className="p-4 border-b border-slate-700 h-16 flex items-center gap-3">
          <Building2 size={20} className="text-blue-500" />
          {sidebarOpen && <span className="font-bold truncate text-sm">{activeRestaurant.restaurantName}</span>}
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveModule(null)} className="w-full flex items-center gap-3 p-3 rounded-lg text-slate-400 hover:bg-slate-800 mb-4 border border-slate-700/30">
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
            <>
              <button onClick={() => setActiveTab('havi_invoices')} className={`w-full flex items-center gap-3 p-3 rounded-lg ${activeTab === 'havi_invoices' ? 'bg-blue-600' : ''}`}><FileText size={20} />{sidebarOpen && <span>Faturas HAVI</span>}</button>
            </>
          )}
          <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 p-3 rounded-lg ${activeTab === 'settings' ? 'bg-blue-600' : ''}`}><SettingsIcon size={20} />{sidebarOpen && <span>Definições</span>}</button>
        </nav>
        <div className="p-4 border-t border-slate-700">
          <button onClick={() => setAuthenticatedRestaurantId(null)} className="flex items-center gap-3 p-2 text-slate-400 hover:text-red-400"><LogOut size={20} />{sidebarOpen && <span>Sair</span>}</button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto flex flex-col">
        <header className="bg-white shadow-sm p-4 flex justify-between items-center h-16 sticky top-0 z-10">
          <h2 className="font-bold text-gray-800 uppercase text-sm tracking-widest">{activeTab}</h2>
          {isSyncing && <div className="text-blue-600 text-xs flex items-center gap-2"><Cloud size={14} className="animate-pulse" /> Sincronizando...</div>}
        </header>
        <div className="p-6">
          {!isLoaded ? <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-500" size={40} /></div> : (
            <>
              {activeTab === 'positioning' && <Positioning date={targetDate} setDate={setTargetDate} projectedSales={targetSales} employees={currentEmployees.filter(e => e.isActive)} staffingTable={currentStaffingTable} schedule={currentSchedule} setSchedule={setCurrentSchedule} settings={activeRestaurant} hourlyData={hourlyData} onSaveSchedule={handleSaveSchedule} />}
              {activeTab === 'havi_invoices' && (
                <div className="max-w-xl mx-auto bg-white p-10 rounded-2xl shadow-sm border-2 border-dashed flex flex-col items-center">
                  <FileText size={48} className="text-blue-500 mb-4" />
                  <h3 className="font-bold mb-2">Carregar Fatura HAVI</h3>
                  <input type="file" accept="application/pdf,image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f && authenticatedRestaurantId) processarFaturaHavi(f, authenticatedRestaurantId); }} className="hidden" id="inv-up" />
                  <label htmlFor="inv-up" className="mt-4 px-8 py-3 bg-blue-600 text-white rounded-lg font-bold cursor-pointer">{isProcessingInvoice ? 'Processando...' : 'Selecionar Ficheiro'}</label>
                </div>
              )}
              {activeTab === 'settings' && <Settings settings={activeRestaurant} onSaveSettings={(u) => setAllRestaurants(prev => prev.map(r => r.restaurantId === u.restaurantId ? u : r))} employees={currentEmployees} setEmployees={setCurrentEmployees} />}
              {activeTab === 'staffing' && <Criteria staffingTable={currentStaffingTable} setStaffingTable={setCurrentStaffingTable} />}
              {activeTab === 'sales_history' && <HistoryForecast history={historyEntries} setHistory={setHistoryEntries} targetDate={targetDate} setTargetDate={setTargetDate} targetSales={targetSales} setTargetSales={setTargetSales} setHourlyData={setHourlyData} onNavigateToPositioning={() => setActiveTab('positioning')} />}
              {activeTab === 'schedule_history' && <ScheduleHistory schedules={savedSchedules} onLoadSchedule={(d) => {setTargetDate(d); setActiveTab('positioning');}} onDeleteSchedule={(d) => setSavedSchedules(prev => prev.filter(s => s.date !== d))} employees={currentEmployees} />}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
