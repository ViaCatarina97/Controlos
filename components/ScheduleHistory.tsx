
import React, { useState, useMemo } from 'react';
import { DailySchedule, ShiftType, Employee } from '../types';
import { AVAILABLE_SHIFTS } from '../constants';
import { Calendar, Search, Lock, Unlock, User, Filter, Eye, Trash2, History, CheckCircle2 } from 'lucide-react';

interface ScheduleHistoryProps {
  schedules: DailySchedule[];
  onLoadSchedule: (date: string) => void;
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

  // Filter Logic
  const filteredSchedules = useMemo(() => {
    return schedules.filter(schedule => {
      // Date Filter
      if (filterDate && schedule.date !== filterDate) return false;
      
      // Shift Filter (Check if the schedule has data for the selected shift)
      if (filterShift !== 'ALL') {
         const hasDataForShift = schedule.shifts[filterShift] && Object.keys(schedule.shifts[filterShift] || {}).length > 0;
         if (!hasDataForShift) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort Descending
  }, [schedules, filterDate, filterShift]);

  // Helper to count staff per shift
  const getStaffCount = (schedule: DailySchedule, shift: ShiftType) => {
      const shiftData = schedule.shifts[shift];
      if (!shiftData) return 0;
      const uniqueIds = new Set(Object.values(shiftData).flat());
      return uniqueIds.size;
  };

  return (
    <div className="space-y-6 animate-fade-in h-full flex flex-col">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <History className="text-blue-600" />
              Histórico de Turnos
            </h2>
            <p className="text-sm text-gray-500">Consulte os posicionamentos finalizados anteriormente.</p>
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
                      <th className="px-6 py-4">Turnos Finalizados</th>
                      <th className="px-6 py-4">Resumo de Turnos (Gerente / Staff)</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                  {filteredSchedules.map((schedule) => {
                      const isExpired = schedule.date < today;
                      const lockedShifts = schedule.lockedShifts || [];

                      return (
                        <tr key={schedule.date} className="hover:bg-blue-50/50 transition-colors group">
                            <td className="px-6 py-4 font-medium text-gray-900">
                                {new Date(schedule.date).toLocaleDateString('pt-PT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex flex-wrap gap-1">
                                    {isExpired ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                            <Lock size={12} /> Dia Expirado
                                        </span>
                                    ) : lockedShifts.length > 0 ? (
                                        lockedShifts.map(ls => (
                                            <span key={ls} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                <CheckCircle2 size={10} /> {ls}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-gray-400 italic text-xs">Sem turnos finalizados</span>
                                    )}
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex flex-wrap gap-2">
                                    {AVAILABLE_SHIFTS.map(shift => {
                                        const staffCount = getStaffCount(schedule, shift.id);
                                        if (staffCount === 0) return null; // Don't show empty shifts
                                        
                                        return (
                                            <div key={shift.id} className="flex flex-col bg-gray-50 border border-gray-200 rounded p-2 min-w-[120px]">
                                                <span className="text-[10px] uppercase font-bold text-gray-400 mb-1">{shift.label}</span>
                                                <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1">
                                                    <User size={12} className="text-blue-500"/>
                                                    <span className="truncate max-w-[100px]">{getManagerName(schedule.shiftManagers?.[shift.id])}</span>
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {staffCount} pessoas
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {/* If no shifts have data */}
                                    {Object.keys(schedule.shifts).length === 0 && (
                                        <span className="text-gray-400 italic">Sem dados registados</span>
                                    )}
                                </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                    <button 
                                        onClick={() => onLoadSchedule(schedule.date)}
                                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                                        title="Ver Posicionamento"
                                    >
                                        <Eye size={16} /> {isExpired ? 'Consultar' : 'Ver/Editar'}
                                    </button>
                                    <button 
                                        onClick={() => onDeleteSchedule(schedule.date)}
                                        className="inline-flex items-center gap-2 text-gray-400 hover:text-red-600 font-medium hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                                        title="Eliminar Registo"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                      );
                  })}

                  {filteredSchedules.length === 0 && (
                      <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
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
