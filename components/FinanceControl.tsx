import React, { useState, useEffect, useMemo } from 'react';
import { 
  Employee, AppSettings, CofreCount, DepositRecord, DepositRow, ProsegurDepositRecord, FinanceInvoice, 
  ProsegurWeeklyDeposit, ProsegurCoinMovement, ProsegurDailyDeposit, CaixaSurpresaRecord
} from '../types';
import { 
  getCofreCounts, saveCofreCount, deleteCofreCount,
  getDeposits, saveDeposit, deleteDeposit,
  getProsegurDeposits, saveProsegurDeposit, deleteProsegurDeposit,
  getProsegurWeeklyDeposits, saveProsegurWeeklyDeposit, deleteProsegurWeeklyDeposit,
  getProsegurCoinMovements, saveProsegurCoinMovement, deleteProsegurCoinMovement,
  getCaixasSurpresa, saveCaixaSurpresa, deleteCaixaSurpresa
} from '../services/firebaseService';
import { 
  Calculator, Coins, CreditCard, Landmark, Plus, Trash2, Edit2, 
  Save, ArrowLeft, Calendar, User, Clock, FileText, Check, AlertTriangle, 
  Sliders, ArrowUpRight, DollarSign, Wallet, ShieldCheck, Printer, CheckCircle,
  Lock, CheckCheck, Eye
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

const converterValorParaExtenso = (valor: number): string => {
  if (valor <= 0) return "Zero euros";

  const dezenas_10_19 = ["Dez", "Onze", "Doze", "Treze", "Catorze", "Quinze", "Dezasseis", "Dezassete", "Dezoito", "Dezanove"];
  const dezenas = ["", "Dez", "Vinte", "Trinta", "Quarenta", "Cinquenta", "Sessenta", "Setenta", "Oitenta", "Noventa"];
  const centenas = ["", "Cento", "Duzentos", "Trezentos", "Quatrocentos", "Quinhentos", "Seiscentos", "Setecentos", "Oitocentos", "Novecentos"];
  const unidades = ["", "Um", "Dois", "Três", "Quatro", "Cinco", "Seis", "Sete", "Oito", "Nove"];

  const converterGrupo = (num: number): string => {
    if (num === 0) return "";
    let resultado = "";

    if (num === 100) return "Cem";

    const c = Math.floor(num / 100);
    const d = Math.floor((num % 100) / 10);
    const u = num % 10;

    if (c > 0) {
      resultado += centenas[c];
    }

    if (d > 0 || u > 0) {
      if (resultado !== "") resultado += " e ";
      if (d === 1) {
        resultado += dezenas_10_19[u];
      } else {
        if (d > 0) {
          resultado += dezenas[d];
          if (u > 0) resultado += " e " + unidades[u];
        } else {
          resultado += unidades[u];
        }
      }
    }
    return resultado;
  };

  const converterParteMilhares = (num: number): string => {
    if (num < 1000) return converterGrupo(num);
    const milhares = Math.floor(num / 1000);
    const resto = num % 1000;
    let res = "";
    if (milhares === 1) {
      res += "Mil";
    } else {
      res += converterGrupo(milhares) + " mil";
    }
    if (resto > 0) {
      res += (resto < 100 || resto % 100 === 0 ? " e " : " ") + converterGrupo(resto);
    }
    return res;
  };

  const parteInteira = Math.floor(valor);
  const parteDecimal = Math.round((valor - parteInteira) * 100);

  let extenso = "";

  if (parteInteira > 0) {
    if (parteInteira >= 1000000) {
      const milhoes = Math.floor(parteInteira / 1000000);
      const restoMilhoes = parteInteira % 1000000;
      extenso += converterGrupo(milhoes) + (milhoes === 1 ? " milhão" : " milhões");
      if (restoMilhoes > 0) {
        extenso += " e " + converterParteMilhares(restoMilhoes);
      }
    } else {
      extenso += converterParteMilhares(parteInteira);
    }
    extenso += parteInteira === 1 ? " euro" : " euros";
  }

  if (parteDecimal > 0) {
    if (extenso !== "") {
      extenso += " e " + converterGrupo(parteDecimal).toLowerCase() + (parteDecimal === 1 ? " cêntimo" : " cêntimos");
    } else {
      extenso += converterGrupo(parteDecimal) + (parteDecimal === 1 ? " cêntimo" : " cêntimos");
    }
  }

  return extenso;
};

const addDaysToDateStr = (dateStr: string, days: number): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-indexed
  const day = parseInt(parts[2], 10);
  
  const dateObj = new Date(Date.UTC(year, month, day));
  dateObj.setUTCDate(dateObj.getUTCDate() + days);
  
  const y = dateObj.getUTCFullYear();
  const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const syncWeeklyCoinDeposits = (weeklies: ProsegurWeeklyDeposit[], coins: ProsegurCoinMovement[]): ProsegurWeeklyDeposit[] => {
  return weeklies.map(w => {
    const parts = w.startDate.split('-');
    // Parse as UTC midnight to avoid any timezone/DST shift issues
    const weekStart = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

    const matchingCoins = coins.filter(c => {
      if (!c.isClosed || !c.sendDate || !c.sendAmount) return false;
      const cParts = c.sendDate.split('-');
      const sendDateObj = new Date(Date.UTC(Number(cParts[0]), Number(cParts[1]) - 1, Number(cParts[2])));
      return sendDateObj.getTime() > weekStart.getTime() && sendDateObj.getTime() <= weekEnd.getTime();
    });

    const updatedWeek = { ...w };

    // Handle Slot 1
    if (updatedWeek.coinDepositId1) {
      // Manually linked. Let's find the current coin movement to keep it up to date.
      const linkedCoin = coins.find(c => c.id === updatedWeek.coinDepositId1);
      if (linkedCoin) {
        updatedWeek.coinDepositsValue1 = linkedCoin.sendAmount || linkedCoin.amount || 0;
      }
    } else if (updatedWeek.coinDepositsValue1 > 0) {
      // Custom manual value (no ID). Preserve it!
    } else if (matchingCoins.length >= 1) {
      // Auto-fill from matching coins
      updatedWeek.coinDepositsValue1 = matchingCoins[0].sendAmount || 0;
      updatedWeek.coinDepositId1 = matchingCoins[0].id;
    }

    // Handle Slot 2
    if (updatedWeek.coinDepositId2) {
      // Manually linked. Let's find the current coin movement to keep it up to date.
      const linkedCoin = coins.find(c => c.id === updatedWeek.coinDepositId2);
      if (linkedCoin) {
        updatedWeek.coinDepositsValue2 = linkedCoin.sendAmount || linkedCoin.amount || 0;
      }
    } else if (updatedWeek.coinDepositsValue2 > 0) {
      // Custom manual value (no ID). Preserve it!
    } else if (matchingCoins.length >= 2) {
      // Auto-fill from matching coins
      updatedWeek.coinDepositsValue2 = matchingCoins[1].sendAmount || 0;
      updatedWeek.coinDepositId2 = matchingCoins[1].id;
    }

    const dailySum = updatedWeek.dailyDeposits?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0;
    const coinSum = Number(updatedWeek.coinDepositsValue1 || 0) + Number(updatedWeek.coinDepositsValue2 || 0);
    updatedWeek.totalVal = dailySum + coinSum;

    return updatedWeek;
  });
};

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
  const [prosegurWeeklyDeposits, setProsegurWeeklyDeposits] = useState<ProsegurWeeklyDeposit[]>([]);
  const [prosegurCoinMovements, setProsegurCoinMovements] = useState<ProsegurCoinMovement[]>([]);
  
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
  const [isCofreUnlocked, setIsCofreUnlocked] = useState(false);
  const [editingDeposit, setEditingDeposit] = useState<DepositRecord | null>(null);
  const [depositoSubTab, setDepositoSubTab] = useState<'folhas' | 'sangrias' | 'caixas_surpresa' | 'diferencas'>('folhas');
  const [caixasSurpresa, setCaixasSurpresa] = useState<CaixaSurpresaRecord[]>([]);
  const [caixaSurpresaFilterMonth, setCaixaSurpresaFilterMonth] = useState<string>('');
  const [caixaSurpresaFilterEmployee, setCaixaSurpresaFilterEmployee] = useState<string>('');
  const [showAddCaixaSurpresa, setShowAddCaixaSurpresa] = useState(false);
  const [newCaixaSurpresa, setNewCaixaSurpresa] = useState<Omit<CaixaSurpresaRecord, 'id' | 'difference'>>({
    date: new Date().toISOString().substring(0, 10),
    turn: 'Abertura',
    expectedValue: 0,
    actualValue: 0,
    employeeName: '',
    managerName: ''
  });
  const [diferencaMonth, setDiferencaMonth] = useState<string>(() => new Date().toISOString().substring(0, 7));
  const [editingProsegur, setEditingProsegur] = useState<ProsegurDepositRecord | null>(null);
  const [editingWeekly, setEditingWeekly] = useState<ProsegurWeeklyDeposit | null>(null);
  const [editingCoin, setEditingCoin] = useState<ProsegurCoinMovement | null>(null);
  const [closingWeekly, setClosingWeekly] = useState<ProsegurWeeklyDeposit | null>(null);
  const [viewingHistoricWeek, setViewingHistoricWeek] = useState<ProsegurWeeklyDeposit | null>(null);
  const [weeklySlotEditor, setWeeklySlotEditor] = useState<{
    week: ProsegurWeeklyDeposit;
    type: 'daily' | 'coin1' | 'coin2';
    dayIndex?: number;
  } | null>(null);

  // States for Launch Slot Modal
  const [slotValue, setSlotValue] = useState<string>('');
  const [slotDate, setSlotDate] = useState<string>('');
  const [slotManager, setSlotManager] = useState<string>('');
  const [slotCoinId, setSlotCoinId] = useState<string>('');
  const [slotIsCustomCoin, setSlotIsCustomCoin] = useState<boolean>(false);

  // States for Deleting a Day's Safe count (Cofre Count)
  const [deleteDayModalOpen, setDeleteDayModalOpen] = useState<boolean>(false);
  const [deleteDayTargetDate, setDeleteDayTargetDate] = useState<string | null>(null);
  const [deleteDayPassword, setDeleteDayPassword] = useState<string>('');
  const [deleteDayManager, setDeleteDayManager] = useState<string>('');
  const [deleteDayTargetObj, setDeleteDayTargetObj] = useState<any>(null);

  // States for Deleting a Deposit Record (Folha de Depósito)
  const [deleteDepositModalOpen, setDeleteDepositModalOpen] = useState<boolean>(false);
  const [deleteDepositTargetId, setDeleteDepositTargetId] = useState<string | null>(null);
  const [deleteDepositPassword, setDeleteDepositPassword] = useState<string>('');
  const [deleteDepositManager, setDeleteDepositManager] = useState<string>('');

  useEffect(() => {
    if (!weeklySlotEditor) {
      setSlotValue('');
      setSlotDate('');
      setSlotManager('');
      setSlotCoinId('');
      setSlotIsCustomCoin(false);
      return;
    }

    const { week, type, dayIndex } = weeklySlotEditor;
    if (type === 'daily' && dayIndex !== undefined) {
      const existDep = week.dailyDeposits?.find(d => d.dayIndex === dayIndex);
      setSlotValue(existDep && existDep.amount > 0 ? String(existDep.amount) : '');
      setSlotDate(existDep?.date || new Date().toISOString().split('T')[0]);
      setSlotManager(existDep?.managerName || week.managerOpen || '');
    } else if (type === 'coin1') {
      setSlotValue(week.coinDepositsValue1 > 0 ? String(week.coinDepositsValue1) : '');
      setSlotCoinId(week.coinDepositId1 || '');
      setSlotIsCustomCoin(!week.coinDepositId1 && week.coinDepositsValue1 > 0);
    } else if (type === 'coin2') {
      setSlotValue(week.coinDepositsValue2 > 0 ? String(week.coinDepositsValue2) : '');
      setSlotCoinId(week.coinDepositId2 || '');
      setSlotIsCustomCoin(!week.coinDepositId2 && week.coinDepositsValue2 > 0);
    }
  }, [weeklySlotEditor]);
  const [prosegurSubTab, setProsegurSubTab] = useState<'semanal' | 'moedas'>('semanal');
  const [printDepositData, setPrintDepositData] = useState<{
    date: string;
    managerName: string;
    amount: number;
    title?: string;
  } | null>(null);

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
      const [counts, deps, pros, weeklies, coins, csList] = await Promise.all([
        getCofreCounts(restaurantId),
        getDeposits(restaurantId),
        getProsegurDeposits(restaurantId),
        getProsegurWeeklyDeposits(restaurantId),
        getProsegurCoinMovements(restaurantId),
        getCaixasSurpresa(restaurantId)
      ]);
      const sortedCoins = coins.sort((a,b) => b.date.localeCompare(a.date));
      const syncedWeeklies = syncWeeklyCoinDeposits(weeklies, sortedCoins);
      setCofreCounts(counts.sort((a,b) => b.date.localeCompare(a.date)));
      setDeposits(deps.sort((a,b) => b.date.localeCompare(a.date)));
      setProsegurDeposits(pros.sort((a,b) => b.date.localeCompare(a.date)));
      setProsegurWeeklyDeposits(syncedWeeklies.sort((a,b) => b.startDate.localeCompare(a.startDate)));
      setProsegurCoinMovements(sortedCoins);
      setCaixasSurpresa(csList.sort((a,b) => b.date.localeCompare(a.date)));
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

  const getTurnOrderIdx = (turn?: string): number => {
    if (!turn) return 1;
    const t = turn.toLowerCase();
    if (t === 'abertura') return 1;
    if (t === 'tarde' || t === 'intermédio' || t === 'intermedio') return 2;
    if (t === 'fecho') return 3;
    return 1;
  };

  const isCountChronologicallyBeforeOrEqual = (
    date1: string,
    turn1: string,
    date2: string,
    turn2: string
  ): boolean => {
    if (date1 < date2) return true;
    if (date1 > date2) return false;
    return getTurnOrderIdx(turn1) <= getTurnOrderIdx(turn2);
  };

  const getAccumulatedInvoicesAmtForCount = (
    targetDate: string,
    targetTurn: string,
    currentInvoicesList?: FinanceInvoice[]
  ): number => {
    let sum = 0;
    
    // 1. Process all other (non-editing) cofre counts
    cofreCounts.forEach(c => {
      if (editingCofre && c.id === editingCofre.id) {
        return;
      }
      if (c.invoices && c.invoices.length > 0) {
        c.invoices.forEach(inv => {
          if (inv.status !== 'arquivada') {
            if (isCountChronologicallyBeforeOrEqual(c.date, c.turn, targetDate, targetTurn)) {
              sum += inv.amount;
            }
          }
        });
      }
    });

    // 2. Process current candidate invoices list
    const activeInvoices = currentInvoicesList !== undefined 
      ? currentInvoicesList 
      : (editingCofre ? editingCofre.invoices : []);
      
    activeInvoices.forEach(inv => {
      if (inv.status !== 'arquivada') {
        if (isCountChronologicallyBeforeOrEqual(targetDate, targetTurn, targetDate, targetTurn)) {
          sum += inv.amount;
        }
      }
    });

    return sum;
  };

  const getDynamicTotalFaturasForCount = (c: CofreCount): number => {
    if (c.isNotPerformed) return 0;
    if (c.isLocked) {
      return c.totalFaturas ?? 0;
    }
    return getAccumulatedInvoicesAmtForCount(c.date, c.turn, c.invoices);
  };

  const getDynamicTotalGeralForCount = (c: CofreCount): number => {
    if (c.isNotPerformed) return 0;
    if (c.isLocked) {
      return c.totalGeral ?? 0;
    }
    const dynamicTotalFaturas = getDynamicTotalFaturasForCount(c);
    // Formula: Fundo de Gerente + Cofre + Faturas
    return (c.fundoGerente?.total || 0) + (c.cofre?.total || 0) + dynamicTotalFaturas;
  };

  const getDynamicDiferencaForCount = (c: CofreCount): number => {
    if (c.isNotPerformed) return 0;
    if (c.isLocked) {
      return c.diferenca ?? 0;
    }
    const total = getDynamicTotalGeralForCount(c);
    const moedasPros = c.moedasProsegur ?? 0;
    const fundosTotalVal = Number(c.fundosCount || 0) * 50;
    // Formula: (Total - Moedas Prossegur) + Fundos de Gaveta - 1000
    return (total - moedasPros) + fundosTotalVal - 1000;
  };

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
      if (count.isRealCount === false) {
        return;
      }
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

  const filteredCaixasSurpresa = useMemo(() => {
    return caixasSurpresa.filter(cs => {
      const matchesMonth = !caixaSurpresaFilterMonth || cs.date.startsWith(caixaSurpresaFilterMonth);
      const matchesEmployee = !caixaSurpresaFilterEmployee || cs.employeeName.toLowerCase().includes(caixaSurpresaFilterEmployee.toLowerCase());
      return matchesMonth && matchesEmployee;
    });
  }, [caixasSurpresa, caixaSurpresaFilterMonth, caixaSurpresaFilterEmployee]);

  const totalsCaixaSurpresa = useMemo(() => {
    let expected = 0;
    let actual = 0;
    let diff = 0;
    filteredCaixasSurpresa.forEach(cs => {
      expected += cs.expectedValue || 0;
      actual += cs.actualValue || 0;
      diff += cs.difference || 0;
    });
    return { expected, actual, diff };
  }, [filteredCaixasSurpresa]);

  // Safe Count detailed actions
  const handleAddNewSafeCountForTurn = (date: string, turn: 'Abertura' | 'Tarde' | 'Fecho') => {
    const existing = cofreCounts.find(c => c.date === date && c.turn === turn);
    if (existing) {
      setEditingCofre(existing);
      setSafeEditorTab('contagem');
      return;
    }

    const pendingCoinsTotal = prosegurCoinMovements
      ?.filter(m => !m.isClosed)
      ?.reduce((sum, m) => sum + (m.amount || 0), 0) || 0;

    const newCount: CofreCount = {
      id: `cofre_${date}_${turn}_${Date.now()}`,
      date: date,
      turn: turn,
      managerId: '',
      fundoGerente: createEmptyPart(),
      cofre: createEmptyPart(),
      invoices: [],
      totalFaturas: 0,
      fundosCount: devDefaultGavetaCount,
      fundosValuePerFundo: devDefaultGavetaValue,
      fundosTotal: devDefaultGavetaCount * devDefaultGavetaValue,
      moedasProsegur: pendingCoinsTotal,
      totalGeral: 0,
      diferenca: (0 - pendingCoinsTotal) + (devDefaultGavetaCount * devDefaultGavetaValue) - 1000,
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
    const faturasTot = getDynamicTotalFaturasForCount(countCopy);
    countCopy.totalFaturas = faturasTot;
    
    const fundosTot = Number(countCopy.fundosCount || 0) * 50;
    const moedasPros = prosegurCoinMovements
      ?.filter(m => !m.isClosed)
      ?.reduce((sum, m) => sum + (m.amount || 0), 0) || 0;

    // Total Geral = Fundo de Gerente + Cofre + Faturas
    const computedTotal = fGerenteTot + cofreTot + faturasTot;
    // Diferenca = (Total - Moedas Prossegur) + Fundos de Gaveta - 1000
    const computedDiferenca = (computedTotal - moedasPros) + fundosTot - 1000;

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
    countCopy.totalFaturas = getDynamicTotalFaturasForCount(countCopy);
    
    const fundosTot = Number(countCopy.fundosCount || 0) * 50;
    const moedasPros = prosegurCoinMovements
      ?.filter(m => !m.isClosed)
      ?.reduce((sum, m) => sum + (m.amount || 0), 0) || 0;

    // Recalculate Total Geral and Diferenca with formulas
    countCopy.totalGeral = countCopy.fundoGerente.total + countCopy.cofre.total + countCopy.totalFaturas;
    countCopy.diferenca = (countCopy.totalGeral - moedasPros) + fundosTot - 1000;

    setEditingCofre(countCopy);
    setInvNum('');
    setInvSupplier('');
    setInvAmt('');
  };

  const handleRemoveInvoiceFromSafe = (id: string) => {
    if (!editingCofre) return;
    const countCopy = { ...editingCofre };
    countCopy.invoices = countCopy.invoices.filter(i => i.id !== id);
    countCopy.totalFaturas = getDynamicTotalFaturasForCount(countCopy);
    
    const fundosTot = Number(countCopy.fundosCount || 0) * 50;
    const moedasPros = prosegurCoinMovements
      ?.filter(m => !m.isClosed)
      ?.reduce((sum, m) => sum + (m.amount || 0), 0) || 0;

    // Recalculate Total Geral and Diferenca with formulas
    countCopy.totalGeral = countCopy.fundoGerente.total + countCopy.cofre.total + countCopy.totalFaturas;
    countCopy.diferenca = (countCopy.totalGeral - moedasPros) + fundosTot - 1000;

    setEditingCofre(countCopy);
  };

  const handleSaveCofreCountEdit = async (shouldLock?: boolean) => {
    if (!editingCofre) return;
    
    const finalizeLock = shouldLock === true;

    if (finalizeLock) {
      if (!editingCofre.managerId) {
        alert("Erro: Deve selecionar o Gerente antes de validar/bloquear a contagem.");
        return;
      }
      if (editingCofre.turn === 'Tarde' && !editingCofre.managerId2) {
        alert("Erro: Deve selecionar o Gerente de Fecho antes de validar/bloquear a contagem.");
        return;
      }
    }
    
    const isNotPerf = editingCofre.isNotPerformed === true;
    
    const autoMoedasPros = isNotPerf ? 0 : (prosegurCoinMovements
      ?.filter(m => !m.isClosed)
      ?.reduce((sum, m) => sum + (m.amount || 0), 0) || 0);
    const fundosTotalVal = isNotPerf ? 0 : (Number(editingCofre.fundosCount || 0) * 50);
    
    const autoTotalFaturas = isNotPerf ? 0 : getDynamicTotalFaturasForCount(editingCofre);
    const autoTotalGeral = isNotPerf ? 0 : ((editingCofre.fundoGerente?.total || 0) + (editingCofre.cofre?.total || 0) + autoTotalFaturas);
    const autoDiferenca = isNotPerf ? 0 : ((autoTotalGeral - autoMoedasPros) + fundosTotalVal - 1000);

    const updatedCount: CofreCount = {
      ...editingCofre,
      isRealCount: true,
      isNotPerformed: isNotPerf,
      fundosCount: isNotPerf ? 0 : Number(editingCofre.fundosCount),
      fundosValuePerFundo: isNotPerf ? 0 : Number(editingCofre.fundosValuePerFundo),
      fundosTotal: fundosTotalVal,
      moedasProsegur: autoMoedasPros,
      totalFaturas: autoTotalFaturas,
      totalGeral: autoTotalGeral,
      diferenca: autoDiferenca,
      isLocked: finalizeLock ? true : (editingCofre.isLocked || false),
    };

    try {
      await saveCofreCount(restaurantId, updatedCount);
      setEditingCofre(null);
      setIsCofreUnlocked(false);
      await loadData();
      if (finalizeLock) {
        alert("Contagem validada e bloqueada com sucesso!");
      } else if (updatedCount.isLocked) {
        alert("Alterações à contagem guardadas com sucesso!");
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

  const handleTriggerDeleteDayModal = (day: any) => {
    setDeleteDayTargetDate(day.date);
    setDeleteDayTargetObj(day);
    setDeleteDayPassword('');
    setDeleteDayManager('');
    setDeleteDayModalOpen(true);
  };

  const handleConfirmDeleteDayCounts = async () => {
    if (!deleteDayTargetDate || !deleteDayTargetObj) return;

    if (deleteDayPassword !== 'Imperial96') {
      alert("Password geral incorreta. Não tem permissão para eliminar.");
      return;
    }

    if (!deleteDayManager.trim()) {
      alert("O nome do gerente que está a apagar as contagens é obrigatório.");
      return;
    }

    setIsLoading(true);
    setDeleteDayModalOpen(false);
    try {
      const deletePromises: Promise<any>[] = [];
      const day = deleteDayTargetObj;
      if (day.abertura) deletePromises.push(deleteCofreCount(restaurantId, day.abertura.id));
      if (day.tarde) deletePromises.push(deleteCofreCount(restaurantId, day.tarde.id));
      if (day.fecho) deletePromises.push(deleteCofreCount(restaurantId, day.fecho.id));

      await Promise.all(deletePromises);
      alert(`Contagens do dia ${formatDateToDMY(deleteDayTargetDate)} eliminadas com sucesso pelo gerente ${deleteDayManager.trim()}.`);
      
      setDeleteDayTargetDate(null);
      setDeleteDayTargetObj(null);
      await loadData();
    } catch (e) {
      console.error("Erro ao eliminar contagens do dia:", e);
      alert("Erro ao eliminar contagens.");
    } finally {
      setIsLoading(false);
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

    // priority: Abertura -> Tarde -> Fecho
    const countsOfDay = cofreCounts.filter(c => c.date === invoiceDateInput);
    
    let existing: CofreCount | undefined = undefined;
    let targetTurn: 'Abertura' | 'Tarde' | 'Fecho' = 'Abertura';
    
    const ab = countsOfDay.find(c => c.turn === 'Abertura');
    const ta = countsOfDay.find(c => c.turn === 'Tarde');
    const fe = countsOfDay.find(c => c.turn === 'Fecho');
    
    if (ab) {
      if (!ab.isLocked) {
        existing = ab;
        targetTurn = 'Abertura';
      } else {
        if (ta) {
          if (!ta.isLocked) {
            existing = ta;
            targetTurn = 'Tarde';
          } else {
            if (fe) {
              if (!fe.isLocked) {
                existing = fe;
                targetTurn = 'Fecho';
              } else {
                alert("Não é possível registar faturas nesta data, pois todas as contagens (Abertura, Intermédio e Fecho) já se encontram Validadas e Bloqueadas.");
                return;
              }
            } else {
              targetTurn = 'Fecho';
            }
          }
        } else {
          targetTurn = 'Tarde';
        }
      }
    } else {
      targetTurn = 'Abertura';
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
        const updatedTotalFaturas = getAccumulatedInvoicesAmtForCount(existing.date, existing.turn, updatedInvoices);
        
        // Auto moedas prosegur for recalculating Saved totalGeral:
        const currentMoedasProsegur = prosegurCoinMovements
          ?.filter(m => !m.isClosed)
          ?.reduce((sum, m) => sum + (m.amount || 0), 0) || 0;

        const fundosTotalVal = Number(existing.fundosCount || 0) * 50;

        const updatedTotalGeral = (existing.fundoGerente?.total || 0) + (existing.cofre?.total || 0) + updatedTotalFaturas;
        const updatedDiferenca = (updatedTotalGeral - currentMoedasProsegur) + fundosTotalVal - 1000;

        updatedCount = {
          ...existing,
          invoices: updatedInvoices,
          totalFaturas: updatedTotalFaturas,
          totalGeral: updatedTotalGeral,
          diferenca: updatedDiferenca
        };
      } else {
        // Create safe count on-the-fly for Abertura of that date
        const fundosTotalVal = devDefaultGavetaCount * 50;
        const updatedTotalFaturas = getAccumulatedInvoicesAmtForCount(invoiceDateInput, targetTurn, [newInv]);
        const moedasProsVal = prosegurCoinMovements?.filter(m => !m.isClosed)?.reduce((sum, m) => sum + (m.amount || 0), 0) || 0;
        
        updatedCount = {
          id: `cofre_${invoiceDateInput}_${targetTurn}_${Date.now()}`,
          date: invoiceDateInput,
          turn: targetTurn,
          managerId: '',
          fundoGerente: createEmptyPart(),
          cofre: createEmptyPart(),
          invoices: [newInv],
          totalFaturas: updatedTotalFaturas,
          fundosCount: devDefaultGavetaCount,
          fundosValuePerFundo: devDefaultGavetaValue,
          fundosTotal: fundosTotalVal,
          moedasProsegur: moedasProsVal,
          totalGeral: updatedTotalFaturas,
          diferenca: (updatedTotalFaturas - moedasProsVal) + fundosTotalVal - 1000,
          observacoes: '',
          isLocked: false,
          isDayClosed: false,
          isRealCount: false
        };
        updatedCount.fundoGerente = calculatePartTotals(updatedCount.fundoGerente);
        updatedCount.cofre = calculatePartTotals(updatedCount.cofre);
        
        // final recalc for new
        const newTotalGeral = updatedCount.fundoGerente.total + updatedCount.cofre.total + updatedCount.totalFaturas;
        updatedCount.totalGeral = newTotalGeral;
        updatedCount.diferenca = (newTotalGeral - updatedCount.moedasProsegur) + fundosTotalVal - 1000;
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

      let updatedTotalFaturas = parentCount.totalFaturas;
      let updatedTotalGeral = parentCount.totalGeral;
      let updatedDiferenca = parentCount.diferenca;

      if (!parentCount.isLocked) {
        updatedTotalFaturas = getAccumulatedInvoicesAmtForCount(parentCount.date, parentCount.turn, updatedInvoices);

        const currentMoedasProsegur = prosegurCoinMovements
          ?.filter(m => !m.isClosed)
          ?.reduce((sum, m) => sum + (m.amount || 0), 0) || 0;

        const fundosTotalVal = Number(parentCount.fundosCount || 0) * 50;

        updatedTotalGeral = (parentCount.fundoGerente?.total || 0) + (parentCount.cofre?.total || 0) + updatedTotalFaturas;
        updatedDiferenca = (updatedTotalGeral - currentMoedasProsegur) + fundosTotalVal - 1000;
      }

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
      const updatedTotalFaturas = getAccumulatedInvoicesAmtForCount(parentCount.date, parentCount.turn, updatedInvoices);
      
      const currentMoedasProsegur = prosegurCoinMovements
        ?.filter(m => !m.isClosed)
        ?.reduce((sum, m) => sum + (m.amount || 0), 0) || 0;

      const fundosTotalVal = Number(parentCount.fundosCount || 0) * 50;
      const updatedTotalGeral = (parentCount.fundoGerente?.total || 0) + (parentCount.cofre?.total || 0) + updatedTotalFaturas;

      const updatedCount = {
        ...parentCount,
        invoices: updatedInvoices,
        totalFaturas: updatedTotalFaturas,
        totalGeral: updatedTotalGeral,
        diferenca: (updatedTotalGeral - currentMoedasProsegur) + fundosTotalVal - 1000
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
  const createDefaultDepositRows = (): DepositRow[] => [];

  const handleAddNewDepositForTurn = (date: string, turn: 'Abertura' | 'Fecho') => {
    const existing = deposits.find(d => d.date === date && d.turn === turn);
    if (existing) {
      setEditingDeposit(existing);
      return;
    }

    const defaultRows = createDefaultDepositRows();
    const defaultManagerId = employees.find(e => e.isActive && e.role?.toUpperCase() === 'GERENTE')?.id || employees[0]?.id || '';

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

  const handleTriggerDeleteDepositModal = (id: string) => {
    setDeleteDepositTargetId(id);
    setDeleteDepositPassword('');
    setDeleteDepositManager('');
    setDeleteDepositModalOpen(true);
  };

  const handleConfirmDeleteDeposit = async () => {
    if (!deleteDepositTargetId) return;

    if (deleteDepositPassword !== 'Imperial96') {
      alert("Password geral incorreta. Não tem permissão para eliminar.");
      return;
    }

    if (!deleteDepositManager.trim()) {
      alert("O nome do gerente que está a apagar a folha de depósito é obrigatório.");
      return;
    }

    setIsLoading(true);
    setDeleteDepositModalOpen(false);
    try {
      await deleteDeposit(restaurantId, deleteDepositTargetId);
      setEditingDeposit(null);
      await loadData();
      alert(`Folha de depósito eliminada com sucesso pelo gerente ${deleteDepositManager.trim()}.`);
    } catch (err) {
      console.error(err);
      alert("Erro ao eliminar a folha de depósito.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDepositAction = async (id: string) => {
    handleTriggerDeleteDepositModal(id);
  };

  const handleConfirmDeleteDayDeposits = async (day: DepositDayState) => {
    const password = prompt("Insira a password para eliminar o registo de depósito deste dia:");
    if (password === null) return; // Cancelado
    if (password !== 'Imperial96') {
      alert("Password incorreta. Não tem permissão para eliminar.");
      return;
    }
    
    if (confirm(`Tem a certeza que deseja eliminar DEFINITIVAMENTE todos os registos de depósito do dia ${formatDateToDMY(day.date)}?`)) {
      setIsLoading(true);
      try {
        if (day.abertura) {
          await deleteDeposit(restaurantId, day.abertura.id);
        }
        if (day.fecho) {
          await deleteDeposit(restaurantId, day.fecho.id);
        }
        await loadData();
        alert("Registos de depósito do dia eliminados com sucesso!");
      } catch (err) {
        console.error(err);
        alert("Erro ao eliminar depósitos do dia.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleCloseDayDeposits = async (date: string, dayState: any) => {
    if (!dayState.abertura && !dayState.fecho) {
      alert("Por favor, preencha pelo menos um turno de depósito (Abertura ou Fecho) antes de encerrar o dia.");
      return;
    }

    const managerName = prompt("Por favor, insira o nome do gerente para confirmar o encerramento do dia:");
    if (managerName === null) return; // Cancelado
    if (!managerName.trim()) {
      alert("O nome do gerente é obrigatório para confirmar o encerramento do dia.");
      return;
    }

    setIsLoading(true);
    try {
      if (dayState.abertura) {
        await saveDeposit(restaurantId, { ...dayState.abertura, isLocked: true, isDayClosed: true });
      }
      if (dayState.fecho) {
        await saveDeposit(restaurantId, { ...dayState.fecho, isLocked: true, isDayClosed: true });
      }

      // Calculate the day's total deposit (only physical cash/dinheiro + sangria)
      const totalAmt = (dayState.abertura ? getDepositRecordCash(dayState.abertura) : 0) + (dayState.fecho ? getDepositRecordCash(dayState.fecho) : 0);
      
      // Auto-launch total on Prosegur weekly deposit if week is found
      const getWeeklySlotForDate = (dateStr: string, weeks: ProsegurWeeklyDeposit[]) => {
        const sorted = [...weeks].sort((a, b) => {
          if (a.status === 'Aberto' && b.status !== 'Aberto') return -1;
          if (a.status !== 'Aberto' && b.status === 'Aberto') return 1;
          return 0;
        });
        for (const week of sorted) {
          if (!week.startDate) continue;
          const startObj = new Date(week.startDate);
          const targetObj = new Date(dateStr);
          const tTime = Date.UTC(targetObj.getFullYear(), targetObj.getMonth(), targetObj.getDate());
          const sTime = Date.UTC(startObj.getFullYear(), startObj.getMonth(), startObj.getDate());
          const diffDays = Math.round((tTime - sTime) / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays < 7) {
            return { week, dayIndex: diffDays };
          }
        }
        return null;
      };

      const matchedSlot = getWeeklySlotForDate(date, prosegurWeeklyDeposits);
      if (matchedSlot) {
        const { week, dayIndex } = matchedSlot;
        const updatedDeposits = [...(week.dailyDeposits || [])];
        const existingIdx = updatedDeposits.findIndex(d => d.dayIndex === dayIndex);
        const newDepData = {
          dayIndex,
          date,
          amount: totalAmt,
          managerName: managerName.trim()
        };
        if (existingIdx !== -1) {
          updatedDeposits[existingIdx] = newDepData;
        } else {
          updatedDeposits.push(newDepData);
        }
        const weeklyToSave = { ...week, dailyDeposits: updatedDeposits };
        const dailySum = weeklyToSave.dailyDeposits.reduce((sum, d) => sum + (d.amount || 0), 0);
        const coinSum = Number(weeklyToSave.coinDepositsValue1 || 0) + Number(weeklyToSave.coinDepositsValue2 || 0);
        weeklyToSave.totalVal = dailySum + coinSum;
        await saveProsegurWeeklyDeposit(restaurantId, weeklyToSave);
      }

      await loadData();
      alert(`Dia encerrado e validado com sucesso por ${managerName.trim()}! 🔒`);
    } catch (err) {
      console.error(err);
      alert("Erro ao encerrar o dia.");
    } finally {
      setIsLoading(false);
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

    if (field === 'colaboradorNome' && val) {
      const trimmedVal = String(val).trim();
      if (trimmedVal) {
        const foundEmp = employees.find(emp => emp.name.toLowerCase() === trimmedVal.toLowerCase())
          || employees.find(emp => emp.name.toLowerCase().includes(trimmedVal.toLowerCase()));
        if (foundEmp && foundEmp.mecanografico) {
          updatedRows[index].colaboradorNo = foundEmp.mecanografico;
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
      return sum + (row.dinheiro || 0) + (row.sangria || 0);
    }, 0);
  };

  const getDepositRecordDifference = (dep?: DepositRecord): number => {
    if (!dep || !dep.rows) return 0;
    return dep.rows.reduce((sum, row) => sum + (row.diferenca || 0), 0);
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

  // --- PROSEGUR WEEKLY DEPOSITS ACTIONS ---
  const handleAddNewWeekly = () => {
    const today = new Date().toISOString().split('T')[0];
    setEditingWeekly({
      id: `week_${Date.now()}`,
      status: 'Aberto',
      startDate: today,
      managerOpen: '',
      dailyDeposits: Array.from({ length: 7 }, (_, i) => ({
        dayIndex: i,
        date: '',
        amount: 0,
        managerName: ''
      })),
      coinDepositsValue1: 0,
      coinDepositsValue2: 0,
      totalVal: 0
    });
  };

  const handleSaveWeeklyEdit = async (weeklyToSave: ProsegurWeeklyDeposit) => {
    // Recalculate total value
    const dailySum = weeklyToSave.dailyDeposits.reduce((sum, d) => sum + (d.amount || 0), 0);
    const coinSum = Number(weeklyToSave.coinDepositsValue1 || 0) + Number(weeklyToSave.coinDepositsValue2 || 0);
    weeklyToSave.totalVal = dailySum + coinSum;
    try {
      await saveProsegurWeeklyDeposit(restaurantId, weeklyToSave);
      setEditingWeekly(null);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Erro ao gravar registo de depósito semanal.");
    }
  };

  const handleSaveWeeklySlot = async () => {
    if (!weeklySlotEditor) return;
    const { week, type, dayIndex } = weeklySlotEditor;

    if (type === 'daily' && dayIndex !== undefined) {
      const amtNum = parseFloat(slotValue.replace(',', '.'));
      if (isNaN(amtNum) || amtNum < 0) {
        alert("Por favor insira um valor válido de depósito.");
        return;
      }
      if (!slotDate) {
        alert("Por favor selecione uma data.");
        return;
      }
      if (!slotManager.trim()) {
        alert("Por favor introduza o nome do gerente.");
        return;
      }

      const updatedDeposits = [...(week.dailyDeposits || [])];
      const existingIdx = updatedDeposits.findIndex(d => d.dayIndex === dayIndex);
      const newDepData = { 
        dayIndex, 
        date: slotDate, 
        amount: amtNum, 
        managerName: slotManager.trim() 
      };

      if (existingIdx !== -1) {
        updatedDeposits[existingIdx] = newDepData;
      } else {
        updatedDeposits.push(newDepData);
      }

      await handleSaveWeeklyEdit({ ...week, dailyDeposits: updatedDeposits });
      setWeeklySlotEditor(null);
    } else if (type === 'coin1' || type === 'coin2') {
      const isCoin1 = type === 'coin1';
      
      if (slotCoinId) {
        // Associated from selected coin movement
        const selectedCoin = prosegurCoinMovements.find(m => m.id === slotCoinId);
        if (!selectedCoin) {
          alert("Movimento de moedas associado não encontrado.");
          return;
        }
        const val = selectedCoin.sendAmount || selectedCoin.amount || 0;
        await handleSaveWeeklyEdit({
          ...week,
          [isCoin1 ? 'coinDepositsValue1' : 'coinDepositsValue2']: val,
          [isCoin1 ? 'coinDepositId1' : 'coinDepositId2']: selectedCoin.id
        });
      } else {
        // Custom local value
        const customVal = parseFloat(slotValue.replace(',', '.'));
        if (slotValue && (isNaN(customVal) || customVal < 0)) {
          alert("Por favor introduza um montante válido de moedas.");
          return;
        }
        await handleSaveWeeklyEdit({
          ...week,
          [isCoin1 ? 'coinDepositsValue1' : 'coinDepositsValue2']: isNaN(customVal) ? 0 : customVal,
          [isCoin1 ? 'coinDepositId1' : 'coinDepositId2']: undefined
        });
      }
      setWeeklySlotEditor(null);
    }
  };

  const handleClearWeeklySlot = async () => {
    if (!weeklySlotEditor) return;
    const { week, type, dayIndex } = weeklySlotEditor;

    if (confirm("Tens a certeza que pretendes limpar este lançamento de depósito?")) {
      if (type === 'daily' && dayIndex !== undefined) {
        const updatedDeposits = (week.dailyDeposits || []).filter(d => d.dayIndex !== dayIndex);
        await handleSaveWeeklyEdit({ ...week, dailyDeposits: updatedDeposits });
      } else if (type === 'coin1') {
        await handleSaveWeeklyEdit({
          ...week,
          coinDepositsValue1: 0,
          coinDepositId1: undefined
        });
      } else if (type === 'coin2') {
        await handleSaveWeeklyEdit({
          ...week,
          coinDepositsValue2: 0,
          coinDepositId2: undefined
        });
      }
      setWeeklySlotEditor(null);
    }
  };

  const handleDeleteWeeklyAction = async (id: string) => {
    const pass = prompt("Introduza a password de segurança para eliminar a folha de depósito:");
    if (pass === null) return;
    if (pass !== "Imperial96") {
      alert("Password incorreta. Não tem permissão para eliminar.");
      return;
    }
    if (confirm("Tens a certeza que pretendes eliminar este registo de depósito semanal? Esta ação é irreversível.")) {
      try {
        await deleteProsegurWeeklyDeposit(restaurantId, id);
        loadData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // --- PROSEGUR COIN MOVEMENTS ACTIONS ---
  const handleAddNewCoin = () => {
    const today = new Date().toISOString().split('T')[0];
    setEditingCoin({
      id: `coin_${Date.now()}`,
      date: today,
      type: 'Recebido',
      amount: 0,
      managerName: '',
      comment: ''
    });
  };

  const handleSaveCoinEdit = async () => {
    if (!editingCoin) return;
    if (Number(editingCoin.amount || 0) <= 0) {
      alert("Insira um valor válido para o movimento de moedas.");
      return;
    }
    if (!editingCoin.managerName) {
      alert("Por favor, insira o nome do gerente.");
      return;
    }
    try {
      await saveProsegurCoinMovement(restaurantId, editingCoin);
      setEditingCoin(null);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Erro ao gravar movimento de moedas.");
    }
  };

  const handleDeleteCoinAction = async (id: string) => {
    if (confirm("Desejas eliminar este movimento de moedas?")) {
      try {
        await deleteProsegurCoinMovement(restaurantId, id);
        loadData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // --- WEEKLY ENCERRAMENTO ACTIONS ---
  const handleConfirmCloseWeekly = async (
    weekly: ProsegurWeeklyDeposit,
    closingDate: string,
    managerCloseName: string,
    prosegurEmployeeName: string,
    prosegurCredentialNum: string,
    bagNumberVal?: string,
    prosegurReceiptVal?: string
  ) => {
    if (!closingDate || !managerCloseName || !prosegurEmployeeName || !prosegurCredentialNum) {
      alert("Por favor, preencha todos os campos obrigatórios (Data de Fecho, Nome do Gerente, Funcionário Prosegur e Nº Credencial).");
      return;
    }

    // Validate that all 7 daily deposits are entered (amount > 0)
    const missingDays: string[] = [];
    const updatedDailyDeposits: ProsegurDailyDeposit[] = Array.from({ length: 7 }).map((_, idx) => {
      const dateStr = addDaysToDateStr(weekly.startDate, idx);
      const matchingGroup = groupedDeposits.find(d => d.date === dateStr);
      const dayTotalAmt = matchingGroup 
        ? (getDepositRecordCash(matchingGroup.abertura) + getDepositRecordCash(matchingGroup.fecho))
        : 0;
      const managerId = matchingGroup?.fecho?.managerId || matchingGroup?.abertura?.managerId;
      const managerName = employees.find(e => e.id === managerId)?.name || '';

      if (dayTotalAmt <= 0) {
        const parts = dateStr.split('-');
        const dateShort = parts.length === 3 ? `${parts[2]}/${parts[1]}` : dateStr;
        missingDays.push(dateShort);
      }

      return {
        dayIndex: idx,
        date: dateStr,
        amount: dayTotalAmt,
        managerName: managerName || '—'
      };
    });

    if (missingDays.length > 0) {
      alert(`Erro: Para encerrar a semana, todos os 7 dias devem ter depósitos inseridos. Dias em falta: ${missingDays.join(', ')}`);
      return;
    }

    const dailySum = updatedDailyDeposits.reduce((sum, d) => sum + (d.amount || 0), 0);
    const coinSum = Number(weekly.coinDepositsValue1 || 0) + Number(weekly.coinDepositsValue2 || 0);
    const totalVal = dailySum + coinSum;

    // 1. Create recolha record (ProsegurDepositRecord) matching existing ones
    const newRecolha: ProsegurDepositRecord = {
      id: `pros_${closingDate}_${Date.now()}`,
      date: closingDate,
      bagNumber: bagNumberVal || prosegurCredentialNum || '',
      amountNotes: dailySum,
      amountCoins: coinSum,
      amountTotal: totalVal,
      prosegurReceipt: prosegurReceiptVal || '',
      status: 'Recolhido',
      comment: `Fecho de depósito semanal de ${formatDateToDMY(weekly.startDate)}. Aberto por ${weekly.managerOpen}, Fechado por ${managerCloseName}. Transp: ${prosegurEmployeeName} (${prosegurCredentialNum})`
    };

    // 2. Mark weekly as closed with filled fields
    const closedWeekly: ProsegurWeeklyDeposit = {
      ...weekly,
      dailyDeposits: updatedDailyDeposits,
      status: 'Encerrado',
      endDate: closingDate,
      managerClose: managerCloseName,
      prosegurEmployee: prosegurEmployeeName,
      prosegurCredential: prosegurCredentialNum,
      bagNumber: bagNumberVal || '',
      prosegurReceipt: prosegurReceiptVal || '',
      totalVal: totalVal
    };

    try {
      await saveProsegurDeposit(restaurantId, newRecolha);
      await saveProsegurWeeklyDeposit(restaurantId, closedWeekly);
      setClosingWeekly(null);
      loadData();
      alert("Depósito Semanal encerrado com sucesso e Guia de Recolha CIT gerada!");
    } catch (err) {
      console.error(err);
      alert("Erro ao encerrar depósito semanal.");
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

  const getWeekNumberOfYear = (dateStr: string): number => {
    if (!dateStr) return 0;
    const parts = dateStr.split('-');
    const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const tempDate = new Date(date.valueOf());
    tempDate.setDate(tempDate.getDate() + 4 - (tempDate.getDay() || 7));
    const yearStart = new Date(tempDate.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((tempDate.valueOf() - yearStart.valueOf()) / 86400000) + 1) / 7);
    return weekNo;
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
            <div className={`${isCofreUnlocked ? "bg-green-50 border border-green-200 text-green-800" : "bg-amber-50 border border-amber-200 text-amber-800"} text-xs px-4 py-3 rounded-xl font-bold flex items-center gap-2 print:hidden`}>
              {isCofreUnlocked ? (
                <span>🔓 Esta contagem foi desbloqueada com password de segurança. Os campos estão disponíveis para edição.</span>
              ) : (
                <span>🔒 Esta contagem está validada e bloqueada pelo gerente. Os campos de inserção de dados estão desativados para edição.</span>
              )}
            </div>
          )}

          {/* Form Meta Setup */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100 print:bg-white print:border-0 print:grid-cols-5 print:p-2">
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Data</label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 print:hidden" size={14} />
                <input 
                  type="date"
                  disabled={editingCofre.isLocked && !isCofreUnlocked}
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
                  disabled={editingCofre.isLocked && !isCofreUnlocked}
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

            <div>
              <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Estado do Turno</label>
              <div className="relative">
                <select
                  disabled={editingCofre.isLocked && !isCofreUnlocked}
                  value={editingCofre.isNotPerformed ? 'nao_realizada' : 'realizada'}
                  onChange={(e) => {
                    const isNotPerf = e.target.value === 'nao_realizada';
                    setEditingCofre({ 
                      ...editingCofre, 
                      isNotPerformed: isNotPerf
                    });
                  }}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs text-gray-800 outline-none focus:ring-1 focus:ring-blue-500 appearance-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="realizada">✅ Realizada</option>
                  <option value="nao_realizada">❌ Não Realizada</option>
                </select>
              </div>
            </div>

            {editingCofre.turn === 'Tarde' ? (
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-[2px]">Gerente Abertura</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 print:hidden" size={14} />
                    <select
                      disabled={editingCofre.isLocked && !isCofreUnlocked}
                      value={editingCofre.managerId || ''}
                      onChange={(e) => setEditingCofre({ ...editingCofre, managerId: e.target.value })}
                      className="w-full pl-10 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl font-bold text-xs text-slate-800 outline-none focus:ring-1 focus:ring-blue-500 print:border-0 print:pl-0 appearance-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">(--) Selecione o Gerente</option>
                      {employees.filter(e => e.role?.toUpperCase() === 'GERENTE').map(e => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-[2px]">Gerente de Fecho</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 print:hidden" size={14} />
                    <select
                      disabled={editingCofre.isLocked && !isCofreUnlocked}
                      value={editingCofre.managerId2 || ''}
                      onChange={(e) => setEditingCofre({ ...editingCofre, managerId2: e.target.value })}
                      className="w-full pl-10 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl font-bold text-xs text-slate-800 outline-none focus:ring-1 focus:ring-blue-500 print:border-0 print:pl-0 appearance-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">(--) Selecione o Gerente de Fecho</option>
                      {employees.filter(e => e.role?.toUpperCase() === 'GERENTE').map(e => (
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
                    disabled={editingCofre.isLocked && !isCofreUnlocked}
                    value={editingCofre.managerId || ''}
                    onChange={(e) => setEditingCofre({ ...editingCofre, managerId: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs text-gray-800 outline-none focus:ring-1 focus:ring-blue-500 print:border-0 print:pl-0 appearance-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">(--) Selecione o Gerente</option>
                    {employees.filter(e => e.role?.toUpperCase() === 'GERENTE').map(e => (
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

          {editingCofre.isNotPerformed ? (
            <div className="bg-amber-50/55 border-2 border-dashed border-amber-300 rounded-3xl p-8 text-center flex flex-col items-center justify-center gap-4 my-8">
              <div className="p-4 bg-amber-100 rounded-full text-amber-600">
                <AlertTriangle size={32} />
              </div>
              <div>
                <h4 className="text-lg font-black text-amber-900 uppercase tracking-tight">Turno Marcado como Não Realizado</h4>
                <p className="text-xs text-amber-700 font-bold max-w-md mx-auto mt-2 leading-relaxed uppercase tracking-wide">
                  Este turno não teve contagem física de cofre registada. Não é necessário preencher as moedas, notas ou faturas associadas. Pode guardar ou validar este turno normalmente para efeitos de encerramento do dia.
                </p>
              </div>
            </div>
          ) : (
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
                              disabled={editingCofre.isLocked && !isCofreUnlocked}
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
                          disabled={editingCofre.isLocked && !isCofreUnlocked}
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
                              disabled={editingCofre.isLocked && !isCofreUnlocked}
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
                              disabled={editingCofre.isLocked && !isCofreUnlocked}
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
                          disabled={editingCofre.isLocked && !isCofreUnlocked}
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
                              disabled={editingCofre.isLocked && !isCofreUnlocked}
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
          )}

          {/* BOTTOM SUMMARY - SYSTEM DARK BLUE STYLE */}
          {(() => {
            if (editingCofre.isNotPerformed) {
              return (
                <div className="bg-gray-100/60 border border-gray-200 p-4 rounded-2xl text-center text-xs text-gray-500 font-extrabold uppercase tracking-wide">
                  Contagem não realizada — Sem valores ou diferenças para apresentar
                </div>
              );
            }

            const autoMoedasProsegurVal = prosegurCoinMovements
              ?.filter(m => !m.isClosed)
              ?.reduce((sum, m) => sum + (m.amount || 0), 0) || 0;
            const fundosTotalVal = Number(editingCofre.fundosCount || 0) * 50;
            const autoTotalVal = (editingCofre.fundoGerente?.total || 0) + (editingCofre.cofre?.total || 0) + (editingCofre.totalFaturas || 0);
            const autoDiferencaVal = (autoTotalVal - autoMoedasProsegurVal) + fundosTotalVal - 1000;

            return (
              <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-2xl grid grid-cols-1 md:grid-cols-5 gap-4 items-center print:bg-white print:border-t">
                {/* Total Faturas */}
                <div className="bg-white p-3 py-4 rounded-xl border border-blue-100 text-center shadow-sm h-full flex flex-col justify-center">
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Total Faturas
                  </span>
                  <span className="text-sm font-extrabold text-slate-800">
                    {formatEuro(editingCofre.totalFaturas)}
                  </span>
                </div>

                {/* Moedas Prosegur Automatic display */}
                <div className="bg-white p-3 py-4 rounded-xl border border-blue-100 text-center shadow-sm h-full flex flex-col justify-center">
                  <span className="block text-[10px] font-black text-blue-900 uppercase tracking-widest mb-1">
                    Moedas Prosegur
                  </span>
                  <span className="text-sm font-extrabold text-blue-900 font-mono">
                    {formatEuro(autoMoedasProsegurVal)}
                  </span>
                </div>

                {/* Fundos de Gaveta */}
                <div className="bg-white p-3 py-4 rounded-xl border border-blue-100 text-center shadow-sm h-full flex flex-col justify-center">
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Fundos de Gaveta
                  </span>
                  <span className="text-sm font-extrabold text-slate-800 font-mono">
                    {formatEuro(fundosTotalVal)}
                  </span>
                  <span className="text-[8px] text-gray-400 uppercase font-bold mt-0.5">
                    {editingCofre.fundosCount || devDefaultGavetaCount} x 50 €
                  </span>
                </div>

                {/* Total Display */}
                <div className="bg-white p-3 py-4 rounded-xl border border-blue-100 text-center shadow-sm h-full flex flex-col justify-center">
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Total
                  </span>
                  <span className="text-base font-black text-slate-800">
                    {formatEuro(autoTotalVal)}
                  </span>
                </div>

                {/* Diferença box */}
                <div className="bg-white p-3 py-4 rounded-xl border border-blue-100 text-center shadow-sm h-full flex flex-col justify-center">
                  <span className="block text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">
                    Diferença
                  </span>
                  <span className={`text-sm font-black font-mono ${autoDiferencaVal !== 0 ? "text-red-600" : "text-green-600"}`}>
                    {formatEuro(autoDiferencaVal)}
                  </span>
                </div>
              </div>
            );
          })()}

          <div className="print:hidden flex justify-end gap-3 pt-4 border-t">
            {editingCofre.isLocked && !isCofreUnlocked ? (
              <button
                onClick={() => {
                  setEditingCofre(null);
                  setIsCofreUnlocked(false);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-wider"
              >
                Voltar
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    setEditingCofre(null);
                    setIsCofreUnlocked(false);
                  }}
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
                <p className="text-[10.5px] text-gray-500 font-black uppercase tracking-wider mt-0.5">
                  {editingDeposit.turn}
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 items-end">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Retroceder</label>
              <button
                type="button"
                onClick={() => setEditingDeposit(null)}
                className="w-full h-9 flex items-center justify-center gap-1.5 px-4 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm"
              >
                <ArrowLeft size={14} /> Voltar
              </button>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Data do Depósito</label>
              <input 
                type="date"
                value={editingDeposit.date}
                disabled={true}
                onChange={(e) => setEditingDeposit({ ...editingDeposit, date: e.target.value })}
                className="w-full h-9 px-4 border rounded-xl font-bold text-xs bg-slate-50 text-slate-500 cursor-not-allowed focus:ring-0 shadow-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Turno</label>
              <select
                value={editingDeposit.turn}
                disabled={true}
                onChange={(e) => setEditingDeposit({ ...editingDeposit, turn: e.target.value as 'Abertura' | 'Fecho' })}
                className="w-full px-4 py-2 border rounded-xl font-bold text-xs bg-slate-50 text-slate-500 cursor-not-allowed"
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
                {employees.filter(e => e.role?.toUpperCase() === 'GERENTE').map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Action to Add Row */}
          {!editingDeposit.isLocked && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  const newRow: DepositRow = {
                    caixa: '',
                    colaboradorNo: '',
                    colaboradorNome: '',
                    valorRapport: 0,
                    sangria: 0,
                    dinheiro: 0,
                    multibanco: 0,
                    tickets: 0,
                    delivery: 0,
                    mop: 0,
                    diferenca: 0
                  };
                  setEditingDeposit({
                    ...editingDeposit,
                    rows: [...editingDeposit.rows, newRow]
                  });
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm shadow-amber-100"
              >
                <Plus size={14} /> Inserir Contagem
              </button>
            </div>
          )}

          {/* Spreadsheet-like Table Board */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-inner bg-white">
            <table className="w-full text-center border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wide text-center">
                  <th className="px-3 py-3 border-r border-slate-200 text-center w-16">POS</th>
                  <th className="px-3 py-3 border-r border-slate-200 text-center w-24">nº.</th>
                  <th className="px-3 py-3 border-r border-slate-200 text-center w-44">Colaborador</th>
                  <th className="px-3 py-3 border-r border-slate-200 text-center w-28">Relatório</th>
                  <th className="px-3 py-3 border-r border-slate-200 text-center w-24">Sangria</th>
                  <th className="px-3 py-3 border-r border-slate-200 text-center w-24">Dinheiro €</th>
                  <th className="px-3 py-3 border-r border-slate-200 text-center w-28">Multibanco</th>
                  <th className="px-3 py-3 border-r border-slate-200 text-center w-24">Tickets</th>
                  <th className="px-3 py-3 border-r border-slate-200 text-center w-28">Delivery</th>
                  <th className="px-3 py-3 border-r border-slate-200 text-center w-24">Mop</th>
                  <th className="px-3 py-3 text-center w-28">Diferença</th>
                  {!editingDeposit.isLocked && <th className="px-2 py-3 text-center w-12 border-l border-slate-200 bg-slate-50/50">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                {editingDeposit.rows.length === 0 ? (
                  <tr>
                    <td colSpan={!editingDeposit.isLocked ? 12 : 11} className="px-6 py-12 text-center text-slate-400 font-bold">
                      Nenhuma contagem inserida. Clique em <span className="text-amber-600 font-black">"Inserir Contagem"</span> acima para adicionar uma linha.
                    </td>
                  </tr>
                ) : (
                  editingDeposit.rows.map((row, idx) => {
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
                            list="employees-mecanograficos"
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
                            list="employees-names"
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
                        <td className={`p-1 text-right font-mono font-black text-xs bg-slate-50/40 ${!editingDeposit.isLocked ? 'border-r border-slate-150' : ''}`}>
                          <span className={row.diferenca === 0 ? "text-green-600" : row.diferenca > 0 ? "text-blue-600" : "text-red-600 font-extrabold"}>
                            {row.diferenca > 0 ? `+` : ''}{formatEuro(row.diferenca)}
                          </span>
                        </td>

                        {!editingDeposit.isLocked && (
                          <td className="p-1 text-center bg-slate-50/20">
                            <button
                              type="button"
                              onClick={() => {
                                const updatedRows = editingDeposit.rows.filter((_, rIdx) => rIdx !== idx);
                                setEditingDeposit({
                                  ...editingDeposit,
                                  rows: updatedRows
                                });
                              }}
                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                              title="Remover linha"
                            >
                              <Trash2 size={14} className="mx-auto" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}

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
                      <td className="px-3 py-3 text-right" colSpan={!editingDeposit.isLocked ? 2 : 1}>
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

              const dayInvoicesTotal = cofreCounts
                .filter(c => c.date === editingDeposit.date)
                .reduce((sum, c) => {
                  return sum + (c.invoices || []).filter(i => i.status !== 'arquivada').reduce((s, i) => s + i.amount, 0);
                }, 0);

              const cashTotalVal = totDinheiro + totSangria;
              
              const matchingCofre = cofreCounts.find(c => c.date === editingDeposit.date && c.turn.toLowerCase() === editingDeposit.turn.toLowerCase());
              const fundoGerenteTot = matchingCofre ? (matchingCofre.fundoGerente?.total || 0) : 0;
              const cofreTot = matchingCofre ? (matchingCofre.cofre?.total || 0) : 0;
              const faturasTot = matchingCofre ? getDynamicTotalFaturasForCount(matchingCofre) : 0;
              const moedasProsegurTot = matchingCofre ? (matchingCofre.moedasProsegur ?? 0) : 0;
              const fundosTotalVal = matchingCofre ? (Number(matchingCofre.fundosCount || 0) * 50) : (devDefaultGavetaCount * 50);

              const grandTotalVal = fundoGerenteTot + cofreTot + faturasTot - moedasProsegurTot + fundosTotalVal;

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
                      <span className="block font-mono font-black text-sm text-amber-955 mt-1">{formatEuro(getDepositRecordTotal(editingDeposit))}</span>
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
          <div className="flex justify-between pt-6 border-t border-slate-100 font-sans">
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
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleTriggerDeleteDepositModal(editingDeposit.id)}
                    className="px-4 py-2 bg-red-50 hover:bg-red-105 text-red-650 border border-red-100 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <Trash2 size={13} /> Eliminar Folha
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingDeposit(null)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-wider"
                  >
                    Sair da Visualização
                  </button>
                </div>
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
                    onClick={() => handleTriggerDeleteDepositModal(editingDeposit.id)}
                    className="px-4 py-2 bg-red-50 hover:bg-red-105 text-red-650 border border-red-100 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <Trash2 size={13} /> Eliminar Folha
                  </button>
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
                                  !hasAbertura || day.abertura?.isNotPerformed
                                    ? 'border-dashed border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-blue-600'
                                    : !isAberturaLocked
                                      ? 'border-amber-200 bg-amber-50/40 text-slate-800 hover:bg-amber-50 hover:border-amber-300'
                                      : 'border-blue-100 bg-blue-50/30 text-blue-850 hover:bg-blue-50 hover:border-blue-200'
                                }`}
                              >
                                <span className="text-xs font-bold block whitespace-nowrap">
                                  {!hasAbertura ? 'Abertura' : day.abertura?.isNotPerformed ? '🚫 Abertura Skip' : isAberturaLocked ? '🔒 Abertura Ok' : '📝 Abertura'}
                                </span>
                                {!hasAbertura || day.abertura?.isNotPerformed || !isAberturaLocked ? (
                                  <span className="text-[10px] text-gray-400 font-extrabold block mt-0.5 uppercase tracking-wider">
                                    Não realizada
                                  </span>
                                ) : (
                                  <span className={`font-mono text-[10px] font-extrabold block mt-0.5 ${getDynamicDiferencaForCount(day.abertura!) === 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatEuro(getDynamicDiferencaForCount(day.abertura!))}
                                  </span>
                                )}
                              </button>

                              {/* TURN 2: INTERMÉDIO (TARDE) */}
                              <button
                                onClick={() => handleAddNewSafeCountForTurn(day.date, 'Tarde')}
                                className={`rounded-xl px-4 py-3 text-left border transition-all ${
                                  !hasTarde || day.tarde?.isNotPerformed
                                    ? 'border-dashed border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-blue-600'
                                    : !isTardeLocked
                                      ? 'border-amber-200 bg-amber-50/40 text-slate-800 hover:bg-amber-50 hover:border-amber-300'
                                      : 'border-blue-100 bg-blue-50/30 text-blue-850 hover:bg-blue-50 hover:border-blue-200'
                                }`}
                              >
                                <span className="text-xs font-bold block whitespace-nowrap">
                                  {!hasTarde ? 'Intermédio' : day.tarde?.isNotPerformed ? '🚫 Intermédio Skip' : isTardeLocked ? '🔒 Intermédio Ok' : '📝 Intermédio'}
                                </span>
                                {!hasTarde || day.tarde?.isNotPerformed || !isTardeLocked ? (
                                  <span className="text-[10px] text-gray-400 font-extrabold block mt-0.5 uppercase tracking-wider">
                                    Não realizada
                                  </span>
                                ) : (
                                  <span className={`font-mono text-[10px] font-extrabold block mt-0.5 ${getDynamicDiferencaForCount(day.tarde!) === 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatEuro(getDynamicDiferencaForCount(day.tarde!))}
                                  </span>
                                )}
                              </button>

                              {/* TURN 3: FECHO */}
                              <button
                                onClick={() => handleAddNewSafeCountForTurn(day.date, 'Fecho')}
                                className={`rounded-xl px-4 py-3 text-left border transition-all ${
                                  !hasFecho || day.fecho?.isNotPerformed
                                    ? 'border-dashed border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-blue-600'
                                    : !isFechoLocked
                                      ? 'border-amber-200 bg-amber-50/40 text-slate-800 hover:bg-amber-50 hover:border-amber-300'
                                      : 'border-blue-100 bg-blue-50/30 text-blue-850 hover:bg-blue-50 hover:border-blue-200'
                                }`}
                              >
                                <span className="text-xs font-bold block whitespace-nowrap">
                                  {!hasFecho ? 'Fecho' : day.fecho?.isNotPerformed ? '🚫 Fecho Skip' : isFechoLocked ? '🔒 Fecho Ok' : '📝 Fecho'}
                                </span>
                                {!hasFecho || day.fecho?.isNotPerformed || !isFechoLocked ? (
                                  <span className="text-[10px] text-gray-400 font-extrabold block mt-0.5 uppercase tracking-wider">
                                    Não realizada
                                  </span>
                                ) : (
                                  <span className={`font-mono text-[10px] font-extrabold block mt-0.5 ${getDynamicDiferencaForCount(day.fecho!) === 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatEuro(getDynamicDiferencaForCount(day.fecho!))}
                                  </span>
                                )}
                              </button>

                            </div>

                            {/* Close Day Action Column */}
                            <div className="lg:col-span-3 lg:text-right flex flex-col gap-2 justify-center">
                              {allThreeDone ? (
                                <button
                                  onClick={() => handleCloseDay(day.date)}
                                  className="w-full flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl transition-all shadow-md shadow-blue-100"
                                >
                                  🔒 Encerrar Dia
                                </button>
                              ) : (
                                <div className="text-center lg:text-right w-full">
                                  <button
                                    disabled
                                    className="w-full bg-gray-100 border text-gray-400 font-extrabold text-[10px] uppercase tracking-wider py-2.5 px-4 rounded-xl cursor-not-allowed"
                                  >
                                    Encerrar Dia
                                  </button>
                                  <span className="text-[9px] text-red-500 font-black uppercase mt-1 block text-center lg:text-right">
                                    {!hasAbertura || !hasTarde || !hasFecho 
                                      ? 'Contagem não realizada' 
                                      : 'Falta validar turnos'}
                                  </span>
                                </div>
                              )}

                              {(hasAbertura || hasTarde || hasFecho) && (
                                <button
                                  onClick={() => handleTriggerDeleteDayModal(day)}
                                  className="w-full flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 font-bold text-[10px] uppercase tracking-wider py-1.5 px-3 rounded-xl transition-all"
                                  title="Eliminar as contagens deste dia"
                                >
                                  <Trash2 size={12} /> Eliminar Dia
                                </button>
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
                                  
                                  <td className="px-6 py-4 text-right font-mono">
                                    {day.abertura && !day.abertura.isNotPerformed ? (
                                      <span className={getDynamicDiferencaForCount(day.abertura) === 0 ? 'text-green-600 font-extrabold' : 'text-red-600 font-extrabold'}>
                                        {formatEuro(getDynamicDiferencaForCount(day.abertura))}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Não realizada</span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 text-right font-mono">
                                    {day.tarde && !day.tarde.isNotPerformed ? (
                                      <span className={getDynamicDiferencaForCount(day.tarde) === 0 ? 'text-green-600 font-extrabold' : 'text-red-600 font-extrabold'}>
                                        {formatEuro(getDynamicDiferencaForCount(day.tarde))}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Não realizada</span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 text-right font-mono">
                                    {day.fecho && !day.fecho.isNotPerformed ? (
                                      <span className={getDynamicDiferencaForCount(day.fecho) === 0 ? 'text-green-600 font-extrabold' : 'text-red-600 font-extrabold'}>
                                        {formatEuro(getDynamicDiferencaForCount(day.fecho))}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Não realizada</span>
                                    )}
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
                                          const pass = prompt("Introduza a password de acesso:");
                                          if (pass === null) return;
                                          if (pass !== "Imperial96") {
                                            alert("Password de acesso incorreta.");
                                            return;
                                          }
                                          const choices: { label: string, data: any }[] = [];
                                          if (day.abertura) choices.push({ label: 'Abertura', data: day.abertura });
                                          if (day.tarde) choices.push({ label: 'Intermédio', data: day.tarde });
                                          if (day.fecho) choices.push({ label: 'Fecho', data: day.fecho });

                                          if (choices.length === 0) {
                                            alert("Não existem contagens para este dia.");
                                            return;
                                          }
                                          if (choices.length === 1) {
                                            setEditingCofre(choices[0].data);
                                            setIsCofreUnlocked(true);
                                            setSafeEditorTab('contagem');
                                          } else {
                                            const optionsStr = choices.map((c, i) => `${i + 1} - ${c.label}`).join('\n');
                                            const selection = prompt(`Escolha a contagem que deseja abrir:\n${optionsStr}`, "1");
                                            if (selection === null) return;
                                            const idx = parseInt(selection) - 1;
                                            if (!isNaN(idx) && idx >= 0 && idx < choices.length) {
                                              setEditingCofre(choices[idx].data);
                                              setIsCofreUnlocked(true);
                                              setSafeEditorTab('contagem');
                                            } else {
                                              alert("Opção inválida.");
                                            }
                                          }
                                        }}
                                        className="text-[10px] uppercase font-black text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-100/60 px-2.5 py-1 rounded-lg transition-all"
                                      >
                                        Verificar
                                      </button>
                                      
                                      <button
                                        onClick={() => handleTriggerDeleteDayModal(day)}
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
              {/* Sub-Tabs Selector */}
              <div className="flex flex-wrap gap-2 border-b pb-4 border-slate-150">
                <button
                  type="button"
                  onClick={() => setDepositoSubTab('folhas')}
                  className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                    depositoSubTab === 'folhas'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  Folhas de Depósito
                </button>
                <button
                  type="button"
                  onClick={() => setDepositoSubTab('sangrias')}
                  className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                    depositoSubTab === 'sangrias'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  Sangrias
                </button>
                <button
                  type="button"
                  onClick={() => setDepositoSubTab('caixas_surpresa')}
                  className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                    depositoSubTab === 'caixas_surpresa'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  Caixas Surpresa
                </button>
                <button
                  type="button"
                  onClick={() => setDepositoSubTab('diferencas')}
                  className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                    depositoSubTab === 'diferencas'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  Diferenças de Caixa
                </button>
              </div>

              {/* Sub-tab: Folhas de Depósito */}
              {depositoSubTab === 'folhas' && (() => {
                const openDays = groupedDeposits.filter(day => {
                  const isAberturaLocked = day.abertura?.isLocked || false;
                  const isFechoLocked = day.fecho?.isLocked || false;
                  const isClosed = (day.abertura?.isDayClosed === true || day.fecho?.isDayClosed === true) || (isAberturaLocked && isFechoLocked);
                  return !isClosed;
                });
                const closedDays = groupedDeposits.filter(day => {
                  const isAberturaLocked = day.abertura?.isLocked || false;
                  const isFechoLocked = day.fecho?.isLocked || false;
                  const isClosed = (day.abertura?.isDayClosed === true || day.fecho?.isDayClosed === true) || (isAberturaLocked && isFechoLocked);
                  return isClosed;
                });

                const renderDepositTable = (daysList: DepositDayState[], isActiveTable: boolean) => {
                  if (daysList.length === 0) {
                    return (
                      <div className="p-12 text-center text-xs text-gray-400 font-bold uppercase tracking-widest bg-white border border-slate-200 rounded-3xl">
                        Nenhum registo de depósito para listar nesta secção.
                      </div>
                    );
                  }

                  return (
                    <div className="overflow-x-auto bg-white border border-slate-200 rounded-3xl shadow-sm animate-fade-in">
                      <table className="w-full text-center border-collapse min-w-[1200px]">
                        <thead>
                          <tr className="bg-slate-50/75 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                            <th rowSpan={2} className="px-5 py-4 text-left w-40 border-r border-slate-100">Data / Dia</th>
                            <th colSpan={3} className="px-5 py-2 border-b border-slate-200 border-r border-slate-100 text-center">Depósito de Abertura</th>
                            <th colSpan={3} className="px-5 py-2 border-b border-slate-200 border-r border-slate-100 text-center">Depósito de Fecho</th>
                            <th rowSpan={2} className="px-5 py-4 border-r border-slate-100 text-center">Total do Dia</th>
                            <th rowSpan={2} className="px-5 py-4 text-center w-32">Validação</th>
                          </tr>
                          <tr className="bg-slate-50/40 border-b border-slate-200 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                            <th className="px-3 py-2 border-r border-slate-100 text-center">Valor</th>
                            <th className="px-3 py-2 border-r border-slate-100 text-center">Diferença</th>
                            <th className="px-3 py-2 border-r border-slate-100 text-center">Estado</th>
                            <th className="px-3 py-2 border-r border-slate-100 text-center">Valor</th>
                            <th className="px-3 py-2 border-r border-slate-100 text-center">Diferença</th>
                            <th className="px-3 py-2 border-r border-slate-100 text-center">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                          {daysList.map((day) => {
                            const wName = getWeekdayName(day.date);
                            const hasAbertura = !!day.abertura;
                            const isAberturaLocked = day.abertura?.isLocked || false;
                            const totalAbertura = getDepositRecordCash(day.abertura);
                            const diffAbertura = getDepositRecordDifference(day.abertura);

                            const hasFecho = !!day.fecho;
                            const isFechoLocked = day.fecho?.isLocked || false;
                            const totalFecho = getDepositRecordCash(day.fecho);
                            const diffFecho = getDepositRecordDifference(day.fecho);

                            const isDayFullyClosed = (day.abertura?.isDayClosed === true || day.fecho?.isDayClosed === true) || (isAberturaLocked && isFechoLocked);
                            const totalDayAmt = totalAbertura + totalFecho;

                            return (
                              <tr key={day.date} className="hover:bg-slate-50/40 transition-colors">
                                {/* 1. DATA */}
                                <td className="px-5 py-4 text-left border-r border-slate-100">
                                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">{wName}</span>
                                  <span className="text-xs font-black text-slate-800">{formatDateToDMY(day.date)}</span>
                                </td>

                                {/* 2. DEPOSITO ABERTURA - VALOR */}
                                <td className="px-3 py-4 border-r border-slate-100 font-mono text-xs font-black text-slate-800 text-center">
                                  {hasAbertura ? formatEuro(totalAbertura) : '—'}
                                </td>

                                {/* 2. DEPOSITO ABERTURA - DIFERENCA */}
                                <td className={`px-3 py-4 border-r border-slate-100 font-mono text-xs font-extrabold text-center ${
                                  !hasAbertura 
                                    ? 'text-slate-400' 
                                    : diffAbertura === 0 
                                      ? 'text-slate-400' 
                                      : diffAbertura > 0 
                                        ? 'text-emerald-600' 
                                        : 'text-rose-650'
                                }`}>
                                  {hasAbertura ? `${diffAbertura > 0 ? '+' : ''}${formatEuro(diffAbertura)}` : '—'}
                                </td>

                                {/* 2. DEPOSITO ABERTURA - ESTADO */}
                                <td className="px-3 py-4 border-r border-slate-100 text-center">
                                  {hasAbertura ? (
                                    <div className="flex items-center justify-center gap-1.5">
                                      {isAberturaLocked ? (
                                        <span className="p-1 text-emerald-600 flex items-center justify-center" title="Concluído">
                                          <CheckCircle size={16} />
                                        </span>
                                      ) : (
                                        <span className="p-1 text-amber-500 flex items-center justify-center" title="Em aberto">
                                          <Clock size={16} />
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleAddNewDepositForTurn(day.date, 'Abertura')}
                                        className="p-1 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors flex items-center justify-center"
                                        title="Editar"
                                      >
                                        <Edit2 size={14} />
                                      </button>
                                      {!isAberturaLocked && (
                                        <button
                                          type="button"
                                          onClick={() => handleTriggerDeleteDepositModal(day.abertura!.id)}
                                          className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-650 rounded-lg transition-colors flex items-center justify-center"
                                          title="Eliminar esta folha de depósito"
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center">
                                      {!isDayFullyClosed && (
                                        <button
                                          type="button"
                                          onClick={() => handleAddNewDepositForTurn(day.date, 'Abertura')}
                                          className="p-1 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors flex items-center justify-center"
                                          title="Iniciar Depósito de Abertura"
                                        >
                                          <Plus size={14} />
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </td>

                                {/* 3. DEPOSITO FECHO - VALOR */}
                                <td className="px-3 py-4 border-r border-slate-100 font-mono text-xs font-black text-slate-800 text-center">
                                  {hasFecho ? formatEuro(totalFecho) : '—'}
                                </td>

                                {/* 3. DEPOSITO FECHO - DIFERENCA */}
                                <td className={`px-3 py-4 border-r border-slate-100 font-mono text-xs font-extrabold text-center ${
                                  !hasFecho 
                                    ? 'text-slate-400' 
                                    : diffFecho === 0 
                                      ? 'text-slate-400' 
                                      : diffFecho > 0 
                                        ? 'text-emerald-600' 
                                        : 'text-rose-650'
                                }`}>
                                  {hasFecho ? `${diffFecho > 0 ? '+' : ''}${formatEuro(diffFecho)}` : '—'}
                                </td>

                                {/* 3. DEPOSITO FECHO - ESTADO */}
                                <td className="px-3 py-4 border-r border-slate-100 text-center">
                                  {hasFecho ? (
                                    <div className="flex items-center justify-center gap-1.5">
                                      {isFechoLocked ? (
                                        <span className="p-1 text-emerald-600 flex items-center justify-center" title="Concluído">
                                          <CheckCircle size={16} />
                                        </span>
                                      ) : (
                                        <span className="p-1 text-amber-500 flex items-center justify-center" title="Em aberto">
                                          <Clock size={16} />
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleAddNewDepositForTurn(day.date, 'Fecho')}
                                        className="p-1 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors flex items-center justify-center"
                                        title="Editar"
                                      >
                                        <Edit2 size={14} />
                                      </button>
                                      {!isFechoLocked && (
                                        <button
                                          type="button"
                                          onClick={() => handleTriggerDeleteDepositModal(day.fecho!.id)}
                                          className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-650 rounded-lg transition-colors flex items-center justify-center"
                                          title="Eliminar esta folha de depósito"
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center">
                                      {!isDayFullyClosed && (
                                        <button
                                          type="button"
                                          onClick={() => handleAddNewDepositForTurn(day.date, 'Fecho')}
                                          className="p-1 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors flex items-center justify-center"
                                          title="Iniciar Depósito de Fecho"
                                        >
                                          <Plus size={14} />
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </td>

                                {/* 4. TOTAL DO DIA */}
                                <td className="px-5 py-4 border-r border-slate-100 text-center">
                                  <span className="text-sm font-mono font-black text-slate-800 block">
                                    {formatEuro(totalDayAmt)}
                                  </span>
                                </td>

                                {/* 5. VALIDAÇÃO */}
                                <td className="px-5 py-4 text-center">
                                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                    {isDayFullyClosed ? (
                                      <span 
                                        className="p-1.5 bg-emerald-50 border border-emerald-150 text-emerald-700 rounded-lg flex items-center justify-center"
                                        title="Validado e Concluído"
                                      >
                                        <Lock size={14} />
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        disabled={!(isAberturaLocked && isFechoLocked)}
                                        onClick={() => handleCloseDayDeposits(day.date, day)}
                                        className={`p-1.5 rounded-lg transition-all border flex items-center justify-center shadow-sm ${
                                          (isAberturaLocked && isFechoLocked)
                                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 cursor-pointer'
                                            : 'bg-slate-50 text-slate-350 cursor-not-allowed border-slate-200'
                                        }`}
                                        title={!(isAberturaLocked && isFechoLocked) ? "Para validar o dia, ambos os turnos de Abertura e Fecho devem estar validados/concluídos." : "Validar dia"}
                                      >
                                        <CheckCircle size={14} />
                                      </button>
                                    )}

                                    {(hasAbertura || hasFecho) && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const printManagerObj = day.fecho || day.abertura;
                                          const managerId = printManagerObj?.managerId;
                                          const managerName = employees.find(e => e.id === managerId)?.name || '';
                                          setPrintDepositData({
                                            date: day.date,
                                            managerName: managerName,
                                            amount: getDepositRecordCash(day.abertura) + getDepositRecordCash(day.fecho),
                                            title: 'DEPOSIT DES VALORES E NUMERÁRIO'
                                          });
                                          setTimeout(() => {
                                            window.print();
                                          }, 150);
                                        }}
                                        className="p-1.5 text-blue-650 hover:text-blue-800 hover:bg-blue-50 border border-blue-100 rounded-lg transition-all flex items-center justify-center focus:outline-none"
                                        title="Imprimir Guia de Depósito"
                                      >
                                        <Printer size={14} />
                                      </button>
                                    )}

                                    {!isActiveTable && (
                                      <button
                                        type="button"
                                        onClick={() => handleConfirmDeleteDayDeposits(day)}
                                        className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 border border-red-100 rounded-lg transition-all flex items-center justify-center focus:outline-none"
                                        title="Eliminar Depósito do Dia"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                };

                return (
                  <div className="space-y-6 animate-fade-in">
                    {/* Header Box */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50 p-4 rounded-2xl border gap-4">
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Folha de Depósito</h4>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Gestão de depósitos diários (Abertura e Fecho) e encerramento de caixa.</p>
                      </div>

                      {/* Add Custom Date Tool */}
                      <div className="flex items-center gap-2">
                        <input 
                          type="date"
                          value={customDateInput}
                          onChange={(e) => setCustomDateInput(e.target.value)}
                          className="px-3 py-1.5 border border-slate-200 rounded-xl font-bold text-xs bg-white text-gray-750 focus:ring-1 focus:ring-blue-500"
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

                    {/* Section 1: Open Days */}
                    <div className="space-y-4">
                      <div className="border-l-4 border-amber-400 pl-3">
                        <h5 className="font-black text-slate-800 text-xs uppercase tracking-wider">Dias em Aberto (Controlo Diário)</h5>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Controlo dos depósitos do dia em curso. O dia deve ser encerrado e validado no final do fecho.</p>
                      </div>
                      {renderDepositTable(openDays, true)}
                    </div>

                    {/* Section 2: Closed Days History */}
                    <div className="space-y-4 pt-4">
                      <div className="border-l-4 border-emerald-500 pl-3">
                        <h5 className="font-black text-slate-800 text-xs uppercase tracking-wider">Histórico de Dias Concluídos</h5>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Depósitos encerrados e validados pelo gerente. Os totais correspondentes são enviados para o controlo Prosegur.</p>
                      </div>
                      {renderDepositTable(closedDays, false)}
                    </div>
                  </div>
                );
              })()}

          {/* Sub-tab: Sangrias */}
          {depositoSubTab === 'sangrias' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-slate-50 p-4 rounded-2xl border">
                <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Histórico de Sangrias</h4>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">
                  Lista automática de sangrias efetuadas e registadas nas folhas de depósito.
                </p>
              </div>

              <div className="overflow-x-auto bg-white border border-slate-200 rounded-3xl shadow-sm">
                <table className="w-full text-center border-collapse">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                      <th className="px-5 py-4 text-left">Data</th>
                      <th className="px-5 py-4">Turno</th>
                      <th className="px-5 py-4 text-right">Valor Sangria</th>
                      <th className="px-5 py-4 text-left">Colaborador</th>
                      <th className="px-5 py-4 text-left">Gerente responsável</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                    {(() => {
                      const allSangrias: Array<{
                        date: string;
                        turn: string;
                        value: number;
                        employeeName: string;
                        managerName: string;
                      }> = [];

                      deposits.forEach(dep => {
                        const managerName = employees.find(e => e.id === dep.managerId)?.name || dep.managerId;
                        dep.rows.forEach(row => {
                          if (row.sangria && row.sangria > 0) {
                            allSangrias.push({
                              date: dep.date,
                              turn: dep.turn,
                              value: row.sangria,
                              employeeName: row.colaboradorNome,
                              managerName: managerName
                            });
                          }
                        });
                      });

                      allSangrias.sort((a, b) => b.date.localeCompare(a.date));

                      if (allSangrias.length === 0) {
                        return (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold">
                              Nenhuma sangria registada nas folhas de depósito até ao momento.
                            </td>
                          </tr>
                        );
                      }

                      return allSangrias.map((s, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/40 transition-colors">
                          <td className="px-5 py-4 text-left font-black text-slate-850">
                            {formatDateToDMY(s.date)}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${
                              s.turn === 'Abertura' 
                                ? 'bg-blue-50 border border-blue-100 text-blue-700' 
                                : 'bg-indigo-50 border border-indigo-100 text-indigo-700'
                            }`}>
                              {s.turn}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right font-mono font-black text-slate-900">
                            {formatEuro(s.value)}
                          </td>
                          <td className="px-5 py-4 text-left font-medium text-slate-800">
                            {s.employeeName}
                          </td>
                          <td className="px-5 py-4 text-left font-medium text-slate-500">
                            {s.managerName}
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sub-tab: Caixas Surpresa */}
          {depositoSubTab === 'caixas_surpresa' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50 p-4 rounded-2xl border gap-4">
                <div>
                  <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Caixa Surpresa</h4>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">
                    Deverá ser realizada uma por turno.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const managerList = employees.filter(e => e.isActive && (e.role === 'GERENTE' || e.role === 'GERENTE_RESTAURANTE'));
                    setNewCaixaSurpresa({
                      date: new Date().toISOString().substring(0, 10),
                      turn: 'Abertura',
                      expectedValue: 0,
                      actualValue: 0,
                      employeeName: employees[0]?.name || '',
                      managerName: managerList[0]?.name || ''
                    });
                    setShowAddCaixaSurpresa(true);
                  }}
                  className="flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-black text-xs px-4 py-2 uppercase tracking-wider rounded-xl transition-all shadow-md shadow-yellow-50"
                >
                  <Plus size={14} /> Inserir Registo
                </button>
              </div>

              {/* Filter Section */}
              <div className="bg-white p-4 rounded-3xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Filtrar por Mês</label>
                  <input
                    type="month"
                    value={caixaSurpresaFilterMonth}
                    onChange={(e) => setCaixaSurpresaFilterMonth(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-xs bg-white text-gray-700 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Filtrar por Funcionário</label>
                  <input
                    type="text"
                    value={caixaSurpresaFilterEmployee}
                    onChange={(e) => setCaixaSurpresaFilterEmployee(e.target.value)}
                    placeholder="Nome do funcionário..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-xs bg-white text-gray-700 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Totals Box */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50 border p-4 rounded-2xl flex flex-col justify-between">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Esperado</span>
                  <span className="text-base font-black text-slate-850 font-mono mt-2">{formatEuro(totalsCaixaSurpresa.expected)}</span>
                </div>
                <div className="bg-slate-50 border p-4 rounded-2xl flex flex-col justify-between">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Real</span>
                  <span className="text-base font-black text-slate-850 font-mono mt-2">{formatEuro(totalsCaixaSurpresa.actual)}</span>
                </div>
                <div className="bg-slate-50 border p-4 rounded-2xl flex flex-col justify-between">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Diferença</span>
                  <span className={`text-base font-black font-mono mt-2 ${totalsCaixaSurpresa.diff >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {totalsCaixaSurpresa.diff > 0 ? '+' : ''}{formatEuro(totalsCaixaSurpresa.diff)}
                  </span>
                </div>
              </div>

              {/* Add Caixa Surpresa Dialog Form */}
              {showAddCaixaSurpresa && (
                <div className="bg-slate-50/50 p-5 rounded-2xl border border-dashed border-slate-300 space-y-4 animate-fade-in">
                  <div className="flex justify-between items-center pb-2 border-b">
                    <h5 className="font-black text-xs uppercase text-slate-800 tracking-wider">Nova Contagem de Caixa Surpresa</h5>
                    <button
                      type="button"
                      onClick={() => setShowAddCaixaSurpresa(false)}
                      className="text-xs text-slate-400 hover:text-slate-600 font-bold uppercase"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-bold text-slate-700">
                    {/* Data */}
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-500 uppercase text-[9px] font-black tracking-wider">Data</label>
                      <input
                        type="date"
                        value={newCaixaSurpresa.date}
                        onChange={(e) => setNewCaixaSurpresa({ ...newCaixaSurpresa, date: e.target.value })}
                        className="px-3 py-2 border rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs font-bold text-slate-800"
                      />
                    </div>

                    {/* Turno */}
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-500 uppercase text-[9px] font-black tracking-wider">Turno</label>
                      <select
                        value={newCaixaSurpresa.turn}
                        onChange={(e) => setNewCaixaSurpresa({ ...newCaixaSurpresa, turn: e.target.value })}
                        className="px-3 py-2 border rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs font-bold text-slate-800"
                      >
                        <option value="Abertura">Abertura</option>
                        <option value="Fecho">Fecho</option>
                      </select>
                    </div>

                    {/* Colaborador */}
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-500 uppercase text-[9px] font-black tracking-wider">Colaborador</label>
                      <select
                        value={newCaixaSurpresa.employeeName}
                        onChange={(e) => setNewCaixaSurpresa({ ...newCaixaSurpresa, employeeName: e.target.value })}
                        className="px-3 py-2 border rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs font-bold text-slate-800"
                      >
                        <option value="">-- Selecione Colaborador --</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.name}>{emp.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Gerente */}
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-500 uppercase text-[9px] font-black tracking-wider">Gerente</label>
                      <select
                        value={newCaixaSurpresa.managerName}
                        onChange={(e) => setNewCaixaSurpresa({ ...newCaixaSurpresa, managerName: e.target.value })}
                        className="px-3 py-2 border rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs font-bold text-slate-800"
                      >
                        <option value="">-- Selecione Gerente --</option>
                        {employees.filter(e => e.isActive && (e.role === 'GERENTE' || e.role === 'GERENTE_RESTAURANTE')).map(emp => (
                          <option key={emp.id} value={emp.name}>{emp.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Valor Esperado */}
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-500 uppercase text-[9px] font-black tracking-wider">Valor Esperado</label>
                      <input
                        type="text"
                        placeholder="0,00"
                        onChange={(e) => {
                          const valStr = e.target.value.replace(',', '.');
                          const valNum = parseFloat(valStr) || 0;
                          setNewCaixaSurpresa({ ...newCaixaSurpresa, expectedValue: valNum });
                        }}
                        className="px-3 py-2 border rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs font-mono font-bold text-slate-850"
                      />
                    </div>

                    {/* Valor Real */}
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-500 uppercase text-[9px] font-black tracking-wider">Valor Real</label>
                      <input
                        type="text"
                        placeholder="0,00"
                        onChange={(e) => {
                          const valStr = e.target.value.replace(',', '.');
                          const valNum = parseFloat(valStr) || 0;
                          setNewCaixaSurpresa({ ...newCaixaSurpresa, actualValue: valNum });
                        }}
                        className="px-3 py-2 border rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs font-mono font-bold text-slate-850"
                      />
                    </div>
                  </div>

                  {/* Display difference */}
                  <div className="flex justify-between items-center bg-slate-100 p-3 rounded-xl border">
                    <span className="text-xs text-slate-500 font-black uppercase">Diferença Calculada:</span>
                    <span className={`font-mono text-sm font-black ${(newCaixaSurpresa.actualValue - newCaixaSurpresa.expectedValue) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {formatEuro(newCaixaSurpresa.actualValue - newCaixaSurpresa.expectedValue)}
                    </span>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddCaixaSurpresa(false)}
                      className="px-4 py-2 border rounded-xl font-bold hover:bg-slate-100 transition-colors text-xs"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!newCaixaSurpresa.employeeName || !newCaixaSurpresa.managerName) {
                          alert("Por favor, preencha o Colaborador e o Gerente responsável.");
                          return;
                        }
                        const id = 'cs_' + Date.now();
                        const record: CaixaSurpresaRecord = {
                          id,
                          date: newCaixaSurpresa.date,
                          turn: newCaixaSurpresa.turn,
                          expectedValue: newCaixaSurpresa.expectedValue,
                          actualValue: newCaixaSurpresa.actualValue,
                          difference: newCaixaSurpresa.actualValue - newCaixaSurpresa.expectedValue,
                          employeeName: newCaixaSurpresa.employeeName,
                          managerName: newCaixaSurpresa.managerName
                        };

                        try {
                          setIsLoading(true);
                          await saveCaixaSurpresa(restaurantId, record);
                          setCaixasSurpresa(prev => [record, ...prev].sort((a,b) => b.date.localeCompare(a.date)));
                          setShowAddCaixaSurpresa(false);
                        } catch (err) {
                          console.error(err);
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-black uppercase tracking-wider rounded-xl transition-all text-xs"
                    >
                      Submeter Contagem
                    </button>
                  </div>
                </div>
              )}

              {/* Caixas Surpresa Table list */}
              <div className="overflow-x-auto bg-white border border-slate-200 rounded-3xl shadow-sm">
                <table className="w-full text-center border-collapse">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                      <th className="px-5 py-4 text-left">Data</th>
                      <th className="px-5 py-4">Turno</th>
                      <th className="px-5 py-4 text-right">Esperado</th>
                      <th className="px-5 py-4 text-right">Real</th>
                      <th className="px-5 py-4 text-right">Diferença</th>
                      <th className="px-5 py-4 text-left">Colaborador</th>
                      <th className="px-5 py-4 text-left">Gerente</th>
                      <th className="px-5 py-4">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                    {filteredCaixasSurpresa.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-bold">
                          Nenhuma contagem de caixa surpresa registada até ao momento para os filtros selecionados.
                        </td>
                      </tr>
                    ) : (
                      filteredCaixasSurpresa.map((cs) => (
                        <tr key={cs.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="px-5 py-4 text-left font-black text-slate-850">
                            {formatDateToDMY(cs.date)}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${
                              cs.turn === 'Abertura' 
                                ? 'bg-blue-50 border border-blue-100 text-blue-700' 
                                : 'bg-indigo-50 border border-indigo-100 text-indigo-700'
                            }`}>
                              {cs.turn}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right font-mono text-slate-600">
                            {formatEuro(cs.expectedValue)}
                          </td>
                          <td className="px-5 py-4 text-right font-mono text-slate-600">
                            {formatEuro(cs.actualValue)}
                          </td>
                          <td className={`px-5 py-4 text-right font-mono font-black ${cs.difference >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {cs.difference > 0 ? '+' : ''}{formatEuro(cs.difference)}
                          </td>
                          <td className="px-5 py-4 text-left text-slate-800">
                            {cs.employeeName}
                          </td>
                          <td className="px-5 py-4 text-left text-slate-500">
                            {cs.managerName}
                          </td>
                          <td className="px-5 py-4">
                            <button
                              type="button"
                              onClick={async () => {
                                if (confirm("Tem a certeza que deseja eliminar esta contagem de caixa surpresa?")) {
                                  try {
                                    setIsLoading(true);
                                    await deleteCaixaSurpresa(restaurantId, cs.id);
                                    setCaixasSurpresa(prev => prev.filter(item => item.id !== cs.id));
                                  } catch (err) {
                                    console.error(err);
                                  } finally {
                                    setIsLoading(false);
                                  }
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded transition-all"
                              title="Eliminar contagem"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sub-tab: Diferenças de Caixa */}
          {depositoSubTab === 'diferencas' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50 p-4 rounded-2xl border gap-4">
                <div>
                  <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Diferenças de Caixa</h4>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">
                    Resumo mensal das diferenças de caixa.
                  </p>
                </div>

                {/* Month selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">Mês:</span>
                  <input
                    type="month"
                    value={diferencaMonth}
                    onChange={(e) => setDiferencaMonth(e.target.value)}
                    className="px-3 py-1.5 border border-slate-200 rounded-xl font-bold text-xs bg-white text-slate-800 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Matrix Table */}
              {(() => {
                const [yearStr, monthStr] = diferencaMonth.split('-');
                const year = parseInt(yearStr, 10) || new Date().getFullYear();
                const monthIndex = (parseInt(monthStr, 10) - 1) || new Date().getMonth();
                const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
                const dayNumbers = Array.from({ length: daysInMonth }, (_, i) => i + 1);

                // Sort employees alphabetically by name
                const sortedEmployees = [...employees].sort((a, b) => a.name.localeCompare(b.name));

                // Pre-index the differences for fast lookup
                const diffMap = new Map<string, number>();
                const hasEntryMap = new Set<string>();

                deposits.forEach(dep => {
                  if (dep.date.startsWith(diferencaMonth)) {
                    const dayNum = parseInt(dep.date.substring(8, 10), 10);
                    dep.rows.forEach(row => {
                      const empNameNorm = row.colaboradorNome.trim().toLowerCase();
                      const key = `${empNameNorm}_${dayNum}`;
                      const currentVal = diffMap.get(key) || 0;
                      diffMap.set(key, currentVal + (row.diferenca || 0));
                      hasEntryMap.add(key);
                    });
                  }
                });

                // Calculate totals per employee
                const employeeTotals: { [empName: string]: number } = {};
                sortedEmployees.forEach(emp => {
                  let empSum = 0;
                  dayNumbers.forEach(dayNum => {
                    const key = `${emp.name.trim().toLowerCase()}_${dayNum}`;
                    if (hasEntryMap.has(key)) {
                      empSum += diffMap.get(key) || 0;
                    }
                  });
                  employeeTotals[emp.name] = empSum;
                });

                // Calculate totals per day
                const dayTotals: { [dayNum: number]: number } = {};
                dayNumbers.forEach(dayNum => {
                  let daySum = 0;
                  sortedEmployees.forEach(emp => {
                    const key = `${emp.name.trim().toLowerCase()}_${dayNum}`;
                    if (hasEntryMap.has(key)) {
                      daySum += diffMap.get(key) || 0;
                    }
                  });
                  dayTotals[dayNum] = daySum;
                });

                // Calculate grand total
                let grandTotal = 0;
                sortedEmployees.forEach(emp => {
                  grandTotal += employeeTotals[emp.name] || 0;
                });

                return (
                  <div className="overflow-x-auto bg-white border border-slate-200 rounded-3xl shadow-sm">
                    <table className="w-full text-center border-collapse min-w-[1200px]">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                          <th className="px-3 py-4 text-left w-48 border-r sticky left-0 bg-slate-100 z-10">Colaborador</th>
                          {dayNumbers.map(d => (
                            <th key={d} className="px-1.5 py-4 w-10 text-[9px] font-black">{d}</th>
                          ))}
                          <th className="px-3 py-4 w-28 border-l bg-slate-100 font-extrabold text-slate-800 uppercase tracking-tight">Total Mês</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px] font-bold text-slate-700">
                        {sortedEmployees.map((emp) => {
                          const empTotal = employeeTotals[emp.name] || 0;
                          return (
                            <tr key={emp.id} className="hover:bg-slate-50/40 transition-colors">
                              {/* Colaborador Name */}
                              <td className="px-3 py-3 text-left border-r font-black text-slate-800 sticky left-0 bg-white shadow-[1px_0_0_0_rgba(226,232,240,1)] z-10">
                                <span className="block truncate max-w-[180px]">{emp.name}</span>
                                <span className="text-[8.5px] font-black uppercase text-slate-400 mt-0.5 block">{emp.role}</span>
                              </td>

                              {/* Days Cells */}
                              {dayNumbers.map(dNum => {
                                const key = `${emp.name.trim().toLowerCase()}_${dNum}`;
                                const hasEntry = hasEntryMap.has(key);
                                const val = diffMap.get(key) || 0;

                                if (!hasEntry) {
                                  return (
                                    <td key={dNum} className="px-1 py-3 text-slate-300 font-mono text-[10px]">—</td>
                                  );
                                }

                                const isGreen = val >= -0.99 && val <= 0.99;
                                const textClass = isGreen ? 'text-emerald-600' : 'text-rose-650 font-black';

                                return (
                                  <td key={dNum} className={`px-1 py-3 font-mono text-[10px] font-extrabold ${textClass}`}>
                                    {val > 0 ? '+' : ''}{val.toFixed(2).replace('.', ',')}
                                  </td>
                                );
                              })}

                              {/* Total Mês por colaborador */}
                              <td className={`px-3 py-3 border-l text-right font-mono font-black text-xs bg-slate-50/50 ${
                                empTotal >= -0.99 && empTotal <= 0.99 ? 'text-emerald-700' : 'text-rose-700 font-extrabold'
                              }`}>
                                {empTotal > 0 ? '+' : ''}{formatEuro(empTotal)}
                              </td>
                            </tr>
                          );
                        })}

                        {/* Line final for Total do Mês, por dia */}
                        <tr className="bg-slate-50 border-t-2 border-slate-200 text-[11px] font-black text-slate-800">
                          <td className="px-3 py-4 text-left border-r sticky left-0 bg-slate-50 font-black text-xs uppercase tracking-wider z-10">
                            Total do Dia
                          </td>
                          {dayNumbers.map(dNum => {
                            const val = dayTotals[dNum] || 0;
                            const isGreen = val >= -0.99 && val <= 0.99;
                            const textClass = isGreen ? 'text-emerald-700' : 'text-rose-700 font-extrabold';
                            return (
                              <td key={dNum} className={`px-1 py-4 font-mono text-[10px] ${textClass}`}>
                                {val > 0 ? '+' : ''}{val.toFixed(2).replace('.', ',')}
                              </td>
                            );
                          })}
                          {/* Bottom-right corner: GRAND TOTAL */}
                          <td className={`px-3 py-4 border-l text-right font-mono text-xs uppercase tracking-wider bg-slate-100/80 ${
                            grandTotal >= -0.99 && grandTotal <= 0.99 ? 'text-emerald-800' : 'text-rose-850 font-extrabold'
                          }`}>
                            {grandTotal > 0 ? '+' : ''}{formatEuro(grandTotal)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: DEPÓSITO PROSEGUR */}
          {activeTab === 'prosegur' && (
            <div className="space-y-6">
              {/* Header Box */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50 p-4 rounded-2xl border gap-4">
                <div>
                  <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Depósitos Prossegur</h4>
                </div>

                {/* Sub-Tabs Switcher */}
                <div className="flex bg-slate-200/80 p-1 rounded-xl gap-1">
                  <button
                    type="button"
                    onClick={() => setProsegurSubTab('semanal')}
                    className={`px-3 py-1.5 font-bold text-[10px] uppercase tracking-wider rounded-lg transition-all ${
                      prosegurSubTab === 'semanal'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-gray-500 hover:text-slate-800'
                    }`}
                  >
                    🗓️ Depósito Semanal
                  </button>
                  <button
                    type="button"
                    onClick={() => setProsegurSubTab('moedas')}
                    className={`px-3 py-1.5 font-bold text-[10px] uppercase tracking-wider rounded-lg transition-all ${
                      prosegurSubTab === 'moedas'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-gray-500 hover:text-slate-800'
                    }`}
                  >
                    🪙 Moedas Prossegur
                  </button>
                </div>
              </div>

              {/* SECTION 1: DEPÓSITO SEMANAL */}
              {prosegurSubTab === 'semanal' && (() => {
                const activeWeeks = prosegurWeeklyDeposits.filter(w => w.status === 'Aberto');
                const historicWeeks = prosegurWeeklyDeposits.filter(w => w.status !== 'Aberto');

                const renderWeekCard = (week: ProsegurWeeklyDeposit) => {
                  const isWeekOpen = week.status === 'Aberto';
                  
                  // Dynamically compute dailySum based on groupedDeposits of the 7 days
                  let dailySum = 0;
                  for (let idx = 0; idx < 7; idx++) {
                    const dateStr = addDaysToDateStr(week.startDate, idx);
                    const matchingGroup = groupedDeposits.find(d => d.date === dateStr);
                    const dayTotalAmt = matchingGroup 
                      ? (getDepositRecordCash(matchingGroup.abertura) + getDepositRecordCash(matchingGroup.fecho))
                      : 0;
                    
                    const existDep = week.dailyDeposits?.find(d => d.dayIndex === idx);
                    const displayAmount = dayTotalAmt > 0 ? dayTotalAmt : (existDep?.amount || 0);
                    dailySum += displayAmount;
                  }

                  const coinSum = Number(week.coinDepositsValue1 || 0) + Number(week.coinDepositsValue2 || 0);
                  const grandTotal = dailySum + coinSum;

                  return (
                    <div 
                      key={week.id} 
                      className={`bg-white border rounded-3xl shadow-sm overflow-hidden transition-all ${
                        isWeekOpen ? 'border-amber-300 ring-2 ring-amber-50' : 'border-slate-200'
                      }`}
                    >
                      {/* Card Header */}
                      <div className={`p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                        isWeekOpen ? 'bg-amber-50/40 border-b border-amber-100' : 'bg-slate-50/50 border-b border-slate-100'
                      }`}>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border ${
                              isWeekOpen 
                                ? 'bg-amber-100 text-amber-800 border-amber-200' 
                                : 'bg-emerald-50 text-emerald-800 border-emerald-100'
                            }`}>
                              {isWeekOpen ? 'Em Aberto' : 'Encerrada'}
                            </span>
                            <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider">
                              Semana Nº {getWeekNumberOfYear(week.startDate)} (de {formatDateToDMY(week.startDate)})
                            </h4>
                          </div>
                          <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                            Iniciada por: <span className="text-slate-650">{week.managerOpen}</span>
                            {week.endDate && (
                              <> &bull; Fechada em: <span className="text-slate-650">{formatDateToDMY(week.endDate)}</span> por <span className="text-slate-655">{week.managerClose}</span></>
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="block text-[8px] font-black text-gray-400 uppercase tracking-widest">Soma Depósitos Semanal</span>
                            <span className="text-sm font-extrabold text-slate-800 font-mono">{formatEuro(grandTotal)}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {isWeekOpen && (
                              <button
                                onClick={() => setClosingWeekly(week)}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-sm shadow-emerald-50"
                              >
                                🔒 Encerrar Semana
                              </button>
                            )}

                            <button
                              onClick={() => handleDeleteWeeklyAction(week.id)}
                              className="p-1 px-2.5 text-slate-400 hover:text-red-650 hover:bg-red-50 border border-slate-100 rounded-lg text-xs font-bold transition-all flex items-center gap-1 uppercase tracking-wider"
                              title="Eliminar Folha de Depósito"
                            >
                              <Trash2 size={13} /> Eliminar
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Grid Layout of 7 Daily Deposits + 2 Coin Deposits */}
                      <div className="p-5 grid grid-cols-1 md:grid-cols-9 gap-4">
                        {/* Daily Slots */}
                        {Array.from({ length: 7 }).map((_, idx) => {
                          const existDep = week.dailyDeposits?.find(d => d.dayIndex === idx);
                          
                          // Calculate the slot's date based on week startDate
                          const dateStr = addDaysToDateStr(week.startDate, idx);
                          const displayDate = formatDateToDMY(existDep?.date || dateStr);
                          
                          // Format day/month like "29/06"
                          const parts = dateStr.split('-');
                          const dateShort = parts.length === 3 ? `${parts[2]}/${parts[1]}` : dateStr;

                          const matchingGroup = groupedDeposits.find(d => d.date === dateStr);
                          const dayTotalAmt = matchingGroup 
                            ? (getDepositRecordCash(matchingGroup.abertura) + getDepositRecordCash(matchingGroup.fecho))
                            : 0;
                          
                          const managerId = matchingGroup?.fecho?.managerId || matchingGroup?.abertura?.managerId;
                          const managerName = employees.find(e => e.id === managerId)?.name || '';

                          const displayAmount = dayTotalAmt > 0 ? dayTotalAmt : (existDep?.amount || 0);
                          const displayManager = managerName || existDep?.managerName || '';
                          
                          return (
                            <div 
                              key={idx} 
                              onClick={isWeekOpen ? () => setWeeklySlotEditor({ week, type: 'daily', dayIndex: idx }) : undefined}
                              className={`bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col justify-between min-h-[110px] text-center hover:bg-white transition-all ${
                                isWeekOpen ? 'cursor-pointer hover:border-blue-300 hover:shadow-sm' : ''
                              }`}
                            >
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 truncate" title={displayDate}>
                                {dateShort}
                              </span>
                              <div className="flex-1 flex flex-col justify-center mb-2">
                                {displayAmount > 0 ? (
                                  <div className="space-y-0.5 animate-fade-in">
                                    <span className="text-xs font-mono font-black text-slate-800 block">{formatEuro(displayAmount)}</span>
                                    {displayManager && (
                                      <span className="block text-[8px] text-emerald-700 font-extrabold truncate" title={displayManager}>
                                        {displayManager}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-gray-300 font-bold block">S/ Registo</span>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {/* Coin 1 Slot */}
                        <div 
                          onClick={isWeekOpen ? () => setWeeklySlotEditor({ week, type: 'coin1' }) : undefined}
                          className={`bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col justify-between min-h-[110px] text-center hover:bg-white transition-all ${
                            isWeekOpen ? 'cursor-pointer hover:border-yellow-300 hover:shadow-sm' : ''
                          }`}
                        >
                          <span className="text-[10px] font-black text-amber-850 uppercase tracking-widest block mb-2">Depósito Moedas 1</span>
                          <div className="flex-1 flex flex-col justify-center mb-2">
                            {week.coinDepositsValue1 > 0 ? (
                              <span className="text-xs font-mono font-black text-blue-900 block">{formatEuro(week.coinDepositsValue1)}</span>
                            ) : (
                              <span className="text-[10px] text-gray-300 font-bold block">—</span>
                            )}
                          </div>
                        </div>

                        {/* Coin 2 Slot */}
                        <div 
                          onClick={isWeekOpen ? () => setWeeklySlotEditor({ week, type: 'coin2' }) : undefined}
                          className={`bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col justify-between min-h-[110px] text-center hover:bg-white transition-all ${
                            isWeekOpen ? 'cursor-pointer hover:border-yellow-300 hover:shadow-sm' : ''
                          }`}
                        >
                          <span className="text-[10px] font-black text-amber-855 uppercase tracking-widest block mb-2">Depósito Moedas 2</span>
                          <div className="flex-1 flex flex-col justify-center mb-2">
                            {week.coinDepositsValue2 > 0 ? (
                              <span className="text-xs font-mono font-black text-blue-900 block">{formatEuro(week.coinDepositsValue2)}</span>
                            ) : (
                              <span className="text-[10px] text-gray-300 font-bold block">—</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                };

                const renderHistoricWeekRow = (week: ProsegurWeeklyDeposit) => {
                  const weekNum = getWeekNumberOfYear(week.startDate);
                  
                  // Compute dailySum based on week's saved dailyDeposits
                  const dailySum = week.dailyDeposits?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0;
                  const coinSum = Number(week.coinDepositsValue1 || 0) + Number(week.coinDepositsValue2 || 0);
                  const grandTotal = dailySum + coinSum;
                  
                  const managerClose = week.managerClose || '—';
                  const closeDate = week.endDate ? formatDateToDMY(week.endDate) : '—';

                  return (
                    <div key={week.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 hover:bg-white transition-all shadow-sm">
                      <div className="grid grid-cols-2 md:grid-cols-7 gap-4 items-center">
                        {/* 1. Nº da Semana */}
                        <div>
                          <span className="block text-[8px] font-black text-gray-400 uppercase tracking-wider mb-1">Semana</span>
                          <span className="text-xs font-black text-slate-800">Semana Nº {weekNum}</span>
                          <span className="block text-[9px] text-gray-450 font-bold mt-0.5">({formatDateToDMY(week.startDate)})</span>
                        </div>
                        {/* 2. Total Depósitos */}
                        <div>
                          <span className="block text-[8px] font-black text-gray-400 uppercase tracking-wider mb-1">Depósitos</span>
                          <span className="text-xs font-mono font-black text-slate-700">{formatEuro(dailySum)}</span>
                        </div>
                        {/* 3. Total Moedas */}
                        <div>
                          <span className="block text-[8px] font-black text-gray-400 uppercase tracking-wider mb-1">Depósitos Moedas</span>
                          <span className="text-xs font-mono font-black text-slate-700">{formatEuro(coinSum)}</span>
                        </div>
                        {/* 4. Total (soma) */}
                        <div>
                          <span className="block text-[8px] font-black text-gray-400 uppercase tracking-wider mb-1">Total</span>
                          <span className="text-xs font-mono font-black text-emerald-700">{formatEuro(grandTotal)}</span>
                        </div>
                        {/* 5. Gerente de Fecho */}
                        <div>
                          <span className="block text-[8px] font-black text-gray-400 uppercase tracking-wider mb-1">Gerente de Fecho</span>
                          <span className="text-xs font-bold text-slate-700 truncate block" title={managerClose}>{managerClose}</span>
                        </div>
                        {/* 6. Data de Finalização */}
                        <div>
                          <span className="block text-[8px] font-black text-gray-400 uppercase tracking-wider mb-1">Data de Fecho</span>
                          <span className="text-xs font-bold text-slate-700">{closeDate}</span>
                        </div>
                        {/* 7. Status & Delete */}
                        <div className="flex md:justify-end items-center gap-2">
                          <button
                            onClick={() => setViewingHistoricWeek(week)}
                            className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg border border-transparent hover:border-blue-100 transition-all"
                            title="Visualizar Detalhe"
                          >
                            <Eye size={13} />
                          </button>
                          <span className="inline-flex items-center text-[8px] font-black uppercase px-2.5 py-1 rounded-full border bg-emerald-100 text-emerald-800 border-emerald-200">
                            Encerrado
                          </span>
                          <button
                            onClick={() => handleDeleteWeeklyAction(week.id)}
                            className="p-1.5 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 transition-all"
                            title="Eliminar"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                };

                return (
                  <div className="space-y-6">
                    {/* Action Section */}
                    <div className="flex justify-between items-center bg-white p-4 rounded-2xl border">
                      <div>
                        <h5 className="font-extrabold text-slate-850 text-xs uppercase tracking-wider">Semana Atual</h5>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Controlo semanal de depósitos de notas (7 dias) e moedas recolhidas</p>
                      </div>
                      
                      {/* Open Week Initiator Button */}
                      {!editingWeekly && activeWeeks.length === 0 && (
                        <button
                          onClick={handleAddNewWeekly}
                          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-50"
                        >
                          <Plus size={16} /> Lançar Registo
                        </button>
                      )}
                    </div>

                    {/* Open Week Form */}
                    {editingWeekly && (
                      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4 animate-fade-in">
                        <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Abertura de Nova Semana de Depósitos</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1.5">
                              Data Início de Semana {editingWeekly.startDate && `(Semana Nº ${getWeekNumberOfYear(editingWeekly.startDate)})`}
                            </label>
                            <input
                              type="date"
                              value={editingWeekly.startDate}
                              onChange={(e) => setEditingWeekly({ ...editingWeekly, startDate: e.target.value })}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-xs bg-white text-gray-700 focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Gerente de Abertura</label>
                            <input
                              type="text"
                              list="managers-names"
                              value={editingWeekly.managerOpen}
                              onChange={(e) => setEditingWeekly({ ...editingWeekly, managerOpen: e.target.value })}
                              placeholder="Selecione ou insira o nome..."
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-xs bg-white text-gray-700 focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setEditingWeekly(null)}
                            className="px-4 py-2 text-slate-500 hover:bg-slate-100 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!editingWeekly.startDate || !editingWeekly.managerOpen) {
                                alert("Data e Gerente de Abertura são obrigatórios.");
                                return;
                              }
                              handleSaveWeeklyEdit(editingWeekly);
                            }}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-50"
                          >
                            Iniciar Semana
                          </button>
                        </div>
                      </div>
                    )}

                    {/* List of Weeks */}
                    {isLoading ? (
                      <div className="p-12 text-center text-xs text-gray-400 font-bold uppercase tracking-widest bg-white rounded-2xl border">
                        A carregar registos prosegur...
                      </div>
                    ) : (
                      <div className="space-y-8">
                        {/* 1. SECCAO SEMANA ATUAL */}
                        <div className="space-y-4">
                          {activeWeeks.length === 0 ? (
                            <div className="p-12 text-center border-2 border-dashed border-slate-100 rounded-2xl bg-white">
                              <Calendar size={36} className="text-slate-300 mx-auto mb-3" />
                              <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Nenhum registo de depósito semanal aberto</p>
                              <p className="text-[10px] text-gray-400 mt-1">CLIQUE EM "LANÇAR REGISTO" PARA VOLTAR A CONTROLAR</p>
                            </div>
                          ) : (
                            <div className="space-y-6">
                              {activeWeeks.map(renderWeekCard)}
                            </div>
                          )}
                        </div>

                        {/* 2. SECCAO HISTÓRICO DE SEMANAS */}
                        <div className="pt-6 border-t border-slate-200">
                          <div className="mb-4">
                            <h5 className="font-extrabold text-slate-850 text-xs uppercase tracking-wider">Histórico de semanas</h5>
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Semanas de depósitos encerradas anteriormente</p>
                          </div>

                          {historicWeeks.length === 0 ? (
                            <div className="p-12 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 text-xs font-black text-gray-350 uppercase tracking-widest">
                              Nenhuma semana no histórico
                            </div>
                          ) : (
                            <div className="space-y-6">
                              {historicWeeks.map(renderHistoricWeekRow)}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Daily/Coin Slot Editor Modal Popup */}
              {weeklySlotEditor && (
                <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 animate-fade-in print:hidden">
                  <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden transform transition-all text-left">
                    {/* Header */}
                    <div className="p-6 bg-slate-900 text-white flex justify-between items-start">
                      <div>
                        <span className="text-[10px] uppercase font-black tracking-widest text-[#ffcc00]">
                          {weeklySlotEditor.type === 'daily' ? 'Depósito Diário' : 'Lançamento de Moedas'}
                        </span>
                        <h3 className="font-extrabold text-white text-base uppercase tracking-wider mt-0.5">
                          {weeklySlotEditor.type === 'daily' 
                            ? `Lançar Depósito ${weeklySlotEditor.dayIndex! + 1}` 
                            : `Depósito Moedas ${weeklySlotEditor.type === 'coin1' ? '1' : '2'}`
                          }
                        </h3>
                      </div>
                      <button 
                        onClick={() => setWeeklySlotEditor(null)}
                        className="text-gray-400 hover:text-white transition-all text-xs font-black uppercase p-1.5 focus:outline-none"
                      >
                        ✖️
                      </button>
                    </div>

                    {/* Body / Form */}
                    <div className="p-6 space-y-4">
                      {weeklySlotEditor.type === 'daily' ? (
                        <>
                          {/* Daily Deposit Form Fields */}
                          <div>
                            <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">
                              Valor do Depósito (€)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 font-mono font-bold focus:border-blue-500 focus:bg-white focus:outline-none"
                              placeholder="0.00"
                              value={slotValue}
                              onChange={(e) => setSlotValue(e.target.value)}
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">
                              Data do Depósito
                            </label>
                            <input
                              type="date"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 font-bold focus:border-blue-500 focus:bg-white focus:outline-none"
                              value={slotDate}
                              onChange={(e) => setSlotDate(e.target.value)}
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">
                              Gerente Responsável
                            </label>
                            <input
                              type="text"
                              list="managers-names"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 font-bold focus:border-blue-500 focus:bg-white focus:outline-none"
                              placeholder="Selecione ou escreva o nome..."
                              value={slotManager}
                              onChange={(e) => setSlotManager(e.target.value)}
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Coin Slots Form Fields */}
                          <div>
                            <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">
                              Como deseja lançar as moedas?
                            </label>
                            <div className="flex gap-2 mb-3">
                              <button
                                type="button"
                                onClick={() => { setSlotIsCustomCoin(false); setSlotValue(''); }}
                                className={`flex-1 py-2 text-center text-[10px] font-black uppercase tracking-wider rounded-xl border transition-all ${
                                  !slotIsCustomCoin 
                                    ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                    : 'bg-slate-50 text-slate-500 border-slate-105 hover:bg-slate-100'
                                }`}
                              >
                                🔗 Associar Movimento
                              </button>
                              <button
                                type="button"
                                onClick={() => { setSlotIsCustomCoin(true); setSlotCoinId(''); }}
                                className={`flex-1 py-2 text-center text-[10px] font-black uppercase tracking-wider rounded-xl border transition-all ${
                                  slotIsCustomCoin 
                                    ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                    : 'bg-slate-50 text-slate-500 border-slate-105 hover:bg-slate-100'
                                }`}
                              >
                                ✍️ Valor Personalizado
                              </button>
                            </div>
                          </div>

                          {!slotIsCustomCoin ? (
                            <div>
                              <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">
                                Selecione do separador "Moedas"
                              </label>
                              {(() => {
                                const unlinkedEnviados = prosegurCoinMovements.filter(m => m.isClosed);
                                if (unlinkedEnviados.length === 0) {
                                  return (
                                    <div className="p-4 border border-dashed border-slate-200 rounded-2xl text-center bg-slate-50 text-xs text-slate-400 font-bold">
                                      Não existem movimentos finalizados no separador "Moedas". Crie ou conclua um movimento lá, ou use "Valor Personalizado".
                                    </div>
                                  );
                                }
                                return (
                                  <select
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-bold focus:border-blue-500 focus:bg-white focus:outline-none text-xs"
                                    value={slotCoinId}
                                    onChange={(e) => {
                                      const cid = e.target.value;
                                      setSlotCoinId(cid);
                                      const sel = unlinkedEnviados.find(m => m.id === cid);
                                      setSlotValue(sel ? String(sel.sendAmount || sel.amount) : '');
                                    }}
                                  >
                                    <option value="">-- Selecione o movimento de moedas --</option>
                                    {unlinkedEnviados.map(m => (
                                      <option key={m.id} value={m.id}>
                                        {formatDateToDMY(m.sendDate || m.date)} &bull; {formatEuro(m.sendAmount || m.amount)} ({m.sendManagerName || m.managerName})
                                      </option>
                                    ))}
                                  </select>
                                );
                              })()}
                            </div>
                          ) : (
                            <div>
                              <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">
                                Valor Manual de Moedas (€)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 font-mono font-bold focus:border-blue-500 focus:bg-white focus:outline-none"
                                placeholder="0.00"
                                value={slotValue}
                                onChange={(e) => setSlotValue(e.target.value)}
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Footer / Actions */}
                    <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
                      <div className="flex gap-2">
                        {/* Only show Clear button if the slot has some value/content currently */}
                        {(() => {
                          const hasDataObj = weeklySlotEditor.type === 'daily' 
                            ? weeklySlotEditor.week.dailyDeposits?.some(d => d.dayIndex === weeklySlotEditor.dayIndex)
                            : (weeklySlotEditor.type === 'coin1' ? weeklySlotEditor.week.coinDepositsValue1 > 0 : weeklySlotEditor.week.coinDepositsValue2 > 0);
                          
                          return hasDataObj && (
                            <button
                              type="button"
                              onClick={handleClearWeeklySlot}
                              className="px-3.5 py-2 border border-red-200 hover:bg-red-50 text-red-650 hover:text-red-700 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all"
                            >
                              Limpar
                            </button>
                          );
                        })()}
                      </div>

                      <div className="flex gap-2 ml-auto">
                        <button
                          type="button"
                          onClick={() => setWeeklySlotEditor(null)}
                          className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-100 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveWeeklySlot}
                          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-sm shadow-blue-100"
                        >
                          Guardar Lançamento
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Closing Weekly Modal Overlay popup */}
              {closingWeekly && (
                    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 animate-fade-in print:hidden">
                      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-100 overflow-hidden">
                        <div className="p-6 bg-slate-900 text-white flex justify-between items-start">
                          <div>
                            <h3 className="font-extrabold text-white text-base uppercase tracking-wider">
                              Depósito Prossegur - Nº {getWeekNumberOfYear(closingWeekly.startDate)}
                            </h3>
                          </div>
                          <button 
                            onClick={() => setClosingWeekly(null)}
                            className="text-gray-400 hover:text-white transition-all text-xs font-black uppercase p-1.5"
                          >
                            ✖️
                          </button>
                        </div>
                        
                        {/* Summary Block */}
                        {(() => {
                          // Dynamically compute dailySum based on groupedDeposits of the 7 days
                          let dailySum = 0;
                          for (let idx = 0; idx < 7; idx++) {
                            const dateStr = addDaysToDateStr(closingWeekly.startDate, idx);
                            const matchingGroup = groupedDeposits.find(d => d.date === dateStr);
                            const dayTotalAmt = matchingGroup 
                              ? (getDepositRecordCash(matchingGroup.abertura) + getDepositRecordCash(matchingGroup.fecho))
                              : 0;
                            
                            const existDep = closingWeekly.dailyDeposits?.find(d => d.dayIndex === idx);
                            const displayAmount = dayTotalAmt > 0 ? dayTotalAmt : (existDep?.amount || 0);
                            dailySum += displayAmount;
                          }

                          const coinSum = Number(closingWeekly.coinDepositsValue1 || 0) + Number(closingWeekly.coinDepositsValue2 || 0);
                          const totalSoma = dailySum + coinSum;

                          return (
                            <form 
                              onSubmit={(e) => {
                                e.preventDefault();
                                const form = e.currentTarget;
                                const fd = new FormData(form);
                                handleConfirmCloseWeekly(
                                  closingWeekly,
                                  fd.get('closeDate') as string,
                                  fd.get('managerClose') as string,
                                  fd.get('prosegurEmployee') as string,
                                  fd.get('prosegurCredential') as string,
                                  '', // bagNumber eliminated
                                  ''  // prosegurReceipt eliminated
                                );
                              }}
                              className="p-6 space-y-4"
                            >
                              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 grid grid-cols-3 gap-3 text-center">
                                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                                  <span className="block text-[8px] font-black text-gray-400 uppercase tracking-wider mb-1">Depósitos</span>
                                  <span className="text-xs font-mono font-black text-slate-800">{formatEuro(dailySum)}</span>
                                </div>
                                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                                  <span className="block text-[8px] font-black text-gray-400 uppercase tracking-wider mb-1">Depósitos Moedas</span>
                                  <span className="text-xs font-mono font-black text-slate-800">{formatEuro(coinSum)}</span>
                                </div>
                                <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                                  <span className="block text-[8px] font-black text-amber-700 uppercase tracking-wider mb-1">Somatório Total</span>
                                  <span className="text-xs font-mono font-black text-amber-800">{formatEuro(totalSoma)}</span>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Data</label>
                                  <input 
                                    name="closeDate"
                                    type="date"
                                    required
                                    defaultValue={new Date().toISOString().split('T')[0]}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-xs bg-white text-gray-700 focus:ring-1 focus:ring-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Gerente</label>
                                  <input 
                                    name="managerClose"
                                    type="text"
                                    required
                                    list="managers-names"
                                    placeholder="Escreva ou selecione..."
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-xs bg-white text-gray-700 focus:ring-1 focus:ring-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Funcionário Prossegur</label>
                                  <input 
                                    name="prosegurEmployee"
                                    type="text"
                                    required
                                    placeholder="Nome do guarda Prosegur..."
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-xs bg-white text-gray-700 focus:ring-1 focus:ring-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Nº Credencial</label>
                                  <input 
                                    name="prosegurCredential"
                                    type="text"
                                    required
                                    placeholder="Nº da rota ou credencial..."
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-xs bg-white text-gray-700 focus:ring-1 focus:ring-blue-500"
                                  />
                                </div>
                              </div>

                              <div className="flex justify-end gap-2 pt-4 border-t">
                                <button
                                  type="button"
                                  onClick={() => setClosingWeekly(null)}
                                  className="px-4 py-2 text-slate-500 hover:bg-slate-100 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="submit"
                                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md shadow-red-50"
                                >
                                  ✔️ Submeter
                                </button>
                              </div>
                            </form>
                          );
                        })()}
                      </div>
                    </div>
                  )}

              {/* Viewing Historic Weekly Modal Overlay popup */}
              {viewingHistoricWeek && (
                <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 animate-fade-in print:hidden">
                  <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-100 overflow-hidden">
                    <div className="p-6 bg-slate-950 text-white flex justify-between items-start">
                      <div>
                        <span className="text-[10px] uppercase font-black tracking-widest text-[#ffcc00]">
                          Consulta de Histórico
                        </span>
                        <h3 className="font-extrabold text-white text-base uppercase tracking-wider mt-0.5">
                          Semana Nº {getWeekNumberOfYear(viewingHistoricWeek.startDate)} (de {formatDateToDMY(viewingHistoricWeek.startDate)})
                        </h3>
                      </div>
                      <button 
                        onClick={() => setViewingHistoricWeek(null)}
                        className="text-gray-400 hover:text-white transition-all text-xs font-black uppercase p-1.5"
                      >
                        ✖️
                      </button>
                    </div>

                    <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                      {/* Meta Information Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div>
                          <span className="block text-[8px] font-black text-gray-400 uppercase tracking-wider mb-1">Iniciada por</span>
                          <span className="text-xs font-bold text-slate-800">{viewingHistoricWeek.managerOpen}</span>
                        </div>
                        <div>
                          <span className="block text-[8px] font-black text-gray-400 uppercase tracking-wider mb-1">Fechada por</span>
                          <span className="text-xs font-bold text-slate-800">{viewingHistoricWeek.managerClose || '—'}</span>
                        </div>
                        <div>
                          <span className="block text-[8px] font-black text-gray-400 uppercase tracking-wider mb-1">Data de Início</span>
                          <span className="text-xs font-bold text-slate-800">{formatDateToDMY(viewingHistoricWeek.startDate)}</span>
                        </div>
                        <div>
                          <span className="block text-[8px] font-black text-gray-400 uppercase tracking-wider mb-1">Data de Fecho</span>
                          <span className="text-xs font-bold text-slate-800">{viewingHistoricWeek.endDate ? formatDateToDMY(viewingHistoricWeek.endDate) : '—'}</span>
                        </div>
                      </div>

                      {/* Values Grid */}
                      {(() => {
                        let dailySum = 0;
                        const details = Array.from({ length: 7 }).map((_, idx) => {
                          const dateStr = addDaysToDateStr(viewingHistoricWeek.startDate, idx);
                          const existDep = viewingHistoricWeek.dailyDeposits?.find(d => d.dayIndex === idx);
                          const displayAmount = existDep?.amount || 0;
                          dailySum += displayAmount;
                          return {
                            dateStr,
                            dateShort: dateStr.split('-').slice(1).reverse().join('/'),
                            amount: displayAmount,
                            managerName: existDep?.managerName || ''
                          };
                        });

                        const coinSum = Number(viewingHistoricWeek.coinDepositsValue1 || 0) + Number(viewingHistoricWeek.coinDepositsValue2 || 0);
                        const grandTotal = dailySum + coinSum;

                        return (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50 text-center">
                                <span className="block text-[9px] font-black text-blue-700 uppercase tracking-wider mb-1">Total Depósitos Notas</span>
                                <span className="text-lg font-mono font-black text-blue-800">{formatEuro(dailySum)}</span>
                              </div>
                              <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100/50 text-center">
                                <span className="block text-[9px] font-black text-amber-700 uppercase tracking-wider mb-1">Total Depósitos Moedas</span>
                                <span className="text-lg font-mono font-black text-amber-800">{formatEuro(coinSum)}</span>
                              </div>
                              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 text-center">
                                <span className="block text-[9px] font-black text-emerald-800 uppercase tracking-wider mb-1 font-extrabold">Somatório Total da Semana</span>
                                <span className="text-lg font-mono font-black text-emerald-900">{formatEuro(grandTotal)}</span>
                              </div>
                            </div>

                            {/* Detailed Grid (7 days + 2 coins) */}
                            <div>
                              <h4 className="font-extrabold text-slate-700 text-xs uppercase tracking-wider mb-3">Detalhamento dos Lançamentos</h4>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-9 gap-3">
                                {details.map((day, idx) => (
                                  <div key={idx} className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col justify-between min-h-[90px] text-center">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                                      {day.dateShort}
                                    </span>
                                    <div className="flex-1 flex flex-col justify-center">
                                      {day.amount > 0 ? (
                                        <div className="space-y-0.5">
                                          <span className="text-xs font-mono font-black text-slate-800 block">{formatEuro(day.amount)}</span>
                                          {day.managerName && (
                                            <span className="block text-[8px] text-emerald-700 font-extrabold truncate" title={day.managerName}>
                                              {day.managerName}
                                            </span>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-[9px] text-gray-300 font-semibold block">Sem Registo</span>
                                      )}
                                    </div>
                                  </div>
                                ))}

                                {/* Coins 1 */}
                                <div className="bg-amber-50/20 p-3 rounded-2xl border border-amber-100 flex flex-col justify-between min-h-[90px] text-center">
                                  <span className="text-[10px] font-black text-amber-800 uppercase tracking-widest block mb-1">Moedas 1</span>
                                  <div className="flex-1 flex flex-col justify-center">
                                    {viewingHistoricWeek.coinDepositsValue1 > 0 ? (
                                      <span className="text-xs font-mono font-black text-amber-900 block">{formatEuro(viewingHistoricWeek.coinDepositsValue1)}</span>
                                    ) : (
                                      <span className="text-[9px] text-gray-300 font-semibold block">—</span>
                                    )}
                                  </div>
                                </div>

                                {/* Coins 2 */}
                                <div className="bg-amber-50/20 p-3 rounded-2xl border border-amber-100 flex flex-col justify-between min-h-[90px] text-center">
                                  <span className="text-[10px] font-black text-amber-800 uppercase tracking-widest block mb-1">Moedas 2</span>
                                  <div className="flex-1 flex flex-col justify-center">
                                    {viewingHistoricWeek.coinDepositsValue2 > 0 ? (
                                      <span className="text-xs font-mono font-black text-amber-900 block">{formatEuro(viewingHistoricWeek.coinDepositsValue2)}</span>
                                    ) : (
                                      <span className="text-[9px] text-gray-300 font-semibold block">—</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                      <button
                        onClick={() => setViewingHistoricWeek(null)}
                        className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md"
                      >
                        Fechar Visualização
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 2: MOEDAS PROSEGUR */}
              {prosegurSubTab === 'moedas' && (
                <div className="space-y-6">
                  {/* Stats Cards */}
                  {(() => {
                    const pendingCoinsVal = prosegurCoinMovements.filter(m => !m.isClosed).reduce((s, m) => s + (m.amount || 0), 0);

                    return (
                      <div className="max-w-md">
                        <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl flex items-center justify-between shadow-sm">
                          <div>
                            <span className="block text-[8px] font-black text-amber-800 uppercase tracking-widest leading-normal">
                              Total de Moedas Recebidas Pendentes de serem Enviadas
                            </span>
                            <span className="text-2xl font-mono font-black text-amber-950 mt-1 block">
                              {formatEuro(pendingCoinsVal)}
                            </span>
                          </div>
                          <Coins className="text-amber-600 animate-pulse" size={32} />
                        </div>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Panel: Register Coin Movement Form */}
                    <div className="lg:col-span-4 bg-slate-50 p-6 rounded-2xl border border-slate-200 h-fit space-y-4">
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Registo de Entrada e Saída de Moedas</h4>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Lance as moedas recebidas do banco ou registe o envio para a Prosegur</p>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-[8px] font-black uppercase text-slate-400 tracking-wider mb-1">Data de Receção</label>
                          <input 
                            type="date"
                            value={editingCoin?.date || new Date().toISOString().split('T')[0]}
                            onChange={(e) => setEditingCoin(editingCoin ? { ...editingCoin, date: e.target.value } : { id: `coin_${Date.now()}`, date: e.target.value, type: 'Recebido', amount: 0, managerName: '' })}
                            className="w-full px-3 py-1.5 border border-slate-205 rounded-xl font-bold text-xs bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[8px] font-black uppercase text-slate-400 tracking-wider mb-1">Valor Recebido (€)</label>
                          <input 
                            type="text"
                            placeholder="0.00"
                            value={editingCoin && editingCoin.amount ? editingCoin.amount : ''}
                            onChange={(e) => {
                              const val = Number(e.target.value.replace(',', '.')) || 0;
                              setEditingCoin(editingCoin ? { ...editingCoin, amount: val } : { id: `coin_${Date.now()}`, date: new Date().toISOString().split('T')[0], type: 'Recebido', amount: val, managerName: '' });
                            }}
                            className="w-full px-3 py-1.5 border border-slate-205 rounded-xl font-bold font-mono text-xs bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[8px] font-black uppercase text-slate-400 tracking-wider mb-1">Gerente Responsável</label>
                          <input 
                            type="text"
                            list="managers-names"
                            placeholder="Selecione ou insira o gerente..."
                            value={editingCoin?.managerName || ''}
                            onChange={(e) => setEditingCoin(editingCoin ? { ...editingCoin, managerName: e.target.value } : { id: `coin_${Date.now()}`, date: new Date().toISOString().split('T')[0], type: 'Recebido', amount: 0, managerName: e.target.value })}
                            className="w-full px-3 py-1.5 border border-slate-250 rounded-xl font-bold text-xs bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[8px] font-black uppercase text-slate-400 tracking-wider mb-1">Comentário / Observações</label>
                          <textarea 
                            rows={2}
                            placeholder="Ex: moedas de 0.50€ trocados, ou saco selado..."
                            value={editingCoin?.comment || ''}
                            onChange={(e) => setEditingCoin(editingCoin ? { ...editingCoin, comment: e.target.value } : { id: `coin_${Date.now()}`, date: new Date().toISOString().split('T')[0], type: 'Recebido', amount: 0, managerName: '', comment: e.target.value })}
                            className="w-full px-3 py-1.5 border border-slate-205 rounded-xl font-bold text-xs bg-white text-gray-750 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        {/* Sending/Closing Panel - Only expanded if editing or sending */}
                        {editingCoin && (
                          <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100 space-y-3 mt-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="checkbox"
                                checked={editingCoin.isClosed || false}
                                onChange={(e) => {
                                  const closed = e.target.checked;
                                  setEditingCoin({
                                    ...editingCoin,
                                    isClosed: closed,
                                    sendDate: closed ? (editingCoin.sendDate || editingCoin.date) : undefined,
                                    sendAmount: closed ? (editingCoin.sendAmount || editingCoin.amount) : undefined,
                                    sendManagerName: closed ? (editingCoin.sendManagerName || editingCoin.managerName) : undefined
                                  });
                                }}
                                className="w-4 h-4 text-purple-600 border-purple-300 rounded focus:ring-purple-500"
                              />
                              <span className="text-[10px] font-black uppercase text-purple-900 tracking-wider">📤 Enviar Moedas (Encerrar Lançamento)</span>
                            </label>

                            {editingCoin.isClosed && (
                              <div className="space-y-3 pt-2 border-t border-purple-200/50 animate-fade-in">
                                <div>
                                  <label className="block text-[8px] font-black uppercase text-purple-700 tracking-wider mb-1">Data de Envio (CIT)</label>
                                  <input 
                                    type="date"
                                    value={editingCoin.sendDate || new Date().toISOString().split('T')[0]}
                                    onChange={(e) => setEditingCoin({ ...editingCoin, sendDate: e.target.value })}
                                    className="w-full px-3 py-1.5 border border-purple-200 rounded-lg font-bold text-xs bg-white text-gray-700 focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[8px] font-black uppercase text-purple-700 tracking-wider mb-1">Valor de Envio (€)</label>
                                  <input 
                                    type="text"
                                    placeholder="0.00"
                                    value={editingCoin.sendAmount || ''}
                                    onChange={(e) => setEditingCoin({ ...editingCoin, sendAmount: Number(e.target.value.replace(',', '.')) || 0 })}
                                    className="w-full px-3 py-1.5 border border-purple-200 rounded-lg font-bold font-mono text-xs bg-white text-gray-700 focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[8px] font-black uppercase text-purple-700 tracking-wider mb-1">Gerente de Envio</label>
                                  <input 
                                    type="text"
                                    list="managers-names"
                                    placeholder="Nome do gerente de envio..."
                                    value={editingCoin.sendManagerName || ''}
                                    onChange={(e) => setEditingCoin({ ...editingCoin, sendManagerName: e.target.value })}
                                    className="w-full px-3 py-1.5 border border-purple-200 rounded-lg font-bold text-xs bg-white text-gray-700 focus:outline-none"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex gap-2 pt-2">
                          {editingCoin && (
                            <button
                              type="button"
                              onClick={() => setEditingCoin(null)}
                              className="px-4 py-2 border rounded-xl text-slate-500 hover:bg-slate-100 font-extrabold text-[10px] uppercase tracking-wider transition-all"
                            >
                              Limpar
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              if (!editingCoin) {
                                setEditingCoin({
                                  id: `coin_${Date.now()}`,
                                  date: new Date().toISOString().split('T')[0],
                                  type: 'Recebido',
                                  amount: 0,
                                  managerName: ''
                                });
                                alert("Preencha o formulário antes de guardar.");
                                return;
                              }
                              handleSaveCoinEdit();
                            }}
                            className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                          >
                            <Save size={14} /> Guardar Movimento
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Right Panel: Historical Coin Movements list */}
                    <div className="lg:col-span-9 space-y-4">
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Historial de Fluxo de Moedas</h4>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Cronologia de entradas e saídas de cofres de troco</p>
                      </div>

                      {prosegurCoinMovements.length === 0 ? (
                        <div className="p-12 text-center border-2 border-dashed border-slate-105 rounded-3xl bg-white">
                          <Coins className="text-slate-300 mx-auto mb-3" size={32} />
                          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Nenhum movimento de moeda registado</p>
                        </div>
                      ) : (
                        <div className="bg-white border rounded-3xl overflow-x-auto shadow-sm">
                          <table className="w-full text-center border-collapse min-w-[550px]">
                            <thead>
                              <tr className="bg-slate-50 text-[9px] font-black uppercase text-slate-500 border-b tracking-wider">
                                <th className="px-2 py-2.5 text-left">Data</th>
                                <th className="px-2 py-2.5">Tipo</th>
                                <th className="px-2 py-2.5">Estado</th>
                                <th className="px-2 py-2.5 text-right">Valor</th>
                                <th className="px-2 py-2.5">Gerente</th>
                                <th className="px-2 py-2.5">Dt. Envio</th>
                                <th className="px-2 py-2.5 text-left">Descrição</th>
                                <th className="px-2 py-2.5">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y text-xs font-bold text-gray-700">
                              {prosegurCoinMovements.map(coin => {
                                const isReceived = coin.type === 'Recebido';
                                return (
                                  <tr key={coin.id} className="hover:bg-slate-50/50">
                                    <td className="px-2 py-3 text-left">{formatDateToDMY(coin.date)}</td>
                                    <td className="px-2 py-3 text-center">
                                      <span className={`inline-block px-1.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider border ${
                                        isReceived 
                                          ? 'bg-blue-50 text-blue-700 border-blue-100' 
                                          : 'bg-purple-50 text-purple-700 border-purple-100'
                                      }`}>
                                        {isReceived ? '📥 Entrada' : '📤 Saída / CIT'}
                                      </span>
                                    </td>
                                    <td className="px-2 py-3 text-center">
                                      {coin.isClosed ? (
                                        <span className="inline-block px-1.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider border bg-emerald-50 text-emerald-700 border-emerald-100">
                                          Concluído
                                        </span>
                                      ) : (
                                        <span className="inline-block px-1.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider border bg-amber-50 text-amber-700 border-amber-100 animate-pulse">
                                          Pendente
                                        </span>
                                      )}
                                    </td>
                                    <td className={`px-2 py-3 text-right font-mono font-black ${
                                      isReceived ? 'text-blue-900' : 'text-purple-900'
                                    }`}>
                                      {formatEuro(coin.amount)}
                                    </td>
                                    <td className="px-2 py-3">{coin.managerName}</td>
                                    <td className="px-2 py-3 text-center font-mono text-slate-500">
                                      {coin.isClosed && coin.sendDate ? formatDateToDMY(coin.sendDate) : '—'}
                                    </td>
                                    <td className="px-2 py-3 text-left text-gray-500 font-bold max-w-[120px] truncate">{coin.comment || '—'}</td>
                                    <td className="px-2 py-3 text-center">
                                      <div className="flex items-center justify-center gap-1.5">
                                        <button 
                                          onClick={() => setEditingCoin(coin)}
                                          className="p-1 px-2 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-all"
                                          title="Editar Movimento"
                                        >
                                          <Edit2 size={13} />
                                        </button>
                                        <button 
                                          onClick={() => {
                                            setPrintDepositData({
                                              date: coin.date,
                                              managerName: coin.managerName,
                                              amount: coin.amount,
                                              title: 'DEPOSIT DES VALORES E NUMERÁRIO'
                                            });
                                            setTimeout(() => {
                                              window.print();
                                            }, 150);
                                          }}
                                          className="p-1 px-2 hover:bg-blue-50 text-blue-600 hover:text-blue-800 rounded-lg transition-all"
                                          title="Imprimir Guia de Depósito"
                                        >
                                          <Printer size={13} />
                                        </button>
                                        <button 
                                          onClick={() => handleDeleteCoinAction(coin.id)}
                                          className="p-1 px-2 hover:bg-red-50 text-red-500 hover:text-red-700 rounded-lg transition-all"
                                          title="Eliminar Movimento"
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
                      )}
                    </div>
                  </div>
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
                    Fundos
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
                    Colaboradores
                  </button>
                </div>

                {settingsSubTab === 'geral' ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">Fundos de Gaveta</h4>
                    </div>

                    <form onSubmit={handleSaveSettings} className="space-y-4 pt-2">
                       <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">
                            Total de Fundos
                          </label>
                          <input 
                            type="number"
                            value={fundoGavetaCountInput}
                            onChange={(e) => setFundoGavetaCountInput(Number(e.target.value))}
                            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs shadow-sm"
                            min="1"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">
                            Valor Por Fundo
                          </label>
                          <input 
                            type="number"
                            value={fundoGavetaValueInput}
                            onChange={(e) => setFundoGavetaValueInput(Number(e.target.value))}
                            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs shadow-sm"
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
                          className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs shadow-sm"
                          min="1"
                        />
                      </div>

                      <div className="bg-slate-100 border border-slate-200/65 p-3.5 rounded-xl text-xs text-slate-600 font-bold">
                        Estes parâmetros são automaticamente precarregados em cada nova contagem criada.
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
                  <div className="space-y-4 animate-fade-in">
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                        Associe o código de colaborador de cada funcionário e gerente para preenchimento automático na folha de depósito
                      </p>
                    </div>

                    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black uppercase text-slate-500 tracking-wider">
                            <th className="px-4 py-2.5">Nome</th>
                            <th className="px-4 py-2.5">Cargo</th>
                            <th className="px-4 py-2.5 w-36">Nº Mecanográfico</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                          {[...localEmployees].sort((a, b) => a.name.localeCompare(b.name)).map((emp) => (
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
                                    setLocalEmployees(prev => prev.map(item => item.id === emp.id ? { ...item, mecanografico: updatedVal } : item));
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

      {/* Autocomplete Datalists for Employee Prepopulation */}
      <datalist id="employees-mecanograficos">
        {employees.filter(emp => emp.mecanografico).map(emp => (
          <option key={emp.id} value={emp.mecanografico}>
            {emp.name} ({emp.role})
          </option>
        ))}
      </datalist>
      <datalist id="employees-names">
        {employees.map(emp => (
          <option key={emp.id} value={emp.name}>
            {emp.mecanografico ? `Nº ${emp.mecanografico} - ${emp.role}` : emp.role}
          </option>
        ))}
      </datalist>
      <datalist id="managers-names">
        {employees.filter(emp => emp.role?.toUpperCase() === 'GERENTE').map(emp => (
          <option key={emp.id} value={emp.name}>
            {emp.mecanografico ? `Nº ${emp.mecanografico} - GERENTE` : 'GERENTE'}
          </option>
        ))}
      </datalist>

      {/* PRINTABLE MILLENNIUM BCP DEPOSIT SLIP OVERLAY */}
      {printDepositData && (
        <div className="hidden print:block print-container print-landscape absolute inset-0 bg-white min-h-screen text-slate-900 font-sans p-8 space-y-12 z-[99999]">
          {/* Slip 1: Original */}
          <div className="border-4 border-slate-900 p-8 rounded-2xl space-y-8 relative max-w-4xl mx-auto shadow-md">
            {/* Header */}
            <div className="flex justify-between items-center border-b-4 border-slate-900 pb-5">
              <div>
                <div className="text-base font-black uppercase text-slate-850 tracking-wider">
                  DEPÓSITO DE VALORES E NUMERÁRIO
                </div>
              </div>
              <div>
                <div className="bg-[#cc0052] text-white font-extrabold px-4 py-1.5 text-lg tracking-wider rounded inline-block">
                  Millennium <span className="italic font-light text-sm">bcp</span>
                </div>
              </div>
            </div>

            {/* Account Details and Reference Row */}
            <div className="grid grid-cols-12 gap-6">
              {/* Account column */}
              <div className="col-span-8 border-2 border-slate-400 p-4 rounded-xl relative">
                <span className="absolute -top-2.5 left-3 bg-white px-2 text-[8px] font-black uppercase text-slate-400 tracking-wider">
                  N.º Conta a Creditar / IBAN
                </span>
                <div className="flex gap-1.5 mt-1 justify-between">
                  {["0", "3", "0", "8", "0", "9", "7", "1", "8", "1", "4"].map((digit, i) => (
                    <div key={i} className="w-7 h-8 border-2 border-slate-900 text-sm font-extrabold flex items-center justify-center font-mono rounded bg-slate-55">
                      {digit}
                    </div>
                  ))}
                  <div className="text-[7px] text-slate-400 font-black self-center ml-2 leading-tight uppercase">
                    Preenchimento<br />Obrigatório
                  </div>
                </div>
              </div>

              {/* Date column */}
              <div className="col-span-4 border-2 border-slate-400 p-4 rounded-xl relative flex items-center justify-center">
                <span className="absolute -top-2.5 left-3 bg-white px-2 text-[8px] font-black uppercase text-slate-400 tracking-wider">
                  Data do Depósito
                </span>
                <div className="text-sm font-black text-center mt-1 uppercase font-mono tracking-widest text-slate-800">
                  {formatDateToDMY(printDepositData.date)}
                </div>
              </div>
            </div>

            {/* Account Holder Row */}
            <div className="border-2 border-slate-400 p-4 rounded-xl relative">
              <span className="absolute -top-2.5 left-3 bg-white px-2 text-[8px] font-black uppercase text-slate-400 tracking-wider">
                Titular da conta
              </span>
              <div className="text-sm font-extrabold mt-1.5 uppercase tracking-wide text-slate-850 h-5">
                {"\u00A0"}
              </div>
            </div>

            {/* Reference Area */}
            <div className="border-2 border-slate-400 p-4 rounded-xl relative">
              <span className="absolute -top-2.5 left-3 bg-white px-2 text-[8px] font-black uppercase text-slate-400 tracking-wider">
                Depósito Especial Referência do Depositante
              </span>
              <div className="flex gap-1.5 mt-1">
                {Array.from({ length: 18 }).map((_, i) => (
                  <div key={i} className="w-5 h-7 border border-slate-300 text-slate-300 flex items-center justify-center text-[10px] font-bold font-mono rounded">
                    —
                  </div>
                ))}
              </div>
            </div>

            {/* Table for values and Importancias */}
            <div className="border-2 border-slate-400 rounded-2xl overflow-hidden">
              <table className="w-full text-center border-collapse text-[10px]">
                <thead>
                  <tr className="bg-slate-50 border-b-2 border-slate-400 text-[9px] font-black uppercase text-slate-500 tracking-wider">
                    <th className="px-4 py-2 text-left border-r-2 border-slate-400 w-1/3">Banco / CTT</th>
                    <th className="px-4 py-2 border-r-2 border-slate-400 w-1/5">Nº Conta</th>
                    <th className="px-4 py-2 border-r-2 border-slate-400 w-1/5">Nº Documento</th>
                    <th className="px-4 py-2 text-right w-1/4">Importâncias</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 font-mono">
                  {Array.from({ length: 10 }).map((_, idx) => (
                    <tr key={idx} className="h-7">
                      <td className="px-4 py-1 text-left border-r-2 border-slate-400 font-black tracking-wide uppercase text-slate-800">
                        {"\u00A0"}
                      </td>
                      <td className="px-4 py-1 border-r-2 border-slate-400 text-slate-350 text-center">
                        {"\u00A0"}
                      </td>
                      <td className="px-4 py-1 border-r-2 border-slate-400 text-slate-350 text-center">
                        {idx === 0 ? "—" : "\u00A0"}
                      </td>
                      <td className="px-4 py-1 text-right font-black text-slate-900 text-xs">
                        {idx === 0 ? formatEuro(printDepositData.amount) : "\u00A0"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom signatures and values converter */}
            <div className="grid grid-cols-12 gap-8 border-t-2 border-slate-300 pt-5">
              <div className="col-span-8 flex flex-col justify-end">
                <div className="grid grid-cols-2 gap-6">
                  <div className="relative border-2 border-slate-400 p-3 rounded-xl">
                    <span className="absolute -top-2.5 left-3 bg-white px-2 text-[8px] font-black uppercase text-slate-400 tracking-wider">
                      Nome do Depositante
                    </span>
                    <div className="text-xs font-extrabold uppercase truncate mt-1 text-slate-800">
                      {printDepositData.managerName || 'GERENTE VIA CATARINA'}
                    </div>
                  </div>
                  <div className="relative border-2 border-slate-400 p-3 rounded-xl h-14 flex items-end">
                    <span className="absolute -top-2.5 left-3 bg-white px-2 text-[8px] font-black uppercase text-slate-400 tracking-wider">
                      Assinatura do Depositante
                    </span>
                    <div className="w-full border-t border-dashed border-slate-300 text-center text-[8px] text-slate-350 uppercase">
                      {"\u00A0"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-span-4 bg-slate-900 text-white rounded-2xl p-5 flex flex-col justify-center items-center text-center shadow-md min-h-[96px]">
                <div className="w-full">
                  <div className="text-2xl font-mono font-black border-2 border-dashed border-white/30 px-3 py-2 rounded-xl bg-black/20">
                    {formatEuro(printDepositData.amount)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Day Secure Modal */}
      {deleteDayModalOpen && deleteDayTargetDate && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-fade-in print:hidden">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden animate-scale-in">
            <div className="p-5 bg-red-650 text-white flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-red-200">Segurança de Dados</span>
                <h3 className="font-extrabold text-white text-base uppercase tracking-wider mt-0.5">Eliminar Dia de Contagem</h3>
              </div>
              <button 
                onClick={() => setDeleteDayModalOpen(false)}
                className="text-white hover:text-red-200 transition-all text-xs font-black uppercase p-1.5 focus:outline-none"
              >
                ✖️
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 items-start font-sans">
                <span className="text-xl mt-0.5">⚠️</span>
                <div className="text-xs">
                  <p className="font-black text-red-900 uppercase">Aviso de Operação Irreversível</p>
                  <p className="text-red-700 mt-1 font-semibold leading-normal">
                    Pretende apagar de forma definitiva todas as contagens iniciadas para o dia <span className="underline font-black">{formatDateToDMY(deleteDayTargetDate)}</span>. Todos os turnos e rascunhos de cofre salvos nesta data serão destruídos e não podem ser restaurados.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {/* Nome do Gerente */}
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-500 tracking-wider mb-1">
                    Nome do Gerente que apaga
                  </label>
                  <select 
                    value={deleteDayManager}
                    onChange={(e) => setDeleteDayManager(e.target.value)}
                    className="w-full px-4 py-2.5 border rounded-xl font-bold text-xs bg-slate-50 text-slate-800 outline-none focus:ring-1 focus:ring-red-500 hover:bg-slate-100 transition-all focus:bg-white"
                  >
                    <option value="">-- Selecione o Gerente --</option>
                    {employees.filter(e => e.role?.toUpperCase() === 'GERENTE').map(e => (
                      <option key={e.id} value={e.name}>{e.name}</option>
                    ))}
                  </select>
                </div>

                {/* Password Geral */}
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-500 tracking-wider mb-1">
                    Password Geral de Eliminação
                  </label>
                  <input 
                    type="password"
                    required
                    placeholder="Introduza a password..."
                    value={deleteDayPassword}
                    onChange={(e) => setDeleteDayPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border rounded-xl font-bold text-xs bg-slate-50 text-slate-800 placeholder-slate-400 outline-none focus:ring-1 focus:ring-red-500 hover:bg-slate-100 transition-all focus:bg-white"
                  />
                </div>
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteDayModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-50 transition-all bg-white"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteDayCounts}
                  className="flex-1 py-2.5 bg-red-650 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-red-100"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Deposit Secure Modal */}
      {deleteDepositModalOpen && deleteDepositTargetId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-fade-in print:hidden">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden animate-scale-in">
            <div className="p-5 bg-red-650 text-white flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-red-200">Segurança de Dados</span>
                <h3 className="font-extrabold text-white text-base uppercase tracking-wider mt-0.5">Eliminar Folha de Depósito</h3>
              </div>
              <button 
                onClick={() => setDeleteDepositModalOpen(false)}
                className="text-white hover:text-red-200 transition-all text-xs font-black uppercase p-1.5 focus:outline-none"
              >
                ✖️
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 items-start font-sans">
                <span className="text-xl mt-0.5">⚠️</span>
                <div className="text-xs">
                  <p className="font-black text-red-900 uppercase">Aviso de Operação Irreversível</p>
                  <p className="text-red-700 mt-1 font-semibold leading-normal">
                    Pretende apagar de forma definitiva este registo de folha de depósito. Esta ação irá apagar permanentemente os dados gravados de faturas e depósitos registados neste turno e não poderá ser restabelecida.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {/* Nome do Gerente */}
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-500 tracking-wider mb-1">
                    Nome do Gerente que apaga
                  </label>
                  <select 
                    value={deleteDepositManager}
                    onChange={(e) => setDeleteDepositManager(e.target.value)}
                    className="w-full px-4 py-2.5 border rounded-xl font-bold text-xs bg-slate-50 text-slate-800 outline-none focus:ring-1 focus:ring-red-500 hover:bg-slate-100 transition-all focus:bg-white"
                  >
                    <option value="">-- Selecione o Gerente --</option>
                    {employees.filter(e => e.role?.toUpperCase() === 'GERENTE').map(e => (
                      <option key={e.id} value={e.name}>{e.name}</option>
                    ))}
                  </select>
                </div>

                {/* Password Geral */}
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-500 tracking-wider mb-1">
                    Password de Segurança
                  </label>
                  <input 
                    type="password"
                    required
                    placeholder="Introduza a password..."
                    value={deleteDepositPassword}
                    onChange={(e) => setDeleteDepositPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border rounded-xl font-bold text-xs bg-slate-50 text-slate-800 placeholder-slate-400 outline-none focus:ring-1 focus:ring-red-500 hover:bg-slate-100 transition-all focus:bg-white"
                  />
                </div>
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteDepositModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-50 transition-all bg-white"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteDeposit}
                  className="flex-1 py-2.5 bg-red-650 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-red-100"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
