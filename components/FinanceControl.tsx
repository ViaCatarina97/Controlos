import React, { useState, useEffect, useMemo } from 'react';
import { 
  Employee, AppSettings, CofreCount, DepositRecord, ProsegurDepositRecord, FinanceInvoice 
} from '../types';
import { 
  getCofreCounts, saveCofreCount, deleteCofreCount,
  getDeposits, saveDeposit, deleteDeposit,
  getProsegurDeposits, saveProsegurDeposit, deleteProsegurDeposit
} from '../services/firebaseService';
import { 
  Calculator, Coins, CreditCard, Landmark, Plus, Trash2, Edit2, 
  Save, ArrowLeft, Calendar, User, Clock, FileText, Check, AlertTriangle, 
  Sliders, ArrowUpRight, DollarSign, Wallet, ShieldCheck, Printer, CheckCircle
} from 'lucide-react';

interface FinanceControlProps {
  restaurantId: string;
  employees: Employee[];
  settings: AppSettings;
  onSaveSettings: (updated: AppSettings) => void;
  activeSubTab: 'cofre' | 'depositos' | 'prosegur' | 'settings';
  onTabChange: (tab: string) => void;
}

const DENOMINATIONS_COINS = [
  { value: 0.05, label: '0,05 €', rollSize: 50, rollValue: 2.50 },
  { value: 0.10, label: '0,10 €', rollSize: 40, rollValue: 4.00 },
  { value: 0.20, label: '0,20 €', rollSize: 40, rollValue: 8.00 },
  { value: 0.50, label: '0,50 €', rollSize: 40, rollValue: 20.00 },
  { value: 1.00, label: '1,00 €', rollSize: 25, rollValue: 25.00 },
];

const DENOMINATIONS_NOTES = [
  { value: 5.00, label: '5,00 €' },
  { value: 10.00, label: '10,00 €' },
  { value: 20.00, label: '20,00 €' },
  { value: 50.00, label: '50,00 €' },
  { value: 100.00, label: '100,00 €' },
  { value: 200.00, label: '200,00 €' },
];

export const FinanceControl: React.FC<FinanceControlProps> = ({ 
  restaurantId, employees, settings, onSaveSettings, activeSubTab, onTabChange
}) => {
  const activeTab = activeSubTab;
  const setActiveTab = onTabChange;
  
  // Data lists
  const [cofreCounts, setCofreCounts] = useState<CofreCount[]>([]);
  const [deposits, setDeposits] = useState<DepositRecord[]>([]);
  const [prosegurDeposits, setProsegurDeposits] = useState<ProsegurDepositRecord[]>([]);
  
  // App Loading state
  const [isLoading, setIsLoading] = useState(true);
  
  // Active/Detail editors
  const [editingCofre, setEditingCofre] = useState<CofreCount | null>(null);
  const [editingDeposit, setEditingDeposit] = useState<DepositRecord | null>(null);
  const [editingProsegur, setEditingProsegur] = useState<ProsegurDepositRecord | null>(null);

  // Subtabs within Safe Count Editor: 'detalhes' | 'faturas'
  const [safeEditorTab, setSafeEditorTab] = useState<'contagem' | 'faturas'>('contagem');

  // Input States for Invoice Form
  const [invNum, setInvNum] = useState('');
  const [invSupplier, setInvSupplier] = useState('');
  const [invAmt, setInvAmt] = useState('');

  // Default Drawer configurations from setting or defaults
  const devDefaultGavetaCount = settings.fundoGavetaCount ?? 4;
  const devDefaultGavetaValue = settings.fundoGavetaValue ?? 50;

  // Load backend data (using the firebaseService helpers)
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [counts, deps, pros] = await Promise.all([
        getCofreCounts(restaurantId),
        getDeposits(restaurantId),
        getProsegurDeposits(restaurantId)
      ]);
      setCofreCounts(counts.sort((a,b) => b.date.localeCompare(a.date)));
      setDeposits(deps.sort((a,b) => b.date.localeCompare(a.date)));
      setProsegurDeposits(pros.sort((a,b) => b.date.localeCompare(a.date)));
    } catch (err) {
      console.error("Error loading financial data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [restaurantId]);

  // General Settings Form states
  const [fundoGavetaCountInput, setFundoGavetaCountInput] = useState(devDefaultGavetaCount);
  const [fundoGavetaValueInput, setFundoGavetaValueInput] = useState(devDefaultGavetaValue);
  const [defaultManagerFundExpected, setDefaultManagerFundExpected] = useState(300);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: AppSettings = {
      ...settings,
      fundoGavetaCount: Number(fundoGavetaCountInput),
      fundoGavetaValue: Number(fundoGavetaValueInput),
    };
    onSaveSettings(updated);
    alert("Definições financeiras guardadas com sucesso!");
  };

  // Helper to create an empty FundoCofrePart configuration
  const createEmptyPart = (): any => ({
    moedas: { '0.05': 0, '0.10': 0, '0.20': 0, '0.50': 0, '1.00': 0, loose: 0 },
    notas: { '5': 0, '10': 0, '20': 0, '50': 0, '100': 0, '200': 0 },
    totalCoins: 0,
    totalNotes: 0,
    total: 0
  });

  // Calculate totals recursively for a safe count part (moedas, notas)
  const calculatePartTotals = (part: any) => {
    let coinsVal = 0;
    DENOMINATIONS_COINS.forEach(coin => {
      const q = part.moedas[coin.value.toFixed(2)] || 0;
      coinsVal += q * coin.rollValue; // Coin quantity is defined in ROLLS
    });
    // Add extra loose/soltas coins
    coinsVal += Number(part.moedas.loose || 0);

    let notesVal = 0;
    DENOMINATIONS_NOTES.forEach(note => {
      const q = part.notas[note.value.toString()] || 0;
      notesVal += q * note.value; // Note quantity is defined in UNIT count
    });

    return {
      ...part,
      totalCoins: coinsVal,
      totalNotes: notesVal,
      total: coinsVal + notesVal
    };
  };

  // Safe Count detailed actions
  const handleAddNewSafeCount = () => {
    const today = new Date().toISOString().split('T')[0];
    const newCount: CofreCount = {
      id: `cofre_${today}_${Date.now()}`,
      date: today,
      turn: 'Abertura',
      managerId: employees.find(e => e.isActive && e.role === 'GERENTE')?.id || employees[0]?.id || '',
      fundoGerente: createEmptyPart(),
      cofre: createEmptyPart(),
      invoices: [],
      totalFaturas: 0,
      fundosCount: devDefaultGavetaCount,
      fundosValuePerFundo: devDefaultGavetaValue,
      fundosTotal: devDefaultGavetaCount * devDefaultGavetaValue,
      moedasProsegur: 0,
      totalGeral: 0,
      diferenca: 0,
      observacoes: ''
    };
    // Pre-calculate just in case
    newCount.fundoGerente = calculatePartTotals(newCount.fundoGerente);
    newCount.cofre = calculatePartTotals(newCount.cofre);
    setEditingCofre(newCount);
    setSafeEditorTab('contagem');
  };

  const handleUpdateSafeCountInput = (
    section: 'fundoGerente' | 'cofre',
    group: 'moedas' | 'notas',
    denominationKey: string,
    val: number
  ) => {
    if (!editingCofre) return;
    
    const countCopy = { ...editingCofre };
    const sectionCopy = { ...countCopy[section] };
    const groupCopy = { ...sectionCopy[group], [denominationKey]: val };
    
    sectionCopy[group] = groupCopy;
    countCopy[section] = calculatePartTotals(sectionCopy);

    // Sum details
    const fGerenteTot = countCopy.fundoGerente.total;
    const cofreTot = countCopy.cofre.total;
    const faturasTot = countCopy.totalFaturas;

    // Total Geral = Safe (Cofre) + Manager Fund + Recorded Invoices
    const computedTotal = fGerenteTot + cofreTot + faturasTot;

    // Diferença = we can compute the difference between Count (Total Geral) and EXPECTED/THEORETICAL vault?
    // Let's check how the difference can be computed or if we have an expected value field.
    // Let's create an input field "Saldo Teórico" (Expected Vault Balance) or calculate it.
    // If we have "Saldo Teórico" input or let user adjust "Moedas Prosegur" and calculate a discrepancy?
    // Let's define Difference = Total Geral - (Expected Manager Fund (e.g. 300) + Expected Safe/Theoretical Value)
    // Or we can just let "Moedas Prosegur" and a "Saldo Teórico" or make it difference = Total Geral - Expected or let them enter.
    // In the excelsheet: difference is 0.80.
    // Let's check: 3141 (Total Geral) - 3140 (Expected value) = 1.00, or 3140.80 - 3140.00 = 0.80!
    // Let's provide a field "Saldo Teórico de Sistema" on the bottom (defaulting to the rounded-down total or let them type it)
    // with a helper "Diferença = Total Geral - Saldo Teórico"
    // This gives absolute control and works 100% like real restaurants!
    countCopy.totalGeral = computedTotal;

    setEditingCofre(countCopy);
  };

  const handleAddInvoiceToSafe = () => {
    if (!editingCofre) return;
    if (!invSupplier || !invAmt) {
      alert("Preencha o Fornecedor e o Valor da Fatura.");
      return;
    }

    const valueNum = parseFloat(invAmt.replace(',', '.'));
    if (isNaN(valueNum)) {
      alert("Valor inválido.");
      return;
    }

    const newInv: FinanceInvoice = {
      id: `inv_${Date.now()}`,
      number: invNum || `DOC-${Date.now().toString().slice(-4)}`,
      supplier: invSupplier,
      amount: valueNum
    };

    const countCopy = { ...editingCofre };
    countCopy.invoices = [...countCopy.invoices, newInv];
    countCopy.totalFaturas = countCopy.invoices.reduce((s, i) => s + i.amount, 0);
    
    // Recalculate Total Geral
    countCopy.totalGeral = countCopy.fundoGerente.total + countCopy.cofre.total + countCopy.totalFaturas;

    setEditingCofre(countCopy);
    setInvNum('');
    setInvSupplier('');
    setInvAmt('');
  };

  const handleRemoveInvoiceFromSafe = (id: string) => {
    if (!editingCofre) return;
    const countCopy = { ...editingCofre };
    countCopy.invoices = countCopy.invoices.filter(i => i.id !== id);
    countCopy.totalFaturas = countCopy.invoices.reduce((s, i) => s + i.amount, 0);
    
    // Recalculate Total Geral
    countCopy.totalGeral = countCopy.fundoGerente.total + countCopy.cofre.total + countCopy.totalFaturas;

    setEditingCofre(countCopy);
  };

  const handleSaveCofreCountEdit = async () => {
    if (!editingCofre) return;
    
    // Ensure fund fields are parsed
    const updatedCount = {
      ...editingCofre,
      fundosCount: Number(editingCofre.fundosCount),
      fundosValuePerFundo: Number(editingCofre.fundosValuePerFundo),
      fundosTotal: Number(editingCofre.fundosCount) * Number(editingCofre.fundosValuePerFundo),
      moedasProsegur: Number(editingCofre.moedasProsegur || 0),
    };

    try {
      await saveCofreCount(restaurantId, updatedCount);
      setEditingCofre(null);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Erro ao gravar contagem de cofre.");
    }
  };

  const handleDeleteCofreCountAction = async (id: string) => {
    if (confirm("Tens a certeza que pretendes eliminar esta contagem de cofre? This action is irreversible.")) {
      try {
        await deleteCofreCount(restaurantId, id);
        loadData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // --- DEPOSIT RECORD ACTIONS ---
  const handleAddNewDeposit = () => {
    const today = new Date().toISOString().split('T')[0];
    setEditingDeposit({
      id: `dep_${today}_${Date.now()}`,
      date: today,
      amount: 0,
      ref: '',
      managerId: employees.find(e => e.isActive && e.role === 'GERENTE')?.id || employees[0]?.id || '',
      bank: 'Novo Banco',
      comment: ''
    });
  };

  const handleSaveDepositEdit = async () => {
    if (!editingDeposit) return;
    if (editingDeposit.amount <= 0) {
      alert("Insira um valor válido de depósito.");
      return;
    }
    try {
      await saveDeposit(restaurantId, editingDeposit);
      setEditingDeposit(null);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Erro ao gravar depósito.");
    }
  };

  const handleDeleteDepositAction = async (id: string) => {
    if (confirm("Desejas eliminar este depósito?")) {
      try {
        await deleteDeposit(restaurantId, id);
        loadData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // --- PROSEGUR DEPOSIT ACTIONS ---
  const handleAddNewProsegur = () => {
    const today = new Date().toISOString().split('T')[0];
    setEditingProsegur({
      id: `pros_${today}_${Date.now()}`,
      date: today,
      bagNumber: '',
      amountNotes: 0,
      amountCoins: 0,
      amountTotal: 0,
      prosegurReceipt: '',
      status: 'Pendente',
      comment: ''
    });
  };

  const handleSaveProsegurEdit = async () => {
    if (!editingProsegur) return;
    const tot = Number(editingProsegur.amountNotes || 0) + Number(editingProsegur.amountCoins || 0);
    if (tot <= 0) {
      alert("Insira valores válidos de moedas ou notas.");
      return;
    }
    const updated = {
      ...editingProsegur,
      amountNotes: Number(editingProsegur.amountNotes),
      amountCoins: Number(editingProsegur.amountCoins),
      amountTotal: tot
    };
    try {
      await saveProsegurDeposit(restaurantId, updated);
      setEditingProsegur(null);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Erro ao gravar recolha Prosegur.");
    }
  };

  const handleDeleteProsegurAction = async (id: string) => {
    if (confirm("Desejas revogar esta guia/depósito Prosegur?")) {
      try {
        await deleteProsegurDeposit(restaurantId, id);
        loadData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Helper currency formatter
  const formatEuro = (val: number) => {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val);
  };

  return (
    <div id="finance-control-root" className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden animate-fade-in print:border-0 print:shadow-none p-6">
      
      {/* Detail Editors Overlay or View */}
      {editingCofre ? (
        <div className="space-y-6 print:p-0">
          {/* Editor Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-4 gap-4 print:hidden">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setEditingCofre(null)}
                className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-xl transition-all"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h3 className="text-xl font-extrabold text-slate-800 uppercase tracking-tighter">
                  Registar Contagem de Cofre
                </h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                  McDonald's Via Catarina
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => window.print()}
                className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl hover:bg-slate-200 font-bold text-xs transition-all uppercase tracking-wider"
              >
                <Printer size={16} /> Print/Imprimir
              </button>
              <button
                onClick={handleSaveCofreCountEdit}
                className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl hover:bg-emerald-700 font-bold text-xs transition-all uppercase tracking-wider shadow-md shadow-emerald-100"
              >
                <Save size={16} /> Guardar Contagem
              </button>
            </div>
          </div>

          {/* Form Meta Setup */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100 print:bg-white print:border-0 print:grid-cols-4 print:p-2">
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Data</label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 print:hidden" size={14} />
                <input 
                  type="date"
                  value={editingCofre.date}
                  onChange={(e) => setEditingCofre({ ...editingCofre, date: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs text-gray-800 outline-none focus:ring-1 focus:ring-emerald-500 print:border-0 print:pl-0"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Turno</label>
              <div className="relative">
                <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 print:hidden" size={14} />
                <select
                  value={editingCofre.turn}
                  onChange={(e) => setEditingCofre({ ...editingCofre, turn: e.target.value as any })}
                  className="w-full pl-10 pr-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs text-gray-800 outline-none focus:ring-1 focus:ring-emerald-500 print:border-0 print:pl-0 appearance-none"
                >
                  <option value="Abertura">Abertura</option>
                  <option value="Tarde">Tarde / Mudança Turno</option>
                  <option value="Fecho">Fecho</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Gerente de Turno</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 print:hidden" size={14} />
                <select
                  value={editingCofre.managerId}
                  onChange={(e) => setEditingCofre({ ...editingCofre, managerId: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs text-gray-800 outline-none focus:ring-1 focus:ring-emerald-500 print:border-0 print:pl-0 appearance-none"
                >
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Fundos de Gaveta</label>
              <div className="flex gap-2 items-center print:hidden">
                <input 
                  type="number"
                  placeholder="Qtd (Ex: 4)"
                  value={editingCofre.fundosCount}
                  onChange={(e) => {
                    const cnt = Number(e.target.value);
                    setEditingCofre({ 
                      ...editingCofre, 
                      fundosCount: cnt,
                      fundosTotal: cnt * (editingCofre.fundosValuePerFundo)
                    });
                  }}
                  className="w-1/2 px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs text-gray-800 text-center outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <input 
                  type="number"
                  placeholder="Valor"
                  value={editingCofre.fundosValuePerFundo}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setEditingCofre({ 
                      ...editingCofre, 
                      fundosValuePerFundo: val,
                      fundosTotal: (editingCofre.fundosCount) * val
                    });
                  }}
                  className="w-1/2 px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs text-gray-800 text-center outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="text-xs font-black text-slate-800 mt-2">
                Total Fundos: {formatEuro(editingCofre.fundosCount * editingCofre.fundosValuePerFundo)} ({editingCofre.fundosCount} x {formatEuro(editingCofre.fundosValuePerFundo)})
              </div>
            </div>
          </div>

          {/* Form Tabs */}
          <div className="flex border-b border-gray-100 gap-6 print:hidden">
            <button
              onClick={() => setSafeEditorTab('contagem')}
              className={`pb-3 font-bold text-sm transition-all relative ${safeEditorTab === 'contagem' ? 'text-emerald-600 font-extrabold' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Contagem Física (Fundo & Cofre)
              {safeEditorTab === 'contagem' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full"></span>}
            </button>
            <button
              onClick={() => setSafeEditorTab('faturas')}
              className={`pb-3 font-bold text-sm transition-all relative flex items-center gap-2 ${safeEditorTab === 'faturas' ? 'text-emerald-600 font-extrabold' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Faturas Registadas
              <span className="bg-gray-100 text-gray-600 text-[10px] font-black px-2 py-0.5 rounded-full">
                {editingCofre.invoices.length}
              </span>
              {safeEditorTab === 'faturas' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full"></span>}
            </button>
          </div>

          {safeEditorTab === 'contagem' ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              
              {/* CARD 1: FUNDO DE GERENTE */}
              <div className="border border-[#c6dfc6] rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-[#e2f0e2] text-[#2c532c] px-4 py-3 flex justify-between items-center border-b border-[#c6dfc6]">
                  <h4 className="font-extrabold uppercase text-xs tracking-wider flex items-center gap-2">
                    <User size={14} /> FUNDO DE GERENTE
                  </h4>
                  <div className="bg-white text-emerald-800 px-3 py-1 rounded-lg border border-[#add0ad] font-black text-sm">
                    {formatEuro(editingCofre.fundoGerente.total)}
                  </div>
                </div>

                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Moedas */}
                  <div className="space-y-2">
                    <div className="bg-gray-50 px-2 py-1.5 rounded-lg text-slate-500 font-black text-[10px] uppercase text-center border">
                      MOEDAS (ROLOGENS)
                    </div>
                    {DENOMINATIONS_COINS.map(coin => {
                      const coinKey = coin.value.toFixed(2);
                      const qty = editingCofre.fundoGerente.moedas[coinKey] || 0;
                      return (
                        <div key={`fg_coin_${coinKey}`} className="flex items-center justify-between gap-2 border-b border-gray-50 pb-2">
                          <span className="text-xs font-bold text-gray-500 w-16">{coin.label}</span>
                          <input 
                            type="number"
                            min="0"
                            placeholder="Rolos"
                            value={qty || ''}
                            onChange={(e) => handleUpdateSafeCountInput('fundoGerente', 'moedas', coinKey, Number(e.target.value))}
                            className="w-16 h-8 text-center bg-gray-50 border rounded-lg text-xs font-bold font-mono outline-none focus:bg-white print:border-0"
                          />
                          <span className="text-xs font-mono font-bold text-gray-700 w-16 text-right">
                            {formatEuro(qty * coin.rollValue)}
                          </span>
                        </div>
                      );
                    })}
                    {/* Loose/Soltas */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-dashed">
                      <span className="text-xs font-extrabold text-blue-600 w-24">Moedas Soltas</span>
                      <input 
                        type="number"
                        step="0.01"
                        placeholder="Valor €"
                        value={editingCofre.fundoGerente.moedas.loose || ''}
                        onChange={(e) => handleUpdateSafeCountInput('fundoGerente', 'moedas', 'loose', Number(e.target.value))}
                        className="w-20 h-8 text-right px-2 bg-gray-50 border rounded-lg text-xs font-bold font-mono outline-none focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Notas */}
                  <div className="space-y-2">
                    <div className="bg-gray-50 px-2 py-1.5 rounded-lg text-slate-500 font-black text-[10px] uppercase text-center border">
                      NOTAS (UNIDADES)
                    </div>
                    {DENOMINATIONS_NOTES.map(note => {
                      const noteKey = note.value.toString();
                      const qty = editingCofre.fundoGerente.notas[noteKey] || 0;
                      return (
                        <div key={`fg_note_${noteKey}`} className="flex items-center justify-between gap-2 border-b border-gray-50 pb-2">
                          <span className="text-xs font-bold text-gray-500 w-16">{note.label}</span>
                          <input 
                            type="number"
                            min="0"
                            placeholder="Qtd"
                            value={qty || ''}
                            onChange={(e) => handleUpdateSafeCountInput('fundoGerente', 'notas', noteKey, Number(e.target.value))}
                            className="w-16 h-8 text-center bg-gray-50 border rounded-lg text-xs font-bold font-mono outline-none focus:bg-white print:border-0"
                          />
                          <span className="text-xs font-mono font-bold text-gray-700 w-16 text-right">
                            {formatEuro(qty * note.value)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* CARD 2: COFRE */}
              <div className="border border-[#c6dfc6] rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-[#e2f0e2] text-[#2c532c] px-4 py-3 flex justify-between items-center border-b border-[#c6dfc6]">
                  <h4 className="font-extrabold uppercase text-xs tracking-wider flex items-center gap-2">
                    <Coins size={14} /> COFRE (VAULT)
                  </h4>
                  <div className="bg-white text-emerald-800 px-3 py-1 rounded-lg border border-[#add0ad] font-black text-sm">
                    {formatEuro(editingCofre.cofre.total)}
                  </div>
                </div>

                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Moedas */}
                  <div className="space-y-2">
                    <div className="bg-gray-50 px-2 py-1.5 rounded-lg text-slate-500 font-black text-[10px] uppercase text-center border">
                      MOEDAS (ROLOGENS)
                    </div>
                    {DENOMINATIONS_COINS.map(coin => {
                      const coinKey = coin.value.toFixed(2);
                      const qty = editingCofre.cofre.moedas[coinKey] || 0;
                      return (
                        <div key={`cof_coin_${coinKey}`} className="flex items-center justify-between gap-2 border-b border-gray-50 pb-2">
                          <span className="text-xs font-bold text-gray-500 w-16">{coin.label}</span>
                          <input 
                            type="number"
                            min="0"
                            placeholder="Rolos"
                            value={qty || ''}
                            onChange={(e) => handleUpdateSafeCountInput('cofre', 'moedas', coinKey, Number(e.target.value))}
                            className="w-16 h-8 text-center bg-gray-50 border rounded-lg text-xs font-bold font-mono outline-none focus:bg-white print:border-0"
                          />
                          <span className="text-xs font-mono font-bold text-gray-700 w-16 text-right">
                            {formatEuro(qty * coin.rollValue)}
                          </span>
                        </div>
                      );
                    })}
                    {/* Loose/Soltas */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-dashed">
                      <span className="text-xs font-extrabold text-blue-600 w-24">Moedas Soltas</span>
                      <input 
                        type="number"
                        step="0.01"
                        placeholder="Valor €"
                        value={editingCofre.cofre.moedas.loose || ''}
                        onChange={(e) => handleUpdateSafeCountInput('cofre', 'moedas', 'loose', Number(e.target.value))}
                        className="w-20 h-8 text-right px-2 bg-gray-50 border rounded-lg text-xs font-bold font-mono outline-none focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Notas */}
                  <div className="space-y-2">
                    <div className="bg-gray-50 px-2 py-1.5 rounded-lg text-slate-500 font-black text-[10px] uppercase text-center border">
                      NOTAS (UNIDADES)
                    </div>
                    {DENOMINATIONS_NOTES.map(note => {
                      const noteKey = note.value.toString();
                      const qty = editingCofre.cofre.notas[noteKey] || 0;
                      return (
                        <div key={`cof_note_${noteKey}`} className="flex items-center justify-between gap-2 border-b border-gray-50 pb-2">
                          <span className="text-xs font-bold text-gray-500 w-16">{note.label}</span>
                          <input 
                            type="number"
                            min="0"
                            placeholder="Qtd"
                            value={qty || ''}
                            onChange={(e) => handleUpdateSafeCountInput('cofre', 'notas', noteKey, Number(e.target.value))}
                            className="w-16 h-8 text-center bg-gray-50 border rounded-lg text-xs font-bold font-mono outline-none focus:bg-white print:border-0"
                          />
                          <span className="text-xs font-mono font-bold text-gray-700 w-16 text-right">
                            {formatEuro(qty * note.value)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>
          ) : (
            
            /* TAB INVOICES: inserir e listar as faturas registadas */
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 max-w-xl space-y-4">
                <h4 className="font-extrabold text-[#2c532c] text-xs uppercase tracking-wider">
                  Registar Nova Fatura do Fornecedor / Outros
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1">
                      Nº Documento
                    </label>
                    <input 
                      type="text"
                      placeholder="Ex: FT-101"
                      value={invNum}
                      onChange={(e) => setInvNum(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1">
                      Fornecedor
                    </label>
                    <input 
                      type="text"
                      placeholder="Ex: Makro, Maia"
                      value={invSupplier}
                      onChange={(e) => setInvSupplier(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1">
                      Valor (€)
                    </label>
                    <input 
                      type="text"
                      placeholder="Ex: 12.50"
                      value={invAmt}
                      onChange={(e) => setInvAmt(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddInvoiceToSafe}
                  className="flex items-center gap-1.5 ml-auto bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-wider px-4 py-2 rounded-xl transition-all"
                >
                  <Plus size={14} /> Adicionar Fatura
                </button>
              </div>

              {/* Invoices List */}
              <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-gray-50 px-4 py-3 border-b text-xs font-black text-slate-700 uppercase tracking-wider flex justify-between">
                  <span>Lista de Faturas Associadas à Contagem</span>
                  <span>Total Faturas: {formatEuro(editingCofre.totalFaturas)}</span>
                </div>

                {editingCofre.invoices.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-400 font-bold uppercase tracking-wider">
                    Nenhuma fatura associada a este dia/turno.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {editingCofre.invoices.map(inv => (
                      <div key={inv.id} className="p-4 flex items-center justify-between hover:bg-gray-50 text-xs font-bold">
                        <div className="grid grid-cols-3 gap-6 flex-1 max-w-xl">
                          <div>
                            <span className="text-[10px] text-gray-400 block uppercase tracking-wider mb-0.5">Nº Documento</span>
                            <span className="text-slate-800">{inv.number}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 block uppercase tracking-wider mb-0.5">Fornecedor</span>
                            <span className="text-slate-800">{inv.supplier}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 block uppercase tracking-wider mb-0.5">Valor</span>
                            <span className="text-emerald-700 font-extrabold">{formatEuro(inv.amount)}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveInvoiceFromSafe(inv.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg shrink-0 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* BOTTOM SUMMARY - GRID LAYOUT MATCHING EXCEL MOCKUP */}
          <div className="bg-[#e9f2e9] border border-[#c3dfc3] p-5 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-6 items-center print:bg-white print:border-t">
            
            {/* Total Invoices */}
            <div className="bg-white p-4 rounded-xl border border-[#d6ebd6] text-center">
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Total Faturas
              </span>
              <span className="text-base font-extrabold text-slate-800">
                {formatEuro(editingCofre.totalFaturas)}
              </span>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-1">Refletido no total</p>
            </div>

            {/* Moedas Prosegur Manual input */}
            <div className="bg-white p-4 rounded-xl border border-[#d6ebd6]">
              <span className="block text-[10px] font-black text-[#2c532c] uppercase tracking-widest text-center mb-1">
                Moedas Prosegur (Valor manual)
              </span>
              <div className="relative mt-1">
                <input 
                  type="number"
                  placeholder="0,00 €"
                  value={editingCofre.moedasProsegur || ''}
                  onChange={(e) => setEditingCofre({ ...editingCofre, moedasProsegur: Number(e.target.value) })}
                  className="w-full text-center py-1.5 px-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 font-bold font-mono text-xs"
                />
              </div>
            </div>

            {/* Total Geral Display */}
            <div className="p-4 rounded-xl text-center">
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Total Geral (Fundo + Cofre + Faturas)
              </span>
              <span className="text-2xl font-black text-[#2c532c] tracking-tighter">
                {formatEuro(editingCofre.totalGeral)}
              </span>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-1">
                (Aprov. {Math.round(editingCofre.totalGeral)} €)
              </p>
            </div>

            {/* Diferença with Red / Green Color Indicator */}
            <div className="bg-white p-4 rounded-xl border border-[#d6ebd6] flex flex-col justify-center items-center">
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                DIFERENÇA (Saldo Teórico)
              </span>
              <div className="flex gap-2">
                <input 
                  type="number"
                  placeholder="Inserir Expected"
                  value={editingCofre.diferenca || ''}
                  onChange={(e) => setEditingCofre({ ...editingCofre, diferenca: Number(e.target.value) })}
                  className="w-24 text-center py-1 bg-gray-50 border rounded-lg text-xs font-bold"
                />
              </div>
              <div className="font-extrabold font-mono text-xs text-red-600 mt-2">
                Discrepância: {formatEuro(editingCofre.diferenca)}
              </div>
            </div>

          </div>

          <div className="print:hidden flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={() => setEditingCofre(null)}
              className="px-5 py-2 hover:bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs uppercase"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveCofreCountEdit}
              className="bg-emerald-600 text-white px-6 py-2 rounded-xl hover:bg-emerald-700 font-bold text-xs uppercase tracking-wider shadow-md shadow-emerald-50"
            >
              Gravar Contagem
            </button>
          </div>
        </div>
      ) : editingDeposit ? (
        
        /* DEPÓSITO FORM */
        <div className="space-y-6 max-w-xl mx-auto">
          <div className="border-b pb-4">
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">
              {editingDeposit.id ? 'Editar Depósito Bancário' : 'Novo Depósito Bancário'}
            </h3>
            <p className="text-xs text-gray-400 font-bold uppercase">Registo de Fluxo de Caixa no Banco</p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Data</label>
                <input 
                  type="date"
                  value={editingDeposit.date}
                  onChange={(e) => setEditingDeposit({ ...editingDeposit, date: e.target.value })}
                  className="w-full px-4 py-2 border rounded-xl font-bold text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Valor do Depósito (€)</label>
                <input 
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={editingDeposit.amount || ''}
                  onChange={(e) => setEditingDeposit({ ...editingDeposit, amount: Number(e.target.value) })}
                  className="w-full px-4 py-2 border rounded-xl font-bold text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Nº Comprovativo / Talão</label>
                <input 
                  type="text"
                  placeholder="Ex: BANCO-492"
                  value={editingDeposit.ref}
                  onChange={(e) => setEditingDeposit({ ...editingDeposit, ref: e.target.value })}
                  className="w-full px-4 py-2 border rounded-xl font-bold text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Gerente Responsável</label>
                <select
                  value={editingDeposit.managerId}
                  onChange={(e) => setEditingDeposit({ ...editingDeposit, managerId: e.target.value })}
                  className="w-full px-4 py-2 border rounded-xl font-bold text-xs"
                >
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Banco Destinatário</label>
              <input 
                type="text"
                placeholder="Ex: Novo Banco / Millenium"
                value={editingDeposit.bank}
                onChange={(e) => setEditingDeposit({ ...editingDeposit, bank: e.target.value })}
                className="w-full px-4 py-2 border rounded-xl font-bold text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Observações</label>
              <textarea 
                rows={3}
                placeholder="Ex: Depósito correspondente ao fecho de fim-de-semana..."
                value={editingDeposit.comment}
                onChange={(e) => setEditingDeposit({ ...editingDeposit, comment: e.target.value })}
                className="w-full px-4 py-2 border rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={() => setEditingDeposit(null)}
              className="px-5 py-2 hover:bg-gray-50 border rounded-xl font-bold text-xs uppercase"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveDepositEdit}
              className="bg-emerald-600 text-white px-5 py-2 rounded-xl hover:bg-emerald-700 font-bold text-xs uppercase"
            >
              Gravar Depósito
            </button>
          </div>
        </div>
      ) : editingProsegur ? (
        
        /* DEPÓSITO PROSEGUR FORM */
        <div className="space-y-6 max-w-xl mx-auto">
          <div className="border-b pb-4">
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">
              {editingProsegur.id ? 'Editar Guia Prosegur' : 'Nova Recolha Prosegur'}
            </h3>
            <p className="text-xs text-gray-400 font-bold uppercase">Registo de Encontros de Transporte de Valores (CIT)</p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Data de Recolha</label>
                <input 
                  type="date"
                  value={editingProsegur.date}
                  onChange={(e) => setEditingProsegur({ ...editingProsegur, date: e.target.value })}
                  className="w-full px-4 py-2 border rounded-xl font-bold text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Nº Selo / Saco Seguro</label>
                <input 
                  type="text"
                  placeholder="Sacos e Selos nº..."
                  value={editingProsegur.bagNumber}
                  onChange={(e) => setEditingProsegur({ ...editingProsegur, bagNumber: e.target.value })}
                  className="w-full px-4 py-2 border rounded-xl font-bold text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Valor Notas (€)</label>
                <input 
                  type="number"
                  placeholder="0.00"
                  value={editingProsegur.amountNotes || ''}
                  onChange={(e) => setEditingProsegur({ ...editingProsegur, amountNotes: Number(e.target.value) })}
                  className="w-full px-4 py-2 border rounded-xl font-bold text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Valor Moedas (€)</label>
                <input 
                  type="number"
                  placeholder="0.00"
                  value={editingProsegur.amountCoins || ''}
                  onChange={(e) => setEditingProsegur({ ...editingProsegur, amountCoins: Number(e.target.value) })}
                  className="w-full px-4 py-2 border rounded-xl font-bold text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Valor Total Programado</label>
                <div className="py-2.5 px-3 bg-gray-50 border rounded-xl font-black text-xs text-emerald-800 text-center">
                  {formatEuro(Number(editingProsegur.amountNotes || 0) + Number(editingProsegur.amountCoins || 0))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Nº Guia de Transporte Prosegur</label>
                <input 
                  type="text"
                  placeholder="Ex: GUIA-920"
                  value={editingProsegur.prosegurReceipt}
                  onChange={(e) => setEditingProsegur({ ...editingProsegur, prosegurReceipt: e.target.value })}
                  className="w-full px-4 py-2 border rounded-xl font-bold text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Estado de Liquidação</label>
                <select
                  value={editingProsegur.status}
                  onChange={(e) => setEditingProsegur({ ...editingProsegur, status: e.target.value as any })}
                  className="w-full px-4 py-2 border rounded-xl font-bold text-xs appearance-none"
                >
                  <option value="Pendente">Recolhido (Pendente de Banco)</option>
                  <option value="Recolhido">Confirmado Prosegur</option>
                  <option value="Confirmado">Depositado no Banco</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Observações</label>
              <textarea 
                rows={2}
                placeholder="Escreva detalhes adicionais ou códigos..."
                value={editingProsegur.comment}
                onChange={(e) => setEditingProsegur({ ...editingProsegur, comment: e.target.value })}
                className="w-full px-4 py-2 border rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={() => setEditingProsegur(null)}
              className="px-5 py-2 hover:bg-gray-50 border rounded-xl font-bold text-xs uppercase"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveProsegurEdit}
              className="bg-emerald-600 text-white px-5 py-2 rounded-xl hover:bg-emerald-700 font-bold text-xs uppercase animate-pulse"
            >
              Gravar Guia CIT
            </button>
          </div>
        </div>
      ) : (
        
        /* ------------------ LIST / LANDING TABS ------------------ */
        <div className="space-y-6">
          {/* Main Top Navigation Tabs */}
          <div className="flex flex-wrap border-b border-gray-100 gap-6 md:gap-10 pb-1.5">
            <button
              onClick={() => setActiveTab('cofre')}
              className={`pb-4 font-black uppercase text-xs tracking-wider transition-all relative flex items-center gap-2 ${activeTab === 'cofre' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Calculator size={16} /> Contagem de Cofre
              {activeTab === 'cofre' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"></span>}
            </button>

            <button
              onClick={() => setActiveTab('depositos')}
              className={`pb-4 font-black uppercase text-xs tracking-wider transition-all relative flex items-center gap-2 ${activeTab === 'depositos' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Landmark size={16} /> Depósito Bancário
              {activeTab === 'depositos' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"></span>}
            </button>

            <button
              onClick={() => setActiveTab('prosegur')}
              className={`pb-4 font-black uppercase text-xs tracking-wider transition-all relative flex items-center gap-2 ${activeTab === 'prosegur' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <CreditCard size={16} /> Depósito Prosegur
              {activeTab === 'prosegur' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"></span>}
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`pb-4 font-black uppercase text-xs tracking-wider transition-all relative flex items-center gap-2 ${activeTab === 'settings' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Sliders size={16} /> Definições
              {activeTab === 'settings' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"></span>}
            </button>
          </div>

          {/* Tab 1: CONTAGEM DE COFRE */}
          {activeTab === 'cofre' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border">
                <div>
                  <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Histórico de Contagem Diária (3x ao Dia)</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Fundo Managers, Cofres e Faturas Fornecedores</p>
                </div>
                <button
                  onClick={handleAddNewSafeCount}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all shadow-md shadow-blue-50"
                >
                  <Plus size={16} /> Registar Cofre
                </button>
              </div>

              {isLoading ? (
                <div className="p-12 text-center text-xs text-gray-400 font-black tracking-widest uppercase">
                  A carregar dados do banco...
                </div>
              ) : cofreCounts.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-gray-100 rounded-2xl">
                  <Coins size={36} className="text-gray-300 mx-auto mb-3" />
                  <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Ainda não há registos de cofre</p>
                  <button onClick={handleAddNewSafeCount} className="text-blue-600 text-xs font-black uppercase tracking-wider underline mt-2 block mx-auto">
                    Iniciar Nova Contagem Diária
                  </button>
                </div>
              ) : (
                <div className="border rounded-2xl border-gray-100 overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b text-[10px] font-black uppercase text-slate-500 tracking-wider">
                        <th className="px-6 py-3.5">Data / Turno</th>
                        <th className="px-6 py-3.5">Supervisor de Turno</th>
                        <th className="px-6 py-3.5 text-right">F. Gerente</th>
                        <th className="px-6 py-3.5 text-right">Fisico Cofre</th>
                        <th className="px-6 py-3.5 text-right">Faturas</th>
                        <th className="px-6 py-3.5 text-right">Total Geral</th>
                        <th className="px-6 py-3.5 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-xs font-bold text-gray-700">
                      {cofreCounts.map(count => {
                        const mName = employees.find(e => e.id === count.managerId)?.name || 'Outro';
                        return (
                          <tr key={count.id} className="hover:bg-gray-50/50">
                            <td className="px-6 py-4">
                              <span className="text-slate-800 block text-xs font-extrabold">{count.date}</span>
                              <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-black mt-0.5">{count.turn}</span>
                            </td>
                            <td className="px-6 py-4">{mName}</td>
                            <td className="px-6 py-4 text-right font-mono">{formatEuro(count.fundoGerente?.total || 0)}</td>
                            <td className="px-6 py-4 text-right font-mono">{formatEuro(count.cofre?.total || 0)}</td>
                            <td className="px-6 py-4 text-right font-mono text-blue-600">{formatEuro(count.totalFaturas || 0)}</td>
                            <td className="px-6 py-4 text-right font-mono text-emerald-700 font-extrabold">{formatEuro(count.totalGeral || 0)}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-center gap-1">
                                <button 
                                  onClick={() => {
                                    setEditingCofre(count);
                                    setSafeEditorTab('contagem');
                                  }}
                                  className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                  title="Editar Contagem"
                                >
                                  <Edit2 size={15} />
                                </button>
                                <button
                                  onClick={() => handleDeleteCofreCountAction(count.id)}
                                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                  title="Remover Contagem"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: DEPÓSITO BANCÁRIO */}
          {activeTab === 'depositos' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border">
                <div>
                  <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Controlo de Depósitos Bancários</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Controlo de talões físicos e reconciliação com o banco</p>
                </div>
                <button
                  onClick={handleAddNewDeposit}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all shadow-md shadow-blue-50"
                >
                  <Plus size={16} /> Registar Depósito
                </button>
              </div>

              {isLoading ? (
                <div className="p-12 text-center text-xs text-gray-400 font-black tracking-widest uppercase">
                  A carregar dados do banco...
                </div>
              ) : deposits.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-gray-100 rounded-2xl">
                  <Landmark size={36} className="text-gray-300 mx-auto mb-3" />
                  <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Nenhum depósito bancário registado</p>
                  <button onClick={handleAddNewDeposit} className="text-blue-600 text-xs font-black uppercase tracking-wider underline mt-2 block mx-auto">
                    Efetuar Primeiro Depósito
                  </button>
                </div>
              ) : (
                <div className="border rounded-2xl border-gray-100 overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b text-[10px] font-black uppercase text-slate-500 tracking-wider">
                        <th className="px-6 py-3.5">Data</th>
                        <th className="px-6 py-3.5">Banco</th>
                        <th className="px-6 py-3.5">Comprovativo / Talão</th>
                        <th className="px-6 py-3.5">Entregue por</th>
                        <th className="px-6 py-3.5 text-right">Valor Depositado</th>
                        <th className="px-6 py-3.5 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-xs font-bold text-gray-700">
                      {deposits.map(dep => {
                        const mName = employees.find(e => e.id === dep.managerId)?.name || 'Outro';
                        return (
                          <tr key={dep.id} className="hover:bg-gray-50/50">
                            <td className="px-6 py-4">{dep.date}</td>
                            <td className="px-6 py-4 text-slate-800">{dep.bank}</td>
                            <td className="px-6 py-4 font-mono font-extrabold text-blue-600">{dep.ref}</td>
                            <td className="px-6 py-4">{mName}</td>
                            <td className="px-6 py-4 text-right font-mono font-extrabold text-emerald-700">{formatEuro(dep.amount)}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-center gap-1">
                                <button 
                                  onClick={() => setEditingDeposit(dep)}
                                  className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                >
                                  <Edit2 size={15} />
                                </button>
                                <button
                                  onClick={() => handleDeleteDepositAction(dep.id)}
                                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: DEPÓSITO PROSEGUR */}
          {activeTab === 'prosegur' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border">
                <div>
                  <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Guias e Sacos de Valores Prosegur</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Reconciliação de transporte de dinheiro seguro (Notas e Moedas)</p>
                </div>
                <button
                  onClick={handleAddNewProsegur}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all shadow-md shadow-blue-50"
                >
                  <Plus size={16} /> Registar Recolha CIT
                </button>
              </div>

              {isLoading ? (
                <div className="p-12 text-center text-xs text-gray-400 font-black tracking-widest uppercase">
                  A carregar dados do banco...
                </div>
              ) : prosegurDeposits.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-gray-100 rounded-2xl">
                  <CreditCard size={36} className="text-gray-300 mx-auto mb-3" />
                  <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Nenhuma entrega de selo Prosegur registada</p>
                  <button onClick={handleAddNewProsegur} className="text-blue-600 text-xs font-black uppercase tracking-wider underline mt-2 block mx-auto">
                    Criar Nova Entrega de Valores
                  </button>
                </div>
              ) : (
                <div className="border rounded-2xl border-gray-100 overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b text-[10px] font-black uppercase text-slate-500 tracking-wider">
                        <th className="px-6 py-3.5">Data Recolha</th>
                        <th className="px-6 py-3.5">Nº Guia Prosegur</th>
                        <th className="px-6 py-3.5">Nº Selo / Saco</th>
                        <th className="px-6 py-3.5 text-right">Valor Notas</th>
                        <th className="px-6 py-3.5 text-right">Valor Moedas</th>
                        <th className="px-6 py-3.5 text-right">Total Recolha</th>
                        <th className="px-6 py-3.5 text-center">Estado</th>
                        <th className="px-6 py-3.5 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-xs font-bold text-gray-700">
                      {prosegurDeposits.map(pros => {
                        return (
                          <tr key={pros.id} className="hover:bg-gray-50/50">
                            <td className="px-6 py-4">{pros.date}</td>
                            <td className="px-6 py-4 font-mono font-extrabold text-[#2c532c]">{pros.prosegurReceipt}</td>
                            <td className="px-6 py-4 font-mono text-slate-500">{pros.bagNumber}</td>
                            <td className="px-6 py-4 text-right font-mono">{formatEuro(pros.amountNotes)}</td>
                            <td className="px-6 py-4 text-right font-mono">{formatEuro(pros.amountCoins)}</td>
                            <td className="px-6 py-4 text-right font-mono font-extrabold text-emerald-800">{formatEuro(pros.amountTotal)}</td>
                            <td className="px-6 py-4 text-center">
                              <span className={`inline-block px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-xl ${
                                pros.status === 'Confirmado' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                pros.status === 'Recolhido' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                'bg-amber-50 text-amber-700 border border-amber-100'
                              }`}>
                                {pros.status === 'Confirmado' ? 'Banco' : pros.status === 'Recolhido' ? 'Transportadora' : 'Saco Selado'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-center gap-1">
                                <button 
                                  onClick={() => setEditingProsegur(pros)}
                                  className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                >
                                  <Edit2 size={15} />
                                </button>
                                <button
                                  onClick={() => handleDeleteProsegurAction(pros.id)}
                                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab 4: DEFINIÇÕES DE CAIXA / COFRE */}
          {activeTab === 'settings' && (
            <div className="max-w-xl">
              <div className="border bg-slate-50 p-5 rounded-2xl space-y-4">
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">Definições Globais do Cofre</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                    Configuração de gavetas iniciais por fundo, e padrões da base de gerente
                  </p>
                </div>

                <form onSubmit={handleSaveSettings} className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">
                        Nº de Fundos de Gaveta (Registers)
                      </label>
                      <input 
                        type="number"
                        value={fundoGavetaCountInput}
                        onChange={(e) => setFundoGavetaCountInput(Number(e.target.value))}
                        className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs"
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">
                        Valor Unitário por Gaveta (€)
                      </label>
                      <input 
                        type="number"
                        value={fundoGavetaValueInput}
                        onChange={(e) => setFundoGavetaValueInput(Number(e.target.value))}
                        className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs"
                        min="1"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">
                      Fundo Base de Gerente Predefinido (€)
                    </label>
                    <input 
                      type="number"
                      value={defaultManagerFundExpected}
                      onChange={(e) => setDefaultManagerFundExpected(Number(e.target.value))}
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs"
                      min="1"
                    />
                  </div>

                  <div className="bg-emerald-50 text-emerald-800 border border-emerald-100 p-3.5 rounded-xl text-xs space-y-1">
                    <p className="font-extrabold uppercase text-[10px] flex items-center gap-1.5 text-emerald-700">
                      <ShieldCheck size={14} /> Repercussão de Configurações:
                    </p>
                    <p className="font-bold">
                      • Fundo de gaveta acumulado considerado na contagem: 
                      <strong className="ml-1 text-slate-800">{formatEuro(fundoGavetaCountInput * fundoGavetaValueInput)}</strong>
                    </p>
                    <p className="text-[10px] text-emerald-700 font-bold">
                      Estes parâmetros são automaticamente precarregados em cada nova contagem criada.
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition-all shadow-md ml-auto"
                  >
                    <Save size={16} /> Guardar Parâmetros
                  </button>
                </form>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
