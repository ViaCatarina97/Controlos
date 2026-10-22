
import React, { useMemo, useState, useEffect } from 'react';
import { DeliveryRecord, CreditNoteRecord, Employee, MonthlyOperationalData, OtherSupplierEntry } from '../types';
import { getMonthlyOps, saveMonthlyOps } from '../services/firebaseService';
import { Printer, Calendar, Plus, Trash2, FileSpreadsheet, Lock, Unlock, Check, AlertTriangle, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

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
  'Manutenção Limpeza': 'E',
  'Marketing IPL': 'F',
  'Marketing Geral': 'G',
  'Produtos Frescos': 'H',
  'Manutenção & Limpeza Compras': 'I',
  'Manutenção Limpeza Compras': 'I',
  'Condimentos': 'J',
  'Condimentos Cozinha': 'L',
  'Material Adm': 'M',
  'Manuais': 'N',
  'Ferramentas Utensilios': 'O',
  'Ferramentas Utensílios': 'O',
  'Ferramentas & Utensílios': 'O',
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
      if (rec.isManualInsertion && rec.manualHaviValues) {
        const mapping: Record<string, string> = {
          'Comida': 'A',
          'Papel': 'D',
          'F. Operacionais': 'E',
          'Material Adm': 'M',
          'Happy Meal': 'F',
          'Outros': 'G'
        };
        const standardNames: Record<string, string> = {
          'A': 'Congelados',
          'D': 'Secos Papel',
          'E': 'Manutenção & Limpeza',
          'M': 'Material Adm',
          'F': 'Marketing IPL',
          'G': 'Marketing Geral'
        };
        Object.entries(rec.manualHaviValues).forEach(([cat, val]) => {
          const code = mapping[cat] || 'G';
          const desc = standardNames[code] || cat;
          if (!groups[code]) {
            groups[code] = { desc, total: 0 };
          }
          groups[code].total += (val as number) || 0;
        });
      } else {
        rec.haviGroups.forEach(g => {
          if (!groups[g.group]) {
            groups[g.group] = { desc: g.description, total: 0 };
          }
          groups[g.group].total += g.total;
        });
      }
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

  const categoryDifferences = useMemo(() => {
    const getCategoryFromGroup = (groupOrCode: string): string => {
      if (!groupOrCode) return 'Outros';
      const trimmed = groupOrCode.trim();
      if (['Comida', 'Papel', 'F. Operacionais', 'Material Adm', 'Happy Meal', 'Outros'].includes(trimmed)) {
        return trimmed;
      }
      const code = HAVI_NAME_TO_CODE[trimmed] || trimmed;
      if (['A', 'B', 'C', 'H', 'J', 'L', 'T'].includes(code)) return 'Comida';
      if (['D', 'U'].includes(code)) return 'Papel';
      if (['E', 'I', 'O'].includes(code)) return 'F. Operacionais';
      if (['M'].includes(code)) return 'Material Adm';
      if (['F'].includes(code)) return 'Happy Meal';
      if (['G', 'N', 'P', 'R', 'S'].includes(code)) return 'Outros';
      return 'Outros';
    };

    const categories = ['Comida', 'Papel', 'F. Operacionais', 'Material Adm', 'Happy Meal', 'Outros'];
    const diffs: Record<string, number> = {};

    categories.forEach(cat => {
      // 1. Calculate sum of delivery differences for this category across all days of the month
      let deliveryDiffSum = 0;
      filteredRecords.forEach(rec => {
        // Find MyStore amount for this category in the delivery
        const smsVal = rec.smsValues?.find(v => v.description === cat)?.amount || 0;

        // Find HAVI subtotal for this category in the delivery
        let haviSubtotal = 0;
        if (rec.isManualInsertion) {
          haviSubtotal = (rec.manualHaviValues || {})[cat] || 0;
        } else {
          haviSubtotal = (rec.haviGroups || [])
            .filter(g => getCategoryFromGroup(g.group || g.description) === cat)
            .reduce((s, g) => s + (g.total || 0), 0);
        }

        // Find price differences for this category in the delivery
        const priceDiffs = rec.priceDifferences || [];
        const groupPriceDiff = priceDiffs
          .filter(i => (i.category ? i.category === cat : getCategoryFromGroup(i.haviGroup || '') === cat))
          .reduce((s, i) => s + ((i.priceHavi || 0) - (i.priceSms || 0)), 0);

        // Find missing products for this category in the delivery
        const missingProducts = rec.missingProducts || [];
        const missingTotalForCat = missingProducts
          .filter(m => getCategoryFromGroup(m.group) === cat)
          .reduce((s, m) => s + (m.priceHavi || 0), 0);

        // The delivery difference for this category on this day is:
        const deliveryDiff = haviSubtotal - smsVal - groupPriceDiff - missingTotalForCat;
        deliveryDiffSum += deliveryDiff;
      });

      // 2. Adjust for credit notes of this category
      let creditHaviSum = 0;
      let creditSmsSum = 0;
      filteredCredits.forEach(c => {
        const myStoreMatch = c.myStoreGroup === cat;
        const haviCat = getCategoryFromGroup(c.haviGroup || 'Outros');
        const haviMatch = haviCat === cat;

        if (myStoreMatch) {
          creditSmsSum += c.valueMyStore ?? 0;
        }
        if (haviMatch) {
          creditHaviSum += c.valueHavi ?? c.value ?? 0;
        }
      });

      diffs[cat] = deliveryDiffSum - (creditHaviSum - creditSmsSum);
    });

    return diffs;
  }, [filteredRecords, filteredCredits]);

  const grandTotalDiff = useMemo(() => {
    return (Object.values(categoryDifferences) as number[]).reduce((s, d) => s + d, 0);
  }, [categoryDifferences]);

  const grossTotalDiff = useMemo(() => {
    return (Object.values(categoryDifferences) as number[]).reduce((s, d) => s + Math.abs(d), 0);
  }, [categoryDifferences]);

  const anomalousCategories = useMemo(() => {
    return (Object.entries(categoryDifferences) as [string, number][]).filter(
      ([, d]) => Math.abs(d) > 10
    );
  }, [categoryDifferences]);

  const unbilledSuppliers = useMemo(() => {
    return monthlyData.otherSuppliers.filter(
      s => (s.myStoreValue || 0) > 0 && (!s.invoiceValue || s.invoiceValue === 0)
    );
  }, [monthlyData.otherSuppliers]);

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

  const handleExportMonthlySummaryToExcel = () => {
    const formatValue = (val: number) => {
      return (val || 0).toFixed(2).replace('.', ',');
    };

    const formatPercentVal = (val: number) => {
      return (val || 0).toFixed(2).replace('.', ',') + '%';
    };

    const pctCustoComida = monthlyData.vendasMes > 0 ? (computedConsumoComida / monthlyData.vendasMes) * 100 : 0;
    const pctCustoPapel = monthlyData.vendasMes > 0 ? (computedConsumoPapel / monthlyData.vendasMes) * 100 : 0;
    const pctConsumoOps = monthlyData.vendasMes > 0 ? (computedConsumoOps / monthlyData.vendasMes) * 100 : 0;

    const rows = [
      ['RESUMO OPERAÇÕES / VENDAS / CONSUMOS', 'VALOR', '', 'INVENTÁRIOS INICIAIS E PERDAS', 'VALOR', '', 'INVENTÁRIO PAPEL / PROMO / CUSTOS', 'VALOR'],
      ['Vendas Mês', formatValue(monthlyData.vendasMes), '', 'Inv. Inicial Comida', formatValue(monthlyData.invInicialComida), '', 'Inv. Inicial Papel', formatValue(monthlyData.invInicialPapel)],
      ['Compras Comida', formatValue(computedComprasComida), '', 'Inv. Inicial OPS', formatValue(monthlyData.invInicialOps), '', 'Perdas Papel', formatValue(monthlyData.perdasPapel)],
      ['Compras Papel', formatValue(computedComprasPapel), '', 'Perdas Comida', formatValue(monthlyData.perdasComida), '', 'Refeições Papel', formatValue(monthlyData.refeicoesPapel)],
      ['Compras Total Ops', formatValue(computedComprasTotalOps), '', 'Refeições Comida', formatValue(monthlyData.refeicoesComida), '', 'Promo Papel', formatValue(monthlyData.promoPapel)],
      ['Consumo Comida', formatValue(computedConsumoComida), '', 'Promo Comida', formatValue(monthlyData.promoComida), '', '% Custo Comida', formatPercentVal(pctCustoComida)],
      ['Consumo Papel', formatValue(computedConsumoPapel), '', 'Inv. Final Comida', formatValue(monthlyData.invFinalComida), '', '% Custo Papel', formatPercentVal(pctCustoPapel)],
      ['Consumo OPS', formatValue(computedConsumoOps), '', 'Inv. Final Papel', formatValue(monthlyData.invFinalPapel), '', '% Consumo OPS', formatPercentVal(pctConsumoOps)],
      ['', '', '', 'Inv. Final OPS', formatValue(monthlyData.invFinalOps), '', 'Compras OPS MaiaPapper', formatValue(computedComprasOpsMaiaPapper)],
      ['', '', '', 'Compras OPS Havi', formatValue(computedComprasOpsHavi), '', '', '']
    ];

    const csvContent = [
      `Resumo Mensal de Operações - ${selectedMonth};;;;Restaurante ID: ${restaurantId};;;`,
      '',
      ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(';'))
    ].join('\r\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const filename = `Resumo_Mensal_${selectedMonth}.csv`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleToggleFinalize = async () => {
    const nextFinalized = !monthlyData.isFinalized;
    const updated = { ...monthlyData, isFinalized: nextFinalized };
    
    setMonthlyData(updated);
    localStorage.setItem(`monthly_ops_data_${selectedMonth}`, JSON.stringify(updated));
    try {
      await saveMonthlyOps(restaurantId, updated);
    } catch (err) {
      console.error("Failed to save finalized monthly ops to cloud:", err);
    }
  };

  const pctFoodCost = monthlyData.vendasMes > 0 ? (computedConsumoComida / monthlyData.vendasMes) * 100 : 0;
  const pctPaperCost = monthlyData.vendasMes > 0 ? (computedConsumoPapel / monthlyData.vendasMes) * 100 : 0;
  const pctOpsCost = monthlyData.vendasMes > 0 ? (computedConsumoOps / monthlyData.vendasMes) * 100 : 0;
  const pctCombinedCost = pctFoodCost + pctPaperCost;

  return (
    <div className="flex flex-col h-full bg-slate-50/50 animate-fade-in p-4 sm:p-6 overflow-auto space-y-6 print:bg-white print:h-auto print:overflow-visible print:p-0">
      {/* Top Action Toolbar */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm print:hidden">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block mb-1">
              Mês em análise
            </span>
            <div className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200/90 rounded-xl p-1">
              <button
                type="button"
                onClick={() => {
                  const [y, m] = selectedMonth.split('-').map(Number);
                  const d = new Date(y, (m || 1) - 2, 1);
                  setSelectedMonth(
                    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                  );
                }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-white transition-colors cursor-pointer"
                title="Mês anterior"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="px-2.5 py-1 text-xs font-bold text-slate-900 capitalize flex items-center gap-1.5 whitespace-nowrap">
                <Calendar size={13.5} className="text-amber-600 shrink-0" />
                {(() => {
                  const [y, m] = selectedMonth.split('-').map(Number);
                  const d = new Date(y, (m || 1) - 1, 1);
                  return d.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
                })()}
              </span>
              <button
                type="button"
                onClick={() => {
                  const [y, m] = selectedMonth.split('-').map(Number);
                  const d = new Date(y, m || 1, 1);
                  setSelectedMonth(
                    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                  );
                }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-white transition-colors cursor-pointer"
                title="Mês seguinte"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
          <div className="hidden sm:block pl-4 border-l border-slate-100">
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              Reconciliação HAVI vs MyStore &amp; Food Cost
            </h2>
            <p className="text-xs text-slate-500">
              Controlo cruzado de mercadorias, outros fornecedores e apuramento operacional do mês
            </p>
          </div>
        </div>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-sm"
        >
          <Printer size={15} /> Imprimir Resumo
        </button>
      </div>

      {/* NEW: Executive Reconciliation KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 print:hidden">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Total Faturação HAVI</span>
          <div className="mt-1.5 text-2xl font-extrabold text-slate-900 tabular-nums">
            {formatEuro(grandTotalHavi)}
          </div>
          <span className="text-[11px] text-slate-400">Líquido de notas de crédito</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Total Registo MyStore</span>
          <div className="mt-1.5 text-2xl font-extrabold text-slate-900 tabular-nums">
            {formatEuro(grandTotalSms)}
          </div>
          <span className="text-[11px] text-slate-400">Lançamentos na loja</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Diferença Líquida Global</span>
          <div
            className={`mt-1.5 text-2xl font-extrabold tabular-nums ${
              Math.abs(grandTotalDiff) > 5 ? 'text-rose-600' : 'text-emerald-700'
            }`}
          >
            {grandTotalDiff > 0 ? `+${formatEuro(grandTotalDiff)}` : formatEuro(grandTotalDiff)}
          </div>
          <span className="text-[11px] text-slate-400">Saldo global HAVI − MyStore</span>
        </div>

        <div
          className={`rounded-2xl p-4 border shadow-sm ${
            grossTotalDiff > 25
              ? 'bg-amber-50/80 border-amber-300'
              : 'bg-white border-slate-200/90'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-amber-900">
            <span>Desvio Absoluto Bruto (∑|Δ|)</span>
            {grossTotalDiff > 25 && <AlertTriangle size={15} className="text-amber-600" />}
          </div>
          <div className="mt-1.5 text-2xl font-extrabold text-slate-900 tabular-nums">
            {formatEuro(grossTotalDiff)}
          </div>
          <span className="text-[11px] text-amber-800">
            {grossTotalDiff > 25
              ? 'Atenção: compensação entre rubricas'
              : 'Sem desvios entre famílias'}
          </span>
        </div>
      </div>

      {/* Diagnostic Banner when offsetting errors or missing supplier invoices exist */}
      {(grossTotalDiff > 25 || unbilledSuppliers.length > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col gap-1.5 text-xs text-amber-950 print:hidden">
          <div className="font-extrabold flex items-center gap-2 text-amber-900">
            <AlertTriangle size={15} className="text-amber-600 shrink-0" />
            Diagnóstico Automático de Controlo de Gestão
          </div>
          {anomalousCategories.length > 0 && (
            <p className="text-amber-900/90 pl-6">
              • <strong>Compensação entre rubricas detetada:</strong>{' '}
              {anomalousCategories
                .map(([c, d]) => `${c} (${d > 0 ? '+' : ''}${formatEuro(d)})`)
                .join(' • ')}
              . Corrija a família no MyStore para evitar distorção nas percentagens de custo.
            </p>
          )}
          {unbilledSuppliers.length > 0 && (
            <p className="text-rose-800 pl-6">
              • <strong>Fatura em falta em Outros Fornecedores:</strong>{' '}
              {unbilledSuppliers
                .map(s => `${s.supplier} (${formatEuro(s.myStoreValue)} no MyStore sem fatura)`)
                .join(', ')}
              .
            </p>
          )}
        </div>
      )}

      {/* Executive Visual Comparison Charts (HAVI vs MyStore & Divergent Variance Map) */}
      {(grandTotalHavi > 0 || grandTotalSms > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 print:hidden">
          {/* Left: HAVI vs MyStore Grouped Bar Chart */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 size={16} className="text-amber-600" />
                  Comparação Visual por Rubrica (HAVI vs MyStore)
                </h3>
                <p className="text-xs text-slate-500">
                  Montantes mensais faturados pela HAVI face aos lançamentos registados na loja
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-3 text-[11px] font-semibold text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-slate-900" /> HAVI
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" /> MyStore
                </span>
              </div>
            </div>

            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    'Comida',
                    'Papel',
                    'F. Operacionais',
                    'Happy Meal',
                    'Outros',
                    'Material Adm',
                  ].map(cat => ({
                    rubrica: cat === 'F. Operacionais' ? 'F. Oper.' : cat,
                    HAVI: Math.round(((aggregatedSms[cat] || 0) + (categoryDifferences[cat] || 0)) * 100) / 100,
                    MyStore: Math.round((aggregatedSms[cat] || 0) * 100) / 100,
                  }))}
                  margin={{ top: 6, right: 8, left: 4, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="rubrica"
                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    width={52}
                  />
                  <Tooltip
                    formatter={(val: any, name: any) => [
                      `${Number(val).toLocaleString('pt-PT', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })} €`,
                      String(name),
                    ]}
                    contentStyle={{
                      fontSize: '12px',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 16px rgba(15,23,42,0.08)',
                    }}
                  />
                  <Bar dataKey="HAVI" fill="#0f172a" radius={[6, 6, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="MyStore" fill="#fbbf24" radius={[6, 6, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right: Zero-Centered Divergent Variance Bars */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Mapa de Compensações entre Famílias (Δ €)
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                Barras opostas revelam trocas de rubrica no lançamento MyStore
              </p>

              <div className="space-y-2.5">
                {(() => {
                  const cats = [
                    'Comida',
                    'Papel',
                    'F. Operacionais',
                    'Material Adm',
                    'Happy Meal',
                    'Outros',
                  ];
                  const maxAbs = Math.max(
                    10,
                    ...cats.map(c => Math.abs(categoryDifferences[c] || 0))
                  );
                  return cats.map(cat => {
                    const d = categoryDifferences[cat] || 0;
                    const pct = Math.min(48, (Math.abs(d) / maxAbs) * 48);
                    const isAlert = Math.abs(d) > 5;
                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex items-center justify-between text-xs tabular-nums">
                          <span className="font-semibold text-slate-700">{cat}</span>
                          <span
                            className={`font-bold ${
                              isAlert
                                ? d > 0
                                  ? 'text-amber-700'
                                  : 'text-rose-600'
                                : 'text-emerald-700'
                            }`}
                          >
                            {d > 0 ? `+${formatEuro(d)}` : formatEuro(d)}
                          </span>
                        </div>
                        <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-300 z-10" />
                          {Math.abs(d) > 0.02 && (
                            <div
                              className={`absolute top-0 bottom-0 rounded-full ${
                                !isAlert
                                  ? 'bg-emerald-500'
                                  : d > 0
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                              style={
                                d >= 0
                                  ? { left: '50%', width: `${Math.max(2, pct)}%` }
                                  : { right: '50%', width: `${Math.max(2, pct)}%` }
                              }
                            />
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable & Responsive Sheet Container */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-7 shadow-sm flex flex-col space-y-6 print:w-full print:p-0 print:border-none print:shadow-none">
        {/* Sheet Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-slate-900 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 font-black flex items-center justify-center text-base">
              M
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 uppercase tracking-tight">
                Resumo de Controlo de Faturação
              </h1>
              <p className="text-xs text-slate-500">Conferência Mensal de Mercadorias &amp; Consumos</p>
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-800 tracking-tight uppercase">
            {formatMonthHeader(selectedMonth)}
          </div>
        </div>

        {/* Main 3-Column Comparison Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 print:grid-cols-12">
          {/* Col 1: HAVI */}
          <div className="lg:col-span-5 flex flex-col rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white py-2.5 px-4 font-bold uppercase text-xs tracking-wider flex justify-between">
              <span>Faturação HAVI</span>
              <span className="text-slate-400">Por Grupo</span>
            </div>
            <div className="grid grid-cols-12 text-[10px] font-bold uppercase text-slate-400 bg-slate-50 border-b border-slate-200">
              <div className="col-span-2 px-3 py-2">Grp</div>
              <div className="col-span-6 px-3 py-2">Descrição</div>
              <div className="col-span-4 px-3 py-2 text-right">Total</div>
            </div>
            <div className="flex flex-col bg-white divide-y divide-slate-100">
              {(Object.entries(aggregatedHavi) as [string, { desc: string; total: number }][]).map(
                ([code, g]) => (
                  <div
                    key={code}
                    className="grid grid-cols-12 text-xs font-medium hover:bg-slate-50 py-1.5"
                  >
                    <div className="col-span-2 px-3 font-bold text-slate-500">{code}</div>
                    <div className="col-span-6 px-3 text-slate-800 truncate">{g.desc}</div>
                    <div className="col-span-4 px-3 text-right font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                      {formatEuro(g.total)}
                    </div>
                  </div>
                )
              )}
            </div>
            <div className="mt-auto bg-slate-50 px-4 py-3 text-right border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-500">Total HAVI</span>
              <div className="text-lg font-extrabold text-slate-900 tabular-nums">
                {formatEuro(grandTotalHavi)}
              </div>
            </div>
          </div>

          {/* Col 2: MyStore */}
          <div className="lg:col-span-3 flex flex-col rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-800 text-white py-2.5 px-4 font-bold uppercase text-xs tracking-wider">
              Registo MyStore
            </div>
            <div className="grid grid-cols-12 text-[10px] font-bold uppercase text-slate-400 bg-slate-50 border-b border-slate-200">
              <div className="col-span-7 px-3 py-2">Família</div>
              <div className="col-span-5 px-3 py-2 text-right">Total</div>
            </div>
            <div className="flex flex-col bg-white divide-y divide-slate-100 h-full">
              {(Object.entries(aggregatedSms) as [string, number][]).map(([desc, val]) => (
                <div
                  key={desc}
                  className="grid grid-cols-12 text-xs font-medium hover:bg-slate-50 py-2"
                >
                  <div className="col-span-7 px-3 font-semibold text-slate-800 truncate">{desc}</div>
                  <div className="col-span-5 px-3 text-right font-bold text-slate-900 tabular-nums whitespace-nowrap">
                    {formatEuro(val)}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-auto bg-slate-50 px-4 py-3 text-right border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-500">Total</span>
              <div className="text-lg font-extrabold text-slate-900 tabular-nums">
                {formatEuro(grandTotalSms)}
              </div>
            </div>
          </div>

          {/* Col 3: Diferença por Rubrica */}
          <div className="lg:col-span-4 flex flex-col rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-amber-400 py-2.5 px-4 font-bold uppercase text-xs tracking-wider">
              Diferença por Rubrica
            </div>
            <div className="grid grid-cols-12 text-[10px] font-bold uppercase text-slate-400 bg-slate-50 border-b border-slate-200">
              <div className="col-span-7 px-3 py-2">Rubrica</div>
              <div className="col-span-5 px-3 py-2 text-right">Desvio</div>
            </div>
            <div className="flex flex-col bg-white divide-y divide-slate-100">
              {(Object.entries(categoryDifferences) as [string, number][]).map(([desc, diff]) => {
                const isMajor = Math.abs(diff) > 10;
                const isMinor = Math.abs(diff) > 0.1;
                return (
                  <div
                    key={desc}
                    className={`grid grid-cols-12 text-xs py-2 items-center ${
                      isMajor ? 'bg-amber-50/60' : ''
                    }`}
                  >
                    <div className="col-span-7 px-3 font-semibold text-slate-800">{desc}</div>
                    <div className="col-span-5 px-3 text-right tabular-nums whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full font-bold text-[11px] ${
                          isMajor
                            ? 'bg-rose-100 text-rose-700'
                            : isMinor
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        {diff > 0 ? `+${formatEuro(diff)}` : formatEuro(diff)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-auto bg-slate-50 px-4 py-3 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-500">Saldo Líquido</span>
              <div
                className={`text-lg font-extrabold tabular-nums ${
                  Math.abs(grandTotalDiff) > 5 ? 'text-rose-600' : 'text-emerald-700'
                }`}
              >
                {grandTotalDiff > 0 ? `+${formatEuro(grandTotalDiff)}` : formatEuro(grandTotalDiff)}
              </div>
            </div>
          </div>
        </div>

        {/* Outros Fornecedores */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-900 text-white px-4 py-2.5 flex justify-between items-center">
            <span className="font-bold text-xs uppercase tracking-wider">
              Outros Fornecedores Diretos (Air Liquide / MaiaPapper)
            </span>
            <div className="flex items-center gap-2 print:hidden">
              {!monthlyData.isFinalized && (
                <button
                  onClick={handleAddOtherSupplier}
                  className="inline-flex items-center gap-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs px-2.5 py-1 rounded-lg transition-colors"
                  title="Adicionar fornecedor"
                >
                  <Plus size={14} /> Adicionar Linha
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-[11px] uppercase">
                <tr>
                  <th className="px-3 py-2 text-left">Fornecedor</th>
                  <th className="px-3 py-2 text-left">Data</th>
                  <th className="px-3 py-2 text-center">Qtd</th>
                  <th className="px-3 py-2 text-right">Fatura (€)</th>
                  <th className="px-3 py-2 text-right">MyStore (€)</th>
                  <th className="px-3 py-2 text-right">Diferença (€)</th>
                  <th className="px-3 py-2 text-left">Gerente</th>
                  <th className="px-3 py-2 text-center print:hidden w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlyData.otherSuppliers.map(entry => {
                  const rowDiff = (entry.invoiceValue || 0) - (entry.myStoreValue || 0);
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/80 group">
                      <td className="p-2">
                        <select
                          value={entry.supplier}
                          onChange={e =>
                            handleUpdateOtherSupplier(entry.id, 'supplier', e.target.value)
                          }
                          disabled={monthlyData.isFinalized}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-semibold text-slate-800 disabled:opacity-75"
                        >
                          <option value="Air Liquide">Air Liquide</option>
                          <option value="MaiaPapper">MaiaPapper</option>
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          type="date"
                          value={entry.date}
                          onChange={e =>
                            handleUpdateOtherSupplier(entry.id, 'date', e.target.value)
                          }
                          disabled={monthlyData.isFinalized}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-800 disabled:opacity-75"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={entry.quantity || ''}
                          onChange={e =>
                            handleUpdateOtherSupplier(
                              entry.id,
                              'quantity',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          disabled={monthlyData.isFinalized}
                          className="w-20 text-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 tabular-nums disabled:opacity-75"
                          placeholder="0"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={entry.invoiceValue || ''}
                          onChange={e =>
                            handleUpdateOtherSupplier(
                              entry.id,
                              'invoiceValue',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          disabled={monthlyData.isFinalized}
                          className="w-28 text-right bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-bold tabular-nums disabled:opacity-75"
                          placeholder="0,00"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={entry.myStoreValue || ''}
                          onChange={e =>
                            handleUpdateOtherSupplier(
                              entry.id,
                              'myStoreValue',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          disabled={monthlyData.isFinalized}
                          className="w-28 text-right bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-bold tabular-nums disabled:opacity-75"
                          placeholder="0,00"
                        />
                      </td>
                      <td
                        className={`p-2 text-right font-extrabold tabular-nums ${
                          Math.abs(rowDiff) > 0.1 ? 'text-rose-600' : 'text-emerald-700'
                        }`}
                      >
                        {formatNumber(rowDiff)} €
                      </td>
                      <td className="p-2">
                        <select
                          value={entry.managerId}
                          onChange={e =>
                            handleUpdateOtherSupplier(entry.id, 'managerId', e.target.value)
                          }
                          disabled={monthlyData.isFinalized}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-medium disabled:opacity-75"
                        >
                          <option value="">— Selecionar —</option>
                          {gerentes.map(g => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2 text-center print:hidden">
                        {!monthlyData.isFinalized && (
                          <button
                            onClick={() => handleDeleteOtherSupplier(entry.id)}
                            className="p-1 text-slate-300 hover:text-rose-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {monthlyData.otherSuppliers.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-5 text-center text-slate-400">
                      Sem lançamentos diretos neste mês. Clique em &quot;Adicionar Linha&quot; para registar Air Liquide ou MaiaPapper.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Resumo Mês & Apuramento P&L */}
        <div className="print:break-inside-avoid rounded-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-900 text-white px-4 py-3 flex flex-wrap justify-between items-center gap-3">
            <div className="flex items-center gap-3">
              <span className="font-bold text-xs uppercase tracking-wider">
                Apuramento Mensal de Consumos, Inventários &amp; Food Cost
              </span>
              {monthlyData.isFinalized && (
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 border border-emerald-400/30">
                  <Check size={11} /> Fechado
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 print:hidden">
              <button
                onClick={handleExportMonthlySummaryToExcel}
                title="Exportar para Excel"
                id="btn-export-excel-resumo-mes"
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all"
              >
                <FileSpreadsheet size={14} />
                <span>Exportar CSV/Excel</span>
              </button>
              <button
                onClick={handleToggleFinalize}
                id="btn-submeter-resumo-mes"
                className={`text-xs font-bold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  monthlyData.isFinalized
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    : 'bg-white text-slate-900 hover:bg-slate-100'
                }`}
              >
                {monthlyData.isFinalized ? (
                  <>
                    <Unlock size={14} />
                    <span>Reabrir Mês</span>
                  </>
                ) : (
                  <>
                    <Lock size={14} />
                    <span>Gravar &amp; Fechar Mês</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Highlighted Ratio Cards Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 border-b border-slate-200">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80">
              <span className="text-[11px] font-medium text-slate-500">% Custo Comida</span>
              <div className="text-xl font-extrabold text-slate-900 tabular-nums mt-0.5">
                {formatPercent(pctFoodCost)}
              </div>
              <span className="text-[11px] text-slate-400 tabular-nums">
                {formatEuro(computedConsumoComida)}
              </span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80">
              <span className="text-[11px] font-medium text-slate-500">% Custo Papel</span>
              <div className="text-xl font-extrabold text-slate-900 tabular-nums mt-0.5">
                {formatPercent(pctPaperCost)}
              </div>
              <span className="text-[11px] text-slate-400 tabular-nums">
                {formatEuro(computedConsumoPapel)}
              </span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80">
              <span className="text-[11px] font-medium text-slate-500">Food &amp; Paper Total</span>
              <div className="text-xl font-extrabold text-amber-700 tabular-nums mt-0.5">
                {formatPercent(pctCombinedCost)}
              </div>
              <span className="text-[11px] text-slate-400 tabular-nums">
                {formatEuro(computedConsumoComida + computedConsumoPapel)}
              </span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80">
              <span className="text-[11px] font-medium text-slate-500">% Consumo OPS</span>
              <div className="text-xl font-extrabold text-slate-900 tabular-nums mt-0.5">
                {formatPercent(pctOpsCost)}
              </div>
              <span className="text-[11px] text-slate-400 tabular-nums">
                {formatEuro(computedConsumoOps)}
              </span>
            </div>
          </div>

          {/* 3-Column Operational Inputs & Computed Outputs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3 print:gap-4 p-5 sm:p-6 bg-white">
            {/* Coluna 1 */}
            <div className="space-y-4">
              <DataInputRow
                label="Vendas Líquidas Mês (€)"
                value={monthlyData.vendasMes}
                onChange={v => handleUpdateMonthlyField('vendasMes', v)}
                isHeader
                disabled={monthlyData.isFinalized}
              />
              <div className="space-y-1.5">
                <DataDisplayRow label="Compras Comida" value={formatEuro(computedComprasComida)} />
                <DataDisplayRow label="Compras Papel" value={formatEuro(computedComprasPapel)} />
                <DataDisplayRow label="Compras Total OPS" value={formatEuro(computedComprasTotalOps)} />
              </div>
              <div className="space-y-1.5">
                <DataDisplayRow label="Consumo Comida" value={formatEuro(computedConsumoComida)} />
                <DataDisplayRow label="Consumo Papel" value={formatEuro(computedConsumoPapel)} />
                <DataDisplayRow label="Consumo OPS" value={formatEuro(computedConsumoOps)} />
              </div>
            </div>

            {/* Coluna 2 */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <DataInputRow
                  label="Inv. Inicial Comida"
                  value={monthlyData.invInicialComida}
                  onChange={v => handleUpdateMonthlyField('invInicialComida', v)}
                  disabled={monthlyData.isFinalized}
                />
                <DataInputRow
                  label="Inv. Inicial OPS"
                  value={monthlyData.invInicialOps}
                  onChange={v => handleUpdateMonthlyField('invInicialOps', v)}
                  disabled={monthlyData.isFinalized}
                />
                <DataInputRow
                  label="Perdas / Quebras Comida"
                  value={monthlyData.perdasComida}
                  onChange={v => handleUpdateMonthlyField('perdasComida', v)}
                  disabled={monthlyData.isFinalized}
                />
                <DataInputRow
                  label="Refeições Equipa Comida"
                  value={monthlyData.refeicoesComida}
                  onChange={v => handleUpdateMonthlyField('refeicoesComida', v)}
                  disabled={monthlyData.isFinalized}
                />
                <DataInputRow
                  label="Promoções Comida"
                  value={monthlyData.promoComida}
                  onChange={v => handleUpdateMonthlyField('promoComida', v)}
                  disabled={monthlyData.isFinalized}
                />
              </div>
              <div className="space-y-1.5">
                <DataInputRow
                  label="Inv. Final Comida"
                  value={monthlyData.invFinalComida}
                  onChange={v => handleUpdateMonthlyField('invFinalComida', v)}
                  disabled={monthlyData.isFinalized}
                />
                <DataInputRow
                  label="Inv. Final Papel"
                  value={monthlyData.invFinalPapel}
                  onChange={v => handleUpdateMonthlyField('invFinalPapel', v)}
                  disabled={monthlyData.isFinalized}
                />
                <DataInputRow
                  label="Inv. Final OPS"
                  value={monthlyData.invFinalOps}
                  onChange={v => handleUpdateMonthlyField('invFinalOps', v)}
                  disabled={monthlyData.isFinalized}
                />
                <DataDisplayRow label="Compras OPS HAVI" value={formatEuro(computedComprasOpsHavi)} />
              </div>
            </div>

            {/* Coluna 3 */}
            <div className="space-y-4">
              <DataInputRow
                label="Inv. Inicial Papel"
                value={monthlyData.invInicialPapel}
                onChange={v => handleUpdateMonthlyField('invInicialPapel', v)}
                disabled={monthlyData.isFinalized}
              />
              <div className="space-y-1.5">
                <DataInputRow
                  label="Perdas / Quebras Papel"
                  value={monthlyData.perdasPapel}
                  onChange={v => handleUpdateMonthlyField('perdasPapel', v)}
                  disabled={monthlyData.isFinalized}
                />
                <DataInputRow
                  label="Refeições Papel"
                  value={monthlyData.refeicoesPapel}
                  onChange={v => handleUpdateMonthlyField('refeicoesPapel', v)}
                  disabled={monthlyData.isFinalized}
                />
                <DataInputRow
                  label="Promoções Papel"
                  value={monthlyData.promoPapel}
                  onChange={v => handleUpdateMonthlyField('promoPapel', v)}
                  disabled={monthlyData.isFinalized}
                />
              </div>
              <div className="space-y-1.5">
                <DataDisplayRow
                  label="% Custo Comida"
                  value={formatPercent(pctFoodCost)}
                />
                <DataDisplayRow
                  label="% Custo Papel"
                  value={formatPercent(pctPaperCost)}
                />
                <DataDisplayRow
                  label="% Consumo OPS"
                  value={formatPercent(pctOpsCost)}
                />
                <DataDisplayRow
                  label="Compras OPS MaiaPapper"
                  value={formatEuro(computedComprasOpsMaiaPapper)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DataInputRow: React.FC<{
  label: string;
  value: number;
  onChange: (val: number) => void;
  isHeader?: boolean;
  disabled?: boolean;
}> = ({ label, value, onChange, isHeader, disabled }) => {
  return (
    <div className="flex gap-2 items-stretch h-8">
      <div
        className={`px-3 flex items-center flex-1 rounded-lg border ${
          isHeader
            ? 'bg-slate-900 text-white border-slate-900'
            : 'bg-slate-100/90 text-slate-700 border-slate-200/70'
        }`}
      >
        <span className="text-[11px] font-semibold tracking-tight truncate">{label}</span>
      </div>
      <div
        className={`border rounded-lg w-36 flex items-center justify-end font-bold text-xs tabular-nums overflow-hidden ${
          disabled
            ? 'bg-slate-100 text-slate-400 border-slate-200'
            : isHeader
            ? 'bg-amber-50 border-amber-300 text-slate-950'
            : 'bg-white border-slate-200 text-slate-900 focus-within:border-slate-900'
        }`}
      >
        <input
          type="number"
          step="0.01"
          value={value || ''}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          disabled={disabled}
          className="w-full h-full text-right px-3 bg-transparent border-none outline-none focus:ring-0 transition-colors disabled:cursor-not-allowed tabular-nums"
          placeholder="0,00"
        />
      </div>
    </div>
  );
};

const DataDisplayRow: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  return (
    <div className="flex gap-2 items-stretch h-8">
      <div className="bg-slate-50 px-3 flex items-center flex-1 rounded-lg border border-slate-200/70">
        <span className="text-[11px] font-semibold tracking-tight text-slate-600 truncate">
          {label}
        </span>
      </div>
      <div className="border border-slate-200/80 rounded-lg w-36 flex items-center justify-end px-3 font-extrabold text-xs text-slate-900 bg-slate-100/70 tabular-nums whitespace-nowrap">
        {value}
      </div>
    </div>
  );
};
