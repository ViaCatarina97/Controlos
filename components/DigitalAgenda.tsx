import React, { useState, useMemo } from 'react';
import { AgendaEvent, AgendaEventType, Employee, AppSettings } from '../types';
import { 
  Calendar as CalendarIcon, Clock, Plus, ChevronLeft, ChevronRight, 
  Search, Filter, Cake, Users, CheckSquare, ClipboardCheck, 
  Trash2, Edit, CheckCircle2, Circle, AlertCircle, X, 
  User, Sparkles, Bell, CalendarDays, ListFilter, Eye,
  CloudCheck, RefreshCw, Loader2
} from 'lucide-react';

interface DigitalAgendaProps {
  restaurantId: string;
  employees: Employee[];
  settings: AppSettings;
  events: AgendaEvent[];
  onSaveEvent: (event: AgendaEvent) => Promise<void>;
  onDeleteEvent: (eventId: string) => Promise<void>;
  isSyncing?: boolean;
  lastSync?: string;
  onManualSync?: () => Promise<void>;
}

type ViewMode = 'month' | 'week' | 'list';

const EVENT_TYPE_CONFIG: Record<AgendaEventType, { label: string; icon: any; color: string; badge: string; border: string }> = {
  aniversario: {
    label: 'Aniversário',
    icon: Cake,
    color: 'bg-pink-500 text-white',
    badge: 'bg-pink-100 text-pink-700 border-pink-200',
    border: 'border-pink-500'
  },
  reuniao: {
    label: 'Reunião',
    icon: Users,
    color: 'bg-blue-600 text-white',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    border: 'border-blue-500'
  },
  tarefa: {
    label: 'Tarefa',
    icon: CheckSquare,
    color: 'bg-amber-500 text-white',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    border: 'border-amber-500'
  },
  visita: {
    label: 'Visita',
    icon: ClipboardCheck,
    color: 'bg-emerald-600 text-white',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    border: 'border-emerald-500'
  },
  auditoria: {
    label: 'Auditoria',
    icon: ClipboardCheck,
    color: 'bg-purple-600 text-white',
    badge: 'bg-purple-100 text-purple-700 border-purple-200',
    border: 'border-purple-500'
  },
  outro: {
    label: 'Outro',
    icon: CalendarIcon,
    color: 'bg-slate-700 text-white',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    border: 'border-slate-500'
  }
};

const REMINDER_OPTIONS = [
  { value: 'no_dia', label: 'No próprio dia (00:00)' },
  { value: '1_dia', label: '1 dia antes' },
  { value: '2_dias', label: '2 dias antes' },
  { value: '3_dias', label: '3 dias antes' },
  { value: '1_semana', label: '1 semana antes' },
  { value: '2_semanas', label: '2 semanas antes' }
];

// Helper functions to safely handle dates without UTC timezone shift
export const getLocalDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseLocalDateString = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

export const DigitalAgenda: React.FC<DigitalAgendaProps> = ({
  restaurantId,
  employees,
  settings,
  events,
  onSaveEvent,
  onDeleteEvent,
  isSyncing = false,
  lastSync,
  onManualSync
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(() => getLocalDateString(new Date()));
  const [viewMode, setViewMode] = useState<ViewMode>('month');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [managerFilter, setManagerFilter] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AgendaEvent | null>(null);

  // Form fields
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<AgendaEventType>('reuniao');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formIsAllDay, setFormIsAllDay] = useState(true);
  const [formDescription, setFormDescription] = useState('');
  const [formManagerId, setFormManagerId] = useState('');
  const [formReminderDuration, setFormReminderDuration] = useState('no_dia');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Managers list - apenas colaboradores com cargo 'GERENTE' nas definições
  const managers = useMemo(() => {
    return employees.filter(e => e.isActive && e.role === 'GERENTE');
  }, [employees]);

  // All active employees
  const activeEmployees = useMemo(() => {
    return employees.filter(e => e.isActive);
  }, [employees]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      const matchSearch = searchQuery.trim() === '' || 
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.managerName && e.managerName.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchType = typeFilter === 'all' || e.type === typeFilter;
      const matchManager = managerFilter === 'all' || e.managerId === managerFilter;

      return matchSearch && matchType && matchManager;
    });
  }, [events, searchQuery, typeFilter, managerFilter]);

  // Today string
  const todayStr = useMemo(() => getLocalDateString(new Date()), []);

  // Events for selected date
  const selectedDateEvents = useMemo(() => {
    return filteredEvents.filter(e => e.date === selectedDate);
  }, [filteredEvents, selectedDate]);

  // Events grouped by date for month view
  const eventsByDate = useMemo(() => {
    const map: Record<string, AgendaEvent[]> = {};
    filteredEvents.forEach(e => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }, [filteredEvents]);

  // Navigation functions
  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else if (viewMode === 'week') {
      const newD = new Date(currentDate);
      newD.setDate(newD.getDate() - 7);
      setCurrentDate(newD);
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else if (viewMode === 'week') {
      const newD = new Date(currentDate);
      newD.setDate(newD.getDate() + 7);
      setCurrentDate(newD);
    }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(getLocalDateString(now));
  };

  // Open modal for new event
  const handleOpenNewModal = (prefillDate?: string) => {
    setEditingEvent(null);
    setFormTitle('');
    setFormType('reuniao');
    setFormDate(prefillDate || selectedDate || todayStr);
    setFormTime('');
    setFormIsAllDay(true);
    setFormDescription('');
    setFormManagerId('');
    setFormReminderDuration('no_dia');
    setFormError('');
    setIsModalOpen(true);
  };

  // Open modal for edit
  const handleOpenEditModal = (event: AgendaEvent) => {
    setEditingEvent(event);
    setFormTitle(event.title);
    setFormType(event.type);
    setFormDate(event.date);
    setFormTime(event.time || '');
    setFormIsAllDay(event.isAllDay ?? (!event.time));
    setFormDescription(event.description || '');
    setFormManagerId(event.managerId || '');
    setFormReminderDuration(event.reminderDuration || 'no_dia');
    setFormError('');
    setIsModalOpen(true);
  };

  // Save event
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Por favor introduza o título do evento.');
      return;
    }
    if (!formDate) {
      setFormError('Por favor selecione a data do evento.');
      return;
    }

    setFormSubmitting(true);
    setFormError('');

    try {
      const selectedManager = employees.find(emp => emp.id === formManagerId);
      
      const newOrUpdatedEvent: AgendaEvent = {
        id: editingEvent ? editingEvent.id : `evt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        title: formTitle.trim(),
        type: formType,
        date: formDate,
        time: formIsAllDay ? '' : formTime,
        isAllDay: formIsAllDay,
        description: formDescription.trim(),
        managerId: formManagerId || '',
        managerName: selectedManager ? selectedManager.name : (formManagerId || ''),
        reminderDuration: formReminderDuration || 'no_dia',
        isCompleted: editingEvent ? !!editingEvent.isCompleted : false,
        createdAt: editingEvent?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await onSaveEvent(newOrUpdatedEvent);
      setIsModalOpen(false);
    } catch (err) {
      console.error("Erro ao guardar evento na agenda:", err);
      setFormError('Ocorreu um erro ao guardar o evento. Tente novamente.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Toggle completion
  const handleToggleComplete = async (event: AgendaEvent) => {
    try {
      const updated: AgendaEvent = {
        ...event,
        isCompleted: !event.isCompleted,
        updatedAt: new Date().toISOString()
      };
      await onSaveEvent(updated);
    } catch (err) {
      console.error("Erro ao alternar conclusão:", err);
    }
  };

  // Delete event
  const handleDelete = async (eventId: string) => {
    if (confirm('Tem a certeza que pretende eliminar este evento da agenda?')) {
      try {
        await onDeleteEvent(eventId);
        if (isModalOpen && editingEvent?.id === eventId) {
          setIsModalOpen(false);
          setEditingEvent(null);
        }
      } catch (err) {
        console.error("Erro ao eliminar evento:", err);
        alert('Erro ao eliminar evento.');
      }
    }
  };

  // Month grid calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = currentDate.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });

  // Get calendar matrix
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Monday = 0, Sunday = 6 in European format
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days: Array<{ date: string; dayNumber: number; isCurrentMonth: boolean; isToday: boolean }> = [];

    // Previous month filler days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const d = new Date(year, month - 1, dayNum);
      const dateStr = getLocalDateString(d);
      days.push({
        date: dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr
      });
    }

    // Current month days
    for (let d = 1; d <= lastDayOfMonth.getDate(); d++) {
      const cur = new Date(year, month, d);
      const dateStr = getLocalDateString(cur);
      days.push({
        date: dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr
      });
    }

    // Next month filler days to complete 35 or 42 grid
    const totalSlots = days.length <= 35 ? 35 : 42;
    const remaining = totalSlots - days.length;
    for (let d = 1; d <= remaining; d++) {
      const nextD = new Date(year, month + 1, d);
      const dateStr = getLocalDateString(nextD);
      days.push({
        date: dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr
      });
    }

    return days;
  }, [year, month, todayStr]);

  // Week days calculation for week view
  const weekDays = useMemo(() => {
    const curr = new Date(currentDate);
    const day = curr.getDay();
    const diff = curr.getDate() - (day === 0 ? 6 : day - 1);
    const monday = new Date(curr.getFullYear(), curr.getMonth(), diff);

    const week: Array<{ date: string; dateObj: Date; isToday: boolean }> = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      const dateStr = getLocalDateString(d);
      week.push({
        date: dateStr,
        dateObj: d,
        isToday: dateStr === todayStr
      });
    }
    return week;
  }, [currentDate, todayStr]);

  return (
    <div id="digital-agenda-root" className="space-y-6 animate-fade-in pb-12">
      
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl text-white shadow-md">
            <CalendarDays size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Agenda Digital</h1>
              <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full border border-indigo-200">
                {restaurantId}
              </span>
            </div>
            <p className="text-sm text-gray-500 font-medium mt-0.5">
              Calendário operacional de eventos, aniversários, reuniões, tarefas e auditorias.
            </p>
          </div>
        </div>

        {/* View Toggle, Sync Badge & Add Button */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Cloud Sync Status */}
          {onManualSync && (
            <button
              onClick={() => onManualSync()}
              disabled={isSyncing}
              title={lastSync ? `Última sincronização: ${lastSync}. Clique para atualizar agora.` : 'Sincronizar com a Nuvem'}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all disabled:opacity-60 shadow-2xs cursor-pointer active:scale-95"
            >
              {isSyncing ? (
                <Loader2 size={13} className="animate-spin text-emerald-600" />
              ) : (
                <CloudCheck size={13} className="text-emerald-600" />
              )}
              <span>{isSyncing ? 'A sincronizar...' : 'Nuvem Sincronizada'}</span>
              <RefreshCw size={11} className={`text-emerald-500 ml-0.5 ${isSyncing ? 'animate-spin' : 'hover:rotate-180 transition-transform'}`} />
            </button>
          )}

          <div className="bg-gray-100 p-1 rounded-xl flex items-center gap-1 border border-gray-200 text-xs font-bold">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-lg transition-all ${viewMode === 'month' ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Mês
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-lg transition-all ${viewMode === 'week' ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Semana
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Lista
            </button>
          </div>

          <button
            onClick={() => handleOpenNewModal()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 ml-auto lg:ml-0"
          >
            <Plus size={16} />
            <span>Novo Evento</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Pesquisar eventos, gerentes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
          />
        </div>

        {/* Category & Manager Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Filter size={14} />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todas as Categorias</option>
              <option value="aniversario">🎂 Aniversários</option>
              <option value="reuniao">👥 Reuniões</option>
              <option value="tarefa">📋 Tarefas</option>
              <option value="visita">🔍 Visitas</option>
              <option value="auditoria">🛡️ Auditorias</option>
              <option value="outro">📌 Outros</option>
            </select>
          </div>

          {/* Manager Filter */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <User size={14} />
            <select
              value={managerFilter}
              onChange={(e) => setManagerFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos os Gerentes</option>
              {managers.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>

          {(typeFilter !== 'all' || managerFilter !== 'all' || searchQuery !== '') && (
            <button
              onClick={() => {
                setTypeFilter('all');
                setManagerFilter('all');
                setSearchQuery('');
              }}
              className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 transition-colors text-xs font-bold flex items-center gap-1"
              title="Limpar filtros"
            >
              <X size={14} />
              <span>Limpar</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW: Month View */}
      {viewMode === 'month' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Calendar Card */}
          <div className="lg:col-span-3 bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
            {/* Calendar Navigation Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-black text-gray-900 capitalize">{monthName}</h2>
                <button
                  onClick={handleToday}
                  className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:text-blue-600 hover:border-blue-300 shadow-2xs transition-all"
                >
                  Hoje
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrev}
                  className="p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-white border border-transparent hover:border-gray-200 shadow-2xs transition-all"
                  title="Mês Anterior"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={handleNext}
                  className="p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-white border border-transparent hover:border-gray-200 shadow-2xs transition-all"
                  title="Mês Seguinte"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* Days of week header */}
            <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-100/50 text-center py-2 text-xs font-black text-gray-500 uppercase tracking-wider">
              <span>Seg</span>
              <span>Ter</span>
              <span>Qua</span>
              <span>Qui</span>
              <span>Sex</span>
              <span>Sáb</span>
              <span>Dom</span>
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-gray-100 flex-1">
              {calendarDays.map((cell) => {
                const dayEvents = eventsByDate[cell.date] || [];
                const isSelected = cell.date === selectedDate;

                return (
                  <div
                    key={cell.date}
                    onClick={() => setSelectedDate(cell.date)}
                    onDoubleClick={() => handleOpenNewModal(cell.date)}
                    className={`min-h-[105px] p-2 flex flex-col justify-between transition-all cursor-pointer group relative ${
                      !cell.isCurrentMonth ? 'bg-gray-50/40 text-gray-300' : 'bg-white'
                    } ${cell.isToday ? 'bg-blue-50/30' : ''} ${
                      isSelected ? 'ring-2 ring-blue-500 ring-inset z-10' : 'hover:bg-blue-50/20'
                    }`}
                  >
                    {/* Day number & quick add */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-black w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                          cell.isToday
                            ? 'bg-blue-600 text-white shadow-xs'
                            : isSelected
                            ? 'bg-gray-900 text-white'
                            : cell.isCurrentMonth
                            ? 'text-gray-700'
                            : 'text-gray-400'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenNewModal(cell.date);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-blue-600 hover:bg-blue-100 rounded-md transition-all"
                        title="Adicionar evento neste dia"
                      >
                        <Plus size={13} />
                      </button>
                    </div>

                    {/* Day events pills */}
                    <div className="mt-1 space-y-1 flex-1 overflow-hidden">
                      {dayEvents.slice(0, 3).map((ev) => {
                        const conf = EVENT_TYPE_CONFIG[ev.type] || EVENT_TYPE_CONFIG.outro;
                        return (
                          <div
                            key={ev.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditModal(ev);
                            }}
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded truncate flex items-center justify-between gap-1 transition-transform hover:scale-102 ${conf.badge} ${
                              ev.isCompleted ? 'line-through opacity-60' : ''
                            } group/pill`}
                            title={`${ev.time || 'Dia inteiro'} - ${ev.title}`}
                          >
                            <span className="flex items-center gap-1 truncate">
                              <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0"></span>
                              <span className="truncate">{ev.title}</span>
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(ev.id);
                              }}
                              className="opacity-0 group-hover/pill:opacity-100 p-0.5 text-gray-400 hover:text-red-600 rounded transition-all shrink-0"
                              title="Eliminar evento"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <div className="text-[10px] text-gray-400 font-bold pl-1">
                          +{dayEvents.length - 3} mais
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Sidebar: Selected Day Details */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    Dia Selecionado
                  </span>
                  <h3 className="text-base font-black text-gray-900 mt-1 capitalize">
                    {parseLocalDateString(selectedDate).toLocaleDateString('pt-PT', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'long'
                    })}
                  </h3>
                </div>
                <button
                  onClick={() => handleOpenNewModal(selectedDate)}
                  className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl transition-colors"
                  title="Criar evento para esta data"
                >
                  <Plus size={18} />
                </button>
              </div>

              {/* Day Event List */}
              {selectedDateEvents.length === 0 ? (
                <div className="py-12 text-center text-gray-400 flex flex-col items-center">
                  <CalendarIcon size={36} className="text-gray-300 mb-2" />
                  <p className="text-xs font-bold">Nenhum evento neste dia.</p>
                  <button
                    onClick={() => handleOpenNewModal(selectedDate)}
                    className="mt-3 text-xs text-blue-600 font-bold hover:underline"
                  >
                    + Criar Evento
                  </button>
                </div>
              ) : (
                <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                  {selectedDateEvents.map((ev) => {
                    const conf = EVENT_TYPE_CONFIG[ev.type] || EVENT_TYPE_CONFIG.outro;
                    const IconComp = conf.icon;
                    return (
                      <div
                        key={ev.id}
                        className={`p-3 rounded-2xl border bg-gray-50/60 hover:bg-white hover:shadow-sm transition-all border-gray-100 flex flex-col gap-2 relative group ${
                          ev.isCompleted ? 'opacity-70 bg-gray-50' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`p-1.5 rounded-lg text-white ${conf.color}`}>
                              <IconComp size={14} />
                            </span>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${conf.badge}`}>
                                  {conf.label}
                                </span>
                                <span className="text-[11px] font-bold text-gray-500 flex items-center gap-1">
                                  <Clock size={11} />
                                  {ev.time && !ev.isAllDay ? ev.time : 'Dia inteiro'}
                                </span>
                              </div>
                              <h4 className={`text-sm font-bold text-gray-900 mt-0.5 ${ev.isCompleted ? 'line-through text-gray-500' : ''}`}>
                                {ev.title}
                              </h4>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                            <button
                              onClick={() => handleToggleComplete(ev)}
                              className="p-1 text-gray-400 hover:text-emerald-600 rounded-md transition-colors"
                              title={ev.isCompleted ? 'Marcar como pendente' : 'Marcar como concluído'}
                            >
                              {ev.isCompleted ? (
                                <CheckCircle2 size={16} className="text-emerald-600" />
                              ) : (
                                <Circle size={16} />
                              )}
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(ev)}
                              className="p-1 text-gray-400 hover:text-blue-600 rounded-md transition-colors"
                              title="Editar"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(ev.id)}
                              className="p-1 text-gray-400 hover:text-red-600 rounded-md transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {ev.description && (
                          <p className="text-xs text-gray-600 pl-7 line-clamp-2">
                            {ev.description}
                          </p>
                        )}

                        {ev.managerName && (
                          <div className="flex items-center gap-1 text-[11px] text-gray-500 font-medium pl-7">
                            <User size={12} className="text-blue-500" />
                            <span>{ev.managerName}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Summary of the month */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                <span>Total no mês:</span>
                <span className="font-bold text-gray-800">{filteredEvents.length} eventos</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: Week View */}
      {viewMode === 'week' && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
            <h2 className="text-lg font-black text-gray-900 capitalize">
              Semana de {weekDays[0].dateObj.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })} a{' '}
              {weekDays[6].dateObj.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })}
            </h2>

            <div className="flex items-center gap-2">
              <button
                onClick={handleToday}
                className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:text-blue-600 hover:border-blue-300 shadow-2xs transition-all"
              >
                Hoje
              </button>
              <button
                onClick={handlePrev}
                className="p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-white border border-transparent hover:border-gray-200 shadow-2xs transition-all"
                title="Semana Anterior"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={handleNext}
                className="p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-white border border-transparent hover:border-gray-200 shadow-2xs transition-all"
                title="Semana Seguinte"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* 7 Columns Grid */}
          <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-gray-100 min-h-[450px]">
            {weekDays.map((wd) => {
              const dayEvents = eventsByDate[wd.date] || [];
              const dayName = wd.dateObj.toLocaleDateString('pt-PT', { weekday: 'short' });
              const isToday = wd.isToday;

              return (
                <div
                  key={wd.date}
                  className={`p-3 flex flex-col ${isToday ? 'bg-blue-50/30' : 'bg-white'}`}
                >
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-3">
                    <div>
                      <span className="text-[10px] font-black uppercase text-gray-400">{dayName}</span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-sm font-black w-6 h-6 rounded-full flex items-center justify-center ${
                            isToday ? 'bg-blue-600 text-white' : 'text-gray-800'
                          }`}
                        >
                          {wd.dateObj.getDate()}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleOpenNewModal(wd.date)}
                      className="p-1 text-gray-400 hover:text-blue-600 rounded-md transition-colors"
                      title="Adicionar evento"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <div className="space-y-2 flex-1">
                    {dayEvents.map((ev) => {
                      const conf = EVENT_TYPE_CONFIG[ev.type] || EVENT_TYPE_CONFIG.outro;
                      return (
                        <div
                          key={ev.id}
                          onClick={() => handleOpenEditModal(ev)}
                          className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all hover:shadow-xs flex flex-col gap-1 ${conf.badge} group/card relative`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold uppercase">{conf.label}</span>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-black text-gray-500">
                                {ev.time && !ev.isAllDay ? ev.time : 'Dia inteiro'}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(ev.id);
                                }}
                                className="opacity-0 group-hover/card:opacity-100 p-0.5 text-gray-400 hover:text-red-600 rounded transition-all"
                                title="Eliminar evento"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                          <h4 className="text-xs font-bold text-gray-900 line-clamp-1">{ev.title}</h4>
                          {ev.managerName && (
                            <span className="text-[10px] text-gray-500 truncate">👤 {ev.managerName}</span>
                          )}
                        </div>
                      );
                    })}
                    {dayEvents.length === 0 && (
                      <div className="h-full flex items-center justify-center py-6 text-gray-300 text-[11px] font-medium">
                        Sem eventos
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW: List View */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
            <h2 className="text-lg font-black text-gray-900">Todos os Eventos ({filteredEvents.length})</h2>
            <button
              onClick={() => handleOpenNewModal()}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm"
            >
              <Plus size={14} />
              <span>Novo Evento</span>
            </button>
          </div>

          <div className="divide-y divide-gray-100">
            {filteredEvents.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <CalendarIcon size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-sm font-bold">Nenhum evento encontrado.</p>
                <p className="text-xs text-gray-400 mt-1">Crie um novo evento ou altere os filtros selecionados.</p>
              </div>
            ) : (
              filteredEvents.map((ev) => {
                const conf = EVENT_TYPE_CONFIG[ev.type] || EVENT_TYPE_CONFIG.outro;
                const IconComp = conf.icon;
                const isPast = ev.date < todayStr;
                const isToday = ev.date === todayStr;

                return (
                  <div
                    key={ev.id}
                    className={`p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors hover:bg-gray-50/80 ${
                      isToday ? 'bg-blue-50/20' : ''
                    } ${ev.isCompleted ? 'opacity-65' : ''}`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Date Badge */}
                      <div className="text-center min-w-[64px] p-2 bg-gray-50 rounded-2xl border border-gray-200">
                        <span className="text-[10px] font-black text-gray-400 uppercase block">
                          {parseLocalDateString(ev.date).toLocaleDateString('pt-PT', { weekday: 'short' })}
                        </span>
                        <span className="text-lg font-black text-gray-900 block leading-tight">
                          {parseLocalDateString(ev.date).getDate()}
                        </span>
                        <span className="text-[10px] font-bold text-gray-500 uppercase block">
                          {parseLocalDateString(ev.date).toLocaleDateString('pt-PT', { month: 'short' })}
                        </span>
                      </div>

                      {/* Content */}
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${conf.badge}`}>
                            {conf.label}
                          </span>
                          <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
                            <Clock size={12} />
                            {ev.time && !ev.isAllDay ? ev.time : 'Dia inteiro'}
                          </span>
                          {isToday && (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-blue-600 text-white rounded-full">
                              Hoje
                            </span>
                          )}
                          {ev.isCompleted && (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 size={11} /> Concluído
                            </span>
                          )}
                        </div>

                        <h3 className={`text-base font-bold text-gray-900 mt-1 ${ev.isCompleted ? 'line-through text-gray-400' : ''}`}>
                          {ev.title}
                        </h3>

                        {ev.description && (
                          <p className="text-xs text-gray-600 mt-1 max-w-2xl whitespace-pre-wrap">
                            {ev.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                          {ev.managerName && (
                            <span className="flex items-center gap-1 font-medium bg-gray-100 px-2 py-0.5 rounded-md">
                              <User size={12} className="text-blue-600" />
                              <span>{ev.managerName}</span>
                            </span>
                          )}
                          {ev.reminderDuration && (
                            <span className="flex items-center gap-1 font-medium text-gray-400 text-[11px]">
                              <Bell size={11} />
                              <span>Aviso: {REMINDER_OPTIONS.find(r => r.value === ev.reminderDuration)?.label || ev.reminderDuration}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 self-end md:self-center">
                      <button
                        onClick={() => handleToggleComplete(ev)}
                        className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border ${
                          ev.isCompleted
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {ev.isCompleted ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                        <span className="hidden sm:inline">{ev.isCompleted ? 'Concluído' : 'Concluir'}</span>
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(ev)}
                        className="p-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Editar"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(ev.id)}
                        className="p-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL: Insert / Edit Event */}
      {isModalOpen && (
        <div 
          id="event-form-modal-overlay"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        >
          <div 
            id="event-form-modal-container"
            className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-xl w-full overflow-hidden flex flex-col max-h-[95vh] animate-scale-up"
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
                  <CalendarDays size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">
                    {editingEvent ? 'Editar Evento' : 'Novo Evento na Agenda'}
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    Preencha os detalhes para agendamento e lembretes automáticos.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {editingEvent && (
                  <button
                    type="button"
                    onClick={() => handleDelete(editingEvent.id)}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors"
                    title="Eliminar evento"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors"
                  title="Fechar"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveForm} className="p-6 overflow-y-auto space-y-4 flex-1">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{formError}</span>
                </div>
              )}

              {/* Título */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Título / Assunto <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Aniversário da Maria, Reunião de Gerência, Auditoria..."
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                  required
                  autoFocus
                />
              </div>

              {/* Categoria / Tipo */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Categoria
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {(Object.keys(EVENT_TYPE_CONFIG) as AgendaEventType[]).map((type) => {
                    const isSelected = formType === type;
                    const conf = EVENT_TYPE_CONFIG[type];
                    const IconC = conf.icon;
                    return (
                      <button
                        type="button"
                        key={type}
                        onClick={() => setFormType(type)}
                        className={`p-2 rounded-xl border text-center flex flex-col items-center justify-center gap-1 transition-all ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs ring-1 ring-blue-500'
                            : 'border-gray-200 bg-gray-50/50 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <IconC size={16} />
                        <span className="text-[10px] font-bold">{conf.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Data e Hora */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Data <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Hora
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-blue-600 font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formIsAllDay}
                        onChange={(e) => setFormIsAllDay(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>Dia Inteiro</span>
                    </label>
                  </div>

                  <input
                    type="time"
                    value={formTime}
                    disabled={formIsAllDay}
                    onChange={(e) => setFormTime(e.target.value)}
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm font-medium outline-none transition-all ${
                      formIsAllDay
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                        : 'bg-gray-50 border-gray-200 focus:ring-2 focus:ring-blue-500 focus:bg-white'
                    }`}
                    placeholder="--:--"
                  />
                </div>
              </div>

              {/* Gerente (Opcional) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Gerente Responsável (Opcional)
                </label>
                <select
                  value={formManagerId}
                  onChange={(e) => setFormManagerId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                >
                  <option value="">Sem gerente específico / Toda a equipa</option>
                  {managers.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Duração aviso / Antecedência aviso */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Duração / Antecedência do Aviso
                </label>
                <select
                  value={formReminderDuration}
                  onChange={(e) => setFormReminderDuration(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                >
                  {REMINDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">
                  Define quando o popup de lembrete começará a alertar ao abrir a aplicação.
                </p>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Descrição / Notas
                </label>
                <textarea
                  rows={3}
                  placeholder="Instruções, pauta de reunião, notas importantes..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all resize-none"
                />
              </div>

              {/* Modal Buttons */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
                {editingEvent ? (
                  <button
                    type="button"
                    onClick={() => handleDelete(editingEvent.id)}
                    className="px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5"
                    title="Eliminar este evento"
                  >
                    <Trash2 size={15} />
                    <span>Eliminar Evento</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
                  >
                    <span>{formSubmitting ? 'A guardar...' : editingEvent ? 'Atualizar Evento' : 'Guardar Evento'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
