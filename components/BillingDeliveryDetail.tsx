
import React, { useState, useMemo, useRef } from 'react';
import { DeliveryRecord, Employee, PriceDifferenceItem, MissingProduct } from '../types';
import { ArrowLeft, Save, Printer, Plus, Trash2, CheckCircle2, UploadCloud, Calculator } from 'lucide-react';
import * as XLSX from 'xlsx';

interface BillingDeliveryDetailProps {
  record: DeliveryRecord;
  employees: Employee[];
  onSave: (record: DeliveryRecord) => void;
  onBack: () => void;
}

const BILLING_GROUPS = [
  'Comida', 
  'Papel', 
  'Ferramentas Operacionais', 
  'Material Administrativo', 
  'Outros', 
  'Happy Meal'
];

export const BillingDeliveryDetail: React.FC<BillingDeliveryDetailProps> = ({ record, employees, onSave, onBack }) => {
  const [local, setLocal] = useState<DeliveryRecord>(record);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // New entry state for price difference
  const [newEntry, setNewEntry] = useState({
    category: 'Comida',
    product: '',
    priceHavi: 0,
    priceMyStore: 0
  });

  const totalHaviGroups = useMemo(() => local.haviGroups.reduce((s, g) => s + g.total, 0), [local.haviGroups]);
  const totalHaviFinal = totalHaviGroups + local.pontoVerde;
  const totalMyStore = useMemo(() => local.smsValues.reduce((s, v) => s + v.amount, 0), [local.smsValues]);
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
      category: newEntry.category as any, 
      product: newEntry.product, 
      priceHavi: newEntry.priceHavi, 
      priceSms: newEntry.priceMyStore // Using priceSms field as MyStore
    };
    
    setLocal(prev => ({ ...prev, priceDifferences: [...prev.priceDifferences, newItem] }));
    setNewEntry({ category: 'Comida', product: '', priceHavi: 0, priceMyStore: 0 });
    setShowAddModal(false);
  };

  const handleUpdatePriceDiff = (id: string, field: keyof PriceDifferenceItem, value: any) => {
    setLocal(prev => ({
      ...prev,
      priceDifferences: prev.priceDifferences.map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const handleAddMissingProduct = () => {
    const newItem: MissingProduct = { id: crypto.randomUUID(), product: '', group: '', priceHavi: 0, reason: '' };
    setLocal(prev => ({ ...prev, missingProducts: [...prev.missingProducts, newItem] }));
  };

  const handleUpdateMissingProduct = (id: string, field: keyof MissingProduct, value: any) => {
    setLocal(prev => ({
      ...prev,
      missingProducts: prev.missingProducts.map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const handleRemoveItem = (id: string, type: 'diff' | 'missing') => {
    if (type === 'diff') setLocal(prev => ({ ...prev, priceDifferences: prev.priceDifferences.filter(i => i.id !== id) }));
    else setLocal(prev => ({ ...prev, missingProducts: prev.missingProducts.filter(i => i.id !== id) }));
  };

  const managerName = employees.find(e => e.id === local.managerId)?.name || '-';

  const diffByGroup = useMemo(() => {
    const sums: Record<string, number> = {};
    BILLING_GROUPS.forEach(cat => {
      sums[cat] = local.priceDifferences
        .filter(i => i.category === cat)
        .reduce((s, i) => s + (i.priceHavi - i.priceSms), 0);
    });
    return sums;
  }, [local.priceDifferences]);

  const handleSaveInternal = (finalize = false) => {
    onSave({ ...local, isFinalized: finalize });
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

        const updatedHaviGroups = [...local.haviGroups];
        const updatedSmsValues = [...local.smsValues];
        let updatedPontoVerde = local.pontoVerde;

        rows.forEach(row => {
          if (!row || row.length < 2) return;
          const label = String(row[0]).toLowerCase();
          const value = parseFloat(String(row[1]).replace(',', '.')) || 0;

          updatedHaviGroups.forEach(g => {
            if (label.includes(g.description.toLowerCase())) g.total = value;
          });

          updatedSmsValues.forEach(s => {
            if (label.includes(s.description.toLowerCase())) s.amount = value;
          });

          if (label.includes('ponto verde')) updatedPontoVerde = value;
        });

        setLocal(prev => ({
          ...prev,
          haviGroups: updatedHaviGroups,
          smsValues: updatedSmsValues,
          pontoVerde: updatedPontoVerde
        }));
        
        alert("Dados importados com sucesso!");
      } catch (err) {
        alert("Erro ao ler o ficheiro Excel. Verifique o formato.");
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in print:p-0">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center print:hidden">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 font-medium">
          <ArrowLeft size={18} /> Voltar
        </button>
        <div className="flex items-center gap-3">
           <input type="file" ref={fileInputRef} onChange={handleImportExcel} accept=".xlsx,.xls,.csv" className="hidden" />
           <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-lg hover:bg-amber-100 font-bold border border-amber-200 transition-all">
              <UploadCloud size={18}/> Importar Dados
           </button>
           <button onClick={() => window.print()} className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-200 font-bold transition-all"><Printer size={18}/> Imprimir</button>
           <button onClick={() => handleSaveInternal(false)} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-100 font-bold transition-all"><Save size={18}/> Gravar Rascunho</button>
           <button onClick={() => handleSaveInternal(true)} className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 font-bold shadow-md transition-all active:scale-95"><CheckCircle2 size={18}/> Finalizar</button>
        </div>
      </div>

      <div className="bg-white border-2 border-emerald-500 rounded-lg p-6 space-y-6 shadow-xl print:border-none print:shadow-none print:p-0">
        <div className="flex justify-between items-center border-b border-emerald-100 pb-4">
          <h2 className="text-2xl font-black text-emerald-800 uppercase tracking-tighter">Entregas</h2>
          <div className="text-right">
            <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">ID Registo</div>
            <div className="text-xs font-mono text-gray-400">{local.id.split('-')[0]}</div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="border border-emerald-500 rounded-lg overflow-hidden flex flex-col">
            <div className="bg-emerald-50 py-1.5 text-center font-black text-emerald-800 border-b border-emerald-500 uppercase text-xs tracking-wider">Factura Havi</div>
            <div className="p-1 flex flex-col flex-1 divide-y divide-emerald-100">
               <div className="grid grid-cols-12 gap-1 text-[9px] font-black uppercase text-emerald-600 px-2 py-1">
                 <div className="col-span-1">Grupo</div>
                 <div className="col-span-8">Descrição</div>
                 <div className="col-span-3 text-right">Total</div>
               </div>
               {local.haviGroups.map(group => (
                 <div key={group.group} className="grid grid-cols-12 gap-1 px-2 py-0.5 items-center hover:bg-emerald-50/50">
                    <div className="col-span-1 text-[10px] font-bold text-gray-400">{group.group}</div>
                    <div className="col-span-8 text-[10px] font-medium text-gray-700">{group.description}</div>
                    <div className="col-span-3">
                      <input 
                        type="number" 
                        value={group.total || ''} 
                        onChange={(e) => handleUpdateGroupTotal(group.group, parseFloat(e.target.value) || 0)}
                        className="w-full text-right bg-transparent border-none p-0 text-[10px] font-black focus:ring-0" 
                        placeholder="0.00"
                      />
                    </div>
                 </div>
               ))}
               <div className="grid grid-cols-12 gap-1 px-2 py-1 items-center bg-emerald-50/30">
                  <div className="col-span-1 flex justify-center"><img src="https://upload.wikimedia.org/wikipedia/commons/e/ea/Ponto_Verde_symbol.svg" className="w-4 h-4" /></div>
                  <div className="col-span-8 text-[10px] font-black text-emerald-800">Contribuição Ponto Verde</div>
                  <div className="col-span-3">
                    <input 
                        type="number" 
                        value={local.pontoVerde || ''} 
                        onChange={(e) => setLocal({...local, pontoVerde: parseFloat(e.target.value) || 0})}
                        className="w-full text-right bg-transparent border-none p-0 text-[10px] font-black focus:ring-0 text-emerald-800" 
                        placeholder="0.00"
                    />
                  </div>
               </div>
               <div className="p-3 bg-emerald-100/50 text-right font-black text-emerald-900 text-lg border-t border-emerald-500">
                  {totalHaviFinal.toFixed(2)} €
               </div>
            </div>
          </div>

          <div className="border border-emerald-500 rounded-lg overflow-hidden flex flex-col">
            <div className="bg-emerald-50 py-1.5 text-center font-black text-emerald-800 border-b border-emerald-500 uppercase text-xs tracking-wider">MyStore</div>
            <div className="p-1 flex flex-col flex-1 divide-y divide-emerald-100">
               <div className="grid grid-cols-12 gap-1 text-[9px] font-black uppercase text-emerald-600 px-2 py-1">
                 <div className="col-span-9">Descrição</div>
                 <div className="col-span-3 text-right">Montante</div>
               </div>
               {local.smsValues.map(v => (
                 <div key={v.description} className="grid grid-cols-12 gap-1 px-2 py-1.5 items-center hover:bg-emerald-50/50">
                    <div className="col-span-9 text-[11px] font-bold text-gray-700">{v.description}</div>
                    <div className="col-span-3">
                       <input 
                        type="number" 
                        value={v.amount || ''} 
                        onChange={(e) => handleUpdateMyStoreValue(v.description, parseFloat(e.target.value) || 0)}
                        className="w-full text-right bg-transparent border-none p-0 text-[11px] font-black focus:ring-0" 
                        placeholder="0.00"
                      />
                    </div>
                 </div>
               ))}
               <div className="mt-12 p-3 bg-emerald-100/50 text-center flex flex-col justify-center min-h-[100px] border-t border-emerald-500">
                  <div className="text-2xl font-black text-emerald-900 leading-none mb-2">{totalMyStore.toFixed(2)} €</div>
                  <div className="text-[10px] uppercase font-bold text-emerald-600">Total MyStore Consolidado</div>
               </div>
            </div>
          </div>

          <div className="border border-emerald-500 rounded-lg overflow-hidden flex flex-col">
            <div className="bg-emerald-50 py-1.5 text-center font-black text-emerald-800 border-b border-emerald-500 uppercase text-xs tracking-wider">Diferença</div>
            <div className="p-1 flex flex-col flex-1 divide-y divide-emerald-100">
               <div className="grid grid-cols-12 gap-1 text-[9px] font-black uppercase text-emerald-600 px-2 py-1">
                 <div className="col-span-9">Descrição</div>
                 <div className="col-span-3 text-right">Montante</div>
               </div>
               {local.smsValues.map(v => {
                 const haviMatchDesc = v.description === 'Comida' ? ['Congelados','Refrigerados','Secos Comida','Produtos Frescos','Bulk Alimentar','Condimentos','Condimentos Cozinha'] :
                                       v.description === 'Papel' ? ['Secos Papel','Bulk Papel'] :
                                       v.description === 'F. Operacionais' ? ['Ferramentas Utensilios','Manuais','Manutenção Limpeza'] : [];
                 const haviSubtotal = local.haviGroups
                    .filter(g => haviMatchDesc.includes(g.description))
                    .reduce((s, g) => s + g.total, 0);
                 const diff = haviSubtotal - v.amount;

                 return (
                    <div key={v.description} className="grid grid-cols-12 gap-1 px-2 py-1.5 items-center">
                        <div className="col-span-9 text-[11px] font-bold text-gray-700">{v.description}</div>
                        <div className={`col-span-3 text-right text-[11px] font-black ${Math.abs(diff) > 0.1 ? 'text-red-500' : 'text-gray-400'}`}>
                            {diff.toFixed(2)} €
                        </div>
                    </div>
                 );
               })}
               <div className="mt-12 p-3 bg-white text-center flex flex-col justify-end flex-1 items-center pb-8">
                  <div className="text-4xl font-black text-emerald-950 mb-1">{finalDifference.toFixed(2)} €</div>
                  <div className={`h-1.5 w-24 rounded-full ${Math.abs(finalDifference) > 0.05 ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
               </div>
            </div>
          </div>
        </div>

        {/* PRICE DIFFERENCES SECTION - REFACTORED */}
        <div className="border border-emerald-500 rounded-lg overflow-hidden">
           <div className="bg-emerald-50 py-1.5 px-4 flex justify-between items-center border-b border-emerald-500">
              <span className="font-black text-emerald-800 uppercase text-xs tracking-wider">Diferenças de Preço</span>
              <button 
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1 rounded text-[10px] font-black uppercase hover:bg-emerald-700 transition-colors shadow-sm"
              >
                <Plus size={12} /> Adicionar Registo
              </button>
           </div>
           
           <div className="flex flex-col">
              <div className="grid grid-cols-12 gap-2 bg-emerald-50/20 px-4 py-2 border-b border-emerald-100">
                 <div className="col-span-2 text-[10px] font-bold uppercase text-emerald-600">Grupo</div>
                 <div className="col-span-4 text-[10px] font-bold uppercase text-emerald-600">Produto</div>
                 <div className="col-span-2 text-[10px] font-bold uppercase text-emerald-600 text-center">Preço HAVI</div>
                 <div className="col-span-2 text-[10px] font-bold uppercase text-emerald-600 text-center">Preço MyStore</div>
                 <div className="col-span-1 text-[10px] font-bold uppercase text-emerald-600 text-center">Dif.</div>
                 <div className="col-span-1"></div>
              </div>
              
              <div className="divide-y divide-emerald-50 min-h-[40px]">
                 {local.priceDifferences.map(item => (
                    <div key={item.id} className="grid grid-cols-12 gap-2 px-4 py-2 group items-center hover:bg-emerald-50/10">
                       <div className="col-span-2 text-[11px] font-bold text-emerald-700 uppercase">{item.category}</div>
                       <div className="col-span-4"><input type="text" value={item.product} onChange={(e) => handleUpdatePriceDiff(item.id, 'product', e.target.value)} className="w-full text-[11px] border-none p-0 focus:ring-0 font-medium" /></div>
                       <div className="col-span-2"><input type="number" value={item.priceHavi || ''} onChange={(e) => handleUpdatePriceDiff(item.id, 'priceHavi', parseFloat(e.target.value) || 0)} className="w-full text-[11px] text-center border-none p-0 focus:ring-0 font-bold" /></div>
                       <div className="col-span-2"><input type="number" value={item.priceSms || ''} onChange={(e) => handleUpdatePriceDiff(item.id, 'priceSms', parseFloat(e.target.value) || 0)} className="w-full text-[11px] text-center border-none p-0 focus:ring-0 font-bold" /></div>
                       <div className="col-span-1 text-[11px] text-center font-black text-emerald-900">{(item.priceHavi - item.priceSms).toFixed(2)}€</div>
                       <div className="col-span-1 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleRemoveItem(item.id, 'diff')} className="text-red-400 p-1 hover:bg-red-50 rounded"><Trash2 size={12}/></button>
                       </div>
                    </div>
                 ))}
                 {local.priceDifferences.length === 0 && (
                    <div className="py-8 text-center text-[11px] text-gray-400 italic">Nenhum registo de diferença de preço inserido.</div>
                 )}
              </div>

              {/* SUMMARY BY GROUP */}
              {local.priceDifferences.length > 0 && (
                <div className="bg-emerald-50/40 p-4 border-t border-emerald-200">
                    <h4 className="text-[10px] font-black text-emerald-800 uppercase mb-3 flex items-center gap-1.5"><Calculator size={12}/> Resumo das Diferenças por Grupo</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {BILLING_GROUPS.map(group => {
                            const val = diffByGroup[group] || 0;
                            return (
                                <div key={group} className="bg-white border border-emerald-100 rounded p-2 flex flex-col items-center">
                                    <span className="text-[8px] font-bold text-gray-400 uppercase text-center mb-1 leading-tight">{group}</span>
                                    <span className={`text-xs font-black ${Math.abs(val) > 0.01 ? 'text-emerald-900' : 'text-gray-300'}`}>{val.toFixed(2)}€</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
              )}
           </div>
        </div>

        {/* MODAL FOR ADDING PRICE DIFFERENCE */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-scale-up">
              <h3 className="text-lg font-black text-emerald-800 uppercase mb-6 flex items-center gap-2">
                <Calculator className="text-emerald-600" /> Adicionar Diferença
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Grupo</label>
                  <select 
                    value={newEntry.category} 
                    onChange={(e) => setNewEntry({...newEntry, category: e.target.value})}
                    className="w-full p-2.5 border border-emerald-100 rounded-lg text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {BILLING_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Produto</label>
                  <input 
                    type="text" 
                    value={newEntry.product}
                    onChange={(e) => setNewEntry({...newEntry, product: e.target.value})}
                    placeholder="Ex: Pão Arch"
                    className="w-full p-2.5 border border-emerald-100 rounded-lg text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Preço HAVI</label>
                    <input 
                      type="number" 
                      value={newEntry.priceHavi || ''}
                      onChange={(e) => setNewEntry({...newEntry, priceHavi: parseFloat(e.target.value) || 0})}
                      placeholder="0.00"
                      className="w-full p-2.5 border border-emerald-100 rounded-lg text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Preço MyStore</label>
                    <input 
                      type="number" 
                      value={newEntry.priceMyStore || ''}
                      onChange={(e) => setNewEntry({...newEntry, priceMyStore: parseFloat(e.target.value) || 0})}
                      placeholder="0.00"
                      className="w-full p-2.5 border border-emerald-100 rounded-lg text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>
                
                <div className="bg-emerald-50 p-3 rounded-lg flex justify-between items-center">
                  <span className="text-[10px] font-black text-emerald-600 uppercase">Diferença Estimada</span>
                  <span className="text-lg font-black text-emerald-900">{(newEntry.priceHavi - newEntry.priceMyStore).toFixed(2)}€</span>
                </div>

                <div className="flex gap-3 pt-4">
                  <button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2.5 text-gray-500 font-bold text-sm hover:bg-gray-50 rounded-lg transition-colors">Cancelar</button>
                  <button 
                    onClick={handleAddPriceDiff}
                    disabled={!newEntry.product.trim()}
                    className="flex-1 bg-emerald-600 text-white font-black px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/30 disabled:opacity-50"
                  >
                    Confirmar Registo
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MISSING PRODUCTS SECTION */}
        <div className="border border-emerald-500 rounded-lg overflow-hidden">
           <div className="bg-emerald-50 py-1.5 text-center font-black text-emerald-800 border-b border-emerald-500 uppercase text-xs tracking-wider">Produto não Introduzido</div>
           <div className="flex flex-col">
              <div className="grid grid-cols-12 gap-2 bg-emerald-50/20 px-4 py-2 border-b border-emerald-100">
                 <div className="col-span-5 text-[10px] font-bold uppercase text-emerald-600">Produto</div>
                 <div className="col-span-2 text-[10px] font-bold uppercase text-emerald-600">Grupo</div>
                 <div className="col-span-2 text-[10px] font-bold uppercase text-emerald-600">Preço HAVI</div>
                 <div className="col-span-3 text-[10px] font-bold uppercase text-emerald-600">Motivo</div>
              </div>
              <div className="divide-y divide-emerald-50 min-h-[60px]">
                 {local.missingProducts.map(item => (
                    <div key={item.id} className="grid grid-cols-12 gap-2 px-4 py-2 group">
                       <div className="col-span-5"><input type="text" value={item.product} onChange={(e) => handleUpdateMissingProduct(item.id, 'product', e.target.value)} className="w-full text-[11px] border-none p-0 focus:ring-0 font-bold" /></div>
                       <div className="col-span-2"><input type="text" value={item.group} onChange={(e) => handleUpdateMissingProduct(item.id, 'group', e.target.value)} className="w-full text-[11px] border-none p-0 focus:ring-0" /></div>
                       <div className="col-span-2"><input type="number" value={item.priceHavi || ''} onChange={(e) => handleUpdateMissingProduct(item.id, 'priceHavi', parseFloat(e.target.value) || 0)} className="w-full text-[11px] border-none p-0 focus:ring-0 font-black" /></div>
                       <div className="col-span-3 flex justify-between">
                          <input type="text" value={item.reason} onChange={(e) => handleUpdateMissingProduct(item.id, 'reason', e.target.value)} className="w-full text-[11px] border-none p-0 focus:ring-0" />
                          <button onClick={() => handleRemoveItem(item.id, 'missing')} className="text-red-400 opacity-0 group-hover:opacity-100"><Trash2 size={12}/></button>
                       </div>
                    </div>
                 ))}
                 <button onClick={handleAddMissingProduct} className="py-2 text-[10px] text-emerald-600 hover:bg-emerald-50 flex items-center justify-center gap-1 font-bold tracking-widest uppercase"><Plus size={14} /> Novo Produto Não Introduzido</button>
              </div>
           </div>
        </div>

        {/* COMMENTS SECTION */}
        <div className="border border-emerald-500 rounded-lg overflow-hidden">
           <div className="bg-emerald-50 py-1.5 text-center font-black text-emerald-800 border-b border-emerald-500 uppercase text-xs tracking-wider">Comentários Adicionais</div>
           <textarea 
            value={local.comments}
            onChange={(e) => setLocal({...local, comments: e.target.value})}
            className="w-full min-h-[80px] p-4 text-xs font-medium text-gray-700 outline-none border-none resize-none placeholder:text-gray-300" 
            placeholder="Escreva aqui quaisquer observações ou anomalias detetadas..."
           />
        </div>

        {/* FOOTER: INFO */}
        <div className="grid grid-cols-4 gap-4 pt-4 border-t border-emerald-100">
           <div className="col-span-2 flex flex-col border-r border-emerald-100">
              <span className="text-[10px] font-black uppercase text-emerald-400">Data Factura</span>
              <span className="text-sm font-black text-emerald-950">{new Date(local.date).toLocaleDateString('pt-PT')}</span>
           </div>
           <div className="col-span-2 flex flex-col">
              <span className="text-[10px] font-black uppercase text-emerald-400">Gerente Responsável</span>
              <span className="text-sm font-black text-emerald-950 uppercase">{managerName}</span>
           </div>
        </div>
      </div>
    </div>
  );
};
