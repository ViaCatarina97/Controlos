
import React, { useMemo, useState, useEffect } from 'react';
import { DeliveryRecord, CreditNoteRecord, Employee, MonthlyOperationalData, OtherSupplierEntry } from '../types';
import { getMonthlyOps, saveMonthlyOps } from '../services/firebaseService';
import { Printer, Calendar, Plus, Trash2 } from 'lucide-react';

interface BillingSummaryProps {
  deliveries: DeliveryRecord[];
  credits?: CreditNoteRecord[];
  employees: Employee[];
  restaurantId: string;
}

const HAVI_NAME_TO_CODE: Record<string, string> = {
  'Congelados': 'A',
  'Refrigerados': 'B',
  'Secos Comida': 'C',
  'Secos Papel': 'D',
  'Manutenção & Limpeza': 'E',
  'Marketing IPL': 'F',
  'Marketing Geral': 'G',
  'Produtos Frescos': 'H',
  'Manutenção & Limpeza Compras': 'I',
  'Condimentos': 'J',
  'Condimentos Cozinha': 'L',
  'Material Adm': 'M',
  'Manuais': 'N',
  'Ferramentas Utensilios': 'O',
  'Marketing Geral Custo': 'P',
  'Fardas': 'R',
  'Distribuição de Marketing': 'S',
  'Bulk Alimentar': 'T',
  'Bulk Papel': 'U',
  'Outros': 'G'
};

const DEFAULT_MONTHLY_DATA: Omit<MonthlyOperationalData, 'month'> = {
  vendasMes: 0,
  comprasComida: 0,
  comprasPapel: 0,
  comprasTotalOps: 0,
  consumoComida: 0,
  consumoPapel: 0,
  consumoOps: 0,
  invInicialComida: 0,
  invInicialOps: 0,
  perdasComida: 0,
  refeicoesComida: 0,
  promoComida: 0,
  invFinalComida: 0,
  invFinalPapel: 0,
  invFinalOps: 0,
  comprasOpsHavi: 0,
  invInicialPapel: 0,
  perdasPapel: 0,
  refeicoesPapel: 0,
  promoPapel: 0,
  comprasOpsMaiaPapper: 0,
  otherSuppliers: []
};

export const BillingSummary: React.FC<BillingSummaryProps> = ({ deliveries, credits = [], employees, restaurantId }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [monthlyData, setMonthlyData] = useState<MonthlyOperationalData>({
    month: selectedMonth,
    ...DEFAULT_MONTHLY_DATA
  });

  useEffect(() => {
    const loadMonthlyData = async () => {
      try {
        const data = await getMonthlyOps(restaurantId, selectedMonth);
        if (data) {
          setMonthlyData(data);
        } else {
          const saved = localStorage.getItem(`monthly_ops_data_${selectedMonth}`);
          if (saved) {
            setMonthlyData(JSON.parse(saved));
          } else {
            setMonthlyData({ month: selectedMonth, ...DEFAULT_MONTHLY_DATA });
          }
        }
      } catch (err) {
        console.error("Failed to load monthly operations data:", err);
        setMonthlyData({ month: selectedMonth, ...DEFAULT_MONTHLY_DATA });
      }
    };
    loadMonthlyData();
  }, [selectedMonth, restaurantId]);

  const saveToStore = async (updated: MonthlyOperationalData) => {
    // Inject calculated values before saving
    const totalAirLiquideVal = updated.otherSuppliers
      .filter(s => s.supplier?.toLowerCase() === 'air liquide')
      .reduce((sum, s) => sum + (s.invoiceValue || 0), 0);

    const totalMaiaPapperVal = updated.otherSuppliers
      .filter(s => s.supplier?.toLowerCase() === 'maiapapper')
      .reduce((sum, s) => sum + (s.invoiceValue || 0), 0);

    const compComprasComida = 
      (aggregatedHavi['A']?.total || 0) +
      (aggregatedHavi['B']?.total || 0) +
      (aggregatedHavi['C']?.total || 0) +
      (aggregatedHavi['H']?.total || 0) +
      (aggregatedHavi['J']?.total || 0) +
      (aggregatedHavi['L']?.total || 0) +
      (aggregatedHavi['T']?.total || 0) +
      totalAirLiquideVal;

    const compComprasPapel = 
      (aggregatedHavi['D']?.total || 0) +
      (aggregatedHavi['U']?.total || 0);

    const compComprasTotalOps = 
      (aggregatedHavi['E']?.total || 0) +
      (aggregatedHavi['I']?.total || 0) +
      (aggregatedHavi['M']?.total || 0) +
      (aggregatedHavi['O']?.total || 0);

    const compComprasOpsHavi = 
      (aggregatedHavi['E']?.total || 0) +
      (aggregatedHavi['I']?.total || 0) +
      (aggregatedHavi['O']?.total || 0) +
      (aggregatedHavi['M']?.total || 0);

    const compComprasOpsMaiaPapper = totalMaiaPapperVal;

    const compConsumoComida = 
      (updated.invInicialComida || 0) +
      compComprasComida -
      (updated.perdasComida || 0) -
      (updated.refeicoesComida || 0) -
      (updated.promoComida || 0) -
      (updated.invFinalComida || 0);

    const compConsumoPapel = 
      (updated.invInicialPapel || 0) +
      compComprasPapel -
      (updated.perdasPapel || 0) -
      (updated.refeicoesPapel || 0) -
      (updated.promoPapel || 0) -
      (updated.invFinalPapel || 0);

    const compConsumoOps = 
      (updated.invInicialOps || 0) +
      compComprasTotalOps -
      (updated.invFinalOps || 0);

    const enriched: MonthlyOperationalData = {
      ...updated,
      comprasComida: compComprasComida,
      comprasPapel: compComprasPapel,
      comprasTotalOps: compComprasTotalOps,
      comprasOpsHavi: compComprasOpsHavi,
      comprasOpsMaiaPapper: compComprasOpsMaiaPapper,
      consumoComida: compConsumoComida,
      consumoPapel: compConsumoPapel,
      consumoOps: compConsumoOps
    };

    setMonthlyData(enriched);
    localStorage.setItem(`monthly_ops_data_${selectedMonth}`, JSON.stringify(enriched));
    try {
      await saveMonthlyOps(restaurantId, enriched);
    } catch (err) {
      console.error("Failed to save monthly ops to cloud:", err);
    }
  };

  const handleUpdateMonthlyField = (field: keyof Omit<MonthlyOperationalData, 'month' | 'otherSuppliers'>, value: number) => {
    saveToStore({ ...monthlyData, [field]: value });
  };

  const handleAddOtherSupplier = () => {
    const newEntry: OtherSupplierEntry = {
        id: crypto.randomUUID(),
        supplier: 'Air Liquide',
        date: '',
        quantity: 0,
        invoiceValue: 0,
        myStoreValue: 0,
        managerId: ''
    };
    saveToStore({ ...monthlyData, otherSuppliers: [...monthlyData.otherSuppliers, newEntry] });
  };

  const handleUpdateOtherSupplier = (id: string, field: keyof OtherSupplierEntry, value: any) => {
    const updatedSuppliers = monthlyData.otherSuppliers.map(s => s.id === id ? { ...s, [field]: value } : s);
    saveToStore({ ...monthlyData, otherSuppliers: updatedSuppliers });
  };

  const handleDeleteOtherSupplier = (id: string) => {
    saveToStore({ ...monthlyData, otherSuppliers: monthlyData.otherSuppliers.filter(s => s.id !== id) });
  };

  const filteredRecords = useMemo(() => {
    return deliveries.filter(d => d.date.startsWith(selectedMonth));
  }, [deliveries, selectedMonth]);

  const filteredCredits = useMemo(() => {
    return credits.filter(c => c.date && c.date.startsWith(selectedMonth));
  }, [credits, selectedMonth]);

  const aggregatedHavi = useMemo<Record<string, { desc: string, total: number }>>(() => {
    const groups: Record<string, { desc: string, total: number }> = {};
    
    // Add deliveries
    filteredRecords.forEach(rec => {
      rec.haviGroups.forEach(g => {
        if (!groups[g.group]) {
          groups[g.group] = { desc: g.description, total: 0 };
        }
        groups[g.group].total += g.total;
      });
    });

    // Discount Credit Notes (Valor HAVI)
    filteredCredits.forEach(c => {
      const gName = c.haviGroup || 'Outros';
      const code = HAVI_NAME_TO_CODE[gName] || 'G';
      const val = c.valueHavi ?? c.value ?? 0;
      if (!groups[code]) {
        groups[code] = { desc: gName, total: 0 };
      }
      groups[code].total -= val;
    });

    return groups;
  }, [filteredRecords, filteredCredits]);

  const totalPontoVerde = useMemo(() => filteredRecords.reduce((s, r) => s + r.pontoVerde, 0), [filteredRecords]);
  
  const grandTotalHavi = useMemo(() => 
    (Object.values(aggregatedHavi) as { desc: string, total: number }[]).reduce((s, g) => s + g.total, 0), 
    [aggregatedHavi]
  );

  const aggregatedSms = useMemo<Record<string, number>>(() => {
    const sms: Record<string, number> = {};
    
    // Add MyStore deliveries
    filteredRecords.forEach(rec => {
      rec.smsValues.forEach(v => {
        sms[v.description] = (sms[v.description] || 0) + v.amount;
      });
    });

    // Discount Credit Notes (Valor MyStore)
    filteredCredits.forEach(c => {
      const gName = c.myStoreGroup || 'Outros';
      const val = c.valueMyStore ?? 0;
      if (sms[gName] === undefined) {
        sms[gName] = 0;
      }
      sms[gName] -= val;
    });

    return sms;
  }, [filteredRecords, filteredCredits]);

  const grandTotalSms = useMemo(() => 
    (Object.values(aggregatedSms) as number[]).reduce((s, a) => s + a, 0), 
    [aggregatedSms]
  );

  const formatMonthHeader = (monthStr: string) => {
    const [y, m] = monthStr.split('-');
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${months[parseInt(m) - 1]} ${y}`;
  };

  const formatEuro = (val: number) => {
    return val.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  };

  const formatPercent = (val: number) => {
    return val.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
  };

  const formatNumber = (val: number) => {
    return val.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const gerentes = employees.filter(e => e.role === 'GERENTE');

  const totalAirLiquide = useMemo(() => {
    return monthlyData.otherSuppliers
      .filter(s => s.supplier?.toLowerCase() === 'air liquide')
      .reduce((sum, s) => sum + (s.invoiceValue || 0), 0);
  }, [monthlyData.otherSuppliers]);

  const totalMaiaPapper = useMemo(() => {
    return monthlyData.otherSuppliers
      .filter(s => s.supplier?.toLowerCase() === 'maiapapper')
      .reduce((sum, s) => sum + (s.invoiceValue || 0), 0);
  }, [monthlyData.otherSuppliers]);

  const computedComprasComida = useMemo(() => {
    return (
      (aggregatedHavi['A']?.total || 0) +
      (aggregatedHavi['B']?.total || 0) +
      (aggregatedHavi['C']?.total || 0) +
      (aggregatedHavi['H']?.total || 0) +
      (aggregatedHavi['J']?.total || 0) +
      (aggregatedHavi['L']?.total || 0) +
      (aggregatedHavi['T']?.total || 0) +
      totalAirLiquide
    );
  }, [aggregatedHavi, totalAirLiquide]);

  const computedComprasPapel = useMemo(() => {
    return (
      (aggregatedHavi['D']?.total || 0) +
      (aggregatedHavi['U']?.total || 0)
    );
  }, [aggregatedHavi]);

  const computedComprasTotalOps = useMemo(() => {
    return (
      (aggregatedHavi['E']?.total || 0) +
      (aggregatedHavi['I']?.total || 0) +
      (aggregatedHavi['M']?.total || 0) +
      (aggregatedHavi['O']?.total || 0)
    );
  }, [aggregatedHavi]);

  const computedComprasOpsHavi = useMemo(() => {
    return (
      (aggregatedHavi['E']?.total || 0) +
      (aggregatedHavi['I']?.total || 0) +
      (aggregatedHavi['O']?.total || 0) +
      (aggregatedHavi['M']?.total || 0)
    );
  }, [aggregatedHavi]);

  const computedComprasOpsMaiaPapper = totalMaiaPapper;

  const computedConsumoComida = useMemo(() => {
    return (
      (monthlyData.invInicialComida || 0) +
      computedComprasComida -
      (monthlyData.perdasComida || 0) -
      (monthlyData.refeicoesComida || 0) -
      (monthlyData.promoComida || 0) -
      (monthlyData.invFinalComida || 0)
    );
  }, [monthlyData.invInicialComida, computedComprasComida, monthlyData.perdasComida, monthlyData.refeicoesComida, monthlyData.promoComida, monthlyData.invFinalComida]);

  const computedConsumoPapel = useMemo(() => {
    return (
      (monthlyData.invInicialPapel || 0) +
      computedComprasPapel -
      (monthlyData.perdasPapel || 0) -
      (monthlyData.refeicoesPapel || 0) -
      (monthlyData.promoPapel || 0) -
      (monthlyData.invFinalPapel || 0)
    );
  }, [monthlyData.invInicialPapel, computedComprasPapel, monthlyData.perdasPapel, monthlyData.refeicoesPapel, monthlyData.promoPapel, monthlyData.invFinalPapel]);

  const computedConsumoOps = useMemo(() => {
    return (
      (monthlyData.invInicialOps || 0) +
      computedComprasTotalOps -
      (monthlyData.invFinalOps || 0)
    );
  }, [monthlyData.invInicialOps, computedComprasTotalOps, monthlyData.invFinalOps]);

  return (
    <div className="flex flex-col h-full bg-white animate-fade-in p-4 overflow-auto custom-scrollbar print:h-auto print:overflow-visible print:p-0">
      {/* Controls */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase text-gray-400 mb-1">Período de Resumo</span>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600" size={16} />
              <input 
                type="month" 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
        <button onClick={() => window.print()} className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2 rounded-lg font-bold hover:bg-slate-800 transition-all">
          <Printer size={18} /> Imprimir Resumo
        </button>
      </div>

      <div className="bg-white border-2 border-slate-100 p-8 shadow-sm flex flex-col space-y-6 min-w-[1000px] print:min-w-0 print:w-full print:p-0 print:border-none print:shadow-none">
        
        {/* Header Section */}
        <div className="flex items-center justify-between border-b-4 border-[#5a7d36] pb-2">
          <div className="bg-[#5a7d36] text-white px-12 py-3 rounded-r-full">
            <h1 className="text-3xl font-black uppercase tracking-tighter">Resumo Controlo de Facturação</h1>
          </div>
          <div className="flex items-center gap-8 shrink-0 text-right">
            <div className="text-4xl font-black text-gray-300 tracking-widest uppercase text-right">
              {formatMonthHeader(selectedMonth)}
            </div>
          </div>
        </div>

        {/* Main Grid: HAVI / MyStore / Diferença */}
        <div className="grid grid-cols-12 gap-6">
          
          <div className="col-span-4 flex flex-col border border-gray-200">
            <div className="bg-gray-50 py-2 text-center font-black uppercase text-xs tracking-widest border-b border-gray-200">HAVI</div>
            <div className="grid grid-cols-12 text-[10px] font-black uppercase text-gray-400 bg-white border-b border-gray-100">
              <div className="col-span-2 px-2 py-1 border-r border-gray-50">Grupo</div>
              <div className="col-span-7 px-2 py-1 border-r border-gray-50">Descrição</div>
              <div className="col-span-3 px-2 py-1 text-right">Total</div>
            </div>
            <div className="flex flex-col bg-white">
              {(Object.entries(aggregatedHavi) as [string, { desc: string, total: number }][]).map(([code, g]) => (
                <div key={code} className="grid grid-cols-12 text-[11px] font-bold border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <div className="col-span-2 px-2 py-0.5 border-r border-gray-50">{code}</div>
                  <div className="col-span-7 px-2 py-0.5 border-r border-gray-50 truncate">{g.desc}</div>
                  <div className="col-span-3 px-2 py-0.5 text-right tabular-nums">{formatEuro(g.total)}</div>
                </div>
              ))}
              {/* Removed Ponto Verde row */}
            </div>
            <div className="mt-auto bg-white p-3 text-right border-t-2 border-gray-200">
              <div className="text-2xl font-black text-slate-900">{formatEuro(grandTotalHavi)}</div>
            </div>
          </div>

          <div className="col-span-4 flex flex-col border border-gray-200">
            <div className="bg-gray-50 py-2 text-center font-black uppercase text-xs tracking-widest border-b border-gray-200">MyStore</div>
            <div className="grid grid-cols-12 text-[10px] font-black uppercase text-gray-400 bg-white border-b border-gray-100">
              <div className="col-span-8 px-2 py-1 border-r border-gray-50">Descrição</div>
              <div className="col-span-4 px-2 py-1 text-right">Total</div>
            </div>
            <div className="flex flex-col bg-white h-full">
              {(Object.entries(aggregatedSms) as [string, number][]).map(([desc, val]) => (
                <div key={desc} className="grid grid-cols-12 text-[11px] font-bold border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <div className="col-span-8 px-2 py-1 border-r border-gray-50">{desc}</div>
                  <div className="col-span-4 px-2 py-1 text-right tabular-nums">{formatEuro(val)}</div>
                </div>
              ))}
            </div>
            <div className="mt-auto bg-white p-3 text-right border-t-2 border-gray-200">
              <div className="text-2xl font-black text-slate-900">{formatEuro(grandTotalSms)}</div>
            </div>
          </div>

          <div className="col-span-4 flex flex-col border border-gray-200">
            <div className="bg-gray-50 py-2 text-center font-black uppercase text-xs tracking-widest border-b border-gray-200">Diferença</div>
            <div className="grid grid-cols-12 text-[10px] font-black uppercase text-gray-400 bg-white border-b border-gray-100">
              <div className="col-span-8 px-2 py-1 border-r border-gray-50">Descrição</div>
              <div className="col-span-4 px-2 py-1 text-right">Total</div>
            </div>
            <div className="flex flex-col bg-white">
                 {(Object.entries(aggregatedSms) as [string, number][]).map(([desc, smsVal]) => {
                   let haviMatch = 0;
                   if (desc === 'Comida') haviMatch = ['A','B','C','H','J','L','T'].reduce((s, c) => s + (aggregatedHavi[c]?.total || 0), 0);
                   else if (desc === 'Papel') haviMatch = ['D','U']?.reduce((s, c) => s + (aggregatedHavi[c]?.total || 0), 0);
                   else if (desc === 'F. Operacionais') haviMatch = (aggregatedHavi['E']?.total || 0) + (aggregatedHavi['I']?.total || 0) + (aggregatedHavi['O']?.total || 0);
                   else if (desc === 'Material Adm') haviMatch = (aggregatedHavi['M']?.total || 0);
                   else if (desc === 'Happy Meal') haviMatch = (aggregatedHavi['F']?.total || 0);
                   else if (desc === 'Outros') haviMatch = (aggregatedHavi['G']?.total || 0) + (aggregatedHavi['N']?.total || 0) + (aggregatedHavi['P']?.total || 0) + (aggregatedHavi['R']?.total || 0) + (aggregatedHavi['S']?.total || 0);

                   const diff = haviMatch - smsVal;
                   return (
                    <div key={desc} className="grid grid-cols-12 text-[11px] font-bold border-b border-gray-50 last:border-0">
                      <div className="col-span-8 px-2 py-1 border-r border-gray-50">{desc}</div>
                      <div className={`col-span-4 px-2 py-1 text-right tabular-nums ${Math.abs(diff) > 0.1 ? 'text-red-500' : 'text-gray-400'}`}>
                        {formatEuro(diff)}
                      </div>
                    </div>
                   );
                 })}
            </div>
            <div className="mt-auto bg-white p-3 text-right border-t-2 border-gray-200">
               <div className={`text-2xl font-black ${Math.abs(grandTotalHavi - grandTotalSms) > 0.1 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {formatEuro(grandTotalHavi - grandTotalSms)}
               </div>
            </div>
          </div>
        </div>

        {/* Quadro Unificado de Outros Fornecedores */}
        <div className="border border-gray-200 rounded overflow-hidden">
            <div className="bg-slate-800 text-white px-4 py-2 flex justify-between items-center">
                <span className="font-bold text-sm uppercase tracking-widest">Outros Fornecedores</span>
                <button onClick={handleAddOtherSupplier} className="bg-white/10 hover:bg-white/20 p-1 rounded transition-colors print:hidden">
                    <Plus size={16} />
                </button>
            </div>
            <table className="w-full text-[11px]">
                <thead className="bg-gray-100 text-gray-500 font-bold border-b border-gray-200">
                    <tr>
                        <th className="px-2 py-1.5 text-left border-r border-gray-200">Fornecedor</th>
                        <th className="px-2 py-1.5 text-left border-r border-gray-200">Data</th>
                        <th className="px-2 py-1.5 text-center border-r border-gray-200">Qtd</th>
                        <th className="px-2 py-1.5 text-right border-r border-gray-200">Fatura (€)</th>
                        <th className="px-2 py-1.5 text-right border-r border-gray-200">MyStore (€)</th>
                        <th className="px-2 py-1.5 text-right border-r border-gray-200">Diferença (€)</th>
                        <th className="px-2 py-1.5 text-left border-r border-gray-200">Gerente</th>
                        <th className="px-2 py-1.5 text-center print:hidden w-10"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {monthlyData.otherSuppliers.map(entry => (
                        <tr key={entry.id} className="hover:bg-gray-50 group">
                            <td className="p-1 border-r border-gray-50">
                                <select value={entry.supplier} onChange={e => handleUpdateOtherSupplier(entry.id, 'supplier', e.target.value)} className="w-full bg-transparent border-none outline-none font-bold text-gray-700">
                                    <option value="Air Liquide">Air Liquide</option>
                                    <option value="MaiaPapper">MaiaPapper</option>
                                </select>
                            </td>
                            <td className="p-1 border-r border-gray-50">
                                <input type="date" value={entry.date} onChange={e => handleUpdateOtherSupplier(entry.id, 'date', e.target.value)} className="w-full bg-transparent border-none outline-none" />
                            </td>
                            <td className="p-1 border-r border-gray-50">
                                <input type="number" value={entry.quantity || ''} onChange={e => handleUpdateOtherSupplier(entry.id, 'quantity', parseFloat(e.target.value) || 0)} className="w-full text-center bg-transparent border-none outline-none" placeholder="0" />
                            </td>
                            <td className="p-1 border-r border-gray-50">
                                <input type="number" value={entry.invoiceValue || ''} onChange={e => handleUpdateOtherSupplier(entry.id, 'invoiceValue', parseFloat(e.target.value) || 0)} className="w-full text-right bg-transparent border-none outline-none font-black" placeholder="0.00" />
                            </td>
                            <td className="p-1 border-r border-gray-50">
                                <input type="number" value={entry.myStoreValue || ''} onChange={e => handleUpdateOtherSupplier(entry.id, 'myStoreValue', parseFloat(e.target.value) || 0)} className="w-full text-right bg-transparent border-none outline-none font-bold" placeholder="0.00" />
                            </td>
                            <td className="p-1 border-r border-gray-50 text-right font-black tabular-nums">
                                {formatNumber(entry.invoiceValue - entry.myStoreValue)}
                            </td>
                            <td className="p-1 border-r border-gray-50">
                                <select value={entry.managerId} onChange={e => handleUpdateOtherSupplier(entry.id, 'managerId', e.target.value)} className="w-full bg-transparent border-none outline-none font-medium truncate">
                                    <option value="">-</option>
                                    {gerentes.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                </select>
                            </td>
                            <td className="p-1 text-center print:hidden">
                                <button onClick={() => handleDeleteOtherSupplier(entry.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={14}/></button>
                            </td>
                        </tr>
                    ))}
                    {monthlyData.otherSuppliers.length === 0 && (
                        <tr><td colSpan={8} className="p-4 text-center text-gray-400 italic">Clique em "+" para adicionar lançamentos de outros fornecedores.</td></tr>
                    )}
                </tbody>
            </table>
        </div>

        {/* Resumo Mês section wrapped to avoid page break inside when printing */}
        <div className="print:break-inside-avoid">
          {/* Resumo Mês Bar */}
          <div className="bg-[#5a7d36] text-white px-4 py-2 mt-6 rounded-t-lg font-bold text-sm uppercase tracking-widest">
              Resumo Mês
          </div>

          {/* Operational Dashboard Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3 print:gap-4 border-x border-b border-gray-200 p-6 bg-white rounded-b-lg">
             {/* Coluna 1 */}
             <div className="space-y-4">
                <DataInputRow label="Vendas Mês" value={monthlyData.vendasMes} onChange={v => handleUpdateMonthlyField('vendasMes', v)} isHeader />
                <div className="space-y-1">
                   <DataDisplayRow label="Compras Comida" value={formatEuro(computedComprasComida)} />
                   <DataDisplayRow label="Compras Papel" value={formatEuro(computedComprasPapel)} />
                   <DataDisplayRow label="Compras Total Ops" value={formatEuro(computedComprasTotalOps)} />
                </div>
                <div className="space-y-1">
                   <DataDisplayRow label="Consumo Comida" value={formatEuro(computedConsumoComida)} />
                   <DataDisplayRow label="Consumo Papel" value={formatEuro(computedConsumoPapel)} />
                   <DataDisplayRow label="Consumo OPS" value={formatEuro(computedConsumoOps)} />
                </div>
             </div>

             {/* Coluna 2 */}
             <div className="space-y-4">
                <div className="space-y-1">
                  <DataInputRow label="Inv. Inicial Comida" value={monthlyData.invInicialComida} onChange={v => handleUpdateMonthlyField('invInicialComida', v)} />
                  <DataInputRow label="Inv. Inicial OPS" value={monthlyData.invInicialOps} onChange={v => handleUpdateMonthlyField('invInicialOps', v)} />
                  <DataInputRow label="Perdas Comida" value={monthlyData.perdasComida} onChange={v => handleUpdateMonthlyField('perdasComida', v)} />
                  <DataInputRow label="Refeições Comida" value={monthlyData.refeicoesComida} onChange={v => handleUpdateMonthlyField('refeicoesComida', v)} />
                  <DataInputRow label="Promo Comida" value={monthlyData.promoComida} onChange={v => handleUpdateMonthlyField('promoComida', v)} />
                </div>
                <div className="space-y-1">
                  <DataInputRow label="Inv. Final Comida" value={monthlyData.invFinalComida} onChange={v => handleUpdateMonthlyField('invFinalComida', v)} />
                  <DataInputRow label="Inv. Final Papel" value={monthlyData.invFinalPapel} onChange={v => handleUpdateMonthlyField('invFinalPapel', v)} />
                  <DataInputRow label="Inv. Final OPS" value={monthlyData.invFinalOps} onChange={v => handleUpdateMonthlyField('invFinalOps', v)} />
                  <DataDisplayRow label="Compras OPS Havi" value={formatEuro(computedComprasOpsHavi)} />
                </div>
             </div>

             {/* Coluna 3 */}
             <div className="space-y-4">
                <DataInputRow label="Inv. Inicial Papel" value={monthlyData.invInicialPapel} onChange={v => handleUpdateMonthlyField('invInicialPapel', v)} />
                <div className="space-y-1">
                  <DataInputRow label="Perdas Papel" value={monthlyData.perdasPapel} onChange={v => handleUpdateMonthlyField('perdasPapel', v)} />
                  <DataInputRow label="Refeições Papel" value={monthlyData.refeicoesPapel} onChange={v => handleUpdateMonthlyField('refeicoesPapel', v)} />
                  <DataInputRow label="Promo Papel" value={monthlyData.promoPapel} onChange={v => handleUpdateMonthlyField('promoPapel', v)} />
                </div>
                <div className="space-y-1">
                   <DataDisplayRow label="% Custo Comida" value={monthlyData.vendasMes > 0 ? formatPercent((computedConsumoComida / monthlyData.vendasMes) * 100) : '0,00%'} />
                   <DataDisplayRow label="% Custo Papel" value={monthlyData.vendasMes > 0 ? formatPercent((computedConsumoPapel / monthlyData.vendasMes) * 100) : '0,00%'} />
                   <DataDisplayRow label="% Consumo OPS" value={monthlyData.vendasMes > 0 ? formatPercent((computedConsumoOps / monthlyData.vendasMes) * 100) : '0,00%'} />
                   <DataDisplayRow label="Compras OPS MaiaPapper" value={formatEuro(computedComprasOpsMaiaPapper)} />
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DataInputRow: React.FC<{ label: string, value: number, onChange: (val: number) => void, isHeader?: boolean }> = ({ label, value, onChange, isHeader }) => {
  return (
    <div className="flex gap-1.5 items-stretch h-7">
      <div className={`bg-[#b4d493] px-3 flex items-center flex-1 rounded-sm border border-black/5`}>
        <span className={`text-[10px] font-bold tracking-tight text-gray-700 uppercase truncate`}>{label}</span>
      </div>
      <div className={`border border-gray-200 rounded-sm w-32 flex items-center justify-end font-black text-xs text-gray-700 overflow-hidden ${isHeader ? 'bg-gray-50' : 'bg-white'}`}>
        <input 
          type="number" 
          step="0.01" 
          value={value || ''} 
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-full h-full text-right px-3 bg-transparent border-none outline-none focus:ring-0 transition-colors"
          placeholder="0.00"
        />
      </div>
    </div>
  );
};

const DataDisplayRow: React.FC<{ label: string, value: string }> = ({ label, value }) => {
  return (
    <div className="flex gap-1.5 items-stretch h-7">
      <div className={`bg-[#b4d493] px-3 flex items-center flex-1 rounded-sm border border-black/5`}>
        <span className={`text-[10px] font-bold tracking-tight text-gray-700 uppercase truncate`}>{label}</span>
      </div>
      <div className={`border border-gray-200 rounded-sm w-32 flex items-center justify-end px-3 font-black text-xs text-gray-700 bg-gray-50`}>
        {value}
      </div>
    </div>
  );
};
