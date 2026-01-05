import React, { useState, useMemo, useRef } from 'react';
import { DeliveryRecord, Employee, MissingProduct } from '../types';
import { ArrowLeft, Save, Printer, Plus, Trash2, CheckCircle2, UploadCloud, Calculator, Loader2, AlertCircle, X } from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';

// Configuração do Worker via CDN
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

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

// Lista exata de grupos conforme a imagem fornecida, sem números
const HAVI_GROUPS_LIST = [
  'Congelados', 'Refrigerados', 'Secos Comida', 'Secos Papel', 'Manutenção Limpeza',
  'Marketing IPL', 'Marketing Geral', 'Produtos Frescos', 'MANUTENÇÃO & LIMPEZA COMPRAS',
  'Condimentos', 'Condimentos Cozinha', 'Material Adm', 'Manuais', 'Ferramentas & Utensílios',
  'Marketing Geral Custo', 'Fardas', 'Distribuição de Marketing', 'Bulk Alimentar', 'Bulk Papel'
];

const SMS_GROUPS = ['Comida', 'Papel', 'F. Operacionais', 'Material Adm', 'Happy Meal', 'Outros'];

export const BillingDeliveryDetail: React.FC<BillingDeliveryDetailProps> = ({ record, employees, onSave, onBack }) => {
  const [local, setLocal] = useState<DeliveryRecord>(record);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [priceDiffs, setPriceDiffs] = useState<PriceDiffItem[]>([]);
  const [missingProducts, setMissingProducts] = useState<MissingProduct[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDiff, setNewDiff] = useState({ group: HAVI_GROUPS_LIST[0], product: '', havi: 0, mystore: 0 });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatNumeric = (val: number) => val.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const totalHaviFinal = useMemo(() => 
    local.haviGroups.reduce((s, g) => s + g.total, 0) + (local.pontoVerde || 0)
  , [local.haviGroups, local.pontoVerde]);

  const totalMyStore = useMemo(() => local.smsValues.reduce((s, v) => s + v.amount, 0), [local.smsValues]);
  const finalDifference = totalHaviFinal - totalMyStore;

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
        // Regex para capturar o VALOR TOTAL (última coluna) ignorando números de linha iniciais
        const escapedName = name.replace('&', '.?&.?').replace(/\s+/g, '\\s+');
        const regex = new RegExp(`(?:\\d+\\s+)?${escapedName}[^\\n]*?[\\d.]+,\\d{2}\\s*EUR[^\\n]*?[\\d.]+,\\d{2}\\s*EUR[^\\n]*?[\\d.]+,\\d{2}\\s*EUR[^\\n]*?([\\d.]+,\\d{2})\\s*EUR`, 'i');
        const match = fullText.match(regex);
        return match ? parseFloat(match[1].replace(/\./g, '').replace(',', '.')) : 0;
      };

      const updatedGroups = local.haviGroups.map(g => {
        const desc = g.description.toUpperCase().trim();
        // Mapeamento baseado nos nomes da lista limpa
        if (desc.includes('CONGELADOS')) return { ...g, total: extractValorTotal('CONGELADOS') };
        if (desc.includes('REFRIGERADOS')) return { ...g, total: extractValorTotal('REFRIGERADOS') };
        if (desc.includes('SECOS COMIDA')) return { ...g, total: extractValorTotal('SECOS COMIDA') };
        if (desc.includes('SECOS PAPEL')) return { ...g, total: extractValorTotal('SECOS PAPEL') };
        if (desc.includes('PRODUTOS FRESCOS')) return { ...g, total: extractValorTotal('PRODUTOS FRESCOS') };
        if (desc.includes('MANUTENÇÃO & LIMPEZA COMPRAS')) return { ...g, total: extractValorTotal('MANUTENÇÃO & LIMPEZA COMPRAS') };
        if (desc.includes('FERRAMENTAS & UTENSÍLIOS')) return { ...g, total: extractValorTotal('FERRAMENTAS & UTENSÍLIOS') };
        if (desc.includes('BULK ALIMENTAR')) return { ...g, total: extractValorTotal('BULK ALIMENTAR') };
        if (desc.includes('BULK PAPEL')) return { ...g, total: extractValorTotal('BULK PAPEL') };
        return g;
      });

      setLocal(prev => ({ 
        ...prev, 
        haviGroups: updatedGroups,
        pontoVerde: extractValorTotal('TOTAL') // Ponto verde extraído da linha total se necessário
      }));
      alert("Fatura processada com sucesso!");
    } catch (err) {
      alert("Erro ao ler o PDF.");
    } finally {
      setIsProcessingPdf(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center print:hidden">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 font-bold italic"><ArrowLeft size={18} /> Voltar</button>
        <div className="flex items-center gap-3">
          <input type="file" ref={fileInputRef} onChange={handleLoadInvoice} accept=".pdf" className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="bg-amber-500 text-white px-6 py-2 rounded-lg font-black uppercase text-xs flex items-center gap-2">
            <UploadCloud size={16}/> Importar Fatura PDF
          </button>
          <button onClick={() => onSave({...local, isFinalized: true})} className="bg-purple-600 text-white px-6 py-2 rounded-lg font-black uppercase text-xs">Finalizar e Gravar</button>
        </div>
      </div>

      <div className="bg-white border-2 border-purple-500 rounded-lg p-6 shadow-xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLUNA HAVI - NOMES LIMPOS CONFORME FOTO */}
          <div className="border border-purple-500 rounded-lg overflow-hidden flex flex-col">
            <div className="bg-purple-50 py-1.5 text-center font-black text-purple-800 border-b border-purple-500 uppercase text-[10px]">HAVI</div>
            <div className="p-1 divide-y divide-purple-100">
               {HAVI_GROUPS_LIST.map(name => {
                 const group = local.haviGroups.find(g => g.description.toLowerCase() === name.toLowerCase()) || { total: 0 };
                 return (
                   <div key={name} className="grid grid-cols-12 px-2 py-1 items-center">
                      <div className="col-span-9 text-[10px] font-bold text-gray-700 uppercase">{name}</div>
                      <div className="col-span-3 text-right text-[10px] font-black">{formatNumeric(group.total)}</div>
                   </div>
                 );
               })}
               <div className="p-4 bg-purple-100/50 text-right font-black text-purple-900 text-2xl border-t border-purple-500 italic">{formatNumeric(totalHaviFinal)} €</div>
            </div>
          </div>

          {/* COLUNA MYSTORE - EDITÁVEL CONFORME PEDIDO */}
          <div className="border border-purple-500 rounded-lg overflow-hidden flex flex-col">
            <div className="bg-purple-50 py-1.5 text-center font-black text-purple-800 border-b border-purple-500 uppercase text-[10px]">MYSTORE</div>
            <div className="p-1 divide-y divide-purple-100">
               {local.smsValues.map(v => (
                 <div key={v.description} className="grid grid-cols-12 px-2 py-2 items-center hover:bg-slate-50">
                    <div className="col-span-8 text-[10px] font-bold text-gray-700 uppercase">{v.description}</div>
                    <div className="col-span-4">
                      <input 
                        type="number" 
                        step="0.01"
                        value={v.amount || ''} 
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
                  <div className="text-[8px] font-black text-purple-400 uppercase mt-2">TOTAL MYSTORE CONSOLIDADO</div>
               </div>
            </div>
          </div>

          {/* COLUNA DIFERENÇAS */}
          <div className="border border-purple-500 rounded-lg overflow-hidden flex flex-col bg-slate-50/30 text-center p-8 justify-center">
             <div className={`text-5xl font-black italic tracking-tighter ${Math.abs(finalDifference) > 0.05 ? 'text-red-600' : 'text-emerald-600'}`}>{formatNumeric(finalDifference)} €</div>
             <div className="text-[10px] font-black text-gray-400 uppercase mt-4">DIFERENÇA TOTAL FINAL</div>
          </div>
        </div>
      </div>
    </div>
  );
};
