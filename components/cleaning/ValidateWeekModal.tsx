import React, { useState } from 'react';
import { X, ShieldCheck, AlertTriangle, UserCheck } from 'lucide-react';
import { Employee, CleaningPlanWeek } from '../../types';

interface ValidateWeekModalProps {
  isOpen: boolean;
  currentWeek: CleaningPlanWeek;
  employees: Employee[];
  completionStats: {
    totalWeekly: number;
    completedWeekly: number;
    justifiedWeekly: number;
    pendingWeekly: number;
    rate: number;
  };
  onClose: () => void;
  onConfirmValidation: (validatorName: string, role: string, notes?: string) => void;
}

export const ValidateWeekModal: React.FC<ValidateWeekModalProps> = ({
  isOpen,
  currentWeek,
  employees,
  completionStats,
  onClose,
  onConfirmValidation
}) => {
  // Filter eligible managers: Gerente de Restaurante or Gerente (including Sub-gerentes)
  const eligibleManagers = employees.filter(
    e => e.isActive && (e.role === 'GERENTE_RESTAURANTE' || e.role === 'GERENTE')
  );

  const [selectedManagerId, setSelectedManagerId] = useState(eligibleManagers[0]?.id || '');
  const [customName, setCustomName] = useState('');
  const [selectedRole, setSelectedRole] = useState<'GERENTE_RESTAURANTE' | 'SUB_GERENTE' | 'GERENTE'>('GERENTE_RESTAURANTE');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let validatorName = '';
    if (selectedManagerId) {
      const found = employees.find(e => e.id === selectedManagerId);
      if (found) validatorName = found.name;
    } else if (customName.trim()) {
      validatorName = customName.trim();
    }

    if (!validatorName) {
      setError('Por favor selecione ou indique o nome do Gerente/Sub Gerente.');
      return;
    }

    const roleLabel = selectedRole === 'GERENTE_RESTAURANTE' ? 'Gerente de Restaurante' :
      selectedRole === 'SUB_GERENTE' ? 'Sub Gerente' : 'Gerente';

    onConfirmValidation(validatorName, roleLabel, notes.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-emerald-700 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ShieldCheck size={24} className="text-emerald-200" />
            <div>
              <h3 className="font-bold text-base tracking-tight">Validar e Encerrar Semana</h3>
              <p className="text-xs text-emerald-100">
                Semana {currentWeek.weekNumber} ({currentWeek.weekStartDate} a {currentWeek.weekEndDate})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-emerald-800 rounded-lg transition-colors text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Completion Summary Card */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                Desempenho da Semana
              </span>
              <span className="text-sm font-black text-emerald-700">
                {completionStats.rate}% Concluído
              </span>
            </div>
            
            <div className="w-full bg-emerald-200 h-2 rounded-full overflow-hidden mb-3">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${completionStats.rate}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-white p-2 rounded-lg border border-emerald-100">
                <span className="text-emerald-700 font-bold block">{completionStats.completedWeekly}</span>
                <span className="text-gray-500 text-[10px]">Realizadas</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-emerald-100">
                <span className="text-amber-600 font-bold block">{completionStats.justifiedWeekly}</span>
                <span className="text-gray-500 text-[10px]">Justificadas</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-emerald-100">
                <span className="text-red-500 font-bold block">{completionStats.pendingWeekly}</span>
                <span className="text-gray-500 text-[10px]">Pendentes</span>
              </div>
            </div>

            {completionStats.pendingWeekly > 0 && (
              <div className="mt-3 flex items-start gap-1.5 text-amber-800 text-xs bg-amber-50 p-2 rounded-lg border border-amber-200">
                <AlertTriangle size={16} className="shrink-0 text-amber-600 mt-0.5" />
                <span>
                  Atenção: Existem <strong>{completionStats.pendingWeekly} tarefas pendentes</strong> sem realização ou justificação. Ao validar, a folha será arquivada no histórico.
                </span>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Responsável pela Validação (Gerente / Sub Gerente) <span className="text-red-500">*</span>
              </label>

              {eligibleManagers.length > 0 ? (
                <div className="space-y-2">
                  <select
                    value={selectedManagerId}
                    onChange={(e) => {
                      setSelectedManagerId(e.target.value);
                      if (error) setError('');
                    }}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  >
                    <option value="">-- Selecione o Gerente --</option>
                    {eligibleManagers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.role === 'GERENTE_RESTAURANTE' ? 'Gerente de Restaurante' : 'Gerente'})
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">ou introduza outro nome:</span>
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => {
                        setCustomName(e.target.value);
                        if (e.target.value) setSelectedManagerId('');
                        if (error) setError('');
                      }}
                      placeholder="Nome do Sub Gerente..."
                      className="flex-1 p-2 text-xs border border-gray-200 rounded-lg outline-hidden focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              ) : (
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => {
                    setCustomName(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Nome do Gerente de Restaurante ou Sub Gerente..."
                  className="w-full p-2.5 text-sm border border-gray-300 rounded-xl outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              )}
              {error && <p className="text-xs text-red-600 mt-1 font-medium">{error}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Cargo do Validador
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'GERENTE_RESTAURANTE', label: 'Gerente Restaurante' },
                  { key: 'SUB_GERENTE', label: 'Sub Gerente' },
                  { key: 'GERENTE', label: 'Gerente Turno' }
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setSelectedRole(item.key as any)}
                    className={`py-2 px-1 text-xs font-bold rounded-xl border text-center transition-all ${
                      selectedRole === item.key
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Observações de Encerramento (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Ex: Semana concluída com conformidade de 95%, auditoria interna efetuada..."
                className="w-full p-2.5 text-sm border border-gray-300 rounded-xl outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-colors"
              >
                <UserCheck size={16} />
                <span>Validar e Encerrar Folha</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
