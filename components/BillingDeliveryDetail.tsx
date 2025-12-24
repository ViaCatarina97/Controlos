
import React, { useState, useMemo, useRef } from 'react';
import { DeliveryRecord, Employee, PriceDifferenceItem, MissingProduct } from '../types';
import { ArrowLeft, Save, Printer, Plus, Trash2, CheckCircle2, UploadCloud, Calculator, Loader2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

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
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  
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
      priceSms: newEntry.priceMyStore
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

  const handleUpdateMissingProduct = (id: string, field: keyof MissingProduct, value: any) => {
    setLocal(prev => ({
      ...prev,
      missingProducts: prev.missingProducts.map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const handleAddMissingProduct = () => {
    const newItem: MissingProduct = { id: crypto.randomUUID(), product: '', group: '', priceHavi: 0, reason: '' };
    setLocal(prev => ({ ...prev, missingProducts: [...prev.missingProducts, newItem] }));
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

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleLoadInvoice = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert("Por favor, selecione um ficheiro PDF.");
      return;
    }

    setIsProcessingPdf(true);

    try {
      const base64Pdf = await fileToBase64(file);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const prompt = `
        Atue como um especialista em processamento de faturas.
        Analise o PDF da fatura HAVI fornecido, focando especificamente na tabela intitulada "TOTAL POR GRUPO PRODUTO".
        
        INSTRUÇÕES DE EXTRAÇÃO:
        1. Localize a tabela "TOTAL POR GRUPO PRODUTO" (geralmente nas páginas finais).
        2. Para cada linha de grupo de produto (ex: "1 CONGELADOS", "14 FERRAMENTAS & UTENSÍLIOS"), extraia o valor numérico da ÚLTIMA COLUNA chamada "VALOR TOTAL".
        3. Localize a linha de "TOTAL" no fundo desta tabela e extraia o valor numérico da coluna "PTO VERDE".
        
        MAPEAMENTO DE GRUPOS (Ignore os números iniciais na fatura):
        - CONGELADOS -> Congelados
        - REFRIGERADOS -> Refrigerados
        - SECOS COMIDA -> Secos Comida
        - SECOS PAPEL -> Secos Papel
        - MANUTENÇÃO & LIMPEZA -> Manutenção Limpeza
        - MARKETING IPL -> Marketing IPL
        - MARKETING GERAL -> Marketing Geral
        - PRODUTOS FRESCOS -> Produtos Frescos
        - MANUTENÇÃO & LIMPEZA COMPRAS -> Manutenção Limpeza Compras
        - CONDIMENTOS -> Condimentos
        - CONDIMENTOS COZINHA -> Condimentos Cozinha
        - MATERIAL ADM -> Material Adm
        - MANUAIS -> Manuais
        - FERRAMENTAS & UTENSÍLIOS -> Ferramentas Utensilios
        - MARKETING GERAL CUSTO -> Marketing Geral Custo
        - FARDAS -> Fardas
        - DISTRIBUIÇÃO DE MARKETING -> Distribuição de Marketing
        - BULK ALIMENTAR -> Bulk Alimentar
        - BULK PAPEL -> Bulk Papel

        REGRAS DE FORMATAÇÃO:
        - Os valores na fatura usam vírgula para decimais e ponto para milhares (ex: 6.035,57). Converta para formato numérico (ex: 6035.57).
        - Responda APENAS em JSON.
        
        ESTRUTURA DA RESPOSTA:
        {
          "groups": [
            {"description": "Congelados", "total": 6052.67},
            {"description": "Ferramentas Utensilios", "total": 17.66},
            ...
          ],
          "pontoVerde": 30.06
        }
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: base64Pdf,
              },
            },
            { text: prompt }
          ]
        },
        config: {
          responseMimeType: "application/json"
        }
      });

      const result = JSON.parse(response.text || '{}');
      
      if (result.groups || result.pontoVerde !== undefined) {
        setLocal(prev => {
          const updatedGroups = prev.haviGroups.map(g => {
            const match = result.groups?.find((rg: any) => rg.description.toLowerCase() === g.description.toLowerCase());
            return match ? { ...g, total: match.total } : g;
          });

          return {
            ...prev,
            haviGroups: updatedGroups,
            pontoVerde: result.pontoVerde || 0
          };
        });
        alert("Fatura HAVI processada com sucesso! Totais por grupo e Ponto Verde extraídos.");
      }

    } catch (err) {
      console.error("Erro ao processar PDF:", err);
      alert("Ocorreu um erro ao processar a fatura PDF. Verifique se o ficheiro é válido.");
    } finally {
      setIsProcessingPdf(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in print:p-0">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center print:hidden">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 font-medium">
          <ArrowLeft size={18} /> Voltar
        </button>
        <div className="flex items-center gap-3">
           <input type="file" ref={fileInputRef} onChange={handleLoadInvoice} accept=".pdf" className="hidden" />
           <button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={isProcessingPdf}
            className="flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-100 font-bold border border-purple-200 transition-all disabled:opacity-50"
           >
              {isProcessingPdf ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18}/>}
              {isProcessingPdf ? "A processar fatura..." : "Carregar Fatura"}
           </button>
           <button onClick={() => window.print()} className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-200 font-bold transition-all"><Printer size={18}/> Imprimir</button>
           <button onClick={() => handleSaveInternal(false)} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-100 font-bold transition-all"><Save size={18}/> Gravar Rascunho</button>
           <button onClick={() => handleSaveInternal(true)} className="flex items-center gap-2 bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 font-bold shadow-md transition-all active:scale-95"><CheckCircle2 size={18}/> Finalizar</button>
        </div>
      </div>

      <div className="bg-white border-2 border-purple-500 rounded-lg p-6 space-y-6 shadow-xl print:border-none print:shadow-none print:p-0">
        <div className="flex justify-between items-center border-b border-purple-100 pb-4">
          <h2 className="text-2xl font-black text-purple-800 uppercase tracking-tighter">Conferência de Entrega</h2>
          <div className="text-right">
            <div className="text-[10px] font-bold text-purple-500 uppercase tracking-widest">ID Registo</div>
            <div className="text-xs font-mono text-gray-400">{local.id.split('-')[0]}</div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* HAVI SECTION */}
          <div className="border border-purple-500 rounded-lg overflow-hidden flex flex-col">
            <div className="bg-purple-50 py-1.5 text-center font-black text-purple-800 border-b border-purple-500 uppercase text-xs tracking-wider">Factura Havi</div>
            <div className="p-1 flex flex-col flex-1 divide-y divide-purple-100">
               <div className="grid grid-cols-12 gap-1 text-[9px] font-black uppercase text-purple-600 px-2 py-1">
                 <div className="col-span-1">GRP</div>
                 <div className="col-span-8">Descrição</div>
                 <div className="col-span-3 text-right">Total</div>
               </div>
               {local.haviGroups.map(group => (
                 <div key={group.group} className="grid grid-cols-12 gap-1 px-2 py-0.5 items-center hover:bg-purple-50/50">
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
               <div className="grid grid-cols-12 gap-1 px-2 py-1 items-center bg-purple-50/30">
                  <div className="col-span-1"></div>
                  <div className="col-span-8 text-[10px] font-black text-purple-800">Contribuição Ponto Verde</div>
                  <div className="col-span-3">
                    <input 
                        type="number" 
                        value={local.pontoVerde || ''} 
                        onChange={(e) => setLocal({...local, pontoVerde: parseFloat(e.target.value) || 0})}
                        className="w-full text-right bg-transparent border-none p-0 text-[10px] font-black focus:ring-0 text-purple-800" 
                        placeholder="0.00"
                    />
                  </div>
               </div>
               <div className="p-3 bg-purple-100/50 text-right font-black text-purple-900 text-lg border-t border-purple-500">
                  {totalHaviFinal.toFixed(2)} €
               </div>
            </div>
          </div>

          {/* MYSTORE SECTION */}
          <div className="border border-purple-500 rounded-lg overflow-hidden flex flex-col">
            <div className="bg-purple-50 py-1.5 text-center font-black text-purple-800 border-b border-purple-500 uppercase text-xs tracking-wider">MyStore</div>
            <div className="p-1 flex flex-col flex-1 divide-y divide-purple-100">
               <div className="grid grid-cols-12 gap-1 text-[9px] font-black uppercase text-purple-600 px-2 py-1">
                 <div className="col-span-9">Descrição</div>
                 <div className="col-span-3 text-right">Montante</div>
               </div>
               {local.smsValues.map(v => (
                 <div key={v.description} className="grid grid-cols-12 gap-1 px-2 py-1.5 items-center hover:bg-purple-50/50">
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
               <div className="mt-12 p-3 bg-purple-100/50 text-center flex flex-col justify-center min-h-[100px] border-t border-purple-500">
                  <div className="text-2xl font-black text-purple-900 leading-none mb-2">{totalMyStore.toFixed(2)} €</div>
                  <div className="text-[10px] uppercase font-bold text-purple-600">Total MyStore Consolidado</div>
               </div>
            </div>
          </div>

          {/* DIFFERENCE SECTION */}
          <div className="border border-purple-500 rounded-lg overflow-hidden flex flex-col">
            <div className="bg-purple-50 py-1.5 text-center font-black text-purple-800 border-b border-purple-500 uppercase text-xs tracking-wider">Resumo de Diferenças</div>
            <div className="p-1 flex flex-col flex-1 divide-y divide-purple-100">
               <div className="grid grid-cols-12 gap-1 text-[9px] font-black uppercase text-purple-600 px-2 py-1">
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
                  <div className="text-4xl font-black text-purple-950 mb-1">{finalDifference.toFixed(2)} €</div>
                  <div className={`h-1.5 w-24 rounded-full ${Math.abs(finalDifference) > 0.05 ? 'bg-red-500' : 'bg-purple-500'}`}></div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase mt-2">Diferença Total Final</span>
               </div>
            </div>
          </div>
        </div>

        {/* PRICE DIFFERENCES TABLE */}
        <div className="border border-purple-500 rounded-lg overflow-hidden">
           <div className="bg-purple-50 py-1.5 px-4 flex justify-between items-center border-b border-purple-500">
              <span className="font-black text-purple-800 uppercase text-xs tracking-wider">Diferenças de Preço</span>
              <button 
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 bg-purple-600 text-white px-3 py-1 rounded text-[10px] font-black uppercase hover:bg-purple-700 transition-colors shadow-sm"
              >
                <Plus size={12} /> Adicionar Registo
              </button>
           </div>
           
           <div className="flex flex-col">
              <div className="grid grid-cols-12 gap-2 bg-purple-50/20 px-4 py-2 border-b border-purple-100">
                 <div className="col-span-2 text-[10px] font-bold uppercase text-purple-600">Grupo</div>
                 <div className="col-span-4 text-[10px] font-bold uppercase text-purple-600">Produto</div>
                 <div className="col-span-2 text-[10px] font-bold uppercase text-purple-600 text-center">Preço HAVI</div>
                 <div className="col-span-2 text-[10px] font-bold uppercase text-purple-600 text-center">Preço MyStore</div>
                 <div className="col-span-1 text-[10px] font-bold uppercase text-purple-600 text-center">Dif.</div>
                 <div className="col-span-1"></div>
              </div>
              
              <div className="divide-y divide-purple-50 min-h-[40px]">
                 {local.priceDifferences.map(item => (
                    <div key={item.id} className="grid grid-cols-12 gap-2 px-4 py-2 group items-center hover:bg-purple-50/10">
                       <div className="col-span-2 text-[11px] font-bold text-purple-700 uppercase">{item.category}</div>
                       <div className="col-span-4"><input type="text" value={item.product} onChange={(e) => handleUpdatePriceDiff(item.id, 'product', e.target.value)} className="w-full text-[11px] border-none p-0 focus:ring-0 font-medium" /></div>
                       <div className="col-span-2"><input type="number" value={item.priceHavi || ''} onChange={(e) => handleUpdatePriceDiff(item.id, 'priceHavi', parseFloat(e.target.value) || 0)} className="w-full text-[11px] text-center border-none p-0 focus:ring-0 font-bold" /></div>
                       <div className="col-span-2"><input type="number" value={item.priceSms || ''} onChange={(e) => handleUpdatePriceDiff(item.id, 'priceSms', parseFloat(e.target.value) || 0)} className="w-full text-[11px] text-center border-none p-0 focus:ring-0 font-bold" /></div>
                       <div className="col-span-1 text-[11px] text-center font-black text-purple-900">{(item.priceHavi - item.priceSms).toFixed(2)}€</div>
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
                <div className="bg-purple-50/40 p-4 border-t border-purple-200">
                    <h4 className="text-[10px] font-black text-purple-800 uppercase mb-3 flex items-center gap-1.5"><Calculator size={12}/> Resumo das Diferenças por Grupo</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {BILLING_GROUPS.map(group => {
                            const val = diffByGroup[group] || 0;
                            return (
                                <div key={group} className="bg-white border border-purple-100 rounded p-2 flex flex-col items-center">
                                    <span className="text-[8px] font-bold text-gray-400 uppercase text-center mb-1 leading-tight">{group}</span>
                                    <span className={`text-xs font-black ${Math.abs(val) > 0.01 ? 'text-purple-900' : 'text-gray-300'}`}>{val.toFixed(2)}€</span>
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
              <h3 className="text-lg font-black text-purple-800 uppercase mb-6 flex items-center gap-2">
                <Calculator className="text-purple-600" /> Adicionar Diferença
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Grupo</label>
                  <select 
                    value={newEntry.category} 
                    onChange={(e) => setNewEntry({...newEntry, category: e.target.value})}
                    className="w-full p-2.5 border border-purple-100 rounded-lg text-sm font-bold focus:ring-2 focus:ring-purple-500 outline-none"
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
                    className="w-full p-2.5 border border-purple-100 rounded-lg text-sm font-bold focus:ring-2 focus:ring-purple-500 outline-none"
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
                      className="w-full p-2.5 border border-purple-100 rounded-lg text-sm font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Preço MyStore</label>
                    <input 
                      type="number" 
                      value={newEntry.priceMyStore || ''}
                      onChange={(e) => setNewEntry({...newEntry, priceMyStore: parseFloat(e.target.value) || 0})}
                      placeholder="0.00"
                      className="w-full p-2.5 border border-purple-100 rounded-lg text-sm font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                </div>
                
                <div className="bg-purple-50 p-3 rounded-lg flex justify-between items-center">
                  <span className="text-[10px] font-black text-purple-600 uppercase">Diferença Estimada</span>
                  <span className="text-lg font-black text-purple-900">{(newEntry.priceHavi - newEntry.priceMyStore).toFixed(2)}€</span>
                </div>

                <div className="flex gap-3 pt-4">
                  <button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2.5 text-gray-500 font-bold text-sm hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
                  <button 
                    onClick={handleAddPriceDiff}
                    disabled={!newEntry.product.trim()}
                    className="flex-1 bg-purple-600 text-white font-black px-4 py-2.5 rounded-lg hover:bg-purple-700 transition-all shadow-lg shadow-purple-500/30 disabled:opacity-50"
                  >
                    Confirmar Registo
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MISSING PRODUCTS SECTION */}
        <div className="border border-purple-500 rounded-lg overflow-hidden">
           <div className="bg-purple-50 py-1.5 text-center font-black text-purple-800 border-b border-purple-500 uppercase text-xs tracking-wider">Produto não Introduzido</div>
           <div className="flex flex-col">
              <div className="grid grid-cols-12 gap-2 bg-purple-50/20 px-4 py-2 border-b border-purple-100">
                 <div className="col-span-5 text-[10px] font-bold uppercase text-purple-600">Produto</div>
                 <div className="col-span-2 text-[10px] font-bold uppercase text-purple-600">Grupo</div>
                 <div className="col-span-2 text-[10px] font-bold uppercase text-purple-600">Preço HAVI</div>
                 <div className="col-span-3 text-[10px] font-bold uppercase text-purple-600">Motivo</div>
              </div>
              <div className="divide-y divide-purple-50 min-h-[60px]">
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
                 <button onClick={handleAddMissingProduct} className="py-2 text-[10px] text-purple-600 hover:bg-purple-50 flex items-center justify-center gap-1 font-bold tracking-widest uppercase"><Plus size={14} /> Novo Produto Não Introduzido</button>
              </div>
           </div>
        </div>

        {/* COMMENTS */}
        <div className="border border-purple-500 rounded-lg overflow-hidden">
           <div className="bg-purple-50 py-1.5 text-center font-black text-purple-800 border-b border-purple-500 uppercase text-xs tracking-wider">Comentários Adicionais</div>
           <textarea 
            value={local.comments}
            onChange={(e) => setLocal({...local, comments: e.target.value})}
            className="w-full min-h-[80px] p-4 text-xs font-medium text-gray-700 outline-none border-none resize-none placeholder:text-gray-300" 
            placeholder="Escreva aqui quaisquer observações ou anomalias detetadas..."
           />
        </div>

        <div className="grid grid-cols-4 gap-4 pt-4 border-t border-purple-100">
           <div className="col-span-2 flex flex-col border-r border-purple-100">
              <span className="text-[10px] font-black uppercase text-purple-400">Data Factura</span>
              <span className="text-sm font-black text-purple-950">{new Date(local.date).toLocaleDateString('pt-PT')}</span>
           </div>
           <div className="col-span-2 flex flex-col">
              <span className="text-[10px] font-black uppercase text-purple-400">Gerente Responsável</span>
              <span className="text-sm font-black text-purple-950 uppercase">{managerName}</span>
           </div>
        </div>
      </div>
    </div>
  );
};
