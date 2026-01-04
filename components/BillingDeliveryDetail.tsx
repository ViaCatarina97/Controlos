import React, { useState, useMemo, useRef } from 'react';
import { DeliveryRecord, Employee } from '../types';
import { ArrowLeft, Plus, CheckCircle2, UploadCloud, Loader2, AlertCircle, Trash2, X, Save } from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

interface PriceDiffItem {
  id: string;
  product: string;
  haviPrice: number;
  myStorePrice: number;
}

interface BillingDeliveryDetailProps {
  record: DeliveryRecord;
  employees: Employee[];
  onSave: (record: DeliveryRecord) => void;
  onBack: () => void;
}

export const BillingDeliveryDetail: React.FC<BillingDeliveryDetailProps> = ({ record, employees, onSave, onBack }) => {
  const [local, setLocal] = useState<DeliveryRecord>(record);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [priceDiffs, setPriceDiffs] = useState<PriceDiffItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDiff, setNewDiff] = useState({ product: '', havi: 0, mystore: 0 });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalHaviFinal = useMemo(() => 
    local.haviGroups.reduce((s, g) => s + g.total, 0)
  , [local.haviGroups]);

  const totalMyStore = useMemo(() => 
    local.smsValues.reduce((s, v) => s + v.amount, 0)
  , [local.smsValues]);

  const finalDifference = totalHaviFinal - totalMyStore;

  const handleAddPriceDiff = () => {
    if (!newDiff.product) return;
    const item: PriceDiffItem = {
      id: Date.now().toString(),
      product: newDiff.product,
      haviPrice: newDiff.havi,
      myStorePrice: newDiff.mystore
    };
    setPriceDiffs([...priceDiffs, item]);
    setNewDiff({ product: '', havi: 0, mystore: 0 });
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

      const extractValTotal = (name: string) => {
        const regex = new RegExp(`${name}[^\\n]*?[\\d.]+,\\d{2}\\s*EUR[^\\n]*?[\\d.]+,\\d{2}\\s*EUR[^\\n]*?[\\d.]+,\\d{2}\\s*EUR[^\\n]*?([\\d.]+,\\d{2})\\s*EUR`, 'i');
        const match = fullText.match(regex);
        return match ? parseFloat(match[1].replace(/\./g, '').replace(',', '.')) : 0;
      };

      const updatedGroups = local.haviGroups.map(g => {
        if (g.description.includes('Congelados')) return { ...g, total: extractValTotal('CONGELADOS') };
        if (g.description.includes('Ferramentas')) return { ...g, total: extractValTotal('FERRAMENTAS & UTENSÍLIOS') };
        if (g.description.includes('Bulk Alimentar')) return { ...g, total: extractValTotal('BULK ALIMENTAR') };
        if (g.description.includes('Refrigerados')) return { ...g, total: extractValTotal('REFRIGERADOS') };
        if (g.description.includes('Bulk Papel')) return { ...g, total: extractValTotal('BULK PAPEL') };
        if (g.description.includes('Secos Comida')) return { ...g, total: extractValTotal('SECOS COMIDA') };
        if (g.description.includes('Secos Papel')) return { ...g, total: extractValTotal('SECOS PAPEL') };
        if (g.description.includes('Produtos Frescos')) return { ...g, total: extractValTotal('PRODUTOS FRESCOS') };
        if (g.description.includes('Manutenção')) return { ...g, total: extractValTotal('MANUTENÇÃO & LIMPEZA COMPRAS') };
        return g;
      });

      setLocal(prev => ({ ...prev, haviGroups: updatedGroups }));
    } catch (err) { alert("Erro ao ler PDF."); } finally { setIsProcessingPdf(false); }
  };

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in relative">
      {/* MODAL / POPUP PARA DIFERENÇA DE PREÇOS */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-purple-100 animate-in fade-in zoom-in duration-200">
            <div className="bg-purple-600 p-4 flex justify-between items-center text-white">
              <h3 className="font-black uppercase text-xs tracking-widest flex items-center gap-2">
                <Plus size={16} /> Nova Diferença de Preço
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 p-1 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase">Nome do Produto</label>
                <input 
                  type="text" 
                  autoFocus
                  value={newDiff.product} 
                  onChange={e => setNewDiff({...newDiff, product: e.target.value})} 
                  className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm focus:border-purple-500 focus:ring-0 transition-all bg-slate-50 font-bold" 
                  placeholder="Ex: Coca-Cola 33cl"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase">Preço Havi (€)</label>
                  <input 
                    type="number" 
                    step="0.0001"
                    value={newDiff.havi || ''} 
                    onChange={e => setNewDiff({...newDiff, havi: parseFloat(e.target.value) || 0})} 
                    className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm focus:border-purple-500 focus:ring-0 transition-all bg-slate-50 font-black" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase">Preço MyStore (€)</label>
                  <input 
                    type="number" 
                    step="0.0001"
                    value={newDiff.mystore || ''} 
                    onChange={e => setNewDiff({...newDiff, mystore: parseFloat(e.target.value) || 0})} 
                    className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm focus:border-purple-500 focus:ring-0 transition-all bg-slate-50 font-black" 
                  />
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-xl flex justify-between items-center border border-purple-100">
                <span className="text-[10px] font-black text-purple-400 uppercase">Diferença Calculada:</span>
                <span className={`text-lg font-black ${(newDiff.havi - newDiff.mystore) !== 0 ? 'text-red-600' : 'text-slate-400'}`}>
                  {(newDiff.havi - newDiff.mystore).toFixed(4)} €
                </span>
              </div>

              <button 
                onClick={handleAddPriceDiff}
                disabled={!newDiff.product}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-black py-4 rounded-xl shadow-lg shadow-purple-200 transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-widest"
              >
                <Save size={18} /> Guardar Diferença
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER PRINCIPAL */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center print:hidden">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 font-bold italic"><ArrowLeft size={18} /> Voltar</button>
        <div className="flex items-center gap-3">
          <input type="file" ref={fileInputRef} onChange={handleLoadInvoice} accept=".pdf" className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="bg-amber-500 text-white px-6 py-2 rounded-lg font-black uppercase text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20">
            <UploadCloud size={16} /> Importar Fatura PDF
          </button>
          <button onClick={() => onSave({...local, isFinalized: true})} className="bg-purple-600 text-white px-6 py-2 rounded-lg font-black uppercase text-xs flex items-center gap-2 shadow-lg shadow-purple-500/20">
            <CheckCircle2 size={16} /> Finalizar e Gravar
          </button>
        </div>
      </div>

      {/* PAINEL DE TOTAIS */}
      <div className="bg-white border-2 border-purple-500 rounded-lg p-6 space-y-6 shadow-xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* HAVI */}
          <div className="border border-purple-500 rounded-lg overflow-hidden flex flex-col">
            <div className="bg-purple-50 py-1.5 text-center font-black text-purple-800 border-b border-purple-500 uppercase text-[10px] tracking-widest">HAVI</div>
            <div className="p-1 flex-1 divide-y divide-purple-100">
               {local.haviGroups.map(group => (
                 <div key={group.group} className="grid grid-cols-12 px-2 py-1.5 items-center hover:bg-purple-50/50">
                    <div className="col-span-9 text-[10px] font-bold text-gray-700 uppercase">
                      {group.description.includes('Manutenção') ? 'MANUTENÇÃO & LIMPEZA COMPRAS' : group.description}
                    </div>
                    <div className="col-span-3 text-right text-[10px] font-black">{group.total.toFixed(2)}</div>
                 </div>
               ))}
               <div className="p-4 bg-purple-100/50 text-right font-black text-purple-900 text-2xl border-t border-purple-500 italic">{totalHaviFinal.toFixed(2)} €</div>
            </div>
          </div>

          {/* MYSTORE */}
          <div className="border border-purple-500 rounded-lg overflow-hidden flex flex-col">
            <div className="bg-purple-50 py-1.5 text-center font-black text-purple-800 border-b border-purple-500 uppercase text-[10px] tracking-widest">MYSTORE</div>
            <div className="p-1 flex-1 divide-y divide-purple-100">
               {local.smsValues.map(v => (
                 <div key={v.description} className="grid grid-cols-12 px-2 py-2.5 items-center">
                    <div className="col-span-8 text-[10px] font-bold text-gray-700 uppercase">{v.description}</div>
                    <div className="col-span-4">
                      <input 
                        type="number" 
                        value={v.amount || ''} 
                        onChange={(e) => setLocal({...local, smsValues: local.smsValues.map(x => x.description === v.description ? {...x, amount: parseFloat(e.target.value) || 0} : x)})} 
                        className="w-full text-right bg-transparent border-none p-0 text-[11px] font-black focus:ring-0 text-slate-800" 
                      />
                    </div>
                 </div>
               ))}
               <div className="mt-auto p-6 bg-purple-50/30 text-center border-t border-purple-500">
                  <div className="text-3xl font-black text-purple-900 italic">{totalMyStore.toFixed(2)} €</div>
                  <div className="text-[8px] font-bold text-purple-400 uppercase mt-2">TOTAL MYSTORE CONSOLIDADO</div>
               </div>
            </div>
          </div>

          {/* DIFERENÇAS */}
          <div className="border border-purple-500 rounded-lg overflow-hidden flex flex-col bg-slate-50/30 text-center p-8 justify-center">
             <div className={`text-5xl font-black italic tracking-tighter ${Math.abs(finalDifference) > 0.05 ? 'text-red-600' : 'text-emerald-600'}`}>
               {finalDifference.toFixed(2)} €
             </div>
             <div className="text-[10px] font-black text-gray-400 uppercase mt-4">DIFERENÇA TOTAL FINAL</div>
          </div>
        </div>

        {/* DIFERENÇAS DE PREÇO - LISTA */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h3 className="text-[10px] font-black text-slate-800 uppercase italic flex items-center gap-2">
              <AlertCircle size={14} className="text-amber-500"/> DIFERENÇAS DE PREÇO (POR ARTIGO)
            </h3>
            <button 
              onClick={() => setIsModalOpen(true)} 
              className="bg-purple-100 text-purple-600 p-1.5 rounded-lg hover:bg-purple-200 transition-all flex items-center gap-1 font-black text-[10px]"
            >
              <Plus size={14} /> ADICIONAR PRODUTO
            </button>
          </div>

          <div className="space-y-1">
            <div className="grid grid-cols-12 text-[9px] font-black text-slate-400 uppercase px-3 py-1 border-b">
              <div className="col-span-5">PRODUTO</div>
              <div className="col-span-2 text-right">HAVI</div>
              <div className="col-span-2 text-right">MYSTORE</div>
              <div className="col-span-2 text-right text-purple-600">DIFF</div>
              <div className="col-span-1"></div>
            </div>
            {priceDiffs.length === 0 ? (
              <div className="h-10 flex items-center justify-center text-[10px] text-slate-300 font-black uppercase italic tracking-widest">Nenhuma diferença registada</div>
            ) : (
              priceDiffs.map(item => (
                <div key={item.id} className="grid grid-cols-12 px-3 py-2 bg-slate-50/50 rounded items-center text-[10px] font-bold border-b border-white hover:bg-purple-50 transition-colors">
                  <div className="col-span-5 text-slate-700 uppercase">{item.product}</div>
                  <div className="col-span-2 text-right">{item.haviPrice.toFixed(4)} €</div>
                  <div className="col-span-2 text-right">{item.myStorePrice.toFixed(4)} €</div>
                  <div className={`col-span-2 text-right font-black ${Math.abs(item.haviPrice - item.myStorePrice) > 0.0001 ? 'text-red-500' : 'text-slate-400'}`}>
                    {(item.haviPrice - item.myStorePrice).toFixed(4)} €
                  </div>
                  <div className="col-span-1 text-right">
                    <button onClick={() => setPriceDiffs(priceDiffs.filter(i => i.id !== item.id))} className="text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
