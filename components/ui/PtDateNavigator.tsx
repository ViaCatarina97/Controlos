import React, { useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface PtDateNavigatorProps {
  value: string;
  onChange: (nextDate: string) => void;
  allowClear?: boolean;
  placeholder?: string;
  compact?: boolean;
  className?: string;
}

const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS_SHORT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

function getTodayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
}

function shiftIsoDate(iso: string, deltaDays: number): string {
  const base = iso ? new Date(`${iso}T12:00:00`) : new Date();
  if (Number.isNaN(base.getTime())) return getTodayIso();
  base.setDate(base.getDate() + deltaDays);
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(
    base.getDate()
  ).padStart(2, '0')}`;
}

export function formatPtShortDate(iso: string, includeWeekday = true): string {
  if (!iso) return '';
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, '0');
  const mon = MONTHS_SHORT[d.getMonth()];
  const yr = d.getFullYear();
  if (!includeWeekday) return `${day} ${mon} ${yr}`;
  return `${WEEKDAYS_SHORT[d.getDay()]}, ${day} ${mon} ${yr}`;
}

export const PtDateNavigator: React.FC<PtDateNavigatorProps> = ({
  value,
  onChange,
  allowClear = false,
  placeholder = 'Filtrar data',
  compact = false,
  className = '',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const todayIso = getTodayIso();
  const isToday = value === todayIso;

  const openPicker = () => {
    const el = inputRef.current;
    if (!el) return;
    if (typeof (el as any).showPicker === 'function') {
      try {
        (el as any).showPicker();
        return;
      } catch {
        // fallback to focus/click
      }
    }
    el.focus();
    el.click();
  };

  return (
    <div
      className={`inline-flex items-center gap-1 bg-slate-50 border border-slate-200/90 rounded-xl p-1 shadow-2xs ${className}`}
    >
      <button
        type="button"
        onClick={() => onChange(shiftIsoDate(value || todayIso, -1))}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-white transition-all cursor-pointer shrink-0"
        title="Dia anterior"
      >
        <ChevronLeft size={15} />
      </button>

      <div className="relative flex items-center">
        <button
          type="button"
          onClick={openPicker}
          className="px-2.5 py-1 rounded-lg hover:bg-white transition-all flex items-center gap-1.5 text-xs font-bold text-slate-800 whitespace-nowrap cursor-pointer"
          title="Escolher data no calendário"
        >
          <Calendar size={13.5} className="text-amber-600 shrink-0" />
          <span>{value ? formatPtShortDate(value, !compact) : placeholder}</span>
        </button>

        <input
          ref={inputRef}
          type="date"
          value={value}
          onChange={e => onChange(e.target.value)}
          tabIndex={-1}
          aria-label="Selecionar data"
          className="sr-only"
        />
      </div>

      {allowClear && value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-white transition-all cursor-pointer shrink-0"
          title="Limpar filtro de data"
        >
          <X size={13} />
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => onChange(shiftIsoDate(value || todayIso, 1))}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-white transition-all cursor-pointer shrink-0"
        title="Dia seguinte"
      >
        <ChevronRight size={15} />
      </button>

      {!allowClear && !isToday && (
        <button
          type="button"
          onClick={() => onChange(todayIso)}
          className="ml-0.5 px-2 py-1 rounded-lg bg-amber-100/80 hover:bg-amber-200/80 text-amber-900 text-[11px] font-bold transition-colors cursor-pointer shrink-0"
          title="Voltar para hoje"
        >
          Hoje
        </button>
      )}
    </div>
  );
};
