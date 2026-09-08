import React, { useState, useMemo } from 'react';
import { 
  Sparkles, Calendar, User, Layers, Plus, Check, CheckCircle2, 
  Camera, AlertCircle, Trash2, Clock, Search, Filter, AlertTriangle,
  Bell, ArrowRight, Eye, X, CheckCheck
} from 'lucide-react';
import { ExtraordinaryCleaningTask, Employee } from '../../types';
import { EvidenceCameraModal } from './EvidenceCameraModal';

interface ExtraordinaryCleaningTabProps {
  tasks: ExtraordinaryCleaningTask[];
  areas: string[];
  employees: Employee[];
  restaurantId: string;
  onSaveTask: (task: ExtraordinaryCleaningTask) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
}

export const ExtraordinaryCleaningTab: React.FC<ExtraordinaryCleaningTabProps> = ({
  tasks,
  areas,
  employees,
  restaurantId,
  onSaveTask,
  onDeleteTask
}) => {
  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [formData, setFormData] = useState<{
    data: string;
    area: string;
    customArea: string;
    tarefa: string;
    assignedManager: string;
  }>({
    data: todayStr,
    area: areas[0] || 'Cozinha',
    customArea: '',
    tarefa: '',
    assignedManager: ''
  });

  // Filters
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [filterArea, setFilterArea] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Scheduled Notification Popup
  const [scheduledAlertTask, setScheduledAlertTask] = useState<ExtraordinaryCleaningTask | null>(null);

  // Evidence Camera Modal for completing a task
  const [activeCameraTask, setActiveCameraTask] = useState<ExtraordinaryCleaningTask | null>(null);

  // Photo viewer modal
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string; subtitle: string } | null>(null);

  // Eligible managers
  const eligibleManagers = useMemo(() => {
    return employees.filter(
      e => e.isActive && (e.role === 'GERENTE_RESTAURANTE' || e.role === 'GERENTE')
    );
  }, [employees]);

  // Handle Form Submission
  const handleScheduleTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tarefa.trim()) return;

    const finalArea = formData.area === '__custom__' ? formData.customArea.trim() : formData.area;
    if (!finalArea) return;

    const newTask: ExtraordinaryCleaningTask = {
      id: `extra_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      restaurantId,
      data: formData.data,
      area: finalArea,
      tarefa: formData.tarefa.trim(),
      assignedManager: formData.assignedManager || undefined,
      completed: false,
      photos: [],
      scheduledAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await onSaveTask(newTask);

    // Reset form
    setFormData({
      data: todayStr,
      area: areas[0] || 'Cozinha',
      customArea: '',
      tarefa: '',
      assignedManager: ''
    });
    setIsFormOpen(false);

    // MANDATORY REQUIREMENT: Popup informing the manager to verify extraordinary cleanings
    setScheduledAlertTask(newTask);
  };

  // Handle completing a task via camera
  const handleSaveEvidence = async (evidence: { completedBy: string; photos: string[]; notes?: string }) => {
    if (!activeCameraTask) return;

    const updated: ExtraordinaryCleaningTask = {
      ...activeCameraTask,
      completed: true,
      completedBy: evidence.completedBy,
      completedAt: new Date().toISOString(),
      photos: evidence.photos,
      notes: evidence.notes,
      updatedAt: new Date().toISOString()
    };

    await onSaveTask(updated);
    setActiveCameraTask(null);
  };

  const handleUnmarkTask = async () => {
    if (!activeCameraTask) return;
    const updated: ExtraordinaryCleaningTask = {
      ...activeCameraTask,
      completed: false,
      completedBy: undefined,
      completedAt: undefined,
      photos: [],
      notes: undefined,
      updatedAt: new Date().toISOString()
    };
    await onSaveTask(updated);
    setActiveCameraTask(null);
  };

  // Stats
  const totalCount = tasks.length;
  const completedCount = tasks.filter(t => t.completed).length;
  const pendingCount = totalCount - completedCount;
  const totalPhotosCount = tasks.reduce((sum, t) => sum + (t.photos?.length || 0), 0);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (filterStatus === 'pending' && t.completed) return false;
      if (filterStatus === 'completed' && !t.completed) return false;
      if (filterArea !== 'all' && t.area !== filterArea) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchTask = t.tarefa.toLowerCase().includes(term);
        const matchArea = t.area.toLowerCase().includes(term);
        const matchMgr = (t.assignedManager || '').toLowerCase().includes(term) || (t.completedBy || '').toLowerCase().includes(term);
        if (!matchTask && !matchArea && !matchMgr) return false;
      }
      return true;
    });
  }, [tasks, filterStatus, filterArea, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Top Banner Alert for Pending / Scheduled Extraordinary Cleanings */}
      {pendingCount > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-lg shrink-0">
              <Bell size={20} className="animate-bounce" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-amber-900">
                Atenção Gerente: Existem {pendingCount} Limpeza(s) Extraordinária(s) Agendada(s)
              </h4>
              <p className="text-xs text-amber-800">
                Verifique as tarefas pendentes abaixo e assegure a sua realização com registo fotográfico obrigatório.
              </p>
            </div>
          </div>
          <button
            onClick={() => setFilterStatus('pending')}
            className="text-xs font-bold px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors shrink-0 flex items-center gap-1"
          >
            <span>Ver Agendadas</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase text-gray-500">Total Extraordinárias</span>
          <div className="text-2xl font-black text-gray-900 mt-1">{totalCount}</div>
          <p className="text-[11px] text-gray-400 mt-1">Tarefas não rotineiras</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-amber-700">Agendadas / Pendentes</span>
            <Clock size={16} className="text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600 mt-1">{pendingCount}</div>
          <p className="text-[11px] text-amber-700 font-semibold mt-1">A aguardar execução</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-emerald-700">Realizadas</span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{completedCount}</div>
          <p className="text-[11px] text-emerald-700 font-semibold mt-1">
            {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}% de taxa
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-teal-200 bg-teal-50/20 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-teal-800">Fotos de Evidência</span>
            <Camera size={16} className="text-teal-700" />
          </div>
          <div className="text-2xl font-black text-teal-800 mt-1">{totalPhotosCount}</div>
          <p className="text-[11px] text-teal-700 font-semibold mt-1">Evidências anexadas</p>
        </div>
      </div>

      {/* Action Header & Scheduling Form Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
        <div>
          <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
            <Sparkles size={18} className="text-teal-600" />
            <span>Registo e Agendamento de Limpezas Extraordinárias</span>
          </h3>
          <p className="text-xs text-gray-500">
            Registe todas as tarefas de limpeza adicionais, desengorduramentos pontuais ou intervenções agendadas para o gerente verificar.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all active:scale-95 shrink-0"
        >
          {isFormOpen ? <X size={16} /> : <Plus size={16} />}
          <span>{isFormOpen ? 'Fechar Formulário' : 'Agendar / Nova Limpeza Extra'}</span>
        </button>
      </div>

      {/* Scheduling / Registration Form */}
      {isFormOpen && (
        <form
          onSubmit={handleScheduleTask}
          className="bg-white p-6 rounded-2xl border-2 border-teal-500/40 shadow-md space-y-4 animate-in fade-in zoom-in-95 duration-200"
        >
          <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-teal-700" />
              <h4 className="font-bold text-sm text-gray-900">
                Nova Tarefa de Limpeza Extraordinária
              </h4>
            </div>
            <span className="text-xs text-gray-500 font-medium">
              Notifica o gerente para verificação
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. DATA */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Data Prevista <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.data}
                onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 focus:border-teal-500 rounded-xl text-xs font-semibold text-gray-800 outline-hidden"
              />
            </div>

            {/* 2. ÁREA */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Área <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 focus:border-teal-500 rounded-xl text-xs font-semibold text-gray-800 outline-hidden"
              >
                {areas.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
                <option value="__custom__">+ Outra Área (Personalizada)...</option>
              </select>

              {formData.area === '__custom__' && (
                <input
                  type="text"
                  required
                  placeholder="Nome da nova área..."
                  value={formData.customArea}
                  onChange={(e) => setFormData({ ...formData, customArea: e.target.value })}
                  className="mt-2 w-full p-2 bg-white border border-teal-500 rounded-lg text-xs font-medium outline-hidden"
                />
              )}
            </div>

            {/* 3. ATRIBUIR A UM GERENTE (OPCIONAL) */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Gerente Atribuído <span className="text-gray-400 font-normal">(Opcional)</span>
              </label>
              <select
                value={formData.assignedManager}
                onChange={(e) => setFormData({ ...formData, assignedManager: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 focus:border-teal-500 rounded-xl text-xs font-semibold text-gray-800 outline-hidden"
              >
                <option value="">-- Qualquer Gerente / Não Atribuído --</option>
                {eligibleManagers.map(emp => (
                  <option key={emp.id} value={emp.name}>
                    {emp.name} ({emp.role === 'GERENTE_RESTAURANTE' ? 'GR' : 'G'})
                  </option>
                ))}
              </select>
            </div>

            {/* 4. TAREFA */}
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Tarefa de Limpeza <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Lavagem profunda do chão da cozinha..."
                value={formData.tarefa}
                onChange={(e) => setFormData({ ...formData, tarefa: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 focus:border-teal-500 rounded-xl text-xs font-semibold text-gray-800 outline-hidden"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] text-gray-500 flex items-center gap-1">
              <AlertCircle size={14} className="text-teal-600" />
              Ao agendar, é emitido um alerta para verificação pelo gerente de turno.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Calendar size={14} />
                <span>Agendar Limpeza Extraordinária</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter tabs */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterStatus === 'all' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Todas ({totalCount})
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 ${
                filterStatus === 'pending' ? 'bg-amber-500 text-white shadow-2xs' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <span>Agendadas</span>
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-amber-700/30">{pendingCount}</span>
            </button>
            <button
              onClick={() => setFilterStatus('completed')}
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 ${
                filterStatus === 'completed' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <span>Realizadas</span>
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-emerald-800/30">{completedCount}</span>
            </button>
          </div>

          {/* Area filter */}
          <select
            value={filterArea}
            onChange={(e) => setFilterArea(e.target.value)}
            className="p-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-hidden"
          >
            <option value="all">Todas as Áreas</option>
            {areas.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Pesquisar tarefa, área ou gerente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 focus:border-teal-500 rounded-xl text-xs outline-hidden"
          />
        </div>
      </div>

      {/* Extraordinary Tasks Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-100/70 text-gray-600 font-bold uppercase tracking-wider border-b border-gray-200">
              <tr>
                <th className="p-3.5 w-14 text-center">Pisco</th>
                <th className="p-3.5 w-28">Data</th>
                <th className="p-3.5 w-32">Área</th>
                <th className="p-3.5">Tarefa Extraordinária</th>
                <th className="p-3.5 w-44">Gerente Atribuído</th>
                <th className="p-3.5 w-40">Estado / Evidência</th>
                <th className="p-3.5 w-16 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-gray-400">
                    <Sparkles size={32} className="mx-auto mb-2 text-gray-300" />
                    <p className="font-semibold text-sm text-gray-600">Nenhuma limpeza extraordinária encontrada.</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Clique em "Agendar / Nova Limpeza Extra" para registar tarefas adicionais.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => {
                  const isOverdue = !task.completed && task.data < todayStr;
                  const isToday = task.data === todayStr;

                  return (
                    <tr
                      key={task.id}
                      className={`hover:bg-gray-50/80 transition-colors ${
                        task.completed ? 'bg-emerald-50/20' : isOverdue ? 'bg-red-50/20' : ''
                      }`}
                    >
                      {/* PISCO / CHECKBOX - CRITICAL: Clicar no pisco abre logo a câmara */}
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => setActiveCameraTask(task)}
                          className={`w-6 h-6 rounded-lg mx-auto flex items-center justify-center transition-all border ${
                            task.completed
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs hover:bg-emerald-700'
                              : 'border-gray-300 bg-white hover:border-teal-600 hover:bg-teal-50'
                          } cursor-pointer active:scale-95`}
                          title={
                            task.completed
                              ? 'Ver fotos de evidência capturadas'
                              : 'Clicar no pisco para abrir a câmara e marcar como realizada com evidência'
                          }
                        >
                          {task.completed && <Check size={16} strokeWidth={3} />}
                        </button>
                      </td>

                      {/* Data */}
                      <td className="p-3">
                        <div className="flex flex-col">
                          <span className={`font-bold text-xs ${
                            isOverdue ? 'text-red-600 font-black' : isToday ? 'text-teal-700 font-black' : 'text-gray-800'
                          }`}>
                            {task.data}
                          </span>
                          {isToday && (
                            <span className="text-[10px] font-bold text-teal-600 uppercase">Hoje</span>
                          )}
                          {isOverdue && (
                            <span className="text-[10px] font-bold text-red-500 uppercase">Em atraso</span>
                          )}
                        </div>
                      </td>

                      {/* Área */}
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md font-semibold text-[11px] bg-gray-100 text-gray-700 border border-gray-200">
                          {task.area}
                        </span>
                      </td>

                      {/* Tarefa */}
                      <td className="p-3">
                        <div className="flex flex-col">
                          <span className={`text-xs font-bold ${
                            task.completed ? 'text-gray-800 line-through decoration-emerald-500/60' : 'text-gray-900'
                          }`}>
                            {task.tarefa}
                          </span>
                          {task.notes && (
                            <span className="text-[11px] text-gray-500 italic mt-0.5">
                              Obs: {task.notes}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Gerente Atribuído */}
                      <td className="p-3">
                        {task.assignedManager ? (
                          <div className="flex items-center gap-1 text-xs font-semibold text-gray-800">
                            <User size={13} className="text-teal-600" />
                            <span>{task.assignedManager}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Qualquer Gerente</span>
                        )}
                      </td>

                      {/* Estado / Evidência */}
                      <td className="p-3">
                        {task.completed ? (
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 w-fit">
                              <CheckCheck size={12} />
                              <span>Realizada {task.completedBy ? `(${task.completedBy})` : ''}</span>
                            </span>
                            {task.photos && task.photos.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setPreviewPhoto({
                                  url: task.photos[0],
                                  title: task.tarefa,
                                  subtitle: `${task.area} • Data: ${task.data} • Responsável: ${task.completedBy || 'Gerente'}`
                                })}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 px-2 py-0.5 rounded-md border border-teal-200 transition-colors w-fit"
                              >
                                <Camera size={11} className="text-teal-700" />
                                <span>{task.photos.length} Evidência(s)</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${
                              isOverdue
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {isOverdue ? 'Atrasada' : 'Agendada'}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Tem a certeza que deseja eliminar a limpeza extraordinária "${task.tarefa}"?`)) {
                              onDeleteTask(task.id);
                            }
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          title="Eliminar limpeza extraordinária"
                        >
                          <Trash2 size={14} />
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

      {/* POPUP OBRIGATÓRIO: Ao agendar tarefa, surge popup a indicar para o gerente verificar as limpezas extraordinárias */}
      {scheduledAlertTask && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-amber-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl">
                <Bell size={28} className="animate-bounce" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900 leading-tight">
                  Atenção Gerente: Limpeza Extraordinária Agendada!
                </h3>
                <p className="text-xs text-amber-800 font-semibold">
                  Aviso para verificação e acompanhamento de turno
                </p>
              </div>
            </div>

            <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200 space-y-2 text-xs">
              <div className="flex justify-between items-center text-gray-700">
                <span className="font-bold">Tarefa:</span>
                <span className="font-black text-gray-900">{scheduledAlertTask.tarefa}</span>
              </div>
              <div className="flex justify-between items-center text-gray-700">
                <span className="font-bold">Data Prevista:</span>
                <span className="font-bold text-teal-700">{scheduledAlertTask.data}</span>
              </div>
              <div className="flex justify-between items-center text-gray-700">
                <span className="font-bold">Área:</span>
                <span className="font-semibold text-gray-800">{scheduledAlertTask.area}</span>
              </div>
              <div className="flex justify-between items-center text-gray-700">
                <span className="font-bold">Gerente Designado:</span>
                <span className="font-semibold text-gray-800">
                  {scheduledAlertTask.assignedManager || 'Qualquer Gerente de Turno'}
                </span>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              O gerente responsável pelo turno desta data deve verificar a execução desta limpeza extraordinária e registá-la com <strong>evidência fotográfica obrigatória</strong> clicando no respetivo pisco.
            </p>

            <button
              type="button"
              onClick={() => setScheduledAlertTask(null)}
              className="w-full py-3 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-98 flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={16} />
              <span>Entendido / Verificar Limpezas Extraordinárias</span>
            </button>
          </div>
        </div>
      )}

      {/* EVIDENCE CAMERA MODAL - Clicar no pisco abre logo a câmara */}
      {activeCameraTask && (
        <EvidenceCameraModal
          isOpen={Boolean(activeCameraTask)}
          taskTitle={`[Extraordinária] ${activeCameraTask.tarefa}`}
          taskArea={activeCameraTask.area}
          dayLabel={activeCameraTask.data}
          shiftLabel="Limpeza Extraordinária"
          assignedManager={activeCameraTask.assignedManager}
          eligibleManagers={eligibleManagers}
          currentStatus={{
            completed: activeCameraTask.completed,
            completedBy: activeCameraTask.completedBy,
            completedAt: activeCameraTask.completedAt,
            photos: activeCameraTask.photos,
            notes: activeCameraTask.notes
          }}
          onClose={() => setActiveCameraTask(null)}
          onSaveEvidence={handleSaveEvidence}
          onUnmarkTask={activeCameraTask.completed ? handleUnmarkTask : undefined}
        />
      )}

      {/* PHOTO PREVIEW MODAL */}
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
                Evidência de Limpeza Extraordinária
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
