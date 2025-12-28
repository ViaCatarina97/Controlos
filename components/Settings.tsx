
import React, { useState, useMemo } from 'react';
import { AppSettings, Employee, RoleType, StationConfig, RestaurantTypology } from '../types';
import { AVAILABLE_TYPOLOGIES, ROLE_COLORS, ROLE_LABELS, STATIONS } from '../constants';
import { 
  Save, Plus, Trash2, User, Edit2, Store, Briefcase, Flame, Utensils, Sandwich, CupSoda, Monitor, Coffee, Users, Package, Car, Download, Upload, Cloud
} from 'lucide-react';

interface SettingsProps {
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings[]) => void;
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  onExport: () => void;
  onImport: (data: any) => void;
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
    return { key: 'other', icon: Briefcase, color: 'bg-gray-100 text-gray-700' };
};

export const Settings: React.FC<SettingsProps> = ({ settings, onSaveSettings, employees, setEmployees, onExport, onImport }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'staff' | 'stations' | 'sync'>('staff');
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

  const handleSaveGeneral = () => {
    onSaveSettings([localSettings]);
    alert("Configurações locais guardadas com sucesso!");
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
            alert("Ficheiro de backup inválido.");
        }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
      <div className="flex border-b border-gray-100 bg-gray-50/50 p-1">
        <button onClick={() => setActiveTab('staff')} className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'staff' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Staff</button>
        <button onClick={() => setActiveTab('stations')} className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'stations' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Postos</button>
        <button onClick={() => setActiveTab('sync')} className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'sync' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:text-emerald-600'}`}>Sincronização</button>
        <button onClick={() => setActiveTab('general')} className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'general' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Restaurante</button>
      </div>

      <div className="p-8 overflow-auto flex-1">
        {activeTab === 'sync' && (
          <div className="max-w-2xl mx-auto space-y-8 animate-fade-in py-8">
            <div className="text-center">
              <div className="inline-flex p-4 bg-emerald-50 text-emerald-600 rounded-full mb-4"><Cloud size={48} /></div>
              <h3 className="text-2xl font-black text-gray-800">Portabilidade de Dados</h3>
              <p className="text-gray-500 mt-2">Use esta funcionalidade para mover todas as suas definições, histórico e equipas entre diferentes computadores ou para fazer cópias de segurança.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border-2 border-slate-100 shadow-sm flex flex-col items-center text-center">
                    <Download size={32} className="text-blue-500 mb-4" />
                    <h4 className="font-bold text-gray-800 mb-1">Exportar Backup</h4>
                    <p className="text-xs text-gray-400 mb-6">Descarregue um ficheiro com todos os dados atuais do restaurante.</p>
                    <button onClick={onExport} className="w-full py-3 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">Guardar Ficheiro</button>
                </div>

                <div className="bg-white p-6 rounded-2xl border-2 border-slate-100 shadow-sm flex flex-col items-center text-center">
                    <Upload size={32} className="text-emerald-500 mb-4" />
                    <h4 className="font-bold text-gray-800 mb-1">Importar Backup</h4>
                    <p className="text-xs text-gray-400 mb-6">Carregue um ficheiro de backup para restaurar os dados neste PC.</p>
                    <label className="w-full py-3 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer text-center">
                        Selecionar Ficheiro
                        <input type="file" accept=".json" className="hidden" onChange={handleFileUpload} />
                    </label>
                </div>
            </div>
          </div>
        )}

        {activeTab === 'general' && (
          <div className="space-y-6 max-w-2xl mx-auto animate-fade-in">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome do Restaurante</label>
                <input type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={localSettings.restaurantName} onChange={e => setLocalSettings({...localSettings, restaurantName: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Tipologia</label>
                <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" value={localSettings.restaurantType} onChange={e => setLocalSettings({...localSettings, restaurantType: e.target.value as RestaurantTypology})}>
                  {AVAILABLE_TYPOLOGIES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <button onClick={handleSaveGeneral} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black hover:bg-slate-800 transition-all">Guardar Configuração Geral</button>
          </div>
        )}

        {activeTab === 'staff' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-black text-gray-800">Equipa Registada</h3>
              <button onClick={() => setEmployees(prev => [...prev, {id: crypto.randomUUID(), name: 'Novo Colaborador', role: 'FUNCIONÁRIO', isActive: true}])} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all">+ Adicionar</button>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
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
