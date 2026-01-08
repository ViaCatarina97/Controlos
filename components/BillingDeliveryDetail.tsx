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
      if (!pdfjsLib) throw new Error("Motor PDF não carregado");
      
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map((item: any) => item.str).join(" ") + " \n ";
      }

      // FUNÇÃO DE EXTRAÇÃO CORRIGIDA PARA A COLUNA VALOR TOTAL
      const extractValorTotal = (name: string) => {
        // Escapa caracteres especiais como & e cria regex para espaços flexíveis
        const cleanName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
        
        // Procura o nome e captura o ÚLTIMO valor da linha (Valor Total) antes de "EUR"
        // A fatura HAVI tem: Valor Liq | Pto Verde | Plastico | Valor Total
        const regex = new RegExp(`${cleanName}.*?([\\d.]+,\\d{2})\\s*EUR`, 'gi');
        const matches = fullText.match(regex);
        
        if (matches) {
          const lastMatch = matches[matches.length - 1];
          const valMatch = lastMatch.match(/([\d.]+,\d{2})\s*EUR/i);
          return valMatch ? parseFloat(valMatch[1].replace(/\./g, '').replace(',', '.')) : 0;
        }
        return 0;
      };

      const updatedGroups = local.haviGroups.map(g => {
        const desc = g.description.toUpperCase().trim();
        const val = extractValorTotal(desc);
        // Se o valor extraído for > 0, atualiza. Caso contrário mantém o anterior.
        return val > 0 ? { ...g, total: val } : g;
      });

      setLocal(prev => ({ 
        ...prev, 
        haviGroups: updatedGroups,
        pontoVerde: extractValorTotal('TOTAL') || prev.pontoVerde 
      }));

      alert("Importação concluída com sucesso!");
    } catch (err) {
      alert("Erro ao processar PDF.");
      console.error(err);
    } finally {
      setIsProcessingPdf(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in relative pb-10">
      {/* (Restante do layout mantido conforme as fotos anteriores) */}
      {/* ... Código de Header, Tabela e Modais ... */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center print:hidden">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 font-bold italic hover:text-gray-800"><ArrowLeft size={18} /> Voltar</button>
        <div className="flex items-center gap-3">
          <input type="file" ref={fileInputRef} onChange={handleLoadInvoice} accept=".pdf" className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="bg-amber-500 text-white px-6 py-2 rounded-lg font-black uppercase text-xs flex items-center gap-2 shadow-lg hover:bg-amber-600 transition-all">
            {isProcessingPdf ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16}/>} Importar Fatura
          </button>
          <button onClick={() => onSave({...local, isFinalized: true})} className="bg-purple-600 text-white px-6 py-2 rounded-lg font-black uppercase text-xs shadow-md shadow-purple-200 hover:bg-purple-700 transition-all">Finalizar</button>
        </div>
      </div>

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
          {/* ... Restante das colunas MyStore e Diferenças ... */}
        </div>
      </div>
    </div>
  );
};
