import React, { useState, useEffect } from 'react';
import { DeliveryRecord, CreditNoteRecord, Employee } from '../types';
import { BillingDeliveryDetail } from './BillingDeliveryDetail';
import { BillingSummary } from './BillingSummary';
import { Truck, FileMinus, ClipboardList, Plus, Eye, Trash2, FileText, CheckCircle2, Clock } from 'lucide-react';

interface BillingControlProps {
  restaurantId: string;
  employees: Employee[];
  activeSubTab: 'deliveries' | 'credits' | 'summary';
  onTabChange: (tab: string) => void;
}

// Definição centralizada dos grupos para evitar erros de digitação
const INITIAL_HAVI_GROUPS = [
  { group: '1', description: 'Congelados', total: 0 },
  { group: '2', description: 'Refrigerados', total: 0 },
  { group: '3', description: 'Secos Comida', total: 0 },
  { group: '4', description: 'Secos Papel', total: 0 },
  { group: '5', description: 'Manutenção Limpeza', total: 0 },
  { group: '6', description: 'Marketing IPL', total: 0 },
  { group: '7', description: 'Marketing Geral', total: 0 },
  { group: '8', description: 'Produtos Frescos', total: 0 },
  { group: '9', description: 'MANUTENÇÃO & LIMPEZA COMPRAS', total: 0 },
  { group: '10', description: 'Condimentos', total: 0 },
  { group: '11', description: 'Condimentos Cozinha', total: 0 },
  { group: '12', description: 'Material Adm', total: 0 },
  { group: '13', description: 'Manuais', total: 0 },
  { group: '14', description: 'Ferramentas & Utensílios', total: 0 },
  { group: '15', description: 'Marketing Geral Custo', total: 0 },
  { group: '16', description: 'Fardas', total: 0 },
  { group: '17', description: 'Distribuição de Marketing', total: 0 },
  { group: '19', description: 'Bulk Alimentar', total: 0 },
  { group: '20', description: 'Bulk Papel', total: 0 },
];

export const BillingControl: React.FC<BillingControlProps> = ({ restaurantId, employees, activeSubTab, onTabChange }) => {
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [credits, setCredits] = useState<CreditNoteRecord[]>([]);
  
  const [isCreatingDelivery, setIsCreatingDelivery] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryRecord | null>(null);

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

  const handleCreateNewDelivery = (date: string, managerId: string) => {
    const newRecord: DeliveryRecord = {
      id: crypto.randomUUID(),
      date,
      managerId,
      haviGroups: INITIAL_HAVI_GROUPS,
      pontoVerde: 0,
      smsValues: [
        { description: 'Comida', amount: 0 },
        { description: 'Papel', amount: 0 },
        { description: 'F. Operacionais', amount: 0 },
        { description: 'Material Adm', amount: 0 },
        { description: 'Happy Meal', amount: 0 },
        { description: 'Outros', amount: 0 },
      ],
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
    if (confirm('Eliminar este registo de entrega?')) {
      setDeliveries(prev => prev.filter(d => d.id !== id));
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in print:bg-white">
      {selectedDelivery ? (
        <BillingDeliveryDetail 
          record={selectedDelivery} 
          employees={employees} 
          onSave={handleUpdateDelivery} 
          onBack={() => setSelectedDelivery(null)} 
        />
      ) : (
        <>
          <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-200 flex gap-2 overflow-x-auto print:hidden">
            <button 
              onClick={() => onTabChange('deliveries')} 
              className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-bold uppercase text-xs tracking-widest transition-all ${activeSubTab === 'deliveries' ? 'bg-blue-600 text-white shadow-md' : 'bg-transparent text-gray-400 hover:bg-gray-50'}`}
            >
              <Truck size={18} /> Entregas
            </button>
            <button 
              onClick={() => onTabChange('credits')} 
              className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-bold uppercase text-xs tracking-widest transition-all ${activeSubTab === 'credits' ? 'bg-blue-600 text-white shadow-md' : 'bg-transparent text-gray-400 hover:bg-gray-50'}`}
            >
              <FileMinus size={18} /> Notas de Crédito
            </button>
            <button 
              onClick={() => onTabChange('summary')} 
              className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-bold uppercase text-xs tracking-widest transition-all ${activeSubTab === 'summary' ? 'bg-blue-600 text-white shadow-md' : 'bg-transparent text-gray-400 hover:bg-gray-50'}`}
            >
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
              />
            )}
            {activeSubTab === 'credits' && (
              <div className="p-12 text-center text-gray-400 italic">
                <div className="flex flex-col items-center py-20">
                    <FileText size={48} className="text-gray-200 mb-4" />
                    <h3 className="text-lg font-bold text-gray-400 mb-1">Notas de Crédito</h3>
                    <p className="text-sm">Gestão de pendentes e reembolsos operacionais.</p>
                </div>
              </div>
            )}
            {activeSubTab === 'summary' && (
              <BillingSummary deliveries={deliveries} employees={employees} />
            )}
          </div>
        </>
      )}

      {isCreatingDelivery && (
        <NewDeliveryModal 
          employees={employees} 
          onClose={() => setIsCreatingDelivery(false)} 
          onConfirm={handleCreateNewDelivery} 
        />
      )}
    </div>
  );
};

const DeliveriesTab: React.FC<{ 
  records: DeliveryRecord[], 
  employees: Employee[], 
  onSelect: (r: DeliveryRecord) => void, 
  onDelete: (id: string) => void,
  onOpenCreate: () => void
}> = ({ records, employees, onSelect, onDelete, onOpenCreate }) => {
  const formatEuro = (val: number) => val.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
        <div>
          <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Registo de Entregas HAVI</h2>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Arquivo digital e conferência MyStore</p>
        </div>
        <button 
          onClick={onOpenCreate}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
        >
          <Plus size={20} /> Lançar Fatura
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-gray-400">
            <Truck size={64} className="mb-4 opacity-10" />
            <p className="font-bold uppercase tracking-widest text-sm">Sem registos de entrega para este restaurante</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-100/50 text-gray-400 uppercase text-[10px] font-black tracking-widest sticky top-0 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Data Fatura</th>
                <th className="px-6 py-4">Responsável</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Diff. Final Real</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {records.map(record => {
                // Cálculo corrigido: HAVI - SMS - (Diferenças de Preço)
                const haviTotal = record.haviGroups.reduce((s, g) => s + g.total, 0) + record.pontoVerde;
                const smsTotal = record.smsValues.reduce((s, v) => s + v.amount, 0);
                
                // Calcula a soma das diferenças de preço registadas por artigo
                const priceAdj = record.priceDifferences?.reduce((s, item) => s + (item.priceHavi - item.priceSms), 0) || 0;
                
                const diff = haviTotal - smsTotal - priceAdj;
                const manager = employees.find(e => e.id === record.managerId)?.name || '-';

                return (
                  <tr key={record.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4 font-black text-gray-700">
                      {new Date(record.date).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-500">{manager}</td>
                    <td className="px-6 py-4">
                      {record.isFinalized ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-black border border-emerald-100 uppercase tracking-tighter">
                          <CheckCircle2 size={12} /> Finalizado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 text-amber-700 text-[10px] font-black border border-amber-100 uppercase tracking-tighter">
                          <Clock size={12} /> Rascunho
                        </span>
                      )}
                    </td>
                    <td className={`px-6 py-4 font-black text-sm ${Math.abs(diff) > 0.1 ? 'text-red-500' : 'text-emerald-600'}`}>
                      {formatEuro(diff)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onSelect(record)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl" title="Editar / Consultar">
                          <Eye size={18} />
                        </button>
                        <button onClick={() => onDelete(record.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl" title="Eliminar">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const NewDeliveryModal: React.FC<{ employees: Employee[], onClose: () => void, onConfirm: (d: string, m: string) => void }> = ({ employees, onClose, onConfirm }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [managerId, setManagerId] = useState('');

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-scale-up">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Nova Conferência</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><Plus className="rotate-45" size={24} /></button>
        </div>
        
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Data da Fatura</label>
            <input 
                type="date" 
                value={date} 
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setDate(e.target.value)} 
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700"
            />
          </div>
          
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Gerente Responsável</label>
            <select 
                value={managerId} 
                onChange={(e) => setManagerId(e.target.value)} 
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white font-bold text-gray-700"
            >
                <option value="">Selecione o gerente...</option>
                {employees.filter(e => e.role === 'GERENTE').map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                ))}
            </select>
          </div>

          <button 
            disabled={!managerId}
            onClick={() => onConfirm(date, managerId)}
            className="w-full bg-blue-600 text-white font-black uppercase text-sm tracking-widest py-4 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            Abrir Folha de Conferência
          </button>
        </div>
      </div>
    </div>
  );
};
