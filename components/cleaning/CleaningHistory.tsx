import React, { useState } from 'react';
import { 
  History, Calendar, ShieldCheck, CheckCircle2, AlertCircle, 
  ExternalLink, Search, ArrowRight, Lock, Unlock, Filter 
} from 'lucide-react';
import { CleaningPlanWeek, CleaningTaskItem } from '../../types';

interface CleaningHistoryProps {
  plans: CleaningPlanWeek[];
  weeklyTasks: CleaningTaskItem[];
  currentWeekId: string;
  onSelectWeek: (weekStartDate: string) => void;
  onReopenWeek?: (planId: string) => void;
}

export const CleaningHistory: React.FC<CleaningHistoryProps> = ({
  plans,
  weeklyTasks,
  currentWeekId,
  onSelectWeek,
  onReopenWeek
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'validada' | 'aberta'>('all');

  // Filter plans
  const filteredPlans = plans.filter(p => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchVal = (p.validatedBy || '').toLowerCase().includes(q);
      const matchDates = `${p.weekStartDate} ${p.weekEndDate} semana ${p.weekNumber}`.toLowerCase().includes(q);
      if (!matchVal && !matchDates) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-base text-gray-900 tracking-tight">Histórico de Folhas de Limpeza</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Arquivo de semanas anteriores com registo de validação por gerentes
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar semana ou validador..."
              className="pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 outline-hidden w-64"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="p-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-hidden"
          >
            <option value="all">Todos os Estados</option>
            <option value="validada">Validadas / Encerradas</option>
            <option value="aberta">Abertas (Em curso)</option>
          </select>
        </div>
      </div>

      {/* Grid of Weeks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredPlans.length === 0 ? (
          <div className="col-span-full py-16 text-center text-gray-400 bg-white rounded-2xl border border-gray-200">
            Nenhuma folha semanal encontrada no histórico.
          </div>
        ) : (
          filteredPlans.map(plan => {
            const isCurrent = plan.id === currentWeekId;
            const isValidated = plan.status === 'validada' || plan.status === 'encerrada';

            // Calculate completion rate
            const tasksCount = weeklyTasks.length;
            const completedCount = weeklyTasks.filter(t => plan.taskStatuses?.[t.id]?.completed).length;
            const justifiedCount = weeklyTasks.filter(
              t => !plan.taskStatuses?.[t.id]?.completed && plan.taskStatuses?.[t.id]?.justification
            ).length;
            const rate = tasksCount > 0 ? Math.round((completedCount / tasksCount) * 100) : 0;

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl p-5 border transition-all flex flex-col justify-between shadow-xs hover:shadow-md ${
                  isCurrent ? 'border-teal-500 ring-2 ring-teal-100' : 'border-gray-200'
                }`}
              >
                <div>
                  {/* Top Badge */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
                      <Calendar size={14} className="text-teal-600" />
                      <span>Semana {plan.weekNumber} ({plan.year})</span>
                    </span>

                    {isValidated ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <ShieldCheck size={12} />
                        <span>Validada</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                        <AlertCircle size={12} />
                        <span>Em Aberto</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-bold text-gray-600 mb-4">
                    {plan.weekStartDate} até {plan.weekEndDate}
                  </p>

                  {/* Progress Bar */}
                  <div className="space-y-1.5 mb-4">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-gray-500">Conformidade:</span>
                      <span className="text-gray-900">{rate}%</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          rate >= 80 ? 'bg-emerald-500' : rate >= 60 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500 pt-0.5">
                      <span>{completedCount} realizadas</span>
                      <span>{justifiedCount} justificadas</span>
                    </div>
                  </div>

                  {/* Validation Info */}
                  {isValidated && (
                    <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl space-y-1 text-xs mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-emerald-800">Validado por</span>
                        <span className="text-[10px] text-emerald-700">
                          {plan.validatedAt ? new Date(plan.validatedAt).toLocaleDateString() : ''}
                        </span>
                      </div>
                      <p className="font-bold text-gray-900">{plan.validatedBy}</p>
                      {plan.validatedByRole && (
                        <p className="text-[11px] text-gray-600 font-medium">{plan.validatedByRole}</p>
                      )}
                      {plan.validationNotes && (
                        <p className="text-[11px] text-emerald-900 italic mt-1 border-t border-emerald-200/50 pt-1">
                          "{plan.validationNotes}"
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onSelectWeek(plan.weekStartDate)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
                  >
                    <span>Abrir Folha</span>
                    <ArrowRight size={14} />
                  </button>

                  {isValidated && onReopenWeek && (
                    <button
                      onClick={() => onReopenWeek(plan.id)}
                      className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors border border-gray-200"
                      title="Reabrir semana para edição"
                    >
                      <Unlock size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
