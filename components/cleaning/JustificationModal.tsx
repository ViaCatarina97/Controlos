import React, { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle2, MessageSquare } from 'lucide-react';
import { CleaningTaskItem, CleaningTaskStatus } from '../../types';

interface JustificationModalProps {
  isOpen: boolean;
  task: CleaningTaskItem | null;
  shiftLabel?: string;
  dayLabel?: string;
  currentStatus?: CleaningTaskStatus;
  currentManager?: string;
  onClose: () => void;
  onSaveJustification: (taskId: string, justification: string, notes?: string) => void;
  onMarkCompleted: (taskId: string) => void;
}

export const JustificationModal: React.FC<JustificationModalProps> = ({
  isOpen,
  task,
  shiftLabel,
  dayLabel,
  currentStatus,
  currentManager,
  onClose,
  onSaveJustification,
  onMarkCompleted
}) => {
  const [justification, setJustification] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (currentStatus) {
      setJustification(currentStatus.justification || '');
      setNotes(currentStatus.notes || '');
    } else {
      setJustification('');
      setNotes('');
    }
    setError('');
  }, [currentStatus, isOpen]);

  if (!isOpen || !task) return null;

  const quickReasons = [
    'Falta de produto químico / detergente',
    'Avaria mecânica ou equipamento fora de serviço',
    'Pico de vendas imprevisto / sobrecarga na operação',
    'Falta de pessoal no turno',
    'A aguardar intervenção de manutenção externa',
    'Tarefa reagendada para o turno seguinte'
  ];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!justification.trim()) {
      setError('Por favor, indique a justificação ou motivo da não realização.');
      return;
    }
    onSaveJustification(task.id, justification.trim(), notes.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-amber-500 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <AlertCircle size={22} className="text-amber-100" />
            <h3 className="font-bold text-base tracking-tight">Justificar Tarefa Não Realizada</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-amber-600 rounded-lg transition-colors text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Task Details */}
        <div className="p-6 space-y-4">
          <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                {dayLabel || task.day} • {shiftLabel || task.shift}
              </span>
              <span className="px-2 py-0.5 bg-teal-50 text-teal-700 text-xs font-semibold rounded-md border border-teal-200">
                {task.area}
              </span>
            </div>
            <h4 className="text-base font-bold text-gray-900">{task.tarefa}</h4>
            {currentManager && (
              <p className="text-xs text-gray-500">
                Gerente responsável pelo turno: <span className="font-semibold text-gray-800">{currentManager}</span>
              </p>
            )}
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Motivo / Justificação da Não Realização <span className="text-red-500">*</span>
              </label>

              {/* Quick suggestions */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {quickReasons.map((reason, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setJustification(reason)}
                    className="text-[11px] px-2.5 py-1 bg-gray-100 hover:bg-amber-100 hover:text-amber-800 text-gray-700 rounded-lg transition-colors border border-gray-200 text-left"
                  >
                    {reason}
                  </button>
                ))}
              </div>

              <textarea
                value={justification}
                onChange={(e) => {
                  setJustification(e.target.value);
                  if (error) setError('');
                }}
                rows={3}
                placeholder="Descreva detalhadamente o motivo pelo qual a tarefa não foi executada..."
                className={`w-full p-3 text-sm border rounded-xl outline-hidden transition-all focus:ring-2 focus:ring-amber-500 ${
                  error ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'
                }`}
              />
              {error && <p className="text-xs text-red-600 mt-1 font-medium">{error}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Observações Adicionais (opcional)
              </label>
              <div className="relative">
                <MessageSquare size={16} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Tarefa delegada, novo produto encomendado..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-xl outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  onMarkCompleted(task.id);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors"
              >
                <CheckCircle2 size={16} />
                <span>Marcar como Concluída</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors"
                >
                  Guardar Justificação
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
