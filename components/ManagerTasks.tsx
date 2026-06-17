import React, { useState, useEffect, useMemo } from 'react';
import { 
  ClipboardCheck, History, Plus, Trash2, Save, Printer, 
  CheckCircle, Clock, AlertCircle, Sparkles, Filter, CheckSquare, 
  Square, Calendar, User, UserCheck, ShieldAlert, X, Eye, Pencil
} from 'lucide-react';
import { Employee, ManagerTask, ManagerTaskChecklist, AppSettings } from '../types';
import { 
  getManagerTasks, saveManagerTasks, 
  getManagerChecklists, saveManagerChecklists 
} from '../services/firebaseService';

interface ManagerTasksProps {
  restaurantId: string;
  employees: Employee[];
  settings: AppSettings;
  activeSubTab?: 'checklist' | 'history' | 'admin';
  onTabChange?: (tab: 'checklist' | 'history' | 'admin') => void;
}

export const ManagerTasks: React.FC<ManagerTasksProps> = ({ 
  restaurantId, 
  employees, 
  settings,
  activeSubTab = 'checklist',
  onTabChange = (tab: 'checklist' | 'history' | 'admin') => {}
}) => {
  // --- STATE ---
  const [tasks, setTasks] = useState<ManagerTask[]>([]);
  const [checklists, setChecklists] = useState<ManagerTaskChecklist[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Active Checklist Workspace parameters
  const [selectedManagerId, setSelectedManagerId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${mm}`;
  });
  const [selectedDept, setSelectedDept] = useState<string>('Geral');

  // Currently loaded checklist answers
  const [currentAnswers, setCurrentAnswers] = useState<{[taskId: string]: {
    week1?: boolean; week2?: boolean; week3?: boolean; week4?: boolean; month?: boolean;
  }}>({});
  const [currentComments, setCurrentComments] = useState<string>('');
  const [currentNotes, setCurrentNotes] = useState<string>('');
  const [currentChecklistId, setCurrentChecklistId] = useState<string>('');
  const [isApproved, setIsApproved] = useState<boolean>(false);
  const [approvedDetails, setApprovedDetails] = useState<{by?: string; at?: string}>({});
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [reviewChecklist, setReviewChecklist] = useState<ManagerTaskChecklist | null>(null);
  const [reviewValidatorName, setReviewValidatorName] = useState<string>('');

  // Admin Task form states
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDept, setNewTaskDept] = useState('Qualidade');
  const [newTaskTargetManager, setNewTaskTargetManager] = useState<string>('all'); // 'all' or manager's employeeID

  // Active print overlay selection
  const [printChecklist, setPrintChecklist] = useState<ManagerTaskChecklist | null>(null);

  // --- DERIVED DATA ---
  const managers = useMemo(() => {
    return employees.filter(e => e.role?.toUpperCase() === 'GERENTE' && e.isActive);
  }, [employees]);

  const departments = ['Geral', 'Qualidade', 'Higiene', 'Segurança', 'Financeiro', 'Recursos Humanos'];

  // Initialize selected manager to the first manager in the list
  useEffect(() => {
    if (managers.length > 0 && !selectedManagerId) {
      setSelectedManagerId(managers[0].id);
    }
  }, [managers, selectedManagerId]);

  // Load Tasks and Checklists from Firebase on mount or restaurant change
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const loadedTasks = await getManagerTasks(restaurantId);
        const loadedChecklists = await getManagerChecklists(restaurantId);
        if (active) {
          setTasks(loadedTasks);
          setChecklists(loadedChecklists);
          setIsLoaded(true);
        }
      } catch (err) {
        console.error('Failed to load manager task services:', err);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [restaurantId]);

  // Compute standard ID for the current select parameters
  const activeComputedId = useMemo(() => {
    if (!selectedManagerId || !selectedMonth) return '';
    const deptSlug = selectedDept.toLowerCase().replace(/\s+/g, '_');
    return `checklist_${restaurantId}_${selectedManagerId}_${selectedMonth}_${deptSlug}`;
  }, [restaurantId, selectedManagerId, selectedMonth, selectedDept]);

  // Update form inputs when selected manager, month, or department changes
  useEffect(() => {
    if (!isLoaded || !activeComputedId) return;

    const existing = checklists.find(c => c.id === activeComputedId);
    if (existing) {
      setCurrentAnswers(existing.taskAnswers || {});
      setCurrentComments(existing.comments || '');
      setCurrentNotes(existing.notes || '');
      setCurrentChecklistId(existing.id);
      setIsApproved(!!existing.isApproved);
      setApprovedDetails({ by: existing.approvedBy, at: existing.approvedAt });
      setIsCompleted(!!existing.isCompleted);
    } else {
      setCurrentAnswers({});
      setCurrentComments('');
      setCurrentNotes('');
      setCurrentChecklistId('');
      setIsApproved(false);
      setApprovedDetails({});
      setIsCompleted(false);
    }
  }, [activeComputedId, checklists, isLoaded]);

  // Filter tasks that belong to the current department AND are associated with the selected manager (or 'all')
  const filteredTasksForActiveSheet = useMemo(() => {
    return tasks.filter(t => {
      // Department filter
      if (selectedDept !== 'Geral' && t.department !== selectedDept) return false;
      // Manager association filter
      const belongs = !(t as any).managerIds || (t as any).managerIds.length === 0 || (t as any).managerIds.includes(selectedManagerId);
      return belongs;
    });
  }, [tasks, selectedDept, selectedManagerId]);

  // --- ACTIONS ---

  // Add a new task to lists
  const handleAddTask = async () => {
    if (!newTaskName.trim()) return;
    const id = `task_${Date.now()}`;
    const newTaskObj: ManagerTask = {
      id,
      name: newTaskName.trim(),
      department: newTaskDept,
    };
    if (newTaskTargetManager !== 'all') {
      (newTaskObj as any).managerIds = [newTaskTargetManager];
    } else {
      (newTaskObj as any).managerIds = [];
    }

    const updatedTasks = [...tasks, newTaskObj];
    setTasks(updatedTasks);
    setNewTaskName('');
    
    try {
      await saveManagerTasks(restaurantId, updatedTasks);
    } catch (err) {
      console.error('Failed to save tasks:', err);
    }
  };

  // Delete a task
  const handleDeleteTask = async (id: string) => {
    if (!window.confirm('Tem a certeza que deseja eliminar esta tarefa de forma definitiva?')) return;
    const updatedTasks = tasks.filter(t => t.id !== id);
    setTasks(updatedTasks);
    try {
      await saveManagerTasks(restaurantId, updatedTasks);
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  // Toggle answer checkboxes in current workspace
  const handleToggleAnswer = (taskId: string, col: 'week1' | 'week2' | 'week3' | 'week4' | 'month') => {
    if (isApproved) {
      alert('Esta checklist já se encontra VALIDADA e encerrada!');
      return;
    }
    setCurrentAnswers(prev => {
      const taskAns = prev[taskId] || {};
      return {
        ...prev,
        [taskId]: {
          ...taskAns,
          [col]: !taskAns[col]
        }
      };
    });
  };

  // Save current workspace checklist
  const handleSaveChecklist = async () => {
    if (!selectedManagerId) {
      alert('Selecione primeiro um gerente!');
      return;
    }
    setIsSaving(true);
    const mName = employees.find(e => e.id === selectedManagerId)?.name || 'Gerente';
    
    const checklistObj: ManagerTaskChecklist = {
      id: activeComputedId,
      restaurantId,
      managerId: selectedManagerId,
      managerName: mName,
      department: selectedDept,
      monthYear: selectedMonth,
      taskAnswers: currentAnswers,
      comments: currentComments,
      notes: currentNotes,
      isCompleted: isCompleted,
      isApproved: isApproved,
      approvedBy: approvedDetails.by,
      approvedAt: approvedDetails.at
    };

    let updatedChecklists = [...checklists];
    const existsIdx = updatedChecklists.findIndex(c => c.id === activeComputedId);
    if (existsIdx >= 0) {
      updatedChecklists[existsIdx] = checklistObj;
    } else {
      updatedChecklists.push(checklistObj);
    }

    setChecklists(updatedChecklists);
    try {
      await saveManagerChecklists(restaurantId, updatedChecklists);
    } catch (err) {
      console.error('Failed to save checklist:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Helper validation callback from supervisor modal view
  const handleValidateModalConfirm = async (chk: ManagerTaskChecklist, validatorName: string) => {
    if (!validatorName.trim()) {
      alert('Por favor introduza o nome do responsável.');
      return;
    }
    const nowStr = new Date().toISOString();
    const updatedChecklist: ManagerTaskChecklist = {
      ...chk,
      isApproved: true,
      approvedBy: validatorName.trim(),
      approvedAt: nowStr,
      isCompleted: true // A validated checklist is obviously completed
    };

    const updatedChecklists = checklists.map(c => c.id === chk.id ? updatedChecklist : c);
    setChecklists(updatedChecklists);
    setReviewChecklist(null); // Close modal
    
    // Also, if the active sheet is the one being validated, update active states!
    if (chk.id === activeComputedId) {
      setIsApproved(true);
      setApprovedDetails({ by: validatorName.trim(), at: nowStr });
      setIsCompleted(true);
    }

    try {
      await saveManagerChecklists(restaurantId, updatedChecklists);
      alert('Checklist validada com sucesso pelo responsável!');
    } catch (err) {
      console.error('Failed to validate checklist from modal:', err);
    }
  };

  // Approve / Validate a checklist (responsible validation)
  const handleToggleValidate = async () => {
    if (!activeComputedId) return;
    
    if (isApproved) {
      // Un-approve
      if (!window.confirm('Deseja retirar a validação desta checklist?')) return;
      setIsApproved(false);
      setApprovedDetails({});
      
      const updated = checklists.map(c => {
         if (c.id === activeComputedId) {
           return { ...c, isApproved: false, approvedBy: undefined, approvedAt: undefined };
         }
         return c;
      });
      setChecklists(updated);
      await saveManagerChecklists(restaurantId, updated);
      return;
    }

    // Approve
    const nameInput = prompt('Introduza o nome do responsável pela validação:');
    if (!nameInput || !nameInput.trim()) return;

    const byName = nameInput.trim();
    const nowStr = new Date().toISOString();
    setIsApproved(true);
    setApprovedDetails({ by: byName, at: nowStr });
    setIsCompleted(true); // also make sure it is marked as completed on validation

    // Build the completed object
    const mName = employees.find(e => e.id === selectedManagerId)?.name || 'Gerente';
    const checklistObj: ManagerTaskChecklist = {
      id: activeComputedId,
      restaurantId,
      managerId: selectedManagerId,
      managerName: mName,
      department: selectedDept,
      monthYear: selectedMonth,
      taskAnswers: currentAnswers,
      comments: currentComments,
      notes: currentNotes,
      isCompleted: true,
      isApproved: true,
      approvedBy: byName,
      approvedAt: nowStr
    };

    let updatedChecklists = [...checklists];
    const existsIdx = updatedChecklists.findIndex(c => c.id === activeComputedId);
    if (existsIdx >= 0) {
      updatedChecklists[existsIdx] = checklistObj;
    } else {
      updatedChecklists.push(checklistObj);
    }

    setChecklists(updatedChecklists);
    try {
      await saveManagerChecklists(restaurantId, updatedChecklists);
    } catch (err) {
      console.error('Failed to validate checklist:', err);
    }
  };

  // Helper date conversions
  const formatMonthPortuguese = (monthYearStr: string) => {
    if (!monthYearStr) return '';
    const [year, month] = monthYearStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleString('pt-PT', { month: 'long', year: 'numeric' }).toUpperCase();
  };

  // Compliance calculations for a checklist
  const calculateCompliancePercent = (chk: ManagerTaskChecklist) => {
    // Collect all tasks and see how many boxes are checked
    const relevantTasks = tasks.filter(t => {
      if (chk.department !== 'Geral' && t.department !== chk.department) return false;
      const belongs = !(t as any).managerIds || (t as any).managerIds.length === 0 || (t as any).managerIds.includes(chk.managerId);
      return belongs;
    });

    if (relevantTasks.length === 0) return 0;

    let checkedCount = 0;
    let totalPossible = relevantTasks.length * 5; // 4 weeks + monthly box

    relevantTasks.forEach(t => {
      const ans = chk.taskAnswers?.[t.id];
      if (ans) {
        if (ans.week1) checkedCount++;
        if (ans.week2) checkedCount++;
        if (ans.week3) checkedCount++;
        if (ans.week4) checkedCount++;
        if (ans.month) checkedCount++;
      }
    });

    return Math.round((checkedCount / totalPossible) * 100);
  };

  // Calculate current active checklist metrics
  const activeMetrics = useMemo(() => {
    if (filteredTasksForActiveSheet.length === 0) return { checked: 0, total: 0, percent: 0 };
    let checkedCount = 0;
    let totalPossible = filteredTasksForActiveSheet.length * 5;
    
    filteredTasksForActiveSheet.forEach(t => {
      const ans = currentAnswers[t.id];
      if (ans) {
        if (ans.week1) checkedCount++;
        if (ans.week2) checkedCount++;
        if (ans.week3) checkedCount++;
        if (ans.week4) checkedCount++;
        if (ans.month) checkedCount++;
      }
    });

    return {
      checked: checkedCount,
      total: totalPossible,
      percent: Math.round((checkedCount / totalPossible) * 100)
    };
  }, [filteredTasksForActiveSheet, currentAnswers]);

  // Open the landscape print dialog natively for a checklist
  const triggerPrintChecklist = (chk: ManagerTaskChecklist) => {
    setPrintChecklist(chk);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  // Load a historic checklist back into active editor
  const handleLoadFromHistory = (chk: ManagerTaskChecklist) => {
    setSelectedManagerId(chk.managerId);
    setSelectedMonth(chk.monthYear);
    setSelectedDept(chk.department);
    onTabChange('checklist');
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* HEADER SECTION */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <ClipboardCheck className="text-[#a51c24] stroke-[2.5]" size={22} />
            Tarefas de Gerentes
          </h1>
          <p className="text-xs text-gray-500 mt-1">Checklists e acompanhamento operacional complementar de gerentes por departamento.</p>
        </div>

        {/* GERENTE TAB CLUSTER */}
        <div className="flex flex-wrap bg-[#F1F5F9] p-1.5 rounded-2xl self-start md:self-center border border-slate-200 shadow-inner gap-1 max-w-full">
          {managers.map(mgr => {
            const isSelected = selectedManagerId === mgr.id && activeSubTab === 'checklist';
            return (
              <button 
                key={mgr.id}
                onClick={() => {
                  setSelectedManagerId(mgr.id);
                  onTabChange('checklist');
                }}
                className={`px-4 py-2.5 font-black text-xs uppercase tracking-wider rounded-xl transition-all duration-300 ${
                  isSelected 
                    ? 'bg-[#2c532c] text-white shadow-md border-[3px] border-blue-500' 
                    : 'text-slate-650 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                {mgr.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* --- Tab 1: ACTIVE CHECKLIST WORKSPACE --- */}
      {activeSubTab === 'checklist' && (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start print:block">
          
          {/* Work filters (LEFT PANELS ON DESKTOP, HIDDEN ON PRINT) */}
          <div className="xl:col-span-1 space-y-4 print:hidden">
            <div className="bg-white p-5 rounded-2xl border border-slate-150 space-y-4 shadow-sm">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5 border-b pb-2">
                <Filter size={14} className="text-[#a51c24]" />
                Parâmetros da Folha
              </h2>

              {/* MANAGER SELECT */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">Gerente</label>
                <div className="relative">
                  <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select
                    id="checklist_select_manager"
                    value={selectedManagerId}
                    onChange={(e) => setSelectedManagerId(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 focus:ring-1 focus:ring-blue-500"
                  >
                    {managers.map(e => (
                      <option key={e.id} value={e.id}>{e.name} {e.mecanografico ? `(Nº ${e.mecanografico})` : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* MONTH SELECT */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">Mês de Referência</label>
                <div className="relative">
                  <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="checklist_select_month"
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800"
                  />
                </div>
              </div>

              {/* DEPT SELECT */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">Mesa / Departamento</label>
                <select
                  id="checklist_select_department"
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 focus:ring-1 focus:ring-blue-500"
                >
                  {departments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* STATUS INDICATOR CARD */}
              <div className="pt-3 border-t space-y-3">
                <div className={`p-3.5 rounded-xl border flex flex-col items-center justify-center text-center ${
                  isApproved 
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800' 
                    : isCompleted
                      ? 'border-blue-200 bg-blue-50 text-blue-850'
                      : 'border-amber-200 bg-amber-50 text-amber-800'
                }`}>
                  {isApproved ? (
                    <>
                      <UserCheck size={20} className="text-emerald-600 mb-1" />
                      <span className="text-[10px] font-black uppercase tracking-wider">Checklist Validada</span>
                      <span className="text-[9px] font-medium opacity-80 mt-1">Por: {approvedDetails.by}</span>
                      <span className="text-[8px] text-gray-400 mt-0.5">{approvedDetails.at ? new Date(approvedDetails.at).toLocaleDateString() : ''}</span>
                    </>
                  ) : isCompleted ? (
                    <>
                      <CheckCircle size={20} className="text-blue-600 mb-1" />
                      <span className="text-[10px] font-black uppercase tracking-wider">Checklist Concluída</span>
                      <span className="text-[9px] opacity-85 mt-1 font-medium">Aguardando validação do responsável</span>
                    </>
                  ) : (
                    <>
                      <Clock size={20} className="text-amber-600 mb-1" />
                      <span className="text-[10px] font-black uppercase tracking-wider">Estado: Em aberto</span>
                      <span className="text-[9px] opacity-80 mt-1">Gerente em preenchimento ativo</span>
                    </>
                  )}
                </div>

                {/* MANAGER COMPLETION TOGGLE BUTTON */}
                {!isApproved && (
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCompleted(!isCompleted);
                      }}
                      className={`w-full py-2 px-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all text-center cursor-pointer ${
                        isCompleted
                          ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-200'
                          : 'bg-[#2c532c] hover:bg-emerald-950 text-white shadow-sm'
                      }`}
                    >
                      {isCompleted ? (
                        <>
                          <Clock size={14} />
                          Reabrir Checklist
                        </>
                      ) : (
                        <>
                          <CheckCircle size={14} />
                          Finalizar Checklist
                        </>
                      )}
                    </button>
                    <p className="text-[9px] text-gray-400 text-center leading-tight">
                      {isCompleted 
                        ? "Recoloca o estado 'Em aberto' para fazer alterações." 
                        : "Marca como 'Concluída' para que o responsável a possa validar."}
                    </p>
                  </div>
                )}

                {/* VALIDATOR DROP LIST */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">Responsável pela Validação</label>
                  <div className="relative">
                    <UserCheck size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold" />
                    <select
                      id="checklist_select_validator"
                      value={approvedDetails.by || ''}
                      onChange={async (e) => {
                        const valName = e.target.value;
                        if (!valName) {
                          // Un-approve
                          setIsApproved(false);
                          setApprovedDetails({});
                          const updated = checklists.map(c => {
                            if (c.id === activeComputedId) {
                              return { ...c, isApproved: false, approvedBy: undefined, approvedAt: undefined };
                            }
                            return c;
                          });
                          setChecklists(updated);
                          await saveManagerChecklists(restaurantId, updated);
                        } else {
                          // Approve
                          const nowStr = new Date().toISOString();
                          setIsApproved(true);
                          setApprovedDetails({ by: valName, at: nowStr });
                          setIsCompleted(true);
                          
                          const mName = employees.find(emp => emp.id === selectedManagerId)?.name || 'Gerente';
                          const checklistObj: ManagerTaskChecklist = {
                            id: activeComputedId,
                            restaurantId,
                            managerId: selectedManagerId,
                            managerName: mName,
                            department: selectedDept,
                            monthYear: selectedMonth,
                            taskAnswers: currentAnswers,
                            comments: currentComments,
                            notes: currentNotes,
                            isCompleted: true,
                            isApproved: true,
                            approvedBy: valName,
                            approvedAt: nowStr
                          };
                          
                          let updatedChecklists = [...checklists];
                          const existsIdx = updatedChecklists.findIndex(c => c.id === activeComputedId);
                          if (existsIdx >= 0) {
                            updatedChecklists[existsIdx] = checklistObj;
                          } else {
                            updatedChecklists.push(checklistObj);
                          }
                          setChecklists(updatedChecklists);
                          await saveManagerChecklists(restaurantId, updatedChecklists);
                        }
                      }}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 focus:ring-1 focus:ring-[#2c532c]"
                    >
                      <option value="">— Sem Validação —</option>
                      {managers.map(e => (
                        <option key={e.id} value={e.name}>{e.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Metrics of Active Sheet */}
            <div className="bg-white p-5 rounded-2xl border border-slate-150 space-y-3 shadow-sm">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[#2c532c]">Cumprimento Desta Folha</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 tracking-tight">{activeMetrics.percent}%</span>
                <span className="text-xs font-medium text-gray-500">({activeMetrics.checked} de {activeMetrics.total} registos)</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-300" 
                  style={{ width: `${activeMetrics.percent}%` }}
                />
              </div>
            </div>
          </div>

          {/* ACTIVE SHEET LAYOUT (MIDDLE/RIGHT GRID SPANS) */}
          <div className="xl:col-span-3 space-y-6 print:block">
            
            {/* Top workspace action buttons */}
            <div className="bg-white p-4 rounded-xl border border-slate-150 flex items-center justify-between shadow-sm print:hidden">
              <span className="text-[11px] font-semibold text-slate-500">
                Lembrete: Preencha todas as semanas e clique em "Gravar Checklist"
              </span>

              <div className="flex gap-2">
                <button
                  id="action_print_current_checklist"
                  onClick={() => {
                    const currentManagerObj = employees.find(e => e.id === selectedManagerId);
                    triggerPrintChecklist({
                      id: activeComputedId,
                      restaurantId,
                      managerId: selectedManagerId,
                      managerName: currentManagerObj?.name || 'Gerente',
                      department: selectedDept,
                      monthYear: selectedMonth,
                      taskAnswers: currentAnswers,
                      comments: currentComments,
                      notes: currentNotes,
                      isApproved,
                      approvedBy: approvedDetails.by,
                      approvedAt: approvedDetails.at
                    });
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer size={13} />
                  Imprimir Folha
                </button>

                <button
                  id="action_save_current_checklist"
                  onClick={handleSaveChecklist}
                  disabled={isSaving}
                  className="px-5 py-2 bg-[#a51c24] hover:bg-[#86161c] text-white font-extrabold text-xs uppercase tracking-wider rounded-lg shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Save size={13} />
                  {isSaving ? 'A gravar...' : 'Gravar Checklist'}
                </button>
              </div>
            </div>

            {/* PRINTABLE REAL-WORLD CHECKLIST COPY (Always present, but hidden except in printing) */}
            <div id="physical_mcd_checklist" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md flex flex-col space-y-6 print:border-none print:shadow-none print:p-0">
              
              {/* Checklist Logo Header */}
              <div className="border border-slate-900 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 bg-amber-500 rounded-lg flex items-center justify-center p-1 font-black text-white text-3xl">
                    M
                  </div>
                  <div>
                    <span className="block text-[10px] font-black tracking-widest text-[#2c532c] uppercase">VIA CATARINA</span>
                    <h2 className="text-2xl font-black uppercase text-slate-950 tracking-tight leading-none mt-0.5">Lista de Tarefas</h2>
                  </div>
                </div>
              </div>

              {/* Sub-Header Variables */}
              <div className="border border-slate-900 p-4.5 grid grid-cols-3 gap-6 text-center bg-slate-50/50">
                <div className="space-y-1">
                  <span className="block text-[9px] font-black text-slate-500 uppercase tracking-widest">GERENTE</span>
                  <div className="border border-slate-800 bg-white px-3 py-1.5 font-bold text-xs text-slate-900 rounded select-none truncate">
                    {employees.find(e => e.id === selectedManagerId)?.name.toUpperCase() || '—'}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="block text-[9px] font-black text-slate-500 uppercase tracking-widest">DEPARTAMENTO</span>
                  <div className="border border-slate-800 bg-white px-3 py-1.5 font-bold text-xs text-slate-900 rounded select-none">
                    {selectedDept.toUpperCase()}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="block text-[9px] font-black text-slate-500 uppercase tracking-widest">MÊS</span>
                  <div className="border border-slate-800 bg-white px-3 py-1.5 font-extrabold text-xs text-[#a51c24] rounded select-none">
                    {formatMonthPortuguese(selectedMonth)}
                  </div>
                </div>
              </div>

              {/* Task table list */}
              <div className="border border-slate-900 overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs text-slate-900">
                  <thead className="bg-[#2c532c] text-white">
                    <tr className="border-b border-slate-950">
                      <th className="px-4 py-2.5 font-black uppercase text-[10px] tracking-wider w-[55%]">TAREFA</th>
                      <th className="px-2 py-2.5 font-black uppercase text-[9px] tracking-wider text-center border-l border-slate-900">SEMANA 1</th>
                      <th className="px-2 py-2.5 font-black uppercase text-[9px] tracking-wider text-center border-l border-slate-900">SEMANA 2</th>
                      <th className="px-2 py-2.5 font-black uppercase text-[9px] tracking-wider text-center border-l border-slate-900">SEMANA 3</th>
                      <th className="px-2 py-2.5 font-black uppercase text-[9px] tracking-wider text-center border-l border-slate-900">SEMANA 4</th>
                      <th className="px-2 py-2.5 font-black uppercase text-[9px] tracking-wider text-center border-l border-slate-900">MÊS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasksForActiveSheet.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">
                          Nenhuma tarefa definida para este gerente no departamento {selectedDept}. Vá ao separador "Gestão de Tarefas" para adicionar tarefas!
                        </td>
                      </tr>
                    ) : (
                      filteredTasksForActiveSheet.map((t, idx) => {
                        const ans = currentAnswers[t.id] || {};
                        return (
                          <tr key={t.id} className="border-b border-slate-900 hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 font-semibold text-xs leading-snug border-r border-slate-900">
                              <span className="text-[10px] text-gray-400 font-mono mr-1">{idx + 1}.</span>
                              {t.name}
                            </td>
                            
                            {/* Week 1 */}
                            <td className="px-2 py-3 text-center border-r border-slate-900 select-none">
                              <button
                                type="button"
                                onClick={() => handleToggleAnswer(t.id, 'week1')}
                                className="inline-flex items-center justify-center rounded focus:outline-none transition-transform active:scale-90"
                              >
                                {ans.week1 ? (
                                  <CheckSquare size={18} className="text-emerald-700 stroke-[2.5]" />
                                ) : (
                                  <Square size={18} className="text-slate-300 hover:text-slate-500" />
                                )}
                              </button>
                            </td>

                            {/* Week 2 */}
                            <td className="px-2 py-3 text-center border-r border-slate-900 select-none">
                              <button
                                type="button"
                                onClick={() => handleToggleAnswer(t.id, 'week2')}
                                className="inline-flex items-center justify-center rounded focus:outline-none transition-transform active:scale-90"
                              >
                                {ans.week2 ? (
                                  <CheckSquare size={18} className="text-emerald-700 stroke-[2.5]" />
                                ) : (
                                  <Square size={18} className="text-slate-300 hover:text-slate-500" />
                                )}
                              </button>
                            </td>

                            {/* Week 3 */}
                            <td className="px-2 py-3 text-center border-r border-slate-900 select-none">
                              <button
                                type="button"
                                onClick={() => handleToggleAnswer(t.id, 'week3')}
                                className="inline-flex items-center justify-center rounded focus:outline-none transition-transform active:scale-90"
                              >
                                {ans.week3 ? (
                                  <CheckSquare size={18} className="text-emerald-700 stroke-[2.5]" />
                                ) : (
                                  <Square size={18} className="text-slate-300 hover:text-slate-500" />
                                )}
                              </button>
                            </td>

                            {/* Week 4 */}
                            <td className="px-2 py-3 text-center border-r border-slate-900 select-none">
                              <button
                                type="button"
                                onClick={() => handleToggleAnswer(t.id, 'week4')}
                                className="inline-flex items-center justify-center rounded focus:outline-none transition-transform active:scale-90"
                              >
                                {ans.week4 ? (
                                  <CheckSquare size={18} className="text-emerald-700 stroke-[2.5]" />
                                ) : (
                                  <Square size={18} className="text-slate-300 hover:text-slate-500" />
                                )}
                              </button>
                            </td>

                            {/* Month Box */}
                            <td className="px-2 py-3 text-center select-none">
                              <button
                                type="button"
                                onClick={() => handleToggleAnswer(t.id, 'month')}
                                className="inline-flex items-center justify-center rounded focus:outline-none transition-transform active:scale-90"
                              >
                                {ans.month ? (
                                  <CheckSquare size={18} className="text-emerald-700 stroke-[2.5]" />
                                ) : (
                                  <Square size={18} className="text-slate-300 hover:text-slate-500" />
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bottom Comments Area */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start border border-slate-900 p-4 bg-slate-50/50">
                <div className="md:col-span-2 space-y-1">
                  <span className="block text-[9px] font-black text-[#2c532c] uppercase tracking-widest h-auto">COMENTÁRIOS / OBSERVAÇÕES</span>
                  <textarea
                    id="checklist_comments_input"
                    value={currentComments}
                    onChange={(e) => {
                      if (isApproved) return;
                      setCurrentComments(e.target.value);
                    }}
                    placeholder="Escreva notas explicativas ou justificação para tarefas não realizadas..."
                    disabled={isApproved}
                    className="w-full h-24 p-2 bg-white border border-slate-800 rounded font-normal text-xs text-slate-800 outline-none resize-none focus:ring-1 focus:ring-slate-900 leading-relaxed disabled:opacity-85"
                  />
                </div>
                
                <div className="border border-slate-800 p-3 bg-white rounded space-y-2.5 flex flex-col justify-between h-24 self-end">
                  <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">VALIDADO POR</span>
                  {isApproved ? (
                    <div>
                      <span className="block text-xs font-black text-slate-850 truncate">{approvedDetails.by?.toUpperCase()}</span>
                      <span className="block text-[8px] text-gray-400 font-mono mt-0.5">
                        {approvedDetails.at ? new Date(approvedDetails.at).toLocaleDateString() : '—'}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-gray-300 italic font-medium">Aguardando assinatura</span>
                  )}
                </div>
              </div>

              {/* Physical Guideline printed subtitle footer */}
              <div className="pt-2 text-[8px] text-gray-400 italic text-center leading-normal border-t border-dashed border-gray-200">
                Devem preencher numa base semanal e/ou aquando da realização da(s) tarefa(s). Classificar o cumprimento com base nos seguintes fatores: tempo gasto, dificuldade, acompanhamento e resultado. Caso alguma tarefa for realizada uma única vez, devem validar na coluna do mês. No final de cada mês enviam o pdf por mail para o Gerente de Restaurante.
              </div>
            </div>

          </div>
        </div>
      )}

      {/* --- Tab 2: HISTORY, SUMMARY & COMPLIANCE STATS DASHBOARD --- */}
      {activeSubTab === 'history' && (
        <div className="space-y-6">
          
          {/* Dashboard Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                <ClipboardCheck size={24} />
              </div>
              <div>
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Checklists Totais</span>
                <span className="text-2xl font-black text-slate-900 tracking-tight">{checklists.length}</span>
                <span className="block text-[9px] text-gray-500 mt-0.5">Gravadas em histórico</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <UserCheck size={24} />
              </div>
              <div>
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Validadas</span>
                <span className="text-2xl font-black text-slate-900 tracking-tight">
                  {checklists.filter(c => c.isApproved).length}
                </span>
                <span className="block text-[9px] text-emerald-600 font-semibold mt-0.5">
                  {checklists.length > 0 
                    ? `${Math.round((checklists.filter(c => c.isApproved).length / checklists.length) * 100)}% de taxa de conclusão` 
                    : 'Sem registos'}
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                <Clock size={24} />
              </div>
              <div>
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Por Validar</span>
                <span className="text-2xl font-black text-slate-900 tracking-tight">
                  {checklists.filter(c => !c.isApproved).length}
                </span>
                <span className="block text-[9px] text-amber-600 font-semibold mt-0.5">Exigem inspeção do supervisor</span>
              </div>
            </div>
          </div>

          {/* Checklist History Listings Table */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">Histórico de Conclusão de Checklists</h3>
                <p className="text-xs text-gray-500 mt-1">Clique para abrir ou imprimir o reporte do respetivo gerente e mês.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150 font-black uppercase text-slate-600 tracking-wider">
                    <th className="px-5 py-3">Mês</th>
                    <th className="px-5 py-3">Gerente</th>
                    <th className="px-5 py-3">Departamento</th>
                    <th className="px-5 py-3 text-center">Tarefas Encerradas</th>
                    <th className="px-5 py-3 text-center">Estado</th>
                    <th className="px-5 py-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold text-slate-705">
                  {checklists.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-slate-400 italic">
                        Nenhum histórico de checklist gravado para este restaurante até ao momento.
                      </td>
                    </tr>
                  ) : (
                    checklists.map(c => {
                      const compliance = calculateCompliancePercent(c);
                      // Calculate completed tasks fraction
                      let checkedCount = 0;
                      const relevantTasks = tasks.filter(t => {
                        if (c.department !== 'Geral' && t.department !== c.department) return false;
                        return !(t as any).managerIds || (t as any).managerIds.length === 0 || (t as any).managerIds.includes(c.managerId);
                      });
                      const totalPossible = relevantTasks.length * 5;
                      relevantTasks.forEach(t => {
                        const ans = c.taskAnswers?.[t.id];
                        if (ans) {
                          if (ans.week1) checkedCount++;
                          if (ans.week2) checkedCount++;
                          if (ans.week3) checkedCount++;
                          if (ans.week4) checkedCount++;
                          if (ans.month) checkedCount++;
                        }
                      });

                      return (
                        <tr key={c.id} className="hover:bg-slate-50/70 transition-all">
                          <td className="px-5 py-4 text-[#a51c24] font-black">
                            {formatMonthPortuguese(c.monthYear)}
                          </td>
                          <td className="px-5 py-4 flex items-center gap-2">
                            <span className="w-7 h-7 bg-indigo-50 text-[#a51c24] font-black uppercase rounded-full flex items-center justify-center text-[10px]">
                              {c.managerName.substring(0, 2)}
                            </span>
                            <div>
                              <span>{c.managerName}</span>
                              <span className="block text-[9px] text-gray-400 font-normal">Gerente</span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-800 text-[10px] uppercase font-black tracking-wider rounded-lg">
                              {c.department}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className="font-mono text-xs font-black text-slate-900">{checkedCount} de {totalPossible}</span>
                              <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${compliance > 80 ? 'bg-emerald-500' : compliance > 50 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                                  style={{ width: `${compliance}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-center">
                            {c.isApproved ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-900 text-[9px] uppercase font-black tracking-widest rounded-md border border-emerald-250">
                                <CheckCircle size={10} className="text-emerald-700" /> Validada
                              </span>
                            ) : c.isCompleted ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-900 text-[9px] uppercase font-black tracking-widest rounded-md border border-blue-250">
                                <CheckCircle size={10} className="text-blue-700" /> Concluída
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-900 text-[9px] uppercase font-black tracking-widest rounded-md border border-amber-250">
                                <Clock size={10} className="text-amber-700" /> Em aberto
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              {!c.isApproved && (
                                <button
                                  onClick={() => {
                                    setReviewChecklist(c);
                                    setReviewValidatorName('');
                                  }}
                                  className="p-1.5 bg-emerald-55 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-all border border-emerald-200"
                                  title="Validar Checklist"
                                >
                                  <UserCheck size={14} />
                                </button>
                              )}
                              <button
                                onClick={() => handleLoadFromHistory(c)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all"
                                title="Editar Checklist"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => triggerPrintChecklist(c)}
                                className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-all"
                                title="Imprimir"
                              >
                                <Printer size={14} />
                              </button>
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
        </div>
      )}

      {/* --- Tab 3: MASTER TASK CONFIG / ADMIN --- */}
      {activeSubTab === 'admin' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Left Block - Create New Task form */}
          <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-100 space-y-4 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5 border-b pb-2">
              <Plus size={14} className="text-[#a51c24] stroke-[3]" />
              Nova Tarefa de Checklist
            </h3>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">Descrição do Item</label>
              <textarea
                id="admin_new_task_name"
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                placeholder="Exemplo: Verificar fardamento e botas de segurança de todos na cozinha..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs text-slate-800 outline-none focus:bg-white resize-none h-20"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">Departamento / Mesa</label>
              <select
                id="admin_new_task_dept"
                value={newTaskDept}
                onChange={(e) => setNewTaskDept(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800"
              >
                {departments.filter(d => d !== 'Geral').map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">Gerente Designado</label>
              <select
                id="admin_new_task_target_manager"
                value={newTaskTargetManager}
                onChange={(e) => setNewTaskTargetManager(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800"
              >
                <option value="all">TODOS OS GERENTES (GERAL)</option>
                {managers.map(m => (
                  <option key={m.id} value={m.id}>{m.name.toUpperCase()}</option>
                ))}
              </select>
              <p className="text-[9px] text-gray-400 mt-1">Pode associar especificamente ou deixar disponível para todos cobrirem.</p>
            </div>

            <button
              id="admin_action_add_task"
              onClick={handleAddTask}
              className="w-full py-2.5 bg-[#a51c24] hover:bg-[#86161c] text-white font-black uppercase text-xs tracking-widest rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus size={14} />
              Criar e Registar
            </button>
          </div>

          {/* Right Block - Task list manager table */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">Lista Completa de Tarefas Ativas</h3>
              <p className="text-xs text-gray-500 mt-1">Registe ou elimine itens operacionais que constituem as vossas checklists secundárias.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150 font-black uppercase text-slate-600 tracking-wider">
                    <th className="px-5 py-3 w-[50%]">Item Operacional</th>
                    <th className="px-5 py-3">Mesa / Depto</th>
                    <th className="px-5 py-3">Associação</th>
                    <th className="px-5 py-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {tasks.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-12 text-center text-slate-400 italic">
                        Nenhuma tarefa registada no sistema. Introduza itens no formulário ao lado.
                      </td>
                    </tr>
                  ) : (
                    tasks.map((t, idx) => {
                      const mIds = (t as any).managerIds || [];
                      const isAssignedSpecific = mIds.length > 0;
                      const specificManagerName = isAssignedSpecific 
                        ? (employees.find(e => e.id === mIds[0])?.name || 'Gerente Excluído')
                        : 'Qualquer Gerente';

                      return (
                        <tr key={t.id} className="hover:bg-slate-50/50 transition-all">
                          <td className="px-5 py-4 font-bold text-slate-900 leading-normal">
                            <span className="text-[10px] text-gray-400 font-mono mr-1.5">{idx + 1}.</span>
                            {t.name}
                          </td>
                          <td className="px-5 py-4">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-800 text-[10px] font-black uppercase tracking-wider rounded">
                              {t.department}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${
                              isAssignedSpecific 
                                ? 'bg-amber-100 text-amber-800' 
                                : 'bg-emerald-50 text-emerald-800'
                            }`}>
                              {specificManagerName}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              onClick={() => handleDeleteTask(t.id)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                              title="Eliminar Item"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- REAL-TIME SCREEN OVERLAY NATIVE SYSTEM PRINT SLIP (Visible in landscape media print ONLY) --- */}
      {printChecklist && (
        <div className="hidden print:block absolute inset-0 bg-white min-h-screen text-slate-900 font-sans p-6 space-y-6 z-[99999] print-landscape">
          {/* Main header block */}
          <div className="border border-slate-900 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 bg-amber-500 rounded flex items-center justify-center font-black text-white text-2xl">
                M
              </div>
              <div>
                <span className="block text-[8px] font-black tracking-widest text-[#2c532c] uppercase">{settings.restaurantName.toUpperCase()}</span>
                <h2 className="text-xl font-black uppercase text-slate-950 tracking-tight leading-none mt-0.5">Lista de Tarefas</h2>
              </div>
            </div>
          </div>

          {/* Config meta values */}
          <div className="border border-slate-900 p-3 grid grid-cols-3 gap-6 text-center bg-slate-50/50">
            <div className="space-y-0.5">
              <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">GERENTE</span>
              <div className="border border-slate-800 bg-white px-3 py-1 font-bold text-xs text-slate-900 rounded select-none truncate">
                {printChecklist.managerName.toUpperCase()}
              </div>
            </div>

            <div className="space-y-0.5">
              <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">DEPARTAMENTO</span>
              <div className="border border-slate-800 bg-white px-3 py-1 font-bold text-xs text-slate-900 rounded select-none">
                {printChecklist.department.toUpperCase()}
              </div>
            </div>

            <div className="space-y-0.5">
              <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">MÊS</span>
              <div className="border border-slate-800 bg-white px-3 py-1 font-extrabold text-xs text-[#a51c24] rounded select-none">
                {formatMonthPortuguese(printChecklist.monthYear)}
              </div>
            </div>
          </div>

          {/* Main task logs content */}
          <div className="border border-slate-900">
            <table className="w-full border-collapse text-left text-xs text-slate-900">
              <thead className="bg-[#2c532c] text-white">
                <tr className="border-b border-slate-950">
                  <th className="px-3 py-2 font-black uppercase text-[9px] tracking-wider w-[55%]">TAREFA</th>
                  <th className="px-1 py-2 font-black uppercase text-[8px] tracking-wider text-center border-l border-slate-900">S1</th>
                  <th className="px-1 py-2 font-black uppercase text-[8px] tracking-wider text-center border-l border-slate-900">S2</th>
                  <th className="px-1 py-2 font-black uppercase text-[8px] tracking-wider text-center border-l border-slate-900">S3</th>
                  <th className="px-1 py-2 font-black uppercase text-[8px] tracking-wider text-center border-l border-slate-900">S4</th>
                  <th className="px-1 py-2 font-black uppercase text-[8px] tracking-wider text-center border-l border-slate-900">MÊS</th>
                </tr>
              </thead>
              <tbody>
                {tasks.filter(t => {
                  if (printChecklist.department !== 'Geral' && t.department !== printChecklist.department) return false;
                  const belongs = !(t as any).managerIds || (t as any).managerIds.length === 0 || (t as any).managerIds.includes(printChecklist.managerId);
                  return belongs;
                }).map((t, idx) => {
                  const ans = printChecklist.taskAnswers?.[t.id] || {};
                  return (
                    <tr key={t.id} className="border-b border-slate-900">
                      <td className="px-3 py-2 font-bold text-xs border-r border-slate-900 leading-snug">
                        <span className="text-[9px] text-gray-400 font-mono mr-1">{idx + 1}.</span>
                        {t.name}
                      </td>
                      <td className="px-1 py-2 text-center border-r border-slate-900">
                        {ans.week1 ? '✓' : '—'}
                      </td>
                      <td className="px-1 py-2 text-center border-r border-slate-900">
                        {ans.week2 ? '✓' : '—'}
                      </td>
                      <td className="px-1 py-2 text-center border-r border-slate-900">
                        {ans.week3 ? '✓' : '—'}
                      </td>
                      <td className="px-1 py-2 text-center border-r border-slate-900">
                        {ans.week4 ? '✓' : '—'}
                      </td>
                      <td className="px-1 py-2 text-center">
                        {ans.month ? '✓' : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Verification validations signature */}
          <div className="grid grid-cols-3 gap-6 border border-slate-900 p-3.5 bg-slate-50/50">
            <div className="col-span-2 space-y-0.5">
              <span className="block text-[8px] font-black text-[#2c532c] uppercase tracking-widest h-auto">COMENTÁRIOS / OBSERVAÇÕES</span>
              <div className="w-full h-16 p-2 bg-white border border-slate-800 rounded text-xs text-slate-800 leading-normal overflow-hidden italic">
                {printChecklist.comments || 'Nenhuns comentários adicionados.'}
              </div>
            </div>
            
            <div className="border border-slate-800 p-2.5 bg-white rounded flex flex-col justify-between h-16">
              <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">VALIDADO POR</span>
              {printChecklist.isApproved ? (
                <div>
                  <span className="block text-xs font-black text-[#2c532c] leading-none truncate">{printChecklist.approvedBy?.toUpperCase()}</span>
                  <span className="block text-[8px] text-gray-400 mt-0.5">
                    {printChecklist.approvedAt ? new Date(printChecklist.approvedAt).toLocaleDateString() : ''}
                  </span>
                </div>
              ) : (
                <span className="text-[9px] text-gray-300 italic font-medium leading-none">Aguardando validação</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- Supervisor Validation Modal Overlay --- */}
      {reviewChecklist && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm print:hidden">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-[#1e293b] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ClipboardCheck className="text-amber-500" size={24} />
                <div>
                  <h3 className="text-base font-black uppercase tracking-tight text-white leading-tight">Validar Checklist</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Rever respostas de <span className="text-white font-extrabold">{reviewChecklist.managerName}</span> ({formatMonthPortuguese(reviewChecklist.monthYear)})
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setReviewChecklist(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6 space-y-6">
              <div className="grid grid-cols-1 gap-4 text-xs font-semibold bg-slate-50 p-4 border rounded-xl">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Departamento</span> 
                  <span className="font-black text-slate-800 text-sm">{reviewChecklist.department.toUpperCase()}</span>
                </div>
              </div>

              {/* Task lists read only table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#2c532c] text-white font-black uppercase tracking-wider text-[9px]">
                    <tr>
                      <th className="px-5 py-3 w-[60%]">Tarefa</th>
                      <th className="px-3 py-3 text-center border-l border-white/10">W1</th>
                      <th className="px-3 py-3 text-center border-l border-white/10">W2</th>
                      <th className="px-3 py-3 text-center border-l border-white/10">W3</th>
                      <th className="px-3 py-3 text-center border-l border-white/10">W4</th>
                      <th className="px-3 py-3 text-center border-l border-white/10">Mês</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 font-medium text-slate-700">
                    {tasks.filter(t => {
                      if (reviewChecklist.department !== 'Geral' && t.department !== reviewChecklist.department) return false;
                      return !(t as any).managerIds || (t as any).managerIds.length === 0 || (t as any).managerIds.includes(reviewChecklist.managerId);
                    }).map((t, idx) => {
                      const ans = reviewChecklist.taskAnswers?.[t.id] || {};
                      return (
                        <tr key={t.id} className="hover:bg-slate-50/50">
                          <td className="px-5 py-3 text-slate-800 leading-snug">
                            <span className="text-gray-400 font-mono mr-2">{idx + 1}.</span>
                            {t.name}
                          </td>
                          <td className="px-3 py-3 text-center border-l border-slate-100 font-bold text-base text-slate-800">{ans.week1 ? <span className="text-emerald-600">✓</span> : <span className="text-slate-350">—</span>}</td>
                          <td className="px-3 py-3 text-center border-l border-slate-100 font-bold text-base text-slate-800">{ans.week2 ? <span className="text-emerald-600">✓</span> : <span className="text-slate-350">—</span>}</td>
                          <td className="px-3 py-3 text-center border-l border-slate-100 font-bold text-base text-slate-800">{ans.week3 ? <span className="text-emerald-600">✓</span> : <span className="text-slate-350">—</span>}</td>
                          <td className="px-3 py-3 text-center border-l border-slate-100 font-bold text-base text-slate-800">{ans.week4 ? <span className="text-emerald-600">✓</span> : <span className="text-slate-350">—</span>}</td>
                          <td className="px-3 py-3 text-center border-l border-slate-100 font-bold text-base text-slate-800">{ans.month ? <span className="text-emerald-600">✓</span> : <span className="text-slate-350">—</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Comments */}
              {reviewChecklist.comments && (
                <div className="space-y-1.5">
                  <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Comentários e Justificações do Gerente</span>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs italic text-slate-700 whitespace-pre-wrap leading-relaxed">
                    "{reviewChecklist.comments}"
                  </div>
                </div>
              )}

              {/* Validator Name Input Form */}
              <div className="pt-4 border-t border-slate-150 space-y-2">
                <label className="block text-[11px] font-black uppercase text-[#a51c24] tracking-wider">
                  Nome do Supervisor / Responsável pela Validação:
                </label>
                <select 
                  value={reviewValidatorName}
                  onChange={(e) => setReviewValidatorName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#2b532b] focus:outline-none text-xs font-bold text-slate-800 transition-colors shadow-sm bg-white"
                >
                  <option value="">— Selecionar Responsável —</option>
                  {managers.map(e => (
                    <option key={e.id} value={e.name}>{e.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end gap-3 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setReviewChecklist(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleValidateModalConfirm(reviewChecklist, reviewValidatorName)}
                disabled={!reviewValidatorName.trim()}
                className="px-5 py-2 bg-[#2c532c] hover:bg-emerald-950 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <UserCheck size={14} />
                Gravar & Validar Checklist
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
