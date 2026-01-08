import React, { useState, useMemo, useRef } from 'react';
import { DeliveryRecord, Employee, PriceDifferenceItem, MissingProduct } from '../types';
import { ArrowLeft, Save, Printer, Plus, Trash2, CheckCircle2, UploadCloud, Calculator, Loader2, AlertCircle } from 'lucide-react';

interface BillingDeliveryDetailProps {
  record: DeliveryRecord;
  employees: Employee[];
  onSave: (record: DeliveryRecord) => void;
  onBack: () => void;
}

const SMS_GROUPS = ['Comida', 'Papel', 'F. Operacionais', 'Material Adm', 'Outros', 'Happy Meal'];

// Mapeamento para garantir que o que vier do PDF caia no campo certo
const HAVI_CONFIG = [
  { id: '1', internalName: 'Congelados' },
  { id: '2', internalName: 'Refrigerados' },
  { id: '3', internalName: 'Secos Comida' },
  { id: '4', internalName: 'Secos Papel' },
  { id: '5', internalName: 'Manutenção Limpeza' },
  { id: '8', internalName: 'Produtos Frescos' },
  { id: '9', internalName: 'MANUTENÇÃO & LIMPEZA COMPRAS' },
  { id: '14', internalName: 'Ferramentas & Utensílios' },
  { id: '19', internalName: 'Bulk Alimentar' },
  { id: '20', internalName: 'Bulk Papel' }
];

export const BillingDeliveryDetail: React.FC<BillingDeliveryDetailProps> = ({ record, employees, onSave, onBack }) => {
  const [local, setLocal] = useState<DeliveryRecord>(record);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [totalHaviFinal, setTotalHaviFinal] = useState(record.haviGroups.reduce((s, g) => s + g.total, 0));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatEuro = (val: number) => val.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

  const totalMyStore = useMemo(() => local.smsValues.reduce((s, v) => s + v.amount, 0), [local.smsValues]);
  const finalDifference = totalHaviFinal - totalMyStore;

  const handleLoadInvoice = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingPdf(true);
    try {
      const pdfjsLib = (window as any).pdfjsLib;
      if (!pdfjsLib) throw new Error("Motor PDF não carregado no index.html");

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map((item: any) => item.str).join(" ") + " \n";
      }

      const cleanText = fullText.replace(/\s+/g, ' ');

      // Lógica para extrair o 4º valor (Valor Total) de uma linha começando por um ID
      const extractFourthValue = (id: string) => {
        const regex = new RegExp(`(?:\\s|^)${id}\\s+.*?[\\d.]+,\\d{2}\\s*EUR\\s+[\\d.]+,\\d{2}\\s*EUR\\s+[\\d.]+,\\d{2}\\s*EUR\\s+([\\d.]+,\\d{2})\\s*EUR`, 'i');
        const match = cleanText.match(regex);
        return match ? parseFloat(match[1].replace(/\./g, '').replace(',', '.')) : 0;
      };

      const updatedGroups = local.haviGroups.map(g => {
        const config = HAVI_CONFIG.find(c => c.internalName.toUpperCase() === g.description.toUpperCase());
        if (config) {
          return { ...g, total: extractFourthValue(config.id) };
        }
        return { ...g, total: 0 };
      });

      // Extrai o TOTAL final da linha "TOTAL" (último valor da linha)
      const totalMatch = cleanText.match(/TOTAL\s+.*?\s+([\d.]+,[\d]{2})\s*EUR\s+([\d.]+,[\d]{2})\s*EUR/i);
      const finalVal = totalMatch ? parseFloat(totalMatch[2].replace(/\./g, '').replace(',', '.')) : 0;

      setLocal(prev => ({ ...prev, haviGroups: updatedGroups }));
      if (finalVal > 0) setTotalHaviFinal(finalVal);

      alert(`Importação concluída!\nTotal Fatura: ${formatEuro(finalVal)}`);
    } catch (err: any) {
      alert("Erro ao processar: " + err.message);
    } finally {
      setIsProcessingPdf(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in">
      {/* HEADER */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center print:hidden">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 font-bold"><ArrowLeft size={18} /> Voltar</button>
        <div className="flex items-center gap-3">
          <input type="file" ref={fileInputRef} onChange={handleLoadInvoice} accept=".pdf" className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-lg font-bold border border-amber-200">
            {isProcessingPdf ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18}/>}
            {isProcessingPdf ? "A ler PDF..." : "Importar Fatura"}
          </button>
          <button onClick={() => window.print()} className="bg-slate-100 p-2 rounded-lg"><Printer size={18}/></button>
          <button onClick={() => onSave({...local, isFinalized: true})} className="bg-purple-600 text-white px-6 py-2 rounded-lg font-bold shadow-md">Finalizar</button>
        </div>
      </div>

      {/* PAINEL CENTRAL 3 COLUNAS (LAYOUT GOOGLE STUDIO) */}
      <div className="bg-white border-2 border-purple-500 rounded-lg p-6 shadow-xl print:border-none">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* HAVI */}
          <div className="border border-purple-500 rounded-lg overflow-hidden flex flex-col">
            <div className="bg-purple-50 py-2 text-center font-black text-purple-800 border-b border-purple-500 uppercase text-[10px]">HAVI (Valor Total)</div>
            <div className="p-1 divide-y divide-purple-100 flex-1">
               {local.haviGroups.map(group => (
                 <div key={group.group} className="grid grid-cols-12 px-2 py-1 items-center hover:bg-purple-50 transition-colors">
                    <div className="col-span-9 text-[10px] font-medium text-gray-700 uppercase">{group.description}</div>
                    <div className="col-span-3 text-right text-[10px] font-black">{group.total.toFixed(2)}</div>
                 </div>
               ))}
               <div className="p-4 bg-purple-100/50 text-right font-black text-purple-900 text-2xl border-t border-purple-500 italic">
                  {formatEuro(totalHaviFinal)}
               </div>
            </div>
          </div>

          {/* MYSTORE */}
          <div className="border border-purple-500 rounded-lg overflow-hidden flex flex-col">
            <div className="bg-purple-50 py-2 text-center font-black text-purple-800 border-b border-purple-500 uppercase text-[10px]">MyStore</div>
            <div className="p-1 divide-y divide-purple-100 flex-1">
               {local.smsValues.map(v => (
                 <div key={v.description} className="grid grid-cols-12 px-2 py-2 items-center">
                    <div className="col-span-8 text-[11px] font-bold text-gray-700 uppercase">{v.description}</div>
                    <div className="col-span-4 text-right">
                       <input type="number" step="0.01" value={v.amount || ''} onChange={(e) => setLocal({...local, smsValues: local.smsValues.map(x => x.description === v.description ? {...x, amount: parseFloat(e.target.value) || 0} : x)})} className="w-full text-right bg-slate-50 border-none p-0 text-[11px] font-black outline-none focus:ring-0" placeholder="0,00" />
                    </div>
                 </div>
               ))}
               <div className="mt-auto p-6 bg-purple-50/30 text-center border-t border-purple-500">
                  <div className="text-3xl font-black text-purple-900 italic">{formatEuro(totalMyStore)}</div>
               </div>
            </div>
          </div>

          {/* DIFERENÇA TOTAL */}
          <div className="border border-purple-500 rounded-lg overflow-hidden flex flex-col bg-slate-50 items-center justify-center p-8 text-center">
             <div className={`text-6xl font-black italic tracking-tighter ${Math.abs(finalDifference) > 0.1 ? 'text-red-600' : 'text-emerald-600'}`}>
                {formatEuro(finalDifference)}
             </div>
             <div className="text-[10px] font-bold text-gray-400 uppercase mt-4 tracking-widest">Diferença Final Real</div>
          </div>
        </div>
      </div>
    </div>
  );
};
