import React, { useState, useMemo, useRef } from 'react';
import { DeliveryRecord, Employee } from '../types';
import { ArrowLeft, Plus, CheckCircle2, UploadCloud, Trash2, X, AlertCircle } from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';

// Configuração do Worker via CDN para garantir compatibilidade no Vercel
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

interface PriceDiffItem {
  id: string;
  group: string;
  product: string;
  haviPrice: number;
  myStorePrice: number;
}

const GRUPOS_ORDER = [
  "Congelados", "Refrigerados", "Secos Comida", "Secos Papel", "Manutenção Limpeza",
  "Marketing IPL", "Marketing Geral", "Produtos Frescos", "MANUTENÇÃO & LIMPEZA COMPRAS",
  "Condimentos", "Condimentos Cozinha", "Material Adm", "Manuais", "Ferramentas Utensilios",
  "Marketing Geral Custo", "Fardas", "Distribuição de Marketing", "Bulk Alimentar", "Bulk Papel"
];

export const BillingDeliveryDetail: React.FC<{record: DeliveryRecord, onSave: any, onBack: any}> = ({ record, onSave, onBack }) => {
  const [local, setLocal] = useState<DeliveryRecord>(record);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [priceDiffs, setPriceDiffs] = useState<PriceDiffItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDiff, setNewDiff] = useState({ group: GRUPOS_ORDER[0], product: '', havi: 0, mystore: 0 });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Função para formatar números com vírgula para a interface
  const formatNumeric = (val: number) => val.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const totalHaviFinal = useMemo(() => local.haviGroups.reduce((s, g) => s + g.total, 0), [local.haviGroups]);
  const totalMyStore = useMemo(() => local.smsValues.reduce((s, v) => s + v.amount, 0), [local.smsValues]);
  const finalDifference = totalHaviFinal - totalMyStore;

  const handleAddPriceDiff = () => {
    if (!newDiff.product) return;
    setPriceDiffs([...priceDiffs, { ...newDiff, id: Date.now().toString(), haviPrice: newDiff.havi, myStorePrice: newDiff.mystore }]);
    setNewDiff({ group: GRUPOS_ORDER[0], product: '', havi: 0, mystore: 0 });
    setIsModalOpen(false);
  };

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

      const extractValorTotal = (name: string) => {
        // Regex ajustada para escapar o '&' e capturar a 4ª coluna de valores
        const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`${escapedName}[^\\n]*?[\\d.]+,\\d{2}\\s*EUR[^\\n]*?[\\d.]+,\\d{2}\\s*EUR[^\\n]*?[\\d.]+,\\d{2}\\s*EUR[^\\n]*?([\\d.]+,\\d{2})\\s*EUR`, 'i');
        const match = fullText.match(regex);
        return match ? parseFloat(match[1].replace(/\./g, '').replace(',', '.')) : 0;
      };

      const updatedGroups = local.haviGroups.map(g => {
        const desc = g.description.toUpperCase().trim();
        if (desc.includes('CONGELADOS')) return { ...g, total: extractValorTotal('CONGELADOS') };
        if (desc.includes('REFRIGERADOS')) return { ...g, total: extractValorTotal('REFRIGERADOS') };
        if (desc.includes('SECOS COMIDA')) return { ...g, total: extractValorTotal('SECOS COMIDA') };
        if (desc.includes('SECOS PAPEL')) return { ...g, total: extractValorTotal('SECOS PAPEL') };
        if (desc.includes('PRODUTOS FRESCOS')) return { ...g, total: extractValorTotal('PRODUTOS FRESCOS') };
        if (desc.includes('MANUTENÇÃO & LIMPEZA COMPRAS')) return { ...g, total: extractValorTotal('MANUTENÇÃO & LIMPEZA COMPRAS') };
        if (desc.includes('FERRAMENTAS')) return { ...g, total: extractValorTotal('FERRAMENTAS & UTENSÍLIOS') };
        if (desc.includes('BULK ALIMENTAR')) return { ...g, total: extractValorTotal('BULK ALIMENTAR') };
        if (desc.includes('BULK PAPEL')) return { ...g, total: extractValorTotal('BULK PAPEL') };
        return g;
      });

      setLocal(prev => ({ ...prev, haviGroups: updatedGroups }));
      alert("Importação concluída com sucesso!");
    } catch (err) {
      alert("Erro ao processar PDF.");
    } finally {
      setIsProcessingPdf(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in relative">
      {/* POPUP DE INSERÇÃO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-purple-100 overflow-hidden">
            <div className="bg-purple-600 p-4 flex justify-between items-center text-white">
              <h3 className="font-black uppercase text-xs tracking-tighter italic font-sans">Nova Diferença de Preço</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase">Grupo</label>
                <select value={newDiff.group} onChange={e => setNewDiff({...newDiff, group: e.target.value})} className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm font-bold bg-slate-50 focus:border-purple-500 outline-none">
                  {GRUPOS_ORDER.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Preço Havi" onChange={e => setNewDiff({...newDiff, havi: parseFloat(e.target.value) || 0})} className="border-2 border-slate-100 rounded-xl p-3 text-sm font-black bg-slate-50" />
                <input type="number" placeholder="Preço MyStore" onChange={e => setNewDiff({...newDiff, mystore: parseFloat(e.target.value) || 0})} className="border-2 border-slate-100 rounded-xl p-3 text-sm font-black bg-slate-50" />
              </div>
              <button onClick={handleAddPriceDiff} className="w-full bg-purple-600 text-white font-black py-4 rounded-xl uppercase text-xs tracking-widest shadow-lg">Guardar Registo</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center print:hidden">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 font-bold italic"><ArrowLeft size={18} /> Voltar</button>
        <div className="flex items-center gap-3">
          <input type="file" ref={fileInputRef} onChange={handleLoadInvoice} accept=".pdf" className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="bg-amber-500 text-white px-6 py-2 rounded-lg font-black uppercase text-xs flex items-center gap-2">
            <UploadCloud size={16}/> Importar Fatura PDF
          </button>
          <button onClick={() => onSave({...local, isFinalized: true})} className="bg-purple-600 text-white px-6 py-2 rounded-lg font-black uppercase text-xs">Finalizar</button>
        </div>
      </div>

      {/* PAINEL DE 3 COLUNAS */}
      <div className="bg-white border-2 border-purple-500 rounded-lg p-6 shadow-xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="border border-purple-500 rounded-lg overflow-hidden flex flex-col">
            <div className="bg-purple-50 py-1.5 text-center font-black text-purple-800 border-b border-purple-500 text-[10px]">HAVI</div>
            <div className="p-1 flex-1 divide-y divide-purple-100">
               {GRUPOS_ORDER.map(desc => {
                 const group = local.haviGroups.find(g => g.description.toLowerCase().trim() === desc.toLowerCase().trim()) || { total: 0 };
                 return (
                   <div key={desc} className="grid grid-cols-12 px-2 py-1 items-center">
                      <div className="col-span-9 text-[9px] font-bold text-gray-700 uppercase">{desc}</div>
                      <div className="col-span-3 text-right text-[10px] font-black">{formatNumeric(group.total)}</div>
                   </div>
                 );
               })}
               <div className="p-4 bg-purple-100/50 text-right font-black text-purple-900 text-2xl italic border-t border-purple-500">{formatNumeric(totalHaviFinal)} €</div>
            </div>
          </div>

          <div className="border border-purple-500 rounded-lg overflow-hidden flex flex-col">
            <div className="bg-purple-50 py-1.5 text-center font-black text-purple-800 border-b border-purple-500 text-[10px]">MYSTORE</div>
            <div className="p-1 flex-1 divide-y divide-purple-100">
               {local.smsValues.map(v => (
                 <div key={v.description} className="grid grid-cols-12 px-2 py-2 items-center">
                    <div className="col-span-8 text-[10px] font-bold text-gray-700 uppercase">{v.description}</div>
                    <div className="col-span-4 text-right text-[11px] font-black">{formatNumeric(v.amount)}</div>
                 </div>
               ))}
               <div className="mt-auto p-6 bg-purple-50/30 text-center border-t border-purple-500">
                  <div className="text-3xl font-black text-purple-900 italic leading-none">{formatNumeric(totalMyStore)} €</div>
               </div>
            </div>
          </div>

          <div className="border border-purple-500 rounded-lg overflow-hidden flex flex-col bg-slate-50/30 text-center p-8 justify-center">
             <div className={`text-5xl font-black italic tracking-tighter ${Math.abs(finalDifference) > 0.05 ? 'text-red-600' : 'text-emerald-600'}`}>{formatNumeric(finalDifference)} €</div>
             <div className="text-[10px] font-black text-gray-400 uppercase mt-4 italic font-sans">Diferença Total Final</div>
          </div>
        </div>
      </div>
    </div>
  );
};
