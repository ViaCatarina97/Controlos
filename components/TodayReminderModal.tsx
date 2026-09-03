import React from 'react';
import { AgendaEvent } from '../types';
import { 
  Bell, Calendar, Clock, User, CheckCircle2, 
  ArrowRight, X, Cake, Users, CheckSquare, 
  ClipboardCheck, Sparkles, Trash2 
} from 'lucide-react';

interface TodayReminderModalProps {
  events: AgendaEvent[];
  isOpen: boolean;
  onClose: () => void;
  onOpenAgenda: () => void;
  onDeleteEvent?: (eventId: string) => Promise<void>;
}

export const TodayReminderModal: React.FC<TodayReminderModalProps> = ({
  events,
  isOpen,
  onClose,
  onOpenAgenda,
  onDeleteEvent
}) => {
  if (!isOpen || events.length === 0) return null;

  const today = new Date();
  const dateFormatted = today.toLocaleDateString('pt-PT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'aniversario':
        return <Cake size={18} className="text-pink-600" />;
      case 'reuniao':
        return <Users size={18} className="text-blue-600" />;
      case 'tarefa':
        return <CheckSquare size={18} className="text-amber-600" />;
      case 'visita':
      case 'auditoria':
        return <ClipboardCheck size={18} className="text-emerald-600" />;
      default:
        return <Calendar size={18} className="text-indigo-600" />;
    }
  };

  const getEventBadgeClass = (type: string) => {
    switch (type) {
      case 'aniversario':
        return 'bg-pink-100 text-pink-700 border-pink-200';
      case 'reuniao':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'tarefa':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'visita':
      case 'auditoria':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default:
        return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    }
  };

  const getEventTypeName = (type: string) => {
    switch (type) {
      case 'aniversario':
        return 'Aniversário';
      case 'reuniao':
        return 'Reunião';
      case 'tarefa':
        return 'Tarefa';
      case 'visita':
        return 'Visita';
      case 'auditoria':
        return 'Auditoria';
      default:
        return 'Evento';
    }
  };

  return (
    <div 
      id="today-reminder-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
    >
      <div 
        id="today-reminder-modal-container"
        className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-scale-up"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-blue-700 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            title="Fechar"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl text-white shadow-inner flex items-center justify-center">
              <Bell size={28} className="animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-extrabold bg-white/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles size={12} /> Lembretes de Hoje
                </span>
                <span className="text-xs bg-amber-400 text-amber-950 font-black px-2 py-0.5 rounded-full">
                  {events.length} {events.length === 1 ? 'evento' : 'eventos'}
                </span>
              </div>
              <h3 className="text-xl font-black mt-1 capitalize">{dateFormatted}</h3>
              <p className="text-xs text-white/80 mt-0.5">
                Existem eventos e lembretes programados para o restaurante no dia de hoje.
              </p>
            </div>
          </div>
        </div>

        {/* Event List */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {events.map((event) => (
            <div
              key={event.id}
              className="p-4 rounded-2xl border border-gray-100 bg-gray-50/80 hover:bg-white hover:shadow-md transition-all flex flex-col gap-2 relative group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className={`p-2 rounded-xl border flex items-center justify-center shadow-xs ${getEventBadgeClass(event.type)}`}>
                    {getEventIcon(event.type)}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border uppercase ${getEventBadgeClass(event.type)}`}>
                        {getEventTypeName(event.type)}
                      </span>
                      <span className="text-xs font-black text-gray-500 flex items-center gap-1">
                        <Clock size={12} />
                        {event.time && !event.isAllDay ? event.time : 'Dia inteiro'}
                      </span>
                      {event.isCompleted && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1 border border-emerald-200">
                          <CheckCircle2 size={11} /> Concluído
                        </span>
                      )}
                    </div>
                    <h4 className="text-base font-bold text-gray-900 mt-1">{event.title}</h4>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {event.managerName && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-gray-200 shadow-2xs font-medium">
                      <User size={13} className="text-blue-600" />
                      <span>{event.managerName}</span>
                    </div>
                  )}

                  {onDeleteEvent && (
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (confirm('Tem a certeza que pretende eliminar este evento?')) {
                          await onDeleteEvent(event.id);
                        }
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar evento"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              {event.description && (
                <p className="text-sm text-gray-600 pl-11 whitespace-pre-wrap leading-relaxed">
                  {event.description}
                </p>
              )}

              {event.reminderDuration && event.reminderDuration !== 'no_dia' && (
                <div className="pl-11 text-[11px] text-gray-400 font-medium">
                  Aviso antecipado programado ({event.reminderDuration.replace('_', ' ')})
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 px-6 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="text-xs text-gray-400 font-medium text-center sm:text-left">
            Pode consultar e gerir todos os eventos no menu Agenda Digital.
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-bold uppercase tracking-wider transition-colors"
            >
              Fechar
            </button>
            <button
              onClick={() => {
                onClose();
                onOpenAgenda();
              }}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              <span>Abrir Agenda Digital</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
