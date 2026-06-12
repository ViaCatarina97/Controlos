import React, { useState, useEffect, useMemo } from 'react';
import { 
  Employee, AppSettings, CofreCount, DepositRecord, DepositRow, ProsegurDepositRecord, FinanceInvoice 
} from '../types';
import { 
  getCofreCounts, saveCofreCount, deleteCofreCount,
  getDeposits, saveDeposit, deleteDeposit,
  getProsegurDeposits, saveProsegurDeposit, deleteProsegurDeposit
} from '../services/firebaseService';
import { 
  Calculator, Coins, CreditCard, Landmark, Plus, Trash2, Edit2, 
  Save, ArrowLeft, Calendar, User, Clock, FileText, Check, AlertTriangle, 
  Sliders, ArrowUpRight, DollarSign, Wallet, ShieldCheck, Printer, CheckCircle,
  Lock, CheckCheck
} from 'lucide-react';

interface FinanceControlProps {
  restaurantId: string;
  employees: Employee[];
  onSaveEmployees?: (updated: Employee[]) => void;
  settings: AppSettings;
  onSaveSettings: (updated: AppSettings) => void;
  activeSubTab: 'cofre' | 'faturas' | 'depositos' | 'prosegur' | 'settings';
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

const INVOICE_CATEGORIES = [
  'Plano Motivacional',
  'Plano Ourlounge',
  'Plano LRM',
  'Farmácia',
  'Papelaria',
  'Correios',
  'Combustível',
  'Formação',
  'Parque Estacionamento',
  'Equipamento&Peq Untensílio',
  'Outros',
  'Cheque'
];

export const FinanceControl: React.FC<FinanceControlProps> = ({ 
  restaurantId, employees, onSaveEmployees, settings, onSaveSettings, activeSubTab, onTabChange
}) => {
  const activeTab = activeSubTab;
  const setActiveTab = onTabChange;
  
  // Data lists
  const [cofreCounts, setCofreCounts] = useState<CofreCount[]>([]);
  const [deposits, setDeposits] = useState<DepositRecord[]>([]);
  const [prosegurDeposits, setProsegurDeposits] = useState<ProsegurDepositRecord[]>([]);
  
  // App Loading state
  const [isLoading, setIsLoading] = useState(true);
  
  // Settings Tab Navigation & local employees editing copy
  const [settingsSubTab, setSettingsSubTab] = useState<'geral' | 'mecanograficos'>('geral');
  const [localEmployees, setLocalEmployees] = useState<Employee[]>(employees);

  useEffect(() => {
    setLocalEmployees(employees);
  }, [employees]);
  
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

  // Main Faturas page inputs
  const [invoiceDateInput, setInvoiceDateInput] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceTurnInput, setInvoiceTurnInput] = useState<'Abertura' | 'Tarde' | 'Fecho'>('Abertura');
  const [invoiceSupplierInput, setInvoiceSupplierInput] = useState('');
  const [invoiceNumInput, setInvoiceNumInput] = useState('');
  const [invoiceAmtInput, setInvoiceAmtInput] = useState('');
  const [invoiceCategoryInput, setInvoiceCategoryInput] = useState('Plano Motivacional');
  const [selectedMonth, setSelectedMonth] = useState<string>('All');

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

  // Memoized lists of faturas (all invoices aggregated from cofreCounts)
  const allInvoicesList = useMemo(() => {
    const list: Array<{
      date: string;
      turn: 'Abertura' | 'Tarde' | 'Fecho';
      invoice: FinanceInvoice;
      cofreCountId: string;
      isLocked: boolean;
      invoiceUniqueId: string;
    }> = [];

    cofreCounts.forEach(c => {
      if (c.invoices && c.invoices.length > 0) {
        c.invoices.forEach(inv => {
          list.push({
            date: c.date,
            turn: c.turn,
            invoice: inv,
            cofreCountId: c.id,
            isLocked: !!c.isLocked,
            invoiceUniqueId: `${c.id}_${inv.id}`
          });
        });
      }
    });

    list.sort((a,b) => b.date.localeCompare(a.date) || b.turn.localeCompare(a.turn));
    return list;
  }, [cofreCounts]);

  // Unique months available for selection
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    allInvoicesList.forEach(item => {
      if (item.date) {
        monthsSet.add(item.date.substring(0, 7)); // "YYYY-MM"
      }
    });
    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
  }, [allInvoicesList]);

  // Filtered list based on selectedMonth
  const filteredInvoices = useMemo(() => {
    if (selectedMonth === 'All') return allInvoicesList;
    return allInvoicesList.filter(item => item.date && item.date.startsWith(selectedMonth));
  }, [allInvoicesList, selectedMonth]);

  const totalAllInvoices = useMemo(() => {
    return filteredInvoices
      .filter(item => item.invoice.status !== 'arquivada')
      .reduce((sum, item) => sum + item.invoice.amount, 0);
  }, [filteredInvoices]);

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

  // For selecting a custom date or starting counts on standard days
  const [extraDates, setExtraDates] = useState<string[]>([]);
  const [customDateInput, setCustomDateInput] = useState<string>(new Date().toISOString().split('T')[0]);

  // Grouped days calculation
  interface DayState {
    date: string;
    abertura?: CofreCount;
    tarde?: CofreCount;
    fecho?: CofreCount;
    isClosed: boolean;
  }

  const groupedDays = useMemo(() => {
    const groups: { [date: string]: DayState } = {};

    // Process cofre counts
    cofreCounts.forEach(count => {
      if (!groups[count.date]) {
        groups[count.date] = {
          date: count.date,
          isClosed: false
        };
      }
      const turnKey = count.turn.toLowerCase();
      if (turnKey === 'abertura') {
        groups[count.date].abertura = count;
      } else if (turnKey === 'tarde') {
        groups[count.date].tarde = count;
      } else if (turnKey === 'fecho') {
        groups[count.date].fecho = count;
      }

      if (count.isDayClosed) {
        groups[count.date].isClosed = true;
      }
    });

    // Make sure today's date is always preset in the active list if it hasn't been closed
    const todayStr = new Date().toISOString().split('T')[0];
    if (!groups[todayStr]) {
      groups[todayStr] = {
        date: todayStr,
        isClosed: false
      };
    }

    // Include custom user added dates
    extraDates.forEach(d => {
      if (!groups[d]) {
        groups[d] = {
          date: d,
          isClosed: false
        };
      }
    });

    const list = Object.values(groups);
    list.sort((a, b) => b.date.localeCompare(a.date));
    return list;
  }, [cofreCounts, extraDates]);

  interface DepositDayState {
    date: string;
    abertura?: DepositRecord;
    fecho?: DepositRecord;
  }

  const groupedDeposits = useMemo(() => {
    const groups: { [date: string]: DepositDayState } = {};

    deposits.forEach(dep => {
      if (!groups[dep.date]) {
        groups[dep.date] = {
          date: dep.date
        };
      }
      const turnKey = dep.turn?.toLowerCase();
      if (turnKey === 'abertura') {
        groups[dep.date].abertura = dep;
      } else if (turnKey === 'fecho') {
        groups[dep.date].fecho = dep;
      }
    });

    const todayStr = new Date().toISOString().split('T')[0];
    if (!groups[todayStr]) {
      groups[todayStr] = {
        date: todayStr
      };
    }

    extraDates.forEach(d => {
      if (!groups[d]) {
        groups[d] = {
          date: d
        };
      }
    });

    const list = Object.values(groups);
    list.sort((a, b) => b.date.localeCompare(a.date));
    return list;
  }, [deposits, extraDates]);

  // Safe Count detailed actions
  const handleAddNewSafeCountForTurn = (date: string, turn: 'Abertura' | 'Tarde' | 'Fecho') => {
    const existing = cofreCounts.find(c => c.date === date && c.turn === turn);
    if (existing) {
      setEditingCofre(existing);
      setSafeEditorTab('contagem');
      return;
    }

    const newCount: CofreCount = {
      id: `cofre_${date}_${turn}_${Date.now()}`,
      date: date,
      turn: turn,
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
      observacoes: '',
      isLocked: false,
      isDayClosed: false
    };
    newCount.fundoGerente = calculatePartTotals(newCount.fundoGerente);
    newCount.cofre = calculatePartTotals(newCount.cofre);
    setEditingCofre(newCount);
    setSafeEditorTab('contagem');
  };

  // Fallback signature for compatibility if needed elsewhere
  const handleAddNewSafeCount = () => {
    const today = new Date().toISOString().split('T')[0];
    handleAddNewSafeCountForTurn(today, 'Abertura');
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
    const fundosTot = Number(countCopy.fundosCount || 0) * Number(countCopy.fundosValuePerFundo || 0);
    const moedasPros = prosegurDeposits
      .filter(p => p.date === countCopy.date)
      .reduce((sum, p) => sum + (p.amountCoins || 0), 0);

    // Total Geral = Safe (Cofre) + Manager Fund + Recorded Invoices + Drawer Funds + Moedas Prosegur
    const computedTotal = fGerenteTot + cofreTot + faturasTot + fundosTot + moedasPros;
    const computedDiferenca = (1000 + fundosTot) - computedTotal;

    countCopy.totalGeral = computedTotal;
    countCopy.diferenca = computedDiferenca;

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
    
    const fundosTot = Number(countCopy.fundosCount || 0) * Number(countCopy.fundosValuePerFundo || 0);
    const moedasPros = prosegurDeposits
      .filter(p => p.date === countCopy.date)
      .reduce((sum, p) => sum + (p.amountCoins || 0), 0);

    // Recalculate Total Geral and Diferenca with Drawer Funds included
    countCopy.totalGeral = countCopy.fundoGerente.total + countCopy.cofre.total + countCopy.totalFaturas + fundosTot + moedasPros;
    countCopy.diferenca = (1000 + fundosTot) - countCopy.totalGeral;

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
    
    const fundosTot = Number(countCopy.fundosCount || 0) * Number(countCopy.fundosValuePerFundo || 0);
    const moedasPros = prosegurDeposits
      .filter(p => p.date === countCopy.date)
      .reduce((sum, p) => sum + (p.amountCoins || 0), 0);

    // Recalculate Total Geral and Diferenca with Drawer Funds included
    countCopy.totalGeral = countCopy.fundoGerente.total + countCopy.cofre.total + countCopy.totalFaturas + fundosTot + moedasPros;
    countCopy.diferenca = (1000 + fundosTot) - countCopy.totalGeral;

    setEditingCofre(countCopy);
  };

  const handleSaveCofreCountEdit = async (shouldLock?: boolean) => {
    if (!editingCofre) return;
    
    const finalizeLock = shouldLock === true;
    
    const autoMoedasPros = prosegurDeposits
      .filter(p => p.date === editingCofre.date)
      .reduce((sum, p) => sum + (p.amountCoins || 0), 0);
    const fundosTotalVal = Number(editingCofre.fundosCount || 0) * Number(editingCofre.fundosValuePerFundo || 0);
    const autoTotalGeral = (editingCofre.fundoGerente?.total || 0) + (editingCofre.cofre?.total || 0) + (editingCofre.totalFaturas || 0) + autoMoedasPros + fundosTotalVal;
    const autoDiferenca = (1000 + fundosTotalVal) - autoTotalGeral;

    const updatedCount: CofreCount = {
      ...editingCofre,
      fundosCount: Number(editingCofre.fundosCount),
      fundosValuePerFundo: Number(editingCofre.fundosValuePerFundo),
      fundosTotal: fundosTotalVal,
      moedasProsegur: autoMoedasPros,
      totalGeral: autoTotalGeral,
      diferenca: autoDiferenca,
      isLocked: finalizeLock ? true : (editingCofre.isLocked || false),
    };

    try {
      await saveCofreCount(restaurantId, updatedCount);
      setEditingCofre(null);
      await loadData();
      if (finalizeLock) {
        alert("Contagem validada e bloqueada com sucesso!");
      } else {
        alert("Contagem guardada em rascunho temporário.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao gravar contagem de cofre.");
    }
  };

  const handleCloseDay = async (date: string) => {
    const day = groupedDays.find(d => d.date === date);
    if (!day || !day.abertura || !day.tarde || !day.fecho) {
      alert("Erro: Certifique-se de que os 3 turnos foram criados antes de encerrar.");
      return;
    }

    if (!day.abertura.isLocked || !day.tarde.isLocked || !day.fecho.isLocked) {
      alert("Erro: Certifique-se de que todas as 3 contagens do dia foram finalizadas e validadas (bloqueadas) antes de encerrar o dia.");
      return;
    }

    if (confirm(`Deseja mesmo encerrar o dia ${date}? Esta ação é definitiva e as contagens ficarão bloqueadas.`)) {
      setIsLoading(true);
      try {
        const updatedAbertura = { ...day.abertura, isLocked: true, isDayClosed: true };
        const updatedTarde = { ...day.tarde, isLocked: true, isDayClosed: true };
        const updatedFecho = { ...day.fecho, isLocked: true, isDayClosed: true };

        await Promise.all([
          saveCofreCount(restaurantId, updatedAbertura),
          saveCofreCount(restaurantId, updatedTarde),
          saveCofreCount(restaurantId, updatedFecho)
        ]);

        alert(`Dia ${date} encerrado com sucesso!`);
        await loadData();
      } catch (err) {
        console.error("Error closing day:", err);
        alert("Erro ao encerrar o dia.");
      } finally {
        setIsLoading(false);
      }
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

  const handleRegisterInvoiceMainPage = async () => {
    if (!invoiceSupplierInput || !invoiceAmtInput) {
      alert("Por favor, preencha o Fornecedor e o Valor da Fatura.");
      return;
    }

    const amt = Number(invoiceAmtInput);
    if (isNaN(amt) || amt <= 0) {
      alert("Por favor, insira um valor válido de fatura.");
      return;
    }

    // Try finding existing cofre count for the selected date
    let existing = cofreCounts.find(c => c.date === invoiceDateInput);

    if (existing && existing.isLocked) {
      alert("Não é possível registar faturas nesta data, pois a contagem correspondente já se encontra Validada e Bloqueada.");
      return;
    }

    setIsLoading(true);
    try {
      const newInv: FinanceInvoice = {
        id: `inv_${Date.now()}`,
        number: '', // Categoria will serve as primary classifier, number is empty/unused per request
        supplier: invoiceSupplierInput,
        amount: amt,
        category: invoiceCategoryInput,
        status: 'aberta'
      };

      let updatedCount: CofreCount;
      if (existing) {
        const updatedInvoices = [...(existing.invoices || []), newInv];
        const updatedTotalFaturas = updatedInvoices.filter(i => i.status !== 'arquivada').reduce((s, i) => s + i.amount, 0);
        
        // Auto moedas prosegur for recalculating Saved totalGeral:
        const currentMoedasProsegur = prosegurDeposits
          .filter(p => p.date === existing!.date)
          .reduce((sum, p) => sum + (p.amountCoins || 0), 0);

        const fundosTotalVal = Number(existing.fundosCount || 0) * Number(existing.fundosValuePerFundo || 0);

        const updatedTotalGeral = (existing.fundoGerente?.total || 0) + (existing.cofre?.total || 0) + updatedTotalFaturas + currentMoedasProsegur + fundosTotalVal;
        const updatedDiferenca = (1000 + fundosTotalVal) - updatedTotalGeral;

        updatedCount = {
          ...existing,
          invoices: updatedInvoices,
          totalFaturas: updatedTotalFaturas,
          totalGeral: updatedTotalGeral,
          diferenca: updatedDiferenca
        };
      } else {
        // Create safe count on-the-fly for Abertura of that date
        const fundosTotalVal = devDefaultGavetaCount * devDefaultGavetaValue;
        updatedCount = {
          id: `cofre_${invoiceDateInput}_Abertura_${Date.now()}`,
          date: invoiceDateInput,
          turn: 'Abertura',
          managerId: employees.find(e => e.isActive && e.role === 'GERENTE')?.id || employees[0]?.id || '',
          fundoGerente: createEmptyPart(),
          cofre: createEmptyPart(),
          invoices: [newInv],
          totalFaturas: amt,
          fundosCount: devDefaultGavetaCount,
          fundosValuePerFundo: devDefaultGavetaValue,
          fundosTotal: fundosTotalVal,
          moedasProsegur: prosegurDeposits.filter(p => p.date === invoiceDateInput).reduce((sum, p) => sum + (p.amountCoins || 0), 0),
          totalGeral: fundosTotalVal + amt,
          diferenca: (1000 + fundosTotalVal) - (fundosTotalVal + amt),
          observacoes: '',
          isLocked: false,
          isDayClosed: false
        };
        updatedCount.fundoGerente = calculatePartTotals(updatedCount.fundoGerente);
        updatedCount.cofre = calculatePartTotals(updatedCount.cofre);
        
        // final recalc for new
        const newTotalGeral = updatedCount.fundoGerente.total + updatedCount.cofre.total + updatedCount.totalFaturas + updatedCount.moedasProsegur + fundosTotalVal;
        updatedCount.totalGeral = newTotalGeral;
        updatedCount.diferenca = (1000 + fundosTotalVal) - newTotalGeral;
      }

      await saveCofreCount(restaurantId, updatedCount);
      alert("Fatura lançada com sucesso!");
      
      // Clear inputs
      setInvoiceSupplierInput('');
      setInvoiceAmtInput('');
      
      await loadData();
    } catch (err) {
      console.error(err);
      alert("Erro ao gravar registo de fatura.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchiveInvoice = async (cofreCountId: string, invoiceId: string) => {
    const managerName = prompt("Por favor, introduza o nome do gerente que está a arquivar esta fatura:");
    if (managerName === null) return; // Cancelled
    if (!managerName.trim()) {
      alert("O nome do gerente é obrigatório para arquivar a fatura.");
      return;
    }

    const parentCount = cofreCounts.find(c => c.id === cofreCountId);
    if (!parentCount) return;

    setIsLoading(true);
    try {
      const updatedInvoices = (parentCount.invoices || []).map(inv => {
        if (inv.id === invoiceId) {
          return {
            ...inv,
            status: 'arquivada' as const,
            archivedBy: managerName.trim(),
            archivedAt: new Date().toISOString()
          };
        }
        return inv;
      });

      const updatedTotalFaturas = updatedInvoices
        .filter(i => i.status !== 'arquivada')
        .reduce((s, i) => s + i.amount, 0);

      const currentMoedasProsegur = prosegurDeposits
        .filter(p => p.date === parentCount.date)
        .reduce((sum, p) => sum + (p.amountCoins || 0), 0);

      const fundosTotalVal = Number(parentCount.fundosCount || 0) * Number(parentCount.fundosValuePerFundo || 0);

      const updatedTotalGeral = (parentCount.fundoGerente?.total || 0) + (parentCount.cofre?.total || 0) + updatedTotalFaturas + currentMoedasProsegur + fundosTotalVal;
      const updatedDiferenca = (1000 + fundosTotalVal) - updatedTotalGeral;

      const updatedCount: CofreCount = {
        ...parentCount,
        invoices: updatedInvoices,
        totalFaturas: updatedTotalFaturas,
        totalGeral: updatedTotalGeral,
        diferenca: updatedDiferenca
      };

      await saveCofreCount(restaurantId, updatedCount);
      alert("Fatura arquivada com sucesso!");
      await loadData();
    } catch (err) {
      console.error(err);
      alert("Erro ao arquivar faturas.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteInvoiceMainPage = async (cofreCountId: string, invoiceId: string) => {
    const parentCount = cofreCounts.find(c => c.id === cofreCountId);
    if (!parentCount) return;

    if (parentCount.isLocked) {
      alert("A contagem correspondente está Validada e Bloqueada. Não é possível remover esta fatura.");
      return;
    }

    if (!confirm("Deseja mesmo eliminar esta fatura?")) return;

    setIsLoading(true);
    try {
      const updatedInvoices = (parentCount.invoices || []).filter(i => i.id !== invoiceId);
      const updatedTotalFaturas = updatedInvoices.filter(i => i.status !== 'arquivada').reduce((s, i) => s + i.amount, 0);
      
      const currentMoedasProsegur = prosegurDeposits
        .filter(p => p.date === parentCount.date)
        .reduce((sum, p) => sum + (p.amountCoins || 0), 0);

      const fundosTotalVal = Number(parentCount.fundosCount || 0) * Number(parentCount.fundosValuePerFundo || 0);
      const updatedTotalGeral = (parentCount.fundoGerente?.total || 0) + (parentCount.cofre?.total || 0) + updatedTotalFaturas + currentMoedasProsegur + fundosTotalVal;

      const updatedCount = {
        ...parentCount,
        invoices: updatedInvoices,
        totalFaturas: updatedTotalFaturas,
        totalGeral: updatedTotalGeral,
        diferenca: (1000 + fundosTotalVal) - updatedTotalGeral
      };

      await saveCofreCount(restaurantId, updatedCount);
      alert("Fatura eliminada com sucesso!");
      await loadData();
    } catch (err) {
      console.error(err);
      alert("Erro ao eliminar fatura.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- DEPOSIT RECORD ACTIONS ---
  const createDefaultDepositRows = (): DepositRow[] => [
    { caixa: '4', colaboradorNo: '', colaboradorNome: '', valorRapport: 0, sangria: 0, dinheiro: 0, multibanco: 0, tickets: 0, delivery: 0, mop: 0, diferenca: 0 },
    { caixa: '4', colaboradorNo: '', colaboradorNome: '', valorRapport: 0, sangria: 0, dinheiro: 0, multibanco: 0, tickets: 0, delivery: 0, mop: 0, diferenca: 0 },
    { caixa: '5', colaboradorNo: '', colaboradorNome: '', valorRapport: 0, sangria: 0, dinheiro: 0, multibanco: 0, tickets: 0, delivery: 0, mop: 0, diferenca: 0 },
    { caixa: '5', colaboradorNo: '', colaboradorNome: '', valorRapport: 0, sangria: 0, dinheiro: 0, multibanco: 0, tickets: 0, delivery: 0, mop: 0, diferenca: 0 },
    { caixa: '6', colaboradorNo: '', colaboradorNome: '', valorRapport: 0, sangria: 0, dinheiro: 0, multibanco: 0, tickets: 0, delivery: 0, mop: 0, diferenca: 0 },
    { caixa: '6', colaboradorNo: '', colaboradorNome: '', valorRapport: 0, sangria: 0, dinheiro: 0, multibanco: 0, tickets: 0, delivery: 0, mop: 0, diferenca: 0 },
    { caixa: '34', colaboradorNo: '', colaboradorNome: 'UberEats', valorRapport: 0, sangria: 0, dinheiro: 0, multibanco: 0, tickets: 0, delivery: 0, mop: 0, diferenca: 0 },
    { caixa: '34', colaboradorNo: '', colaboradorNome: 'Glovo', valorRapport: 0, sangria: 0, dinheiro: 0, multibanco: 0, tickets: 0, delivery: 0, mop: 0, diferenca: 0 },
    { caixa: '61', colaboradorNo: '', colaboradorNome: 'MOP', valorRapport: 0, sangria: 0, dinheiro: 0, multibanco: 0, tickets: 0, delivery: 0, mop: 0, diferenca: 0 }
  ];

  const handleAddNewDepositForTurn = (date: string, turn: 'Abertura' | 'Fecho') => {
    const existing = deposits.find(d => d.date === date && d.turn === turn);
    if (existing) {
      setEditingDeposit(existing);
      return;
    }

    const defaultRows = createDefaultDepositRows();
    const defaultManagerId = employees.find(e => e.isActive && e.role === 'GERENTE')?.id || employees[0]?.id || '';

    const newDep: DepositRecord = {
      id: `dep_${date}_${turn}_${Date.now()}`,
      date: date,
      turn: turn,
      managerId: defaultManagerId,
      rows: defaultRows,
      comments: '',
      isLocked: false
    };

    setEditingDeposit(newDep);
  };

  const handleSaveDepositEdit = async (forceLock?: boolean) => {
    if (!editingDeposit) return;
    try {
      const recordToSave: DepositRecord = {
        ...editingDeposit,
        isLocked: forceLock === true ? true : (editingDeposit.isLocked || false)
      };
      await saveDeposit(restaurantId, recordToSave);
      setEditingDeposit(null);
      await loadData();
    } catch (err) {
      console.error(err);
      alert("Erro ao gravar folha de depósito.");
    }
  };

  const handleDeleteDepositAction = async (id: string) => {
    if (confirm("Desejas eliminar este depósito?")) {
      try {
        await deleteDeposit(restaurantId, id);
        await loadData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleCloseDayDeposits = async (date: string, dayState: any) => {
    if (!dayState.abertura && !dayState.fecho) {
      alert("Por favor, preencha pelo menos um turno de depósito (Abertura ou Fecho) antes de encerrar o dia.");
      return;
    }
    if (confirm(`Tem a certeza que deseja encerrar o dia ${formatDateToDMY(date)}? Todos os turnos de depósito registados para este dia serão bloqueados.`)) {
      try {
        if (dayState.abertura) {
          await saveDeposit(restaurantId, { ...dayState.abertura, isLocked: true });
        }
        if (dayState.fecho) {
          await saveDeposit(restaurantId, { ...dayState.fecho, isLocked: true });
        }
        await loadData();
        alert("Dia encerrado e validado com sucesso! 🔒");
      } catch (err) {
        console.error(err);
        alert("Erro ao encerrar o dia.");
      }
    }
  };

  const handleRowChange = (index: number, field: keyof DepositRow, value: any) => {
    if (!editingDeposit) return;
    const updatedRows = [...editingDeposit.rows];
    let val = value;
    if (field !== 'colaboradorNo' && field !== 'colaboradorNome' && field !== 'caixa') {
      val = value === '' ? 0 : Number(value);
    }
    
    updatedRows[index] = {
      ...updatedRows[index],
      [field]: val
    };

    if (field === 'colaboradorNo' && val) {
      const trimmedVal = String(val).trim();
      if (trimmedVal) {
        const foundEmp = employees.find(emp => emp.mecanografico && String(emp.mecanografico).trim() === trimmedVal);
        if (foundEmp) {
          updatedRows[index].colaboradorNome = foundEmp.name;
        }
      }
    }

    const row = updatedRows[index];
    const rowTotal = (row.sangria || 0) + (row.dinheiro || 0) + (row.multibanco || 0) + (row.tickets || 0) + (row.delivery || 0) + (row.mop || 0);
    row.diferenca = rowTotal - (row.valorRapport || 0);

    setEditingDeposit({
      ...editingDeposit,
      rows: updatedRows
    });
  };

  const getDepositRecordTotal = (dep?: DepositRecord): number => {
    if (!dep) return 0;
    if (!dep.rows) return (dep as any).amount || 0;
    return dep.rows.reduce((sum, row) => {
      return sum + (row.dinheiro || 0) + (row.sangria || 0) + (row.multibanco || 0) + (row.tickets || 0) + (row.delivery || 0) + (row.mop || 0);
    }, 0);
  };

  const getDepositRecordCash = (dep?: DepositRecord): number => {
    if (!dep) return 0;
    if (!dep.rows) return (dep as any).amount || 0;
    return dep.rows.reduce((sum, row) => {
      return sum + (row.dinheiro || 0) + (row.sangria || 0);
    }, 0);
  };

  const getDepositRecordFieldTotal = (depToSum: DepositRecord, field: keyof DepositRow): number => {
    if (!depToSum || !depToSum.rows) return 0;
    return depToSum.rows.reduce((sum, row) => {
      const val = row[field];
      return sum + (typeof val === 'number' ? val : 0);
    }, 0);
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

  const formatDateToDMY = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const getWeekdayName = (dateStr: string) => {
    if (!dateStr) return '';
    // Use an explicit offset-splitting to avoid timezone shift on plain date strings
    const parts = dateStr.split('-');
    const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const dayName = date.toLocaleDateString('pt-PT', { weekday: 'long' });
    return dayName.charAt(0).toUpperCase() + dayName.slice(1);
  };

  const formatMonthLabel = (yearMonth: string) => {
    if (!yearMonth) return '';
    const [year, month] = yearMonth.split('-');
    const monthNamesPt = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    const idx = parseInt(month, 10) - 1;
    return `${monthNamesPt[idx] || month} ${year}`;
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
                <h3 className="text-xl font-extrabold text-slate-800 uppercase tracking-tighter flex items-center gap-2">
                  Registar Contagem de Cofre {editingCofre.isLocked && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border">🔒 Validado & Bloqueado</span>}
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
                <Printer size={16} /> Imprimir
              </button>
            </div>
          </div>

          {editingCofre.isLocked && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-3 rounded-xl font-bold flex items-center gap-2 print:hidden">
              <span>🔒 Esta contagem está validada e bloqueada pelo gerente. Os campos de inserção de dados estão desativados para edição.</span>
            </div>
          )}

          {/* Form Meta Setup */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100 print:bg-white print:border-0 print:grid-cols-4 print:p-2">
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Data</label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 print:hidden" size={14} />
                <input 
                  type="date"
                  disabled={editingCofre.isLocked}
                  value={editingCofre.date}
                  onChange={(e) => setEditingCofre({ ...editingCofre, date: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs text-gray-800 outline-none focus:ring-1 focus:ring-blue-500 print:border-0 print:pl-0 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Turno</label>
              <div className="relative">
                <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 print:hidden" size={14} />
                <select
                  disabled={editingCofre.isLocked}
                  value={editingCofre.turn}
                  onChange={(e) => setEditingCofre({ ...editingCofre, turn: e.target.value as any })}
                  className="w-full pl-10 pr-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs text-gray-800 outline-none focus:ring-1 focus:ring-blue-500 print:border-0 print:pl-0 appearance-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="Abertura">Abertura</option>
                  <option value="Tarde">Intermédio</option>
                  <option value="Fecho">Fecho</option>
                </select>
              </div>
            </div>

            {editingCofre.turn === 'Tarde' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:col-span-2">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Gerente Abertura</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 print:hidden" size={14} />
                    <select
                      disabled={editingCofre.isLocked}
                      value={editingCofre.managerId}
                      onChange={(e) => setEditingCofre({ ...editingCofre, managerId: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs text-slate-800 outline-none focus:ring-1 focus:ring-blue-500 print:border-0 print:pl-0 appearance-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      {employees.filter(e => e.role === 'GERENTE').map(e => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Gerente de Fecho</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 print:hidden" size={14} />
                    <select
                      disabled={editingCofre.isLocked}
                      value={editingCofre.managerId2 || ''}
                      onChange={(e) => setEditingCofre({ ...editingCofre, managerId2: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs text-slate-800 outline-none focus:ring-1 focus:ring-blue-500 print:border-0 print:pl-0 appearance-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">-- Selecione o Gerente de Fecho --</option>
                      {employees.filter(e => e.role === 'GERENTE').map(e => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Gerente de Turno</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 print:hidden" size={14} />
                  <select
                    disabled={editingCofre.isLocked}
                    value={editingCofre.managerId}
                    onChange={(e) => setEditingCofre({ ...editingCofre, managerId: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs text-gray-800 outline-none focus:ring-1 focus:ring-blue-500 print:border-0 print:pl-0 appearance-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    {employees.filter(e => e.role === 'GERENTE').map(e => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Fundos de Gaveta 🔒</label>
              <div className="flex gap-2 items-center">
                <input 
                  type="number"
                  disabled={true}
                  placeholder="Qtd"
                  value={editingCofre.fundosCount}
                  className="w-1/2 px-3 py-2 bg-slate-100 border border-slate-200 text-slate-500 rounded-xl font-bold text-xs text-center cursor-not-allowed outline-none"
                />
                <input 
                  type="number"
                  disabled={true}
                  placeholder="Valor"
                  value={editingCofre.fundosValuePerFundo}
                  className="w-1/2 px-3 py-2 bg-slate-100 border border-slate-200 text-slate-500 rounded-xl font-bold text-xs text-center cursor-not-allowed outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-6">
              
              {/* CARD 1: FUNDO DE GERENTE (AZUL ESCURO) */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center border-b border-slate-200">
                  <h4 className="font-extrabold uppercase text-xs tracking-wider flex items-center gap-2">
                    <User size={14} className="text-blue-400" /> FUNDO DE GERENTE
                  </h4>
                  <div className="bg-white text-blue-900 px-3 py-1 rounded-lg border border-slate-200 font-black text-sm shadow-sm">
                    {formatEuro(editingCofre.fundoGerente.total)}
                  </div>
                </div>

                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Moedas */}
                  <div className="space-y-2">
                    <div className="bg-gray-50 px-2 py-1.5 rounded-lg text-slate-500 font-extrabold text-[10px] uppercase text-center border">
                      Moedas
                    </div>
                    {DENOMINATIONS_COINS.map(coin => {
                      const coinKey = coin.value.toFixed(2);
                      const qty = editingCofre.fundoGerente.moedas[coinKey] || 0;
                      return (
                        <div key={`fg_coin_${coinKey}`} className="flex items-center justify-between gap-2 border-b border-gray-50 pb-2">
                          <span className="text-xs font-bold text-gray-500 w-16">{coin.label}</span>
                          <input 
                            type="number"
                            disabled={editingCofre.isLocked}
                            min="0"
                            placeholder="Qtd"
                            value={qty || ''}
                            onChange={(e) => handleUpdateSafeCountInput('fundoGerente', 'moedas', coinKey, Number(e.target.value))}
                            className="w-16 h-8 text-center bg-gray-50 border rounded-lg text-xs font-bold font-mono outline-none focus:bg-white print:border-0 disabled:opacity-50"
                          />
                          <span className="text-xs font-mono font-bold text-gray-700 w-16 text-right">
                            {formatEuro(qty * coin.rollValue)}
                          </span>
                        </div>
                      );
                    })}
                    {/* Loose/Soltas */}
                    <div className="flex flex-col items-center justify-center gap-1.5 pt-2 border-t border-dashed">
                      <span className="text-xs font-extrabold text-blue-600 text-center block w-full">Moedas Soltas</span>
                      <input 
                        type="number"
                        disabled={editingCofre.isLocked}
                        step="0.01"
                        placeholder="Valor €"
                        value={editingCofre.fundoGerente.moedas.loose || ''}
                        onChange={(e) => handleUpdateSafeCountInput('fundoGerente', 'moedas', 'loose', Number(e.target.value))}
                        className="w-24 h-8 text-center px-2 bg-gray-50 border rounded-lg text-xs font-bold font-mono outline-none focus:bg-white disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* Notas */}
                  <div className="space-y-2">
                    <div className="bg-gray-50 px-2 py-1.5 rounded-lg text-slate-500 font-extrabold text-[10px] uppercase text-center border">
                      Notas
                    </div>
                    {DENOMINATIONS_NOTES.map(note => {
                      const noteKey = note.value.toString();
                      const qty = editingCofre.fundoGerente.notas[noteKey] || 0;
                      return (
                        <div key={`fg_note_${noteKey}`} className="flex items-center justify-between gap-2 border-b border-gray-50 pb-2">
                          <span className="text-xs font-bold text-gray-500 w-16">{note.label}</span>
                          <input 
                            type="number"
                            disabled={editingCofre.isLocked}
                            min="0"
                            placeholder="Qtd"
                            value={qty || ''}
                            onChange={(e) => handleUpdateSafeCountInput('fundoGerente', 'notas', noteKey, Number(e.target.value))}
                            className="w-16 h-8 text-center bg-gray-50 border rounded-lg text-xs font-bold font-mono outline-none focus:bg-white print:border-0 disabled:opacity-50"
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

              {/* CARD 2: COFRE (AZUL ESCURO) */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center border-b border-slate-200">
                  <h4 className="font-extrabold uppercase text-xs tracking-wider flex items-center gap-2">
                    <Coins size={14} className="text-blue-400" /> Cofre
                  </h4>
                  <div className="bg-white text-blue-900 px-3 py-1 rounded-lg border border-slate-200 font-black text-sm shadow-sm">
                    {formatEuro(editingCofre.cofre.total)}
                  </div>
                </div>

                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Moedas */}
                  <div className="space-y-2">
                    <div className="bg-gray-50 px-2 py-1.5 rounded-lg text-slate-500 font-extrabold text-[10px] uppercase text-center border">
                      Moedas
                    </div>
                    {DENOMINATIONS_COINS.map(coin => {
                      const coinKey = coin.value.toFixed(2);
                      const qty = editingCofre.cofre.moedas[coinKey] || 0;
                      return (
                        <div key={`cof_coin_${coinKey}`} className="flex items-center justify-between gap-2 border-b border-gray-50 pb-2">
                          <span className="text-xs font-bold text-gray-500 w-16">{coin.label}</span>
                          <input 
                            type="number"
                            disabled={editingCofre.isLocked}
                            min="0"
                            placeholder="Qtd"
                            value={qty || ''}
                            onChange={(e) => handleUpdateSafeCountInput('cofre', 'moedas', coinKey, Number(e.target.value))}
                            className="w-16 h-8 text-center bg-gray-50 border rounded-lg text-xs font-bold font-mono outline-none focus:bg-white print:border-0 disabled:opacity-50"
                          />
                          <span className="text-xs font-mono font-bold text-gray-700 w-16 text-right">
                            {formatEuro(qty * coin.rollValue)}
                          </span>
                        </div>
                      );
                    })}
                    {/* Loose/Soltas */}
                    <div className="flex flex-col items-center justify-center gap-1.5 pt-2 border-t border-dashed">
                      <span className="text-xs font-extrabold text-blue-600 text-center block w-full">Moedas Soltas</span>
                      <input 
                        type="number"
                        disabled={editingCofre.isLocked}
                        step="0.01"
                        placeholder="Valor €"
                        value={editingCofre.cofre.moedas.loose || ''}
                        onChange={(e) => handleUpdateSafeCountInput('cofre', 'moedas', 'loose', Number(e.target.value))}
                        className="w-24 h-8 text-center px-2 bg-gray-50 border rounded-lg text-xs font-bold font-mono outline-none focus:bg-white disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* Notas */}
                  <div className="space-y-2">
                    <div className="bg-gray-50 px-2 py-1.5 rounded-lg text-slate-500 font-extrabold text-[10px] uppercase text-center border">
                      Notas
                    </div>
                    {DENOMINATIONS_NOTES.map(note => {
                      const noteKey = note.value.toString();
                      const qty = editingCofre.cofre.notas[noteKey] || 0;
                      return (
                        <div key={`cof_note_${noteKey}`} className="flex items-center justify-between gap-2 border-b border-gray-50 pb-2">
                          <span className="text-xs font-bold text-gray-500 w-16">{note.label}</span>
                          <input 
                            type="number"
                            disabled={editingCofre.isLocked}
                            min="0"
                            placeholder="Qtd"
                            value={qty || ''}
                            onChange={(e) => handleUpdateSafeCountInput('cofre', 'notas', noteKey, Number(e.target.value))}
                            className="w-16 h-8 text-center bg-gray-50 border rounded-lg text-xs font-bold font-mono outline-none focus:bg-white print:border-0 disabled:opacity-50"
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

          {/* BOTTOM SUMMARY - SYSTEM DARK BLUE STYLE */}
          {(() => {
            const autoMoedasProsegurVal = prosegurDeposits
              .filter(p => p.date === editingCofre.date)
              .reduce((sum, p) => sum + (p.amountCoins || 0), 0);
            const autoTotalVal = (editingCofre.fundoGerente?.total || 0) + (editingCofre.cofre?.total || 0) + (editingCofre.totalFaturas || 0) + autoMoedasProsegurVal;
            const autoDiferencaVal = 1000 - autoTotalVal;

            return (
              <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-6 items-center print:bg-white print:border-t">
                {/* Total Faturas */}
                <div className="bg-white p-4 rounded-xl border border-blue-100 text-center shadow-sm h-full flex flex-col justify-center">
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Total Faturas
                  </span>
                  <span className="text-base font-extrabold text-slate-800">
                    {formatEuro(editingCofre.totalFaturas)}
                  </span>
                </div>

                {/* Moedas Prosegur Automatic display */}
                <div className="bg-white p-4 rounded-xl border border-blue-100 text-center shadow-sm h-full flex flex-col justify-center">
                  <span className="block text-[10px] font-black text-blue-900 uppercase tracking-widest mb-1">
                    Moedas Prosegur
                  </span>
                  <span className="text-base font-extrabold text-blue-900 font-mono">
                    {formatEuro(autoMoedasProsegurVal)}
                  </span>
                </div>

                {/* Total Display */}
                <div className="bg-white p-4 rounded-xl border border-blue-100 text-center shadow-sm h-full flex flex-col justify-center">
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Total
                  </span>
                  <span className="text-xl font-black text-slate-800">
                    {formatEuro(autoTotalVal)}
                  </span>
                </div>

                {/* Diferença box */}
                <div className="bg-white p-4 rounded-xl border border-blue-100 text-center shadow-sm h-full flex flex-col justify-center">
                  <span className="block text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">
                    Diferença
                  </span>
                  <span className={`text-base font-black font-mono ${autoDiferencaVal !== 0 ? "text-red-600" : "text-green-600"}`}>
                    {formatEuro(autoDiferencaVal)}
                  </span>
                </div>
              </div>
            );
          })()}

          <div className="print:hidden flex justify-end gap-3 pt-4 border-t">
            {editingCofre.isLocked ? (
              <button
                onClick={() => setEditingCofre(null)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-wider"
              >
                Voltar
              </button>
            ) : (
              <>
                <button
                  onClick={() => setEditingCofre(null)}
                  className="px-5 py-2 hover:bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs uppercase"
                >
                  Voltar
                </button>
                <button
                  onClick={() => handleSaveCofreCountEdit(false)}
                  className="bg-slate-600 text-white px-5 py-2 rounded-xl hover:bg-slate-700 font-bold text-xs uppercase tracking-wider shadow-sm"
                >
                  Guardar
                </button>
                <button
                  onClick={() => {
                    if (confirm("Deseja mesmo submeter? A contagem será bloqueada permanentemente e não poderá sofrer mais alterações.")) {
                      handleSaveCofreCountEdit(true);
                    }
                  }}
                  className="bg-blue-600 text-white px-6 py-2 rounded-xl hover:bg-blue-700 font-bold text-xs uppercase tracking-wider shadow-md shadow-blue-50"
                >
                  Submeter 🔒
                </button>
              </>
            )}
          </div>
        </div>
      ) : editingDeposit ? (
        
        /* DEPÓSITO FORM (SPREADSHEET MULTI-ROW) */
        <div className="space-y-6 max-w-7xl mx-auto bg-white p-6 rounded-3xl border shadow-sm">
          {/* Main Excel Styled Brand Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-5 gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-amber-500 text-white p-2.5 rounded-2xl shadow-sm">
                <Landmark size={24} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">
                  FOLHA DE DEPÓSITO McD VIA CATARINA
                </h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                  Reconciliação e Fecho de Turno de Caixa — {editingDeposit.turn}
                </p>
              </div>
            </div>

            {editingDeposit.isLocked && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-[10px] font-black uppercase tracking-wider">
                🔒 Validado & Bloqueado
              </span>
            )}
          </div>

          {/* Form Metadata Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Data do Depósito</label>
              <input 
                type="date"
                value={editingDeposit.date}
                disabled={editingDeposit.isLocked}
                onChange={(e) => setEditingDeposit({ ...editingDeposit, date: e.target.value })}
                className="w-full px-4 py-2 border rounded-xl font-bold text-xs bg-white text-slate-700 focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Turno</label>
              <select
                value={editingDeposit.turn}
                disabled={editingDeposit.isLocked}
                onChange={(e) => setEditingDeposit({ ...editingDeposit, turn: e.target.value as 'Abertura' | 'Fecho' })}
                className="w-full px-4 py-2 border rounded-xl font-bold text-xs bg-white text-slate-700"
              >
                <option value="Abertura">Abertura</option>
                <option value="Fecho">Fecho</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Gerente Responsável</label>
              <select
                value={editingDeposit.managerId}
                disabled={editingDeposit.isLocked}
                onChange={(e) => setEditingDeposit({ ...editingDeposit, managerId: e.target.value })}
                className="w-full px-4 py-2 border rounded-xl font-bold text-xs bg-white text-slate-700"
              >
                {employees.filter(e => e.role === 'GERENTE').map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Spreadsheet-like Table Board */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-inner bg-white">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wide">
                  <th className="px-3 py-3 border-r border-slate-200 text-center w-16">Caixa</th>
                  <th className="px-3 py-3 border-r border-slate-200 text-center w-24">Nº Colab.</th>
                  <th className="px-3 py-3 border-r border-slate-200 w-44">Nome Colaborador</th>
                  <th className="px-3 py-3 border-r border-slate-200 text-right w-28">Valor Rapport</th>
                  <th className="px-3 py-3 border-r border-slate-200 text-right w-24">Sangria</th>
                  <th className="px-3 py-3 border-r border-slate-200 text-right w-24">Dinheiro €</th>
                  <th className="px-3 py-3 border-r border-slate-200 text-right w-28">Multibanco</th>
                  <th className="px-3 py-3 border-r border-slate-200 text-right w-24">Tickets</th>
                  <th className="px-3 py-3 border-r border-slate-200 text-right w-28">Delivery</th>
                  <th className="px-3 py-3 border-r border-slate-200 text-right w-24">Mop</th>
                  <th className="px-3 py-3 text-right w-28">Diferença</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                {editingDeposit.rows.map((row, idx) => {
                  const isDeliveryOrMop = row.colaboradorNome === 'UberEats' || row.colaboradorNome === 'Glovo' || row.colaboradorNome === 'MOP';

                  return (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      {/* CAIXA */}
                      <td className="border-r border-slate-150 p-1 bg-slate-50/75 text-center">
                        <input
                          type="text"
                          disabled={editingDeposit.isLocked}
                          value={row.caixa}
                          onChange={(e) => handleRowChange(idx, 'caixa', e.target.value)}
                          className="w-full text-center p-1 bg-transparent border-none text-slate-800 font-extrabold text-xs focus:outline-none"
                        />
                      </td>

                      {/* COLABORADOR Nº */}
                      <td className="border-r border-slate-150 p-1 text-center">
                        <input
                          type="text"
                          disabled={editingDeposit.isLocked}
                          value={row.colaboradorNo || ''}
                          onChange={(e) => handleRowChange(idx, 'colaboradorNo', e.target.value)}
                          className="w-full text-center p-1 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-amber-500 rounded font-mono text-xs text-slate-700"
                          placeholder="—"
                        />
                      </td>

                      {/* COLABORADOR NOME */}
                      <td className="border-r border-slate-150 p-1">
                        <input
                          type="text"
                          disabled={editingDeposit.isLocked || isDeliveryOrMop}
                          value={row.colaboradorNome}
                          onChange={(e) => handleRowChange(idx, 'colaboradorNome', e.target.value)}
                          className={`w-full p-1 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-amber-500 rounded text-xs ${isDeliveryOrMop ? 'font-extrabold text-amber-800' : 'text-slate-850 font-medium'}`}
                          placeholder="Nome..."
                        />
                      </td>

                      {/* VALOR RAPPORT */}
                      <td className="border-r border-slate-150 p-1">
                        <input
                          type="number"
                          step="0.01"
                          disabled={editingDeposit.isLocked}
                          value={row.valorRapport || ''}
                          onChange={(e) => handleRowChange(idx, 'valorRapport', e.target.value)}
                          className="w-full text-right p-1 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-amber-500 rounded font-mono text-xs text-slate-800"
                          placeholder="0.00"
                        />
                      </td>

                      {/* SANGRIA */}
                      <td className="border-r border-slate-150 p-1">
                        <input
                          type="number"
                          step="0.01"
                          disabled={editingDeposit.isLocked || isDeliveryOrMop}
                          value={row.sangria || ''}
                          onChange={(e) => handleRowChange(idx, 'sangria', e.target.value)}
                          className="w-full text-right p-1 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-amber-500 rounded font-mono text-xs disabled:bg-slate-50/80 disabled:text-gray-300"
                          placeholder={isDeliveryOrMop ? "—" : "0.00"}
                        />
                      </td>

                      {/* DINHEIRO € */}
                      <td className="border-r border-slate-150 p-1">
                        <input
                          type="number"
                          step="0.01"
                          disabled={editingDeposit.isLocked || isDeliveryOrMop}
                          value={row.dinheiro || ''}
                          onChange={(e) => handleRowChange(idx, 'dinheiro', e.target.value)}
                          className="w-full text-right p-1 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-amber-500 rounded font-mono text-xs disabled:bg-slate-50/80 disabled:text-gray-300"
                          placeholder={isDeliveryOrMop ? "—" : "0.00"}
                        />
                      </td>

                      {/* MULTIBANCO */}
                      <td className="border-r border-slate-150 p-1">
                        <input
                          type="number"
                          step="0.01"
                          disabled={editingDeposit.isLocked || isDeliveryOrMop}
                          value={row.multibanco || ''}
                          onChange={(e) => handleRowChange(idx, 'multibanco', e.target.value)}
                          className="w-full text-right p-1 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-amber-500 rounded font-mono text-xs disabled:bg-slate-50/80 disabled:text-gray-300"
                          placeholder={isDeliveryOrMop ? "—" : "0.00"}
                        />
                      </td>

                      {/* TICKETS */}
                      <td className="border-r border-slate-150 p-1">
                        <input
                          type="number"
                          step="0.01"
                          disabled={editingDeposit.isLocked || isDeliveryOrMop}
                          value={row.tickets || ''}
                          onChange={(e) => handleRowChange(idx, 'tickets', e.target.value)}
                          className="w-full text-right p-1 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-amber-500 rounded font-mono text-xs disabled:bg-slate-50/80 disabled:text-gray-300"
                          placeholder={isDeliveryOrMop ? "—" : "0.00"}
                        />
                      </td>

                      {/* DELIVERY */}
                      <td className="border-r border-slate-150 p-1">
                        <input
                          type="number"
                          step="0.01"
                          disabled={editingDeposit.isLocked || !isDeliveryOrMop || row.colaboradorNome === 'MOP'}
                          value={row.delivery || ''}
                          onChange={(e) => handleRowChange(idx, 'delivery', e.target.value)}
                          className="w-full text-right p-1 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-amber-500 rounded font-mono text-xs disabled:bg-slate-50/80 disabled:text-gray-300"
                          placeholder={(!isDeliveryOrMop || row.colaboradorNome === 'MOP') ? "—" : "0.00"}
                        />
                      </td>

                      {/* MOP */}
                      <td className="border-r border-slate-150 p-1">
                        <input
                          type="number"
                          step="0.01"
                          disabled={editingDeposit.isLocked || row.colaboradorNome !== 'MOP'}
                          value={row.mop || ''}
                          onChange={(e) => handleRowChange(idx, 'mop', e.target.value)}
                          className="w-full text-right p-1 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-amber-500 rounded font-mono text-xs disabled:bg-slate-50/80 disabled:text-gray-300"
                          placeholder={row.colaboradorNome !== 'MOP' ? "—" : "0.00"}
                        />
                      </td>

                      {/* DIFERENÇA */}
                      <td className="p-1 text-right font-mono font-black text-xs bg-slate-50/40">
                        <span className={row.diferenca === 0 ? "text-green-600" : row.diferenca > 0 ? "text-blue-600" : "text-red-600 font-extrabold"}>
                          {row.diferenca > 0 ? `+` : ''}{formatEuro(row.diferenca)}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {/* Grid Totals Row */}
                {(() => {
                  const totRapport = getDepositRecordFieldTotal(editingDeposit, 'valorRapport');
                  const totSangria = getDepositRecordFieldTotal(editingDeposit, 'sangria');
                  const totDinheiro = getDepositRecordFieldTotal(editingDeposit, 'dinheiro');
                  const totMultibanco = getDepositRecordFieldTotal(editingDeposit, 'multibanco');
                  const totTickets = getDepositRecordFieldTotal(editingDeposit, 'tickets');
                  const totDelivery = getDepositRecordFieldTotal(editingDeposit, 'delivery');
                  const totMOP = getDepositRecordFieldTotal(editingDeposit, 'mop');
                  const totDiferenca = getDepositRecordFieldTotal(editingDeposit, 'diferenca');

                  return (
                    <tr className="bg-slate-50/75 font-mono font-black text-xs border-t-2 border-slate-200">
                      <td colSpan={3} className="px-3 py-3 border-r border-slate-200 text-center text-[10px] font-black uppercase text-slate-500 tracking-wider">TOTAL</td>
                      <td className="px-3 py-3 border-r border-slate-200 text-right">{formatEuro(totRapport)}</td>
                      <td className="px-3 py-3 border-r border-slate-200 text-right">{formatEuro(totSangria)}</td>
                      <td className="px-3 py-3 border-r border-slate-200 text-right">{formatEuro(totDinheiro)}</td>
                      <td className="px-3 py-3 border-r border-slate-200 text-right">{formatEuro(totMultibanco)}</td>
                      <td className="px-3 py-3 border-r border-slate-200 text-right">{formatEuro(totTickets)}</td>
                      <td className="px-3 py-3 border-r border-slate-200 text-right">{formatEuro(totDelivery)}</td>
                      <td className="px-3 py-3 border-r border-slate-200 text-right">{formatEuro(totMOP)}</td>
                      <td className="px-3 py-3 text-right">
                        <span className={totDiferenca === 0 ? "text-green-600" : totDiferenca > 0 ? "text-blue-600" : "text-red-600"}>
                          {totDiferenca > 0 ? `+` : ''}{formatEuro(totDiferenca)}
                        </span>
                      </td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>

          {/* Bottom Layout: Aligned cards, then Comment Section */}
          <div className="space-y-6 pt-4">
            {/* Cards Grid */}
            {(() => {
              const totSangria = getDepositRecordFieldTotal(editingDeposit, 'sangria');
              const totDinheiro = getDepositRecordFieldTotal(editingDeposit, 'dinheiro');
              const totMultibanco = getDepositRecordFieldTotal(editingDeposit, 'multibanco');
              const totTickets = getDepositRecordFieldTotal(editingDeposit, 'tickets');
              const totDelivery = getDepositRecordFieldTotal(editingDeposit, 'delivery');
              const totMOP = getDepositRecordFieldTotal(editingDeposit, 'mop');

              const cashTotalVal = totDinheiro + totSangria;
              const grandTotalVal = cashTotalVal + totMultibanco + totTickets + totDelivery + totMOP;

              const cardClass = (val: number) => 
                val > 0 
                  ? "bg-amber-55/35 border border-amber-250 p-4 rounded-2xl shadow-sm text-slate-805 flex flex-col justify-between h-20 transition-all" 
                  : "bg-white border border-dashed border-slate-200 p-4 rounded-2xl text-slate-400 flex flex-col justify-between h-20 transition-all";

              return (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black text-amber-900 uppercase tracking-widest border-b border-slate-100 pb-2">
                    Resumo da Folha de Depósito
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 w-full">
                    {/* Dinheiro Card */}
                    <div className={cardClass(cashTotalVal)}>
                      <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500">Dinheiro</span>
                      <span className={`block font-mono font-black text-sm mt-1 ${cashTotalVal > 0 ? 'text-slate-805' : 'text-slate-350'}`}>{formatEuro(cashTotalVal)}</span>
                    </div>

                    {/* Multibanco Card */}
                    <div className={cardClass(totMultibanco)}>
                      <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500">Multibanco</span>
                      <span className={`block font-mono font-black text-sm mt-1 ${totMultibanco > 0 ? 'text-slate-855' : 'text-slate-350'}`}>{formatEuro(totMultibanco)}</span>
                    </div>

                    {/* Tickets Card */}
                    <div className={cardClass(totTickets)}>
                      <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500">Tickets</span>
                      <span className={`block font-mono font-black text-sm mt-1 ${totTickets > 0 ? 'text-slate-855' : 'text-slate-350'}`}>{formatEuro(totTickets)}</span>
                    </div>

                    {/* Delivery Card */}
                    <div className={cardClass(totDelivery)}>
                      <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500">Delivery</span>
                      <span className={`block font-mono font-black text-sm mt-1 ${totDelivery > 0 ? 'text-slate-855' : 'text-slate-350'}`}>{formatEuro(totDelivery)}</span>
                    </div>

                    {/* Mop Card */}
                    <div className={cardClass(totMOP)}>
                      <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500">MOP</span>
                      <span className={`block font-mono font-black text-sm mt-1 ${totMOP > 0 ? 'text-slate-855' : 'text-slate-350'}`}>{formatEuro(totMOP)}</span>
                    </div>

                    {/* Total Card */}
                    <div className="bg-amber-100/40 border border-amber-305/75 p-4 rounded-2xl shadow-sm text-slate-900 flex flex-col justify-between h-20 font-bold transition-all">
                      <span className="block text-[9px] font-black uppercase tracking-wider text-amber-900">Total</span>
                      <span className="block font-mono font-black text-sm text-amber-955 mt-1">{formatEuro(grandTotalVal)}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Comment Section (Notas) */}
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Notas</label>
              <textarea 
                rows={2}
                disabled={editingDeposit.isLocked}
                placeholder=""
                value={editingDeposit.comments || ''}
                onChange={(e) => setEditingDeposit({ ...editingDeposit, comments: e.target.value })}
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-2xl text-xs font-medium focus:ring-1 focus:ring-amber-500 shadow-sm"
              />
            </div>
          </div>

          {/* Controller Actions Panel */}
          <div className="flex justify-between pt-6 border-t border-slate-100">
            {editingDeposit.isLocked ? (
              <div className="w-full flex justify-between gap-3">
                <button
                  onClick={() => {
                    if (confirm("Deseja desbloquear esta folha? Isto permitirá novas alterações e re-gravar valores.")) {
                      setEditingDeposit({ ...editingDeposit, isLocked: false });
                    }
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
                >
                  🔓 Desbloquear Folha
                </button>
                <button
                  type="button"
                  onClick={() => setEditingDeposit(null)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-wider"
                >
                  Sair da Visualização
                </button>
              </div>
            ) : (
              <div className="w-full flex justify-between">
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Deseja repovoar a folha com os valores padrão zerados? Esta alteração perderá dados temporários.")) {
                        setEditingDeposit({
                          ...editingDeposit,
                          rows: createDefaultDepositRows()
                        });
                      }
                    }}
                    className="px-4 py-2 border border-dashed border-red-350 text-red-500 hover:bg-red-50 text-xs font-bold uppercase rounded-xl transition-colors"
                  >
                    Recomeçar Tabela
                  </button>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingDeposit(null)}
                    className="px-5 py-2 hover:bg-slate-50 border rounded-xl font-bold text-xs uppercase text-slate-600"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveDepositEdit(false)}
                    className="bg-slate-700 hover:bg-slate-800 text-white px-5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm transition-colors"
                  >
                    Guardar Rascunho
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Deseja validar e encerrar este depósito? A folha ficará bloqueada secundariamente para edição.")) {
                        handleSaveDepositEdit(true);
                      }
                    }}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md shadow-amber-50 transition-colors"
                  >
                    Validar e Fechar 🔒
                  </button>
                </div>
              </div>
            )}
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

          {/* Tab 1: CONTAGEM DE COFRE */}
          {activeTab === 'cofre' && (
            <div className="space-y-6">
              
              {/* Selector area to add past or other days for counting */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 gap-4">
                <div></div>
                
                <div className="flex items-center gap-2 self-stretch sm:self-auto">
                  <input 
                    type="date"
                    value={customDateInput}
                    onChange={(e) => setCustomDateInput(e.target.value)}
                    className="px-3 py-1.5 border border-slate-200 rounded-xl font-bold text-xs bg-white text-gray-700 focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => {
                      if (!customDateInput) return;
                      // Add to custom dates list if not already there
                      if (!extraDates.includes(customDateInput)) {
                        setExtraDates([...extraDates, customDateInput]);
                      }
                      alert(`Dia ${customDateInput} iniciado. Veja a linha correspondente abaixo.`);
                    }}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider px-4 py-2 rounded-xl transition-all shadow-sm"
                  >
                    <Plus size={14} /> Nova Contagem
                  </button>
                </div>
              </div>

              {isLoading ? (
                <div className="p-12 text-center text-xs text-gray-400 font-black tracking-widest uppercase">
                  A carregar dados do banco...
                </div>
              ) : (
                <div className="space-y-8">
                  
                  {/* SECTION 1: DIAS EM CURSO (ACTIVE DAYS) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h3 className="font-extrabold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                        Contagens Abertas
                      </h3>
                      <span className="text-[10px] bg-amber-50 text-amber-700 font-black px-2.5 py-1 rounded-full border border-amber-100 uppercase tracking-wider">
                        {groupedDays.filter(d => !d.isClosed).length} Dias Ativos
                      </span>
                    </div>

                    <div className="space-y-4">
                      {groupedDays.filter(d => !d.isClosed).map(day => {
                        const hasAbertura = !!day.abertura;
                        const hasTarde = !!day.tarde;
                        const hasFecho = !!day.fecho;

                        const isAberturaLocked = day.abertura?.isLocked || false;
                        const isTardeLocked = day.tarde?.isLocked || false;
                        const isFechoLocked = day.fecho?.isLocked || false;

                        const allThreeDone = hasAbertura && hasTarde && hasFecho && isAberturaLocked && isTardeLocked && isFechoLocked;

                        return (
                          <div key={`day_row_${day.date}`} className="bg-white rounded-2xl border border-slate-100 hover:shadow-md transition-all p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                            
                            {/* Date Column */}
                            <div className="lg:col-span-3 flex items-center gap-3">
                              <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-blue-600 shrink-0">
                                <Calendar size={18} />
                              </div>
                              <div>
                                <span className="text-sm font-extrabold text-slate-800 block">{formatDateToDMY(day.date)}</span>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                  {new Date(day.date).toLocaleDateString('pt-PT', { weekday: 'long' })}
                                </span>
                              </div>
                            </div>

                            {/* Turns Columns */}
                            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                              
                              {/* TURN 1: ABERTURA */}
                              <button
                                onClick={() => handleAddNewSafeCountForTurn(day.date, 'Abertura')}
                                className={`rounded-xl px-4 py-3 text-left border transition-all ${
                                  !hasAbertura 
                                    ? 'border-dashed border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-blue-600'
                                    : !isAberturaLocked
                                      ? 'border-amber-200 bg-amber-50/40 text-slate-800 hover:bg-amber-50 hover:border-amber-300'
                                      : 'border-blue-100 bg-blue-50/30 text-blue-850 hover:bg-blue-50 hover:border-blue-200'
                                }`}
                              >
                                <span className="text-xs font-bold block whitespace-nowrap">
                                  {!hasAbertura ? 'Abertura' : isAberturaLocked ? '🔒 Abertura Ok' : '📝 Abertura'}
                                </span>
                                {hasAbertura && (
                                  <span className="font-mono text-[10px] font-extrabold text-slate-600 block mt-0.5">
                                    {formatEuro(day.abertura!.totalGeral)}
                                  </span>
                                )}
                              </button>

                              {/* TURN 2: INTERMÉDIO (TARDE) */}
                              <button
                                onClick={() => handleAddNewSafeCountForTurn(day.date, 'Tarde')}
                                className={`rounded-xl px-4 py-3 text-left border transition-all ${
                                  !hasTarde 
                                    ? 'border-dashed border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-blue-600'
                                    : !isTardeLocked
                                      ? 'border-amber-200 bg-amber-50/40 text-slate-800 hover:bg-amber-50 hover:border-amber-300'
                                      : 'border-blue-100 bg-blue-50/30 text-blue-850 hover:bg-blue-50 hover:border-blue-200'
                                }`}
                              >
                                <span className="text-xs font-bold block whitespace-nowrap">
                                  {!hasTarde ? 'Intermédio' : isTardeLocked ? '🔒 Intermédio Ok' : '📝 Intermédio'}
                                </span>
                                {hasTarde && (
                                  <span className="font-mono text-[10px] font-extrabold text-slate-600 block mt-0.5">
                                    {formatEuro(day.tarde!.totalGeral)}
                                  </span>
                                )}
                              </button>

                              {/* TURN 3: FECHO */}
                              <button
                                onClick={() => handleAddNewSafeCountForTurn(day.date, 'Fecho')}
                                className={`rounded-xl px-4 py-3 text-left border transition-all ${
                                  !hasFecho 
                                    ? 'border-dashed border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-blue-600'
                                    : !isFechoLocked
                                      ? 'border-amber-200 bg-amber-50/40 text-slate-800 hover:bg-amber-50 hover:border-amber-300'
                                      : 'border-blue-100 bg-blue-50/30 text-blue-850 hover:bg-blue-50 hover:border-blue-200'
                                }`}
                              >
                                <span className="text-xs font-bold block whitespace-nowrap">
                                  {!hasFecho ? 'Fecho' : isFechoLocked ? '🔒 Fecho Ok' : '📝 Fecho'}
                                </span>
                                {hasFecho && (
                                  <span className="font-mono text-[10px] font-extrabold text-slate-600 block mt-0.5">
                                    {formatEuro(day.fecho!.totalGeral)}
                                  </span>
                                )}
                              </button>

                            </div>

                            {/* Close Day Action Column */}
                            <div className="lg:col-span-3 lg:text-right">
                              {allThreeDone ? (
                                <button
                                  onClick={() => handleCloseDay(day.date)}
                                  className="w-full flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl transition-all shadow-md shadow-blue-100"
                                >
                                  🔒 Encerrar Dia
                                </button>
                              ) : (
                                <div className="text-center lg:text-right">
                                  <button
                                    disabled
                                    className="w-full bg-gray-100 border text-gray-400 font-extrabold text-[10px] uppercase tracking-wider py-2.5 px-4 rounded-xl cursor-not-allowed"
                                  >
                                    Encerrar Dia
                                  </button>
                                  <span className="text-[9px] text-gray-400 font-bold uppercase mt-1 block">
                                    {!hasAbertura || !hasTarde || !hasFecho ? '' : 'Falta validar turnos'}
                                  </span>
                                </div>
                              )}
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* SECTION 2: DIAS CONTADOS / ENCERRADOS */}
                  <div className="space-y-3 pt-4">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h3 className="font-extrabold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCheck size={16} className="text-blue-600" />
                        Histórico de Contagens
                      </h3>
                      <span className="text-[10px] bg-blue-50 text-blue-700 font-black px-2.5 py-1 rounded-full border border-blue-100 uppercase tracking-wider">
                        {groupedDays.filter(d => d.isClosed).length} Dias Encerrados
                      </span>
                    </div>

                    {groupedDays.filter(d => d.isClosed).length === 0 ? (
                      <div className="p-10 text-center border border-dashed rounded-2xl text-gray-400 font-bold text-xs uppercase tracking-wider">
                        Ainda não há dias completamente encerrados nesta unidade.
                      </div>
                    ) : (
                      <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm bg-white">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-900 border-b text-[10px] font-black uppercase text-white tracking-wider">
                              <th className="px-6 py-3.5">Data do Dia</th>
                              <th className="px-6 py-3.5 text-right">Abertura</th>
                              <th className="px-6 py-3.5 text-right">Intermédio</th>
                              <th className="px-6 py-3.5 text-right">Fecho</th>
                              <th className="px-6 py-3.5 text-center">Estado</th>
                              <th className="px-6 py-3.5 text-center">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y text-xs font-bold text-gray-700">
                            {groupedDays.filter(d => d.isClosed).map(day => {
                              return (
                                <tr key={`closed_${day.date}`} className="hover:bg-slate-50/50">
                                  <td className="px-6 py-4">
                                    <span className="text-slate-800 block text-xs font-extrabold">{formatDateToDMY(day.date)}</span>
                                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-black">
                                      {new Date(day.date).toLocaleDateString('pt-PT', { weekday: 'short' })}
                                    </span>
                                  </td>
                                  
                                  <td className="px-6 py-4 text-right font-mono text-slate-600">
                                    {day.abertura ? formatEuro(day.abertura.totalGeral) : '-'}
                                  </td>
                                  <td className="px-6 py-4 text-right font-mono text-slate-600">
                                    {day.tarde ? formatEuro(day.tarde.totalGeral) : '-'}
                                  </td>
                                  <td className="px-6 py-4 text-right font-mono text-slate-600">
                                    {day.fecho ? formatEuro(day.fecho.totalGeral) : '-'}
                                  </td>
                                  
                                  <td className="px-6 py-4 text-center">
                                    <span className="inline-flex items-center gap-1 text-[9px] bg-slate-100 text-slate-700 font-extrabold uppercase px-2.5 py-0.5 rounded-full border">
                                      🔒 Fechado
                                    </span>
                                  </td>

                                  <td className="px-6 py-4">
                                    <div className="flex items-center justify-center gap-2">
                                      <button 
                                        onClick={() => {
                                          if (day.abertura) {
                                            setEditingCofre(day.abertura);
                                            setSafeEditorTab('contagem');
                                          }
                                        }}
                                        className="text-[10px] uppercase font-black text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-100/60 px-2.5 py-1 rounded-lg transition-all"
                                      >
                                        Inspecionar
                                      </button>
                                      
                                      <button
                                        onClick={async () => {
                                          if (confirm(`Pretende eliminar todo o histórico de contagens do dia ${day.date}? Esta ação é irreversível.`)) {
                                            try {
                                              const deletePromises: Promise<any>[] = [];
                                              if (day.abertura) deletePromises.push(deleteCofreCount(restaurantId, day.abertura.id));
                                              if (day.tarde) deletePromises.push(deleteCofreCount(restaurantId, day.tarde.id));
                                              if (day.fecho) deletePromises.push(deleteCofreCount(restaurantId, day.fecho.id));
                                              
                                              await Promise.all(deletePromises);
                                              alert("Histórico do dia removido com sucesso.");
                                              await loadData();
                                            } catch (e) {
                                              console.error("Erro deletando dia:", e);
                                            }
                                          }
                                        }}
                                        className="p-1 text-red-400 hover:text-red-600 rounded"
                                        title="Apagar Dia Completo"
                                      >
                                        <Trash2 size={14} />
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

                </div>
              )}
            </div>
          )}

          {/* Tab 2: DEPÓSITO BANCÁRIO */}
          {activeTab === 'depositos' && (
            <div className="space-y-6">
              {/* Header Box */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50 p-4 rounded-2xl border gap-4">
                <div>
                  <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Folha de Depósito</h4>
                </div>

                {/* Add Custom Date Tool */}
                <div className="flex items-center gap-2">
                  <input 
                    type="date"
                    value={customDateInput}
                    onChange={(e) => setCustomDateInput(e.target.value)}
                    className="px-3 py-1.5 border border-slate-200 rounded-xl font-bold text-xs bg-white text-gray-705 focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => {
                      if (!customDateInput) return;
                      if (!extraDates.includes(customDateInput)) {
                        setExtraDates([...extraDates, customDateInput]);
                      }
                      alert(`Dia ${customDateInput} iniciado. Agora pode carregar nas ações abaixo para registar os depósitos.`);
                    }}
                    className="flex items-center gap-1 bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-black text-[10px] px-3.5 py-2 uppercase tracking-wider rounded-xl transition-all shadow-md shadow-yellow-50"
                  >
                    <Plus size={14} /> Inserir Depósito
                  </button>
                </div>
              </div>

              {/* Grouped Lists: Active vs Archived */}
              <div className="space-y-6">
                {/* Active Days */}
                <div>
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">
                    Dias de Trabalho Activos ({groupedDeposits.filter(d => !d.abertura?.isLocked || !d.fecho?.isLocked).length})
                  </h5>

                  {groupedDeposits.filter(d => !d.abertura?.isLocked || !d.fecho?.isLocked).length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed border-slate-100 rounded-xl">
                      <p className="text-xs text-gray-400 font-extrabold uppercase">Não há dias ativos pendentes de depósito.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {groupedDeposits.filter(d => !d.abertura?.isLocked || !d.fecho?.isLocked).map(day => {
                        const wName = getWeekdayName(day.date);
                        const hasAbertura = !!day.abertura;
                        const hasFecho = !!day.fecho;

                        const isAberturaLocked = day.abertura?.isLocked || false;
                        const isFechoLocked = day.fecho?.isLocked || false;

                        return (
                          <div key={day.date} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between hover:border-slate-250 transition-all">
                            <div className="flex justify-between items-start border-b pb-2.5 mb-3">
                              <div>
                                <span className="block text-[10px] font-black text-slate-400 tracking-widest uppercase">{wName}</span>
                                <span className="text-sm font-extrabold text-slate-800">{formatDateToDMY(day.date)}</span>
                              </div>
                              <span className="px-2 py-0.5 bg-amber-50 border border-amber-100 text-[9px] font-black uppercase text-amber-700 rounded-lg">Em Aberto</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              {/* Abertura Column */}
                              <button
                                onClick={() => handleAddNewDepositForTurn(day.date, 'Abertura')}
                                className={`rounded-xl px-3 py-2.5 text-left border transition-all flex flex-col ${
                                  !hasAbertura 
                                    ? 'border-dashed border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-blue-600'
                                    : !isAberturaLocked
                                      ? 'border-amber-200 bg-amber-50/20 text-slate-850 hover:bg-amber-50'
                                      : 'border-blue-105 bg-blue-50/25 text-blue-900'
                                }`}
                              >
                                <span className="text-[10px] font-black block">
                                  {!hasAbertura ? '➕ Abertura' : isAberturaLocked ? '🔒 Abertura Ok' : '📝 Abertura'}
                                </span>
                                {hasAbertura && (
                                  <span className="font-mono text-[10px] font-extrabold text-slate-650 block mt-0.5">
                                    {formatEuro(getDepositRecordTotal(day.abertura))}
                                  </span>
                                )}
                              </button>

                              {/* Fecho Column */}
                              <button
                                onClick={() => handleAddNewDepositForTurn(day.date, 'Fecho')}
                                className={`rounded-xl px-3 py-2.5 text-left border transition-all flex flex-col ${
                                  !hasFecho 
                                    ? 'border-dashed border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-blue-600'
                                    : !isFechoLocked
                                      ? 'border-amber-200 bg-amber-50/20 text-slate-850 hover:bg-amber-50'
                                      : 'border-blue-105 bg-blue-50/25 text-blue-900'
                                }`}
                              >
                                <span className="text-[10px] font-black block">
                                  {!hasFecho ? '➕ Fecho' : isFechoLocked ? '🔒 Fecho Ok' : '📝 Fecho'}
                                </span>
                                {hasFecho && (
                                  <span className="font-mono text-[10px] font-extrabold text-slate-650 block mt-0.5">
                                    {formatEuro(getDepositRecordTotal(day.fecho))}
                                  </span>
                                )}
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleCloseDayDeposits(day.date, day)}
                              className="mt-3 w-full flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-650 font-black text-[10px] uppercase tracking-wider py-2 rounded-xl transition-all border border-red-200/40"
                            >
                              🔒 Encerrar o Dia
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Closed/Locked Days */}
                <div>
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">
                    Histórico Encerrado & Validado ({groupedDeposits.filter(d => d.abertura?.isLocked && d.fecho?.isLocked).length})
                  </h5>

                  {groupedDeposits.filter(d => d.abertura?.isLocked && d.fecho?.isLocked).length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/30">
                      <p className="text-xs text-gray-400 font-extrabold uppercase">Nenhum dia de depósito totalmente encerrado ainda.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {groupedDeposits.filter(d => d.abertura?.isLocked && d.fecho?.isLocked).map(day => {
                        const wName = getWeekdayName(day.date);
                        return (
                          <div key={day.date} className="bg-slate-50/40 p-4 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between hover:bg-slate-50 transition-all">
                            <div className="flex justify-between items-start border-b pb-2 mb-2">
                              <div>
                                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{wName}</span>
                                <span className="text-xs font-extrabold text-slate-700">{formatDateToDMY(day.date)}</span>
                              </div>
                              <span className="px-2 py-0.5 bg-blue-50 border border-blue-100 text-[9px] font-black uppercase text-blue-700 rounded-lg">Encerrado 🔒</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 mt-2">
                              {/* Abertura View */}
                              <button
                                onClick={() => handleAddNewDepositForTurn(day.date, 'Abertura')}
                                className="rounded-xl px-3 py-2 text-left border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 transition-all flex flex-col"
                              >
                                <span className="text-[10px] font-black block">🔒 Abertura</span>
                                <span className="font-mono text-[9px] font-extrabold text-indigo-700 mt-0.5">
                                  {formatEuro(getDepositRecordTotal(day.abertura))}
                                </span>
                              </button>

                              {/* Fecho View */}
                              <button
                                onClick={() => handleAddNewDepositForTurn(day.date, 'Fecho')}
                                className="rounded-xl px-3 py-2 text-left border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 transition-all flex flex-col"
                              >
                                <span className="text-[10px] font-black block">🔒 Fecho</span>
                                <span className="font-mono text-[9px] font-extrabold text-indigo-700 mt-0.5">
                                  {formatEuro(getDepositRecordTotal(day.fecho))}
                                </span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
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
                            <td className="px-6 py-4">{formatDateToDMY(pros.date)}</td>
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

          {/* Tab: LISTA DE FATURAS */}
          {activeTab === 'faturas' && (
            <div className="space-y-6">
              {/* Header metrics card */}
              <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                    <FileText size={18} className="text-blue-500" /> Lista de Faturas
                  </h3>
                </div>
                <div className="bg-white px-5 py-3 rounded-xl border border-blue-100 shadow-sm flex flex-col items-center sm:items-end justify-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">
                    {selectedMonth === 'All' ? 'Total Geral Faturas' : 'Total Faturas (Mês Selecionado)'}
                  </span>
                  <span className="text-lg font-black text-blue-900 font-mono">
                    {formatEuro(totalAllInvoices)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                
                {/* Left side form - Adicionar Fatura */}
                <div className="xl:col-span-4 space-y-4">
                  <div className="border bg-slate-50/50 p-5 rounded-2xl space-y-4 border-slate-100">
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Lançar Nova Fatura</h4>
                    </div>

                    <div className="space-y-3.5">
                      {/* Date Input */}
                      <div>
                        <label className="block text-[9px] font-black uppercase text-gray-400 tracking-wider mb-1">
                          Data da Fatura
                        </label>
                        <input 
                          type="date"
                          value={invoiceDateInput}
                          onChange={(e) => setInvoiceDateInput(e.target.value)}
                          className="w-full px-4 py-2 border rounded-xl font-bold text-xs bg-white text-gray-700 outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      {/* Categoria Selector */}
                      <div>
                        <label className="block text-[9px] font-black uppercase text-gray-400 tracking-wider mb-1">
                          Categoria
                        </label>
                        <select
                          value={invoiceCategoryInput}
                          onChange={(e) => setInvoiceCategoryInput(e.target.value)}
                          className="w-full px-4 py-2 border rounded-xl font-bold text-xs bg-white text-gray-705 outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {INVOICE_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      {/* Fornecedor Input */}
                      <div>
                        <label className="block text-[9px] font-black uppercase text-gray-400 tracking-wider mb-1">
                          Fornecedor
                        </label>
                        <input 
                          type="text"
                          placeholder="Ex: Makro, Supermercado..."
                          value={invoiceSupplierInput}
                          onChange={(e) => setInvoiceSupplierInput(e.target.value)}
                          className="w-full px-4 py-2 border rounded-xl font-bold text-xs bg-white text-gray-700 outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      {/* Valor Input */}
                      <div>
                        <label className="block text-[9px] font-black uppercase text-gray-400 tracking-wider mb-1">
                          Valor (€)
                        </label>
                        <input 
                          type="number"
                          step="0.01"
                          placeholder="0,00 €"
                          value={invoiceAmtInput || ''}
                          onChange={(e) => setInvoiceAmtInput(e.target.value)}
                          className="w-full px-4 py-2 border rounded-xl font-bold text-xs bg-white text-gray-700 outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={handleRegisterInvoiceMainPage}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl transition-all shadow-md mt-4 flex justify-center items-center gap-2"
                      >
                        <Plus size={14} /> Lançar Fatura
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right side list - Lista de Faturas */}
                <div className="xl:col-span-8 flex flex-col justify-start">
                  
                  {/* Month filter bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-150 mb-4 shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Filtrar por Mês:</span>
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="px-4 py-1.5 border rounded-xl font-bold text-xs bg-white text-gray-700 outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="All">Todos os Meses</option>
                        {availableMonths.map(m => (
                          <option key={m} value={m}>{formatMonthLabel(m)}</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Visual legend info */}
                    <div className="flex items-center gap-4 text-[9px] font-extrabold text-gray-400 uppercase tracking-wider">
                      <div className="flex items-center gap-1">
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                        <span>Em Aberto</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                        <span>Arquivado</span>
                      </div>
                    </div>
                  </div>

                  {filteredInvoices.length === 0 ? (
                    <div className="bg-white border rounded-2xl p-12 text-center shadow-sm">
                      <FileText size={40} className="text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-400 font-extrabold text-xs uppercase tracking-wider">
                        Não existem faturas para mostrar
                      </p>
                      <p className="text-[10px] text-gray-400 font-bold mt-1">
                        Selecione outro mês ou utilize o formulário ao lado para lançar uma nova fatura.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-150 rounded-2xl overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-gray-700">
                          <thead>
                            <tr className="bg-slate-50/70 border-b text-slate-400 font-black text-[9px] uppercase tracking-wider">
                              <th className="px-5 py-3">Data</th>
                              <th className="px-5 py-3">Categoria</th>
                              <th className="px-5 py-3">Fornecedor</th>
                              <th className="px-5 py-3 text-right">Valor</th>
                              <th className="px-5 py-3 text-center">Estado</th>
                              <th className="px-5 py-3 text-center">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y text-xs font-bold">
                            {filteredInvoices.map((item) => {
                              const isArchived = item.invoice.status === 'arquivada';
                              return (
                                <tr key={item.invoiceUniqueId} className={`hover:bg-slate-50/50 transition-colors ${isArchived ? "bg-slate-50/30 opacity-80" : ""}`}>
                                  <td className="px-5 py-3.5 whitespace-nowrap text-slate-800">
                                    {formatDateToDMY(item.date)}
                                  </td>
                                  <td className="px-5 py-3.5 whitespace-nowrap">
                                    <span className="bg-blue-50 text-blue-800 rounded-md px-2 py-0.5 text-[9px] font-extrabold uppercase">
                                      {item.invoice.category || 'Outros'}
                                    </span>
                                  </td>
                                  <td className="px-5 py-3.5 text-slate-700">
                                    {item.invoice.supplier}
                                  </td>
                                  <td className="px-5 py-3.5 text-right font-mono text-slate-800 font-extrabold">
                                    {formatEuro(item.invoice.amount)}
                                  </td>
                                  <td className="px-5 py-3.5 text-center whitespace-nowrap">
                                    {isArchived ? (
                                      <div className="flex flex-col items-center">
                                        <span className="inline-flex items-center gap-1 text-[9px] bg-slate-100 text-slate-600 font-extrabold px-2 py-0.5 rounded-md border border-slate-200 uppercase tracking-wide">
                                          📦 Arquivada
                                        </span>
                                        {item.invoice.archivedBy && (
                                          <span className="text-[8px] text-gray-400 mt-0.5 uppercase font-medium">Por: {item.invoice.archivedBy}</span>
                                        )}
                                      </div>
                                    ) : item.isLocked ? (
                                      <span className="inline-flex items-center gap-1 text-[9px] bg-blue-50 text-blue-700 font-extrabold px-2 py-0.5 rounded-md border border-blue-100 uppercase tracking-wide">
                                        🔒 Validada
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[9px] bg-emerald-50 text-emerald-700 font-extrabold px-2 py-0.5 rounded-md border border-emerald-100 uppercase tracking-wide">
                                        🟢 Em Aberto
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-5 py-3.5 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                      {!isArchived && (
                                        <button
                                          onClick={() => handleArchiveInvoice(item.cofreCountId, item.invoice.id)}
                                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[9px] font-black uppercase rounded-lg transition-all shadow-sm"
                                          title="Arquivar fatura"
                                        >
                                          Arquivar
                                        </button>
                                      )}

                                      <button
                                        disabled={item.isLocked || isArchived}
                                        onClick={() => handleDeleteInvoiceMainPage(item.cofreCountId, item.invoice.id)}
                                        className={`p-1.5 rounded-lg border transition-all ${
                                          (item.isLocked || isArchived)
                                            ? 'text-gray-300 bg-gray-50 border-gray-100 cursor-not-allowed' 
                                            : 'text-red-500 hover:bg-red-50 hover:border-red-200 border-gray-100'
                                        }`}
                                        title={isArchived ? 'Fatura arquivada' : item.isLocked ? 'Contagem bloqueada' : 'Eliminar fatura'}
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          )}

                       {/* Tab 4: DEFINIÇÕES DE CAIXA / COFRE */}
          {activeTab === 'settings' && (
            <div className="max-w-xl">
              <div className="border bg-slate-50 p-5 rounded-2xl space-y-4">
                {/* Switcher Internal Settings Tabs */}
                <div className="flex border-b border-slate-250/60 pb-1.5 mb-2 gap-4">
                  <button
                    onClick={() => setSettingsSubTab('geral')}
                    type="button"
                    className={`pb-1 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                      settingsSubTab === 'geral'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Gerais
                  </button>
                  <button
                    onClick={() => setSettingsSubTab('mecanograficos')}
                    type="button"
                    className={`pb-1 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                      settingsSubTab === 'mecanograficos'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Nº Mecanográficos
                  </button>
                </div>

                {settingsSubTab === 'geral' ? (
                  <div className="space-y-4">
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
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">Nºs Mecanográficos</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                        Associe o código de colaborador de cada funcionário e gerente para preenchimento automático na folha de depósito
                      </p>
                    </div>

                    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white max-h-[300px] overflow-y-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black uppercase text-slate-500 tracking-wider">
                            <th className="px-4 py-2.5">Nome</th>
                            <th className="px-4 py-2.5">Cargo</th>
                            <th className="px-4 py-2.5 w-36">Nº Mecanográfico</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                          {localEmployees.map((emp, index) => (
                            <tr key={emp.id} className="hover:bg-slate-50/40">
                              <td className="px-4 py-2.5 text-slate-800 font-extrabold">{emp.name}</td>
                              <td className="px-4 py-2.5">
                                <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-lg border ${
                                  emp.role === 'GERENTE' 
                                    ? 'bg-blue-50 border-blue-100 text-blue-700' 
                                    : 'bg-slate-50 border-slate-200 text-slate-600'
                                }`}>
                                  {emp.role}
                                </span>
                              </td>
                              <td className="px-4 py-1.5">
                                <input 
                                  type="text"
                                  value={emp.mecanografico || ''}
                                  onChange={(e) => {
                                    const updatedVal = e.target.value;
                                    const newEmployees = [...localEmployees];
                                    newEmployees[index] = { ...newEmployees[index], mecanografico: updatedVal };
                                    setLocalEmployees(newEmployees);
                                  }}
                                  placeholder="Ex: 1004"
                                  className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold focus:ring-1 focus:ring-blue-500"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (onSaveEmployees) {
                          onSaveEmployees(localEmployees);
                          alert("Números mecanográficos gravados com sucesso!");
                        }
                      }}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition-all shadow-md ml-auto"
                    >
                      <Save size={16} /> Guardar Números
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
