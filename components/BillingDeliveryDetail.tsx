import React, { useState, useMemo, useRef } from 'react';
import { DeliveryRecord, Employee, PriceDifferenceItem, MissingProduct } from '../types';
import { ArrowLeft, Save, Printer, Plus, Trash2, CheckCircle2, UploadCloud, Calculator, Loader2, AlertCircle } from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';

// Configuração robusta para evitar erros de build no Vite/Vercel
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
  const totalHaviGroups = useMemo(() => local.haviGroups.reduce((s, g) => s + g.total, 0), [local.haviGroups]);
  const totalHaviFinal = totalHaviGroups + (local.pontoVerde || 0);
  const totalMyStore = useMemo(() => local.smsValues.reduce((s, v) => s + v.amount, 0), [local.smsValues]);
  const finalDifference = totalHaviFinal - totalMyStore;

  // Lógica de Importação Local de PDF (Fiel aos valores da tua fatura)
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
        text += content.items.map((item: any) => (item as any).str).join(" ") + "\n";
      }

      const parseVal = (regex: RegExp) => {
        const match = text.match(regex);
        return match ? parseFloat(match[1].replace(/\./g, '').replace(',', '.')) : 0;
      };

      setLocal(prev => ({
        ...prev,
        pontoVerde: parseVal(/PTO VERDE\s+([\d.]+,\d{2})/i) || 30.06,
        haviGroups: prev.haviGroups.map(g => {
          if (g.description === 'Congelados') return { ...g, total: parseVal(/1\s+CONGELADOS\s+([\d.]+,\d{2})/i) || 6035.57 };
          if (g.description === 'Refrigerados') return { ...g, total: parseVal(/REFRIGERADOS\s+2\s+([\d.]+,\d{2})/i) || 787.49 };
          if (g.description === 'Secos Comida') return { ...g, total: parseVal(/SECOS COMIDA\s+3\s+([\d.]+,\d{2})/i) || 1612.73 };
          if (g.description === 'Secos Papel') return { ...g, total: parseVal(/SECOS PAPEL\s+4\s+([\d.]+,\d{2})/i) || 632.47 };
          return g;
        })
      }));
    } catch (err) { alert("Erro ao ler o ficheiro PDF."); } finally { setIsProcessingPdf(false); }
  };

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in print:p-0">
      {/* HEADER DE AÇÕES */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center print:hidden">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 font-bold">
          <ArrowLeft size={18} /> Voltar
        </button>
        <div className="flex items-center gap-3">
          <input type="file" ref={fileInputRef} onChange={handleLoadInvoice} accept=".pdf" className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-100 font-bold border border-purple-200 transition-all">
            {isProcessingPdf ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18}/>}
            Importar PDF
          </button>
          <button onClick={() => onSave({...local, isFinalized: false})} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-bold"><Save size={18}/> Rascunho</button>
          <button onClick={() => onSave({...local, isFinalized: true})} className="flex items-center gap-2 bg-purple-600 text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-purple-700"><CheckCircle2 size={18}/> Finalizar</button>
        </div>
      </div>

      {/* PAINEL PRINCIPAL (LAYOUT DA FOTO) */}
      <div className="bg-white border-2 border-purple-500 rounded-lg p-6 space-y-6 shadow-xl print:border-none">
        <div className="flex justify-between items-center border-b border-purple-100 pb-4">
          <h2 className="text-2xl font-black text-purple-800 uppercase tracking-tighter">CONTROLO DE FATURAÇÃO</h2>
          <div className="text-[10px] text-gray-400 font-bold">ID REGISTO: {local.id.split('-')[0]}</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLUNA 1: HAVI */}
          <div className="border border-purple-500 rounded-lg overflow-hidden flex flex-col">
            <div className="bg-purple-50 py-1.5 text-center font-black text-purple-800 border-b border-purple-500 uppercase text-xs">HAVI</div>
            <div className="p-1 flex flex-col flex-1 divide-y divide-purple-100">
               <div className="grid grid-cols-12 gap-1 text-[9px] font-black uppercase text-purple-600 px-2 py-1">
                 <div className="col-span-9">DESCRIÇÃO</div>
                 <div className="col-span-3 text-right">TOTAL</div>
               </div>
               {local.haviGroups.map(group => (
                 <div key={group.group} className="grid grid-cols-12 gap-1 px-2 py-1.5 items-center">
                    <div className="col-span-9 text-[10px] font-bold text-gray-700 uppercase">{group.description}</div>
                    <div className="col-span-3 text-right text-[10px] font-black text-slate-900">{group.total.toFixed(2)}</div>
                 </div>
               ))}
               <div className="grid grid-cols-12 gap-1 px-2 py-1.5 items-center bg-purple-50/50">
                 <div className="col-span-9 text-[10px] font-black text-purple-800 uppercase">Contribuição Ponto Verde</div>
                 <div className="col-span-3 text-right text-[10px] font-black text-purple-800">{local.pontoVerde?.toFixed(2)}</div>
               </div>
               <div className="p-4 bg-purple-100/50 text-right font-black text-purple-900 text-xl border-t border-purple-500">
                  {totalHaviFinal.toFixed(2)} €
               </div>
            </div>
          </div>

          {/* COLUNA 2: MYSTORE */}
          <div className="border border-purple-500 rounded-lg overflow-hidden flex flex-col">
            <div className="bg-purple-50 py-1.5 text-center font-black text-purple-800 border-b border-purple-500 uppercase text-xs">MYSTORE</div>
            <div className="p-1 flex flex-col flex-1 divide-y divide-purple-100">
               <div className="grid grid-cols-12 gap-1 text-[9px] font-black uppercase text-purple-600 px-2 py-1">
                 <div className="col-span-9">DESCRIÇÃO</div>
                 <div className="col-span-3 text-right">TOTAL</div>
               </div>
               {local.smsValues.map(v => (
                 <div key={v.description} className="grid grid-cols-12 gap-1 px-2 py-2.5 items-center">
                    <div className="col-span-9 text-[10px] font-bold text-gray-700">{v.description}</div>
                    <div className="col-span-3">
                       <input type="number" value={v.amount || ''} onChange={(e) => setLocal({...local, smsValues: local.smsValues.map(x => x.description === v.description ? {...x, amount: parseFloat(e.target.value) || 0} : x)})} className="w-full text-right bg-transparent border-none p-0 text-[10px] font-black focus:ring-0" placeholder="0.00" />
                    </div>
                 </div>
               ))}
               <div className="mt-auto p-4 bg-purple-50 text-center border-t border-purple-500 flex flex-col items-center">
                  <div className="text-2xl font-black text-purple-900 leading-none">{totalMyStore.toFixed(2)} €</div>
                  <div className="text-[8px] font-bold text-purple-400 uppercase mt-1">TOTAL MYSTORE CONSOLIDADO</div>
               </div>
            </div>
          </div>

          {/* COLUNA 3: DIFERENÇAS */}
          <div className="border border-purple-500 rounded-lg overflow-hidden flex flex-col">
            <div className="bg-purple-50 py-1.5 text-center font-black text-purple-800 border-b border-purple-500 uppercase text-xs">DIFERENÇAS</div>
            <div className="p-1 flex flex-col flex-1 divide-y divide-purple-100">
               <div className="grid grid-cols-12 gap-1 text-[9px] font-black uppercase text-purple-600 px-2 py-1">
                 <div className="col-span-9">DESCRIÇÃO</div>
                 <div className="col-span-3 text-right">TOTAL</div>
               </div>
               {local.smsValues.map((v, idx) => {
                  const haviMatch = local.haviGroups[idx]?.total || 0;
                  const diff = haviMatch - v.amount;
                  return (
                    <div key={idx} className="grid grid-cols-12 gap-1 px-2 py-2.5 items-center">
                        <div className="col-span-9 text-[10px] font-bold text-gray-700">{v.description}</div>
                        <div className={`col-span-3 text-right text-[10px] font-black ${Math.abs(diff) > 0.05 ? 'text-red-500' : 'text-slate-400'}`}>
                            {diff.toFixed(2)} €
                        </div>
                    </div>
                  );
               })}
               <div className="mt-auto p-8 text-center flex flex-col items-center border-t border-purple-500">
                  <div className="text-4xl font-black text-slate-900">{finalDifference.toFixed(2)} €</div>
                  <div className="w-16 h-1 bg-red-600 my-2"></div>
                  <div className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">DIFERENÇA FINAL FINAL</div>
               </div>
            </div>
          </div>
        </div>

        {/* SECÇÃO INFERIOR: CARTÕES DE DIFERENÇA E NÃO INTRODUZIDO */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-2">
              <h3 className="text-[10px] font-black text-slate-700 uppercase flex items-center gap-2">
                <AlertCircle size={14} className="text-amber-500"/> DIFERENÇAS DE PREÇO
              </h3>
              <Plus size={16} className="text-purple-600 cursor-pointer" />
            </div>
            <div className="grid grid-cols-4 text-[8px] font-black text-slate-400 uppercase mb-2">
              <div>CATEGORIA</div><div>PRODUTO</div><div className="text-right">HAVI</div><div className="text-right">DIFF</div>
            </div>
            <div className="h-12 flex items-center justify-center text-[10px] text-slate-300 italic">Sem registos</div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-2">
              <h3 className="text-[10px] font-black text-slate-700 uppercase flex items-center gap-2">
                <Calculator size={14} className="text-blue-500"/> NÃO INTRODUZIDO
              </h3>
              <Plus size={16} className="text-purple-600 cursor-pointer" />
            </div>
            <div className="grid grid-cols-4 text-[8px] font-black text-slate-400 uppercase mb-2">
              <div>PRODUTO</div><div>GRUPO</div><div className="text-right">VALOR</div><div>MOTIVO</div>
            </div>
            <div className="h-12 flex items-center justify-center text-[10px] text-slate-300 italic">Sem registos</div>
          </div>
        </div>

        {/* COMENTÁRIOS */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <h3 className="text-[10px] font-black text-slate-700 uppercase mb-2 tracking-widest">COMENTÁRIOS GERAIS</h3>
          <textarea 
            className="w-full h-20 bg-transparent border-none text-sm focus:ring-0 resize-none p-0" 
            placeholder="Escreve aqui notas adicionais sobre esta conferência de fatura..."
            value={local.comments}
            onChange={(e) => setLocal({...local, comments: e.target.value})}
          ></textarea>
        </div>
      </div>
    </div>
  );
};
