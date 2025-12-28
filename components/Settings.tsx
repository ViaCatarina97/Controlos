
import React, { useState, useMemo } from 'react';
import { AppSettings, BusinessArea, Employee, RestaurantTypology, RoleType, StationConfig } from '../types';
import { AVAILABLE_AREAS, AVAILABLE_SHIFTS, AVAILABLE_TYPOLOGIES, ROLE_COLORS, ROLE_LABELS } from '../constants';
import { 
  Save, Plus, Trash2, User, Edit2, X, Check, Store, Clock, LayoutGrid, Briefcase, 
  Flame, Utensils, Sandwich, CupSoda, Monitor, CheckCircle2, Coffee, Users, Package, Car,
  Download, Upload, Cloud
} from 'lucide-react';

interface SettingsProps {
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  onExport: () => void;
  onImport: (data: any) => void;
}

const getStationCategory = (label: string) => {
    const lower = label.toLowerCase();
    if (lower.includes('drive')) return { key: 'drive', label: 'Drive', icon: Car, color: 'bg-slate-200 text-slate-700' };
    if (lower.includes('mccafé')) return { key: 'mccafe', label: 'McCafé', icon: Coffee, color: 'bg-amber-100 text-amber-800' };
    if (lower.includes('batata')) return { key: 'fries', label: 'Batatas', icon: Utensils, color: 'bg-yellow-100 text-yellow-700' };
    if (lower.includes('bebida')) return { key: 'beverage', label: 'Bebidas', icon: CupSoda, color: 'bg-pink-100 text-pink-700' };
    if (lower.includes('batch cooker')) return { key: 'kitchen', label: 'Batch Cooker', icon: Flame, color: 'bg-orange-100 text-orange-700' };
    if (lower.includes('iniciador') || lower.includes('finalizador')) return { key: 'kitchen', label: 'Produção', icon: Sandwich, color: 'bg-red-100 text-red-700' };
    if (lower.includes('expedidor') || lower.includes('caixa')) return { key: 'counter', label: 'Serviço', icon: Monitor, color: 'bg-blue-100 text-blue-700' };
    if (lower.includes('sala') || lower.includes('rp')) return { key: 'lobby', label: 'Sala', icon: Users, color: 'bg-blue-100 text-blue-700' };
    if (lower.includes('delivery')) return { key: 'delivery', label: 'Delivery', icon: Package, color: 'bg-green-100 text-green-700' };
    return { key: 'other', label: 'Outros Postos', icon: Briefcase, color: 'bg-gray-100 text-gray-700' };
};

export const Settings: React.FC<SettingsProps> = ({ settings, onSaveSettings, employees, setEmployees, onExport, onImport }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'staff' | 'stations' | 'sync'>('staff');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [empName, setEmpName] = useState('');
  const [empRole, setEmpRole] = useState<RoleType>('TREINADOR');
  const [isStationModalOpen, setIsStationModalOpen] = useState(false);
  const [editingStationId, setEditingStationId] = useState<string | null>(null);
  const [stationLabel, setStationLabel] = useState('');
  const [stationDesignation, setStationDesignation] = useState('');
  const [stationArea, setStationArea] = useState<any>('lobby');
  const [stationSlots, setStationSlots] = useState(1);
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);

  const groupedStations = useMemo(() => {
    const groups: Record<string, { meta: any, stations: StationConfig[] }> = {};
    localSettings.customStations.forEach(station => {
        const category = getStationCategory(station.label);
        const key = station.area || category.key;
        if (!groups[key]) {
            groups[key] = { 
                meta: { 
                    key, 
                    label: key === 'kitchen' ? 'Produção' : 
                           key === 'counter' ? 'Serviço' :
                           key === 'beverage' ? 'Bebidas' :
                           key === 'fries' ? 'Batatas' :
                           key === 'lobby' ? 'Sala' :
                           key.charAt(0).toUpperCase() + key.slice(1), 
                    icon: category.icon, 
                    color: category.color 
                }, 
                stations: [] 
            };
        }
        groups[key].stations.push(station);
    });
    return Object.values(groups);
  }, [localSettings.customStations]);

  const openModal = (emp?: Employee) => {
    if (emp) {
      setEditingId(emp.id);
      setEmpName(emp.name);
      setEmpRole(emp.role);
    } else {
      setEditingId(null);
      setEmpName('');
      setEmpRole('TREINADOR');
    }
    setIsModalOpen(true);
  };

  const handleSaveEmployee = () => {
    if (!empName.trim()) return;
    if (editingId) {
      setEmployees(prev => prev.map(e => e.id === editingId ? { ...e, name: empName, role: empRole } : e));
    } else {
      const newEmp: Employee = { id: crypto.randomUUID(), name: empName, role: empRole, isActive: true };
      setEmployees(prev => [...prev, newEmp]);
    }
    setIsModalOpen(false);
  };

  const handleDeleteEmployee = (id: string) => {
    if (confirm('Tem a certeza que deseja eliminar este colaborador?')) setEmployees(prev => prev.filter(e => e.id !== id));
  };

  const handleSaveWithFeedback = () => {
    onSaveSettings(localSettings);
    alert('Configurações guardadas com sucesso!');
  };

  const openStationModal = (station?: StationConfig) => {
    if (station) {
        setEditingStationId(station.id);
        setStationLabel(station.label);
        setStationDesignation(station.designation || '');
        setStationArea(station.area);
        setStationSlots(station.defaultSlots);
    } else {
        setEditingStationId(null);
        setStationLabel('');
        setStationDesignation('');
        setStationArea('lobby');
        setStationSlots(1);
    }
    setIsStationModalOpen(true);
  };

  const handleSaveStation = () => {
    if (!stationLabel.trim()) return;
    if (editingStationId) {
        setLocalSettings(prev => ({
            ...prev,
            customStations: prev.customStations.map(s => 
                s.id === editingStationId 
                ? { ...s, label: stationLabel, designation: stationDesignation, area: stationArea, defaultSlots: stationSlots }
                : s
            )
        }));
    } else {
        const newStation: StationConfig = {
            id: `custom_${Date.now()}`,
            label: stationLabel,
            designation: stationDesignation,
            area: stationArea,
            defaultSlots: stationSlots,
            isActive: true,
            icon: 'Circle' 
        };
        setLocalSettings(prev => ({ ...prev, customStations: [...prev.customStations, newStation] }));
    }
    setIsStationModalOpen(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const data = JSON.parse(ev.target?.result as string);
            onImport(data);
        } catch (err) {
            alert("Ficheiro inválido.");
        }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-lg shadow overflow-hidden h-full flex flex-col">
      <div className="flex border-b border-gray-200 shrink-0 bg-white">
        <button onClick={() => setActiveTab('staff')} className={`flex-1 py-4 text-center font-bold text-sm uppercase tracking-wider ${activeTab === 'staff' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>Colaboradores</button>
        <button onClick={() => setActiveTab('stations')} className={`flex-1 py-4 text-center font-bold text-sm uppercase tracking-wider ${activeTab === 'stations' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>Postos</button>
        <button onClick={() => setActiveTab('general')} className={`flex-1 py-4 text-center font-bold text-sm uppercase tracking-wider ${activeTab === 'general' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>Configurações</button>
        <button onClick={() => setActiveTab('sync')} className={`flex-1 py-4 text-center font-bold text-sm uppercase tracking-wider ${activeTab === 'sync' ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/30' : 'text-gray-400 hover:text-emerald-500'}`}>
            Sincronização & Backup
        </button>
      </div>

      <div className="p-6 overflow-auto flex-1 bg-gray-50/30">
        {activeTab === 'sync' && (
            <div className="max-w-3xl mx-auto space-y-8 animate-fade-in py-8">
                <div className="text-center mb-10">
                    <div className="inline-flex p-4 bg-emerald-100 text-emerald-600 rounded-full mb-4"><Cloud size={48} /></div>
                    <h2 className="text-2xl font-black text-gray-800">Aceder a partir de outro PC</h2>
                    <p className="text-gray-500 mt-2">Use esta funcionalidade para mover todas as suas definições, histórico e equipas para um computador diferente.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-8 rounded-2xl border-2 border-slate-100 shadow-sm flex flex-col items-center text-center">
                        <Download size={32} className="text-blue-500 mb-4" />
                        <h3 className="font-bold text-lg mb-2 text-gray-800">Exportar Tudo</h3>
                        <p className="text-sm text-gray-400 mb-6 flex-1">Cria um ficheiro de backup completo com todas as definições do restaurante, funcionários e histórico.</p>
                        <button onClick={onExport} className="w-full py-3 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">
                            Guardar Pacote de Dados
                        </button>
                    </div>

                    <div className="bg-white p-8 rounded-2xl border-2 border-slate-100 shadow-sm flex flex-col items-center text-center">
                        <Upload size={32} className="text-emerald-500 mb-4" />
                        <h3 className="font-bold text-lg mb-2 text-gray-800">Importar Dados</h3>
                        <p className="text-sm text-gray-400 mb-6 flex-1">Carrega um ficheiro de backup criado anteriormente noutro computador para este.</p>
                        <label className="w-full py-3 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer text-center">
                            Carregar Pacote de Dados
                            <input type="file" accept=".json" className="hidden" onChange={handleFileUpload} />
                        </label>
                    </div>
                </div>

                <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex gap-3">
                    <div className="shrink-0 text-amber-500"><Cloud size={20}/></div>
                    <div className="text-xs text-amber-700">
                        <p className="font-bold mb-1 uppercase tracking-tight">Nota de Segurança:</p>
                        <p>Os dados são guardados localmente no navegador por defeito. Para garantir que nada se perde, recomendamos fazer um backup semanal (Exportar) para a sua Cloud pessoal ou Pen Drive.</p>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'general' && (
          <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
            <div className="pb-6 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Store size={18} className="text-blue-600"/> Identidade</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome do Restaurante</label>
                  <input type="text" className="w-full p-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={localSettings.restaurantName} onChange={(e) => setLocalSettings({ ...localSettings, restaurantName: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Tipologia</label>
                  <select className="w-full p-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={localSettings.restaurantType} onChange={(e) => setLocalSettings({ ...localSettings, restaurantType: e.target.value as RestaurantTypology })}>
                    {AVAILABLE_TYPOLOGIES.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <button onClick={handleSaveWithFeedback} className="flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-xl hover:bg-slate-800 font-bold shadow-md transition-all active:scale-95"><Save size={18} /> Guardar Alterações</button>
            </div>
          </div>
        )}
        
        {activeTab === 'stations' && (
            <div className="space-y-6 animate-fade-in flex flex-col h-full">
                <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <div>
                        <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg"><Briefcase size={20} className="text-blue-600"/> Gestão de Postos Criados</h3>
                        <p className="text-sm text-gray-500">Configure os postos de trabalho permanentes deste restaurante.</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => openStationModal()} className="flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 font-bold shadow-sm transition-transform active:scale-95"><Plus size={18} /> Novo Posto</button>
                        <button onClick={handleSaveWithFeedback} className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-bold shadow-md transition-transform active:scale-95"><Save size={18} /> Gravar Postos</button>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
                    {groupedStations.map((group) => (
                        <div key={group.meta.key} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                            <div className={`px-4 py-3 border-b border-gray-100 flex items-center gap-2 ${group.meta.color} bg-opacity-20`}>
                                <group.meta.icon size={18} />
                                <h4 className="font-bold uppercase tracking-wide text-xs">{group.meta.label}</h4>
                            </div>
                            <div className="divide-y divide-gray-50 flex-1">
                                {group.stations.map(station => (
                                    <div key={station.id} className="p-3 hover:bg-gray-50 transition-colors flex items-center justify-between group">
                                        <div className="flex flex-col min-w-0 pr-2">
                                            <span className={`font-semibold text-sm truncate ${station.isActive ? 'text-gray-800' : 'text-gray-400'}`}>{station.label}</span>
                                            {station.designation && <span className="inline-block bg-gray-100 text-gray-500 text-[10px] px-1.5 py-0.5 rounded font-mono self-start">{station.designation}</span>}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button onClick={() => openStationModal(station)} className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600"><Edit2 size={16} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'staff' && (
          <div className="animate-fade-in max-w-5xl mx-auto py-4">
             <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Equipa Registada</h2>
                    <p className="text-sm text-gray-500">Lista completa de funcionários para posicionamento.</p>
                </div>
                <button onClick={() => openModal()} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-all font-bold shadow-md"><Plus size={18} /> Adicionar Novo</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {employees.map((emp) => (
                  <div key={emp.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center group hover:border-blue-300 transition-all">
                     <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl bg-gray-50 text-gray-400`}><User size={24} /></div>
                        <div>
                          <h3 className="font-bold text-gray-800 leading-none mb-1">{emp.name}</h3>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${ROLE_COLORS[emp.role]}`}>{ROLE_LABELS[emp.role]}</span>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openModal(emp)} className="p-2 text-gray-400 hover:text-blue-500 bg-gray-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                        <button onClick={() => handleDeleteEmployee(emp.id)} className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                      </div>
                  </div>
                ))}
              </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-scale-up">
            <h3 className="text-xl font-black text-gray-800 mb-6">{editingId ? 'Editar' : 'Novo'} Colaborador</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome Completo</label>
                <input type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={empName} onChange={(e) => setEmpName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Cargo / Função</label>
                <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={empRole} onChange={(e) => setEmpRole(e.target.value as RoleType)}>
                  {Object.entries(ROLE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
              </div>
              <div className="pt-6 flex gap-3">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl">Cancelar</button>
                <button onClick={handleSaveEmployee} className="flex-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-black shadow-lg shadow-blue-500/30">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isStationModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-scale-up">
            <h3 className="text-xl font-black text-gray-800 mb-6">Configurar Posto</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome do Posto</label>
                    <input type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" value={stationLabel} onChange={(e) => setStationLabel(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Lotação</label>
                    <input type="number" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" value={stationSlots} onChange={(e) => setStationSlots(parseInt(e.target.value))} />
                  </div>
              </div>
              <div className="pt-6 flex gap-3">
                <button onClick={() => setIsStationModalOpen(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl">Cancelar</button>
                <button onClick={handleSaveStation} className="flex-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-black">Adicionar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
