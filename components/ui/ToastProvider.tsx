import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastVariant = 'success' | 'warning' | 'error' | 'info';

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export const useToast = () => useContext(ToastContext);

function inferToastVariant(message: string): ToastVariant {
  const lower = message.toLowerCase();
  if (
    lower.includes('erro') ||
    lower.includes('falh') ||
    lower.includes('incorret') ||
    lower.includes('inválid') ||
    lower.includes('invalid') ||
    lower.includes('impossível')
  ) {
    return 'error';
  }
  if (
    lower.includes('atenção') ||
    lower.includes('aviso') ||
    lower.includes('selecione') ||
    lower.includes('preencha') ||
    lower.includes('já está') ||
    lower.includes('não pode') ||
    lower.includes('bloquead') ||
    lower.includes('falta') ||
    lower.includes('pendente') ||
    lower.includes('insira')
  ) {
    return 'warning';
  }
  if (
    lower.includes('sucesso') ||
    lower.includes('guardad') ||
    lower.includes('submetid') ||
    lower.includes('encerrad') ||
    lower.includes('atualizad') ||
    lower.includes('validad') ||
    lower.includes('adicionad') ||
    lower.includes('removid') ||
    lower.includes('eliminad') ||
    lower.includes('concluíd')
  ) {
    return 'success';
  }
  return 'info';
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback(
    (rawMessage: string, explicitVariant?: ToastVariant) => {
      const cleaned = String(rawMessage || '')
        .replace(/^[✅⚠️❌ℹ️🔒🎉\s]+/u, '')
        .trim();
      if (!cleaned) return;
      const variant = explicitVariant || inferToastVariant(cleaned);
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      setToasts(prev => [...prev.slice(-3), { id, message: cleaned, variant }]);
      window.setTimeout(() => {
        dismiss(id);
      }, 4200);
    },
    [dismiss]
  );

  // Intercept blocking browser window.alert() across all legacy modules cleanly
  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (msg?: any) => {
      showToast(String(msg ?? ''));
    };
    return () => {
      window.alert = originalAlert;
    };
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Floating Non-Blocking Toast Viewport */}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2rem)] pointer-events-none print:hidden"
      >
        {toasts.map(item => {
          const styles = {
            success: {
              icon: <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />,
              accent: 'bg-emerald-500',
              border: 'border-emerald-200/90',
            },
            warning: {
              icon: <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />,
              accent: 'bg-amber-500',
              border: 'border-amber-200/90',
            },
            error: {
              icon: <XCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />,
              accent: 'bg-rose-500',
              border: 'border-rose-200/90',
            },
            info: {
              icon: <Info size={18} className="text-slate-700 shrink-0 mt-0.5" />,
              accent: 'bg-slate-800',
              border: 'border-slate-200/90',
            },
          }[item.variant];

          return (
            <div
              key={item.id}
              className={`pointer-events-auto relative overflow-hidden bg-white/95 backdrop-blur-md border ${styles.border} rounded-2xl shadow-lg px-4 py-3 flex items-start gap-3 animate-scale-in`}
            >
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${styles.accent}`} />
              {styles.icon}
              <p className="text-xs font-semibold text-slate-800 leading-relaxed flex-1 pr-1">
                {item.message}
              </p>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="text-slate-400 hover:text-slate-700 p-0.5 rounded-lg transition-colors cursor-pointer shrink-0"
                title="Fechar notificação"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
