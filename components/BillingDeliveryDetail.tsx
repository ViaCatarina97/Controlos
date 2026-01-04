import React, { useState, useMemo, useRef } from 'react';
import { DeliveryRecord, Employee } from '../types';
import { ArrowLeft, Plus, CheckCircle2, UploadCloud, Trash2, X, Save, AlertCircle } from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

// Lista de grupos na ordem exata da imagem enviada
const GRUPOS_ORDER = [
  "Congelados", "Refrigerados", "Secos Comida", "Secos Papel", "Manutenção Limpeza",
  "Marketing IPL", "Marketing Geral", "Produtos Frescos", "MANUTENÇÃO & LIMPEZA COMPRAS",
  "Condimentos", "Condimentos Cozinha", "Material Adm", "Manuais", "Ferramentas Utensilios",
  "Marketing Geral Custo", "Fardas", "Distribuição de Marketing", "Bulk Alimentar", "Bulk Papel"
];

interface PriceDiffItem {
  id: string;
  group: string;
  product: string;
  haviPrice: number;
  myStorePrice: number;
}

export const BillingDeliveryDetail: React.FC<{record: DeliveryRecord, onSave: any, onBack: any}> = ({ record, onSave, onBack }) => {
  const [local, setLocal] = useState<DeliveryRecord>(record);
  const [priceDiffs, setPriceDiffs] = useState<PriceDiffItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDiff, setNewDiff] = useState({ group: GRUPOS_ORDER[0], product: '', havi: 0, mystore: 0 });
  
  const totalHaviFinal = useMemo(() => local.haviGroups.reduce((s, g) => s + g.total, 0), [local.haviGroups]);
  const totalMyStore = useMemo(() => local.smsValues.reduce((s, v) => s + v.amount, 0), [local.smsValues]);
  const finalDifference = totalHaviFinal - totalMyStore;

  const handleAddPriceDiff = () => {
    if (!newDiff.product) return;
    setPriceDiffs([...priceDiffs, { ...newDiff, id: Date.now().toString(), haviPrice: newDiff.havi, myStorePrice: newDiff.mystore }]);
    setNewDiff({ group: GRUPOS_ORDER[0], product: '', havi: 0, mystore: 0 });
    setIsModalOpen(false);
  };

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in relative">
      {/* POPUP DE INSERÇÃO COM DROPDOWN */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-purple-100 overflow-hidden">
            <div className="bg-purple-600 p-4 flex justify-between items-center text-white">
              <h3 className="font-black uppercase text-xs tracking-tighter italic">Nova Diferença de Preço</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase">Grupo do Produto</label>
                <select 
                  value={newDiff.group}
                  onChange={e => setNewDiff({...newDiff, group: e.target.value})}
                  className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm font-bold bg-slate-50 focus:border-purple-500 outline-none"
                >
                  {GRUPOS_ORDER.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase">Nome do Produto</label>
                <input type="text" value={newDiff.product} onChange={e => setNewDiff({...newDiff, product: e.target.value})} className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm font-bold bg-slate-50 focus:border-purple-500 outline-none" placeholder="Ex: Batata frita..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Preço Havi" onChange={e => setNewDiff({...newDiff, havi: parseFloat(e.target.value) || 0})} className="border-2 border-slate-100 rounded-xl p-3 text-sm font-black bg-slate-50" />
                <input type="number" placeholder="Preço MyStore" onChange={e => setNewDiff({...newDiff, mystore: parseFloat(e.target.value) || 0})} className="border-2 border-slate-100 rounded-xl p-3 text-sm font-black bg-slate-50" />
              </div>
              <div className="bg-purple-50 p-4 rounded-xl flex justify-between items-center">
                <span className="text-[10px] font-black text-purple-400 uppercase">Diferença:</span>
                <span className="text-lg font-black text-red-600">{(newDiff.havi - newDiff.mystore).toFixed(4)} €</span>
              </div>
              <button onClick={handleAddPriceDiff} className="w-full bg-purple-600 text-white font-black py-4 rounded-xl uppercase text-xs tracking-widest shadow-lg">Guardar Registo</button>
            </div>
          </div>
        </div>
      )}

      {/* LAYOUT PRINCIPAL COM ORDEM DOS GRUPOS ATUALIZADA */}
      <div className="bg-white border-2 border-purple-500 rounded-lg p-6 shadow-xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="border border-purple-500 rounded-lg overflow-hidden">
            <div className="bg-purple-50 py-1.5 text-center font-black text-purple-800 border-b border-purple-500 text-[10px]">HAVI</div>
            <div className="p-1 divide-y divide-purple-100">
              {GRUPOS_ORDER.map(desc => {
                const group = local.haviGroups.find(g => g.description.toLowerCase().includes(desc.toLowerCase())) || { total: 0 };
                return (
                  <div key={desc} className="grid grid-cols-12 px-2 py-1 items-center">
                    <div className="col-span-9 text-[9px] font-bold text-gray-700 uppercase">{desc}</div>
                    <div className="col-span-3 text-right text-[10px] font-black">{group.total.toFixed(2)}</div>
                  </div>
                );
              })}
              <div className="p-4 bg-purple-100/50 text-right font-black text-purple-900 text-2xl italic">{totalHaviFinal.toFixed(2)} €</div>
            </div>
          </div>
          {/* ... Colunas MyStore e Diferenças seguem a mesma lógica ... */}
        </div>

        {/* TABELA DE DIFERENÇAS DE PREÇO */}
        <div className="mt-6 bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h3 className="text-[10px] font-black text-slate-800 uppercase italic flex items-center gap-2"><AlertCircle size={14} className="text-amber-500"/> Diferenças por Artigo</h3>
            <button onClick={() => setIsModalOpen(true)} className="bg-purple-100 text-purple-600 px-3 py-1.5 rounded-lg font-black text-[10px] flex items-center gap-1 hover:bg-purple-200 transition-all">
              <Plus size={14}/> Adicionar
            </button>
          </div>
          {/* Listagem dos itens com a coluna Grupo incluída */}
          <div className="space-y-1">
             <div className="grid grid-cols-12 text-[8px] font-black text-slate-400 uppercase px-3 py-1 border-b">
                <div className="col-span-3">Grupo</div>
                <div className="col-span-4">Produto</div>
                <div className="col-span-2 text-right">Havi</div>
                <div className="col-span-2 text-right">MyStore</div>
                <div className="col-span-1"></div>
             </div>
             {priceDiffs.map(item => (
                <div key={item.id} className="grid grid-cols-12 px-3 py-2 bg-slate-50/50 rounded items-center text-[10px] font-bold border-b border-white hover:bg-purple-50">
                  <div className="col-span-3 text-purple-600 truncate mr-2">{item.group}</div>
                  <div className="col-span-4 text-slate-700 uppercase truncate">{item.product}</div>
                  <div className="col-span-2 text-right">{item.haviPrice.toFixed(4)}</div>
                  <div className="col-span-2 text-right">{item.myStorePrice.toFixed(4)}</div>
                  <div className="col-span-1 text-right"><button onClick={() => setPriceDiffs(priceDiffs.filter(i => i.id !== item.id))}><Trash2 size={14} className="text-slate-300 hover:text-red-500"/></button></div>
                </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};
