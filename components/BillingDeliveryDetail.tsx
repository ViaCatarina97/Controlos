import React, { useState, useMemo, useRef } from 'react';
import { DeliveryRecord, Employee, MissingProduct } from '../types';
import { ArrowLeft, Plus, Trash2, UploadCloud, Loader2, AlertCircle, X, PackageX } from 'lucide-react';

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

const GRUPOS_HAVI = [
  { id: '1', name: 'Congelados', search: 'Congelados' },
  { id: '2', name: 'Refrigerados', search: 'Refrigerados' },
  { id: '3', name: 'Secos Comida', search: 'Secos Comida' },
  { id: '4', name: 'Secos Papel', search: 'Secos Papel' },
  { id: '5', name: 'Manutenção Limpeza', search: 'Manutenção Limpeza' },
  { id: '8', name: 'Produtos Frescos', search: 'Produtos Frescos' },
  { id: '9', name: 'MANUTENÇÃO & LIMPEZA COMPRAS', search: 'LIMPEZA COMPRAS' },
  { id: '14', name: 'Ferramentas & Utensílios', search: 'Ferramentas' },
  { id: '19', name: 'Bulk Alimentar', search: 'Bulk Alimentar' },
  { id: '20', name: 'Bulk Papel', search: 'Bulk Papel' }
];

export const BillingDeliveryDetail: React.FC<BillingDeliveryDetailProps> = ({ record, employees, onSave, onBack }) => {
  const [local, setLocal] = useState<DeliveryRecord>(record);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [priceDiffs, setPriceDiffs] = useState<PriceDiffItem[]>([]);
  const [missingProducts, setMissingProducts] = useState<MissingProduct[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDiff, setNewDiff] = useState({ group: GRUPOS_HAVI[0].name, product: '', havi: 0, mystore: 0 });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatNumeric = (val: number) => val.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const totalHaviFinal = useMemo(() => local.haviGroups.reduce((s, g) => s + g.total, 0) + local.pontoVerde, [local.haviGroups, local.pontoVerde]);
  const totalMyStore = useMemo(() => local.smsValues.reduce((s, v) => s + v.amount, 0), [local.smsValues]);
  const finalDifference = totalHaviFinal - totalMyStore;

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
        fullText += content.items.map((item: any) => item.str).join(" ") + " \n";
      }

      // Normalização agressiva para lidar com quebras de linha e caracteres especiais
      const cleanText = fullText.replace(/\s+/g, ' ');

      const extractValue = (searchName: string) => {
        // Regex que procura o nome e ignora tudo até encontrar o padrão de moeda 0,00 EUR
        // Como a fatura tem 4 colunas, procuramos o padrão de valor total (o mais à direita)
        const escaped = searchName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`${escaped}.*?(\\d[\\d.]*,\\d{2})\\s*EUR`, 'i');
        const match = cleanText.match(regex);
        
        if (match) {
          // Tentamos capturar se existem múltiplos valores EUR na sequência para pegar o último (Total)
          const multiMatch = cleanText.match(new RegExp(`${escaped}(?:.*?\\d[\\d.]*,\\d{2}\\s*EUR){1,4}`, 'i'));
          if (multiMatch) {
            const allValues = multiMatch[0].match(/\d[\d.]*,\d{2}/g);
            if (allValues) {
              const lastVal = allValues[allValues.length - 1];
              return parseFloat(lastVal.replace(/\./g, '').replace(',', '.'));
            }
          }
          return parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
        }
        return 0;
      };

      const updatedGroups = local.haviGroups.map(g => {
        const config = GRUPOS_HAVI.find(c => c.name === g.description);
        if (config) {
          const val = extractValue(config.search);
          return val > 0 ? { ...g, total: val } : { ...g, total: 0 };
        }
        return { ...g, total: 0 }; // Limpa campos que não estão no mapeamento
      });

      setLocal(prev => ({ 
        ...prev, 
        haviGroups: updatedGroups,
        pontoVerde: extractValue("TOTAL") || prev.pontoVerde 
      }));

      alert("Importação concluída! Verifique se os valores estão nas colunas corretas.");
    } catch (err: any) {
      alert("Erro: " + err.message);
    } finally {
      setIsProcessingPdf(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in pb-10">
      {/* HEADER */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center print:hidden">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 font-bold italic hover:text-gray-800 transition-colors"><ArrowLeft size={18} /> Voltar</button>
        <div className="flex items-center gap-3">
          <input type="file" ref={fileInputRef} onChange={handleLoadInvoice} accept=".pdf" className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="bg-amber-500 text-white px-6 py-2 rounded-lg font-black uppercase text-xs flex items-center gap-2 shadow-lg hover:bg-amber-600">
            {isProcessingPdf ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16}/>} Importar Fatura
          </button>
          <button onClick={() => onSave({...local, isFinalized: true})} className="bg-purple-600 text-white px-6 py-2 rounded-lg font-black uppercase text-xs shadow-md shadow-purple-200">Finalizar</button>
        </div>
      </div>

      {/* 3 COLUNAS */}
      <div className="bg-white border-2 border-purple-500 rounded-lg p-6 shadow-xl print:border-none">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* HAVI */}
          <div className="border border-purple-500 rounded-lg overflow-hidden flex flex-col">
            <div className="bg-purple-50 py-1.5 text-center font-black text-purple-800 border-b border-purple-500 text-[10px] uppercase">HAVI (Valor Total)</div>
            <div className="p-1 divide-y divide-purple-100 flex-1">
               {local.haviGroups.map(g => (
                 <div key={g.description} className="grid grid-cols-12 px-2 py-1 items-center hover:bg-purple-50 transition-colors">
                    <div className="col-span-9 text-[9px] font-bold text-gray-700 uppercase">{g.description}</div>
                    <div className="col-span-3 text-right text-[10px] font-black">{formatNumeric(g.total)}</div>
                 </div>
               ))}
               <div className="p-4 bg-purple-100/50 text-right font-black text-purple-900 text-2xl border-t border-purple-500 italic">{formatNumeric(totalHaviFinal)} €</div>
            </div>
          </div>

          {/* MYSTORE */}
          <div className="border border-purple-500 rounded-lg overflow-hidden flex flex-col">
            <div className="bg-purple-50 py-1.5 text-center font-black text-purple-800 border-b border-purple-500 text-[10px] uppercase">MYSTORE</div>
            <div className="p-1 divide-y divide-purple-100 flex-1">
               {local.smsValues.map(v => (
                 <div key={v.description} className="grid grid-cols-12 px-2 py-2 items-center hover:bg-slate-50 transition-colors">
                    <div className="col-span-8 text-[10px] font-bold text-gray-700 uppercase">{v.description}</div>
                    <div className="col-span-4 text-right">
                      <input 
                        type="number" step="0.01" value={v.amount || ''} 
                        onChange={(e) => setLocal({
                          ...local, 
                          smsValues: local.smsValues.map(x => x.description === v.description ? {...x, amount: parseFloat(e.target.value) || 0} : x)
                        })} 
                        className="w-full text-right bg-white border border-slate-200 rounded px-1 text-[11px] font-black outline-none focus:ring-1 focus:ring-purple-500" 
                      />
                    </div>
                 </div>
               ))}
               <div className="mt-auto p-6 bg-purple-50/30 text-center border-t border-purple-500">
                  <div className="text-3xl font-black text-purple-900 italic leading-none">{formatNumeric(totalMyStore)} €</div>
               </div>
            </div>
          </div>

          {/* DIFERENÇA */}
          <div className="border border-purple-500 rounded-lg overflow-hidden flex flex-col bg-slate-50/30 text-center p-8 justify-center">
             <div className={`text-5xl font-black italic tracking-tighter ${Math.abs(finalDifference) > 0.05 ? 'text-red-600' : 'text-emerald-600'}`}>{formatNumeric(finalDifference)} €</div>
             <div className="text-[10px] font-black text-gray-400 uppercase mt-4 italic">Diferença Total</div>
          </div>
        </div>
      </div>
    </div>
  );
};
