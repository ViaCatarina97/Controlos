import React, { useState } from 'react';
import { 
  TrendingUp, CheckCircle2, AlertCircle, Clock, ShieldCheck, 
  Award, Users, Layers, MessageSquare, AlertTriangle, Camera,
  Image as ImageIcon, X, Eye
} from 'lucide-react';
import { 
  CleaningPlanWeek, CleaningTaskItem, Employee, CleaningDayOfWeek, CleaningShift 
} from '../../types';
import { CLEANING_DAYS, CLEANING_SHIFTS } from './cleaningDefaults';

interface CleaningDashboardProps {
  currentWeek: CleaningPlanWeek;
  allWeeks: CleaningPlanWeek[];
  weeklyTasks: CleaningTaskItem[];
  zeladorTasks: CleaningTaskItem[];
  areas: string[];
  employees: Employee[];
}

export const CleaningDashboard: React.FC<CleaningDashboardProps> = ({
  currentWeek,
  allWeeks,
  weeklyTasks,
  zeladorTasks,
  areas,
  employees
}) => {
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string; subtitle: string } | null>(null);

  // Weekly tasks calculations
  const totalWeekly = weeklyTasks.length;
  const completedWeekly = weeklyTasks.filter(t => currentWeek.taskStatuses[t.id]?.completed).length;
  const justifiedWeekly = weeklyTasks.filter(
    t => !currentWeek.taskStatuses[t.id]?.completed && currentWeek.taskStatuses[t.id]?.justification
  ).length;
  const pendingWeekly = totalWeekly - completedWeekly - justifiedWeekly;
  const weeklyRate = totalWeekly > 0 ? Math.round((completedWeekly / totalWeekly) * 100) : 0;

  // Photo evidence calculations
  const weeklyPhotosList: { photo: string; taskName: string; area: string; shift?: string; day?: string; manager?: string; completedAt?: string }[] = [];
  weeklyTasks.forEach(t => {
    const st = currentWeek.taskStatuses[t.id];
    if (st?.completed && st.photos && st.photos.length > 0) {
      st.photos.forEach(photo => {
        weeklyPhotosList.push({
          photo,
          taskName: t.tarefa,
          area: t.area,
          shift: t.shift,
          day: t.day,
          manager: st.completedBy || (t.shift && currentWeek.shiftManagers[t.day]?.[t.shift]),
          completedAt: st.completedAt
        });
      });
    }
  });

  const zeladorPhotosList: { photo: string; taskName: string; area: string; manager?: string; completedAt?: string }[] = [];
  zeladorTasks.forEach(t => {
    const st = currentWeek.zeladorStatuses[t.id];
    if (st?.completed && st.photos && st.photos.length > 0) {
      st.photos.forEach(photo => {
        zeladorPhotosList.push({
          photo,
          taskName: t.tarefa,
          area: t.area,
          manager: st.funcionario || 'Zelador',
          completedAt: st.completedAt
        });
      });
    }
  });

  const totalPhotosCount = weeklyPhotosList.length + zeladorPhotosList.length;
  const completedWeeklyWithPhotos = weeklyTasks.filter(
    t => currentWeek.taskStatuses[t.id]?.completed && (currentWeek.taskStatuses[t.id]?.photos?.length || 0) > 0
  ).length;
  const photoComplianceRate = completedWeekly > 0 ? Math.round((completedWeeklyWithPhotos / completedWeekly) * 100) : 0;

  // Zelador tasks calculations
  const totalZelador = zeladorTasks.length;
  const completedZelador = zeladorTasks.filter(t => currentWeek.zeladorStatuses[t.id]?.completed).length;
  const zeladorRate = totalZelador > 0 ? Math.round((completedZelador / totalZelador) * 100) : 0;

  // Manager performance aggregation
  // For each manager assigned to a shift, count tasks in that shift
  interface ManagerMetric {
    name: string;
    roleLabel?: string;
    isDesignated: boolean;
    shiftsCount: number;
    tasksTotal: number;
    tasksCompleted: number;
    tasksWithPhotos: number;
    tasksJustified: number;
    tasksPending: number;
    rate: number;
  }

  const managerMetricsMap = new Map<string, ManagerMetric>();

  // Initialize with eligible managers defined face ao cargo nas definições
  const eligibleManagers = employees.filter(
    e => e.isActive && (e.role === 'GERENTE_RESTAURANTE' || e.role === 'GERENTE')
  );

  eligibleManagers.forEach(emp => {
    managerMetricsMap.set(emp.name, {
      name: emp.name,
      roleLabel: emp.role === 'GERENTE_RESTAURANTE' ? 'Gerente Restaurante' : 'Gerente',
      isDesignated: true,
      shiftsCount: 0,
      tasksTotal: 0,
      tasksCompleted: 0,
      tasksWithPhotos: 0,
      tasksJustified: 0,
      tasksPending: 0,
      rate: 0
    });
  });

  CLEANING_DAYS.forEach(day => {
    CLEANING_SHIFTS.forEach(shift => {
      const manager = currentWeek.shiftManagers[day.key]?.[shift.key];
      if (!manager) return;

      if (!managerMetricsMap.has(manager)) {
        const emp = employees.find(e => e.name === manager);
        const roleLabel = emp 
          ? (emp.role === 'GERENTE_RESTAURANTE' ? 'Gerente Restaurante' : emp.role === 'GERENTE' ? 'Gerente' : emp.role) 
          : 'Gerente de Turno';

        managerMetricsMap.set(manager, {
          name: manager,
          roleLabel,
          isDesignated: Boolean(emp && (emp.role === 'GERENTE_RESTAURANTE' || emp.role === 'GERENTE')),
          shiftsCount: 0,
          tasksTotal: 0,
          tasksCompleted: 0,
          tasksWithPhotos: 0,
          tasksJustified: 0,
          tasksPending: 0,
          rate: 0
        });
      }

      const metric = managerMetricsMap.get(manager)!;
      metric.shiftsCount += 1;

      // tasks for this shift
      const shiftTasks = weeklyTasks.filter(t => t.day === day.key && t.shift === shift.key);
      metric.tasksTotal += shiftTasks.length;

      shiftTasks.forEach(task => {
        const st = currentWeek.taskStatuses[task.id];
        if (st?.completed) {
          metric.tasksCompleted += 1;
          if (st.photos && st.photos.length > 0) {
            metric.tasksWithPhotos += 1;
          }
        } else if (st?.justification) {
          metric.tasksJustified += 1;
        } else {
          metric.tasksPending += 1;
        }
      });
    });
  });

  const managerMetricsList = Array.from(managerMetricsMap.values()).map(m => ({
    ...m,
    rate: m.tasksTotal > 0 ? Math.round((m.tasksCompleted / m.tasksTotal) * 100) : 0
  })).sort((a, b) => {
    if (b.shiftsCount !== a.shiftsCount) return b.shiftsCount - a.shiftsCount;
    return b.rate - a.rate;
  });

  // Area performance aggregation
  interface AreaMetric {
    area: string;
    total: number;
    completed: number;
    rate: number;
  }

  const areaMetricsList: AreaMetric[] = areas.map(area => {
    const tasks = weeklyTasks.filter(t => t.area === area);
    const completed = tasks.filter(t => currentWeek.taskStatuses[t.id]?.completed).length;
    const rate = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
    return { area, total: tasks.length, completed, rate };
  }).sort((a, b) => b.rate - a.rate);

  // Justified tasks list
  const justifiedTasksList = weeklyTasks
    .filter(t => !currentWeek.taskStatuses[t.id]?.completed && currentWeek.taskStatuses[t.id]?.justification)
    .map(t => {
      const st = currentWeek.taskStatuses[t.id];
      const manager = (t.shift && currentWeek.shiftManagers[t.day]?.[t.shift]) || 'Não atribuído';
      return {
        task: t,
        justification: st.justification,
        notes: st.notes,
        manager
      };
    });

  return (
    <div className="space-y-8">
      {/* Top Metric Cards (5 Cards Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Taxa Global */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Taxa de Conclusão</span>
            <div className={`p-2 rounded-xl ${weeklyRate >= 80 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900">{weeklyRate}%</span>
            <span className="text-xs text-gray-500">Semana {currentWeek.weekNumber}</span>
          </div>
          <div className="mt-3 w-full bg-gray-100 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                weeklyRate >= 80 ? 'bg-emerald-500' : weeklyRate >= 60 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${weeklyRate}%` }}
            />
          </div>
        </div>

        {/* Card 2: Tarefas Realizadas */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Tarefas Realizadas</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600">{completedWeekly}</span>
            <span className="text-xs text-gray-500">de {totalWeekly}</span>
          </div>
          <p className="mt-3 text-[11px] text-gray-500">
            {totalWeekly - completedWeekly} restantes para conclusão
          </p>
        </div>

        {/* Card 3: Evidências Fotográficas (NOVO & OBRIGATÓRIO) */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Evidências / Fotos</span>
            <div className="p-2 bg-teal-50 text-teal-700 rounded-xl">
              <Camera size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-teal-700">{totalPhotosCount}</span>
            <span className="text-xs text-gray-500">fotos capturadas</span>
          </div>
          <p className="mt-3 text-[11px] text-teal-800 font-semibold">
            {completedWeeklyWithPhotos} de {completedWeekly} tarefas com foto ({photoComplianceRate}%)
          </p>
        </div>

        {/* Card 4: Tarefas Justificadas */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Faltas Justificadas</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <AlertCircle size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-600">{justifiedWeekly}</span>
            <span className="text-xs text-gray-500">justificadas</span>
          </div>
          <p className="mt-3 text-[11px] text-gray-500">
            {pendingWeekly > 0 ? (
              <span className="text-red-500 font-bold">{pendingWeekly} pendentes sem motivo</span>
            ) : (
              <span className="text-emerald-600 font-bold">Sem pendências não justificadas</span>
            )}
          </p>
        </div>

        {/* Card 5: Zelador */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Mapa do Zelador</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Award size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-indigo-600">{zeladorRate}%</span>
            <span className="text-xs text-gray-500">{completedZelador}/{totalZelador}</span>
          </div>
          <div className="mt-3 w-full bg-gray-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-indigo-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${zeladorRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Section: Desempenho por Gerente */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50/80 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-teal-700" />
            <div>
              <h3 className="font-bold text-sm text-gray-900 uppercase tracking-tight">
                Desempenho Operacional por Gerente
              </h3>
              <p className="text-[11px] text-gray-500">
                Considera os colaboradores com cargo de Gerente / Gerente de Restaurante nas Definições
              </p>
            </div>
          </div>
          <span className="text-xs text-gray-600 font-semibold bg-gray-100 px-3 py-1 rounded-full">
            {managerMetricsList.filter(m => m.shiftsCount > 0).length} de {managerMetricsList.length} com turnos ativos
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-100/60 text-gray-600 font-bold uppercase tracking-wider border-b border-gray-200">
              <tr>
                <th className="p-3.5">Gerente / Cargo</th>
                <th className="p-3.5 text-center">Turnos</th>
                <th className="p-3.5 text-center">Tarefas Atribuídas</th>
                <th className="p-3.5 text-center">Realizadas</th>
                <th className="p-3.5 text-center">Com Fotos</th>
                <th className="p-3.5 text-center">Justificadas</th>
                <th className="p-3.5 text-center">Pendentes</th>
                <th className="p-3.5 w-48 text-right">% Cumprimento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {managerMetricsList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400">
                    Nenhum gerente encontrado na lista de colaboradores com o cargo correspondente.
                  </td>
                </tr>
              ) : (
                managerMetricsList.map((m) => {
                  const rateColor =
                    m.rate >= 90
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                      : m.rate >= 75
                      ? 'text-teal-700 bg-teal-50 border-teal-200'
                      : m.rate >= 50
                      ? 'text-amber-700 bg-amber-50 border-amber-200'
                      : 'text-red-700 bg-red-50 border-red-200';

                  return (
                    <tr key={m.name} className="hover:bg-gray-50/70 transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-xs text-gray-900">{m.name}</div>
                          {m.roleLabel && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              m.roleLabel.includes('Restaurante')
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}>
                              {m.roleLabel}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 text-center font-semibold text-gray-700">
                        {m.shiftsCount > 0 ? (
                          <span className="px-2 py-0.5 bg-gray-100 rounded-md font-bold">{m.shiftsCount}</span>
                        ) : (
                          <span className="text-gray-400 italic">0 turnos</span>
                        )}
                      </td>
                      <td className="p-3.5 text-center font-bold text-gray-800">
                        {m.tasksTotal}
                      </td>
                      <td className="p-3.5 text-center font-bold text-emerald-600">
                        {m.tasksCompleted}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="inline-flex items-center gap-1 font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                          <Camera size={12} />
                          <span>{m.tasksWithPhotos}</span>
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-semibold text-amber-600">
                        {m.tasksJustified}
                      </td>
                      <td className="p-3.5 text-center font-bold text-red-500">
                        {m.tasksPending}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 bg-gray-100 h-2 rounded-full overflow-hidden hidden sm:block">
                            <div
                              className={`h-full rounded-full ${
                                m.rate >= 80 ? 'bg-emerald-500' : m.rate >= 60 ? 'bg-amber-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${m.rate}%` }}
                            />
                          </div>
                          <span className={`px-2 py-0.5 rounded-md font-black text-xs border ${rateColor}`}>
                            {m.rate}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two Columns: Cumprimento por Área & Justificações */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Desempenho por Área */}
        <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden flex flex-col">
          <div className="px-6 py-4 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-teal-700" />
              <h3 className="font-bold text-sm text-gray-900 uppercase tracking-tight">
                Cumprimento por Área
              </h3>
            </div>
            <span className="text-xs text-gray-500 font-medium">Classificação</span>
          </div>

          <div className="p-5 space-y-3.5 overflow-y-auto max-h-80 divide-y divide-gray-100">
            {areaMetricsList.map(area => (
              <div key={area.area} className="pt-2 first:pt-0">
                <div className="flex items-center justify-between text-xs font-bold text-gray-800 mb-1">
                  <span>{area.area}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-gray-500">
                      {area.completed}/{area.total}
                    </span>
                    <span className={`px-1.5 py-0.2 rounded-md font-bold text-[11px] ${
                      area.rate >= 80 ? 'text-emerald-700' : area.rate >= 60 ? 'text-amber-700' : 'text-red-700'
                    }`}>
                      {area.rate}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      area.rate >= 80 ? 'bg-emerald-500' : area.rate >= 60 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${area.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Justificações da Semana */}
        <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden flex flex-col">
          <div className="px-6 py-4 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare size={18} className="text-amber-600" />
              <h3 className="font-bold text-sm text-gray-900 uppercase tracking-tight">
                Faltas Justificadas ({justifiedTasksList.length})
              </h3>
            </div>
            <span className="text-xs text-amber-700 font-medium">Motivos Registados</span>
          </div>

          <div className="p-5 overflow-y-auto max-h-80 space-y-3">
            {justifiedTasksList.length === 0 ? (
              <div className="py-10 text-center text-xs text-gray-400">
                Não existem tarefas não realizadas com justificação nesta semana.
              </div>
            ) : (
              justifiedTasksList.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900">{item.task.tarefa}</span>
                    <span className="px-2 py-0.5 rounded-md font-semibold text-[10px] bg-white text-gray-700 border border-gray-200">
                      {item.task.area}
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-900 font-medium">
                    <strong>Motivo: </strong>{item.justification}
                  </p>
                  <div className="pt-1 flex items-center justify-between text-[10px] text-gray-500">
                    <span>Turno {item.task.shift} • {item.task.day}</span>
                    <span>Gerente: <strong className="text-gray-700">{item.manager}</strong></span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Galeria de Evidências Fotográficas Recentes */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera size={18} className="text-teal-700" />
            <h3 className="font-bold text-sm text-gray-900 uppercase tracking-tight">
              Galeria de Evidências da Limpeza ({totalPhotosCount} fotos)
            </h3>
          </div>
          <span className="text-xs text-gray-500 font-medium">
            Semana {currentWeek.weekNumber}
          </span>
        </div>

        <div className="p-6">
          {totalPhotosCount === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400 flex flex-col items-center gap-2">
              <Camera size={32} className="text-gray-300" />
              <span>Ainda não foram registadas evidências fotográficas nesta semana.</span>
              <span className="text-[11px] text-gray-400">
                Ao marcar uma tarefa de limpeza como concluída nos mapas semanal ou do zelador, é obrigatório tirar foto.
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {weeklyPhotosList.map((item, idx) => (
                <div
                  key={`weekly-${idx}`}
                  onClick={() => setPreviewPhoto({
                    url: item.photo,
                    title: item.taskName,
                    subtitle: `${item.area} • Turno ${item.shift} • Gerente: ${item.manager || 'Não atribuído'}`
                  })}
                  className="group relative rounded-xl overflow-hidden border border-gray-200 aspect-square bg-gray-100 cursor-pointer hover:border-teal-500 hover:shadow-md transition-all"
                >
                  <img
                    src={item.photo}
                    alt={item.taskName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end text-white">
                    <span className="text-[10px] font-bold line-clamp-1">{item.taskName}</span>
                    <span className="text-[9px] text-gray-300 line-clamp-1">{item.manager}</span>
                  </div>
                  <div className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                    <Eye size={12} />
                  </div>
                </div>
              ))}

              {zeladorPhotosList.map((item, idx) => (
                <div
                  key={`zelador-${idx}`}
                  onClick={() => setPreviewPhoto({
                    url: item.photo,
                    title: `Zelador: ${item.taskName}`,
                    subtitle: `${item.area} • Funcionário: ${item.manager}`
                  })}
                  className="group relative rounded-xl overflow-hidden border border-indigo-200 aspect-square bg-indigo-50 cursor-pointer hover:border-indigo-500 hover:shadow-md transition-all"
                >
                  <img
                    src={item.photo}
                    alt={item.taskName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end text-white">
                    <span className="text-[10px] font-bold line-clamp-1">Zelador: {item.taskName}</span>
                    <span className="text-[9px] text-gray-300 line-clamp-1">{item.manager}</span>
                  </div>
                  <div className="absolute top-1 right-1 bg-indigo-900/80 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                    <Eye size={12} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Photo Preview Modal */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-gray-900">{previewPhoto.title}</h4>
                <p className="text-xs text-gray-500">{previewPhoto.subtitle}</p>
              </div>
              <button
                onClick={() => setPreviewPhoto(null)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 bg-gray-900 flex items-center justify-center max-h-[70vh]">
              <img
                src={previewPhoto.url}
                alt={previewPhoto.title}
                referrerPolicy="no-referrer"
                className="max-h-[65vh] max-w-full object-contain rounded-lg"
              />
            </div>
            <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
              <span className="font-medium flex items-center gap-1">
                <Camera size={14} className="text-teal-700" />
                Evidência fotográfica de limpeza
              </span>
              <button
                onClick={() => setPreviewPhoto(null)}
                className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-bold transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
