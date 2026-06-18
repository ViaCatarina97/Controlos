
import React, { useState, useMemo, useRef } from 'react';
import { DeliveryRecord, Employee, PriceDifferenceItem, MissingProduct } from '../types';
import { ArrowLeft, Save, Printer, Plus, Trash2, CheckCircle2, UploadCloud, Calculator, Loader2, AlertCircle, Key } from 'lucide-react';
import { processInvoicePdf, processDeliveryPdf } from '../services/geminiService';

interface BillingDeliveryDetailProps {
  record: DeliveryRecord;
  employees: Employee[];
  onSave: (record: DeliveryRecord) => void;
  onBack: () => void;
}

const SMS_GROUPS = [
  'Comida', 
  'Papel', 
  'F. Operacionais', 
  'Material Adm', 
  'Outros', 
  'Happy Meal'
];

const HAVI_GROUPS_LIST = [
  'Congelados',
  'Refrigerados',
  'Secos Comida',
  'Secos Papel',
  'Manutenção & Limpeza',
  'Marketing IPL',
  'Marketing Geral',
  'Produtos Frescos',
  'Manutenção & Limpeza Compras',
  'Condimentos',
  'Condimentos Cozinha',
  'Material Adm',
  'Manuais',
  'Ferramentas Utensilios',
  'Marketing Geral Custo',
  'Fardas',
  'Distribuição de Marketing',
  'Bulk Alimentar',
  'Bulk Papel'
];

const MISSING_REASONS = [
  'Produto indisponível no MyStore',
  'Quantidade entregue inferior à faturada',
  'Produto devolvido (Qualidade)',
  'Produto devolvido (Solicitado pelo restaurante)',
  'Outros (descrever nos comentários)'
];

const HAVI_MAPPING: Record<string, string> = {
  'CONGELADOS': 'Congelados',
  'REFRIGERADOS': 'Refrigerados',
  'SECOS COMIDA': 'Secos Comida',
  'SECOS PAPEL': 'Secos Papel',
  'FERRAMENTAS & UTENSÍLIOS': 'Ferramentas Utensilios',
  'BULK ALIMENTAR': 'Bulk Alimentar',
  'BULK PAPEL': 'Bulk Papel',
  'PRODUTOS FRESCOS': 'Produtos Frescos',
  'MANUTENÇÃO & LIMPEZA COMPRAS': 'Manutenção & Limpeza Compras',
  'MANUTENÇÃO & LIMPEZA': 'Manutenção & Limpeza',
  'CONDIMENTOS': 'Condimentos',
  'CONDIMENTOS COZINHA': 'Condimentos Cozinha',
  'MATERIAL ADM': 'Material Adm',
  'MARKETING IPL': 'Marketing IPL',
  'MANUAIS': 'Manuais',
  'FARDAS': 'Fardas',
  'DISTRIBUIÇÃO DE MARKETING': 'Distribuição de Marketing',
  'MARKETING GERAL': 'Marketing Geral',
  'MARKETING GERAL CUSTO': 'Marketing Geral Custo'
};

const getMonthYearText = (dateStr: string) => {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  const year = parts[0];
  const monthInt = parseInt(parts[1], 10);
  if (isNaN(monthInt) || monthInt < 1 || monthInt > 12) return '-';
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return `${monthNames[monthInt - 1]} ${year}`;
};

const getFormattedDate = (dateStr: string) => {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

const normalizeName = (name: string): string => {
  if (!name) return "";
  return name
    .normalize('NFD')                     // Decompose accents
    .replace(/[\u0300-\u036f]/g, '')     // Strip accents
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, ' ')          // Replace symbols with spaces
    .replace(/\s+/g, ' ')                // Collapse duplicate spaces
    .trim();
};

const normalizeCategoryName = (name: string): string => {
  if (!name) return '';
  const clean = name.trim().toLowerCase();
  
  if (clean.includes('comida') || clean.includes('alimento')) {
    return 'Comida';
  }
  if (clean.includes('papel') || clean.includes('embalagem') || clean.includes('embalagens')) {
    return 'Papel';
  }
  if (clean.includes('operaciona') || clean.includes('f. operacionais') || clean.includes('ops') || clean.includes('f.operacionais')) {
    return 'F. Operacionais';
  }
  if (clean.includes('material adm') || clean.includes('adm') || clean.includes('administrativo')) {
    return 'Material Adm';
  }
  if (clean.includes('happy') || clean.includes('happy meal')) {
    return 'Happy Meal';
  }
  if (clean.includes('outro')) {
    return 'Outros';
  }
  
  // Try exact lookup ignoring case
  const lowerMapped: Record<string, string> = {
    'comida': 'Comida',
    'papel': 'Papel',
    'f. operacionais': 'F. Operacionais',
    'f.operacionais': 'F. Operacionais',
    'operacionais': 'F. Operacionais',
    'ops': 'F. Operacionais',
    'material adm': 'Material Adm',
    'adm': 'Material Adm',
    'happy meal': 'Happy Meal',
    'outros': 'Outros'
  };
  
  return lowerMapped[clean] || name; // fallback
};

export const BillingDeliveryDetail: React.FC<BillingDeliveryDetailProps> = ({ record, employees, onSave, onBack }) => {
  const [local, setLocal] = useState<DeliveryRecord>(record);
  const managerName = employees.find(e => e.id === local.managerId)?.name || '-';
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [isProcessingDelivery, setIsProcessingDelivery] = useState(false);
  const [deliveryFilesCount, setDeliveryFilesCount] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const deliveryInputRef = useRef<HTMLInputElement>(null);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMissingModal, setShowMissingModal] = useState(false);
  
  const [newEntry, setNewEntry] = useState({
    category: 'Comida',
    product: '',
    priceHavi: 0,
    priceSms: 0,
    haviGroup: 'Congelados'
  });

  const [newMissing, setNewMissing] = useState({
    product: '',
    group: 'Congelados',
    priceHavi: 0,
    reason: MISSING_REASONS[0]
  });

  const formatEuro = (val: number) => val.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

  const totalHaviGroups = useMemo(() => local.haviGroups.reduce((s, g) => s + g.total, 0), [local.haviGroups]);
  const totalHaviFinal = totalHaviGroups;
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

  const finalDifference = useMemo(() => {
    const baseDiff = categoryDifferences.reduce((s, d) => s + d, 0);
    const missingTotal = (local.missingProducts || []).reduce((s, m) => s + (m.priceHavi || 0), 0);
    return baseDiff + missingTotal;
  }, [categoryDifferences, local.missingProducts]);

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
    setNewEntry({ category: 'Comida', product: '', priceHavi: 0, priceSms: 0, haviGroup: 'Congelados' });
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
    setNewMissing({ product: '', group: 'Congelados', priceHavi: 0, reason: MISSING_REASONS[0] });
    setShowMissingModal(false);
  };

  const handleRemoveItem = (id: string, type: 'diff' | 'missing') => {
    if (type === 'diff') setLocal(prev => ({ ...prev, priceDifferences: prev.priceDifferences.filter(i => i.id !== id) }));
    else setLocal(prev => ({ ...prev, missingProducts: prev.missingProducts.filter(i => i.id !== id) }));
  };

  const handleSaveInternal = (finalize = false) => {
    onSave({ ...local, isFinalized: finalize });
  };

  const handleLoadInvoice = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsProcessingPdf(true);
    try {
      const result = await processInvoicePdf(file);
      
      if (result && result.grupos) {
        setLocal(prev => {
          const updatedHaviGroups = prev.haviGroups.map(internal => {
            const pdfMatch = result.grupos.find((pg: any) => {
                const pdfName = pg.nome || "";
                const internalDesc = internal.description || "";
                
                const normPdf = normalizeName(pdfName);
                const normInternal = normalizeName(internalDesc);
                
                const mappedName = HAVI_MAPPING[pdfName.toUpperCase().trim()] || pdfName;
                const normMapped = normalizeName(mappedName);

                // 1. Exact match checking has priority
                if (normPdf === normInternal || normMapped === normInternal) {
                  return true;
                }

                // 2. Loose substring matching check
                const isLoose = (
                  (normPdf.length > 2 && normInternal.includes(normPdf)) || 
                  (normInternal.length > 2 && normPdf.includes(normInternal)) ||
                  (normMapped.length > 2 && normInternal.includes(normMapped)) || 
                  (normInternal.length > 2 && normMapped.includes(normInternal))
                );

                if (isLoose) {
                  // Guard against prefix conflict (e.g. "Manutenção & Limpeza" vs "Manutenção & Limpeza Compras")
                  const forms = [normPdf, normMapped].filter(Boolean);
                  const isPrefixConflict = forms.some(f => f.startsWith(normInternal) || normInternal.startsWith(f));
                  if (isPrefixConflict) {
                    return false;
                  }
                  return true;
                }

                return false;
            });
            return pdfMatch ? { ...internal, total: pdfMatch.valor_total } : internal;
          });

          return { 
            ...prev, 
            haviGroups: updatedHaviGroups, 
            pontoVerde: result.ponto_verde_total || 0,
            comments: `Importado: ${result.documento || 'Fatura'}\nTotal Fatura: ${result.total_geral_fatura.toFixed(2).replace('.', ',')}€\n${prev.comments}`
          };
        });
      }
    } catch (err: any) {
      if (err.message === "AUTH_REQUIRED") {
        if ((window as any).aistudio) {
          await (window as any).aistudio.openSelectKey();
        } else {
          alert("Configuração Pendente: A chave da API Gemini (GEMINI_API_KEY) não está configurada nas variáveis de ambiente do seu projeto Vercel.\n\nPor favor, adicione a variável 'GEMINI_API_KEY' nas configurações da Vercel para que a extração automática de PDFs funcione em produção.");
        }
      } else {
          alert(`Erro ao processar PDF: ${err.message || err}\n\nVerifique se o ficheiro é uma fatura HAVI válida e se a sua chave API do Gemini está devidamente configurada.`);
      }
    } finally {
      setIsProcessingPdf(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLoadDelivery = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingDelivery(true);
    setDeliveryFilesCount(files.length);
    try {
      const accumulated: Record<string, number> = {};
      const documentInfos: string[] = [];

      // Process all selected files concurrently using Promise.all to drastically reduce loading times
      const fileList = Array.from(files) as File[];
      const results = await Promise.all(
        fileList.map(async (file) => {
          const result = await processDeliveryPdf(file);
          return { file, result };
        })
      );

      for (const { file, result } of results) {
        if (result && result.valores) {
          result.valores.forEach((v: any) => {
            const cat = normalizeCategoryName(v.categoryName); 
            const amt = v.totalVal || 0;
            accumulated[cat] = (accumulated[cat] || 0) + amt;
          });

          const docName = result.documento || file.name;
          documentInfos.push(`${docName} (${result.data || 'Sem Data'})`);
        }
      }

      setLocal(prev => {
        const updatedSmsValues = prev.smsValues.map(sms => {
          const accVal = accumulated[sms.description];
          if (accVal !== undefined) {
             return {
              ...sms,
              amount: sms.amount + accVal
            };
          }
          return sms;
        });

        const newCommentLine = `Importadas Entregas:\n${documentInfos.map(info => `- ${info}`).join('\n')}`;
        return {
          ...prev,
          smsValues: updatedSmsValues,
          comments: `${newCommentLine}\n${prev.comments}`
        };
      });

    } catch (err: any) {
      if (err.message === "AUTH_REQUIRED") {
        if ((window as any).aistudio) {
          await (window as any).aistudio.openSelectKey();
        } else {
          alert("Configuração Pendente: A chave da API Gemini (GEMINI_API_KEY) não está configurada nas variáveis de ambiente do seu projeto Vercel.\n\nPor favor, adicione a variável 'GEMINI_API_KEY' nas configurações da Vercel para que a extração automática de PDFs funcione em produção.");
        }
      } else {
        alert(`Erro ao processar PDF(s) de Entrega: ${err.message || err}\n\nVerifique se os ficheiros são folhas de entrega válidas e se a sua chave API do Gemini está devidamente configurada.`);
      }
    } finally {
      setIsProcessingDelivery(false);
      setDeliveryFilesCount(0);
      if (deliveryInputRef.current) deliveryInputRef.current.value = '';
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
           <input type="file" ref={deliveryInputRef} onChange={handleLoadDelivery} accept=".pdf" multiple className="hidden" />
           <button onClick={() => fileInputRef.current?.click()} disabled={isProcessingPdf || isProcessingDelivery} className="flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-100 font-bold border border-purple-200 transition-all disabled:opacity-50 shadow-sm">
              {isProcessingPdf ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18}/>}
              {isProcessingPdf ? "A carregar..." : "Carregar Fatura"}
           </button>
           <button onClick={() => deliveryInputRef.current?.click()} disabled={isProcessingPdf || isProcessingDelivery} className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg hover:bg-emerald-100 font-bold border border-emerald-200 transition-all disabled:opacity-50 shadow-sm">
              {isProcessingDelivery ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18}/>}
              {isProcessingDelivery ? (deliveryFilesCount > 1 ? `A processar (${deliveryFilesCount})...` : "A carregar...") : "Carregar Entrega"}
           </button>
           <button onClick={() => window.print()} className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-200 font-bold transition-all"><Printer size={18}/> Imprimir</button>
           <button onClick={() => handleSaveInternal(false)} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-100 font-bold transition-all"><Save size={18}/> Gravar</button>
           <button onClick={() => handleSaveInternal(true)} className="flex items-center gap-2 bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 font-bold shadow-md transition-all active:scale-95"><CheckCircle2 size={18}/> Finalizar</button>
        </div>
      </div>

      <div className="bg-white border-2 border-purple-500 rounded-lg p-6 space-y-6 shadow-xl print:border-none print:shadow-none print:p-0">
        <div className="flex justify-between items-start border-b border-purple-100 pb-4 relative">
          {/* @ts-ignore */}
          {window.aistudio && (
            <button 
              // @ts-ignore
              onClick={() => window.aistudio.openSelectKey()} 
              className="absolute left-0 bottom-1 flex items-center gap-1 text-[10px] font-black uppercase text-gray-400 hover:text-purple-600 transition-colors print:hidden"
            >
              <Key size={12} /> Configurar Chave
            </button>
          )}

          {/* Dummy element for spacing */}
          <div className="flex-1 hidden md:block print:block"></div>

          {/* Centered Title */}
          <div className="flex-1 text-center">
            <h2 className="text-2xl font-black text-purple-800 uppercase tracking-tighter">Controlo de Faturação</h2>
          </div>

          {/* Right side block for Month, Date, and Manager */}
          <div className="flex-1 text-right text-xs">
            <div className="font-black text-purple-800 text-sm uppercase tracking-tight">{getMonthYearText(local.date)}</div>
            <div className="font-bold text-gray-500 mt-0.5">{getFormattedDate(local.date)}</div>
            <div className="font-extrabold text-slate-700 uppercase tracking-wider text-[10px] mt-1">{managerName}</div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:grid-cols-3 print:gap-4">
          <div className="border border-purple-500 rounded-lg overflow-hidden flex flex-col">
            <div className="bg-purple-50 py-1.5 text-center font-black text-purple-800 border-b border-purple-500 uppercase text-xs tracking-wider">HAVI</div>
            <div className="p-1 flex flex-col flex-1 divide-y divide-purple-100">
               <div className="grid grid-cols-12 gap-1 text-[9px] font-black uppercase text-purple-600 px-2 py-1">
                 <div className="col-span-9">Descrição</div>
                 <div className="col-span-3 text-right">Total</div>
               </div>
               {local.haviGroups.map(group => (
                 <div key={group.group} className="grid grid-cols-12 gap-1 px-2 py-0.5 items-center hover:bg-purple-50/50">
                    <div className="col-span-9 text-[10px] font-medium text-gray-700">{group.description}</div>
                    <div className="col-span-3">
                      <input type="number" step="0.01" value={group.total || ''} onChange={(e) => handleUpdateGroupTotal(group.group, parseFloat(e.target.value) || 0)} className="w-full text-right bg-white border-none p-0 text-[10px] font-black text-slate-900 focus:ring-0" placeholder="0,00" />
                    </div>
                 </div>
               ))}
               <div className="p-3 bg-purple-100/50 text-right font-black text-purple-900 text-lg border-t border-purple-500">
                  {formatEuro(totalHaviFinal)}
               </div>
            </div>
          </div>

          <div className="border border-purple-500 rounded-lg overflow-hidden flex flex-col">
            <div className="bg-purple-50 py-1.5 text-center font-black text-purple-800 border-b border-purple-500 uppercase text-xs tracking-wider">MyStore</div>
            <div className="p-1 flex flex-col flex-1 divide-y divide-purple-100">
               <div className="grid grid-cols-12 gap-1 text-[9px] font-black uppercase text-purple-600 px-2 py-1">
                 <div className="col-span-9">Descrição</div>
                 <div className="col-span-3 text-right">Total</div>
               </div>
               {local.smsValues.map(v => (
                 <div key={v.description} className="grid grid-cols-12 gap-1 px-2 py-1.5 items-center hover:bg-purple-50/50">
                    <div className="col-span-9 text-[11px] font-bold text-gray-700">{v.description}</div>
                    <div className="col-span-3">
                       <input type="number" step="0.01" value={v.amount || ''} onChange={(e) => handleUpdateMyStoreValue(v.description, parseFloat(e.target.value) || 0)} className="w-full text-right bg-white border-none p-0 text-[11px] font-black text-slate-900 focus:ring-0" placeholder="0,00" />
                    </div>
                 </div>
               ))}
               <div className="mt-12 p-3 bg-purple-100/50 text-center flex flex-col justify-center min-h-[100px] border-t border-purple-500">
                  <div className="text-2xl font-black text-purple-900 leading-none mb-2">{formatEuro(totalMyStore)}</div>
                  <div className="text-[10px] uppercase font-bold text-purple-600">Total MyStore Consolidado</div>
               </div>
            </div>
          </div>

          <div className="border border-purple-500 rounded-lg overflow-hidden flex flex-col">
            <div className="bg-purple-50 py-1.5 text-center font-black text-purple-800 border-b border-purple-500 uppercase text-xs tracking-wider">Diferenças</div>
            <div className="p-1 flex flex-col flex-1 divide-y divide-purple-100">
               <div className="grid grid-cols-12 gap-1 text-[9px] font-black uppercase text-purple-600 px-2 py-1">
                 <div className="col-span-8">Descrição</div>
                 <div className="col-span-4 text-right">Total</div>
               </div>
               {local.smsValues.map((v, idx) => {
                 const diff = categoryDifferences[idx];
                 return (
                    <div key={v.description} className="grid grid-cols-12 gap-1 px-2 py-1.5 items-center">
                        <div className="col-span-8 text-[11px] font-bold text-gray-700">{v.description}</div>
                        <div className={`col-span-4 text-right text-[11px] font-black ${Math.abs(diff) > 0.1 ? 'text-red-500' : 'text-gray-400'}`}>
                            {formatEuro(diff)}
                        </div>
                    </div>
                 );
               })}
               <div className="mt-12 p-3 bg-white text-center flex flex-col justify-end flex-1 items-center pb-8">
                  <div className="text-4xl font-black text-slate-950 mb-1">{formatEuro(finalDifference)}</div>
                  <div className={`h-1.5 w-24 rounded-full ${Math.abs(finalDifference) > 0.05 ? 'bg-red-500' : 'bg-purple-500'}`}></div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase mt-2">Diferença Total Final</span>
               </div>
            </div>
          </div>
        </div>

        <div className="flex gap-6">
           <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-slate-700 flex items-center gap-2 uppercase text-xs tracking-widest"><AlertCircle size={16} className="text-amber-500" /> Diferenças de Preço</h3>
                 <button onClick={() => setShowAddModal(true)} className="p-1 text-purple-600 hover:bg-purple-100 rounded transition-colors"><Plus size={20} /></button>
              </div>
              <div className="overflow-auto max-h-48 custom-scrollbar">
                 <table className="w-full text-[10px]">
                    <thead className="text-slate-400 uppercase font-black border-b border-slate-200">
                       <tr>
                          <th className="text-left py-2">Cat. MyStore</th>
                          <th className="text-left py-2">Produto (Grupo HAVI)</th>
                          <th className="text-right py-2">HAVI</th>
                          <th className="text-right py-2">MyStore</th>
                          <th className="text-right py-2">Diff</th>
                          <th className="w-8"></th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {local.priceDifferences.map(item => (
                          <tr key={item.id} className="hover:bg-white group transition-colors">
                             <td className="py-2 text-slate-500">{item.category}</td>
                             <td className="py-2 font-bold text-slate-700">
                                {item.product} {item.haviGroup ? `(${item.haviGroup})` : ''}
                             </td>
                             <td className="py-2 text-right">{formatEuro(item.priceHavi)}</td>
                             <td className="py-2 text-right">{formatEuro(item.priceSms)}</td>
                             <td className="py-2 text-right font-black text-red-500">{formatEuro(item.priceHavi - item.priceSms)}</td>
                             <td className="text-center"><button onClick={() => handleRemoveItem(item.id, 'diff')} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={12} /></button></td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>

           <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-slate-700 flex items-center gap-2 uppercase text-xs tracking-widest"><Calculator size={16} className="text-blue-500" /> Não Introduzido</h3>
                 <button onClick={() => setShowMissingModal(true)} className="p-1 text-purple-600 hover:bg-purple-100 rounded transition-colors"><Plus size={20} /></button>
              </div>
              <div className="overflow-auto max-h-48 custom-scrollbar">
                 <table className="w-full text-[10px]">
                    <thead className="text-slate-400 uppercase font-black border-b border-slate-200">
                       <tr>
                          <th className="text-left py-2">Produto</th>
                          <th className="text-left py-2">Grupo</th>
                          <th className="text-right py-2">Valor</th>
                          <th className="text-left py-2 px-2">Motivo</th>
                          <th className="w-8"></th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {local.missingProducts.map(item => (
                          <tr key={item.id} className="hover:bg-white group transition-colors">
                             <td className="py-2 font-bold text-slate-700">{item.product}</td>
                             <td className="py-2 text-slate-500">{item.group}</td>
                             <td className="py-2 text-right font-black">{formatEuro(item.priceHavi)}</td>
                             <td className="py-2 px-2 truncate max-w-[120px] italic text-slate-400">{item.reason}</td>
                             <td className="text-center"><button onClick={() => handleRemoveItem(item.id, 'missing')} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={12} /></button></td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
           <h3 className="font-bold text-slate-700 uppercase text-xs tracking-widest mb-2">Comentários</h3>
           <textarea 
             value={local.comments} 
             onChange={(e) => setLocal({...local, comments: e.target.value})} 
             placeholder=""
             className="w-full h-24 p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm"
           />
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-scale-up">
            <h3 className="text-xl font-bold text-gray-800 mb-6 uppercase tracking-tight">Nova Diferença de Preço</h3>
            <div className="space-y-4">
               <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Categoria MyStore</label>
                  <select value={newEntry.category} onChange={e => setNewEntry({...newEntry, category: e.target.value})} className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium">
                     {SMS_GROUPS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
               </div>
               <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Grupo HAVI do Produto</label>
                  <select value={newEntry.haviGroup} onChange={e => setNewEntry({...newEntry, haviGroup: e.target.value})} className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium">
                     {HAVI_GROUPS_LIST.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
               </div>
               <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Produto</label>
                  <input type="text" value={newEntry.product} onChange={e => setNewEntry({...newEntry, product: e.target.value})} className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-medium" placeholder="Nome..." />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Preço HAVI (€)</label>
                     <input type="number" step="0.01" value={newEntry.priceHavi || ''} onChange={e => setNewEntry({...newEntry, priceHavi: parseFloat(e.target.value) || 0})} className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-black" placeholder="0,00" />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Preço MyStore (€)</label>
                     <input type="number" step="0.01" value={newEntry.priceSms || ''} onChange={e => setNewEntry({...newEntry, priceSms: parseFloat(e.target.value) || 0})} className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-black" placeholder="0,00" />
                  </div>
               </div>
               <div className="pt-4 flex gap-3">
                  <button onClick={() => setShowAddModal(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-all uppercase text-xs tracking-widest">Cancelar</button>
                  <button onClick={handleAddPriceDiff} className="flex-2 px-8 py-3 bg-purple-600 text-white font-black uppercase text-xs tracking-widest rounded-xl hover:bg-purple-700 transition-all shadow-lg">Adicionar</button>
               </div>
            </div>
          </div>
        </div>
      )}

      {showMissingModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-scale-up">
            <h3 className="text-xl font-bold text-gray-800 mb-6 uppercase tracking-tight">Produto Não Introduzido</h3>
            <div className="space-y-4">
               <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Produto</label>
                  <input type="text" value={newMissing.product} onChange={e => setNewMissing({...newMissing, product: e.target.value})} className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-medium" placeholder="Nome..." />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Grupo HAVI</label>
                     <select value={newMissing.group} onChange={e => setNewMissing({...newMissing, group: e.target.value})} className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium">
                        {HAVI_GROUPS_LIST.map(g => (
                           <option key={g} value={g}>{g}</option>
                        ))}
                     </select>
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Valor HAVI (€)</label>
                     <input type="number" step="0.01" value={newMissing.priceHavi || ''} onChange={e => setNewMissing({...newMissing, priceHavi: parseFloat(e.target.value) || 0})} className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-black" placeholder="0,00" />
                  </div>
               </div>
               <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Motivo da Não Introdução</label>
                  <select value={newMissing.reason} onChange={e => setNewMissing({...newMissing, reason: e.target.value})} className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium">
                     {MISSING_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
               </div>
               <div className="pt-4 flex gap-3">
                  <button onClick={() => setShowMissingModal(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-all uppercase text-xs tracking-widest">Cancelar</button>
                  <button onClick={handleAddMissingProductConfirm} className="flex-2 px-8 py-3 bg-blue-600 text-white font-black uppercase text-xs tracking-widest rounded-xl hover:bg-blue-700 transition-all shadow-lg">Adicionar</button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
