import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, CheckCircle2, AlertCircle, Clock, ShieldCheck, 
  Award, Users, Layers, MessageSquare, AlertTriangle, Camera,
  Image as ImageIcon, X, Eye, Crown, GitFork, ArrowRight, Filter,
  Check, Sparkles, ChevronRight
} from 'lucide-react';
import { 
  CleaningPlanWeek, CleaningTaskItem, Employee, CleaningDayOfWeek, CleaningShift, 
  CleaningTemplateConfig, AreaResponsibleConfig 
} from '../../types';
import { CLEANING_DAYS, CLEANING_SHIFTS, DEFAULT_AREA_CONFIGS, DEFAULT_CLEANING_AREAS } from './cleaningDefaults';

interface CleaningDashboardProps {
  currentWeek: CleaningPlanWeek;
  allWeeks: CleaningPlanWeek[];
  weeklyTasks: CleaningTaskItem[];
  zeladorTasks: CleaningTaskItem[];
  areas: string[];
  employees: Employee[];
  template?: CleaningTemplateConfig | null;
  onNavigateToFlowchart?: () => void;
}

export const CleaningDashboard: React.FC<CleaningDashboardProps> = ({
  currentWeek,
  allWeeks,
  weeklyTasks,
  zeladorTasks,
  areas,
  employees,
  template,
  onNavigateToFlowchart
}) => {
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string; subtitle: string } | null>(null);
  const [selectedManagerFilter, setSelectedManagerFilter] = useState<string>('all');
  const [managerViewMode, setManagerViewMode] = useState<'area_responsibles' | 'shift_managers'>('area_responsibles');

  // 1. Effective Area Responsibles (merging currentWeek -> template -> defaults)
  const effectiveResponsibles = useMemo(() => {
    const map: { [area: string]: AreaResponsibleConfig } = {};
    const allAreas = areas && areas.length > 0 ? areas : DEFAULT_CLEANING_AREAS;

    allAreas.forEach(area => {
      const fromWeek = currentWeek?.areaResponsibles?.[area];
      const fromTemplate = template?.areaResponsibles?.[area];
      const defaultConfig = DEFAULT_AREA_CONFIGS[area];

      if (fromWeek && fromWeek.managerName) {
        map[area] = { ...fromWeek };
      } else if (fromTemplate && fromTemplate.managerName) {
        map[area] = { ...fromTemplate };
      } else {
        map[area] = {
          area,
          managerName: '',
          notes: '',
          subAreas: defaultConfig?.defaultSubAreas || [],
          priority: (area === 'Cozinha' || area === "WC's" || area === 'Bebidas') ? 'alta' : 'media',
          color: defaultConfig?.color || 'teal'
        };
      }
    });

    return map;
  }, [currentWeek, template, areas]);

  // 2. Weekly tasks calculations
  const totalWeekly = weeklyTasks.length;
  const completedWeekly = weeklyTasks.filter(t => currentWeek.taskStatuses[t.id]?.completed).length;
  const justifiedWeekly = weeklyTasks.filter(
    t => !currentWeek.taskStatuses[t.id]?.completed && currentWeek.taskStatuses[t.id]?.justification
  ).length;
  const pendingWeekly = totalWeekly - completedWeekly - justifiedWeekly;
  const weeklyRate = totalWeekly > 0 ? Math.round((completedWeekly / totalWeekly) * 100) : 0;

  // 3. Photo evidence calculations
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
          manager: (t.shift && currentWeek.shiftManagers[t.day]?.[t.shift]) || effectiveResponsibles[t.area]?.managerName || 'Não atribuído',
          completedAt: st.completedAt
        });
      });
    }
  });

  const zeladorPhotosList: { photo: string; taskName: string; area: string; manager?: string }[] = [];
  zeladorTasks.forEach(t => {
    const st = currentWeek.zeladorStatuses[t.id];
    if (st?.completed && st.photos && st.photos.length > 0) {
      st.photos.forEach(photo => {
        zeladorPhotosList.push({
          photo,
          taskName: t.tarefa,
          area: t.area,
          manager: st.funcionario || 'Zelador'
        });
      });
    }
  });

  const totalPhotosCount = weeklyPhotosList.length + zeladorPhotosList.length;

  // 4. Area Metrics enriched with Assigned Manager
  interface AreaPerformanceMetric {
    area: string;
    managerName: string;
    managerRole?: string;
    priority?: string;
    total: number;
    completed: number;
    withPhotos: number;
    justified: number;
    pending: number;
    rate: number;
    notes?: string;
    subAreas?: string[];
  }

  const areaMetricsList: AreaPerformanceMetric[] = useMemo(() => {
    return areas.map(area => {
      const resp = effectiveResponsibles[area];
      const tasks = weeklyTasks.filter(t => t.area === area);
      const completed = tasks.filter(t => currentWeek.taskStatuses[t.id]?.completed).length;
      const withPhotos = tasks.filter(t => currentWeek.taskStatuses[t.id]?.completed && (currentWeek.taskStatuses[t.id].photos?.length || 0) > 0).length;
      const justified = tasks.filter(t => !currentWeek.taskStatuses[t.id]?.completed && currentWeek.taskStatuses[t.id]?.justification).length;
      const pending = tasks.length - completed - justified;
      const rate = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;

      return {
        area,
        managerName: resp?.managerName || '',
        managerRole: resp?.managerRole,
        priority: resp?.priority || 'media',
        total: tasks.length,
        completed,
        withPhotos,
        justified,
        pending,
        rate,
        notes: resp?.notes,
        subAreas: resp?.subAreas
      };
    }).sort((a, b) => b.rate - a.rate);
  }, [areas, effectiveResponsibles, weeklyTasks, currentWeek]);

  // 5. Manager by Area Responsibility Metrics ("Ponto de Situação por Gerente Responsável de Área")
  interface ManagerAreaResponsibilityMetric {
    managerName: string;
    managerRole?: string;
    areas: string[];
    totalTasks: number;
    completedTasks: number;
    withPhotosTasks: number;
    justifiedTasks: number;
    pendingTasks: number;
    rate: number;
  }

  const managerAreaMetrics: ManagerAreaResponsibilityMetric[] = useMemo(() => {
    const map: { [mgr: string]: ManagerAreaResponsibilityMetric } = {};

    areas.forEach(area => {
      const resp = effectiveResponsibles[area];
      const mgrName = resp?.managerName?.trim();
      if (!mgrName) return;

      const tasks = weeklyTasks.filter(t => t.area === area);
      const completed = tasks.filter(t => currentWeek.taskStatuses[t.id]?.completed).length;
      const withPhotos = tasks.filter(t => currentWeek.taskStatuses[t.id]?.completed && (currentWeek.taskStatuses[t.id].photos?.length || 0) > 0).length;
      const justified = tasks.filter(t => !currentWeek.taskStatuses[t.id]?.completed && currentWeek.taskStatuses[t.id]?.justification).length;
      const pending = tasks.length - completed - justified;

      if (!map[mgrName]) {
        const emp = employees.find(e => e.name === mgrName);
        map[mgrName] = {
          managerName: mgrName,
          managerRole: resp.managerRole || (emp?.role === 'GERENTE_RESTAURANTE' ? 'Gerente Restaurante' : emp?.role === 'GERENTE' ? 'Gerente' : emp?.role) || 'Gerente',
          areas: [],
          totalTasks: 0,
          completedTasks: 0,
          withPhotosTasks: 0,
          justifiedTasks: 0,
          pendingTasks: 0,
          rate: 0
        };
      }

      map[mgrName].areas.push(area);
      map[mgrName].totalTasks += tasks.length;
      map[mgrName].completedTasks += completed;
      map[mgrName].withPhotosTasks += withPhotos;
      map[mgrName].justifiedTasks += justified;
      map[mgrName].pendingTasks += pending;
    });

    return Object.values(map).map(item => ({
      ...item,
      rate: item.totalTasks > 0 ? Math.round((item.completedTasks / item.totalTasks) * 100) : 0
    })).sort((a, b) => b.rate - a.rate);
  }, [areas, effectiveResponsibles, weeklyTasks, currentWeek, employees]);

  // Unassigned areas count
  const unassignedAreasList = useMemo(() => {
    return areas.filter(a => !effectiveResponsibles[a]?.managerName);
  }, [areas, effectiveResponsibles]);

  // 6. Shift Managers metrics (turnos / shift managers)
  interface ShiftManagerMetric {
    name: string;
    roleLabel: string;
    isDesignated: boolean;
    shiftsCount: number;
    tasksTotal: number;
    tasksCompleted: number;
    tasksWithPhotos: number;
    tasksJustified: number;
    tasksPending: number;
    rate: number;
  }

  const shiftManagerMetricsList = useMemo(() => {
    const managerMetricsMap = new Map<string, ShiftManagerMetric>();

    // Initialize with eligible managers
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

    return Array.from(managerMetricsMap.values()).map(m => ({
      ...m,
      rate: m.tasksTotal > 0 ? Math.round((m.tasksCompleted / m.tasksTotal) * 100) : 0
    })).sort((a, b) => {
      if (b.shiftsCount !== a.shiftsCount) return b.shiftsCount - a.shiftsCount;
      return b.rate - a.rate;
    });
  }, [employees, currentWeek, weeklyTasks]);

  // 7. Filtered area metrics if user selects a specific manager
  const filteredAreaMetrics = useMemo(() => {
    if (selectedManagerFilter === 'all') {
      return areaMetricsList;
    }
    if (selectedManagerFilter === 'unassigned') {
      return areaMetricsList.filter(a => !a.managerName);
    }
    return areaMetricsList.filter(a => a.managerName === selectedManagerFilter);
  }, [areaMetricsList, selectedManagerFilter]);

  // Justified tasks list
  const justifiedTasksList = weeklyTasks
    .filter(t => !currentWeek.taskStatuses[t.id]?.completed && currentWeek.taskStatuses[t.id]?.justification)
    .map(t => {
      const st = currentWeek.taskStatuses[t.id];
      const manager = (t.shift && currentWeek.shiftManagers[t.day]?.[t.shift]) || effectiveResponsibles[t.area]?.managerName || 'Não atribuído';
      return {
        task: t,
        justification: st.justification,
        notes: st.notes,
        manager
      };
    });

  const assignedAreasCoverageRate = areas.length > 0 
    ? Math.round(((areas.length - unassignedAreasList.length) / areas.length) * 100) 
    : 0;

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

        {/* Card 3: Evidências Fotográficas */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Evidências / Fotos</span>
            <div className="p-2 bg-teal-50 text-teal-700 rounded-xl">
              <Camera size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-teal-700">{totalPhotosCount}</span>
            <span className="text-xs text-gray-500">registadas</span>
          </div>
          <p className="mt-3 text-[11px] text-teal-600 font-medium">
            {weeklyPhotosList.length} semanais • {zeladorPhotosList.length} zelador
          </p>
        </div>

        {/* Card 4: Cobertura de Responsáveis por Área */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Cobertura de Áreas</span>
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
              <GitFork size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-indigo-700">{areas.length - unassignedAreasList.length}/{areas.length}</span>
            <span className="text-xs text-indigo-600 font-bold">({assignedAreasCoverageRate}%)</span>
          </div>
          <p className="mt-3 text-[11px] text-gray-500">
            {unassignedAreasList.length > 0 ? (
              <span className="text-amber-600 font-semibold">{unassignedAreasList.length} área(s) sem gerente</span>
            ) : (
              <span className="text-emerald-600 font-semibold">Todas as áreas designadas</span>
            )}
          </p>
        </div>

        {/* Card 5: Gerentes com Áreas Atribuídas */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Gerentes Titulares</span>
            <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
              <Crown size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900">{managerAreaMetrics.length}</span>
            <span className="text-xs text-gray-500">com áreas</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px]">
            {onNavigateToFlowchart && (
              <button
                onClick={onNavigateToFlowchart}
                className="text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1 group"
              >
                <span>Ver Fluxograma</span>
                <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* FILTER BAR FOR RESPONSIBLE MANAGER */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-teal-50 text-teal-700 rounded-lg">
            <Filter size={16} />
          </span>
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
            Filtrar Ponto de Situação por Gerente Responsável:
          </span>
          <select
            value={selectedManagerFilter}
            onChange={(e) => setSelectedManagerFilter(e.target.value)}
            className="p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-hidden focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">Todos os Gerentes Responsáveis</option>
            {managerAreaMetrics.map(m => (
              <option key={m.managerName} value={m.managerName}>
                {m.managerName} ({m.areas.length} {m.areas.length === 1 ? 'área' : 'áreas'})
              </option>
            ))}
            {unassignedAreasList.length > 0 && (
              <option value="unassigned">⚠️ Áreas Sem Gerente ({unassignedAreasList.length})</option>
            )}
          </select>
        </div>

        {selectedManagerFilter !== 'all' && (
          <button
            onClick={() => setSelectedManagerFilter('all')}
            className="text-xs font-bold text-teal-700 hover:underline"
          >
            Limpar Filtro
          </button>
        )}
      </div>

      {/* SECTION 1: PONTO DE SITUAÇÃO POR GERENTE (RESPONSÁVEL DESSA ÁREA) */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 bg-gray-50/80 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Crown size={20} className="text-amber-500" />
              <h3 className="font-bold text-base text-gray-900 tracking-tight">
                Ponto de Situação por Gerente (Responsável de Área)
              </h3>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Estado de execução e auditoria nas áreas operacionais sob a responsabilidade direta de cada gerente
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onNavigateToFlowchart && (
              <button
                onClick={onNavigateToFlowchart}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold transition-colors"
              >
                <GitFork size={14} />
                <span>Editar no Fluxograma</span>
              </button>
            )}
          </div>
        </div>

        {/* Manager Area Responsibility Cards Grid */}
        <div className="p-6">
          {managerAreaMetrics.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400 flex flex-col items-center gap-2">
              <AlertCircle size={32} className="text-amber-400" />
              <span className="font-bold text-gray-700 text-sm">Ainda não existem gerentes atribuídos às áreas.</span>
              <span className="text-gray-500 max-w-md">
                Defina o organograma/fluxograma de responsáveis por área na aba "Fluxograma / Responsáveis" para acompanhar o ponto de situação individual por gerente.
              </span>
              {onNavigateToFlowchart && (
                <button
                  onClick={onNavigateToFlowchart}
                  className="mt-2 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
                >
                  Abrir Fluxograma de Responsáveis
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {managerAreaMetrics
                .filter(m => selectedManagerFilter === 'all' || m.managerName === selectedManagerFilter)
                .map((mgr) => {
                  const rateColor =
                    mgr.rate >= 90
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                      : mgr.rate >= 75
                      ? 'text-teal-700 bg-teal-50 border-teal-200'
                      : mgr.rate >= 50
                      ? 'text-amber-700 bg-amber-50 border-amber-200'
                      : 'text-red-700 bg-red-50 border-red-200';

                  const statusBadge =
                    mgr.rate >= 90
                      ? { text: 'Conformidade Excelente', bg: 'bg-emerald-100 text-emerald-800' }
                      : mgr.rate >= 75
                      ? { text: 'Bom Desempenho', bg: 'bg-teal-100 text-teal-800' }
                      : mgr.rate >= 50
                      ? { text: 'Atenção Necessária', bg: 'bg-amber-100 text-amber-800' }
                      : { text: 'Crítico / Intervenção', bg: 'bg-red-100 text-red-800' };

                  return (
                    <div
                      key={mgr.managerName}
                      className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs hover:shadow-xs hover:border-teal-400 transition-all flex flex-col justify-between space-y-4"
                    >
                      <div>
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-teal-700 text-white flex items-center justify-center font-black text-sm shadow-2xs">
                              {mgr.managerName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <Crown size={12} className="text-amber-500" />
                                <h4 className="font-bold text-xs text-gray-900">{mgr.managerName}</h4>
                              </div>
                              <span className="text-[10px] text-gray-500 font-medium">{mgr.managerRole}</span>
                            </div>
                          </div>

                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBadge.bg}`}>
                            {statusBadge.text}
                          </span>
                        </div>

                        {/* Áreas sob sua responsabilidade */}
                        <div className="mt-3.5">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                            Áreas Sob Responsabilidade ({mgr.areas.length}):
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {mgr.areas.map(a => {
                              const meta = DEFAULT_AREA_CONFIGS[a];
                              return (
                                <span
                                  key={a}
                                  className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-800 border border-gray-200 flex items-center gap-1"
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${meta?.badgeBg || 'bg-teal-500'}`}></span>
                                  <span>{a}</span>
                                </span>
                              );
                            })}
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-4 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600 font-medium">Cumprimento das suas áreas:</span>
                            <span className="font-black text-gray-900">{mgr.completedTasks}/{mgr.totalTasks} ({mgr.rate}%)</span>
                          </div>
                          <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                mgr.rate >= 80 ? 'bg-emerald-500' : mgr.rate >= 60 ? 'bg-amber-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${mgr.rate}%` }}
                            />
                          </div>
                        </div>

                        {/* Metrics Breakdown Grid */}
                        <div className="mt-4 grid grid-cols-4 gap-2 pt-3 border-t border-gray-100 text-center">
                          <div className="bg-gray-50/80 p-2 rounded-xl border border-gray-100">
                            <span className="text-[9px] font-bold text-gray-400 uppercase block">Total</span>
                            <span className="text-xs font-black text-gray-800">{mgr.totalTasks}</span>
                          </div>
                          <div className="bg-emerald-50/50 p-2 rounded-xl border border-emerald-100">
                            <span className="text-[9px] font-bold text-emerald-600 uppercase block">Feitas</span>
                            <span className="text-xs font-black text-emerald-700">{mgr.completedTasks}</span>
                          </div>
                          <div className="bg-teal-50/50 p-2 rounded-xl border border-teal-100">
                            <span className="text-[9px] font-bold text-teal-600 uppercase block">Fotos</span>
                            <span className="text-xs font-black text-teal-700">{mgr.withPhotosTasks}</span>
                          </div>
                          <div className="bg-red-50/50 p-2 rounded-xl border border-red-100">
                            <span className="text-[9px] font-bold text-red-500 uppercase block">Pendentes</span>
                            <span className="text-xs font-black text-red-600">{mgr.pendingTasks}</span>
                          </div>
                        </div>
                      </div>

                      {/* Footer Note / Feedback */}
                      <div className="pt-2 text-[10px] text-gray-500 flex items-center justify-between border-t border-gray-100">
                        <span>{mgr.justifiedTasks} justificada(s)</span>
                        <button
                          onClick={() => setSelectedManagerFilter(mgr.managerName)}
                          className="text-teal-700 font-bold hover:underline flex items-center gap-0.5"
                        >
                          <span>Ver tarefas das áreas</span>
                          <ChevronRight size={11} />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Unassigned Areas Banner if any */}
          {unassignedAreasList.length > 0 && (
            <div className="mt-5 p-4 bg-amber-50 rounded-2xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <AlertTriangle size={20} className="text-amber-600 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900">
                    Atenção: {unassignedAreasList.length} área(s) sem gerente responsável definido
                  </h4>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Áreas sem responsável: {unassignedAreasList.join(', ')}
                  </p>
                </div>
              </div>
              {onNavigateToFlowchart && (
                <button
                  onClick={onNavigateToFlowchart}
                  className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold transition-colors shrink-0 shadow-2xs"
                >
                  Atribuir no Fluxograma
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: PONTO DE SITUAÇÃO POR ÁREA (COM GERENTE RESPONSÁVEL) */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50/80 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-teal-700" />
            <div>
              <h3 className="font-bold text-sm text-gray-900 uppercase tracking-tight">
                Ponto de Situação por Área (Com Gerente Responsável)
              </h3>
              <p className="text-[11px] text-gray-500">
                Acompanhamento detalhado de cumprimento e conformidade com evidências por área de limpeza
              </p>
            </div>
          </div>

          <div className="text-xs text-gray-500 font-semibold">
            {filteredAreaMetrics.length} de {areas.length} áreas exibidas
          </div>
        </div>

        {/* Table View of Area Status with Managers */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-100/60 text-gray-600 font-bold uppercase tracking-wider border-b border-gray-200">
              <tr>
                <th className="p-3.5">Área Operacional</th>
                <th className="p-3.5">Gerente Responsável</th>
                <th className="p-3.5 text-center">Tarefas Semanais</th>
                <th className="p-3.5 text-center">Concluídas</th>
                <th className="p-3.5 text-center">Com Fotos</th>
                <th className="p-3.5 text-center">Justificadas</th>
                <th className="p-3.5 text-center">Pendentes</th>
                <th className="p-3.5 w-48 text-right">% Cumprimento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAreaMetrics.map(area => {
                const meta = DEFAULT_AREA_CONFIGS[area.area];
                const rateColor =
                  area.rate >= 90
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    : area.rate >= 75
                    ? 'text-teal-700 bg-teal-50 border-teal-200'
                    : area.rate >= 50
                    ? 'text-amber-700 bg-amber-50 border-amber-200'
                    : 'text-red-700 bg-red-50 border-red-200';

                return (
                  <tr key={area.area} className="hover:bg-gray-50/70 transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${meta?.badgeBg || 'bg-teal-500'}`}></span>
                        <div>
                          <span className="font-bold text-gray-900 text-xs block">{area.area}</span>
                          <span className="text-[10px] text-gray-400 font-medium">
                            {meta?.category || 'Setor'}
                            {area.priority === 'alta' && ' • Alta Prioridade'}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5">
                      {area.managerName ? (
                        <div className="flex items-center gap-1.5">
                          <Crown size={12} className="text-amber-500" />
                          <span className="font-bold text-gray-900 text-xs">{area.managerName}</span>
                          {area.managerRole && (
                            <span className="text-[10px] text-gray-500">({area.managerRole})</span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 font-bold text-[10px]">
                          <AlertCircle size={10} />
                          Sem gerente
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 text-center font-semibold text-gray-700">
                      {area.total}
                    </td>

                    <td className="p-3.5 text-center font-bold text-emerald-600">
                      {area.completed}
                    </td>

                    <td className="p-3.5 text-center">
                      <span className="inline-flex items-center gap-1 font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                        <Camera size={12} />
                        <span>{area.withPhotos}</span>
                      </span>
                    </td>

                    <td className="p-3.5 text-center font-semibold text-amber-600">
                      {area.justified}
                    </td>

                    <td className="p-3.5 text-center font-bold text-red-500">
                      {area.pending}
                    </td>

                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 bg-gray-100 h-2 rounded-full overflow-hidden hidden sm:block">
                          <div
                            className={`h-full rounded-full ${
                              area.rate >= 80 ? 'bg-emerald-500' : area.rate >= 60 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${area.rate}%` }}
                          />
                        </div>
                        <span className={`px-2 py-0.5 rounded-md font-black text-xs border ${rateColor}`}>
                          {area.rate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: SUPERVISÃO POR TURNO (SHIFT MANAGERS) - COMPLEMENTAR */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50/80 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-teal-700" />
            <div>
              <h3 className="font-bold text-sm text-gray-900 uppercase tracking-tight">
                Supervisão por Turno (Abertura, Intermédio e Fecho)
              </h3>
              <p className="text-[11px] text-gray-500">
                Registo de tarefas executadas durante os turnos operacionais geridos por cada gerente
              </p>
            </div>
          </div>
          <span className="text-xs text-gray-600 font-semibold bg-gray-100 px-3 py-1 rounded-full">
            {shiftManagerMetricsList.filter(m => m.shiftsCount > 0).length} gerentes com turnos ativos
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-100/60 text-gray-600 font-bold uppercase tracking-wider border-b border-gray-200">
              <tr>
                <th className="p-3.5">Gerente de Turno</th>
                <th className="p-3.5 text-center">Turnos Geridos</th>
                <th className="p-3.5 text-center">Tarefas do Turno</th>
                <th className="p-3.5 text-center">Realizadas</th>
                <th className="p-3.5 text-center">Com Fotos</th>
                <th className="p-3.5 text-center">Justificadas</th>
                <th className="p-3.5 text-center">Pendentes</th>
                <th className="p-3.5 w-48 text-right">% Cumprimento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {shiftManagerMetricsList.map((m) => {
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
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4: JUSTIFICAÇÕES & GALERIA DE FOTOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Justificações da Semana */}
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
                    <span>Responsável: <strong className="text-gray-700">{item.manager}</strong></span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Resumo de Conformidade Operacional */}
        <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck size={20} className="text-teal-700" />
              <h3 className="font-bold text-sm text-gray-900 uppercase tracking-tight">
                Supervisão e Validação da Semana
              </h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              O plano de limpeza semanal requer supervisão contínua dos gerentes responsáveis de cada área e validação final pelo Gerente de Turno ou Diretor de Restaurante.
            </p>

            <div className="mt-4 space-y-2.5">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between text-xs">
                <span className="text-gray-600 font-medium">Estado da Semana:</span>
                <span className={`font-bold px-2.5 py-0.5 rounded-full ${
                  currentWeek.status === 'validada' || currentWeek.status === 'encerrada'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {currentWeek.status === 'validada' ? 'Validada' : currentWeek.status === 'encerrada' ? 'Encerrada' : 'Em Aberto'}
                </span>
              </div>

              {currentWeek.validatedBy && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900">
                  <span className="font-bold block mb-0.5">Validado por:</span>
                  <p>{currentWeek.validatedBy} ({currentWeek.validatedByRole || 'Gerente'}) em {currentWeek.validatedAt ? new Date(currentWeek.validatedAt).toLocaleDateString() : 'N/A'}</p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Semana {currentWeek.weekNumber} / {currentWeek.year}</span>
            <span>{totalWeekly} tarefas programadas</span>
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
