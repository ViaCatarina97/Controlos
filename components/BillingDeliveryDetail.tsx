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

const MISSING_REASONS = [
  'Produto indisponível no MyStore',
  'Quantidade entregue inferior à faturada',
  'Produto devolvido (Qualidade)',
  'Produto devolvido (Solicitado pelo restaurante)',
  'Outros (descrever nos comentários)'
];

// Configuração de IDs para busca no PDF
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
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMissingModal, setShowMissingModal] = useState(false);
  
  const formatEuro = (val: number) => val.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  const totalMyStore = useMemo(() => local.smsValues.reduce((s, v) => s + v.amount, 0), [local.smsValues]);
  const finalDifference = totalHaviFinal - totalMyStore;

  const handleLoadInvoice = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsProcessingPdf(true);
    try {
      // 1. Verificar motor PDF
      const pdfjsLib = (window as any).pdfjsLib;
      if (!pdfjsLib) throw new Error("Motor PDF não inicializado no navegador.");

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";

      // 2. Extrair texto de todas as páginas
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map((item: any) => item.str).join(" ") + " \n";
      }

      // 3. Normalizar o texto (remover múltiplos espaços e quebras de linha estranhas)
      const cleanText = fullText.replace(/\s+/g, ' ');

      // 4. Função de extração melhorada (Busca o 4º valor EUR após o ID)
      const extractValue = (id: string) => {
        // Esta regex é mais flexível: procura o ID e depois grupos de números seguidos de EUR
        const regex = new RegExp(`(?:\\s|^)${id}\\s+.*?(\\d[\\d.]*,\\d{2})\\s*EUR(?:.*?(\\d[\\d.]*,\\d{2})\\s*EUR)?(?:.*?(\\d[\\d.]*,\\d{2})\\s*EUR)?(?:.*?(\\d[\\d.]*,\\d{2})\\s*EUR)?`, 'i');
        const match = cleanText.match(regex);
        
        if (match) {
          // Se encontrou 4 valores, o último [4] é o Total. Se encontrou menos, pega o último disponível.
          const valStr = match[4] || match[3] || match[2] || match[1];
          return parseFloat(valStr.replace(/\./g, '').replace(',', '.'));
        }
        return 0;
      };

      // 5. Atualizar grupos
      const updatedHaviGroups = local.haviGroups.map(internal => {
        const config = HAVI_CONFIG.find(c => c.name.toUpperCase() === internal.description.toUpperCase());
        return config ? { ...internal, total: extractValue(config.id) } : { ...internal, total: 0 };
      });

      // 6. Extrair o TOTAL GERAL da linha "TOTAL" (Padrão da HAVI)
      const totalMatch = cleanText.match(/TOTAL\s+(?:[\d.]+,[\d]{2}\s*EUR\s+){1,3}([\d.]+,[\d]{2})\s*EUR/i);
      const finalVal = totalMatch ? parseFloat(totalMatch[1].replace(/\./g, '').replace(',', '.')) : 0;

      setLocal(prev => ({ ...prev, haviGroups: updatedHaviGroups }));
      if (finalVal > 0) setTotalHaviFinal(finalVal);

      alert(`Importação concluída!\nTotal Fatura: ${finalVal.toFixed(2)}€`);
    } catch (err: any) {
      console.error(err);
      alert("Erro ao processar: " + err.message);
    } finally {
      setIsProcessingPdf(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUpdateMyStoreValue = (desc: string, value: number) => {
    setLocal(prev => ({
      ...prev,
      smsValues: prev.smsValues.map(v => v.description === desc ? { ...v, amount: value } : v)
    }));
  };

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in">
      {/* HEADER */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center print:hidden">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 font-bold hover:text-gray-800 transition-colors">
          <ArrowLeft size={18} /> Voltar
        </button>
        <div className="flex items-center gap-3">
           <input type="file" ref={fileInputRef} onChange={handleLoadInvoice} accept=".pdf" className="hidden" />
           <button 
              onClick={() => fileInputRef.current?.click()} 
              disabled={isProcessingPdf} 
              className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-lg hover:bg-amber-100 font-bold border border-amber-200 transition-all disabled:opacity-50"
            >
              {isProcessingPdf ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18}/>}
              {isProcessingPdf ? "A processar..." : "Importar PDF"}
           </button>
           <button onClick={() => window.print()} className="bg-slate-100 p-2 rounded-lg hover:bg-slate-200 transition-colors"><Printer size={18}/></button>
           <button onClick={() => onSave({ ...local, isFinalized: true })} className="bg-purple-600 text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-purple-700 active:scale-95 transition-all uppercase text-xs tracking-widest">Finalizar</button>
        </div>
      </div>

      {/* DASHBOARD CENTRAL */}
      <div className="bg-white border-2 border-purple-500 rounded-lg p-6 shadow-xl print:border-none print:shadow-none">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* COLUNA HAVI */}
          <div className="border border-purple-500 rounded-lg overflow-hidden flex flex-col bg-white">
            <div className="bg-purple-50 py-2 text-center font-black text-purple-800 border-b border-purple-500 uppercase text-[10px] tracking-widest">HAVI (Valor Total)</div>
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

          {/* COLUNA MYSTORE */}
          <div className="border border-purple-500 rounded-lg overflow-hidden flex flex-col bg-white">
            <div className="bg-purple-50 py-2 text-center font-black text-purple-800 border-b border-purple-500 uppercase text-[10px] tracking-widest">MyStore</div>
            <div className="p-1 divide-y divide-purple-100 flex-1">
               {local.smsValues.map(v => (
                 <div key={v.description} className="grid grid-cols-12 px-2 py-2 items-center hover:bg-slate-50 transition-colors">
                    <div className="col-span-8 text-[11px] font-bold text-gray-700 uppercase">{v.description}</div>
                    <div className="col-span-4">
                       <input 
                        type="number" 
                        step="0.01" 
                        value={v.amount || ''} 
                        onChange={(e) => handleUpdateMyStoreValue(v.description, parseFloat(e.target.value) || 0)} 
                        className="w-full text-right bg-white border border-slate-200 rounded p-1 text-[11px] font-black outline-none focus:ring-1 focus:ring-purple-500" 
                        placeholder="0,00" 
                      />
                    </div>
                 </div>
               ))}
               <div className="mt-auto p-6 bg-purple-50/30 text-center border-t border-purple-500">
                  <div className="text-3xl font-black text-purple-900 italic leading-none">{formatEuro(totalMyStore)}</div>
               </div>
            </div>
          </div>

          {/* COLUNA DIFERENÇA FINAL */}
          <div className="border border-purple-500 rounded-lg overflow-hidden flex flex-col bg-slate-50 items-center justify-center p-8 text-center shadow-inner">
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
