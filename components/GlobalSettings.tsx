import React, { useState, useMemo } from 'react';
import { Employee, RoleType } from '../types';
import { ROLE_COLORS, ROLE_LABELS } from '../constants';
import { Trash2, Users, ArrowLeft } from 'lucide-react';

interface GlobalSettingsProps {
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  onBack: () => void;
}

export const GlobalSettings: React.FC<GlobalSettingsProps> = ({ 
  employees, 
  setEmployees, 
  onBack 
}) => {
  const [renderTrigger, setRenderTrigger] = useState(0);

  const sortedEmployeeIds = useMemo(() => {
    return [...employees]
      .sort((a, b) => a.name.localeCompare(b.name, 'pt', { sensitivity: 'base' }))
      .map(e => e.id);
  }, [employees, renderTrigger]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-gray-150 rounded-lg transition-colors text-slate-700"
            title="Voltar"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">Definições da Unidade</h1>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Gestão Global de Colaboradores e Configurações</p>
          </div>
        </div>
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors px-4 py-2 hover:bg-slate-100 rounded-xl font-bold text-xs uppercase tracking-wider"
        >
          Voltar ao Menu
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-8 animate-fade-in">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden p-6 md:p-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                <Users size={22} className="text-blue-600" />
                Equipa Registada
              </h3>
              <p className="text-xs text-gray-450 font-bold uppercase tracking-wider mt-1">Gerencie a lista única de colaboradores da sua unidade.</p>
            </div>
            <button 
              onClick={() => setEmployees(prev => [...prev, {
                id: crypto.randomUUID(), 
                name: 'Novo Colaborador', 
                role: 'FUNCIONÁRIO', 
                isActive: true, 
                mecanografico: ''
              }])} 
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md flex items-center gap-2 text-xs uppercase tracking-wider"
            >
              + Adicionar Colaborador
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase tracking-wider">
                  <th className="p-4 w-36">Nº Mecanográfico</th>
                  <th className="p-4">Nome do Colaborador</th>
                  <th className="p-4 w-72">Cargo</th>
                  <th className="p-4 w-20 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {sortedEmployeeIds.map(id => {
                  const emp = employees.find(e => e.id === id);
                  if (!emp) return null;
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/30 transition-colors group">
                      <td className="p-4">
                        <input 
                          type="text"
                          placeholder="Nº"
                          value={emp.mecanografico || ''} 
                          onChange={e => setEmployees(prev => prev.map(ev => ev.id === emp.id ? {...ev, mecanografico: e.target.value} : ev))}
                          onBlur={() => setRenderTrigger(prev => prev + 1)}
                          className="w-full font-mono font-black text-slate-700 bg-slate-50 border border-slate-250 rounded-xl px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:bg-white outline-none"
                        />
                      </td>
                      <td className="p-4">
                        <input 
                          type="text"
                          value={emp.name} 
                          onChange={e => setEmployees(prev => prev.map(ev => ev.id === emp.id ? {...ev, name: e.target.value} : ev))}
                          onBlur={() => setRenderTrigger(prev => prev + 1)}
                          className="w-full font-bold text-slate-800 bg-white border border-slate-250 rounded-xl px-3 py-2 focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                      </td>
                      <td className="p-4">
                        <select 
                          value={emp.role} 
                          onChange={e => setEmployees(prev => prev.map(ev => ev.id === emp.id ? {...ev, role: e.target.value as RoleType} : ev))}
                          onBlur={() => setRenderTrigger(prev => prev + 1)}
                          className={`w-full font-bold text-xs px-3 py-2 rounded-xl border bg-white focus:ring-1 focus:ring-blue-500 outline-none text-slate-800 ${ROLE_COLORS[emp.role]} bg-opacity-5`}
                        >
                          {Object.entries(ROLE_LABELS).map(([k, l]) => (
                            <option key={k} value={k}>{l}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => {
                            if (confirm(`Tem a certeza que deseja eliminar ${emp.name}?`)) {
                              setEmployees(prev => prev.filter(ev => ev.id !== emp.id));
                            }
                          }} 
                          className="text-slate-350 hover:text-red-500 p-2 hover:bg-slate-100 rounded-xl transition-all"
                          title="Eliminar Colaborador"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {sortedEmployeeIds.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center font-bold text-slate-400 uppercase tracking-wider">
                      Nenhum colaborador registado. Clique em "+ Adicionar Colaborador" para começar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};
