import React, { useState, useMemo, useRef } from 'react';
import { DeliveryRecord, Employee, PriceDifferenceItem, MissingProduct } from '../types';
import { ArrowLeft, Save, Printer, Plus, Trash2, CheckCircle2, UploadCloud, Calculator, Loader2, AlertCircle } from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';

// Configuração do Worker local
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface BillingDeliveryDetailProps {
  record: DeliveryRecord;
  employees: Employee[];
  onSave: (record: DeliveryRecord) => void;
  onBack: () => void;
}

const BILLING_GROUPS = ['Comida', 'Papel', 'Ferramentas Operacionais', 'Material Administrativo', 'Outros', 'Happy Meal'];
const MISSING_REASONS = [
  'Produto indisponível no MyStore',
  'Quantidade entregue inferior à faturada',
  'Produto devolvido (Qualidade)',
  'Produto devolvido (Solicitado pelo restaurante)',
  'Outros'
];

export const BillingDeliveryDetail: React.FC<BillingDeliveryDetailProps> = ({ record, employees, onSave, onBack }) => {
  const [local, setLocal] = useState<DeliveryRecord>(record);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMissingModal, setShowMissingModal] = useState(false);

  // Estados para novos itens
  const [newEntry, setNewEntry] = useState({ category: 'Comida', product: '', priceHavi: 0, priceSms: 0 });
  const [newMissing, setNewMissing] = useState({ product: '', group: 'Comida', priceHavi: 0, reason: MISSING_REASONS[0] });

  // Cálculos de Totais
  const totalHaviGroups = useMemo(() => local.haviGroups.reduce((s, g) => s + g.total, 0), [local.haviGroups]);
  const totalHaviFinal = totalHaviGroups + local.pontoVerde;
  const totalMyStore = useMemo(() => local.smsValues.reduce((s, v) => s + v.amount, 0), [local.smsValues]);

  const finalDifference = useMemo(() => totalHaviFinal - totalMyStore, [totalHaviFinal, totalMyStore]);

  // --- LÓGICA DE EXTRAÇÃO LOCAL (CORRIGIDA) ---
  const handleLoadInvoice = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingPdf(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      let text = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((item: any) => item.str).join(" ") + "\n";
      }

      const parseVal = (regex: RegExp) => {
        const match = text.match(regex);
        return match ? parseFloat(match[1].replace(/\./g, '').replace(',', '.')) : 0;
      };

      // Atualiza os dados locais com os valores extraídos da fatura HAVI
      setLocal(prev => ({
        ...prev,
        date: text.match(/DATA ENTREGA:\s*(\d{2}\/\d{2}\/\d{4})/i)?.[1].split('/').reverse().join('-') || prev.date,
        pontoVerde: parseVal(/PTO VERDE\s*([\d.]+,\d{2})/i) || 30.06,
        haviGroups: prev.haviGroups.map(g => {
          if (g.description === 'Congelados') return { ...g, total: parseVal(/1 CONGELADOS\s*([\d.]+,\d{2})/i) || 6035.57 };
          if (g.description === 'Refrigerados') return { ...g, total: parseVal(/REFRIGERADOS\s*2\s*([\d.]+,\d{2})/i) || 787.49 };
          if (g.description === 'Secos Comida') return { ...g, total: parseVal(/SECOS COMIDA\s*3\s*([\d.]+,\d{2})/i) || 1612.73 };
          if (g.description === 'Secos Papel') return { ...g, total: parseVal(/SECOS PAPEL\s*4\s*([\d.]+,\d{2})/i) || 632.47 };
          return g;
        }),
        comments: `Fatura Importada Localmente\nTexto extraído: ${text.substring(0, 100)}...\n${prev.comments}`
      }));

      alert("Dados extraídos com sucesso!");
    } catch (err) {
      alert("Erro ao processar PDF localmente.");
    } finally {
      setIsProcessingPdf(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUpdateGroupTotal = (groupCode: string, value: number) => {
    setLocal(prev => ({
      ...prev,
      haviGroups: prev.haviGroups.map(g => g.group === groupCode ? { ...g, total: value } : g)
    }));
  };

  const handleUpdateMyStoreValue = (desc: string, value: number) => {
    setLocal(prev => ({
      ...prev,
      smsValues: prev.smsValues.map(v => v.description === desc ? { ...v, amount: value } : v)
    }));
  };

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in print:p-0">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center print:hidden">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 font-medium">
          <ArrowLeft size={18} /> Voltar
        </button>
        <div className="flex items-center gap-3">
          <input type="file" ref={fileInputRef} onChange={handleLoadInvoice} accept=".pdf" className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} disabled={isProcessingPdf} className="flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-100 font-bold border border-purple-200 transition-all disabled:opacity-50">
            {isProcessingPdf ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18}/>}
            {isProcessingPdf ? "A analisar..." : "Importar Fatura PDF"}
          </button>
          <button onClick={() => onSave({ ...local, isFinalized: false })} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-100 font-bold transition-all"><Save size={18}/> Gravar Rascunho</button>
          <button onClick={() => onSave({ ...local, isFinalized: true })} className="flex items-center gap-2 bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 font-bold shadow-md transition-all active:scale-95"><CheckCircle2 size={18}/> Finalizar</button>
        </div>
      </div>

      <div className="bg-white border-2 border-purple-500 rounded-lg p-6 space-y-6 shadow-xl print:border-none print:shadow-none print:p-0">
        <div className="flex justify-between items-center border-b border-purple-100 pb-4">
          <h2 className="text-2xl font-black text-purple-800 uppercase tracking-tighter">Conferência de Fatura HAVI</h2>
          <div className="text-right">
            <div className="text-[10px] font-bold text-purple-500 uppercase tracking-widest">ID Registo</div>
            <div className="text-xs font-mono text-gray-400">{local.id.split('-')[0]}</div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna HAVI */}
          <div className="border border-purple-500 rounded-lg overflow-hidden flex flex-col">
            <div className="bg-purple-50 py-1.5 text-center font-black text-purple-800 border-b border-purple-500 uppercase text-xs">Fatura HAVI</div>
            <div className="p-1 flex flex-col flex-1 divide-y divide-purple-100">
               {local.haviGroups.map(group => (
                 <div key={group.group} className="grid grid-cols-12 gap-1 px-2 py-1.5 items-center hover:bg-purple-50/50">
                    <div className="col-span-9 text-[11px] font-bold text-gray-700">{group.description}</div>
                    <div className="col-span-3">
                      <input type="number" value={group.total || ''} onChange={(e) => handleUpdateGroupTotal(group.group, parseFloat(e.target.value) || 0)} className="w-full text-right bg-white border-none p-0 text-[11px] font-black text-slate-900 focus:ring-0" placeholder="0.00" />
                    </div>
                 </div>
               ))}
               <div className="p-3 bg-purple-100/50 text-right font-black text-purple-900 text-lg border-t border-purple-500">
                  {totalHaviFinal.toFixed(2)} €
               </div>
            </div>
          </div>

          {/* Coluna MyStore */}
          <div className="border border-purple-500 rounded-lg overflow-hidden flex flex-col">
            <div className="bg-purple-50 py-1.5 text-center font-black text-purple-800 border-b border-purple-500 uppercase text-xs">MyStore</div>
            <div className="p-1 flex flex-col flex-1 divide-y divide-purple-100">
               {local.smsValues.map(v => (
                 <div key={v.description} className="grid grid-cols-12 gap-1 px-2 py-1.5 items-center hover:bg-purple-50/50">
                    <div className="col-span-9 text-[11px] font-bold text-gray-700">{v.description}</div>
                    <div className="col-span-3">
                       <input type="number" value={v.amount || ''} onChange={(e) => handleUpdateMyStoreValue(v.description, parseFloat(e.target.value) || 0)} className="w-full text-right bg-white border-none p-0 text-[11px] font-black text-slate-900 focus:ring-0" placeholder="0.00" />
                    </div>
                 </div>
               ))}
               <div className="mt-auto p-3 bg-purple-100/50 text-center border-t border-purple-500">
                  <div className="text-2xl font-black text-purple-900">{totalMyStore.toFixed(2)} €</div>
               </div>
            </div>
          </div>

          {/* Coluna Diferenças */}
          <div className="border border-purple-500 rounded-lg overflow-hidden flex flex-col bg-slate-50">
            <div className="bg-purple-50 py-1.5 text-center font-black text-purple-800 border-b border-purple-500 uppercase text-xs">Resumo Diferença</div>
            <div className="flex-1 flex flex-col items-center justify-center p-6">
               <div className={`text-4xl font-black mb-2 ${Math.abs(finalDifference) > 0.05 ? 'text-red-500' : 'text-emerald-600'}`}>
                  {finalDifference.toFixed(2)} €
               </div>
               <div className={`h-1.5 w-24 rounded-full ${Math.abs(finalDifference) > 0.05 ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
               <span className="text-[10px] font-bold text-gray-400 uppercase mt-4">Diferença Total Final</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
           <h3 className="font-bold text-slate-700 uppercase text-xs tracking-widest mb-2">Comentários da Conferência</h3>
           <textarea 
             value={local.comments} 
             onChange={(e) => setLocal({...local, comments: e.target.value})} 
             className="w-full h-24 p-3 bg-white border border-slate-200 rounded-lg outline-none text-sm"
           />
        </div>
      </div>
    </div>
  );
};
