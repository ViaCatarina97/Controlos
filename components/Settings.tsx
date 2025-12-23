
import React, { useState, useMemo } from 'react';
import { AppSettings, BusinessArea, Employee, RestaurantTypology, RoleType, ShiftType, StationConfig } from '../types';
import { AVAILABLE_AREAS, AVAILABLE_SHIFTS, AVAILABLE_TYPOLOGIES, ROLE_COLORS, ROLE_LABELS } from '../constants';
import { 
  Save, Plus, Trash2, User, Edit2, X, Check, Store, Clock, LayoutGrid, Briefcase, 
  Flame, Utensils, Sandwich, Thermometer, CupSoda, Monitor, ShoppingBag, Smile, 
  CarFront, UserCircle, CheckCircle2, Coffee, Users, HeartHandshake, Package, Flag, Car
} from 'lucide-react';

interface SettingsProps {
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
}

const getStationCategory = (label: string) => {
    const lower = label.toLowerCase();
    
    if (lower.includes('drive') || lower.includes('drv')) return { key: 'drive', label: 'Drive', icon: Car, color: 'bg-slate-200 text-slate-700' };
    if (lower.includes('mccafé') || lower.includes('mccafe') || lower.includes('barista')) return { key: 'mccafe', label: 'McCafé', icon: Coffee, color: 'bg-amber-100 text-amber-800' };
    if (lower.includes('batata') || lower.includes('fries') || lower.includes('frit')) return { key: 'fries', label: 'Batatas', icon: Utensils, color: 'bg-yellow-100 text-yellow-700' };
    if (lower.includes('bebida')) return { key: 'beverage', label: 'Bebidas', icon: CupSoda, color: 'bg-pink-100 text-pink-700' };
    if (lower.includes('batch cooker') || lower.includes('bc ')) return { key: 'kitchen', label: 'Batch Cooker', icon: Flame, color: 'bg-orange-100 text-orange-700' };
    if (lower.includes('iniciador') || lower.includes('prep') || lower.includes('finalizador')) return { key: 'kitchen', label: 'Cozinha', icon: Sandwich, color: 'bg-red-100 text-red-700' };
    if (lower.includes('expedidor') || lower.includes('runner') || lower.includes('apresentador') || lower.includes('caixa')) return { key: 'counter', label: 'Balcão', icon: Monitor, color: 'bg-blue-100 text-blue-700' };
    if (lower.includes('sala') || lower.includes('lobby') || lower.includes('rp') || lower.includes('salão')) return { key: 'lobby', label: 'Sala', icon: Users, color: 'bg-blue-100 text-blue-700' };
    if (lower.includes('delivery')) return { key: 'delivery', label: 'Delivery', icon: Package, color: 'bg-green-100 text-green-700' };
    
    return { key: 'other', label: 'Outros Postos', icon: Briefcase, color: 'bg-gray-100 text-gray-700' };
};

export const Settings: React.FC<SettingsProps> = ({ settings, onSaveSettings, employees, setEmployees }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'staff' | 'stations'>('staff');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [empName, setEmpName] = useState('');
  const [empRole, setEmpRole] = useState<RoleType>('TREINADOR');
  const [isStationModalOpen, setIsStationModalOpen] = useState(false);
  const [editingStationId, setEditingStationId] = useState<string | null>(null);
  const [stationLabel, setStationLabel] = useState('');
  const [stationDesignation, setStationDesignation] = useState('');
  const [stationArea, setStationArea] = useState<'kitchen' | 'delivery' | 'lobby' | 'beverage' | 'drive' | 'mccafe' | 'fries' | 'counter'>('lobby');
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
                    label: key.charAt(0).toUpperCase() + key.slice(1), 
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

  const toggleShift = (shift: ShiftType) => {
    const current = localSettings.activeShifts;
    if (current.includes(shift)) setLocalSettings({ ...localSettings, activeShifts: current.filter(s => s !== shift) });
    else setLocalSettings({ ...localSettings, activeShifts: [...current, shift] });
  };

  const toggleArea = (area: BusinessArea) => {
    const current = localSettings.businessAreas;
    if (current.includes(area)) setLocalSettings({ ...localSettings, businessAreas: current.filter(a => a !== area) });
    else setLocalSettings({ ...localSettings, businessAreas: [...current, area] });
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

  const toggleStationActive = (stationId: string) => {
    setLocalSettings(prev => ({
      ...prev,
      customStations: prev.customStations.map(s => s.id === stationId ? { ...s, isActive: !s.isActive } : s)
    }));
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

  const handleDeleteStation = (id: string) => {
      if (confirm('Tem a certeza que deseja eliminar este posto?')) {
        setLocalSettings(prev => ({ ...prev, customStations: prev.customStations.filter(s => s.id !== id) }));
      }
  };

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-lg shadow overflow-hidden h-full flex flex-col">
      <div className="flex border-b border-gray-200 shrink-0">
        <button onClick={() => setActiveTab('staff')} className={`flex-1 py-4 text-center font-medium ${activeTab === 'staff' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Colaboradores</button>
        <button onClick={() => setActiveTab('stations')} className={`flex-1 py-4 text-center font-medium ${activeTab === 'stations' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Postos</button>
        <button onClick={() => setActiveTab('general')} className={`flex-1 py-4 text-center font-medium ${activeTab === 'general' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Configurações do Restaurante</button>
      </div>

      <div className="p-6 overflow-auto flex-1 bg-gray-50/50">
        {activeTab === 'general' && (
          <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
            <div className="pb-6 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Store size={18} className="text-blue-600"/> Identidade</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Restaurante</label>
                  <input type="text" className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none" value={localSettings.restaurantName} onChange={(e) => setLocalSettings({ ...localSettings, restaurantName: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipologia</label>
                  <select className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none" value={localSettings.restaurantType} onChange={(e) => setLocalSettings({ ...localSettings, restaurantType: e.target.value as RestaurantTypology })}>
                    {AVAILABLE_TYPOLOGIES.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="pb-6 border-b border-gray-100">
               <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Clock size={18} className="text-blue-600"/> Turnos Operacionais</h3>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                 {AVAILABLE_SHIFTS.map((shift) => (
                   <label key={shift.id} className={`cursor-pointer border rounded-lg p-3 flex items-center gap-3 transition-colors ${localSettings.activeShifts.includes(shift.id) ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                     <input type="checkbox" className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" checked={localSettings.activeShifts.includes(shift.id)} onChange={() => toggleShift(shift.id)} />
                     <span className="font-medium">{shift.label}</span>
                   </label>
                 ))}
               </div>
            </div>
            <div>
               <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><LayoutGrid size={18} className="text-blue-600"/> Plataformas (Áreas de Negócio)</h3>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                 {AVAILABLE_AREAS.map((area) => (
                   <label key={area} className={`cursor-pointer border rounded-lg p-3 flex items-center gap-3 transition-colors ${localSettings.businessAreas.includes(area) ? 'bg-green-50 border-green-200 text-green-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                     <input type="checkbox" className="w-4 h-4 text-green-600 rounded focus:ring-green-500" checked={localSettings.businessAreas.includes(area)} onChange={() => toggleArea(area)} />
                     <span className="font-medium">{area}</span>
                   </label>
                 ))}
               </div>
            </div>
            <div className="flex justify-end pt-4">
              <button onClick={handleSaveWithFeedback} className="flex items-center gap-2 bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 font-bold shadow-md transition-transform active:scale-95"><Save size={18} /> Guardar Alterações</button>
            </div>
          </div>
        )}
        {activeTab === 'stations' && (
            <div className="space-y-6 animate-fade-in flex flex-col h-full">
                <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <div>
                        <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg"><Briefcase size={20} className="text-blue-600"/> Configuração de Postos</h3>
                        <p className="text-sm text-gray-500">Gerencie a estrutura de postos e designações do restaurante.</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => openStationModal()} className="flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 font-bold shadow-sm transition-transform active:scale-95"><Plus size={18} /> Novo Posto</button>
                        <button onClick={handleSaveWithFeedback} className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-bold shadow-md transition-transform active:scale-95"><Save size={18} /> Guardar</button>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
                    {groupedStations.map((group) => (
                        <div key={group.meta.key} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                            <div className={`px-4 py-3 border-b border-gray-100 flex items-center gap-2 ${group.meta.color} bg-opacity-20`}>
                                <group.meta.icon size={18} />
                                <h4 className="font-bold uppercase tracking-wide text-sm">{group.meta.label}</h4>
                                <span className="ml-auto bg-white/50 px-2 py-0.5 rounded-full text-xs font-bold border border-black/5">{group.stations.length}</span>
                            </div>
                            <div className="divide-y divide-gray-50 flex-1">
                                {group.stations.map(station => (
                                    <div key={station.id} className="p-3 hover:bg-gray-50 transition-colors flex items-center justify-between group">
                                        <div className="flex flex-col min-w-0 pr-2">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`font-semibold text-sm truncate ${station.isActive ? 'text-gray-800' : 'text-gray-400 decoration-slate-400 line-through'}`}>{station.label}</span>
                                            </div>
                                            {station.designation && <span className="inline-block bg-gray-100 text-gray-500 text-[10px] px-1.5 py-0.5 rounded border border-gray-200 self-start font-mono">{station.designation}</span>}
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <div className="flex items-center gap-1 text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded"><User size={12} /><span className="font-medium">{station.defaultSlots}</span></div>
                                            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                 <label className="cursor-pointer p-1.5 rounded hover:bg-gray-200 text-gray-400 hover:text-blue-600 transition-colors" title={station.isActive ? "Desativar" : "Ativar"}>
                                                    <input type="checkbox" className="hidden" checked={station.isActive} onChange={() => toggleStationActive(station.id)} />
                                                    {station.isActive ? <CheckCircle2 size={16} className="text-green-500"/> : <X size={16} />}
                                                </label>
                                                <button onClick={() => openStationModal(station)} className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors" title="Editar"><Edit2 size={16} /></button>
                                                <button onClick={() => handleDeleteStation(station.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors" title="Eliminar"><Trash2 size={16} /></button>
                                            </div>
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
          <div className="animate-fade-in max-w-5xl mx-auto">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Lista de Colaboradores</h2>
                <button onClick={() => openModal()} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"><Plus size={18} /> Adicionar</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {employees.map((emp) => (
                  <div key={emp.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex justify-between items-center group hover:shadow-md transition-shadow">
                     <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full bg-gray-50`}><User size={20} className="text-gray-500" /></div>
                        <div>
                          <h3 className="font-semibold text-gray-800">{emp.name}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${ROLE_COLORS[emp.role]}`}>{ROLE_LABELS[emp.role]}</span>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openModal(emp)} className="p-1 text-gray-400 hover:text-blue-500"><Edit2 size={16} /></button>
                        <button onClick={() => handleDeleteEmployee(emp.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                      </div>
                  </div>
                ))}
              </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-scale-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-800">{editingId ? 'Editar' : 'Novo'} Colaborador</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input type="text" className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={empName} onChange={(e) => setEmpName(e.target.value)} placeholder="Nome do colaborador" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
                <select className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={empRole} onChange={(e) => setEmpRole(e.target.value as RoleType)}>
                  {Object.entries(ROLE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
              </div>
              <div className="pt-6 flex justify-end gap-3">
                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">Cancelar</button>
                <button onClick={handleSaveEmployee} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium shadow-sm transition-transform active:scale-95"><Check size={16} /> Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isStationModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-scale-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-800">{editingStationId ? 'Editar' : 'Novo'} Posto de Trabalho</h3>
              <button onClick={() => setIsStationModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Posto</label>
                    <input type="text" className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Ex: Grelhador Extra" value={stationLabel} onChange={(e) => setStationLabel(e.target.value)} autoFocus />
                  </div>
                   <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Designação (Curta)</label>
                    <input type="text" className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Ex: GRELH 1" value={stationDesignation} onChange={(e) => setStationDesignation(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Lotação Máx.</label>
                    <input type="number" min="1" max="10" className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={stationSlots} onChange={(e) => setStationSlots(parseInt(e.target.value))} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Área Operacional</label>
                    <select className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={stationArea} onChange={(e) => setStationArea(e.target.value as any)}>
                        <option value="kitchen">Produção (Cozinha)</option>
                        <option value="drive">Drive</option>
                        <option value="fries">Batatas (Fries)</option>
                        <option value="mccafe">McCafé</option>
                        <option value="delivery">Delivery</option>
                        <option value="beverage">Bebidas (Cell)</option>
                        <option value="counter">Balcão</option>
                        <option value="lobby">Sala</option>
                    </select>
                  </div>
              </div>
              <div className="pt-6 flex justify-end gap-3">
                <button onClick={() => setIsStationModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">Cancelar</button>
                <button onClick={handleSaveStation} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium shadow-sm transition-transform active:scale-95">{editingStationId ? <Save size={16} /> : <Plus size={16} />} {editingStationId ? 'Atualizar' : 'Adicionar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
