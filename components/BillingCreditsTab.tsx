import React, { useState, useRef } from 'react';
import { CreditNoteRecord, Employee } from '../types';
import { 
  Plus, Trash2, CheckCircle2, Clock, UploadCloud, 
  Loader2, AlertCircle, ArrowRight, FileText, Check 
} from 'lucide-react';
import { processCreditNotePdf } from '../services/geminiService';

interface BillingCreditsTabProps {
  records: CreditNoteRecord[];
  employees: Employee[];
  onSave: (record: CreditNoteRecord) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const HAVI_GROUPS = [
  'Congelados',
  'Refrigerados',
  'Secos Comida',
  'Secos Papel',
  'Manutenção & Limpeza',
  'Marketing IPL',
  'Marketing Geral',
  'Produtos Frescos',
  'Manutenção & Limpeza Compras',
  'Condimentos',
  'Condimentos Cozinha',
  'Material Adm',
  'Manuais',
  'Ferramentas Utensilios',
  'Marketing Geral Custo',
  'Fardas',
  'Distribuição de Marketing',
  'Bulk Alimentar',
  'Bulk Papel',
  'Outros'
];

const MYSTORE_GROUPS = [
  'Comida',
  'Papel',
  'F. Operacionais',
  'Material Adm',
  'Happy Meal',
  'Outros'
];

const CREDIT_REASONS = [
  'Diferença de Preço',
  'Quebra de Transporte',
  'Produto Danificado / Qualidade',
  'Falta de Entrega (Facturado e Não Entregue)',
  'Devolução de Mercadoria',
  'Erro de Faturação',
  'Outros'
];

export const BillingCreditsTab: React.FC<BillingCreditsTabProps> = ({ 
  records, 
  employees, 
  onSave, 
  onDelete 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CreditNoteRecord | null>(null);

  // Month filter state
  const [filterMonth, setFilterMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [showAllMonths, setShowAllMonths] = useState<boolean>(false);

  const formatEuro = (val: number) => 
    val.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

  const handleOpenCreateMode = () => {
    setEditingRecord(null);
    setIsModalOpen(true);
  };

  const handleEditRecord = (record: CreditNoteRecord) => {
    setEditingRecord(record);
    setIsModalOpen(true);
  };

  // Filter records based on month
  const filteredRecords = React.useMemo(() => {
    if (showAllMonths) return records;
    return records.filter(r => r.date && r.date.startsWith(filterMonth));
  }, [records, filterMonth, showAllMonths]);

  // Sort filtered records by date descending
  const sortedRecords = React.useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [filteredRecords]);

  // Live totals calculations
  const totalHaviFiltered = React.useMemo(() => {
    return filteredRecords.reduce((sum, r) => sum + (r.valueHavi ?? r.value ?? 0), 0);
  }, [filteredRecords]);

  const totalMyStoreFiltered = React.useMemo(() => {
    return filteredRecords.reduce((sum, r) => sum + (r.valueMyStore ?? 0), 0);
  }, [filteredRecords]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
        <div>
          <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Notas de Crédito</h2>
        </div>
        <button 
          onClick={handleOpenCreateMode}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
        >
          <Plus size={20} /> Lançar NC
        </button>
      </div>

      {/* Month Filter and Totals Panel */}
      <div className="bg-slate-50 border-b border-gray-100 px-6 py-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase text-gray-400 mb-1">Filtrar por Mês</span>
            <div className="flex items-center gap-2">
              <input 
                type="month" 
                value={filterMonth} 
                disabled={showAllMonths}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
              <button 
                onClick={() => setShowAllMonths(!showAllMonths)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-tighter border transition-all ${
                  showAllMonths 
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                }`}
              >
                Todos
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-4 w-full md:w-auto">
          <div className="bg-white border border-gray-150 rounded-xl px-4 py-2 flex flex-col min-w-[150px] shadow-sm flex-1 md:flex-initial">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Total HAVI</span>
            <span className="text-lg font-black text-slate-900 leading-none mt-1">
              {formatEuro(totalHaviFiltered)}
            </span>
          </div>
          <div className="bg-white border border-gray-150 rounded-xl px-4 py-2 flex flex-col min-w-[150px] shadow-sm flex-1 md:flex-initial">
            <span className="text-[9px] font-black uppercase text-blue-500 tracking-wider">Total MyStore</span>
            <span className="text-lg font-black text-blue-600 leading-none mt-1">
              {formatEuro(totalMyStoreFiltered)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-gray-400">
            <FileText size={64} className="mb-4 opacity-10" />
            <p className="font-bold uppercase tracking-widest text-[11px]">
              {records.length === 0 ? "Sem notas de crédito registadas" : "Nenhuma nota de crédito encontrada para este mês"}
            </p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-100/50 text-gray-400 uppercase text-[10px] font-black tracking-widest sticky top-0 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Produto</th>
                <th className="px-6 py-4">Motivo</th>
                <th className="px-6 py-4">Grupo HAVI</th>
                <th className="px-6 py-4">Valor HAVI</th>
                <th className="px-6 py-4">Grupo MyStore</th>
                <th className="px-6 py-4">Valor MyStore</th>
                <th className="px-6 py-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedRecords.map(record => {
                const vHavi = record.valueHavi ?? record.value ?? 0;
                const vMyStore = record.valueMyStore ?? 0;

                return (
                  <tr 
                    key={record.id} 
                    onClick={() => handleEditRecord(record)} 
                    className="hover:bg-blue-50/30 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4 font-black text-gray-700">
                      {record.date ? new Date(record.date).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-700 truncate max-w-[150px]" title={record.product}>
                      {record.product || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-[140px]" title={record.reason}>
                      {record.reason || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-600">{record.haviGroup || '-'}</td>
                    <td className="px-6 py-4 text-sm font-black text-slate-800">{formatEuro(vHavi)}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-600">{record.myStoreGroup || '-'}</td>
                    <td className="px-6 py-4 text-sm font-bold text-blue-600">{formatEuro(vMyStore)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        {record.status === 'Recebido' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-[9px] font-black border border-emerald-100 uppercase tracking-tighter">
                            <CheckCircle2 size={10} /> Finalizado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 text-[9px] font-black border border-amber-100 uppercase tracking-tighter">
                            <Clock size={10} /> Pendente
                          </span>
                        )}
                        <button 
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (confirm('Eliminar esta Nota de Crédito?')) {
                              await onDelete(record.id);
                            }
                          }} 
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
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

      {isModalOpen && (
        <CreditNoteWizardModal 
          employees={employees}
          record={editingRecord}
          onClose={() => setIsModalOpen(false)}
          onSave={async (saved) => {
            await onSave(saved);
            setIsModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

interface CreditNoteWizardModalProps {
  employees: Employee[];
  record: CreditNoteRecord | null;
  onClose: () => void;
  onSave: (record: CreditNoteRecord) => Promise<void>;
}

const CreditNoteWizardModal: React.FC<CreditNoteWizardModalProps> = ({
  employees,
  record,
  onClose,
  onSave
}) => {
  const isEdit = !!record;
  const [step, setStep] = useState<1 | 2>(isEdit ? 2 : 1);
  const [isUploading, setIsUploading] = useState(false);
  const [extractedInfo, setExtractedInfo] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [id] = useState(record?.id || crypto.randomUUID());
  const [invoiceNumber, setInvoiceNumber] = useState(record?.invoiceNumber || '');
  const [date, setDate] = useState(record?.date || '');
  const [product, setProduct] = useState(record?.product || '');
  const [quantity, setQuantity] = useState<number | ''>(record?.quantity || '');
  const [haviGroup, setHaviGroup] = useState(record?.haviGroup || '');
  const [myStoreGroup, setMyStoreGroup] = useState(record?.myStoreGroup || '');
  const [reason, setReason] = useState(record?.reason || 'Sem motivo selecionado');
  const [managerId, setManagerId] = useState(record?.managerId || '');
  const [valueHavi, setValueHavi] = useState(record?.valueHavi ?? record?.value ?? 0);
  const [valueMyStore, setValueMyStore] = useState(record?.valueMyStore ?? 0);
  const [status, setStatus] = useState<'Pendente' | 'Recebido'>(record?.status || 'Pendente');

  const gerentes = employees.filter(e => e.role === 'GERENTE');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setExtractedInfo('');
    try {
      const info = await processCreditNotePdf(file);
      if (info) {
        if (info.documentNumber) setInvoiceNumber(info.documentNumber);
        if (info.date) {
          // Verify format
          const formattedDate = info.date.includes('/') 
            ? info.date.split('/').reverse().join('-') 
            : info.date;
          if (formattedDate.length === 10) setDate(formattedDate);
        }
        if (info.productGroup) {
          // Check closest matching HAVI and MyStore groups
          const parsedGroup = info.productGroup.toUpperCase();
          let matchedHavi = '';
          let matchedMyStore = '';

          if (parsedGroup.includes('CONGELADO')) {
            matchedHavi = 'Congelados';
            matchedMyStore = 'Comida';
          } else if (parsedGroup.includes('REFRIGERADO')) {
            matchedHavi = 'Refrigerados';
            matchedMyStore = 'Comida';
          } else if (parsedGroup.includes('COMIDA')) {
            matchedHavi = 'Secos Comida';
            matchedMyStore = 'Comida';
          } else if (parsedGroup.includes('FRESCOS')) {
            matchedHavi = 'Produtos Frescos';
            matchedMyStore = 'Comida';
          } else if (parsedGroup.includes('ADM') || parsedGroup.includes('ADMINISTR')) {
            matchedHavi = 'Material Adm';
            matchedMyStore = 'Material Adm';
          } else if (parsedGroup.includes('F. OPERACIONAIS') || parsedGroup.includes('LIMIT') || parsedGroup.includes('LIMPEZA')) {
            matchedHavi = 'Manutenção & Limpeza';
            matchedMyStore = 'F. Operacionais';
          } else if (parsedGroup.includes('PAPEL')) {
            matchedHavi = 'Secos Papel';
            matchedMyStore = 'Papel';
          }

          if (matchedHavi) setHaviGroup(matchedHavi);
          if (matchedMyStore) setMyStoreGroup(matchedMyStore);
        }
        
        if (info.totalValue) {
          setValueHavi(info.totalValue);
          setValueMyStore(0); // Set to 0 for manual insertion as requested
        }
        if (info.productName) setProduct(info.productName);
        if (info.quantity) setQuantity(info.quantity);

        setExtractedInfo(`Ligado com sucesso! Dados obtidos do PDF:\nNº Doc: ${info.documentNumber || '-'}\nTotal HAVI: ${info.totalValue || '0'} €\nGrupo: ${info.productGroup || '-'}\n\nNota: O valor MyStore foi configurado a 0,00 € para inserção manual.`);
      }
    } catch (err: any) {
      console.error(err);
      if (err.message === "AUTH_REQUIRED") {
        if ((window as any).aistudio) {
          await (window as any).aistudio.openSelectKey();
        } else {
          alert("Configuração Pendente: A chave da API Gemini (GEMINI_API_KEY) não está configurada nas variáveis de ambiente do seu projeto Vercel.\n\nPor favor, adicione a variável 'GEMINI_API_KEY' nas configurações da Vercel para que a extração automática de PDFs funcione em produção.");
        }
      } else {
        alert(`Não foi possível extrair dados automaticamente: ${err.message || err}\n\nInsira os dados manualmente na página seguinte.`);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleNext = () => {
    setStep(2);
  };

  const handleSave = () => {
    if (!managerId) {
      alert('Por favor, selecione um Gerente Responsável.');
      return;
    }

    onSave({
      id,
      invoiceNumber,
      date,
      value: valueHavi,
      reason,
      status,
      product,
      quantity: quantity === '' ? undefined : quantity,
      haviGroup: haviGroup || undefined,
      myStoreGroup: myStoreGroup || undefined,
      managerId,
      valueHavi,
      valueMyStore
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col md:max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
          <div>
            <h3 className="font-black uppercase text-sm tracking-widest">
              {isEdit ? 'Editar Nota de Crédito' : 'Nova Nota de Crédito'}
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              {step === 1 ? 'Passo 1: Carregar PDF' : 'Passo 2: Inserir Detalhes Manuais'}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white font-bold text-lg select-none">
            ✕
          </button>
        </div>

        {/* Wizard Steps indicator */}
        {!isEdit && (
          <div className="flex border-b border-gray-100 bg-gray-50/50">
            <div className={`flex-1 text-center py-2 text-xs font-black uppercase tracking-wider ${step === 1 ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400'}`}>
              1. Upload de PDF
            </div>
            <div className={`flex-1 text-center py-2 text-xs font-black uppercase tracking-wider ${step === 2 ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400'}`}>
              2. Introdução de Dados
            </div>
          </div>
        )}

        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {step === 1 ? (
            <div className="space-y-6 py-8">
              <div className="text-center max-w-md mx-auto space-y-2">
                <FileText className="mx-auto text-blue-600 opacity-80" size={48} />
              </div>

              {/* Upload Dropper Box */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/20 transition-all ${isUploading ? 'pointer-events-none bg-gray-50' : ''}`}
              >
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf" className="hidden" />
                {isUploading ? (
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <Loader2 size={36} className="animate-spin text-blue-600" />
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">A extrair com Gemini AI...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <UploadCloud size={36} className="text-gray-400" />
                    <p className="text-xs font-black text-slate-700 uppercase tracking-wider">Clique para selecionar o PDF</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Suporta apenas PDF</p>
                  </div>
                )}
              </div>

              {extractedInfo && (
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex gap-3 text-emerald-800 text-xs font-bold leading-relaxed">
                  <Check size={18} className="shrink-0 text-emerald-600" />
                  <pre className="whitespace-pre-wrap font-sans">{extractedInfo}</pre>
                </div>
              )}

              <div className="pt-4 flex justify-between">
                <button 
                  onClick={onClose} 
                  className="px-6 py-3 border text-gray-500 border-gray-200 hover:bg-gray-50 rounded-xl font-bold uppercase text-xs tracking-widest"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleNext}
                  className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
                >
                  Seguinte <ArrowRight size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Manual Entry Step */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Data do Documento</label>
                  <input 
                    type="date" 
                    value={date} 
                    onChange={e => setDate(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Produto</label>
                  <input 
                    type="text" 
                    value={product} 
                    onChange={e => setProduct(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: CX CHK BM"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Quantidade</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={quantity || ''} 
                    onChange={e => setQuantity(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="1.0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Motivo</label>
                  <select 
                    value={reason} 
                    onChange={e => setReason(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl font-bold outline-none bg-white focus:ring-2 focus:ring-blue-500 text-gray-700"
                  >
                    <option value="Sem motivo selecionado">Selecione o motivo...</option>
                    {CREDIT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Grupo HAVI</label>
                  <select 
                    value={haviGroup} 
                    onChange={e => setHaviGroup(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl font-bold outline-none bg-white focus:ring-2 focus:ring-blue-500 text-gray-700"
                  >
                    <option value="">Selecione o grupo...</option>
                    {HAVI_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Grupo MyStore</label>
                  <select 
                    value={myStoreGroup} 
                    onChange={e => setMyStoreGroup(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl font-bold outline-none bg-white focus:ring-2 focus:ring-blue-500 text-gray-700"
                  >
                    <option value="">Selecione o grupo...</option>
                    {MYSTORE_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Gerente Responsável</label>
                <select 
                  value={managerId} 
                  onChange={e => setManagerId(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl font-bold outline-none bg-white focus:ring-2 focus:ring-blue-500 text-gray-700"
                >
                  <option value="">Selecione o Gerente...</option>
                  {gerentes.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Valor HAVI (€)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={valueHavi || ''} 
                    onChange={e => setValueHavi(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl font-black outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Valor MyStore (€)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={valueMyStore || ''} 
                    onChange={e => setValueMyStore(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl font-black outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Estado</h4>
                </div>
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => setStatus('Pendente')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-extrabold uppercase tracking-tighter border ${status === 'Pendente' ? 'bg-amber-100 text-amber-850 border-amber-300 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                  >
                    Pendente
                  </button>
                  <button 
                    type="button"
                    onClick={() => setStatus('Recebido')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-extrabold uppercase tracking-tighter border ${status === 'Recebido' ? 'bg-emerald-100 text-emerald-850 border-emerald-300 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                  >
                    Finalizado
                  </button>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                {isEdit ? (
                  <button 
                    type="button" 
                    onClick={onClose} 
                    className="flex-1 py-3 border border-gray-200 text-gray-500 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                ) : (
                  <button 
                    type="button" 
                    onClick={() => setStep(1)} 
                    className="flex-1 py-3 border border-gray-200 text-gray-500 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-gray-50"
                  >
                    Voltar
                  </button>
                )}
                <button 
                  type="button" 
                  onClick={handleSave}
                  className="flex-2 bg-blue-600 text-white px-8 py-3 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-[0.98]"
                >
                  Gravar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
