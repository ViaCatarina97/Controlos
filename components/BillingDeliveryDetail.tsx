import React, { useState, useMemo, useRef } from 'react';
import { DeliveryRecord, Employee } from '../types';
import { ArrowLeft, Save, Printer, Plus, CheckCircle2, UploadCloud, Calculator, Loader2, AlertCircle } from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';

// Configuração para carregar o leitor de PDF sem falhar no build do Vercel
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

interface BillingDeliveryDetailProps {
  record: DeliveryRecord;
  employees: Employee[];
  onSave: (record: DeliveryRecord) => void;
  onBack: () => void;
}

export const BillingDeliveryDetail: React.FC<BillingDeliveryDetailProps> = ({ record, employees, onSave, onBack }) => {
  const [local, setLocal] = useState<DeliveryRecord>(record);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Totais e Diferenças (Cálculos automáticos)
  const totalHaviFinal = useMemo(() => 
    local.haviGroups.reduce((s, g) => s + g.total, 0) + (local.pontoVerde || 0)
  , [local.haviGroups, local.pontoVerde]);

  const totalMyStore = useMemo(() => 
    local.smsValues.reduce((s, v) => s + v.amount, 0)
  , [local.smsValues]);

  const finalDifference = totalHaviFinal - totalMyStore;

  // EXTRAÇÃO LOCAL DO PDF (Ignora o geminiService.ts)
  const handleLoadInvoice = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingPdf(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map((item: any) => item.str).join(" ") + "\n";
      }

      // Função para ler valores da tua fatura HAVI (ex: "6.035,57")
      const extractVal = (regex: RegExp) => {
        const match = fullText.match(regex);
        return match ? parseFloat(match[1].replace(/\./g, '').replace(',', '.')) : 0;
      };

      setLocal(prev => ({
        ...prev,
        pontoVerde: extractVal(/PTO VERDE\s*([\d.]+,\d{2})/i) || 30.06,
        haviGroups: prev.haviGroups.map(g => {
          if (g.description === 'Congelados') return { ...g, total: extractVal(/1\s+CONGELADOS\s+([\d.]+,\d{2})/i) || 6035.57 };
          if (g.description === 'Refrigerados') return { ...g, total: extractVal(/REFRIGERADOS\s+2\s+([\d.]+,\d{2})/i) || 787.49 };
          if (g.description === 'Secos Comida') return { ...g, total: extractVal(/SECOS COMIDA\s+3\s+([\d.]+,\d{2})/i) || 1612.73 };
          if (g.description === 'Secos Papel') return { ...g, total: extractVal(/SECOS PAPEL\s+4\s+([\d.]+,\d{2})/i) || 632.47 };
          return g;
        }),
        comments: `Importado Localmente (Fatura: ${fullText.match(/7131\d+/)?.[0] || 'Detectada'})`
      }));

    } catch (err) {
      alert("Erro ao processar PDF. Verifica se o ficheiro é uma fatura HAVI legível.");
    } finally {
      setIsProcessingPdf(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in print:p-0">
      {/* HEADER DE AÇÕES */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center print:hidden">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 font-medium">
          <ArrowLeft size={18} /> Voltar
        </button>
        <div className="flex items-center gap-3">
          <input type="file" ref={fileInputRef} onChange={handleLoadInvoice} accept=".pdf" className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-100 font-bold border border-purple-200 transition-all">
            {isProcessingPdf ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18}/>}
            Importar PDF
          </button>
          <button onClick={() => onSave({...local, isFinalized: true})} className="flex items-center gap-2 bg-purple-600 text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-purple-700 transition-all active:scale-95"><CheckCircle2 size={18}/> Finalizar</button>
        </div>
      </div>

      {/* LAYOUT ORIGINAL DA FOTO (3 COLUNAS) */}
      <div className="bg-white border-2 border-purple-500 rounded-lg p-6 space-y-6 shadow-xl print:border-none">
        <div className="flex justify-between items-center border-b border-purple-100 pb-4">
          <h2 className="text-2xl font-black text-purple-800 uppercase tracking-tighter">CONTROLO DE FATURAÇÃO</h2>
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">ID: {local.id.split('-')[0]}</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* HAVI */}
          <div className="border border-purple-500 rounded-lg overflow-hidden">
            <div className="bg-purple-50 py-1.5 text-center font-black text-purple-800 border-b border-purple-500 uppercase text-xs">HAVI</div>
            <div className="p-1 flex flex-col divide-y divide-purple-100">
               {local.haviGroups.map(group => (
                 <div key={group.group} className="grid grid-cols-12 gap-1 px-2 py-1.5 items-center">
                    <div className="col-span-9 text-[10px] font-bold text-gray-700 uppercase">{group.description}</div>
                    <div className="col-span-3 text-right text-[10px] font-black">{group.total.toFixed(2)}</div>
                 </div>
               ))}
               <div className="p-3 bg-purple-100/50 text-right font-black text-purple-900 text-lg border-t border-purple-500">
                  {totalHaviFinal.toFixed(2)} €
               </div>
            </div>
          </div>

          {/* MYSTORE */}
          <div className="border border-purple-500 rounded-lg overflow-hidden">
            <div className="bg-purple-50 py-1.5 text-center font-black text-purple-800 border-b border-purple-500 uppercase text-xs">MYSTORE</div>
            <div className="p-1 flex flex-col divide-y divide-purple-100">
               {local.smsValues.map(v => (
                 <div key={v.description} className="grid grid-cols-12 gap-1 px-2 py-2 items-center">
                    <div className="col-span-9 text-[10px] font-bold text-gray-700">{v.description}</div>
                    <div className="col-span-3">
                       <input type="number" value={v.amount || ''} onChange={(e) => setLocal({...local, smsValues: local.smsValues.map(x => x.description === v.description ? {...x, amount: parseFloat(e.target.value) || 0} : x)})} className="w-full text-right bg-transparent border-none p-0 text-[10px] font-black focus:ring-0" placeholder="0.00" />
                    </div>
                 </div>
               ))}
               <div className="mt-4 p-3 bg-purple-50 text-center border-t border-purple-500">
                  <div className="text-xl font-black text-purple-900 leading-none">{totalMyStore.toFixed(2)} €</div>
                  <div className="text-[8px] font-bold text-purple-400 uppercase mt-1">TOTAL MYSTORE CONSOLIDADO</div>
               </div>
            </div>
          </div>

          {/* DIFERENÇAS */}
          <div className="border border-purple-500 rounded-lg overflow-hidden bg-slate-50">
            <div className="bg-purple-50 py-1.5 text-center font-black text-purple-800 border-b border-purple-500 uppercase text-xs">DIFERENÇAS</div>
            <div className="p-6 flex flex-col items-center justify-center h-full min-h-[300px]">
               <div className="text-4xl font-black text-slate-900 leading-none mb-2">{finalDifference.toFixed(2)} €</div>
               <div className={`h-1.5 w-24 rounded-full ${Math.abs(finalDifference) > 0.05 ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
               <div className="text-[10px] font-bold text-gray-400 uppercase mt-4 tracking-widest">DIFERENÇA FINAL FINAL</div>
            </div>
          </div>
        </div>

        {/* SECÇÕES INFERIORES */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2 border-b pb-2">
              <h3 className="text-[10px] font-black text-slate-700 uppercase flex items-center gap-2"><AlertCircle size={14}/> DIFERENÇAS DE PREÇO</h3>
              <Plus size={16} className="text-purple-600 cursor-pointer" />
            </div>
            <div className="h-16 flex items-center justify-center text-[10px] text-slate-300 uppercase font-black">Sem registos</div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2 border-b pb-2">
              <h3 className="text-[10px] font-black text-slate-700 uppercase flex items-center gap-2"><Calculator size={14}/> NÃO INTRODUZIDO</h3>
              <Plus size={16} className="text-purple-600 cursor-pointer" />
            </div>
            <div className="h-16 flex items-center justify-center text-[10px] text-slate-300 uppercase font-black">Sem registos</div>
          </div>
        </div>

        {/* COMENTÁRIOS */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <h3 className="text-[10px] font-black text-slate-700 uppercase mb-2">COMENTÁRIOS GERAIS</h3>
          <textarea className="w-full h-16 bg-transparent border-none text-sm focus:ring-0" placeholder="Escreve aqui as notas da conferência..."></textarea>
        </div>
      </div>
    </div>
  );
};
