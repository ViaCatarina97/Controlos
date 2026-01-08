import React, { useState, useMemo, useRef } from 'react';
import { DeliveryRecord, Employee, MissingProduct } from '../types';
import { ArrowLeft, Plus, Trash2, UploadCloud, Loader2, AlertCircle, X, PackageX } from 'lucide-react';

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

      // Extração de texto preservando espaços para não colar números
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map((item: any) => item.str).join("  ") + " \n ";
      }

      // Limpeza de ruído: remove múltiplos espaços mas mantém a estrutura de blocos
      const cleanText = fullText.replace(/\s+/g, ' ');

      // NOVA LÓGICA: Procura o ID e depois os 4 valores EUR subsequentes
      const extractValue = (id: string) => {
        // Esta Regex procura o número do grupo (ex: " 14 ") e depois captura sequências de números com vírgula seguidos de EUR
        // Pegamos especificamente no 4º valor dessa sequência
        const regex = new RegExp(`(?:\\s|^)${id}\\s+.*?(\\d[\\d.]*,\\d{2})\\s*EUR\\s+(\\d[\\d.]*,\\d{2})\\s*EUR\\s+(\\d[\\d.]*,\\d{2})\\s*EUR\\s+([\\d.]+,\\d{2})\\s*EUR`, 'i');
        const match = cleanText.match(regex);
        
        if (match && match[4]) {
          return parseFloat(match[4].replace(/\./g, '').replace(',', '.'));
        }
        return 0;
      };

      // 1. Atualiza os grupos (Ferramentas e Manutenção Limpeza Compras incluídos)
      const updatedGroups = local.haviGroups.map(g => {
        const config = HAVI_GROUPS_CONFIG.find(c => c.name.toUpperCase() === g.description.toUpperCase());
        if (config) {
          const val = extractValue(config.id);
          return { ...g, total: val };
        }
        return { ...g, total: 0 };
      });

      // 2. Extração do TOTAL REAL (Linha de rodapé da fatura)
      // Na linha TOTAL, a HAVI coloca Liq, Pto Verde e Total. Capturamos o último valor antes do último EUR.
      const totalRegex = /TOTAL\s+.*?\s+([\d.]+,[\d]{2})\s*EUR\s+([\d.]+,[\d]{2})\s*EUR/i;
      const totalMatch = cleanText.match(totalRegex);
      const finalVal = totalMatch ? parseFloat(totalMatch[2].replace(/\./g, '').replace(',', '.')) : 0;

      setLocal(prev => ({ ...prev, haviGroups: updatedGroups }));
      if (finalVal > 0) setTotalHaviFinal(finalVal);

      alert(`Leitura completa!\nTotal detetado: ${formatNumeric(finalVal)} €`);

    } catch (err: any) {
      alert("Erro no processamento: " + err.message);
    } finally {
      setIsProcessingPdf(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const totalMyStore = useMemo(() => local.smsValues.reduce((s, v) => s + v.amount, 0), [local.smsValues]);
  const finalDifference = totalHaviFinal - totalMyStore;

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in pb-10">
      {/* HEADER DE AÇÕES */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center print:hidden">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 font-bold italic hover:text-gray-800 transition-colors"><ArrowLeft size={18} /> Voltar</button>
        <div className="flex items-center gap-3">
          <input type="file" ref={fileInputRef} onChange={handleLoadInvoice} accept=".pdf" className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="bg-amber-500 text-white px-6 py-2 rounded-lg font-black uppercase text-xs flex items-center gap-2 shadow-lg hover:bg-amber-600">
            {isProcessingPdf ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16}/>} Importar Valor Total
          </button>
          <button onClick={() => onSave({...local, isFinalized: true})} className="bg-purple-600 text-white px-6 py-2 rounded-lg font-black uppercase text-xs shadow-md shadow-purple-200">Guardar Dados</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUNA HAVI (VALOR TOTAL) */}
        <div className="bg-white border-2 border-purple-500 rounded-lg overflow-hidden flex flex-col shadow-xl">
          <div className="bg-purple-50 py-2 text-center font-black text-purple-800 border-b border-purple-500 text-[10px] uppercase tracking-widest">HAVI (Valor Total)</div>
          <div className="p-2 divide-y divide-purple-100 flex-1">
            {local.haviGroups.map(g => (
              <div key={g.description} className="grid grid-cols-12 py-1.5 px-2 items-center hover:bg-purple-50">
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
            <div className="bg-purple-50 py-2 text-center font-black text-purple-800 border-b border-purple-500 text-[10px] uppercase tracking-widest">MYSTORE (Lançado)</div>
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

        {/* COLUNA DIFERENÇA FINAL */}
        <div className="border-2 border-purple-500 rounded-lg flex flex-col items-center justify-center p-8 shadow-xl bg-slate-50">
            <div className={`text-6xl font-black italic tracking-tighter ${Math.abs(finalDifference) > 0.1 ? 'text-red-600' : 'text-emerald-600'}`}>
                {formatNumeric(finalDifference)} €
            </div>
            <div className="text-[10px] font-black text-gray-400 uppercase mt-4 tracking-widest">Diferença Final Real</div>
        </div>
      </div>
    </div>
  );
};
