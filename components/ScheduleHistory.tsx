
import React, { useState, useMemo } from 'react';
import { DailySchedule, ShiftType, Employee } from '../types';
import { AVAILABLE_SHIFTS } from '../constants';
import { Calendar, Search, Lock, User, Filter, Eye, Trash2, History, CheckCircle2 } from 'lucide-react';

interface ScheduleHistoryProps {
  schedules: DailySchedule[];
  onLoadSchedule: (date: string, shift?: ShiftType) => void;
  onDeleteSchedule: (date: string) => void;
  employees: Employee[];
}

export const ScheduleHistory: React.FC<ScheduleHistoryProps> = ({ schedules, onLoadSchedule, onDeleteSchedule, employees }) => {
  const [filterDate, setFilterDate] = useState('');
  const [filterShift, setFilterShift] = useState<ShiftType | 'ALL'>('ALL');

  const today = new Date().toISOString().split('T')[0];

  // Helper to get manager name
  const getManagerName = (id?: string) => {
    if (!id) return '-';
    return employees.find(e => e.id === id)?.name || 'Desconhecido';
  };

  // Helper to count staff per shift
  const getStaffCount = (schedule: DailySchedule, shift: ShiftType) => {
      const shiftData = schedule.shifts[shift];
      if (!shiftData) return 0;
      const uniqueIds = new Set(Object.values(shiftData).flat());
      return uniqueIds.size;
  };

  // Logic to flatten schedules into shift rows as requested
  const flattenedHistory = useMemo(() => {
    const result: any[] = [];

    // Filtered schedules base
    const baseSchedules = schedules.filter(schedule => {
      if (filterDate && schedule.date !== filterDate) return false;
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    baseSchedules.forEach(sched => {
      AVAILABLE_SHIFTS.forEach(shift => {
        // Filter by shift if selected
        if (filterShift !== 'ALL' && shift.id !== filterShift) return;

        // Determine if shift has data or is locked
        const hasAssignments = sched.shifts[shift.id] && Object.keys(sched.shifts[shift.id] || {}).length > 0;
        const isLocked = (sched.lockedShifts || []).includes(shift.id);

        // We only show shifts that have been interacted with
        if (hasAssignments || isLocked) {
          result.push({
            date: sched.date,
            shiftId: shift.id,
            shiftLabel: shift.label,
            manager: sched.shiftManagers?.[shift.id],
            isLocked: isLocked,
            staffCount: getStaffCount(sched, shift.id),
            rawSchedule: sched
          });
        }
      });
    });

    return result;
  }, [schedules, filterDate, filterShift]);

  return (
    <div className="space-y-6 animate-fade-in h-full flex flex-col">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <History className="text-blue-600" />
              Histórico de Turnos
            </h2>
            <p className="text-sm text-gray-500">Consulta os registos de posicionamento (um registo por turno).</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                 <Filter className="absolute left-3 top-2.5 text-gray-400" size={16} />
                 <select 
                    value={filterShift}
                    onChange={(e) => setFilterShift(e.target.value as any)}
                    className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                 >
                    <option value="ALL">Todos os Turnos</option>
                    {AVAILABLE_SHIFTS.map(s => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                 </select>
              </div>

              <div className="relative">
                  <input 
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="py-2 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {filterDate && (
                      <button 
                        onClick={() => setFilterDate('')}
                        className="absolute right-2 top-2 text-gray-400 hover:text-red-500"
                      >
                          &times;
                      </button>
                  )}
              </div>
          </div>
       </div>

       <div className="flex-1 overflow-auto bg-white rounded-xl shadow border border-gray-200">
          <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 font-semibold uppercase text-xs sticky top-0 z-10 shadow-sm">
                  <tr>
                      <th className="px-6 py-4">Data</th>
                      <th className="px-6 py-4">Turno</th>
                      <th className="px-6 py-4 text-center">Estado</th>
                      <th className="px-6 py-4">Gerente de Turno</th>
                      <th className="px-6 py-4 text-center">Staff</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                  {flattenedHistory.map((entry, idx) => {
                      const isExpired = entry.date < today;
                      
                      return (
                        <tr key={`${entry.date}-${entry.shiftId}-${idx}`} className="hover:bg-blue-50/50 transition-colors group">
                            <td className="px-6 py-4 font-medium text-gray-900">
                                {new Date(entry.date).toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="px-6 py-4">
                                <span className="font-bold text-gray-700 uppercase tracking-tight">{entry.shiftLabel}</span>
                            </td>
                            <td className="px-6 py-4 text-center">
                                {entry.isLocked ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
                                        <CheckCircle2 size={10} /> Finalizado
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200 uppercase">
                                        Rascunho
                                    </span>
                                )}
                                {isExpired && !entry.isLocked && (
                                    <span className="ml-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gray-100 text-gray-600 border border-gray-200 uppercase">
                                        Expirado
                                    </span>
                                )}
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                    <User size={14} className="text-slate-400" />
                                    <span className="text-gray-700">{getManagerName(entry.manager)}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                                <span className="font-bold text-gray-900">{entry.staffCount}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                    <button 
                                        onClick={() => onLoadSchedule(entry.date, entry.shiftId)}
                                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-bold hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors text-xs uppercase"
                                    >
                                        <Eye size={16} /> Consultar
                                    </button>
                                    <button 
                                        onClick={() => onDeleteSchedule(entry.date)}
                                        className="inline-flex items-center gap-2 text-gray-400 hover:text-red-600 font-medium hover:bg-red-50 px-2 py-1.5 rounded-lg transition-colors"
                                        title="Eliminar Dia Inteiro"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                      );
                  })}

                  {flattenedHistory.length === 0 && (
                      <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                              <Search size={32} className="mx-auto mb-2 opacity-20" />
                              <p>Nenhum histórico encontrado para os filtros selecionados.</p>
                          </td>
                      </tr>
                  )}
              </tbody>
          </table>
       </div>
    </div>
  );
};
