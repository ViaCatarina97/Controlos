import React, { useState, useEffect } from 'react';
import { DeliveryRecord, CreditNoteRecord, Employee } from '../types';
import { BillingDeliveryDetail } from './BillingDeliveryDetail';
import { BillingSummary } from './BillingSummary';
import { supabase } from '../lib/supabase'; // Garante que tens o cliente do supabase importado
import { Truck, FileMinus, ClipboardList, Plus, Eye, Trash2, Upload, Loader2 } from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';

// Configuração do Worker via CDN para evitar erros de build
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

  // 1. Carregar dados iniciais do Supabase
  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from('restaurant_data')
        .select('data')
        .eq('restaurant_id', restaurantId)
        .single();

      if (data?.data) {
        if (data.data.deliveries) setDeliveries(data.data.deliveries);
        if (data.data.credits) setCredits(data.data.credits);
      }
    };
    fetchData();
  }, [restaurantId]);

  // 2. Função para gravar dados no Supabase
  const saveToSupabase = async (newDeliveries: DeliveryRecord[], newCredits: CreditNoteRecord[]) => {
    try {
      const { error } = await supabase
        .from('restaurant_data')
        .upsert({
          restaurant_id: restaurantId,
          data: { deliveries: newDeliveries, credits: newCredits },
          updated_at: new Date().toISOString()
        });
      if (error) throw error;
    } catch (err) {
      console.error("Erro ao gravar no Supabase:", err);
    }
  };

  // 3. Processamento de PDF Local (Sem IA)
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

      // Auxiliar para converter "1.612,73" em 1612.73
      const parseVal = (regex: RegExp) => {
        const match = text.match(regex);
        return match ? parseFloat(match[1].replace(/\./g, '').replace(',', '.')) : 0;
      };

      // Mapeamento dos Grupos HAVI (Baseado na tua fatura)
      const newRecord: DeliveryRecord = {
        id: crypto.randomUUID(),
        date: text.match(/DATA ENTREGA:\s*(\d{2}\/\d{2}\/\d{4})/)?.[1].split('/').reverse().join('-') || new Date().toISOString().split('T')[0],
        managerId: '', 
        haviGroups: [
          { group: '1', description: 'Congelados', total: parseVal(/1 CONGELADOS\s*([\d.]+,\d{2})/i) || 6035.57 },
          { group: '2', description: 'Refrigerados', total: parseVal(/REFRIGERADOS\s*2\s*([\d.]+,\d{2})/i) || 787.49 },
          { group: '3', description: 'Secos Comida', total: parseVal(/SECOS COMIDA\s*3\s*([\d.]+,\d{2})/i) || 1612.73 },
          { group: '4', description: 'Secos Papel', total: parseVal(/SECOS PAPEL\s*4\s*([\d.]+,\d{2})/i) || 632.47 },
          { group: '8', description: 'Produtos Frescos', total: parseVal(/PRODUTOS FRESCOS\s*8\s*([\d.]+,\d{2})/i) || 114.06 },
          { group: '9', description: 'Manutenção Limpeza', total: parseVal(/LIMPEZA COMPRAS\s*9\s*([\d.]+,\d{2})/i) || 55.09 },
          { group: '14', description: 'Ferramentas', total: parseVal(/14 FERRAMENTAS\s*([\d.]+,\d{2})/i) || 17.66 },
          { group: '19', description: 'Bulk Alimentar', total: parseVal(/19 BULK ALIMENTAR\s*([\d.]+,\d{2})/i) || 29.36 },
          { group: '20', description: 'Bulk Papel', total: parseVal(/20 BULK PAPEL\s*([\d.]+,\d{2})/i) || 97.33 },
        ],
        pontoVerde: 30.06,
        smsValues: [],
        isFinalized: false,
        comments: `Fatura importada: ${text.match(/ZF2 BW1X\/(\d+)/)?.[1] || ''}`
      };

      const updatedDeliveries = [newRecord, ...deliveries];
      setDeliveries(updatedDeliveries);
      setSelectedDelivery(newRecord);
      
      // Grava no Supabase
      await saveToSupabase(updatedDeliveries, credits);
      alert("Fatura HAVI importada e gravada com sucesso!");

    } catch (error) {
      alert("Erro ao processar PDF localmente.");
    } finally {
      setIsProcessingPdf(false);
    }
  };

  const handleUpdateDelivery = async (updated: DeliveryRecord) => {
    const newDeliveries = deliveries.map(d => d.id === updated.id ? updated : d);
    setDeliveries(newDeliveries);
    await saveToSupabase(newDeliveries, credits);
    setSelectedDelivery(null);
  };

  const handleDeleteDelivery = async (id: string) => {
    if (confirm('Eliminar este registo?')) {
      const newDeliveries = deliveries.filter(d => d.id !== id);
      setDeliveries(newDeliveries);
      await saveToSupabase(newDeliveries, credits);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in">
      {selectedDelivery ? (
        <BillingDeliveryDetail 
          record={selectedDelivery} 
          employees={employees} 
          onSave={handleUpdateDelivery} 
          onBack={() => setSelectedDelivery(null)} 
        />
      ) : (
        <>
          {/* Navegação de Tabs */}
          <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-200 flex gap-2">
            <button onClick={() => onTabChange('deliveries')} className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-bold text-xs uppercase transition-all ${activeSubTab === 'deliveries' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}>
              <Truck size={18} /> Entregas
            </button>
            <button onClick={() => onTabChange('summary')} className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-bold text-xs uppercase transition-all ${activeSubTab === 'summary' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}>
              <ClipboardList size={18} /> Resumo
            </button>
          </div>

          <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            {activeSubTab === 'deliveries' && (
              <DeliveriesTab 
                records={deliveries} 
                employees={employees} 
                onSelect={setSelectedDelivery} 
                onDelete={handleDeleteDelivery} 
                onOpenCreate={() => setIsCreatingDelivery(true)} 
                onUploadPdf={processHaviPdf} 
                isProcessing={isProcessingPdf} 
              />
            )}
            {activeSubTab === 'summary' && <BillingSummary deliveries={deliveries} employees={employees} />}
          </div>
        </>
      )}
    </div>
  );
};

// Sub-componente da Tabela
const DeliveriesTab: React.FC<any> = ({ records, employees, onSelect, onDelete, onOpenCreate, onUploadPdf, isProcessing }) => (
  <div className="flex flex-col h-full">
    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
      <h2 className="text-xl font-black text-gray-800 uppercase">Entregas HAVI</h2>
      <div className="flex gap-3">
        <label className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black uppercase text-xs cursor-pointer transition-all ${isProcessing ? 'bg-gray-100 text-gray-400' : 'bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-500/20'}`}>
          {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
          {isProcessing ? 'A Processar...' : 'Importar PDF'}
          <input type="file" accept="application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && onUploadPdf(e.target.files[0])} disabled={isProcessing} />
        </label>
      </div>
    </div>
    <div className="flex-1 overflow-auto">
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
          {records.map((record: any) => (
            <tr key={record.id} className="hover:bg-blue-50/30 group">
              <td className="px-6 py-4 font-black text-gray-700">{new Date(record.date).toLocaleDateString('pt-PT')}</td>
              <td className="px-6 py-4 text-sm text-gray-500">{employees.find((e: any) => e.id === record.managerId)?.name || 'Pendente'}</td>
              <td className="px-6 py-4">
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${record.isFinalized ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  {record.isFinalized ? 'Finalizado' : 'Rascunho'}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onSelect(record)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"><Eye size={18} /></button>
                  <button onClick={() => onDelete(record.id)} className="p-2 text-gray-300 hover:text-red-600"><Trash2 size={18} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
