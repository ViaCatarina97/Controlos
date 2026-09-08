import React from 'react';
import { Check, CheckCircle2, User, MessageSquare, AlertCircle, Camera } from 'lucide-react';
import { CleaningPlanWeek, CleaningTaskItem, Employee, ZeladorTaskStatus } from '../../types';
import { CLEANING_DAYS, getDatesForWeek } from './cleaningDefaults';

interface ZeladorCleaningMapProps {
  currentWeek: CleaningPlanWeek;
  zeladorTasks: CleaningTaskItem[];
  employees: Employee[];
  readOnly?: boolean;
  filterDay: string;
  filterArea: string;
  searchTask: string;
  onToggleZeladorTask: (taskId: string) => void;
  onOpenEvidenceModal: (task: CleaningTaskItem) => void;
  onUpdateZeladorStatus: (taskId: string, patch: Partial<ZeladorTaskStatus>) => void;
}

export const ZeladorCleaningMap: React.FC<ZeladorCleaningMapProps> = ({
  currentWeek,
  zeladorTasks,
  employees,
  readOnly = false,
  filterDay,
  filterArea,
  searchTask,
  onToggleZeladorTask,
  onOpenEvidenceModal,
  onUpdateZeladorStatus
}) => {
  const dates = getDatesForWeek(currentWeek.weekStartDate);

  // Active days
  const activeDays = CLEANING_DAYS.filter(d => {
    if (filterDay !== 'all' && d.key !== filterDay) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Information Header Banner */}
      <div className="bg-indigo-900 text-white p-5 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold tracking-tight">Mapa de Limpezas do Zelador</h3>
          <p className="text-xs text-indigo-200 mt-0.5">
            Tarefas de manutenção profunda e higienização técnica semanal
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-indigo-800/80 px-3 py-1.5 rounded-xl border border-indigo-700/60 text-xs">
            <span className="text-indigo-300 font-medium">Responsável Padrão: </span>
            <span className="font-bold text-white">Gilberto Soutelo (ou selecionável)</span>
          </div>
        </div>
      </div>

      {/* Days Table */}
      <div className="space-y-6">
        {activeDays.map(day => {
          const dayDate = dates[day.key];
          const tasksForDay = zeladorTasks.filter(t => t.day === day.key);

          // Apply filters
          const filteredTasks = tasksForDay.filter(t => {
            if (filterArea !== 'all' && t.area !== filterArea) return false;
            if (searchTask.trim() && !t.tarefa.toLowerCase().includes(searchTask.toLowerCase()) && !t.area.toLowerCase().includes(searchTask.toLowerCase())) {
              return false;
            }
            return true;
          });

          const completedCount = tasksForDay.filter(t => currentWeek.zeladorStatuses[t.id]?.completed).length;

          if (tasksForDay.length === 0 && filterDay === 'all') return null;

          return (
            <div
              key={day.key}
              className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden"
            >
              {/* Day Header */}
              <div className="bg-gray-100/90 px-6 py-3 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-gray-800">{day.label}</span>
                  <span className="text-xs text-gray-500 font-medium">({dayDate?.displayStr})</span>
                </div>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                  completedCount === tasksForDay.length && tasksForDay.length > 0
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-white text-gray-700 border border-gray-200'
                }`}>
                  {completedCount}/{tasksForDay.length} Concluídas
                </span>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-600 font-bold uppercase tracking-wider border-b border-gray-200">
                    <tr>
                      <th className="p-3 w-12 text-center">[✓]</th>
                      <th className="p-3">Tarefa</th>
                      <th className="p-3 w-36">Área</th>
                      <th className="p-3 w-48">Funcionário</th>
                      <th className="p-3">Comentário / Observação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredTasks.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-gray-400">
                          Nenhuma tarefa de zelador para este dia com os filtros aplicados.
                        </td>
                      </tr>
                    ) : (
                      filteredTasks.map(task => {
                        const status = currentWeek.zeladorStatuses[task.id] || { completed: false };
                        const isCompleted = status.completed;

                        return (
                          <tr
                            key={task.id}
                            className={`transition-colors ${
                              isCompleted ? 'bg-emerald-50/40 hover:bg-emerald-50/60' : 'hover:bg-gray-50/70'
                            }`}
                          >
                            {/* Checkbox */}
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                disabled={readOnly}
                                onClick={() => onOpenEvidenceModal(task)}
                                className={`w-5 h-5 rounded-md mx-auto flex items-center justify-center transition-all border ${
                                  isCompleted
                                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs hover:bg-emerald-700'
                                    : 'border-gray-300 bg-white hover:border-indigo-500 hover:bg-indigo-50'
                                } ${readOnly ? 'cursor-default' : 'cursor-pointer active:scale-95'}`}
                                title={isCompleted ? 'Ver evidências fotográficas' : 'Marcar como visto (abrir câmara para foto de evidência)'}
                              >
                                {isCompleted && <Check size={14} strokeWidth={3} />}
                              </button>
                            </td>

                            {/* Tarefa */}
                            <td className="p-3">
                              <div className="flex flex-col gap-1">
                                <span className={`font-bold text-xs ${
                                  isCompleted ? 'text-gray-800 line-through decoration-emerald-600/50' : 'text-gray-900'
                                }`}>
                                  {task.tarefa}
                                </span>
                                {isCompleted && (
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => onOpenEvidenceModal(task)}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-100 hover:bg-teal-200 text-teal-900 font-bold text-[10px] transition-colors w-fit"
                                    >
                                      <Camera size={10} />
                                      <span>{status.photos?.length || 1} Evidência(s)</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Área */}
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-md font-semibold text-[11px] bg-gray-100 text-gray-700">
                                {task.area}
                              </span>
                            </td>

                            {/* Funcionário */}
                            <td className="p-3">
                              {readOnly ? (
                                <span className="font-semibold text-gray-800">
                                  {status.funcionario || 'Gilberto Soutelo'}
                                </span>
                              ) : (
                                <input
                                  type="text"
                                  value={status.funcionario !== undefined ? status.funcionario : 'Gilberto Soutelo'}
                                  onChange={(e) => onUpdateZeladorStatus(task.id, { funcionario: e.target.value })}
                                  placeholder="Funcionário responsável..."
                                  className="w-full p-1.5 bg-white border border-gray-200 focus:border-indigo-500 rounded-md text-xs font-medium outline-hidden"
                                />
                              )}
                            </td>

                            {/* Comentário */}
                            <td className="p-3">
                              {readOnly ? (
                                <span className="text-gray-700">{status.comentario || '—'}</span>
                              ) : (
                                <input
                                  type="text"
                                  value={status.comentario || ''}
                                  onChange={(e) => onUpdateZeladorStatus(task.id, { comentario: e.target.value })}
                                  placeholder="Observações ou motivo se pendente..."
                                  className="w-full p-1.5 bg-white border border-gray-200 focus:border-indigo-500 rounded-md text-xs outline-hidden"
                                />
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
