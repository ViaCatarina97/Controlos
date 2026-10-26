import React, { useState, useMemo } from 'react';
import { Employee, RoleType } from '../types';
import { ROLE_COLORS, ROLE_LABELS } from '../constants';
import { Trash2, Users, ArrowLeft, Search, Plus, UserCheck } from 'lucide-react';

interface GlobalSettingsProps {
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  onBack: () => void;
}

export const GlobalSettings: React.FC<GlobalSettingsProps> = ({
  employees,
  setEmployees,
  onBack,
}) => {
  const [renderTrigger, setRenderTrigger] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | RoleType>('ALL');

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: employees.length };
    employees.forEach(e => {
      counts[e.role] = (counts[e.role] || 0) + 1;
    });
    return counts;
  }, [employees]);

  const sortedEmployeeIds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...employees]
      .filter(e => {
        if (roleFilter !== 'ALL' && e.role !== roleFilter) return false;
        if (!q) return true;
        return (
          e.name.toLowerCase().includes(q) ||
          (e.mecanografico || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (Boolean(a.isDraft) !== Boolean(b.isDraft)) return a.isDraft ? -1 : 1;
        return a.name.localeCompare(b.name, 'pt', { sensitivity: 'base' });
      })
      .map(e => e.id);
  }, [employees, renderTrigger, searchQuery, roleFilter]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200 px-4 sm:px-8 h-16 flex justify-between items-center print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-700 border border-slate-200"
            title="Voltar"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
              Definições da Unidade &amp; Equipa
            </h1>
            <p className="text-xs text-slate-500 hidden sm:block">
              Gestão centralizada de colaboradores, nº mecanográfico e cargos operacionais
            </p>
          </div>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors px-3.5 py-2 rounded-xl font-semibold text-xs"
        >
          Voltar à Torre de Controlo
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8 space-y-6 animate-fade-in">
        {/* Summary KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { key: 'ALL', label: 'Total Equipa', count: roleCounts.ALL || 0 },
            { key: 'GERENTE', label: 'Gerentes', count: (roleCounts.GERENTE || 0) + (roleCounts.GERENTE_RESTAURANTE || 0) },
            { key: 'TREINADOR', label: 'Treinadores', count: roleCounts.TREINADOR || 0 },
            { key: 'RP', label: 'Relações Públicas', count: roleCounts.RP || 0 },
            { key: 'FUNCIONÁRIO', label: 'Funcionários', count: roleCounts['FUNCIONÁRIO'] || 0 },
          ].map(card => {
            const active = roleFilter === card.key;
            return (
              <button
                key={card.key}
                type="button"
                onClick={() => setRoleFilter(card.key as any)}
                className={`text-left p-4 rounded-2xl border transition-all ${
                  active
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className={`text-[11px] font-semibold block ${active ? 'text-slate-300' : 'text-slate-500'}`}>
                  {card.label}
                </span>
                <span className="text-2xl font-extrabold tabular-nums mt-1 block">{card.count}</span>
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-4 sm:p-6">
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar colaborador por nome ou nº mecanográfico..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-slate-900"
              />
            </div>

            <button
              onClick={() =>
                setEmployees(prev => [
                  {
                    id: crypto.randomUUID(),
                    name: 'Novo Colaborador',
                    role: 'FUNCIONÁRIO',
                    isActive: true,
                    mecanografico: '',
                    isDraft: true,
                  },
                  ...prev,
                ])
              }
              className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-sm flex items-center justify-center gap-2 text-xs shrink-0"
            >
              <Plus size={16} /> Adicionar Colaborador
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 w-36">Nº Mecanog.</th>
                  <th className="py-3 px-4">Nome do Colaborador</th>
                  <th className="py-3 px-4 w-64">Cargo / Função</th>
                  <th className="py-3 px-4 w-20 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {sortedEmployeeIds.map(id => {
                  const emp = employees.find(e => e.id === id);
                  if (!emp) return null;
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="py-2.5 px-4">
                        <input
                          type="text"
                          placeholder="Nº"
                          value={emp.mecanografico || ''}
                          onChange={e =>
                            setEmployees(prev =>
                              prev.map(ev =>
                                ev.id === emp.id ? { ...ev, mecanografico: e.target.value } : ev
                              )
                            )
                          }
                          onBlur={() => setRenderTrigger(prev => prev + 1)}
                          className="w-full font-mono tabular-nums font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 focus:bg-white outline-none"
                        />
                      </td>
                      <td className="py-2.5 px-4">
                        <input
                          type="text"
                          value={emp.name}
                          onChange={e =>
                            setEmployees(prev =>
                              prev.map(ev => {
                                if (ev.id !== emp.id) return ev;
                                const nextName = e.target.value;
                                const hasRealName = nextName.trim().length > 0 && nextName.trim().toLocaleLowerCase('pt-PT') !== 'novo colaborador';
                                return { ...ev, name: nextName, isDraft: hasRealName ? false : ev.isDraft ?? true };
                              })
                            )
                          }
                          onBlur={() => setRenderTrigger(prev => prev + 1)}
                          className="w-full font-semibold text-slate-900 bg-transparent hover:bg-slate-50 border border-transparent hover:border-slate-200 focus:border-slate-900 focus:bg-white rounded-lg px-3 py-1.5 outline-none transition-colors"
                        />
                      </td>
                      <td className="py-2.5 px-4">
                        <select
                          value={emp.role}
                          onChange={e =>
                            setEmployees(prev =>
                              prev.map(ev =>
                                ev.id === emp.id ? { ...ev, role: e.target.value as RoleType } : ev
                              )
                            )
                          }
                          onBlur={() => setRenderTrigger(prev => prev + 1)}
                          className={`w-full font-semibold text-xs px-3 py-1.5 rounded-lg border bg-white focus:border-slate-900 outline-none text-slate-800 ${ROLE_COLORS[emp.role]}`}
                        >
                          {Object.entries(ROLE_LABELS).map(([k, l]) => (
                            <option key={k} value={k}>
                              {l}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <button
                          onClick={() => {
                            if (confirm(`Tem a certeza que deseja remover "${emp.name}" da lista da unidade?`)) {
                              setEmployees(prev => prev.filter(ev => ev.id !== emp.id));
                            }
                          }}
                          className="text-slate-300 group-hover:text-slate-400 hover:!text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition-all"
                          title="Remover Colaborador"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {sortedEmployeeIds.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-10 text-center font-medium text-slate-400">
                      Nenhum colaborador corresponde aos filtros selecionados.
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
