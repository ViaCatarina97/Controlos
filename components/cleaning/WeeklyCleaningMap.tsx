import React, { useState } from 'react';
import { 
  Check, X, AlertCircle, Clock, User, MessageSquare, Filter, 
  Search, CheckCircle2, ChevronDown, Sparkles, Camera, Image as ImageIcon 
} from 'lucide-react';
import { 
  CleaningPlanWeek, CleaningTaskItem, CleaningDayOfWeek, CleaningShift, 
  Employee, CleaningTaskStatus 
} from '../../types';
import { CLEANING_DAYS, CLEANING_SHIFTS, getDatesForWeek } from './cleaningDefaults';

interface WeeklyCleaningMapProps {
  currentWeek: CleaningPlanWeek;
  weeklyTasks: CleaningTaskItem[];
  areas: string[];
  employees: Employee[];
  readOnly?: boolean;
  filterManager: string;
  filterDay: string;
  filterArea: string;
  searchTask: string;
  onUpdateShiftManager: (day: CleaningDayOfWeek, shift: CleaningShift, managerName: string) => void;
  onOpenEvidenceModal: (task: CleaningTaskItem, day: CleaningDayOfWeek, shift: CleaningShift) => void;
  onOpenJustification: (task: CleaningTaskItem, currentStatus?: CleaningTaskStatus) => void;
}

export const WeeklyCleaningMap: React.FC<WeeklyCleaningMapProps> = ({
  currentWeek,
  weeklyTasks,
  areas,
  employees,
  readOnly = false,
  filterManager,
  filterDay,
  filterArea,
  searchTask,
  onUpdateShiftManager,
  onOpenEvidenceModal,
  onOpenJustification
}) => {
  const dates = getDatesForWeek(currentWeek.weekStartDate);

  // Active day selection for mobile / tab view (or show all)
  const [selectedDayTab, setSelectedDayTab] = useState<CleaningDayOfWeek | 'all'>('all');

  // Filter managers list face ao cargo (GERENTE_RESTAURANTE and GERENTE)
  const managerEmployees = employees.filter(
    e => e.isActive && (e.role === 'GERENTE_RESTAURANTE' || e.role === 'GERENTE')
  );

  // Days to display based on tab filter & global filterDay
  const activeDays = CLEANING_DAYS.filter(d => {
    if (filterDay !== 'all' && d.key !== filterDay) return false;
    if (selectedDayTab !== 'all' && d.key !== selectedDayTab) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Quick Day Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 print:hidden scrollbar-thin">
        <button
          onClick={() => setSelectedDayTab('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            selectedDayTab === 'all'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          Semana Completa (Todos os Dias)
        </button>
        {CLEANING_DAYS.map(day => {
          const isSelected = selectedDayTab === day.key;
          const dayDate = dates[day.key]?.displayStr;

          // Count completed for this day
          const dayTasks = weeklyTasks.filter(t => t.day === day.key);
          const completedCount = dayTasks.filter(t => currentWeek.taskStatuses[t.id]?.completed).length;

          return (
            <button
              key={day.key}
              onClick={() => setSelectedDayTab(day.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <span>{day.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                isSelected ? 'bg-teal-800 text-teal-100' : 'bg-gray-100 text-gray-500'
              }`}>
                {completedCount}/{dayTasks.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid of Days */}
      <div className="space-y-8">
        {activeDays.map(day => {
          const dayDate = dates[day.key];

          // Filter tasks for this day
          const dayTasks = weeklyTasks.filter(t => t.day === day.key);

          return (
            <div
              key={day.key}
              className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden transition-all hover:shadow-md"
            >
              {/* Day Header */}
              <div className="bg-slate-900 text-white px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center font-black text-sm text-white">
                    {day.shortLabel.substring(0, 2)}
                  </div>
                  <div>
                    <h3 className="font-bold text-base tracking-tight">{day.label}</h3>
                    <p className="text-xs text-slate-400 font-medium">Data: {dayDate?.displayStr}</p>
                  </div>
                </div>

                {/* Day summary stats */}
                <div className="flex items-center gap-2 text-xs">
                  {CLEANING_SHIFTS.map(s => {
                    const shiftTasks = dayTasks.filter(t => t.shift === s.key);
                    const doneCount = shiftTasks.filter(t => currentWeek.taskStatuses[t.id]?.completed).length;
                    const shiftMgr = currentWeek.shiftManagers[day.key]?.[s.key] || 'Não atribuído';

                    return (
                      <div
                        key={s.key}
                        className="hidden sm:flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700"
                        title={`Turno ${s.label}: ${shiftMgr}`}
                      >
                        <span className="text-slate-400 font-semibold">{s.label}:</span>
                        <span className="font-bold text-teal-400">{doneCount}/{shiftTasks.length}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Shifts Columns */}
              <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {CLEANING_SHIFTS.map(shift => {
                  const shiftTasks = dayTasks.filter(t => t.shift === shift.key);
                  const shiftManager = currentWeek.shiftManagers[day.key]?.[shift.key] || '';

                  // Apply search & area & manager filters
                  const filteredShiftTasks = shiftTasks.filter(task => {
                    if (filterArea !== 'all' && task.area !== filterArea) return false;
                    if (searchTask.trim() && !task.tarefa.toLowerCase().includes(searchTask.toLowerCase()) && !task.area.toLowerCase().includes(searchTask.toLowerCase())) {
                      return false;
                    }
                    if (filterManager !== 'all') {
                      const assignedMgr = currentWeek.shiftManagers[day.key]?.[shift.key] || '';
                      if (assignedMgr !== filterManager) return false;
                    }
                    return true;
                  });

                  const totalCount = shiftTasks.length;
                  const completedCount = shiftTasks.filter(t => currentWeek.taskStatuses[t.id]?.completed).length;
                  const justifiedCount = shiftTasks.filter(t => !currentWeek.taskStatuses[t.id]?.completed && currentWeek.taskStatuses[t.id]?.justification).length;

                  return (
                    <div
                      key={shift.key}
                      className="bg-gray-50/70 border border-gray-200 rounded-xl flex flex-col h-full"
                    >
                      {/* Shift Header & Manager Selector */}
                      <div className="p-3.5 bg-gray-100/80 border-b border-gray-200 rounded-t-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs uppercase tracking-wider text-gray-800">
                              Turno: {shift.label}
                            </span>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                            completedCount === totalCount && totalCount > 0
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-white text-gray-700 border border-gray-200'
                          }`}>
                            {completedCount}/{totalCount}
                          </span>
                        </div>

                        {/* GERENTE DE TURNO IDENTIFIER */}
                        <div className="bg-white p-2 rounded-lg border border-gray-200/80">
                          <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1">
                            <User size={12} className="text-teal-600" />
                            <span>Gerente de Turno</span>
                          </label>
                          {readOnly ? (
                            <p className="text-xs font-bold text-gray-800">
                              {shiftManager || <span className="text-gray-400 italic">Não identificado</span>}
                            </p>
                          ) : (
                            <select
                              value={shiftManager}
                              onChange={(e) => onUpdateShiftManager(day.key, shift.key, e.target.value)}
                              className="w-full p-1.5 bg-gray-50 hover:bg-white border border-gray-300 focus:border-teal-500 rounded-md text-xs font-semibold text-gray-800 outline-hidden transition-colors"
                            >
                              <option value="">-- Selecionar Gerente --</option>
                              {managerEmployees.map(emp => (
                                <option key={emp.id} value={emp.name}>
                                  {emp.name} ({emp.role === 'GERENTE_RESTAURANTE' ? 'GR' : 'G'})
                                </option>
                              ))}
                              {/* Option for custom name if not in list */}
                              {shiftManager && !managerEmployees.some(e => e.name === shiftManager) && (
                                <option value={shiftManager}>{shiftManager}</option>
                              )}
                            </select>
                          )}
                        </div>
                      </div>

                      {/* Tasks List */}
                      <div className="p-3 flex-1 divide-y divide-gray-100 overflow-y-auto max-h-96">
                        {filteredShiftTasks.length === 0 ? (
                          <div className="py-6 text-center text-xs text-gray-400">
                            Nenhuma tarefa encontrada com os filtros atuais.
                          </div>
                        ) : (
                          filteredShiftTasks.map(task => {
                            const status = currentWeek.taskStatuses[task.id];
                            const isCompleted = status?.completed;
                            const hasJustification = !isCompleted && Boolean(status?.justification);

                            return (
                              <div
                                key={task.id}
                                className={`py-2.5 px-2 rounded-lg transition-colors flex items-start gap-2.5 ${
                                  isCompleted
                                    ? 'bg-emerald-50/50 hover:bg-emerald-50'
                                    : hasJustification
                                    ? 'bg-amber-50/50 hover:bg-amber-50'
                                    : 'hover:bg-white'
                                }`}
                              >
                                {/* Checkbox / Evidence trigger */}
                                <button
                                  type="button"
                                  disabled={readOnly}
                                  onClick={() => onOpenEvidenceModal(task, day.key, shift.key)}
                                  className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center transition-all shrink-0 border ${
                                    isCompleted
                                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs hover:bg-emerald-700'
                                      : hasJustification
                                      ? 'bg-amber-100 border-amber-400 text-amber-700 hover:bg-amber-200'
                                      : 'border-gray-300 bg-white hover:border-teal-500 hover:bg-teal-50'
                                  } ${readOnly ? 'cursor-default' : 'cursor-pointer active:scale-95'}`}
                                  title={
                                    isCompleted 
                                      ? 'Ver evidências fotográficas da limpeza' 
                                      : 'Marcar como visto (abrir câmara para foto de evidência)'
                                  }
                                >
                                  {isCompleted ? <Check size={14} strokeWidth={3} /> : hasJustification ? <AlertCircle size={13} /> : null}
                                </button>

                                {/* Task Details */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className={`text-xs font-bold leading-tight ${
                                      isCompleted ? 'text-gray-800 line-through decoration-emerald-500/60' : 'text-gray-900'
                                    }`}>
                                      {task.tarefa}
                                    </span>
                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-gray-200/80 text-gray-700 shrink-0">
                                      {task.area}
                                    </span>
                                  </div>

                                  {/* Meta & Status tags */}
                                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                                    {isCompleted && (
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="text-emerald-700 font-semibold flex items-center gap-1 text-[10px] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80">
                                          <CheckCircle2 size={11} />
                                          <span>Concluída {status?.completedBy ? `por ${status.completedBy}` : ''}</span>
                                        </span>

                                        {/* Photos evidence button */}
                                        <button
                                          type="button"
                                          onClick={() => onOpenEvidenceModal(task, day.key, shift.key)}
                                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-100/90 hover:bg-teal-200 text-teal-900 font-bold text-[10px] transition-colors shadow-2xs"
                                          title="Ver evidências fotográficas capturadas"
                                        >
                                          <Camera size={11} className="text-teal-700" />
                                          <span>{status?.photos?.length || 1} Evidência(s)</span>
                                        </button>
                                      </div>
                                    )}


                                    {hasJustification && (
                                      <div className="w-full mt-1 p-1.5 bg-amber-100/80 border border-amber-200 rounded-md text-[11px] text-amber-900 flex items-start gap-1">
                                        <AlertCircle size={12} className="shrink-0 text-amber-600 mt-0.5" />
                                        <div className="flex-1 truncate">
                                          <span className="font-bold">Não Realizada: </span>
                                          <span>{status?.justification}</span>
                                        </div>
                                      </div>
                                    )}

                                    {/* Action button to Justify if not done */}
                                    {!readOnly && !isCompleted && (
                                      <button
                                        type="button"
                                        onClick={() => onOpenJustification(task, status)}
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors ${
                                          hasJustification
                                            ? 'bg-amber-200 text-amber-900 hover:bg-amber-300'
                                            : 'bg-gray-200/60 hover:bg-amber-100 text-gray-600 hover:text-amber-800'
                                        }`}
                                      >
                                        <MessageSquare size={11} />
                                        <span>{hasJustification ? 'Editar Justificação' : 'Justificar Falta'}</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
