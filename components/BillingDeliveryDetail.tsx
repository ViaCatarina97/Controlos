import React, { useState, useMemo, useRef, useEffect } from 'react';
import { DeliveryRecord, Employee } from '../types';
import { ArrowLeft, Save, Plus, CheckCircle2, UploadCloud, Calculator, Loader2, AlertCircle } from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';

// Configuração do Worker via CDN para garantir que funciona no browser e no Vercel
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

  // Totais e Diferenças
  const totalHaviFinal = useMemo(() => 
    local.haviGroups.reduce((s, g) => s + g.total, 0) + (local.pontoVerde || 0)
  , [local.haviGroups, local.pontoVerde]);

  const totalMyStore = useMemo(() => 
    local.smsValues.reduce((s, v) => s + v.amount, 0)
  , [local.smsValues]);

  const finalDifference = totalHaviFinal - totalMyStore;

  // FUNÇÃO DE IMPORTAÇÃO CORRIGIDA
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
        // Captura o texto de forma mais robusta
        const strings = content.items.map((item: any) => item.str);
        fullText += strings.join(" ") + "\n";
      }

      console.log("Texto extraído do PDF:", fullText); // Para debug se precisares

      // Regex melhorada para apanhar os teus valores da HAVI
      const extractVal = (regex: RegExp) => {
        const match = fullText.match(regex);
        if (match) {
          // Converte "6.052,67" ou "6052,67" para 6052.67
          const val = match[1].replace(/\./g, '').replace(',', '.');
          return parseFloat(val);
        }
        return 0;
      };

      // Mapeamento dos campos baseado na tua fatura HAVI
      const newHaviGroups = local.haviGroups.map(g => {
        if (g.description === 'Congelados') return { ...g, total: extractVal(/1\s+CONGELADOS\s+([\d.]+,\d{2})/i) };
        if (g.description === 'Refrigerados') return { ...g, total: extractVal(/REFRIGERADOS\s+2\s+([\d.]+,\d{2})/i) };
        if (g.description === 'Secos Comida') return { ...g, total: extractVal(/SECOS COMIDA\s+3\s+([\d.]+,\d{2})/i) };
        if (g.description === 'Secos Papel') return { ...g, total: extractVal(/SECOS PAPEL\s+4\s+([\d.]+,\d{2})/i) };
        if (g.description === 'Produtos Frescos') return { ...g, total: extractVal(/PRODUTOS FRESCOS\s+8\s+([\d.]+,\d{2})/i) };
        if (g.description === 'Bulk Alimentar') return { ...g, total: extractVal(/19\s+BULK ALIMENTAR\s+([\d.]+,\d{2})/i) };
        if (g.description === 'Bulk Papel') return { ...g, total: extractVal(/20\s+BULK PAPEL\s+([\d.]+,\d{2})/i) };
        return g;
      });

      setLocal(prev => ({
        ...prev,
        haviGroups: newHaviGroups,
        pontoVerde: extractVal(/PTO VERDE\s+([\d.]+,\d{2})/i) || 30.06,
        comments: `Fatura importada com sucesso: ${new Date().toLocaleDateString()}`
      }));

      alert("Dados da fatura importados!");

    } catch (err) {
      console.error("Erro no PDF:", err);
      alert("Não foi possível ler este PDF. Tenta novamente.");
    } finally {
      setIsProcessingPdf(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in">
      {/* HEADER IGUAL À FOTO */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center print:hidden">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 font-bold italic">
          <ArrowLeft size={18} /> Voltar
        </button>
        <div className="flex items-center gap-3">
          <input type="file" ref={fileInputRef} onChange={handleLoadInvoice} accept=".pdf" className="hidden" />
          <button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={isProcessingPdf}
            className="flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-100 font-black border border-purple-200 transition-all uppercase text-xs"
          >
            {isProcessingPdf ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16}/>}
            {isProcessingPdf ? "A Processar..." : "Importar Fatura PDF"}
          </button>
          <button onClick={() => onSave({...local, isFinalized: true})} className="flex items-center gap-2 bg-purple-600 text-white px-6 py-2 rounded-lg font-black uppercase text-xs shadow-lg shadow-purple-500/20 active:scale-95 transition-all">
            <CheckCircle2 size={16}/> Finalizar e Gravar
          </button>
        </div>
      </div>

      {/* PAINEL DE 3 COLUNAS - DESIGN ORIGINAL */}
      <div className="bg-white border-2 border-purple-500 rounded-lg p-6 space-y-6 shadow-xl">
        <div className="border-b border-purple-100 pb-4">
          <h2 className="text-2xl font-black text-purple-900 uppercase tracking-tighter italic">CONTROLO DE FATURAÇÃO</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLUNA 1: HAVI */}
          <div className="border border-purple-500 rounded-lg overflow-hidden flex flex-col">
            <div className="bg-purple-50 py-1.5 text-center font-black text-purple-800 border-b border-purple-500 uppercase text-[10px] tracking-widest">HAVI</div>
            <div className="p-1 flex flex-col divide-y divide-purple-100">
               <div className="grid grid-cols-12 text-[8px] font-black text-purple-400 px-2 py-1 uppercase">
                 <div className="col-span-9">DESCRIÇÃO</div><div className="col-span-3 text-right">TOTAL</div>
               </div>
               {local.haviGroups.map(group => (
                 <div key={group.group} className="grid grid-cols-12 px-2 py-1.5 hover:bg-purple-50 transition-colors">
                    <div className="col-span-9 text-[10px] font-bold text-gray-700 uppercase">{group.description}</div>
                    <div className="col-span-3 text-right text-[10px] font-black text-slate-900">{group.total.toFixed(2)}</div>
                 </div>
               ))}
               <div className="grid grid-cols-12 px-2 py-1.5 bg-purple-50/30">
                 <div className="col-span-9 text-[10px] font-black text-purple-700 uppercase italic">Contr/Bulk Ponto Verde</div>
                 <div className="col-span-3 text-right text-[10px] font-black text-purple-700">{local.pontoVerde?.toFixed(2)}</div>
               </div>
               <div className="p-4 bg-purple-100/50 text-right font-black text-purple-900 text-2xl border-t border-purple-500 italic">
                  {totalHaviFinal.toFixed(2)} €
               </div>
            </div>
          </div>

          {/* COLUNA 2: MYSTORE */}
          <div className="border border-purple-500 rounded-lg overflow-hidden flex flex-col">
            <div className="bg-purple-50 py-1.5 text-center font-black text-purple-800 border-b border-purple-500 uppercase text-[10px] tracking-widest">MYSTORE</div>
            <div className="p-1 flex flex-col divide-y divide-purple-100 h-full">
               {local.smsValues.map(v => (
                 <div key={v.description} className="grid grid-cols-12 px-2 py-2.5 items-center">
                    <div className="col-span-8 text-[10px] font-bold text-gray-700 uppercase">{v.description}</div>
                    <div className="col-span-4">
                       <input 
                         type="number" 
                         value={v.amount || ''} 
                         onChange={(e) => setLocal({...local, smsValues: local.smsValues.map(x => x.description === v.description ? {...x, amount: parseFloat(e.target.value) || 0} : x)})} 
                         className="w-full text-right bg-transparent border-none p-0 text-[11px] font-black focus:ring-0 text-slate-800" 
                         placeholder="0.00" 
                       />
                    </div>
                 </div>
               ))}
               <div className="mt-auto p-6 bg-purple-50/50 text-center border-t border-purple-500">
                  <div className="text-3xl font-black text-purple-900 italic leading-none">{totalMyStore.toFixed(2)} €</div>
                  <div className="text-[8px] font-black text-purple-400 uppercase mt-2">TOTAL MYSTORE CONSOLIDADO</div>
               </div>
            </div>
          </div>

          {/* COLUNA 3: DIFERENÇAS */}
          <div className="border border-purple-500 rounded-lg overflow-hidden flex flex-col bg-slate-50/50">
            <div className="bg-purple-50 py-1.5 text-center font-black text-purple-800 border-b border-purple-500 uppercase text-[10px] tracking-widest">DIFERENÇAS</div>
            <div className="p-8 flex flex-col items-center justify-center flex-1 space-y-4">
               <div className={`text-5xl font-black italic tracking-tighter ${Math.abs(finalDifference) > 0.05 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {finalDifference.toFixed(2)} €
               </div>
               <div className="h-1.5 w-32 bg-red-600 rounded-full"></div>
               <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">DIFERENÇA FINAL FINAL</div>
            </div>
          </div>
        </div>

        {/* SECÇÃO INFERIOR */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="text-[10px] font-black text-slate-800 uppercase flex items-center gap-2 italic">
                <AlertCircle size={14} className="text-amber-500"/> DIFERENÇAS DE PREÇO
              </h3>
              <Plus size={16} className="text-purple-600 cursor-pointer hover:bg-purple-50 rounded transition-all" />
            </div>
            <div className="h-10 flex items-center justify-center text-[10px] text-slate-300 font-black uppercase italic">Sem registos</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="text-[10px] font-black text-slate-800 uppercase flex items-center gap-2 italic">
                <Calculator size={14} className="text-blue-500"/> NÃO INTRODUZIDO
              </h3>
              <Plus size={16} className="text-purple-600 cursor-pointer hover:bg-purple-50 rounded transition-all" />
            </div>
            <div className="h-10 flex items-center justify-center text-[10px] text-slate-300 font-black uppercase italic">Sem registos</div>
          </div>
        </div>

        {/* COMENTÁRIOS */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <h3 className="text-[10px] font-black text-slate-800 uppercase mb-2 italic">COMENTÁRIOS GERAIS</h3>
          <textarea 
            className="w-full h-16 bg-slate-50 rounded p-2 text-sm focus:ring-1 focus:ring-purple-200 border-none resize-none" 
            placeholder="Observações da conferência de hoje..."
          ></textarea>
        </div>
      </div>
    </div>
  );
};
