import React, { useState, useMemo, useRef } from 'react';
import { DeliveryRecord, Employee, PriceDifferenceItem, MissingProduct } from '../types';
import { ArrowLeft, Save, Printer, Plus, Trash2, CheckCircle2, UploadCloud, Calculator, Loader2, AlertCircle } from 'lucide-react';

interface BillingDeliveryDetailProps {
  record: DeliveryRecord;
  employees: Employee[];
  onSave: (record: DeliveryRecord) => void;
  onBack: () => void;
}

// Configuração estrita de IDs para evitar repetição de valores
const HAVI_CONFIG = [
  { id: '1', name: 'Congelados' },
  { id: '2', name: 'Refrigerados' },
  { id: '3', name: 'Secos Comida' },
  { id: '4', name: 'Secos Papel' },
  { id: '5', name: 'Manutenção Limpeza' },
  { id: '8', name: 'Produtos Frescos' },
  { id: '9', name: 'MANUTENÇÃO & LIMPEZA COMPRAS' },
  { id: '14', name: 'Ferramentas & Utensílios' },
  { id: '19', name: 'Bulk Alimentar' },
  { id: '20', name: 'Bulk Papel' }
];

export const BillingDeliveryDetail: React.FC<BillingDeliveryDetailProps> = ({ record, employees, onSave, onBack }) => {
  const [local, setLocal] = useState<DeliveryRecord>(record);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [totalHaviFinal, setTotalHaviFinal] = useState(record.haviGroups.reduce((s, g) => s + g.total, 0));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatEuro = (val: number) => val.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

  const handleLoadInvoice = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsProcessingPdf(true);
    try {
      const pdfjsLib = (window as any).pdfjsLib;
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        // Unimos com espaços triplos para garantir separação de colunas
        fullText += content.items.map((item: any) => item.str).join("   ") + " \n ";
      }

      const cleanText = fullText.replace(/\s+/g, ' ');

      // NOVA LÓGICA: Procura o ID e captura especificamente o 4º valor EUR após esse ID
      const getSpecificVal = (id: string) => {
        // Esta regex exige que o ID esteja isolado (espaço antes/depois) 
        // e captura a sequência: Valor1 EUR Valor2 EUR Valor3 EUR [VALOR TOTAL] EUR
        const pattern = new RegExp(`(?:^|\\s)${id}\\s+.*?(\\d[\\d.]*,\\d{2})\\s*EUR.*?(\\d[\\d.]*,\\d{2})\\s*EUR.*?(\\d[\\d.]*,\\d{2})\\s*EUR.*?(\\d[\\d.]*,\\d{2})\\s*EUR`, 'i');
        const match = cleanText.match(pattern);
        
        // Retornamos match[4] que é a 4ª coluna (Valor Total)
        if (match && match[4]) {
          return parseFloat(match[4].replace(/\./g, '').replace(',', '.'));
        }
        return 0;
      };

      const updatedGroups = local.haviGroups.map(internal => {
        const config = HAVI_CONFIG.find(c => c.name.toUpperCase() === internal.description.toUpperCase());
        if (config) {
          const valor = getSpecificVal(config.id);
          return { ...internal, total: valor };
        }
        return { ...internal, total: 0 };
      });

      // Extração do TOTAL GERAL da linha de rodapé do PDF (Ex: 9412,00)
      const totalMatch = cleanText.match(/TOTAL\s+(?:[\d.]+,[\d]{2}\s*EUR\s+){1,3}([\d.]+,[\d]{2})\s*EUR/i);
      const finalVal = totalMatch ? parseFloat(totalMatch[1].replace(/\./g, '').replace(',', '.')) : 0;

      setLocal(prev => ({ ...prev, haviGroups: updatedGroups }));
      if (finalVal > 0) setTotalHaviFinal(finalVal);

      alert(`Importação concluída!\nTotal Fatura: ${finalVal.toFixed(2)}€`);
    } catch (err: any) {
      alert("Erro na leitura: " + err.message);
    } finally {
      setIsProcessingPdf(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const totalMyStore = useMemo(() => local.smsValues.reduce((s, v) => s + v.amount, 0), [local.smsValues]);
  const finalDifference = totalHaviFinal - totalMyStore;

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center print:hidden">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 font-bold hover:text-gray-800 transition-colors"><ArrowLeft size={18} /> Voltar</button>
        <div className="flex items-center gap-3">
           <input type="file" ref={fileInputRef} onChange={handleLoadInvoice} accept=".pdf" className="hidden" />
           <button onClick={() => fileInputRef.current?.click()} disabled={isProcessingPdf} className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-lg font-bold border border-amber-200">
              {isProcessingPdf ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18}/>} Importar PDF
           </button>
           <button onClick={() => onSave({ ...local, isFinalized: true })} className="bg-purple-600 text-white px-6 py-2 rounded-lg font-bold shadow-md">Finalizar</button>
        </div>
      </div>

      <div className="bg-white border-2 border-purple-500 rounded-lg p-6 shadow-xl print:border-none">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="border border-purple-500 rounded-lg overflow-hidden flex flex-col bg-white">
            <div className="bg-purple-50 py-2 text-center font-black text-purple-800 border-b border-purple-500 uppercase text-[10px]">HAVI (Valor Total)</div>
            <div className="p-1 divide-y divide-purple-100 flex-1">
               {local.haviGroups.map(group => (
                 <div key={group.group} className="grid grid-cols-12 px-2 py-1 items-center hover:bg-purple-50 transition-colors">
                    <div className="col-span-9 text-[10px] font-medium text-gray-700 uppercase">{group.description}</div>
                    <div className="col-span-3 text-right text-[10px] font-black">{group.total.toFixed(2)}</div>
                 </div>
               ))}
               <div className="mt-auto p-4 bg-purple-100/50 text-right font-black text-purple-900 text-2xl border-t-2 border-purple-500 italic">
                  {formatEuro(totalHaviFinal)}
               </div>
            </div>
          </div>

          <div className="border border-purple-500 rounded-lg overflow-hidden flex flex-col bg-white">
            <div className="bg-purple-50 py-2 text-center font-black text-purple-800 border-b border-purple-500 uppercase text-[10px]">MyStore</div>
            <div className="p-1 divide-y divide-purple-100 flex-1">
               {local.smsValues.map(v => (
                 <div key={v.description} className="grid grid-cols-12 px-2 py-2 items-center">
                    <div className="col-span-8 text-[11px] font-bold text-gray-700 uppercase">{v.description}</div>
                    <div className="col-span-4">
                       <input type="number" step="0.01" value={v.amount || ''} onChange={(e) => setLocal({...local, smsValues: local.smsValues.map(x => x.description === v.description ? {...x, amount: parseFloat(e.target.value) || 0} : x)})} className="w-full text-right bg-slate-50 border border-slate-200 rounded p-1 text-[11px] font-black outline-none focus:ring-1 focus:ring-purple-500" />
                    </div>
                 </div>
               ))}
               <div className="mt-auto p-6 bg-purple-50/30 text-center border-t border-purple-500">
                  <div className="text-3xl font-black text-purple-900 italic leading-none">{formatEuro(totalMyStore)}</div>
               </div>
            </div>
          </div>

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
