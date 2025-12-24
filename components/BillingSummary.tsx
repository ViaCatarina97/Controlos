
import React, { useMemo, useState } from 'react';
import { DeliveryRecord } from '../types';
import { Printer, Filter, Calendar, ChevronDown } from 'lucide-react';

interface BillingSummaryProps {
  deliveries: DeliveryRecord[];
}

export const BillingSummary: React.FC<BillingSummaryProps> = ({ deliveries }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const filteredRecords = useMemo(() => {
    return deliveries.filter(d => d.date.startsWith(selectedMonth));
  }, [deliveries, selectedMonth]);

  // Aggregations
  // Explicitly type the groups record to avoid 'unknown' inference and fixed the property access
  const aggregatedHavi = useMemo<Record<string, { desc: string, total: number }>>(() => {
    const groups: Record<string, { desc: string, total: number }> = {};
    filteredRecords.forEach(rec => {
      rec.haviGroups.forEach(g => {
        if (!groups[g.group]) {
          groups[g.group] = { desc: g.description, total: 0 };
        }
        // Use non-null assertion or local variable to ensure type safety
        const group = groups[g.group]!;
        group.total += g.total;
      });
    });
    return groups;
  }, [filteredRecords]);

  const totalPontoVerde = useMemo(() => filteredRecords.reduce((s, r) => s + r.pontoVerde, 0), [filteredRecords]);
  
  // Cast Object.values to specific type to fix 'unknown' arithmetic error
  const grandTotalHavi = useMemo(() => 
    (Object.values(aggregatedHavi) as { desc: string, total: number }[]).reduce((s, g) => s + g.total, 0) + totalPontoVerde, 
    [aggregatedHavi, totalPontoVerde]
  );

  const aggregatedSms = useMemo<Record<string, number>>(() => {
    const sms: Record<string, number> = {};
    filteredRecords.forEach(rec => {
      rec.smsValues.forEach(v => {
        sms[v.description] = (sms[v.description] || 0) + v.amount;
      });
    });
    return sms;
  }, [filteredRecords]);

  // Cast Object.values to number[] to ensure grandTotalSms is a number
  const grandTotalSms = useMemo(() => 
    (Object.values(aggregatedSms) as number[]).reduce((s, a) => s + a, 0), 
    [aggregatedSms]
  );

  const priceDiffsComida = useMemo(() => {
    return filteredRecords.reduce((s, r) => s + r.priceDifferences
      .filter(d => ['Comida', 'H.M.'].includes(d.category))
      .reduce((curr, d) => curr + (d.priceHavi - d.priceSms), 0), 0);
  }, [filteredRecords]);

  const priceDiffsPapel = useMemo(() => {
    return filteredRecords.reduce((s, r) => s + r.priceDifferences
      .filter(d => d.category === 'Papel')
      .reduce((curr, d) => curr + (d.priceHavi - d.priceSms), 0), 0);
  }, [filteredRecords]);

  const missingComida = useMemo(() => {
    return filteredRecords.reduce((s, r) => s + r.missingProducts
      .filter(p => ['Comida', 'Happy Meal'].includes(p.group))
      .reduce((curr, p) => curr + p.priceHavi, 0), 0);
  }, [filteredRecords]);

  const missingPapel = useMemo(() => {
    return filteredRecords.reduce((s, r) => s + r.missingProducts
      .filter(p => p.group === 'Papel')
      .reduce((curr, p) => curr + p.priceHavi, 0), 0);
  }, [filteredRecords]);

  const formatMonthHeader = (monthStr: string) => {
    const [y, m] = monthStr.split('-');
    const months = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
    return `${months[parseInt(m) - 1]}/${y.slice(2)}`;
  };

  return (
    <div className="flex flex-col h-full bg-white animate-fade-in p-4 overflow-auto custom-scrollbar">
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
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase text-gray-400 mb-1">Registos Encontrados</span>
            <div className="py-2 px-3 bg-emerald-50 border border-emerald-100 rounded-lg text-sm font-bold text-emerald-700">
              {filteredRecords.length} faturas
            </div>
          </div>
        </div>
        <button onClick={() => window.print()} className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2 rounded-lg font-bold hover:bg-slate-800 transition-all">
          <Printer size={18} /> Imprimir Relatório
        </button>
      </div>

      {/* PDF Simulation Start */}
      <div className="bg-white border-2 border-slate-100 p-8 shadow-sm flex flex-col space-y-6 min-w-[1000px] print:p-0 print:border-none print:shadow-none">
        
        {/* Header Section */}
        <div className="flex items-center justify-between border-b-4 border-[#5a7d36] pb-2">
          <div className="bg-[#5a7d36] text-white px-12 py-3 rounded-r-full">
            <h1 className="text-3xl font-black uppercase tracking-tighter">Resumo Controlo de Facturação</h1>
          </div>
          <div className="flex items-center gap-8">
            <div className="w-16 h-16 flex items-center justify-center">
               <svg viewBox="0 0 24 24" className="w-full h-full text-yellow-500 fill-current"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/><path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/></svg>
            </div>
            <div className="text-4xl font-black text-gray-300 tracking-widest uppercase">
              {formatMonthHeader(selectedMonth)}
            </div>
          </div>
        </div>

        {/* Main Grid: Havi / SMS / Diferença */}
        <div className="grid grid-cols-12 gap-6">
          
          {/* Section 1: Factura Havi */}
          <div className="col-span-5 flex flex-col border border-gray-200">
            <div className="bg-gray-50 py-2 text-center font-black uppercase text-xs tracking-widest border-b border-gray-200">Factura Havi</div>
            <div className="grid grid-cols-12 text-[10px] font-black uppercase text-gray-400 bg-white border-b border-gray-100">
              <div className="col-span-2 px-2 py-1 border-r border-gray-50">Grupo</div>
              <div className="col-span-7 px-2 py-1 border-r border-gray-50">Descrição</div>
              <div className="col-span-3 px-2 py-1 text-right">Total</div>
            </div>
            <div className="flex flex-col bg-white">
              {Object.entries(aggregatedHavi).map(([code, g]) => (
                <div key={code} className="grid grid-cols-12 text-[11px] font-bold border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <div className="col-span-2 px-2 py-0.5 border-r border-gray-50">{code}</div>
                  <div className="col-span-7 px-2 py-0.5 border-r border-gray-50 truncate">{g.desc}</div>
                  <div className="col-span-3 px-2 py-0.5 text-right tabular-nums">{g.total.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €</div>
                </div>
              ))}
              <div className="grid grid-cols-12 text-[11px] font-bold border-t border-gray-200 bg-gray-50">
                <div className="col-span-9 px-2 py-1 flex items-center gap-2">
                   <div className="w-5 h-5 bg-emerald-500 rounded-full"></div> Contribuição Ponto Verde
                </div>
                <div className="col-span-3 px-2 py-1 text-right">{totalPontoVerde.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €</div>
              </div>
            </div>
            <div className="mt-auto bg-white p-3 text-right border-t-2 border-gray-200">
              <div className="text-2xl font-black text-slate-900">{grandTotalHavi.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €</div>
            </div>
          </div>

          {/* Section 2: SMS */}
          <div className="col-span-3 flex flex-col border border-gray-200">
            <div className="bg-gray-50 py-2 text-center font-black uppercase text-xs tracking-widest border-b border-gray-200">SMS</div>
            <div className="grid grid-cols-12 text-[10px] font-black uppercase text-gray-400 bg-white border-b border-gray-100">
              <div className="col-span-8 px-2 py-1 border-r border-gray-50">Descrição</div>
              <div className="col-span-4 px-2 py-1 text-right">Montante</div>
            </div>
            <div className="flex flex-col bg-white h-full">
              {Object.entries(aggregatedSms).map(([desc, val]) => (
                <div key={desc} className="grid grid-cols-12 text-[11px] font-bold border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <div className="col-span-8 px-2 py-1 border-r border-gray-50">{desc}</div>
                  <div className="col-span-4 px-2 py-1 text-right tabular-nums">{val.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €</div>
                </div>
              ))}
              <div className="p-3 mt-12 text-center bg-gray-50 border-y border-gray-100">
                <div className="text-xl font-black text-slate-900">{grandTotalSms.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €</div>
              </div>
            </div>
            <div className="mt-auto bg-white p-3 text-right border-t-2 border-gray-200">
              <div className="text-2xl font-black text-slate-900">{grandTotalSms.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €</div>
            </div>
          </div>

          {/* Section 3: Diferença & Side Boxes */}
          <div className="col-span-4 flex flex-col space-y-4">
            <div className="border border-gray-200 flex flex-col">
              <div className="bg-gray-50 py-2 text-center font-black uppercase text-xs tracking-widest border-b border-gray-200">Diferença</div>
              <div className="grid grid-cols-12 text-[10px] font-black uppercase text-gray-400 bg-white border-b border-gray-100">
                <div className="col-span-8 px-2 py-1 border-r border-gray-50">Descrição</div>
                <div className="col-span-4 px-2 py-1 text-right">Montante</div>
              </div>
              <div className="flex flex-col bg-white">
                 {Object.entries(aggregatedSms).map(([desc, smsVal]) => {
                   // Calc Havi Group logic
                   let haviMatch = 0;
                   if (desc === 'Comida') haviMatch = ['A','B','C','H','J','L','T'].reduce((s, c) => s + (aggregatedHavi[c]?.total || 0), 0);
                   else if (desc === 'Papel') haviMatch = ['D','U'].reduce((s, c) => s + (aggregatedHavi[c]?.total || 0), 0);
                   else if (desc === 'F. Operacionais') haviMatch = (aggregatedHavi['E']?.total || 0) + (aggregatedHavi['I']?.total || 0) + (aggregatedHavi['O']?.total || 0);
                   else if (desc === 'Material Adm') haviMatch = (aggregatedHavi['M']?.total || 0);
                   else if (desc === 'Happy Meal') haviMatch = (aggregatedHavi['F']?.total || 0);
                   else if (desc === 'Outros') haviMatch = (aggregatedHavi['G']?.total || 0) + (aggregatedHavi['N']?.total || 0) + (aggregatedHavi['P']?.total || 0) + (aggregatedHavi['R']?.total || 0) + (aggregatedHavi['S']?.total || 0);

                   // Explicitly cast smsVal to number to fix arithmetic and logic error
                   const diff = haviMatch - (smsVal as number);

                   return (
                    <div key={desc} className="grid grid-cols-12 text-[11px] font-bold border-b border-gray-50 last:border-0">
                      <div className="col-span-8 px-2 py-1 border-r border-gray-50">{desc}</div>
                      <div className={`col-span-4 px-2 py-1 text-right tabular-nums ${Math.abs(diff) > 0.05 ? 'text-red-500' : 'text-gray-400'}`}>
                        {diff.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                      </div>
                    </div>
                   );
                 })}
              </div>
            </div>

            {/* Boxes */}
            <div className="grid grid-cols-1 gap-2">
              <SummaryBox title="Total Diferenças de Preço Comida" value={priceDiffsComida} />
              <SummaryBox title="Total Diferenças de Preço Papel" value={priceDiffsPapel} />
              <SummaryBox title="Produto Não Introduzido Comida" value={missingComida} />
              <SummaryBox title="Produto Não Introduzido Papel" value={missingPapel} />
            </div>
          </div>

        </div>

        {/* Factura Ar Líquido / MaiaPapper */}
        <div className="grid grid-cols-3 gap-6">
           <SubReportSection title="Factura Ar Líquido" />
           <SubReportSection title="Bens Recebidos" />
           <SubReportSection title="Diferença" isLast />
        </div>

        <div className="grid grid-cols-3 gap-6">
           <SubReportSection title="Factura MaiaPapper" isCustom />
           <SubReportSection title="Bens Recebidos" />
           <SubReportSection title="Diferença" isLast />
        </div>

        {/* Bottom Operational Dashboard */}
        <div className="grid grid-cols-3 gap-6 border-t-2 border-gray-100 pt-6">
           
           {/* Col 1 */}
           <div className="space-y-1.5">
              <DataRow label="Vendas Mês" value={215137.97} isHeader />
              <div className="mt-4 space-y-1">
                 <DataRow label="Compras Comida" value={65991.92} color="bg-[#5a7d36]" />
                 <DataRow label="Compras Papel" value={6585.11} color="bg-[#5a7d36]" />
                 <DataRow label="Compras Total Ops" value={2965.41} color="bg-[#5a7d36]" />
              </div>
              <div className="mt-4 space-y-1">
                 <DataRow label="Consumo Comida" value={57259.33} color="bg-[#b4d493]" />
                 <DataRow label="Consumo Papel" value={5786.06} color="bg-[#b4d493]" />
                 <DataRow label="Consumo OPS" value={2680.21} color="bg-[#b4d493]" />
              </div>
           </div>

           {/* Col 2 */}
           <div className="space-y-1">
              <DataRow label="Inv. Inicial Comida" value={11738.09} color="bg-[#b4d493]" />
              <DataRow label="Inv. Inicial OPS" value={6407.20} color="bg-[#b4d493]" />
              <DataRow label="Perdas Comida" value={1072.07} color="bg-[#b4d493]" />
              <DataRow label="Refeições Comida" value={2409.42} color="bg-[#b4d493]" />
              <DataRow label="Promo Comida" value={1645.46} color="bg-[#b4d493]" />
              <div className="pt-2 space-y-1">
                <DataRow label="Inv. Final Comida" value={15343.73} color="bg-[#b4d493]" />
                <DataRow label="Inv. Final Papel" value={4556.14} color="bg-[#b4d493]" />
                <DataRow label="Inv. Final OPS" value={6692.40} color="bg-[#b4d493]" />
                <DataRow label="Compras OPS Havi" value={2259.59} color="bg-[#b4d493]" />
              </div>
           </div>

           {/* Col 3 */}
           <div className="space-y-1">
              <DataRow label="Inv. Inicial Papel" value={4029.76} color="bg-[#b4d493]" />
              <div className="pt-2 space-y-1">
                 <DataRow label="Perdas Papel" value={15.63} color="bg-[#b4d493]" />
                 <DataRow label="Refeições Papel" value={154.23} color="bg-[#b4d493]" />
                 <DataRow label="Promo Papel" value={102.81} color="bg-[#b4d493]" />
              </div>
              <div className="pt-4 space-y-1">
                 <DataRow label="% Custo Comida" value="26,62%" color="bg-[#b4d493]" isPercentage />
                 <DataRow label="% Custo Papel" value="2,69%" color="bg-[#b4d493]" isPercentage />
                 <DataRow label="% Custo OPS" value="1,25%" color="bg-[#b4d493]" isPercentage />
                 <DataRow label="Compras OPS MaiaPapper" value={450.00} color="bg-[#b4d493]" />
              </div>
           </div>

        </div>
      </div>
    </div>
  );
};

const SummaryBox: React.FC<{ title: string, value: number }> = ({ title, value }) => (
  <div className="border border-[#b4d493] rounded-sm overflow-hidden flex flex-col items-center">
    <div className="bg-[#b4d493] w-full py-1 text-[9px] font-black uppercase text-center text-gray-700 tracking-tighter">
      {title}
    </div>
    <div className="bg-white w-full py-2 text-center text-sm font-bold text-gray-500 tabular-nums">
      {value.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
    </div>
  </div>
);

const SubReportSection: React.FC<{ title: string, isLast?: boolean, isCustom?: boolean }> = ({ title, isLast, isCustom }) => (
  <div className="flex flex-col border border-gray-200">
    <div className={`bg-gray-50 py-1.5 text-center font-bold text-[13px] text-gray-600 border-b border-gray-200 flex items-center justify-center gap-2`}>
      {title} {isCustom && <span className="text-[10px] text-gray-400 font-normal">(450,00€)</span>}
    </div>
    <div className="grid grid-cols-2 text-[9px] font-black uppercase text-gray-400 border-b border-gray-100">
      <div className="px-2 py-1 border-r border-gray-50">Data</div>
      <div className="px-2 py-1 text-right">Total</div>
    </div>
    <div className="h-12 bg-white flex flex-col divide-y divide-gray-50">
       <div className="grid grid-cols-2 h-6">
          <div className="border-r border-gray-50"></div>
          <div></div>
       </div>
       <div className="grid grid-cols-2 h-6">
          <div className="border-r border-gray-50"></div>
          <div></div>
       </div>
    </div>
  </div>
);

const DataRow: React.FC<{ label: string, value: number | string, color?: string, isHeader?: boolean, isPercentage?: boolean }> = ({ label, value, color, isHeader, isPercentage }) => {
  const formattedValue = typeof value === 'number' ? value.toLocaleString('pt-PT', { minimumFractionDigits: 2 }) : value;
  
  return (
    <div className="flex gap-1.5 items-stretch h-7">
      <div className={`${color || 'bg-gray-100'} px-3 flex items-center flex-1 rounded-sm border border-black/5`}>
        <span className={`text-[10px] font-bold tracking-tight ${color ? 'text-white' : 'text-gray-500'} uppercase truncate`}>{label}</span>
      </div>
      <div className={`border border-gray-200 rounded-sm w-32 flex items-center justify-end px-3 font-black text-xs text-gray-700 ${isHeader ? 'bg-gray-50' : ''}`}>
        {formattedValue} {!isPercentage && typeof value === 'number' ? '' : ''}
      </div>
    </div>
  );
};
