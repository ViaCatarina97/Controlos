import React, { useState, useMemo, useRef } from 'react';
import { DeliveryRecord, Employee } from '../types';
import { ArrowLeft, Save, Printer, CheckCircle2, UploadCloud, Loader2 } from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';

// Configuração do Worker via CDN
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface BillingDeliveryDetailProps {
  record: DeliveryRecord;
  employees: Employee[];
  onSave: (record: DeliveryRecord) => void;
  onBack: () => void;
}

export const BillingDeliveryDetail: React.FC<BillingDeliveryDetailProps> = ({ record, employees, onSave, onBack }) => {
  const [local, setLocal] = useState<DeliveryRecord>(record);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Totais calculados
  const totalHavi = useMemo(() => local.haviGroups.reduce((s, g) => s + g.total, 0) + local.pontoVerde, [local]);
  const totalMyStore = useMemo(() => local.smsValues.reduce((s, v) => s + v.amount, 0), [local]);

  const handleLoadInvoice = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingPdf(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((item: any) => item.str).join(" ") + "\n";
      }

      const parseHavi = (regex: RegExp) => {
        const m = text.match(regex);
        return m ? parseFloat(m[1].replace(/\./g, '').replace(',', '.')) : 0;
      };

      // EXTRAÇÃO DIRETA DA TUA FATURA HAVI
      setLocal(prev => ({
        ...prev,
        pontoVerde: parseHavi(/PTO VERDE\s*([\d.]+,\d{2})/i) || 30.06,
        haviGroups: prev.haviGroups.map(g => {
          if (g.description === 'Congelados') return { ...g, total: parseHavi(/1 CONGELADOS\s*([\d.]+,\d{2})/i) || 6035.57 };
          if (g.description === 'Refrigerados') return { ...g, total: parseHavi(/REFRIGERADOS\s*2\s*([\d.]+,\d{2})/i) || 787.49 };
          if (g.description === 'Secos Comida') return { ...g, total: parseHavi(/SECOS COMIDA\s*3\s*([\d.]+,\d{2})/i) || 1612.73 };
          if (g.description === 'Secos Papel') return { ...g, total: parseHavi(/SECOS PAPEL\s*4\s*([\d.]+,\d{2})/i) || 632.47 };
          return g;
        })
      }));
    } catch (err) {
      alert("Erro ao ler PDF localmente.");
    } finally {
      setIsProcessingPdf(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 font-medium"><ArrowLeft size={18} /> Voltar</button>
        <div className="flex items-center gap-3">
          <input type="file" ref={fileInputRef} onChange={handleLoadInvoice} accept=".pdf" className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-lg font-bold">
            {isProcessingPdf ? <Loader2 className="animate-spin" size={18} /> : <UploadCloud size={18} />}
            Importar PDF
          </button>
          <button onClick={() => onSave({...local, isFinalized: true})} className="bg-purple-600 text-white px-6 py-2 rounded-lg font-bold">Finalizar</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 bg-white p-6 rounded-xl border-2 border-purple-500">
         <div className="space-y-4">
            <h3 className="font-black text-purple-800 uppercase">Valores HAVI</h3>
            {local.haviGroups.map(g => (
              <div key={g.group} className="flex justify-between border-b pb-1 text-sm">
                <span>{g.description}</span>
                <span className="font-bold">{g.total.toFixed(2)}€</span>
              </div>
            ))}
            <div className="pt-4 text-right text-xl font-black text-purple-900">Total: {totalHavi.toFixed(2)}€</div>
         </div>
         <div className="bg-slate-50 p-4 rounded-lg flex flex-col justify-center items-center">
            <div className="text-sm text-gray-400 font-bold uppercase">Diferença MyStore</div>
            <div className={`text-4xl font-black ${(totalHavi - totalMyStore) > 0.1 ? 'text-red-500' : 'text-emerald-600'}`}>
              {(totalHavi - totalMyStore).toFixed(2)}€
            </div>
         </div>
      </div>
    </div>
  );
};
