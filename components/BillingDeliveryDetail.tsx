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

const HAVI_GROUPS_LIST = [
  'Congelados', 'Refrigerados', 'Secos Comida', 'Secos Papel', 'Manutenção Limpeza',
  'Marketing IPL', 'Marketing Geral', 'Produtos Frescos', 'MANUTENÇÃO & LIMPEZA COMPRAS',
  'Condimentos', 'Condimentos Cozinha', 'Material Adm', 'Manuais', 'Ferramentas & Utensílios',
  'Marketing Geral Custo', 'Fardas', 'Distribuição de Marketing', 'Bulk Alimentar', 'Bulk Papel'
];

const MISSING_REASONS = [
  'Produto indisponível no MyStore',
  'Quantidade entregue inferior à faturada',
  'Produto devolvido (Qualidade)',
  'Produto devolvido (Solicitado pelo restaurante)',
  'Outros (descrever nos comentários)'
];

// Mapeamento para a extração local por ID
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
  
  const [newEntry, setNewEntry] = useState({
    category: 'Comida', product: '', priceHavi: 0, priceSms: 0, haviGroup: 'Congelados'
  });

  const [newMissing, setNewMissing] = useState({
    product: '', group: 'Comida', priceHavi: 0, reason: MISSING_REASONS[0]
  });

  const formatEuro = (val: number) => val.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

  const totalMyStore = useMemo(() => local.smsValues.reduce((s, v) => s + v.amount, 0), [local.smsValues]);
  
  const diffBySmsGroup = useMemo(() => {
    const sums: Record<string, number> = {};
    SMS_GROUPS.forEach(cat => {
      sums[cat] = local.priceDifferences
        .filter(i => i.category === cat)
        .reduce((s, i) => s + (i.priceHavi - i.priceSms), 0);
    });
    return sums;
  }, [local.priceDifferences]);

  const categoryDifferences = useMemo(() => {
    return local.smsValues.map(v => {
      const haviMatchCodes = v.description === 'Comida' ? ['A','B','C','H','J','L','T'] :
                             v.description === 'Papel' ? ['D','U'] :
                             v.description === 'F. Operacionais' ? ['E','I','O'] :
                             v.description === 'Material Adm' ? ['M'] :
                             v.description === 'Happy Meal' ? ['F'] :
                             v.description === 'Outros' ? ['G','N','P','R','S'] : [];

      const haviSubtotal = local.haviGroups
          .filter(g => haviMatchCodes.includes(g.group))
          .reduce((s, g) => s + g.total, 0);

      const groupPriceDiff = diffBySmsGroup[v.description] || 0;
      return haviSubtotal - v.amount - groupPriceDiff;
    });
  }, [local.haviGroups, local.smsValues, diffBySmsGroup]);

  const finalDifference = totalHaviFinal - totalMyStore;

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

  const handleAddPriceDiff = () => {
    if (!newEntry.product.trim()) return;
    const newItem: PriceDifferenceItem = { 
      id: crypto.randomUUID(), 
      category: newEntry.category, 
      product: newEntry.product, 
      priceHavi: newEntry.priceHavi, 
      priceSms: newEntry.priceSms,
      haviGroup: newEntry.haviGroup
    };
    setLocal(prev => ({ ...prev, priceDifferences: [...prev.priceDifferences, newItem] }));
    setShowAddModal(false);
  };

  const handleAddMissingProductConfirm = () => {
    if (!newMissing.product.trim()) return;
    const newItem: MissingProduct = { 
      id: crypto.randomUUID(), 
      product: newMissing.product, 
      group: newMissing.group, 
      priceHavi: newMissing.priceHavi, 
      reason: newMissing.reason 
    };
    setLocal(prev => ({ ...prev, missingProducts: [...prev.missingProducts, newItem] }));
    setShowMissingModal(false);
  };

  const handleRemoveItem = (id: string, type: 'diff' | 'missing') => {
    if (type === 'diff') setLocal(prev => ({ ...prev, priceDifferences: prev.priceDifferences.filter(i => i.id !== id) }));
    else setLocal(prev => ({ ...prev, missingProducts: prev.missingProducts.filter(i => i.id !== id) }));
  };

  // EXTRAÇÃO LOCAL DO PDF (Substitui o GeminiService)
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
        fullText += content.items.map((item: any) => item.str).join(" ") + " \n";
      }

      const cleanText = fullText.replace(/\s+/g, ' ');

      const extractFourthValue = (id: string) => {
        const regex = new RegExp(`(?:\\s|^)${id}\\s+.*?[\\d.]+,\\d{2}\\s*EUR\\s+[\\d.]+,\\d{2}\\s*EUR\\s+[\\d.]+,\\d{2}\\s*EUR\\s+([\\d.]+,\\d{2})\\s*EUR`, 'i');
        const match = cleanText.match(regex);
        return match ? parseFloat(match[1].replace(/\./g, '').replace(',', '.')) : 0;
      };

      const updatedHaviGroups = local.haviGroups.map(internal => {
        const config = HAVI_CONFIG.find(c => c.internalName.toUpperCase() === internal.description.toUpperCase());
        return config ? { ...internal, total: extractFourthValue(config.id) } : { ...internal, total: 0 };
      });

      const totalMatch = cleanText.match(/TOTAL\s+.*?\s+([\d.]+,[\d]{2})\s*EUR\s+([\d.]+,[\d]{2})\s*EUR/i);
      const finalVal = totalMatch ? parseFloat(totalMatch[2].replace(/\./g, '').replace(',', '.')) : 0;

      setLocal(prev => ({ ...prev, haviGroups: updatedHaviGroups }));
      if (finalVal > 0) setTotalHaviFinal(finalVal);

      alert(`Importação concluída! Total Fatura: ${finalVal.toFixed(2)}€`);
    } catch (err: any) {
      alert("Erro ao processar PDF localmente.");
    } finally {
      setIsProcessingPdf(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in print:p-0">
      {/* HEADER */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center print:hidden">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 font-medium">
          <ArrowLeft size={18} /> Voltar
        </button>
        <div className="flex items-center gap-3">
           <input type="file" ref={fileInputRef} onChange={handleLoadInvoice} accept=".pdf" className="hidden" />
           <button onClick={() => fileInputRef.current?.click()} disabled={isProcessingPdf} className="flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-100 font-bold border border-purple-200 transition-all disabled:opacity-50 shadow-sm">
              {isProcessingPdf ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18}/>}
              {isProcessingPdf ? "Extraindo..." : "Extrair de PDF"}
           </button>
           <button onClick={() => window.print()} className="bg-slate-100 text-slate-700 p-2 rounded-lg"><Printer size={18}/></button>
           <button onClick={() => onSave({ ...local, isFinalized: true })} className="bg-purple-600 text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-purple-700 transition-all">Finalizar</button>
        </div>
      </div>

      {/* DASHBOARD CENTRAL */}
      <div className="bg-white border-2 border-purple-500 rounded-lg p-6 space-y-6 shadow-xl print:border-none print:shadow-none print:p-0">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* HAVI */}
          <div className="border border-purple-500 rounded-lg overflow-hidden flex flex-col">
            <div className="bg-purple-50 py-1.5 text-center font-black text-purple-800 border-b border-purple-500 uppercase text-xs tracking-wider">HAVI</div>
            <div className="p-1 flex flex-col flex-1 divide-y divide-purple-100 text-[10px]">
               {local.haviGroups.map(group => (
                 <div key={group.group} className="grid grid-cols-12 gap-1 px-2 py-0.5 items-center">
                    <div className="col-span-9 font-medium text-gray-700">{group.description}</div>
                    <div className="col-span-3 text-right font-black">{group.total.toFixed(2)}</div>
                 </div>
               ))}
               <div className="p-3 bg-purple-100/50 text-right font-black text-purple-900 text-lg border-t border-purple-500">
                  {formatEuro(totalHaviFinal)}
               </div>
            </div>
          </div>

          {/* MYSTORE */}
          <div className="border border-purple-500 rounded-lg overflow-hidden flex flex-col">
            <div className="bg-purple-50 py-1.5 text-center font-black text-purple-800 border-b border-purple-500 uppercase text-xs tracking-wider">MyStore</div>
            <div className="p-1 flex flex-col flex-1 divide-y divide-purple-100">
               {local.smsValues.map(v => (
                 <div key={v.description} className="grid grid-cols-12 gap-1 px-2 py-1.5 items-center">
                    <div className="col-span-9 text-[11px] font-bold text-gray-700 uppercase">{v.description}</div>
                    <div className="col-span-3">
                       <input type="number" step="0.01" value={v.amount || ''} onChange={(e) => handleUpdateMyStoreValue(v.description, parseFloat(e.target.value) || 0)} className="w-full text-right bg-white border-none p-0 text-[11px] font-black text-slate-900 focus:ring-0" placeholder="0,00" />
                    </div>
                 </div>
               ))}
               <div className="mt-auto p-3 bg-purple-100/50 text-center min-h-[80px] flex flex-col justify-center border-t border-purple-500">
                  <div className="text-2xl font-black text-purple-900">{formatEuro(totalMyStore)}</div>
               </div>
            </div>
          </div>

          {/* DIFERENÇA FINAL */}
          <div className="border border-purple-500 rounded-lg overflow-hidden flex flex-col bg-slate-50 items-center justify-center p-8 text-center">
             <div className={`text-6xl font-black italic tracking-tighter ${Math.abs(finalDifference) > 0.1 ? 'text-red-600' : 'text-emerald-600'}`}>
                {formatEuro(finalDifference)}
             </div>
             <div className="text-[10px] font-bold text-gray-400 uppercase mt-4 tracking-widest">Diferença Final Real</div>
          </div>
        </div>

        {/* TABELAS INFERIORES */}
        <div className="flex gap-6">
           <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-slate-700 flex items-center gap-2 uppercase text-xs tracking-widest"><AlertCircle size={16} className="text-amber-500" /> Diferenças de Preço</h3>
                 <button onClick={() => setShowAddModal(true)} className="text-purple-600 p-1 hover:bg-purple-100 rounded transition-colors"><Plus size={20} /></button>
              </div>
              <div className="overflow-auto max-h-48 text-[10px]">
                 <table className="w-full">
                    <thead className="text-slate-400 uppercase font-black border-b border-slate-200">
                       <tr>
                          <th className="text-left py-2">Cat. MyStore</th>
                          <th className="text-left py-2">Produto</th>
                          <th className="text-right py-2">HAVI</th>
                          <th className="text-right py-2">SMS</th>
                          <th className="text-right py-2">Diff</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {local.priceDifferences.map(item => (
                          <tr key={item.id}>
                             <td className="py-2 text-slate-500">{item.category}</td>
                             <td className="py-2 font-bold text-slate-700">{item.product}</td>
                             <td className="py-2 text-right">{item.priceHavi.toFixed(4)}</td>
                             <td className="py-2 text-right">{item.priceSms.toFixed(4)}</td>
                             <td className="py-2 text-right font-black text-red-500">{(item.priceHavi - item.priceSms).toFixed(2)}</td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>

           <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-slate-700 flex items-center gap-2 uppercase text-xs tracking-widest"><Calculator size={16} className="text-blue-500" /> Não Introduzidos</h3>
                 <button onClick={() => setShowMissingModal(true)} className="p-1 text-purple-600 hover:bg-purple-100 rounded transition-colors"><Plus size={20} /></button>
              </div>
              <div className="overflow-auto max-h-48 text-[10px]">
                 <table className="w-full">
                    <thead className="text-slate-400 uppercase font-black border-b border-slate-200">
                       <tr>
                          <th className="text-left py-2">Produto</th>
                          <th className="text-right py-2">Valor</th>
                          <th className="text-left py-2 px-2">Motivo</th>
                       </tr>
                    </thead>
                    <tbody>
                       {local.missingProducts.map(item => (
                          <tr key={item.id} className="border-b border-white">
                             <td className="py-2 font-bold text-slate-700">{item.product}</td>
                             <td className="py-2 text-right font-black">{item.priceHavi.toFixed(2)} €</td>
                             <td className="py-2 px-2 italic text-slate-400">{item.reason}</td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      </div>

      {/* MODAL DIFERENÇA DE PREÇO */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
            <h3 className="text-xl font-bold text-gray-800 mb-6 uppercase tracking-tight">Nova Diferença</h3>
            <div className="space-y-4">
               <select value={newEntry.category} onChange={e => setNewEntry({...newEntry, category: e.target.value})} className="w-full p-2.5 border rounded-lg bg-white font-medium">
                  {SMS_GROUPS.map(c => <option key={c} value={c}>{c}</option>)}
               </select>
               <input type="text" placeholder="Produto" value={newEntry.product} onChange={e => setNewEntry({...newEntry, product: e.target.value})} className="w-full p-2.5 border rounded-lg" />
               <div className="grid grid-cols-2 gap-4">
                  <input type="number" placeholder="Preço HAVI" value={newEntry.priceHavi || ''} onChange={e => setNewEntry({...newEntry, priceHavi: parseFloat(e.target.value) || 0})} className="w-full p-2.5 border rounded-lg font-black" />
                  <input type="number" placeholder="Preço SMS" value={newEntry.priceSms || ''} onChange={e => setNewEntry({...newEntry, priceSms: parseFloat(e.target.value) || 0})} className="w-full p-2.5 border rounded-lg font-black" />
               </div>
               <div className="pt-4 flex gap-3">
                  <button onClick={() => setShowAddModal(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl uppercase text-xs tracking-widest">Cancelar</button>
                  <button onClick={handleAddPriceDiff} className="flex-2 px-8 py-3 bg-purple-600 text-white font-black uppercase text-xs tracking-widest rounded-xl hover:bg-purple-700 transition-all shadow-lg">Adicionar</button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PRODUTO NÃO INTRODUZIDO */}
      {showMissingModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
            <h3 className="text-xl font-bold text-gray-800 mb-6 uppercase tracking-tight">Não Introduzido</h3>
            <div className="space-y-4">
               <input type="text" placeholder="Produto" value={newMissing.product} onChange={e => setNewMissing({...newMissing, product: e.target.value})} className="w-full p-2.5 border rounded-lg" />
               <div className="grid grid-cols-2 gap-4">
                  <select value={newMissing.group} onChange={e => setNewMissing({...newMissing, group: e.target.value})} className="w-full p-2.5 border rounded-lg bg-white font-medium">
                    {SMS_GROUPS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input type="number" placeholder="Valor (€)" value={newMissing.priceHavi || ''} onChange={e => setNewMissing({...newMissing, priceHavi: parseFloat(e.target.value) || 0})} className="w-full p-2.5 border rounded-lg font-black" />
               </div>
               <select value={newMissing.reason} onChange={e => setNewMissing({...newMissing, reason: e.target.value})} className="w-full p-2.5 border rounded-lg bg-white font-medium">
                  {MISSING_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
               </select>
               <div className="pt-4 flex gap-3">
                  <button onClick={() => setShowMissingModal(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl uppercase text-xs tracking-widest">Cancelar</button>
                  <button onClick={handleAddMissingProductConfirm} className="flex-2 px-8 py-3 bg-blue-600 text-white font-black uppercase text-xs tracking-widest rounded-xl hover:bg-blue-700 transition-all shadow-lg">Adicionar</button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
