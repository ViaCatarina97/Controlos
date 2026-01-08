import React, { useState, useMemo, useRef } from 'react';
import { DeliveryRecord, Employee, MissingProduct } from '../types';
import { ArrowLeft, Plus, Trash2, UploadCloud, Loader2, AlertCircle, X, PackageX } from 'lucide-react';

interface BillingDeliveryDetailProps {
  record: DeliveryRecord;
  employees: Employee[];
  onSave: (record: DeliveryRecord) => void;
  onBack: () => void;
}

// Mapeamento exato ID -> Descrição conforme a fatura HAVI
const HAVI_GROUPS_MAP = [
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
  const formatNumeric = (val: number) => val.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

      const normalizedText = fullText.replace(/\s+/g, ' ');

      // FUNÇÃO CRÍTICA: Captura especificamente o 4º valor (VALOR TOTAL) de uma linha
      const extractValorTotal = (anchor: string) => {
        const escaped = anchor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Procura a âncora e captura o 4º grupo de números (formato 0,00) antes de EUR
        const regex = new RegExp(`${escaped}.*?(\\d[\\d.]*,\\d{2})\\s*EUR\\s+(\\d[\\d.]*,\\d{2})\\s*EUR\\s+(\\d[\\d.]*,\\d{2})\\s*EUR\\s+([\\d.]+,\\d{2})\\s*EUR`, 'i');
        const match = normalizedText.match(regex);
        return match ? parseFloat(match[4].replace(/\./g, '').replace(',', '.')) : 0;
      };

      // 1. Atualizar rubricas individuais limpando valores antigos para evitar duplicação
      const updatedGroups = local.haviGroups.map(g => {
        const config = HAVI_GROUPS_MAP.find(c => c.name.toUpperCase() === g.description.toUpperCase());
        const val = config ? extractValorTotal(config.id) : 0;
        return { ...g, total: val };
      });

      // 2. Capturar o TOTAL GERAL diretamente da linha "TOTAL" (Evita erros de soma manual)
      const importedTotal = extractValorTotal("TOTAL");

      setLocal(prev => ({ ...prev, haviGroups: updatedGroups }));
      if (importedTotal > 0) setTotalHaviFinal(importedTotal);

      alert(`Sucesso! Total Fatura: ${formatNumeric(importedTotal)} €`);

    } catch (err: any) {
      alert("Erro: " + err.message);
    } finally {
      setIsProcessingPdf(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const totalMyStore = useMemo(() => local.smsValues.reduce((s, v) => s + v.amount, 0), [local.smsValues]);
  const finalDifference = totalHaviFinal - totalMyStore;

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in pb-10">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center print:hidden">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 font-bold italic"><ArrowLeft size={18} /> Voltar</button>
        <div className="flex items-center gap-3">
          <input type="file" ref={fileInputRef} onChange={handleLoadInvoice} accept=".pdf" className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="bg-amber-500 text-white px-6 py-2 rounded-lg font-black uppercase text-xs flex items-center gap-2 shadow-lg">
            {isProcessingPdf ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16}/>} Importar Fatura
          </button>
          <button onClick={() => onSave({...local, isFinalized: true})} className="bg-purple-600 text-white px-6 py-2 rounded-lg font-black uppercase text-xs">Gravar</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUNA HAVI */}
        <div className="bg-white border-2 border-purple-500 rounded-lg overflow-hidden flex flex-col shadow-xl">
          <div className="bg-purple-50 py-2 text-center font-black text-purple-800 border-b border-purple-500 text-xs">HAVI (VALOR TOTAL)</div>
          <div className="p-2 divide-y divide-purple-100 flex-1">
            {local.haviGroups.map(g => (
              <div key={g.description} className="grid grid-cols-12 py-1 px-2 items-center hover:bg-purple-50">
                <div className="col-span-9 text-[10px] font-bold text-gray-600 uppercase">{g.description}</div>
                <div className="col-span-3 text-right text-[11px] font-black">{formatNumeric(g.total)}</div>
              </div>
            ))}
            <div className="p-4 bg-purple-100/50 text-right font-black text-purple-900 text-2xl border-t-2 border-purple-500 italic mt-2">
              {formatNumeric(totalHaviFinal)} €
            </div>
          </div>
        </div>

        {/* COLUNA MYSTORE */}
        <div className="bg-white border-2 border-purple-500 rounded-lg overflow-hidden flex flex-col shadow-xl">
            <div className="bg-purple-50 py-2 text-center font-black text-purple-800 border-b border-purple-500 text-xs">MYSTORE</div>
            <div className="p-2 flex-1 divide-y divide-purple-100">
                {local.smsValues.map(v => (
                    <div key={v.description} className="grid grid-cols-12 py-2 px-2 items-center">
                        <div className="col-span-8 text-[10px] font-bold text-gray-600 uppercase">{v.description}</div>
                        <input type="number" step="0.01" value={v.amount || ''} 
                            onChange={(e) => setLocal({...local, smsValues: local.smsValues.map(x => x.description === v.description ? {...x, amount: parseFloat(e.target.value) || 0} : x)})}
                            className="col-span-4 text-right bg-slate-50 border border-slate-200 rounded text-[11px] font-black p-1 outline-none focus:ring-1 focus:ring-purple-500" />
                    </div>
                ))}
                <div className="mt-auto p-6 text-center text-3xl font-black text-purple-900 italic border-t border-purple-500">
                    {formatNumeric(totalMyStore)} €
                </div>
            </div>
        </div>

        {/* DIFERENÇA FINAL */}
        <div className="border-2 border-purple-500 rounded-lg flex flex-col items-center justify-center p-8 shadow-xl bg-slate-50">
            <div className={`text-5xl font-black italic ${Math.abs(finalDifference) > 0.1 ? 'text-red-600' : 'text-emerald-600'}`}>
                {formatNumeric(finalDifference)} €
            </div>
            <div className="text-[10px] font-black text-gray-400 uppercase mt-4 tracking-widest">Diferença Final Real</div>
        </div>
      </div>
    </div>
  );
};
