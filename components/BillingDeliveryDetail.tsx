import React, { useState, useMemo, useRef } from 'react';
import { DeliveryRecord, Employee } from '../types';
import { ArrowLeft, Save, Plus, CheckCircle2, UploadCloud, Calculator, Loader2, AlertCircle } from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';

// Configuração do Worker
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

  // Cálculos de Totais (Baseados na foto do layout que deseja)
  const totalHaviFinal = useMemo(() => 
    local.haviGroups.reduce((s, g) => s + g.total, 0) + (local.pontoVerde || 0)
  , [local.haviGroups, local.pontoVerde]);

  const totalMyStore = useMemo(() => 
    local.smsValues.reduce((s, v) => s + v.amount, 0)
  , [local.smsValues]);

  const finalDifference = totalHaviFinal - totalMyStore;

  // EXTRAÇÃO MELHORADA PARA TODOS OS GRUPOS HAVI
  const handleLoadInvoice = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingPdf(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map((item: any) => item.str).join(" ") + " \n ";
      }

      // Função para extrair valores considerando números com vírgula (ex: 6.035,57)
      const extractVal = (name: string) => {
        // Regex procura o nome do grupo e o valor na coluna "VALOR TOTAL" (última coluna da sua fatura)
        const regex = new RegExp(`${name}[^\\n]*?([\\d.]+,\\d{2})\\s*EUR`, 'i');
        const match = fullText.match(regex);
        if (match) {
          return parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
        }
        return 0;
      };

      const updatedGroups = local.haviGroups.map(g => {
        // Mapeia os nomes da fatura para as suas descrições internas
        if (g.description.includes('Congelados')) return { ...g, total: extractVal('CONGELADOS') };
        if (g.description.includes('Refrigerados')) return { ...g, total: extractVal('REFRIGERADOS') };
        if (g.description.includes('Secos Comida')) return { ...g, total: extractVal('SECOS COMIDA') };
        if (g.description.includes('Secos Papel')) return { ...g, total: extractVal('SECOS PAPEL') };
        if (g.description.includes('Produtos Frescos')) return { ...g, total: extractVal('PRODUTOS FRESCOS') };
        if (g.description.includes('Ferramentas')) return { ...g, total: extractVal('FERRAMENTAS') };
        if (g.description.includes('Limpeza')) return { ...g, total: extractVal('LIMPEZA') };
        if (g.description.includes('Bulk Alimentar')) return { ...g, total: extractVal('BULK ALIMENTAR') };
        if (g.description.includes('Bulk Papel')) return { ...g, total: extractVal('BULK PAPEL') };
        return g;
      });

      // Extração do Ponto Verde da linha TOTAL
      const pontoVerdeMatch = fullText.match(/TOTAL[^\\n]*?([\d.]+,\\d{2})\s+EUR[^\\n]*?([\d.]+,\\d{2})\s+EUR/i);
      const pontoVerdeTotal = pontoVerdeMatch ? parseFloat(pontoVerdeMatch[1].replace(/\./g, '').replace(',', '.')) : 30.06;

      setLocal(prev => ({
        ...prev,
        haviGroups: updatedGroups,
        pontoVerde: pontoVerdeTotal,
        comments: `Fatura importada com sucesso: ${new Date().toLocaleDateString()}`
      }));

    } catch (err) {
      console.error(err);
      alert("Erro ao ler o PDF. Verifique se o ficheiro é uma fatura HAVI válida.");
    } finally {
      setIsProcessingPdf(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in print:p-0">
      {/* HEADER DE AÇÕES */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center print:hidden">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 font-bold italic">
          <ArrowLeft size={18} /> Voltar
        </button>
        <div className="flex items-center gap-3">
          <input type="file" ref={fileInputRef} onChange={handleLoadInvoice} accept=".pdf" className="hidden" />
          <button 
            onClick={() => fileInputRef.current?.click()} 
            className="flex items-center gap-2 bg-amber-500 text-white px-6 py-2 rounded-lg font-black uppercase text-xs shadow-lg shadow-amber-500/20"
          >
            {isProcessingPdf ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16}/>}
            Importar Fatura PDF
          </button>
          <button onClick={() => onSave({...local, isFinalized: true})} className="flex items-center gap-2 bg-purple-600 text-white px-6 py-2 rounded-lg font-black uppercase text-xs shadow-lg shadow-purple-500/20">
            <CheckCircle2 size={16}/> Finalizar e Gravar
          </button>
        </div>
      </div>

      {/* LAYOUT DE 3 COLUNAS (DESIGN DA FOTO 1) */}
      <div className="bg-white border-2 border-purple-500 rounded-lg p-6 space-y-6 shadow-xl">
        <div className="border-b border-purple-100 pb-4 flex justify-between items-end">
          <h2 className="text-2xl font-black text-purple-900 uppercase tracking-tighter italic leading-none">CONTROLO DE FATURAÇÃO</h2>
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">ID REGISTO: {local.id.split('-')[0]}</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLUNA 1: HAVI */}
          <div className="border border-purple-500 rounded-lg overflow-hidden flex flex-col">
            <div className="bg-purple-50 py-1.5 text-center font-black text-purple-800 border-b border-purple-500 uppercase text-[10px] tracking-widest">HAVI</div>
            <div className="p-1 flex flex-col divide-y divide-purple-100 flex-1">
               <div className="grid grid-cols-12 text-[8px] font-black text-purple-400 px-2 py-1 uppercase">
                 <div className="col-span-9">DESCRIÇÃO</div><div className="col-span-3 text-right">TOTAL</div>
               </div>
               {local.haviGroups.map(group => (
                 <div key={group.group} className="grid grid-cols-12 px-2 py-1 items-center">
                    <div className="col-span-9 text-[10px] font-bold text-gray-700 uppercase">{group.description}</div>
                    <div className="col-span-3 text-right text-[10px] font-black text-slate-900">{group.total.toFixed(2)}</div>
                 </div>
               ))}
               <div className="grid grid-cols-12 px-2 py-1 bg-purple-50/30">
                 <div className="col-span-9 text-[10px] font-black text-purple-700 uppercase italic">Contribuição Ponto Verde</div>
                 <div className="col-span-3 text-right text-[10px] font-black text-purple-700">{local.pontoVerde.toFixed(2)}</div>
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
               <div className="mt-auto p-6 bg-purple-50/30 text-center border-t border-purple-500">
                  <div className="text-3xl font-black text-purple-900 italic leading-none">{totalMyStore.toFixed(2)} €</div>
                  <div className="text-[8px] font-black text-purple-400 uppercase mt-2">TOTAL MYSTORE CONSOLIDADO</div>
               </div>
            </div>
          </div>

          {/* COLUNA 3: DIFERENÇAS */}
          <div className="border border-purple-500 rounded-lg overflow-hidden flex flex-col bg-slate-50/30">
            <div className="bg-purple-50 py-1.5 text-center font-black text-purple-800 border-b border-purple-500 uppercase text-[10px] tracking-widest">DIFERENÇAS</div>
            <div className="p-8 flex flex-col items-center justify-center flex-1 space-y-4">
               <div className="text-center">
                  <div className={`text-5xl font-black italic tracking-tighter leading-none ${Math.abs(finalDifference) > 0.05 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {finalDifference.toFixed(2)} €
                  </div>
                  <div className="h-1.5 w-32 bg-red-600 rounded-full mx-auto mt-2"></div>
               </div>
               <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">DIFERENÇA TOTAL FINAL</div>
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
          <h3 className="text-[10px] font-black text-slate-800 uppercase mb-2 italic tracking-widest">COMENTÁRIOS E NOTAS DA CONFERÊNCIA</h3>
          <textarea 
            className="w-full h-16 bg-slate-50 rounded p-2 text-sm focus:ring-1 focus:ring-purple-200 border-none resize-none font-medium" 
            placeholder="Observações importantes sobre esta fatura..."
            value={local.comments}
            onChange={(e) => setLocal({...local, comments: e.target.value})}
          ></textarea>
        </div>
      </div>
    </div>
  );
};
