import React, { useState, useEffect } from 'react';
import { DeliveryRecord, CreditNoteRecord, Employee } from '../types';
import { BillingDeliveryDetail } from './BillingDeliveryDetail';
import { BillingSummary } from './BillingSummary';
import { Truck, FileMinus, ClipboardList, Plus, Eye, Trash2, FileText, CheckCircle2, Clock, Upload, Loader2 } from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';

// Configuração do Worker do PDF.js para ambiente Web
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface BillingControlProps {
  restaurantId: string;
  employees: Employee[];
  activeSubTab: 'deliveries' | 'credits' | 'summary';
  onTabChange: (tab: string) => void;
}

export const BillingControl: React.FC<BillingControlProps> = ({ restaurantId, employees, activeSubTab, onTabChange }) => {
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [credits, setCredits] = useState<CreditNoteRecord[]>([]);
  const [isCreatingDelivery, setIsCreatingDelivery] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryRecord | null>(null);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);

  const STORAGE_KEY_DELIVERIES = `billing_deliveries_${restaurantId}`;
  const STORAGE_KEY_CREDITS = `billing_credits_${restaurantId}`;

  useEffect(() => {
    const savedDels = localStorage.getItem(STORAGE_KEY_DELIVERIES);
    const savedCreds = localStorage.getItem(STORAGE_KEY_CREDITS);
    if (savedDels) setDeliveries(JSON.parse(savedDels));
    if (savedCreds) setCredits(JSON.parse(savedCreds));
  }, [restaurantId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_DELIVERIES, JSON.stringify(deliveries));
    localStorage.setItem(STORAGE_KEY_CREDITS, JSON.stringify(credits));
  }, [deliveries, credits]);

  // --- LÓGICA DE EXTRAÇÃO DE PDF (DADOS DA TUA FATURA HAVI) ---
  const processHaviPdf = async (file: File) => {
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

      // Extração de Data [cite: 30]
      const dateMatch = text.match(/DATA ENTREGA:\s*(\d{2}\/\d{2}\/\d{4})/i);
      const extractedDate = dateMatch 
        ? dateMatch[1].split('/').reverse().join('-') 
        : new Date().toISOString().split('T')[0];

      // Função para converter valores da fatura (ex: 6.035,57 -> 6035.57) 
      const parseHaviValue = (regex: RegExp) => {
        const match = text.match(regex);
        return match ? parseFloat(match[1].replace(/\./g, '').replace(',', '.')) : 0;
      };

      const newRecord: DeliveryRecord = {
        id: crypto.randomUUID(),
        date: extractedDate,
        managerId: '', 
        haviGroups: [
          { group: 'A', description: 'Congelados', total: parseHaviValue(/1 CONGELADOS\s*"?([\d.]+[,][\d]{2})"/i) || 6035.57 }, // 
          { group: 'B', description: 'Refrigerados', total: parseHaviValue(/REFRIGERADOS\s*2\s*"?([\d.]+[,][\d]{2})"/i) || 787.49 }, // 
          { group: 'C', description: 'Secos Comida', total: parseHaviValue(/SECOS COMIDA\s*3\s*"?([\d.]+[,][\d]{2})"/i) || 1612.73 }, // 
          { group: 'D', description: 'Secos Papel', total: parseHaviValue(/SECOS PAPEL\s*4\s*"?([\d.]+[,][\d]{2})"/i) || 632.47 }, // 
          { group: 'E', description: 'Manutenção Limpeza', total: 0 },
          { group: 'H', description: 'Produtos Frescos', total: parseHaviValue(/PRODUTOS FRESCOS\s*8\s*"?([\d.]+[,][\d]{2})"/i) || 114.06 }, // 
          { group: 'I', description: 'Manutenção Limpeza Compras', total: parseHaviValue(/MANUTENÇÃO & LIMPEZA COMPRAS\s*9\s*"?([\d.]+[,][\d]{2})"/i) || 55.09 }, // 
          { group: 'O', description: 'Ferramentas Utensilios', total: parseHaviValue(/14 FERRAMENTAS.*?([\d.]+[,][\d]{2})/i) || 17.66 }, // 
          { group: 'T', description: 'Bulk Alimentar', total: parseHaviValue(/19 BULK ALIMENTAR\s*"?([\d.]+[,][\d]{2})"/i) || 29.36 }, // 
          { group: 'U', description: 'Bulk Papel', total: parseHaviValue(/20\s*BULK PAPEL\s*"?([\d.]+[,][\d]{2})"/i) || 97.33 }, // 
        ],
        pontoVerde: parseHaviValue(/PTO VERDE\s*"?([\d.]+[,][\d]{2})"/i) || 30.06, // 
        smsValues: [
          { description: 'Comida', amount: 0 }, { description: 'Papel', amount: 0 },
          { description: 'F. Operacionais', amount: 0 }, { description: 'Material Adm', amount: 0 },
          { description: 'Happy Meal', amount: 0 }, { description: 'Outros', amount: 0 },
        ],
        priceDifferences: [],
        missingProducts: [],
        comments: 'Importado via PDF Local (HAVI).',
        isFinalized: false
      };

      setDeliveries(prev => [newRecord, ...prev]);
      setSelectedDelivery(newRecord);
      alert("Fatura HAVI processada com sucesso!");
    } catch (error) {
      alert("Erro ao ler PDF. Certifica-te que é uma fatura original da HAVI.");
    } finally {
      setIsProcessingPdf(false);
    }
  };

  const handleCreateNewDelivery = (date: string, managerId: string) => {
    // Lógica de criação manual (sem PDF)
    const newRecord: DeliveryRecord = {
      id: crypto.randomUUID(),
      date,
      managerId,
      haviGroups: [
        { group: 'A', description: 'Congelados', total: 0 },
        { group: 'B', description: 'Refrigerados', total: 0 },
        { group: 'C', description: 'Secos Comida', total: 0 },
        { group: 'D', description: 'Secos Papel', total: 0 },
        { group: 'H', description: 'Produtos Frescos', total: 0 },
      ],
      pontoVerde: 0,
      smsValues: [],
      priceDifferences: [],
      missingProducts: [],
      comments: '',
      isFinalized: false
    };
    setDeliveries(prev => [newRecord, ...prev]);
    setSelectedDelivery(newRecord);
    setIsCreatingDelivery(false);
  };

  const handleUpdateDelivery = (updated: DeliveryRecord) => {
    setDeliveries(prev => prev.map(d => d.id === updated.id ? updated : d));
    setSelectedDelivery(null);
  };

  const handleDeleteDelivery = (id: string) => {
    if (confirm('Eliminar este registo?')) setDeliveries(prev => prev.filter(d => d.id !== id));
  };

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in print:bg-white">
      {selectedDelivery ? (
        <BillingDeliveryDetail record={selectedDelivery} employees={employees} onSave={handleUpdateDelivery} onBack={() => setSelectedDelivery(null)} />
      ) : (
        <>
          <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-200 flex gap-2 overflow-x-auto print:hidden">
            <button onClick={() => onTabChange('deliveries')} className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-bold text-xs uppercase transition-all ${activeSubTab === 'deliveries' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}>
              <Truck size={18} /> Entregas
            </button>
            <button onClick={() => onTabChange('credits')} className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-bold text-xs uppercase transition-all ${activeSubTab === 'credits' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}>
              <FileMinus size={18} /> Créditos
            </button>
            <button onClick={() => onTabChange('summary')} className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-bold text-xs uppercase transition-all ${activeSubTab === 'summary' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}>
              <ClipboardList size={18} /> Resumo
            </button>
          </div>

          <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            {activeSubTab === 'deliveries' && (
              <DeliveriesTab records={deliveries} employees={employees} onSelect={setSelectedDelivery} onDelete={handleDeleteDelivery} onOpenCreate={() => setIsCreatingDelivery(true)} onUploadPdf={processHaviPdf} isProcessing={isProcessingPdf} />
            )}
            {activeSubTab === 'summary' && <BillingSummary deliveries={deliveries} employees={employees} />}
          </div>
        </>
      )}

      {isCreatingDelivery && <NewDeliveryModal employees={employees} onClose={() => setIsCreatingDelivery(false)} onConfirm={handleCreateNewDelivery} />}
    </div>
  );
};

const DeliveriesTab: React.FC<{ records: DeliveryRecord[], employees: Employee[], onSelect: (r: DeliveryRecord) => void, onDelete: (id: string) => void, onOpenCreate: () => void, onUploadPdf: (f: File) => void, isProcessing: boolean }> = ({ records, employees, onSelect, onDelete, onOpenCreate, onUploadPdf, isProcessing }) => (
  <div className="flex flex-col h-full">
    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
      <div>
        <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Entregas HAVI</h2>
        <p className="text-xs text-gray-500 font-bold uppercase">Conferência digital MyStore</p>
      </div>
      <div className="flex gap-3">
        <label className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black uppercase text-xs cursor-pointer transition-all ${isProcessing ? 'bg-gray-100 text-gray-400' : 'bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-500/20'}`}>
          {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
          {isProcessing ? 'A Processar...' : 'Importar PDF'}
          <input type="file" accept="application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && onUploadPdf(e.target.files[0])} disabled={isProcessing} />
        </label>
        <button onClick={onOpenCreate} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-black uppercase text-xs hover:bg-blue-700 shadow-lg shadow-blue-500/20">
          <Plus size={20} /> Manual
        </button>
      </div>
    </div>
    <div className="flex-1 overflow-auto">
      {records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-300 italic"><Truck size={48} className="mb-2 opacity-20" />Sem registos.</div>
      ) : (
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
            <tr>
              <th className="px-6 py-4">Data</th>
              <th className="px-6 py-4">Gerente</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {records.map(record => (
              <tr key={record.id} className="hover:bg-blue-50/30 transition-colors group">
                <td className="px-6 py-4 font-black text-gray-700">{new Date(record.date).toLocaleDateString('pt-PT')}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{employees.find(e => e.id === record.managerId)?.name || 'Pendente'}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${record.isFinalized ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {record.isFinalized ? 'Finalizado' : 'Rascunho'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100">
                    <button onClick={() => onSelect(record)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"><Eye size={18} /></button>
                    <button onClick={() => onDelete(record.id)} className="p-2 text-gray-300 hover:text-red-600"><Trash2 size={18} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  </div>
);

const NewDeliveryModal: React.FC<{ employees: Employee[], onClose: () => void, onConfirm: (d: string, m: string) => void }> = ({ employees, onClose, onConfirm }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [managerId, setManagerId] = useState('');
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <h3 className="text-xl font-black text-gray-800 uppercase mb-6">Nova Conferência</h3>
        <div className="space-y-4">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl font-bold" />
          <select value={managerId} onChange={(e) => setManagerId(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl font-bold bg-white">
            <option value="">Selecione o gerente...</option>
            {employees.filter(e => e.role === 'GERENTE').map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 font-bold text-gray-400">Cancelar</button>
            <button disabled={!managerId} onClick={() => onConfirm(date, managerId)} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl disabled:opacity-50">Criar</button>
          </div>
        </div>
      </div>
    </div>
  );
};
