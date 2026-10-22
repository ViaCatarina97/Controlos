import React, { useState, useMemo } from 'react';
import { DailySchedule, ShiftType, Employee } from '../types';
import { AVAILABLE_SHIFTS } from '../constants';
import { Search, User, Filter, Eye, Trash2, History, CheckCircle2, Clock } from 'lucide-react';

interface ScheduleHistoryProps {
  schedules: DailySchedule[];
  onLoadSchedule: (date: string, shift?: ShiftType) => void;
  onDeleteSchedule: (date: string) => void;
  employees: Employee[];
}

export const ScheduleHistory: React.FC<ScheduleHistoryProps> = ({
  schedules,
  onLoadSchedule,
  onDeleteSchedule,
  employees,
}) => {
  const [filterDate, setFilterDate] = useState('');
  const [filterShift, setFilterShift] = useState<ShiftType | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'FINALIZED' | 'DRAFT'>('ALL');

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;

  // Resolves both { leader, support } object format AND legacy string IDs cleanly
  const resolveManagerNames = (
    mgr?: string | { leader?: string; support?: string }
  ): { leaderName: string; supportName?: string } => {
    if (!mgr) return { leaderName: 'Não atribuído' };
    if (typeof mgr === 'string') {
      const found = employees.find(e => e.id === mgr || e.name === mgr);
      return { leaderName: found?.name || mgr || 'Não atribuído' };
    }
    const leaderObj = mgr.leader
      ? employees.find(e => e.id === mgr.leader || e.name === mgr.leader)
      : undefined;
    const supportObj = mgr.support
      ? employees.find(e => e.id === mgr.support || e.name === mgr.support)
      : undefined;
    return {
      leaderName: leaderObj?.name || mgr.leader || 'Não atribuído',
      supportName: supportObj?.name || mgr.support || undefined,
    };
  };

  const getStaffCount = (schedule: DailySchedule, shift: ShiftType) => {
    const shiftData = schedule.shifts[shift];
    if (!shiftData) return 0;
    const uniqueIds = new Set(Object.values(shiftData).flat().filter(Boolean));
    return uniqueIds.size;
  };

  const flattenedHistory = useMemo(() => {
    const result: any[] = [];

    const baseSchedules = schedules
      .filter(schedule => {
        if (filterDate && schedule.date !== filterDate) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    baseSchedules.forEach(sched => {
      AVAILABLE_SHIFTS.forEach(shift => {
        if (filterShift !== 'ALL' && shift.id !== filterShift) return;

        const hasAssignments =
          sched.shifts[shift.id] && Object.keys(sched.shifts[shift.id] || {}).length > 0;
        const isLocked = (sched.lockedShifts || []).includes(shift.id);

        if (statusFilter === 'FINALIZED' && !isLocked) return;
        if (statusFilter === 'DRAFT' && isLocked) return;

        if (hasAssignments || isLocked) {
          result.push({
            date: sched.date,
            shiftId: shift.id,
            shiftLabel: shift.label,
            manager: sched.shiftManagers?.[shift.id],
            isLocked: isLocked,
            staffCount: getStaffCount(sched, shift.id),
            projectedSales: sched.projectedSales?.[shift.id] || 0,
            rawSchedule: sched,
          });
        }
      });
    });

    return result;
  }, [schedules, filterDate, filterShift, statusFilter]);

  const summaryStats = useMemo(() => {
    const finalized = flattenedHistory.filter(e => e.isLocked).length;
    const drafts = flattenedHistory.length - finalized;
    const avgStaff =
      flattenedHistory.length > 0
        ? (
            flattenedHistory.reduce((acc, e) => acc + e.staffCount, 0) / flattenedHistory.length
          ).toFixed(1)
        : '0,0';
    return { finalized, drafts, avgStaff };
  }, [flattenedHistory]);

  return (
    <div className="space-y-5 animate-fade-in h-full flex flex-col">
      {/* Summary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Turnos Submetidos</span>
          <div className="text-2xl font-extrabold text-emerald-700 tabular-nums mt-1">
            {summaryStats.finalized}
          </div>
          <span className="text-[11px] text-slate-400">Posicionamentos validados</span>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Rascunhos / Expirados</span>
          <div className="text-2xl font-extrabold text-amber-600 tabular-nums mt-1">
            {summaryStats.drafts}
          </div>
          <span className="text-[11px] text-slate-400">Turnos não submetidos no fecho</span>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Média Colaboradores / Turno</span>
          <div className="text-2xl font-extrabold text-slate-900 tabular-nums mt-1">
            {summaryStats.avgStaff}
          </div>
          <span className="text-[11px] text-slate-400">No período filtrado</span>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200/90">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <History size={18} className="text-slate-700" />
            Histórico de Posicionamento por Turno
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Consulte ou reabra qualquer turno registado, com identificação de gerente titular e apoio.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {[
              ['ALL', 'Todos'],
              ['FINALIZED', 'Finalizados'],
              ['DRAFT', 'Rascunhos'],
            ].map(([val, lbl]) => (
              <button
                key={val}
                type="button"
                onClick={() => setStatusFilter(val as any)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  statusFilter === val ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-2.5 text-slate-400" size={14} />
            <select
              value={filterShift}
              onChange={e => setFilterShift(e.target.value as any)}
              className="pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-slate-900"
            >
              <option value="ALL">Todos os Turnos</option>
              {AVAILABLE_SHIFTS.map(s => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <input
              type="date"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-slate-900"
            />
          </div>
        </div>
      </div>

      {/* Clean Data Table */}
      <div className="flex-1 overflow-auto bg-white rounded-2xl shadow-sm border border-slate-200/90">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[11px] sticky top-0 z-10 border-b border-slate-200">
            <tr>
              <th className="px-5 py-3.5">Data</th>
              <th className="px-5 py-3.5">Turno</th>
              <th className="px-5 py-3.5 text-center">Estado</th>
              <th className="px-5 py-3.5">Gerente de Turno / Apoio</th>
              <th className="px-5 py-3.5 text-center">Equipa</th>
              <th className="px-5 py-3.5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {flattenedHistory.map((entry, idx) => {
              const isExpired = entry.date < today;
              const { leaderName, supportName } = resolveManagerNames(entry.manager);
              const [yr, mo, dy] = entry.date.split('-').map(Number);
              const dateFormatted = new Date(yr, (mo || 1) - 1, dy || 1).toLocaleDateString('pt-PT', {
                weekday: 'short',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              });

              return (
                <tr
                  key={`${entry.date}-${entry.shiftId}-${idx}`}
                  className="hover:bg-slate-50/80 transition-colors group"
                >
                  <td className="px-5 py-3.5 font-semibold text-slate-900 tabular-nums capitalize">
                    {dateFormatted}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-bold text-slate-800 uppercase text-[11px]">
                      {entry.shiftLabel}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    {entry.isLocked ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 size={12} /> Finalizado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        <Clock size={11} /> {isExpired ? 'Rascunho Expirado' : 'Em Rascunho'}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                        {leaderName !== 'Não atribuído' ? leaderName.slice(0, 2).toUpperCase() : '—'}
                      </span>
                      <div>
                        <span
                          className={`font-semibold block ${
                            leaderName === 'Não atribuído' ? 'text-slate-400 italic' : 'text-slate-900'
                          }`}
                        >
                          {leaderName}
                        </span>
                        {supportName && (
                          <span className="text-[11px] text-slate-500">Apoio: {supportName}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className="inline-flex items-center justify-center min-w-[32px] px-2 py-0.5 rounded-md bg-slate-100 font-bold text-slate-900 tabular-nums">
                      {entry.staffCount}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex justify-end items-center gap-1.5">
                      <button
                        onClick={() => onLoadSchedule(entry.date, entry.shiftId)}
                        className="inline-flex items-center gap-1.5 text-slate-800 bg-slate-100 hover:bg-slate-900 hover:text-white font-semibold px-3 py-1.5 rounded-lg transition-colors text-xs"
                      >
                        <Eye size={14} /> Abrir Turno
                      </button>
                      <button
                        onClick={() => onDeleteSchedule(entry.date)}
                        className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Eliminar registos deste dia"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {flattenedHistory.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-14 text-center text-slate-400">
                  <Search size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="font-medium">Nenhum turno encontrado para os filtros atuais.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
