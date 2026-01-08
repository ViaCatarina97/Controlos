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

const HAVI_GROUPS_CONFIG = [
  { id: '1', name: 'Congelados' },
  { id: '2', name: 'Refrigerados' },
  { id: '3', name: 'Secos Comida' },
  { id: '4', name: 'Secos Papel' },
  { id: '5', name: 'Manutenção Limpeza' },
  { id: '6', name: 'Marketing IPL' },
  { id: '7', name: 'Marketing Geral' },
  { id: '8', name: 'Produtos Frescos' },
  { id: '9', name: 'MANUTENÇÃO & LIMPEZA COMPRAS' },
  { id: '10', name: 'Condimentos' },
  { id: '11', name: 'Condimentos Cozinha' },
  { id: '12', name: 'Material Adm' },
  { id: '13', name: 'Manuais' },
  { id: '14', name: 'Ferramentas & Utensílios' },
  { id: '15', name: 'Marketing Geral Custo' },
  { id: '16', name: 'Fardas' },
  { id: '17', name: 'Distribuição de Marketing' },
  { id: '19', name: 'Bulk Alimentar' },
  { id: '20', name: 'Bulk Papel' }
];

export const BillingDeliveryDetail: React.FC<BillingDeliveryDetailProps> = ({ record, employees, onSave, onBack }) => {
  const [local, setLocal] = useState<DeliveryRecord>(record);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [priceDiffs, setPriceDiffs] = useState<PriceDiffItem[]>([]);
  const [missingProducts, setMissingProducts] = useState<MissingProduct[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDiff, setNewDiff] = useState({ group: HAVI_GROUPS_CONFIG[0].name, product: '', havi: 0, mystore: 0 });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatNumeric = (val: number) => val.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const totalHaviFinal = useMemo(() => local.haviGroups.reduce((s, g) => s + g.total, 0), [local.haviGroups]);
  const totalMyStore = useMemo(() => local.smsValues.reduce((s, v) => s + v.amount, 0), [local.smsValues]);
  const finalDifference = totalHaviFinal - totalMyStore;

  const handleLoadInvoice = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingPdf(true);
    try {
      // Tenta encontrar a biblioteca de várias formas (global window)
      const pdfjsLib = (window as any)['pdfjs-dist/build/pdf'] || (window as any).pdfjsLib;
      
      if (!pdfjsLib) {
        throw new Error("O motor PDF ainda não carregou. Por favor, aguarde 5 segundos e tente novamente.");
      }
      
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map((item: any) => item.str).join(" ") + " \n";
      }

      // REGEX MELHORADA: Procura o ID no início de linha e capta o 4º valor EUR (VALOR TOTAL)
      const extractValorTotal = (id: string) => {
        // Esta regex procura: ID do grupo -> Texto do Nome -> 1º EUR -> 2º EUR -> 3º EUR -> CAPTURA 4º EUR
        const regex = new RegExp(`(?:\\n|^)${id}\\s+.*?[\\d.]+,\\d{2}\\s*EUR\\s+[\\d.]+,\\d{2}\\s*EUR\\s+[\\d.]+,\\d{2}\\s*EUR\\s+([\\d.]+,\\d{2})\\s*EUR`, 'i');
        const match = fullText.match(regex);
        
        if (match) {
          return parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
        }
        return 0;
      };

      const updatedGroups = local.haviGroups.map(g => {
        const config = HAVI_GROUPS_CONFIG.find(c => c.name.toUpperCase().trim() === g.description.toUpperCase().trim());
        if (config) {
          const val = extractValorTotal(config.id);
          // Só atualiza se encontrar valor, senão mantém 0 (evita repetir valores de outros grupos)
          return { ...g, total: val };
        }
        return g;
      });

      setLocal(prev => ({ 
        ...prev, 
        haviGroups: updatedGroups,
        // Procura o Ponto Verde final na linha "TOTAL" (2ª coluna de valores do rodapé)
        pontoVerde: (fullText.match(/TOTAL\s+[\d.]+,[\d]{2}\s*EUR\s+([\d.]+,[\d]{2})\s*EUR/i)?.[1]) 
          ? parseFloat(fullText.match(/TOTAL\s+[\d.]+,[\d]{2}\s*EUR\s+([\d.]+,[\d]{2})\s*EUR/i)![1].replace(/\./g, '').replace(',', '.')) 
          : prev.pontoVerde
      }));

      alert("Importação concluída! Verifique se os valores do rodapé (Bulk/Ferramentas) estão correctos.");

    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessingPdf(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in relative pb-10">
      {/* HEADER */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center print:hidden">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 font-bold italic hover:text-gray-800 transition-colors"><ArrowLeft size={18} /> Voltar</button>
        <div className="flex items-center gap-3">
          <input type="file" ref={fileInputRef} onChange={handleLoadInvoice} accept=".pdf" className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} disabled={isProcessingPdf} className="bg-amber-500 text-white px-6 py-2 rounded-lg font-black uppercase text-xs flex items-center gap-2 shadow-lg hover:bg-amber-600 disabled:opacity-50">
            {isProcessingPdf ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16}/>} 
            {isProcessingPdf ? "A Ler..." : "Importar Fatura"}
          </button>
          <button onClick={() => onSave({...local, isFinalized: true})} className="bg-purple-600 text-white px-6 py-2 rounded-lg font-black uppercase text-xs shadow-md shadow-purple-200 hover:bg-purple-700">Finalizar e Gravar</button>
        </div>
      </div>

      {/* PAINEL 3 COLUNAS */}
      <div className="bg-white border-2 border-purple-500 rounded-lg p-6 shadow-xl print:border-none">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLUNA HAVI (VALOR TOTAL) */}
          <div className="border border-purple-500 rounded-lg overflow-hidden flex flex-col">
            <div className="bg-purple-50 py-1.5 text-center font-black text-purple-800 border-b border-purple-500 text-[10px] uppercase">HAVI (Valor Total)</div>
            <div className="p-1 divide-y divide-purple-100 flex-1">
               {HAVI_GROUPS_CONFIG.map(config => {
                 const group = local.haviGroups.find(g => g.description.toUpperCase().trim() === config.name.toUpperCase().trim()) || { total: 0 };
                 return (
                   <div key={config.id} className="grid grid-cols-12 px-2 py-1 items-center hover:bg-purple-50 transition-colors">
                      <div className="col-span-9 text-[9px] font-bold text-gray-700 uppercase">
                        <span className="text-purple-300 mr-1">{config.id}</span> {config.name}
                      </div>
                      <div className="col-span-3 text-right text-[10px] font-black">{formatNumeric(group.total)}</div>
                   </div>
                 );
               })}
               <div className="p-4 bg-purple-100/50 text-right font-black text-purple-900 text-2xl border-t border-purple-500 italic">{formatNumeric(totalHaviFinal)} €</div>
            </div>
          </div>

          {/* COLUNA MYSTORE EDITÁVEL */}
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
                        className="w-full text-right bg-white border border-slate-200 rounded px-1 text-[11px] font-black outline-none focus:ring-1 focus:ring-purple-500" 
                      />
                    </div>
                 </div>
               ))}
               <div className="mt-auto p-6 bg-purple-50/30 text-center border-t border-purple-500">
                  <div className="text-3xl font-black text-purple-900 italic">{formatNumeric(totalMyStore)} €</div>
               </div>
            </div>
          </div>

          {/* COLUNA DIFERENÇA TOTAL */}
          <div className="border border-purple-500 rounded-lg overflow-hidden flex flex-col bg-slate-50/30 text-center p-8 justify-center">
             <div className={`text-5xl font-black italic tracking-tighter ${Math.abs(finalDifference) > 0.05 ? 'text-red-600' : 'text-emerald-600'}`}>{formatNumeric(finalDifference)} €</div>
             <div className="text-[10px] font-black text-gray-400 uppercase mt-4 italic">Diferença Final</div>
          </div>
        </div>
      </div>
    </div>
  );
};
