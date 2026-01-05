import React, { useState, useMemo, useRef } from 'react';
import { DeliveryRecord, Employee, PriceDifferenceItem, MissingProduct } from '../types';
import { ArrowLeft, Save, Printer, Plus, Trash2, CheckCircle2, UploadCloud, Calculator, Loader2, AlertCircle, X } from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';

// Configuração do motor de PDF via CDN para garantir que o build no Vercel não falhe
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

interface BillingDeliveryDetailProps {
  record: DeliveryRecord;
  employees: Employee[];
  onSave: (record: DeliveryRecord) => void;
  onBack: () => void;
}

const SMS_GROUPS = ['Comida', 'Papel', 'F. Operacionais', 'Material Adm', 'Outros', 'Happy Meal'];

const HAVI_MAPPING: Record<string, string> = {
  'CONGELADOS': 'Congelados',
  'REFRIGERADOS': 'Refrigerados',
  'SECOS COMIDA': 'Secos Comida',
  'SECOS PAPEL': 'Secos Papel',
  'FERRAMENTAS & UTENSÍLIOS': 'Ferramentas Utensilios',
  'BULK ALIMENTAR': 'Bulk Alimentar',
  'BULK PAPEL': 'Bulk Papel',
  'PRODUTOS FRESCOS': 'Produtos Frescos',
  'MANUTENÇÃO & LIMPEZA COMPRAS': 'Manutenção Limpeza Compras'
};

export const BillingDeliveryDetail: React.FC<BillingDeliveryDetailProps> = ({ record, employees, onSave, onBack }) => {
  const [local, setLocal] = useState<DeliveryRecord>(record);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatEuro = (val: number) => val.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

  // Cálculos de Totais mantidos do seu código original
  const totalHaviGroups = useMemo(() => local.haviGroups.reduce((s, g) => s + g.total, 0), [local.haviGroups]);
  const totalHaviFinal = totalHaviGroups + local.pontoVerde;
  const totalMyStore = useMemo(() => local.smsValues.reduce((s, v) => s + v.amount, 0), [local.smsValues]);

  const categoryDifferences = useMemo(() => {
    return local.smsValues.map(v => {
      const haviMatchCodes = v.description === 'Comida' ? ['A','B','C','H','J','L','T','1','2','3','8','19'] :
                             v.description === 'Papel' ? ['D','U','4','20'] :
                             v.description === 'F. Operacionais' ? ['E','I','O','9','14'] : [];
      const haviSubtotal = local.haviGroups.filter(g => haviMatchCodes.includes(g.group)).reduce((s, g) => s + g.total, 0);
      return haviSubtotal - v.amount;
    });
  }, [local.haviGroups, local.smsValues]);

  const finalDifference = useMemo(() => categoryDifferences.reduce((s, d) => s + d, 0), [categoryDifferences]);

  // LÓGICA DE EXTRAÇÃO DIRETA (SUBSTITUI O GEMINISERVICE)
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

      const extractVal = (name: string) => {
        const regex = new RegExp(`${name}[^\\n]*?[\\d.]+,\\d{2}\\s*EUR[^\\n]*?[\\d.]+,\\d{2}\\s*EUR[^\\n]*?[\\d.]+,\\d{2}\\s*EUR[^\\n]*?([\\d.]+,\\d{2})\\s*EUR`, 'i');
        const match = fullText.match(regex);
        return match ? parseFloat(match[1].replace(/\./g, '').replace(',', '.')) : 0;
      };

      setLocal(prev => ({
        ...prev,
        haviGroups: prev.haviGroups.map(g => ({
          ...g,
          total: extractVal(g.description.toUpperCase().replace(' UTENSILIOS', ' & UTENSÍLIOS')) || g.total
        })),
        pontoVerde: extractVal('TOTAL') || 30.06,
        comments: `Importado localmente: ${new Date().toLocaleDateString()}\n${prev.comments || ''}`
      }));
    } catch (err) {
      alert("Erro ao processar PDF. O ficheiro pode estar protegido ou em formato inválido.");
    } finally {
      setIsProcessingPdf(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in print:p-0">
      {/* BARRA DE AÇÕES - MANTIDA IGUAL */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center print:hidden">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 font-medium italic"><ArrowLeft size={18} /> Voltar</button>
        <div className="flex items-center gap-3">
           <input type="file" ref={fileInputRef} onChange={handleLoadInvoice} accept=".pdf" className="hidden" />
           <button onClick={() => fileInputRef.current?.click()} disabled={isProcessingPdf} className="flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-100 font-bold border border-purple-200 transition-all">
              {isProcessingPdf ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18}/>}
              {isProcessingPdf ? "A Processar..." : "Importar PDF"}
           </button>
           <button onClick={() => onSave({...local, isFinalized: true})} className="bg-purple-600 text-white px-6 py-2 rounded-lg font-black uppercase text-xs shadow-md shadow-purple-200 tracking-widest italic">Finalizar e Gravar</button>
        </div>
      </div>

      {/* PAINEL DE 3 COLUNAS - MANTIDO IGUAL */}
      <div className="bg-white border-2 border-purple-500 rounded-lg p-6 space-y-6 shadow-xl print:border-none">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* HAVI */}
          <div className="border border-purple-500 rounded-lg overflow-hidden flex flex-col">
            <div className="bg-purple-50 py-1.5 text-center font-black text-purple-800 border-b border-purple-500 uppercase text-[10px] tracking-widest">HAVI</div>
            <div className="p-1 divide-y divide-purple-100 flex-1">
               {local.haviGroups.map(group => (
                 <div key={group.group} className="grid grid-cols-12 px-2 py-1 items-center">
                    <div className="col-span-9 text-[9px] font-bold text-gray-700 uppercase italic">{group.description}</div>
                    <div className="col-span-3 text-right text-[10px] font-black">{group.total.toFixed(2).replace('.', ',')}</div>
                 </div>
               ))}
               <div className="p-4 bg-purple-100/50 text-right font-black text-purple-900 text-2xl border-t border-purple-500 italic">{totalHaviFinal.toFixed(2).replace('.', ',')} €</div>
            </div>
          </div>

          {/* MYSTORE */}
          <div className="border border-purple-500 rounded-lg overflow-hidden flex flex-col">
            <div className="bg-purple-50 py-1.5 text-center font-black text-purple-800 border-b border-purple-500 uppercase text-[10px] tracking-widest">MYSTORE</div>
            <div className="p-1 flex-1 divide-y divide-purple-100">
               {local.smsValues.map(v => (
                 <div key={v.description} className="grid grid-cols-12 px-2 py-2 items-center">
                    <div className="col-span-8 text-[10px] font-bold text-gray-700 uppercase">{v.description}</div>
                    <div className="col-span-4">
                      <input type="number" value={v.amount || ''} onChange={(e) => setLocal({...local, smsValues: local.smsValues.map(x => x.description === v.description ? {...x, amount: parseFloat(e.target.value) || 0} : x)})} className="w-full text-right bg-transparent border-none p-0 text-[11px] font-black focus:ring-0" placeholder="0,00" />
                    </div>
                 </div>
               ))}
               <div className="mt-auto p-6 bg-purple-50/30 text-center border-t border-purple-500">
                  <div className="text-3xl font-black text-purple-900 italic leading-none">{totalMyStore.toFixed(2).replace('.', ',')} €</div>
               </div>
            </div>
          </div>

          {/* DIFERENÇAS */}
          <div className="border border-purple-500 rounded-lg overflow-hidden flex flex-col bg-slate-50/30 text-center p-8 justify-center">
             <div className={`text-5xl font-black italic tracking-tighter ${Math.abs(finalDifference) > 0.05 ? 'text-red-600' : 'text-emerald-600'}`}>{finalDifference.toFixed(2).replace('.', ',')} €</div>
             <div className="text-[10px] font-black text-gray-400 uppercase mt-4 italic">Diferença Total Final</div>
          </div>
        </div>
      </div>
    </div>
  );
};
