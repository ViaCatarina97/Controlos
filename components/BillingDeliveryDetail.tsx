import React, { useState, useMemo, useRef } from 'react';
import { DeliveryRecord, Employee, MissingProduct } from '../types';
import { ArrowLeft, Plus, Trash2, UploadCloud, Loader2, AlertCircle, X, PackageX, CheckCircle2 } from 'lucide-react';

interface PriceDiffItem {
  id: string;
  group: string;
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

const GRUPOS_ORDER = [
  "Congelados", "Refrigerados", "Secos Comida", "Secos Papel", "Manutenção Limpeza",
  "Marketing IPL", "Marketing Geral", "Produtos Frescos", "MANUTENÇÃO & LIMPEZA COMPRAS",
  "Condimentos", "Condimentos Cozinha", "Material Adm", "Manuais", "Ferramentas & Utensílios",
  "Marketing Geral Custo", "Fardas", "Distribuição de Marketing", "Bulk Alimentar", "Bulk Papel"
];

export const BillingDeliveryDetail: React.FC<BillingDeliveryDetailProps> = ({ record, employees, onSave, onBack }) => {
  const [local, setLocal] = useState<DeliveryRecord>(record);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [priceDiffs, setPriceDiffs] = useState<PriceDiffItem[]>([]);
  const [missingProducts, setMissingProducts] = useState<MissingProduct[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDiff, setNewDiff] = useState({ group: GRUPOS_ORDER[0], product: '', havi: 0, mystore: 0 });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatNumeric = (val: number) => val.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatLongNumeric = (val: number) => val.toLocaleString('pt-PT', { minimumFractionDigits: 4, maximumFractionDigits: 4 });

  const totalHaviFinal = useMemo(() => local.haviGroups.reduce((s, g) => s + g.total, 0), [local.haviGroups]);
  const totalMyStore = useMemo(() => local.smsValues.reduce((s, v) => s + v.amount, 0), [local.smsValues]);
  const finalDifference = totalHaviFinal - totalMyStore;

  const handleAddPriceDiff = () => {
    if (!newDiff.product) return;
    setPriceDiffs([...priceDiffs, { ...newDiff, id: crypto.randomUUID(), haviPrice: newDiff.havi, myStorePrice: newDiff.mystore }]);
    setNewDiff({ group: GRUPOS_ORDER[0], product: '', havi: 0, mystore: 0 });
    setIsModalOpen(false);
  };

  const handleLoadInvoice = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingPdf(true);
    try {
      const pdfjsLib = (window as any)['pdfjs-dist/build/pdf'] || (window as any).pdfjsLib;
      if (!pdfjsLib) throw new Error("Motor PDF não carregado. Verifique o index.html.");
      
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map((item: any) => item.str).join(" ") + " \n ";
      }

      // EXTRAÇÃO OTIMIZADA PARA A COLUNA 'VALOR TOTAL'
      const extractValorTotal = (name: string) => {
        // Normaliza o nome: escapa o &, permite qualquer caractere entre palavras (espaços/quebras)
        const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '.*?');
        
        // Esta regex procura o nome do grupo e captura TODAS as ocorrências de valores "0,00 EUR" na linha
        const lineRegex = new RegExp(`${escapedName}[^\\n]*?([\\d.]+,\\d{2})\\s*EUR`, 'gi');
        const matches = fullText.match(lineRegex);
        
        if (matches) {
          // Na fatura HAVI, o VALOR TOTAL é sempre o ÚLTIMO valor da linha
          const lastMatch = matches[matches.length - 1];
          const valMatch = lastMatch.match(/([\d.]+,\d{2})\s*EUR/i);
          return valMatch ? parseFloat(valMatch[1].replace(/\./g, '').replace(',', '.')) : 0;
        }
        return 0;
      };

      const updatedGroups = local.haviGroups.map(g => {
        const desc = g.description.toUpperCase().trim();
        const val = extractValorTotal(desc);
        // Se o valor extraído for válido, atualiza o grupo
        return val > 0 ? { ...g, total: val } : g;
      });

      setLocal(prev => ({ 
        ...prev, 
        haviGroups: updatedGroups,
        // Também tenta extrair o Ponto Verde Total da linha final se existir
        pontoVerde: extractValorTotal('TOTAL') || prev.pontoVerde 
      }));

      alert("Importação da coluna 'Valor Total' concluída!");
    } catch (err: any) {
      alert(err.message || "Erro ao ler PDF.");
    } finally {
      setIsProcessingPdf(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in relative pb-10">
      {/* MODAL DIFERENÇA PREÇO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-purple-100 overflow-hidden">
            <div className="bg-purple-600 p-4 flex justify-between items-center text-white">
              <h3 className="font-black uppercase text-xs italic">Nova Diferença de Preço</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <label className="block text-[10px] font-black text-gray-400 uppercase">Grupo</label>
              <select value={newDiff.group} onChange={e => setNewDiff({...newDiff, group: e.target.value})} className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm font-bold bg-slate-50">
                {GRUPOS_ORDER.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <input type="text" placeholder="Nome do Produto" value={newDiff.product} onChange={e => setNewDiff({...newDiff, product: e.target.value})} className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm font-bold bg-slate-50" />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Preço Havi" step="0.0001" onChange={e => setNewDiff({...newDiff, havi: parseFloat(e.target.value) || 0})} className="border-2 border-slate-100 rounded-xl p-3 text-sm font-black bg-slate-50" />
                <input type="number" placeholder="Preço MyStore" step="0.0001" onChange={e => setNewDiff({...newDiff, mystore: parseFloat(e.target.value) || 0})} className="border-2 border-slate-100 rounded-xl p-3 text-sm font-black bg-slate-50" />
              </div>
              <button onClick={handleAddPriceDiff} className="w-full bg-purple-600 text-white font-black py-4 rounded-xl uppercase text-xs shadow-lg">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER DE AÇÕES */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center print:hidden">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 font-bold italic hover:text-gray-800"><ArrowLeft size={18} /> Voltar</button>
        <div className="flex items-center gap-3">
          <input type="file" ref={fileInputRef} onChange={handleLoadInvoice} accept=".pdf" className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="bg-amber-500 text-white px-6 py-2 rounded-lg font-black uppercase text-xs flex items-center gap-2 shadow-lg hover:bg-amber-600 transition-all">
            {isProcessingPdf ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16}/>} Importar Valor Total
          </button>
          <button onClick={() => onSave({...local, isFinalized: true})} className="bg-purple-600 text-white px-6 py-2 rounded-lg font-black uppercase text-xs shadow-md shadow-purple-200">Finalizar</button>
        </div>
      </div>

      {/* PAINEL PRINCIPAL 3 COLUNAS */}
      <div className="bg-white border-2 border-purple-500 rounded-lg p-6 shadow-xl print:border-none">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="border border-purple-500 rounded-lg overflow-hidden flex flex-col">
            <div className="bg-purple-50 py-1.5 text-center font-black text-purple-800 border-b border-purple-500 text-[10px] uppercase">HAVI</div>
            <div className="p-1 divide-y divide-purple-100 flex-1">
               {GRUPOS_ORDER.map(desc => {
                 const group = local.haviGroups.find(g => g.description.toUpperCase().trim() === desc.toUpperCase().trim()) || { total: 0 };
                 return (
                   <div key={desc} className="grid grid-cols-12 px-2 py-1 items-center hover:bg-purple-50 transition-colors">
                      <div className="col-span-9 text-[9px] font-bold text-gray-700 uppercase">{desc}</div>
                      <div className="col-span-3 text-right text-[10px] font-black">{formatNumeric(group.total)}</div>
                   </div>
                 );
               })}
               <div className="p-4 bg-purple-100/50 text-right font-black text-purple-900 text-2xl border-t border-purple-500 italic">{formatNumeric(totalHaviFinal)} €</div>
            </div>
          </div>

          <div className="border border-purple-500 rounded-lg overflow-hidden flex flex-col">
            <div className="bg-purple-50 py-1.5 text-center font-black text-purple-800 border-b border-purple-500 text-[10px] uppercase">MYSTORE</div>
            <div className="p-1 divide-y divide-purple-100 flex-1">
               {local.smsValues.map(v => (
                 <div key={v.description} className="grid grid-cols-12 px-2 py-2 items-center hover:bg-slate-50 transition-colors">
                    <div className="col-span-8 text-[10px] font-bold text-gray-700 uppercase">{v.description}</div>
                    <div className="col-span-4">
                      <input 
                        type="number" step="0.01" value={v.amount || ''} 
                        onChange={(e) => setLocal({
                          ...local, 
                          smsValues: local.smsValues.map(x => x.description === v.description ? {...x, amount: parseFloat(e.target.value) || 0} : x)
                        })} 
                        className="w-full text-right bg-white border border-slate-200 rounded px-1 text-[11px] font-black focus:ring-1 focus:ring-purple-500 outline-none" 
                        placeholder="0,00"
                      />
                    </div>
                 </div>
               ))}
               <div className="mt-auto p-6 bg-purple-50/30 text-center border-t border-purple-500">
                  <div className="text-3xl font-black text-purple-900 italic leading-none">{formatNumeric(totalMyStore)} €</div>
               </div>
            </div>
          </div>

          <div className="border border-purple-500 rounded-lg overflow-hidden flex flex-col bg-slate-50/30 text-center p-8 justify-center">
             <div className={`text-5xl font-black italic tracking-tighter ${Math.abs(finalDifference) > 0.05 ? 'text-red-600' : 'text-emerald-600'}`}>{formatNumeric(finalDifference)} €</div>
             <div className="text-[10px] font-black text-gray-400 uppercase mt-4 italic">Diferença Total</div>
          </div>
        </div>
      </div>

      {/* TABELAS INFERIORES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm min-h-[200px]">
          <div className="flex justify-between items-center mb-4 border-b pb-2 text-slate-800 uppercase italic font-black text-[10px]">
            <span className="flex items-center gap-2"><AlertCircle size={14} className="text-amber-500"/> Diferenças Artigo</span>
            <button onClick={() => setIsModalOpen(true)} className="text-purple-600 p-1 hover:bg-purple-50 rounded transition-colors"><Plus size={18} /></button>
          </div>
          <div className="space-y-1">
             {priceDiffs.map(item => (
                <div key={item.id} className="grid grid-cols-12 px-3 py-2 bg-slate-50/50 rounded items-center text-[10px] font-bold border-b border-white hover:bg-purple-50 transition-colors">
                  <div className="col-span-5 text-slate-700 uppercase truncate mr-1">{item.product}</div>
                  <div className="col-span-3 text-right text-slate-400 font-normal">H: {formatLongNumeric(item.haviPrice)}</div>
                  <div className="col-span-3 text-right text-red-500 font-black">Dif: {formatNumeric(item.haviPrice - item.myStorePrice)}</div>
                  <div className="col-span-1 text-right"><button onClick={() => setPriceDiffs(priceDiffs.filter(i => i.id !== item.id))}><Trash2 size={14} className="text-slate-300 hover:text-red-500 transition-colors"/></button></div>
                </div>
             ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm min-h-[200px]">
          <div className="flex justify-between items-center mb-4 border-b pb-2 text-slate-800 uppercase italic font-black text-[10px]">
            <span className="flex items-center gap-2"><PackageX size={14} className="text-red-500"/> Não Inseridos</span>
            <button onClick={() => setMissingProducts([...missingProducts, { id: crypto.randomUUID(), product: '', quantity: 0, reason: 'Falta' }])} className="text-red-600 p-1 hover:bg-red-50 rounded transition-colors"><Plus size={18} /></button>
          </div>
          <div className="space-y-2">
            {missingProducts.map(p => (
              <div key={p.id} className="flex gap-2 items-center bg-red-50/50 p-2 rounded-lg">
                <input type="text" placeholder="Produto" className="flex-1 bg-transparent border-none text-[10px] font-bold uppercase focus:ring-0" value={p.product} onChange={e => setMissingProducts(missingProducts.map(x => x.id === p.id ? {...x, product: e.target.value} : x))} />
                <button onClick={() => setMissingProducts(missingProducts.filter(x => x.id !== p.id))}><Trash2 size={14} className="text-red-300 hover:text-red-500 transition-colors"/></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
