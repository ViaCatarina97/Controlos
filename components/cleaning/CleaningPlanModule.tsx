import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Sparkles, Calendar, ChevronLeft, ChevronRight, CheckCircle2, 
  ShieldCheck, Settings2, BarChart3, ListFilter, Search, 
  User, Layers, History, Printer, AlertTriangle, RefreshCw, Plus
} from 'lucide-react';
import { 
  CleaningPlanWeek, CleaningTaskItem, CleaningTemplateConfig, 
  Employee, CleaningDayOfWeek, CleaningShift, CleaningTaskStatus, ZeladorTaskStatus,
  ExtraordinaryCleaningTask
} from '../../types';
import { 
  DEFAULT_WEEKLY_CLEANING_TASKS, DEFAULT_ZELADOR_CLEANING_TASKS, 
  DEFAULT_CLEANING_AREAS, getMondayOfWeek, getWeekRange, getDatesForWeek, CLEANING_DAYS,
  CLEANING_SHIFTS 
} from './cleaningDefaults';
import { WeeklyCleaningMap } from './WeeklyCleaningMap';
import { ZeladorCleaningMap } from './ZeladorCleaningMap';
import { CleaningDashboard } from './CleaningDashboard';
import { CleaningHistory } from './CleaningHistory';
import { ExtraordinaryCleaningTab } from './ExtraordinaryCleaningTab';
import { JustificationModal } from './JustificationModal';
import { ValidateWeekModal } from './ValidateWeekModal';
import { CleaningManagementModal } from './CleaningManagementModal';
import { EvidenceCameraModal } from './EvidenceCameraModal';
import { 
  subscribeToCleaningPlans, saveCleaningPlan, getCleaningTemplate, 
  saveCleaningTemplate, subscribeToExtraordinaryCleanings,
  saveExtraordinaryCleaning, deleteExtraordinaryCleaning
} from '../../services/firebaseService';

interface CleaningPlanModuleProps {
  restaurantId: string;
  employees: Employee[];
}

export const CleaningPlanModule: React.FC<CleaningPlanModuleProps> = ({
  restaurantId,
  employees
}) => {
  // Navigation tabs - Dashboard is the primary view as requested
  const [activeTab, setActiveTab] = useState<'dashboard' | 'weekly' | 'extraordinary' | 'zelador' | 'history'>('dashboard');

  // Currently viewed week (Monday date string YYYY-MM-DD)
  const currentMondayStr = useMemo(() => {
    return getMondayOfWeek(new Date());
  }, []);

  const [selectedMonday, setSelectedMonday] = useState<string>(currentMondayStr);

  // Firestore plans and template state
  const [plans, setPlans] = useState<CleaningPlanWeek[]>([]);
  const [template, setTemplate] = useState<CleaningTemplateConfig | null>(null);
  const [extraordinaryTasks, setExtraordinaryTasks] = useState<ExtraordinaryCleaningTask[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals state
  const [isValidateModalOpen, setIsValidateModalOpen] = useState(false);
  const [isManagementModalOpen, setIsManagementModalOpen] = useState(false);
  const [justificationModalTask, setJustificationModalTask] = useState<{
    task: CleaningTaskItem;
    status?: CleaningTaskStatus;
  } | null>(null);
  const [evidenceModalData, setEvidenceModalData] = useState<{
    task: CleaningTaskItem;
    day?: CleaningDayOfWeek;
    shift?: CleaningShift;
    isZelador?: boolean;
  } | null>(null);

  // Global filters
  const [filterManager, setFilterManager] = useState<string>('all');
  const [filterDay, setFilterDay] = useState<string>('all');
  const [filterArea, setFilterArea] = useState<string>('all');
  const [searchTask, setSearchTask] = useState<string>('');

  // 1. Subscribe to Firestore cleaning plans
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = subscribeToCleaningPlans(restaurantId, (updatedPlans) => {
      setPlans(updatedPlans);
      setIsLoading(false);
    });

    // Load template
    getCleaningTemplate(restaurantId).then(tpl => {
      if (tpl) {
        setTemplate(tpl);
      } else {
        const defaultTpl: CleaningTemplateConfig = {
          id: 'default',
          restaurantId,
          weeklyTasks: DEFAULT_WEEKLY_CLEANING_TASKS,
          zeladorTasks: DEFAULT_ZELADOR_CLEANING_TASKS,
          areas: DEFAULT_CLEANING_AREAS,
          updatedAt: new Date().toISOString()
        };
        setTemplate(defaultTpl);
      }
    }).catch(err => {
      console.warn("Could not fetch cleaning template, using defaults", err);
    });

    const unsubExtra = subscribeToExtraordinaryCleanings(restaurantId, (extraTasks) => {
      setExtraordinaryTasks(extraTasks);
    });

    return () => {
      unsubscribe();
      unsubExtra();
    };
  }, [restaurantId]);

  // Tasks and Areas source (from template or defaults)
  const weeklyTasks = useMemo(() => {
    return template?.weeklyTasks && template.weeklyTasks.length > 0
      ? template.weeklyTasks
      : DEFAULT_WEEKLY_CLEANING_TASKS;
  }, [template]);

  const zeladorTasks = useMemo(() => {
    return template?.zeladorTasks && template.zeladorTasks.length > 0
      ? template.zeladorTasks
      : DEFAULT_ZELADOR_CLEANING_TASKS;
  }, [template]);

  const areas = useMemo(() => {
    return template?.areas && template.areas.length > 0
      ? template.areas
      : DEFAULT_CLEANING_AREAS;
  }, [template]);

  // Find or create current week plan
  const currentWeekPlan: CleaningPlanWeek = useMemo(() => {
    const found = plans.find(p => p.weekStartDate === selectedMonday);
    if (found) {
      return {
        ...found,
        shiftManagers: found.shiftManagers || {
          segunda: {},
          terca: {},
          quarta: {},
          quinta: {},
          sexta: {},
          sabado: {},
          domingo: {}
        },
        taskStatuses: found.taskStatuses || {},
        zeladorStatuses: found.zeladorStatuses || {}
      };
    }

    // Create fresh plan for selectedMonday
    const range = getWeekRange(selectedMonday);
    const newPlan: CleaningPlanWeek = {
      id: `plan_${selectedMonday}`,
      restaurantId,
      weekStartDate: range.weekStartDate,
      weekEndDate: range.weekEndDate,
      weekNumber: range.weekNumber,
      year: range.year,
      shiftManagers: {
        segunda: {},
        terca: {},
        quarta: {},
        quinta: {},
        sexta: {},
        sabado: {},
        domingo: {}
      },
      taskStatuses: {},
      zeladorStatuses: {},
      status: 'aberta',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    return newPlan;
  }, [plans, selectedMonday, restaurantId]);

  // Save changes to Firestore
  const updatePlan = useCallback(async (updated: CleaningPlanWeek) => {
    // Optimistic local state update
    setPlans(prev => {
      const idx = prev.findIndex(p => p.id === updated.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updated;
        return copy;
      }
      return [...prev, updated];
    });

    try {
      await saveCleaningPlan(restaurantId, updated);
    } catch (err) {
      console.error("Error saving cleaning plan:", err);
    }
  }, [restaurantId]);

  // Handlers for Weekly Cleaning
  const handleUpdateShiftManager = (day: CleaningDayOfWeek, shift: CleaningShift, managerName: string) => {
    const updated: CleaningPlanWeek = {
      ...currentWeekPlan,
      shiftManagers: {
        ...currentWeekPlan.shiftManagers,
        [day]: {
          ...(currentWeekPlan.shiftManagers[day] || {}),
          [shift]: managerName
        }
      },
      updatedAt: new Date().toISOString()
    };
    updatePlan(updated);
  };

  // Camera Evidence Modal Triggers
  const handleOpenEvidenceWeekly = (task: CleaningTaskItem, day: CleaningDayOfWeek, shift: CleaningShift) => {
    setEvidenceModalData({ task, day, shift, isZelador: false });
  };

  const handleOpenEvidenceZelador = (task: CleaningTaskItem) => {
    setEvidenceModalData({ task, isZelador: true });
  };

  const handleSaveEvidence = (data: { completedBy: string; photos: string[]; notes?: string }) => {
    if (!evidenceModalData) return;

    if (evidenceModalData.isZelador) {
      const taskId = evidenceModalData.task.id;
      const newZeladorStatuses: Record<string, ZeladorTaskStatus> = {
        ...currentWeekPlan.zeladorStatuses,
        [taskId]: {
          completed: true,
          funcionario: data.completedBy,
          comentario: data.notes,
          completedAt: new Date().toISOString(),
          photos: data.photos
        }
      };

      const updated: CleaningPlanWeek = {
        ...currentWeekPlan,
        zeladorStatuses: newZeladorStatuses,
        updatedAt: new Date().toISOString()
      };
      updatePlan(updated);
    } else {
      const { task } = evidenceModalData;
      const taskId = task.id;
      const newStatuses: Record<string, CleaningTaskStatus> = {
        ...currentWeekPlan.taskStatuses,
        [taskId]: {
          taskId,
          completed: true,
          completedBy: data.completedBy,
          completedAt: new Date().toISOString(),
          photos: data.photos,
          notes: data.notes,
          justification: undefined
        }
      };

      const updated: CleaningPlanWeek = {
        ...currentWeekPlan,
        taskStatuses: newStatuses,
        updatedAt: new Date().toISOString()
      };
      updatePlan(updated);
    }

    setEvidenceModalData(null);
  };

  const handleUnmarkEvidenceTask = () => {
    if (!evidenceModalData) return;

    if (evidenceModalData.isZelador) {
      const taskId = evidenceModalData.task.id;
      const newZeladorStatuses: Record<string, ZeladorTaskStatus> = {
        ...currentWeekPlan.zeladorStatuses,
        [taskId]: {
          ...currentWeekPlan.zeladorStatuses[taskId],
          completed: false,
          photos: []
        }
      };

      const updated: CleaningPlanWeek = {
        ...currentWeekPlan,
        zeladorStatuses: newZeladorStatuses,
        updatedAt: new Date().toISOString()
      };
      updatePlan(updated);
    } else {
      const taskId = evidenceModalData.task.id;
      const newStatuses = { ...currentWeekPlan.taskStatuses };
      delete newStatuses[taskId];

      const updated: CleaningPlanWeek = {
        ...currentWeekPlan,
        taskStatuses: newStatuses,
        updatedAt: new Date().toISOString()
      };
      updatePlan(updated);
    }

    setEvidenceModalData(null);
  };

  const handleToggleWeeklyTask = (taskId: string, day: CleaningDayOfWeek, shift: CleaningShift) => {
    const task = weeklyTasks.find(t => t.id === taskId);
    if (task) {
      handleOpenEvidenceWeekly(task, day, shift);
    }
  };

  const handleSaveJustification = (taskId: string, justification: string, notes?: string) => {
    const newStatuses: Record<string, CleaningTaskStatus> = {
      ...currentWeekPlan.taskStatuses,
      [taskId]: {
        taskId,
        completed: false,
        justification,
        notes,
        completedAt: undefined,
        completedBy: undefined
      }
    };

    const updated: CleaningPlanWeek = {
      ...currentWeekPlan,
      taskStatuses: newStatuses,
      updatedAt: new Date().toISOString()
    };
    updatePlan(updated);
  };

  const handleMarkCompletedFromModal = (taskId: string) => {
    const task = weeklyTasks.find(t => t.id === taskId);
    setJustificationModalTask(null);
    if (task) {
      handleOpenEvidenceWeekly(task, task.day, task.shift);
    }
  };

  // Handlers for Zelador Cleaning
  const handleToggleZeladorTask = (taskId: string) => {
    const current = currentWeekPlan.zeladorStatuses[taskId] || { completed: false };
    const newZeladorStatuses: Record<string, ZeladorTaskStatus> = {
      ...currentWeekPlan.zeladorStatuses,
      [taskId]: {
        ...current,
        completed: !current.completed,
        funcionario: current.funcionario || 'Gilberto Soutelo'
      }
    };

    const updated: CleaningPlanWeek = {
      ...currentWeekPlan,
      zeladorStatuses: newZeladorStatuses,
      updatedAt: new Date().toISOString()
    };
    updatePlan(updated);
  };

  const handleUpdateZeladorStatus = (taskId: string, patch: Partial<ZeladorTaskStatus>) => {
    const current = currentWeekPlan.zeladorStatuses[taskId] || { completed: false };
    const newZeladorStatuses: Record<string, ZeladorTaskStatus> = {
      ...currentWeekPlan.zeladorStatuses,
      [taskId]: {
        ...current,
        ...patch
      }
    };

    const updated: CleaningPlanWeek = {
      ...currentWeekPlan,
      zeladorStatuses: newZeladorStatuses,
      updatedAt: new Date().toISOString()
    };
    updatePlan(updated);
  };

  // Validation & Closing week handler
  const handleConfirmValidation = (validatorName: string, role: string, notes?: string) => {
    const updated: CleaningPlanWeek = {
      ...currentWeekPlan,
      status: 'validada',
      validatedBy: validatorName,
      validatedByRole: role,
      validatedAt: new Date().toISOString(),
      validationNotes: notes,
      updatedAt: new Date().toISOString()
    };
    updatePlan(updated);
  };

  const handleReopenWeek = (planId: string) => {
    const planToReopen = plans.find(p => p.id === planId);
    if (!planToReopen) return;

    const updated: CleaningPlanWeek = {
      ...planToReopen,
      status: 'aberta',
      updatedAt: new Date().toISOString()
    };
    updatePlan(updated);
  };

  // Save template customizations
  const handleSaveTasksAndAreas = async (
    updatedWeekly: CleaningTaskItem[],
    updatedZelador: CleaningTaskItem[],
    updatedAreas: string[]
  ) => {
    const newConfig: CleaningTemplateConfig = {
      id: 'default',
      restaurantId,
      weeklyTasks: updatedWeekly,
      zeladorTasks: updatedZelador,
      areas: updatedAreas,
      updatedAt: new Date().toISOString()
    };
    setTemplate(newConfig);
    try {
      await saveCleaningTemplate(restaurantId, newConfig);
    } catch (err) {
      console.error("Error saving cleaning template:", err);
    }
  };

  // Extraordinary Cleaning handlers
  const handleSaveExtraordinaryTask = async (task: ExtraordinaryCleaningTask) => {
    try {
      await saveExtraordinaryCleaning(restaurantId, task);
    } catch (err) {
      console.error("Error saving extraordinary task:", err);
    }
  };

  const handleDeleteExtraordinaryTask = async (taskId: string) => {
    try {
      await deleteExtraordinaryCleaning(restaurantId, taskId);
    } catch (err) {
      console.error("Error deleting extraordinary task:", err);
    }
  };

  const pendingExtraordinaryCount = useMemo(() => {
    return extraordinaryTasks.filter(t => !t.completed).length;
  }, [extraordinaryTasks]);

  // Navigate weeks
  const handlePrevWeek = () => {
    const d = new Date(selectedMonday);
    d.setDate(d.getDate() - 7);
    setSelectedMonday(d.toISOString().split('T')[0]);
  };

  const handleNextWeek = () => {
    const d = new Date(selectedMonday);
    d.setDate(d.getDate() + 7);
    setSelectedMonday(d.toISOString().split('T')[0]);
  };

  const handleGoToCurrentWeek = () => {
    setSelectedMonday(currentMondayStr);
  };

  // Calculate current week statistics for the top banner
  const stats = useMemo(() => {
    const totalWeekly = weeklyTasks.length;
    const completedWeekly = weeklyTasks.filter(t => currentWeekPlan.taskStatuses[t.id]?.completed).length;
    const justifiedWeekly = weeklyTasks.filter(
      t => !currentWeekPlan.taskStatuses[t.id]?.completed && currentWeekPlan.taskStatuses[t.id]?.justification
    ).length;
    const pendingWeekly = totalWeekly - completedWeekly - justifiedWeekly;
    const rate = totalWeekly > 0 ? Math.round((completedWeekly / totalWeekly) * 100) : 0;

    return { totalWeekly, completedWeekly, justifiedWeekly, pendingWeekly, rate };
  }, [weeklyTasks, currentWeekPlan]);

  const isValidated = currentWeekPlan.status === 'validada' || currentWeekPlan.status === 'encerrada';

  // Eligible managers defined face ao cargo nas definições (GERENTE_RESTAURANTE and GERENTE)
  const eligibleManagers = useMemo(() => {
    return employees.filter(
      e => e.isActive && (e.role === 'GERENTE_RESTAURANTE' || e.role === 'GERENTE')
    );
  }, [employees]);

  // Available unique managers who were assigned in the current week
  const assignedManagersInCurrentWeek = useMemo(() => {
    const set = new Set<string>();
    CLEANING_DAYS.forEach(d => {
      Object.values(currentWeekPlan.shiftManagers[d.key] || {}).forEach(name => {
        if (name) set.add(name);
      });
    });
    return Array.from(set);
  }, [currentWeekPlan]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Main Card */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-teal-100 text-teal-800">
                Operações & Higiene
              </span>
              {isValidated ? (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <ShieldCheck size={13} />
                  <span>Semana Validada</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300">
                  <AlertTriangle size={13} />
                  <span>Semana Aberta para Preenchimento</span>
                </span>
              )}
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight mt-2">
              Plano de Limpeza
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Controlo rigoroso de higienização por turnos, mapa semanal do zelador e validação de gerência.
            </p>
          </div>

          {/* Right Action buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold border border-gray-200 transition-colors"
              title="Imprimir Folha"
            >
              <Printer size={15} />
              <span className="hidden sm:inline">Imprimir</span>
            </button>

            <button
              onClick={() => setIsManagementModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-300 transition-colors"
              title="Editar tarefas, áreas e modelo padrão"
            >
              <Settings2 size={15} />
              <span>Gestão do Modelo</span>
            </button>

            {!isValidated ? (
              <button
                onClick={() => setIsValidateModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                <ShieldCheck size={16} />
                <span>Validar & Encerrar Semana</span>
              </button>
            ) : (
              <div className="px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-emerald-600" />
                <span>Validado por {currentWeekPlan.validatedBy} ({currentWeekPlan.validatedByRole || 'Gerente'})</span>
              </div>
            )}
          </div>
        </div>

        {/* Week Navigator Bar */}
        <div className="pt-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevWeek}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors"
              title="Semana Anterior"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="px-4 py-1.5 bg-teal-50/70 border border-teal-200 rounded-xl flex items-center gap-2">
              <Calendar size={16} className="text-teal-700" />
              <span className="text-xs font-black text-teal-900">
                Semana {currentWeekPlan.weekNumber}: {currentWeekPlan.weekStartDate} a {currentWeekPlan.weekEndDate}
              </span>
            </div>

            <button
              onClick={handleNextWeek}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors"
              title="Semana Seguinte"
            >
              <ChevronRight size={18} />
            </button>

            {selectedMonday !== currentMondayStr && (
              <button
                onClick={handleGoToCurrentWeek}
                className="text-xs font-bold text-teal-700 hover:underline px-2"
              >
                Voltar à Semana Atual
              </button>
            )}
          </div>

          {/* Quick Compliance Pill */}
          <div className="flex items-center gap-3 text-xs">
            <span className="text-gray-500 font-semibold">Conformidade Semanal:</span>
            <div className="w-28 bg-gray-100 h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  stats.rate >= 80 ? 'bg-emerald-500' : stats.rate >= 60 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${stats.rate}%` }}
              />
            </div>
            <span className="font-black text-gray-900">{stats.rate}%</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center border-b border-gray-200 bg-white rounded-2xl p-1.5 shadow-2xs">
        {/* Tab 1: Dashboard & Desempenho (Principal) */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'dashboard'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <BarChart3 size={16} />
          <span>Dashboard & Desempenho</span>
        </button>

        {/* Tab 2: Mapa Limpezas Semanal */}
        <button
          onClick={() => setActiveTab('weekly')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'weekly'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Sparkles size={16} />
          <span>Mapa Limpezas Semanal</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
            activeTab === 'weekly' ? 'bg-teal-800 text-white' : 'bg-gray-100 text-gray-600'
          }`}>
            {stats.completedWeekly}/{stats.totalWeekly}
          </span>
        </button>

        {/* Tab 3: Limpezas Extraordinárias */}
        <button
          onClick={() => setActiveTab('extraordinary')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'extraordinary'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Sparkles size={16} />
          <span>Limpezas Extraordinárias</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
            activeTab === 'extraordinary'
              ? 'bg-teal-800 text-white'
              : pendingExtraordinaryCount > 0
                ? 'bg-amber-100 text-amber-800 border border-amber-300 font-black'
                : 'bg-gray-100 text-gray-600'
          }`}>
            {pendingExtraordinaryCount > 0 ? `${pendingExtraordinaryCount} pendente(s)` : extraordinaryTasks.length}
          </span>
        </button>

        {/* Tab 4: Mapa Limpezas Zelador */}
        <button
          onClick={() => setActiveTab('zelador')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'zelador'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Layers size={16} />
          <span>Mapa Limpezas Zelador</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
            activeTab === 'zelador' ? 'bg-teal-800 text-white' : 'bg-gray-100 text-gray-600'
          }`}>
            {zeladorTasks.length}
          </span>
        </button>

        {/* Tab 4: Histórico */}
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'history'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <History size={16} />
          <span>Histórico</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
            activeTab === 'history' ? 'bg-teal-800 text-white' : 'bg-gray-100 text-gray-600'
          }`}>
            {plans.length}
          </span>
        </button>
      </div>

      {/* Global Filters Bar (active on weekly & zelador tabs) */}
      {(activeTab === 'weekly' || activeTab === 'zelador') && (
        <div className="bg-white p-4 rounded-2xl shadow-xs border border-gray-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ListFilter size={16} className="text-teal-700" />
            <span className="text-xs font-bold uppercase tracking-wider text-gray-700">Filtros:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 flex-1 justify-end">
            {/* Filter by Gerente (Face ao cargo nas definições) */}
            {activeTab === 'weekly' && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-gray-500 uppercase">Gerente:</span>
                <select
                  value={filterManager}
                  onChange={(e) => setFilterManager(e.target.value)}
                  className="p-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-hidden"
                >
                  <option value="all">Todos os Gerentes</option>
                  {eligibleManagers.map(emp => (
                    <option key={emp.id} value={emp.name}>
                      {emp.name} ({emp.role === 'GERENTE_RESTAURANTE' ? 'Gerente Restaurante' : 'Gerente'})
                    </option>
                  ))}
                  {assignedManagersInCurrentWeek
                    .filter(name => !eligibleManagers.some(em => em.name === name))
                    .map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                </select>
              </div>
            )}

            {/* Filter by Período (Dia) */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-gray-500 uppercase">Dia:</span>
              <select
                value={filterDay}
                onChange={(e) => setFilterDay(e.target.value)}
                className="p-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-hidden"
              >
                <option value="all">Todos os Dias</option>
                {CLEANING_DAYS.map(d => (
                  <option key={d.key} value={d.key}>{d.label}</option>
                ))}
              </select>
            </div>

            {/* Filter by Área */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-gray-500 uppercase">Área:</span>
              <select
                value={filterArea}
                onChange={(e) => setFilterArea(e.target.value)}
                className="p-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-hidden"
              >
                <option value="all">Todas as Áreas</option>
                {areas.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            {/* Search by Tarefa */}
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2 text-gray-400" />
              <input
                type="text"
                value={searchTask}
                onChange={(e) => setSearchTask(e.target.value)}
                placeholder="Pesquisar tarefa..."
                className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 outline-hidden w-40 sm:w-48"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 1: Mapa Limpezas Semanal */}
      {activeTab === 'weekly' && (
        <WeeklyCleaningMap
          currentWeek={currentWeekPlan}
          weeklyTasks={weeklyTasks}
          areas={areas}
          employees={employees}
          readOnly={isValidated}
          filterManager={filterManager}
          filterDay={filterDay}
          filterArea={filterArea}
          searchTask={searchTask}
          onUpdateShiftManager={handleUpdateShiftManager}
          onOpenEvidenceModal={handleOpenEvidenceWeekly}
          onOpenJustification={(task, status) => setJustificationModalTask({ task, status })}
        />
      )}

      {/* Tab 2: Mapa Limpezas Zelador */}
      {activeTab === 'zelador' && (
        <ZeladorCleaningMap
          currentWeek={currentWeekPlan}
          zeladorTasks={zeladorTasks}
          employees={employees}
          readOnly={isValidated}
          filterDay={filterDay}
          filterArea={filterArea}
          searchTask={searchTask}
          onToggleZeladorTask={handleToggleZeladorTask}
          onOpenEvidenceModal={handleOpenEvidenceZelador}
          onUpdateZeladorStatus={handleUpdateZeladorStatus}
        />
      )}

      {/* Tab 3: Dashboard & Desempenho */}
      {activeTab === 'dashboard' && (
        <CleaningDashboard
          currentWeek={currentWeekPlan}
          allWeeks={plans}
          weeklyTasks={weeklyTasks}
          zeladorTasks={zeladorTasks}
          areas={areas}
          employees={employees}
        />
      )}

      {/* Tab: Limpezas Extraordinárias */}
      {activeTab === 'extraordinary' && (
        <ExtraordinaryCleaningTab
          tasks={extraordinaryTasks}
          areas={areas}
          employees={employees}
          restaurantId={restaurantId}
          onSaveTask={handleSaveExtraordinaryTask}
          onDeleteTask={handleDeleteExtraordinaryTask}
        />
      )}

      {/* Tab 4: Histórico */}
      {activeTab === 'history' && (
        <CleaningHistory
          plans={plans}
          weeklyTasks={weeklyTasks}
          currentWeekId={currentWeekPlan.id}
          onSelectWeek={(weekStart) => {
            setSelectedMonday(weekStart);
            setActiveTab('weekly');
          }}
          onReopenWeek={handleReopenWeek}
        />
      )}

      {/* MODALS */}
      {/* 1. Justification Modal */}
      <JustificationModal
        isOpen={Boolean(justificationModalTask)}
        task={justificationModalTask?.task || null}
        shiftLabel={justificationModalTask?.task?.shift}
        dayLabel={justificationModalTask?.task?.day}
        currentStatus={justificationModalTask?.status}
        currentManager={
          justificationModalTask?.task?.shift &&
          currentWeekPlan.shiftManagers[justificationModalTask.task.day]?.[justificationModalTask.task.shift]
        }
        onClose={() => setJustificationModalTask(null)}
        onSaveJustification={handleSaveJustification}
        onMarkCompleted={handleMarkCompletedFromModal}
      />

      {/* 2. Validate & Close Week Modal */}
      <ValidateWeekModal
        isOpen={isValidateModalOpen}
        currentWeek={currentWeekPlan}
        employees={employees}
        completionStats={stats}
        onClose={() => setIsValidateModalOpen(false)}
        onConfirmValidation={handleConfirmValidation}
      />

      {/* 3. Manage Tasks & Areas Modal */}
      <CleaningManagementModal
        isOpen={isManagementModalOpen}
        weeklyTasks={weeklyTasks}
        zeladorTasks={zeladorTasks}
        areas={areas}
        onClose={() => setIsManagementModalOpen(false)}
        onSaveTasksAndAreas={handleSaveTasksAndAreas}
      />

      {/* 4. Evidence Camera Modal (Mandatory min 1 photo for marking done) */}
      <EvidenceCameraModal
        isOpen={Boolean(evidenceModalData)}
        taskTitle={evidenceModalData?.task?.tarefa || ''}
        taskArea={evidenceModalData?.task?.area || ''}
        dayLabel={
          evidenceModalData?.day
            ? CLEANING_DAYS.find(d => d.key === evidenceModalData.day)?.label || evidenceModalData.day
            : undefined
        }
        shiftLabel={
          evidenceModalData?.shift
            ? CLEANING_SHIFTS.find(s => s.key === evidenceModalData.shift)?.label || evidenceModalData.shift
            : (evidenceModalData?.isZelador ? 'Zelador Semanal' : undefined)
        }
        currentStatus={
          evidenceModalData?.isZelador
            ? (evidenceModalData.task
                ? {
                    taskId: evidenceModalData.task.id,
                    completed: currentWeekPlan.zeladorStatuses?.[evidenceModalData.task.id]?.completed || false,
                    completedBy: currentWeekPlan.zeladorStatuses?.[evidenceModalData.task.id]?.funcionario,
                    completedAt: currentWeekPlan.zeladorStatuses?.[evidenceModalData.task.id]?.completedAt,
                    photos: currentWeekPlan.zeladorStatuses?.[evidenceModalData.task.id]?.photos || [],
                    notes: currentWeekPlan.zeladorStatuses?.[evidenceModalData.task.id]?.comentario
                  }
                : undefined)
            : (evidenceModalData?.task
                ? currentWeekPlan.taskStatuses?.[evidenceModalData.task.id]
                : undefined)
        }
        assignedManager={
          evidenceModalData?.day && evidenceModalData?.shift
            ? currentWeekPlan.shiftManagers?.[evidenceModalData.day]?.[evidenceModalData.shift]
            : undefined
        }
        eligibleManagers={eligibleManagers.length > 0 ? eligibleManagers : employees}
        readOnly={isValidated}
        onClose={() => setEvidenceModalData(null)}
        onSaveEvidence={handleSaveEvidence}
        onUnmarkTask={handleUnmarkEvidenceTask}
      />
    </div>
  );
};
