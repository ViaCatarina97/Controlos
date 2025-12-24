
import React, { useState, useEffect, useMemo } from 'react';
import { DeliveryRecord, CreditNoteRecord, Employee } from '../types';
import { BillingDeliveryDetail } from './BillingDeliveryDetail';
import { Truck, FileMinus, ClipboardList, Plus, Search, Trash2, Eye, Calendar, User, FileText, CheckCircle2, Clock } from 'lucide-react';

interface BillingControlProps {
  restaurantId: string;
  employees: Employee[];
}

export const BillingControl: React.FC<BillingControlProps> = ({ restaurantId, employees }) => {
  const [activeTab, setActiveTab] = useState<'deliveries' | 'credits' | 'summary'>('deliveries');
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
      haviGroups: [
        { group: 'A', description: 'Congelados', total: 0 },
        { group: 'B', description: 'Refrigerados', total: 0 },
        { group: 'C', description: 'Secos Comida', total: 0 },
        { group: 'D', description: 'Secos Papel', total: 0 },
        { group: 'E', description: 'Manutenção Limpeza', total: 0 },
        { group: 'F', description: 'Marketing IPL', total: 0 },
        { group: 'G', description: 'Marketing Geral', total: 0 },
        { group: 'H', description: 'Produtos Frescos', total: 0 },
        { group: 'I', description: 'Manutenção Limpeza Compras', total: 0 },
        { group: 'J', description: 'Condimentos', total: 0 },
        { group: 'L', description: 'Condimentos Cozinha', total: 0 },
        { group: 'M', description: 'Material Adm', total: 0 },
        { group: 'N', description: 'Manuais', total: 0 },
        { group: 'O', description: 'Ferramentas Utensilios', total: 0 },
        { group: 'P', description: 'Marketing Geral Custo', total: 0 },
        { group: 'R', description: 'Fardas', total: 0 },
        { group: 'S', description: 'Distribuição de Marketing', total: 0 },
        { group: 'T', description: 'Bulk Alimentar', total: 0 },
        { group: 'U', description: 'Bulk Papel', total: 0 },
      ],
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
              onClick={() => setActiveTab('deliveries')} 
              className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-medium transition-all ${activeTab === 'deliveries' ? 'bg-blue-600 text-white shadow-md' : 'bg-transparent text-gray-500 hover:bg-gray-50'}`}
            >
              <Truck size={18} /> Entregas
            </button>
            <button 
              onClick={() => setActiveTab('credits')} 
              className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-medium transition-all ${activeTab === 'credits' ? 'bg-blue-600 text-white shadow-md' : 'bg-transparent text-gray-500 hover:bg-gray-50'}`}
            >
              <FileMinus size={18} /> Notas de Crédito
            </button>
            <button 
              onClick={() => setActiveTab('summary')} 
              className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-medium transition-all ${activeTab === 'summary' ? 'bg-blue-600 text-white shadow-md' : 'bg-transparent text-gray-500 hover:bg-gray-50'}`}
            >
              <ClipboardList size={18} /> Resumo
            </button>
          </div>

          <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            {activeTab === 'deliveries' && (
              <DeliveriesTab 
                records={deliveries} 
                employees={employees}
                onSelect={setSelectedDelivery} 
                onDelete={handleDeleteDelivery}
                onOpenCreate={() => setIsCreatingDelivery(true)}
              />
            )}
            {activeTab === 'credits' && (
              <div className="p-12 text-center text-gray-400 italic">
                <ConstructionModule label="Notas de Crédito" />
              </div>
            )}
            {activeTab === 'summary' && (
              <div className="p-12 text-center text-gray-400 italic">
                <ConstructionModule label="Resumo de Faturação" />
              </div>
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
  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Registo de Entregas</h2>
          <p className="text-sm text-gray-500">Gestão e conferência de faturas HAVI vs SMS.</p>
        </div>
        <button 
          onClick={onOpenCreate}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 font-bold shadow-md transition-all active:scale-95"
        >
          <Plus size={20} /> Nova Entrega
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Truck size={48} className="mb-4 opacity-20" />
            <p>Nenhuma entrega registada até ao momento.</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-bold sticky top-0">
              <tr>
                <th className="px-6 py-4">Data Fatura</th>
                <th className="px-6 py-4">Gerente</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Diferença Final</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map(record => {
                const haviTotal = record.haviGroups.reduce((s, g) => s + g.total, 0) + record.pontoVerde;
                const smsTotal = record.smsValues.reduce((s, v) => s + v.amount, 0);
                const diff = haviTotal - smsTotal;
                const manager = employees.find(e => e.id === record.managerId)?.name || '-';

                return (
                  <tr key={record.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-800">
                      {new Date(record.date).toLocaleDateString('pt-PT')}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{manager}</td>
                    <td className="px-6 py-4">
                      {record.isFinalized ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                          <CheckCircle2 size={12} /> Concluído
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase">
                          <Clock size={12} /> Rascunho
                        </span>
                      )}
                    </td>
                    <td className={`px-6 py-4 font-black ${Math.abs(diff) > 0.1 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {diff.toFixed(2)} €
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => onSelect(record)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Ver Detalhes">
                          <Eye size={18} />
                        </button>
                        <button onClick={() => onDelete(record.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Eliminar">
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
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Truck className="text-blue-600" /> Nova Entrega
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><Plus className="rotate-45" size={24} /></button>
        </div>
        
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Data da Fatura</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 text-gray-400" size={18} />
              <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Gerente Responsável</label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-gray-400" size={18} />
              <select 
                value={managerId} 
                onChange={(e) => setManagerId(e.target.value)} 
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="">Selecione o gerente...</option>
                {employees.filter(e => e.role === 'GERENTE').map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
          </div>

          <button 
            disabled={!managerId}
            onClick={() => onConfirm(date, managerId)}
            className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            Continuar para Conferência
          </button>
        </div>
      </div>
    </div>
  );
};

const ConstructionModule: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex flex-col items-center py-20">
    <FileText size={48} className="text-gray-200 mb-4" />
    <h3 className="text-lg font-bold text-gray-400 mb-1">{label}</h3>
    <p className="text-sm">Esta funcionalidade está a ser preparada para o próximo lançamento.</p>
  </div>
);
