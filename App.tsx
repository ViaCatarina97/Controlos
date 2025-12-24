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

// --- CONFIGURAÇÃO SUPABASE INTEGRADA ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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

  // --- LÓGICA DE PROCESSAMENTO HAVI ---
  const processarFaturaHavi = async (file: File, restaurantId: string) => {
    setIsProcessingInvoice(true);
    const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;

    if (!GEMINI_KEY) {
      alert("Erro: Configure VITE_GEMINI_API_KEY no Vercel.");
      setIsProcessingInvoice(false);
      return;
    }
    
    try {
      const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });

      const prompt = `Analise esta fatura da HAVI Logistics. 
      Extraia o 'Nº DOCUMENTO' e 'DATA DOCUMENTO'.
      Na tabela 'TOTAL POR GRUPO PRODUTO', extraia cada GRUPO e o respetivo VALOR TOTAL.
      Responda apenas em JSON puro:
      {
        "documento": "string",
        "data": "YYYY-MM-DD",
        "grupos": [{"nome": "string", "total": number}],
        "total_liquido": number
      }`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: file.type, data: base64Data } }
            ]
          }]
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      const textoLimpo = data.candidates[0].content.parts[0].text.replace(/```json|```/g, '');
      const faturaExtraida = JSON.parse(textoLimpo);

      const { error: supabaseError } = await supabase.from('faturas_havi').insert({
        restaurant_id: restaurantId,
        num_documento: faturaExtraida.documento,
        data_documento: faturaExtraida.data,
        dados_grupos: faturaExtraida.grupos,
        valor_total_liquido: faturaExtraida.total_liquido
      });

      if (supabaseError) throw supabaseError;
      alert("Fatura HAVI gravada com sucesso!");
    } catch (error: any) {
      alert("Erro no processamento: " + error.message);
    } finally {
      setIsProcessingInvoice(false);
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
      }
    } catch (err) { console.error(err); } finally { setTimeout(() => setIsLoaded(true), 600); }
  };

  const syncToCloud = useCallback(async (manualSchedules?: DailySchedule[]) => {
    if (!authenticatedRestaurantId || !isLoaded) return;
    setIsSyncing(true);
    try {
      await supabase.from('restaurant_data').upsert({
        restaurant_id: authenticatedRestaurantId,
        employees: currentEmployees,
        staffing_table: currentStaffingTable,
        history: historyEntries,
        schedules: manualSchedules || savedSchedules,
        updated_at: new Date().toISOString()
      });
    } finally { setTimeout(() => setIsSyncing(false), 500); }
  }, [authenticatedRestaurantId, isLoaded, currentEmployees, currentStaffingTable, historyEntries, savedSchedules]);

  useEffect(() => {
    if (!isLoaded) return;
    const timer = setTimeout(() => syncToCloud(), 3000);
    return () => clearTimeout(timer);
  }, [currentEmployees, currentStaffingTable, historyEntries, syncToCloud]);

  useEffect(() => {
    if (authenticatedRestaurantId) loadDataFromCloud(authenticatedRestaurantId);
  }, [authenticatedRestaurantId]);

  const activeRestaurant = allRestaurants.find(r => r.restaurantId === authenticatedRestaurantId);

  if (!authenticatedRestaurantId || !activeRestaurant) {
    return <Login restaurants={allRestaurants} onLogin={(r) => setAuthenticatedRestaurantId(r.restaurantId)} onRegister={(r) => { setAllRestaurants(prev => [...prev, r]); setAuthenticatedRestaurantId(r.restaurantId); }} />;
  }

  if (!activeModule) {
    return <ModuleSelector restaurant={activeRestaurant} onSelectModule={(m) => { setActiveModule(m); setActiveTab(m === 'billing' ? 'havi_invoices' : 'positioning'); }} onLogout={() => setAuthenticatedRestaurantId(null)} />;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 text-white transition-all duration-300 flex flex-col z-20 shadow-2xl`}>
        <div className="p-4 flex items-center gap-3 border-b border-slate-700 h-16">
          <div className="p-1.5 bg-blue-600 rounded-lg shrink-0"><Building2 size={20} /></div>
          {sidebarOpen && <h1 className="font-bold text-sm truncate">{activeRestaurant.restaurantName}</h1>}
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveModule(null)} className="w-full flex items-center gap-3 p-3 rounded-lg text-slate-400 hover:bg-slate-800 mb-4 border border-slate-700/30 transition-all">
            <ArrowLeft size={20} /> {sidebarOpen && <span>Menu Principal</span>}
          </button>

          {activeModule === 'positioning' ? (
            <>
              <NavButton active={activeTab === 'positioning'} onClick={() => setActiveTab('positioning')} icon={<LayoutDashboard size={20} />} label="Posicionamento" expanded={sidebarOpen} />
              <NavButton active={activeTab === 'staffing'} onClick={() => setActiveTab('staffing')} icon={<Sliders size={20} />} label="Staffing" expanded={sidebarOpen} />
              <NavButton active={activeTab === 'sales_history'} onClick={() => setActiveTab('sales_history')} icon={<TrendingUp size={20} />} label="Vendas" expanded={sidebarOpen} />
              <NavButton active={activeTab === 'schedule_history'} onClick={() => setActiveTab('schedule_history')} icon={<History size={20} />} label="Turnos" expanded={sidebarOpen} />
            </>
          ) : activeModule === 'billing' ? (
            <>
              <NavButton active={activeTab === 'havi_invoices'} onClick={() => setActiveTab('havi_invoices')} icon={<FileText size={20} />} label="Faturas HAVI" expanded={sidebarOpen} />
              <NavButton active={activeTab === 'billing_history'} onClick={() => setActiveTab('billing_history')} icon={<Receipt size={20} />} label="Histórico" expanded={sidebarOpen} />
            </>
          ) : null}

          <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<SettingsIcon size={20} />} label="Definições" expanded={sidebarOpen} />
        </nav>

        <div className="p-4 border-t border-slate-700">
          <button onClick={() => setAuthenticatedRestaurantId(null)} className="w-full flex items-center gap-3 p-2 text-slate-400 hover:text-red-400"><LogOut size={20} /> {sidebarOpen && <span>Sair</span>}</button>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-full mt-2 flex justify-center text-slate-500 hover:text-white"><Menu size={20} /></button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto flex flex-col">
        <header className="bg-white shadow-sm p-6 h-16 flex items-center justify-between sticky top-0 z-10">
          <h2 className="text-xl font-bold text-gray-800 capitalize">{activeTab.replace('_', ' ')}</h2>
          {isSyncing && <div className="text-blue-600 text-xs flex items-center gap-2"><Cloud size={14} className="animate-pulse" /> Sincronizando...</div>}
        </header>

        <div className="p-6 flex-1">
          {!isLoaded ? (
            <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={32} /></div>
          ) : (
            <>
              {activeTab === 'havi_invoices' && (
                <div className="max-w-4xl mx-auto py-10">
                  <div className="bg-white p-12 rounded-2xl shadow-sm border-2 border-dashed border-gray-200 text-center">
                    <FileText className="mx-auto text-blue-500 mb-4" size={56} />
                    <h3 className="text-2xl font-bold mb-2">Controlo de Faturação HAVI</h3>
                    <p className="text-gray-500 mb-8 max-w-sm mx-auto">Carregue a fatura para extrair o Nº do Documento  e Totais por Grupo.</p>
                    <input type="file" accept="application/pdf,image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f && authenticatedRestaurantId) processarFaturaHavi(f, authenticatedRestaurantId); }} disabled={isProcessingInvoice} className="hidden" id="invoice-up" />
                    <label htmlFor="invoice-up" className={`cursor-pointer inline-flex items-center gap-3 px-10 py-4 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg ${isProcessingInvoice ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      {isProcessingInvoice ? <Loader2 className="animate-spin" size={20} /> : 'Selecionar Fatura'}
                    </label>
                  </div>
                </div>
              )}
              {activeTab === 'settings' && <Settings settings={activeRestaurant} onSaveSettings={(u) => setAllRestaurants(prev => prev.map(r => r.restaurantId === u.restaurantId ? u : r))} employees={currentEmployees} setEmployees={setCurrentEmployees} />}
              {activeTab === 'staffing' && <Criteria staffingTable={currentStaffingTable} setStaffingTable={setCurrentStaffingTable} />}
              {activeTab === 'sales_history' && <HistoryForecast history={historyEntries} setHistory={setHistoryEntries} targetDate={targetDate} setTargetDate={setTargetDate} targetSales={targetSales} setTargetSales={setTargetSales} setHourlyData={setHourlyData} onNavigateToPositioning={() => setActiveTab('positioning')} />}
              {activeTab === 'schedule_history' && <ScheduleHistory schedules={savedSchedules} onLoadSchedule={(d) => {setTargetDate(d); setActiveTab('positioning');}} onDeleteSchedule={(d) => setSavedSchedules(prev => prev.filter(s => s.date !== d))} employees={currentEmployees} />}
              {activeTab === 'positioning' && <Positioning date={targetDate} setDate={setTargetDate} projectedSales={targetSales} employees={currentEmployees.filter(e => e.isActive)} staffingTable={currentStaffingTable} schedule={currentSchedule} setSchedule={setCurrentSchedule} settings={activeRestaurant} hourlyData={hourlyData} onSaveSchedule={(s) => {setCurrentSchedule(s); setSavedSchedules(prev => [...prev.filter(x => x.date !== s.date), s]); syncToCloud();}} />}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
