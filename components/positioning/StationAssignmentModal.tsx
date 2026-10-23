import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Employee, StationAssignment, StationConfig } from '../../types';
import { Check, GraduationCap, Pencil, Search, UserMinus, Users, X } from 'lucide-react';

interface StationAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  station: StationConfig | null;
  slotIndex: number;
  priorityRank?: number;
  employees: Employee[];
  assignments: StationAssignment;
  trainees: StationAssignment;
  allStations: StationConfig[];
  onAssignEmployee: (stationId: string, slotIndex: number, employeeId: string) => void;
  onAssignTrainee: (stationId: string, slotIndex: number, employeeId: string) => void;
  onEditStationMeta?: (stationId: string) => void;
}

const ROLE_SHORT_LABELS: Record<Employee['role'], string> = {
  GERENTE_RESTAURANTE: 'GR',
  GERENTE: 'GER',
  TREINADOR: 'TRN',
  RP: 'RP',
  FUNCIONÁRIO: 'FUNC',
};

export const StationAssignmentModal: React.FC<StationAssignmentModalProps> = ({
  isOpen,
  onClose,
  station,
  slotIndex,
  priorityRank,
  employees,
  assignments,
  trainees,
  allStations,
  onAssignEmployee,
  onAssignTrainee,
  onEditStationMeta,
}) => {
  const [mode, setMode] = useState<'primary' | 'trainee'>('primary');
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setMode('primary');
    setSearch('');
    const t = setTimeout(() => inputRef.current?.focus(), 40);
    return () => clearTimeout(t);
  }, [isOpen, station?.id, slotIndex]);

  const busyMap = useMemo(() => {
    const map = new Map<string, string>();
    allStations.forEach(st => {
      const code = (st.designation || st.label).toUpperCase();
      (assignments[st.id] || []).forEach(id => {
        if (id) map.set(id, code);
      });
      (trainees[st.id] || []).forEach(id => {
        if (id && !map.has(id)) map.set(id, `${code} (Form.)`);
      });
    });
    return map;
  }, [assignments, trainees, allStations]);

  const sortedEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...employees]
      .filter(e => !q || e.name.toLowerCase().includes(q) || ROLE_SHORT_LABELS[e.role].toLowerCase().includes(q))
      .sort((a, b) => {
        const aBusy = busyMap.has(a.id) ? 1 : 0;
        const bBusy = busyMap.has(b.id) ? 1 : 0;
        if (aBusy !== bBusy) return aBusy - bBusy;
        return a.name.localeCompare(b.name, 'pt-PT');
      });
  }, [employees, search, busyMap]);

  if (!isOpen || !station) return null;

  const currentPrimaryId = (assignments[station.id] || [])[slotIndex] || '';
  const currentTraineeId = (trainees[station.id] || [])[slotIndex] || '';
  const currentSelectedId = mode === 'primary' ? currentPrimaryId : currentTraineeId;

  const handlePick = (empId: string) => {
    if (mode === 'primary') {
      onAssignEmployee(station.id, slotIndex, empId);
      onClose();
    } else {
      onAssignTrainee(station.id, slotIndex, empId);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/55 backdrop-blur-xs no-print"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[82vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 bg-[#DA291C] text-white flex items-center justify-between gap-2">
          <div className="min-w-0 flex items-center gap-2">
            {priorityRank !== undefined && (
              <span className="shrink-0 bg-white text-[#DA291C] font-black text-xs px-2 py-0.5 rounded tabular-nums">
                {priorityRank}
              </span>
            )}
            <div className="min-w-0">
              <div className="text-sm font-black uppercase tracking-tight leading-tight truncate">
                {(station.designation || station.label).toUpperCase()}
              </div>
              <div className="text-[11px] text-white/85 font-medium truncate">
                {station.label} {station.defaultSlots > 1 ? `· Vaga ${slotIndex + 1}` : ''}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {onEditStationMeta && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditStationMeta(station.id);
                }}
                title="Editar sigla, nome ou área deste posto"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/15 hover:bg-white/25 text-white transition-colors"
              >
                <Pencil className="w-3 h-3" /> Editar Posto
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/15 text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mode Tabs: Titular vs Formando */}
        <div className="px-4 pt-3 pb-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-200/80 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setMode('primary')}
              className={`inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                mode === 'primary'
                  ? 'bg-white dark:bg-slate-950 text-slate-950 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-[#DA291C]" />
              Titular do Posto
            </button>
            <button
              type="button"
              onClick={() => setMode('trainee')}
              className={`inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                mode === 'trainee'
                  ? 'bg-white dark:bg-slate-950 text-amber-700 dark:text-amber-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5 text-amber-500" />
              Formando {currentTraineeId ? '(1)' : ''}
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && sortedEmployees.length > 0) {
                  handlePick(sortedEmployees[0].id);
                }
              }}
              placeholder="Pesquisar colaborador por nome..."
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        {/* Employee List */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
          {currentSelectedId && (
            <button
              type="button"
              onClick={() => handlePick('')}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 mb-1.5 rounded-xl text-xs font-extrabold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
            >
              <UserMinus className="w-3.5 h-3.5" />
              Remover {mode === 'primary' ? 'Titular deste Posto' : 'Formando deste Posto'}
            </button>
          )}

          {sortedEmployees.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 font-semibold">
              Nenhum colaborador encontrado para «{search}».
            </div>
          ) : (
            sortedEmployees.map(emp => {
              const isSelected = emp.id === currentSelectedId;
              const busyWhere = busyMap.get(emp.id);

              return (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => handlePick(emp.id)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left transition-all ${
                    isSelected
                      ? 'bg-[#DA291C] text-white font-black'
                      : busyWhere
                      ? 'bg-slate-50/90 dark:bg-slate-800/50 hover:bg-amber-50/70 text-slate-700 dark:text-slate-200 border border-slate-200/70 dark:border-slate-800'
                      : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-950 dark:text-white border border-slate-200/80 dark:border-slate-800'
                  }`}
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <span
                      className={`shrink-0 text-[9.5px] font-black uppercase px-1.5 py-0.5 rounded ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {ROLE_SHORT_LABELS[emp.role]}
                    </span>
                    <span className="text-xs font-extrabold uppercase tracking-tight break-words">
                      {emp.name}
                    </span>
                  </div>

                  <div className="shrink-0 flex items-center gap-1.5">
                    {isSelected ? (
                      <Check className="w-4 h-4 text-white" />
                    ) : busyWhere ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 whitespace-nowrap">
                        {busyWhere}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 whitespace-nowrap">
                        Livre
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
