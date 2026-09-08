import React, { useState } from 'react';
import { X, Plus, Trash2, Edit2, Save, Layers, Sparkles, AlertCircle, Check } from 'lucide-react';
import { CleaningTaskItem, CleaningDayOfWeek, CleaningShift } from '../../types';
import { CLEANING_DAYS, CLEANING_SHIFTS } from './cleaningDefaults';

interface CleaningManagementModalProps {
  isOpen: boolean;
  weeklyTasks: CleaningTaskItem[];
  zeladorTasks: CleaningTaskItem[];
  areas: string[];
  onClose: () => void;
  onSaveTasksAndAreas: (
    updatedWeekly: CleaningTaskItem[],
    updatedZelador: CleaningTaskItem[],
    updatedAreas: string[]
  ) => void;
}

export const CleaningManagementModal: React.FC<CleaningManagementModalProps> = ({
  isOpen,
  weeklyTasks,
  zeladorTasks,
  areas,
  onClose,
  onSaveTasksAndAreas
}) => {
  const [activeTab, setActiveTab] = useState<'weekly' | 'zelador' | 'areas'>('weekly');

  // Local editable state
  const [localWeekly, setLocalWeekly] = useState<CleaningTaskItem[]>(weeklyTasks);
  const [localZelador, setLocalZelador] = useState<CleaningTaskItem[]>(zeladorTasks);
  const [localAreas, setLocalAreas] = useState<string[]>(areas);

  // Filter for weekly editor
  const [filterDay, setFilterDay] = useState<CleaningDayOfWeek | 'all'>('all');
  const [filterShift, setFilterShift] = useState<CleaningShift | 'all'>('all');

  // Add Task form state
  const [newDay, setNewDay] = useState<CleaningDayOfWeek>('segunda');
  const [newShift, setNewShift] = useState<CleaningShift>('abertura');
  const [newTarefa, setNewTarefa] = useState('');
  const [newArea, setNewArea] = useState(areas[0] || 'Cozinha');

  // Add Area form state
  const [newAreaInput, setNewAreaInput] = useState('');

  // Edit in-line
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTarefa, setEditTarefa] = useState('');
  const [editArea, setEditArea] = useState('');

  if (!isOpen) return null;

  const handleAddWeeklyTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTarefa.trim()) return;

    const newTask: CleaningTaskItem = {
      id: `w_custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      day: newDay,
      shift: newShift,
      tarefa: newTarefa.trim(),
      area: newArea
    };

    setLocalWeekly(prev => [...prev, newTask]);
    setNewTarefa('');
  };

  const handleAddZeladorTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTarefa.trim()) return;

    const newTask: CleaningTaskItem = {
      id: `z_custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      day: newDay,
      tarefa: newTarefa.trim(),
      area: newArea
    };

    setLocalZelador(prev => [...prev, newTask]);
    setNewTarefa('');
  };

  const handleDeleteWeekly = (id: string) => {
    setLocalWeekly(prev => prev.filter(t => t.id !== id));
  };

  const handleDeleteZelador = (id: string) => {
    setLocalZelador(prev => prev.filter(t => t.id !== id));
  };

  const startEditTask = (task: CleaningTaskItem) => {
    setEditingTaskId(task.id);
    setEditTarefa(task.tarefa);
    setEditArea(task.area);
  };

  const saveEditTask = (isZelador: boolean = false) => {
    if (!editingTaskId || !editTarefa.trim()) return;

    if (isZelador) {
      setLocalZelador(prev =>
        prev.map(t => (t.id === editingTaskId ? { ...t, tarefa: editTarefa.trim(), area: editArea } : t))
      );
    } else {
      setLocalWeekly(prev =>
        prev.map(t => (t.id === editingTaskId ? { ...t, tarefa: editTarefa.trim(), area: editArea } : t))
      );
    }
    setEditingTaskId(null);
  };

  const handleAddArea = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newAreaInput.trim();
    if (!clean || localAreas.includes(clean)) return;
    setLocalAreas(prev => [...prev, clean]);
    setNewAreaInput('');
  };

  const handleDeleteArea = (areaToDelete: string) => {
    setLocalAreas(prev => prev.filter(a => a !== areaToDelete));
  };

  const handleSaveAll = () => {
    onSaveTasksAndAreas(localWeekly, localZelador, localAreas);
    onClose();
  };

  const filteredWeekly = localWeekly.filter(t => {
    if (filterDay !== 'all' && t.day !== filterDay) return false;
    if (filterShift !== 'all' && t.shift !== filterShift) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full h-[85vh] overflow-hidden border border-gray-100 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-teal-400" />
            <div>
              <h3 className="font-bold text-base tracking-tight">Gestão do Modelo de Limpeza</h3>
              <p className="text-xs text-slate-400">Adicionar, editar e eliminar tarefas e áreas operacionais</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center border-b border-gray-200 px-6 bg-gray-50/50 shrink-0">
          <button
            onClick={() => setActiveTab('weekly')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'weekly'
                ? 'border-teal-600 text-teal-700 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <span>Tarefas Semanais ({localWeekly.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('zelador')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'zelador'
                ? 'border-teal-600 text-teal-700 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <span>Tarefas do Zelador ({localZelador.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('areas')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'areas'
                ? 'border-teal-600 text-teal-700 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Layers size={14} />
            <span>Áreas Operacionais ({localAreas.length})</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: WEEKLY TASKS */}
          {activeTab === 'weekly' && (
            <div className="space-y-6">
              {/* Add form */}
              <form onSubmit={handleAddWeeklyTask} className="bg-teal-50/60 border border-teal-200 rounded-xl p-4">
                <h4 className="text-xs font-bold text-teal-900 uppercase tracking-wider mb-3">
                  Adicionar Nova Tarefa Semanal
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Dia da Semana</label>
                    <select
                      value={newDay}
                      onChange={(e) => setNewDay(e.target.value as any)}
                      className="w-full p-2 bg-white border border-gray-300 rounded-lg text-xs font-medium"
                    >
                      {CLEANING_DAYS.map(d => (
                        <option key={d.key} value={d.key}>{d.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Turno</label>
                    <select
                      value={newShift}
                      onChange={(e) => setNewShift(e.target.value as any)}
                      className="w-full p-2 bg-white border border-gray-300 rounded-lg text-xs font-medium"
                    >
                      {CLEANING_SHIFTS.map(s => (
                        <option key={s.key} value={s.key}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Área</label>
                    <select
                      value={newArea}
                      onChange={(e) => setNewArea(e.target.value)}
                      className="w-full p-2 bg-white border border-gray-300 rounded-lg text-xs font-medium"
                    >
                      {localAreas.map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Nome da Tarefa</label>
                    <input
                      type="text"
                      value={newTarefa}
                      onChange={(e) => setNewTarefa(e.target.value)}
                      placeholder="Ex: Ralos, Filtros, Chão..."
                      className="w-full p-2 bg-white border border-gray-300 rounded-lg text-xs"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!newTarefa.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    <Plus size={14} />
                    <span>Adicionar Tarefa</span>
                  </button>
                </div>
              </form>

              {/* Filters */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                <span className="text-xs font-bold text-gray-700">Filtrar visualização:</span>
                <div className="flex items-center gap-2">
                  <select
                    value={filterDay}
                    onChange={(e) => setFilterDay(e.target.value as any)}
                    className="p-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium"
                  >
                    <option value="all">Todos os Dias</option>
                    {CLEANING_DAYS.map(d => (
                      <option key={d.key} value={d.key}>{d.label}</option>
                    ))}
                  </select>
                  <select
                    value={filterShift}
                    onChange={(e) => setFilterShift(e.target.value as any)}
                    className="p-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium"
                  >
                    <option value="all">Todos os Turnos</option>
                    {CLEANING_SHIFTS.map(s => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* List */}
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 text-gray-700 font-bold uppercase tracking-wider border-b border-gray-200">
                    <tr>
                      <th className="p-3">Dia</th>
                      <th className="p-3">Turno</th>
                      <th className="p-3">Tarefa</th>
                      <th className="p-3">Área</th>
                      <th className="p-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredWeekly.map(task => {
                      const isEditing = editingTaskId === task.id;
                      const dayObj = CLEANING_DAYS.find(d => d.key === task.day);
                      const shiftObj = CLEANING_SHIFTS.find(s => s.key === task.shift);

                      return (
                        <tr key={task.id} className="hover:bg-gray-50/70 transition-colors">
                          <td className="p-3 font-semibold text-gray-800">
                            {dayObj?.shortLabel || task.day}
                          </td>
                          <td className="p-3 text-gray-600">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              {shiftObj?.label || task.shift}
                            </span>
                          </td>
                          <td className="p-3">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editTarefa}
                                onChange={(e) => setEditTarefa(e.target.value)}
                                className="p-1.5 border border-teal-500 rounded-md text-xs w-full"
                                autoFocus
                              />
                            ) : (
                              <span className="font-medium text-gray-900">{task.tarefa}</span>
                            )}
                          </td>
                          <td className="p-3">
                            {isEditing ? (
                              <select
                                value={editArea}
                                onChange={(e) => setEditArea(e.target.value)}
                                className="p-1.5 border border-teal-500 rounded-md text-xs"
                              >
                                {localAreas.map(a => (
                                  <option key={a} value={a}>{a}</option>
                                ))}
                              </select>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-gray-100 text-gray-700">
                                {task.area}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isEditing ? (
                                <button
                                  onClick={() => saveEditTask(false)}
                                  className="p-1.5 bg-teal-600 text-white hover:bg-teal-700 rounded-md"
                                  title="Guardar"
                                >
                                  <Check size={14} />
                                </button>
                              ) : (
                                <button
                                  onClick={() => startEditTask(task)}
                                  className="p-1.5 text-gray-500 hover:text-teal-700 hover:bg-gray-100 rounded-md"
                                  title="Editar"
                                >
                                  <Edit2 size={14} />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteWeekly(task.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                                title="Eliminar"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: ZELADOR TASKS */}
          {activeTab === 'zelador' && (
            <div className="space-y-6">
              {/* Add form */}
              <form onSubmit={handleAddZeladorTask} className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-4">
                <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-3">
                  Adicionar Nova Tarefa de Zelador
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Dia da Semana</label>
                    <select
                      value={newDay}
                      onChange={(e) => setNewDay(e.target.value as any)}
                      className="w-full p-2 bg-white border border-gray-300 rounded-lg text-xs font-medium"
                    >
                      {CLEANING_DAYS.map(d => (
                        <option key={d.key} value={d.key}>{d.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Área</label>
                    <select
                      value={newArea}
                      onChange={(e) => setNewArea(e.target.value)}
                      className="w-full p-2 bg-white border border-gray-300 rounded-lg text-xs font-medium"
                    >
                      {localAreas.map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Nome da Tarefa</label>
                    <input
                      type="text"
                      value={newTarefa}
                      onChange={(e) => setNewTarefa(e.target.value)}
                      placeholder="Ex: Manutenção caixa de gordura..."
                      className="w-full p-2 bg-white border border-gray-300 rounded-lg text-xs"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!newTarefa.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    <Plus size={14} />
                    <span>Adicionar Tarefa Zelador</span>
                  </button>
                </div>
              </form>

              {/* List */}
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 text-gray-700 font-bold uppercase tracking-wider border-b border-gray-200">
                    <tr>
                      <th className="p-3">Dia</th>
                      <th className="p-3">Tarefa</th>
                      <th className="p-3">Área</th>
                      <th className="p-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {localZelador.map(task => {
                      const isEditing = editingTaskId === task.id;
                      const dayObj = CLEANING_DAYS.find(d => d.key === task.day);

                      return (
                        <tr key={task.id} className="hover:bg-gray-50/70 transition-colors">
                          <td className="p-3 font-semibold text-gray-800">
                            {dayObj?.label || task.day}
                          </td>
                          <td className="p-3">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editTarefa}
                                onChange={(e) => setEditTarefa(e.target.value)}
                                className="p-1.5 border border-indigo-500 rounded-md text-xs w-full"
                                autoFocus
                              />
                            ) : (
                              <span className="font-medium text-gray-900">{task.tarefa}</span>
                            )}
                          </td>
                          <td className="p-3">
                            {isEditing ? (
                              <select
                                value={editArea}
                                onChange={(e) => setEditArea(e.target.value)}
                                className="p-1.5 border border-indigo-500 rounded-md text-xs"
                              >
                                {localAreas.map(a => (
                                  <option key={a} value={a}>{a}</option>
                                ))}
                              </select>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-gray-100 text-gray-700">
                                {task.area}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isEditing ? (
                                <button
                                  onClick={() => saveEditTask(true)}
                                  className="p-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-md"
                                  title="Guardar"
                                >
                                  <Check size={14} />
                                </button>
                              ) : (
                                <button
                                  onClick={() => startEditTask(task)}
                                  className="p-1.5 text-gray-500 hover:text-indigo-700 hover:bg-gray-100 rounded-md"
                                  title="Editar"
                                >
                                  <Edit2 size={14} />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteZelador(task.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                                title="Eliminar"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: AREAS */}
          {activeTab === 'areas' && (
            <div className="space-y-6">
              {/* Add form */}
              <form onSubmit={handleAddArea} className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Nome da Nova Área Operacional
                  </label>
                  <input
                    type="text"
                    value={newAreaInput}
                    onChange={(e) => setNewAreaInput(e.target.value)}
                    placeholder="Ex: Esplanada, Armazém Exterior, McCafé..."
                    className="w-full p-2.5 bg-white border border-gray-300 rounded-xl text-xs outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!newAreaInput.trim()}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 shrink-0"
                >
                  <Plus size={14} />
                  <span>Adicionar Área</span>
                </button>
              </form>

              {/* Area badges */}
              <div>
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                  Áreas Registadas ({localAreas.length})
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {localAreas.map(area => (
                    <div
                      key={area}
                      className="p-3 bg-white border border-gray-200 rounded-xl flex items-center justify-between shadow-2xs hover:border-teal-300 transition-colors"
                    >
                      <span className="font-bold text-xs text-gray-800">{area}</span>
                      <button
                        onClick={() => handleDeleteArea(area)}
                        disabled={localAreas.length <= 1}
                        className="p-1 text-gray-400 hover:text-red-500 rounded-md transition-colors disabled:opacity-30"
                        title="Eliminar Área"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between shrink-0">
          <p className="text-xs text-gray-500">
            As alterações guardadas aqui atualizam o modelo padrão de limpeza.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveAll}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-colors"
            >
              <Save size={16} />
              <span>Guardar Alterações</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
