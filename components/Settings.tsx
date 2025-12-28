
import React, { useState, useMemo } from 'react';
import { AppSettings, Employee, RoleType, StationConfig, RestaurantTypology, ShiftType, BusinessArea } from '../types';
import { AVAILABLE_TYPOLOGIES, ROLE_COLORS, ROLE_LABELS, STATIONS, AVAILABLE_SHIFTS, AVAILABLE_AREAS } from '../constants';
import { 
  Save, Trash2, Flame, Utensils, Sandwich, CupSoda, Monitor, Coffee, Users, Package, Car, CheckSquare, Square, Truck
} from 'lucide-react';

interface SettingsProps {
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings[]) => void;
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
}

const getStationCategory = (label: string) => {
    const lower = label.toLowerCase();
    if (lower.includes('drive')) return { key: 'drive', icon: Car, color: 'bg-slate-200 text-slate-700' };
    if (lower.includes('mccafé')) return { key: 'mccafe', icon: Coffee, color: 'bg-amber-100 text-amber-800' };
    if (lower.includes('batata')) return { key: 'fries', icon: Utensils, color: 'bg-yellow-100 text-yellow-700' };
    if (lower.includes('bebida')) return { key: 'beverage', icon: CupSoda, color: 'bg-pink-100 text-pink-700' };
    if (lower.includes('batch cooker')) return { key: 'kitchen', icon: Flame, color: 'bg-orange-100 text-orange-700' };
    if (lower.includes('iniciador') || lower.includes('finalizador')) return { key: 'kitchen', icon: Sandwich, color: 'bg-red-100 text-red-700' };
    if (lower.includes('expedidor') || lower.includes('caixa')) return { key: 'counter', icon: Monitor, color: 'bg-blue-100 text-blue-700' };
    if (lower.includes('sala') || lower.includes('rp')) return { key: 'lobby', icon: Users, color: 'bg-blue-100 text-blue-700' };
    if (lower.includes('delivery')) return { key: 'delivery', icon: Package, color: 'bg-green-100 text-green-700' };
    return { key: 'other', icon: Users, color: 'bg-gray-100 text-gray-700' };
};

export const Settings: React.FC<SettingsProps> = ({ settings, onSaveSettings, employees, setEmployees }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'staff' | 'stations'>('staff');
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);

  const groupedStations = useMemo(() => {
    const groups: Record<string, { label: string, icon: any, color: string, stations: StationConfig[] }> = {};
    localSettings.customStations.forEach(station => {
        const cat = getStationCategory(station.label);
        const area = station.area || cat.key;
        if (!groups[area]) {
            groups[area] = { 
                label: area === 'kitchen' ? 'Produção' : area === 'counter' ? 'Serviço' : area.charAt(0).toUpperCase() + area.slice(1), 
                icon: cat.icon, color: cat.color, stations: [] 
            };
        }
        groups[area].stations.push(station);
    });
    return Object.values(groups);
  }, [localSettings.customStations]);

  const toggleShift = (shiftId: ShiftType) => {
    setLocalSettings(prev => {
        const activeShifts = prev.activeShifts.includes(shiftId)
            ? prev.activeShifts.filter(s => s !== shiftId)
            : [...prev.activeShifts, shiftId];
        return { ...prev, activeShifts };
    });
  };

  const toggleArea = (area: BusinessArea) => {
    setLocalSettings(prev => {
        const businessAreas = prev.businessAreas.includes(area)
            ? prev.businessAreas.filter(a => a !== area)
            : [...prev.businessAreas, area];
        return { ...prev, businessAreas };
    });
  };

  const handleSaveGeneral = () => {
    onSaveSettings([localSettings]);
    alert("Configurações da loja guardadas com sucesso!");
  };

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
      <div className="flex border-b border-gray-100 bg-gray-50/50 p-1">
        <button onClick={() => setActiveTab('staff')} className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'staff' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Equipa</button>
        <button onClick={() => setActiveTab('stations')} className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'stations' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Postos</button>
        <button onClick={() => setActiveTab('general')} className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'general' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Loja</button>
      </div>

      <div className="p-8 overflow-auto flex-1">
        {activeTab === 'general' && (
          <div className="space-y-8 max-w-4xl mx-auto animate-fade-in pb-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Nome da Unidade</label>
                <input type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-700" value={localSettings.restaurantName} onChange={e => setLocalSettings({...localSettings, restaurantName: e.target.value})} />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Tipologia de Loja</label>
                <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-gray-700" value={localSettings.restaurantType} onChange={e => setLocalSettings({...localSettings, restaurantType: e.target.value as RestaurantTypology})}>
                  {AVAILABLE_TYPOLOGIES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Turnos Ativos */}
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        Turnos Operacionais
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                        {AVAILABLE_SHIFTS.map(shift => {
                            const isActive = localSettings.activeShifts.includes(shift.id);
                            return (
                                <button 
                                    key={shift.id} 
                                    onClick={() => toggleShift(shift.id)}
                                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-sm font-bold ${isActive ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300'}`}
                                >
                                    {isActive ? <CheckSquare size={18} /> : <Square size={18} />}
                                    {shift.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Áreas de Negócio */}
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        Áreas de Atividade
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                        {AVAILABLE_AREAS.map(area => {
                            const isActive = localSettings.businessAreas.includes(area);
                            return (
                                <button 
                                    key={area} 
                                    onClick={() => toggleArea(area)}
                                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-sm font-bold ${isActive ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-300'}`}
                                >
                                    {isActive ? <CheckSquare size={18} /> : <Square size={18} />}
                                    {area}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Delivery Partners */}
            {localSettings.businessAreas.includes('Delivery') && (
                <div className="bg-white p-6 rounded-2xl border-2 border-slate-100 animate-slide-up">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Truck size={16} className="text-blue-500" /> Parceiros de Delivery
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {["Uber Eats", "Glovo", "Próprio"].map(provider => {
                            const isSelected = localSettings.deliveryProviders.includes(provider);
                            return (
                                <button 
                                    key={provider}
                                    onClick={() => {
                                        setLocalSettings(prev => ({
                                            ...prev,
                                            deliveryProviders: isSelected 
                                                ? prev.deliveryProviders.filter(p => p !== provider)
                                                : [...prev.deliveryProviders, provider]
                                        }));
                                    }}
                                    className={`px-4 py-2 rounded-full border-2 text-xs font-black uppercase tracking-widest transition-all ${isSelected ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}
                                >
                                    {provider}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            <button onClick={handleSaveGeneral} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-xl">
                <Save size={20} /> Guardar Configuração da Loja
            </button>
          </div>
        )}

        {activeTab === 'staff' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-black text-gray-800">Equipa Registada</h3>
              <button onClick={() => setEmployees(prev => [...prev, {id: crypto.randomUUID(), name: 'Novo Colaborador', role: 'FUNCIONÁRIO', isActive: true}])} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md">+ Adicionar</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {employees.map(emp => (
                <div key={emp.id} className="bg-white p-4 rounded-2xl border border-gray-200 flex justify-between items-center hover:shadow-md transition-all group">
                   <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-50 rounded-xl text-gray-400"><Users size={24} /></div>
                      <div>
                        <input value={emp.name} onChange={e => setEmployees(prev => prev.map(ev => ev.id === emp.id ? {...ev, name: e.target.value} : ev))} className="font-bold text-gray-800 bg-transparent border-none p-0 focus:ring-0 w-full" />
                        <select value={emp.role} onChange={e => setEmployees(prev => prev.map(ev => ev.id === emp.id ? {...ev, role: e.target.value as RoleType} : ev))} className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border bg-transparent mt-1 ${ROLE_COLORS[emp.role]}`}>
                          {Object.entries(ROLE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                        </select>
                      </div>
                   </div>
                   <button onClick={() => setEmployees(prev => prev.filter(ev => ev.id !== emp.id))} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={18} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'stations' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in pb-12">
             {groupedStations.map(group => (
               <div key={group.label} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className={`px-4 py-3 border-b flex items-center gap-2 ${group.color} bg-opacity-10`}>
                     <group.icon size={18} />
                     <span className="font-black text-xs uppercase tracking-widest">{group.label}</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                     {group.stations.map(station => (
                       <div key={station.id} className="p-3 flex justify-between items-center hover:bg-gray-50">
                          <span className="text-sm font-bold text-gray-700">{station.label}</span>
                          <span className="text-[10px] font-black text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Slot: {station.defaultSlots}</span>
                       </div>
                     ))}
                  </div>
               </div>
             ))}
          </div>
        )}
      </div>
    </div>
  );
};
