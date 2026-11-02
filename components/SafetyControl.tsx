import React from 'react';
import {
  LayoutDashboard,
  ClipboardCheck,
  Users,
  Flame,
  Map,
  Lightbulb,
  Heart,
  Megaphone,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';

export interface SafetyTab {
  id: string;
  label: string;
  short: string;
  icon: any;
  description: string;
}

/**
 * Abas mantidas do módulo de Prevenção e Segurança, alinhadas com a folha
 * de controlo da unidade (livro de verificações, extintores, iluminação,
 * mala de primeiros socorros, mapas e sensibilização mensal).
 */
export const SAFETY_TABS: SafetyTab[] = [
  {
    id: 'safety_overview',
    label: 'Visão Geral',
    short: 'Visão',
    icon: LayoutDashboard,
    description:
      'Índice das secções de Prevenção e Segurança da unidade e acesso direto a cada uma.',
  },
  {
    id: 'lv_prevencao',
    label: 'Lv Prevenção e Segurança',
    short: 'LV P&S',
    icon: ClipboardCheck,
    description: 'Livro de verificações de Prevenção e Segurança da unidade.',
  },
  {
    id: 'funcionarios',
    label: 'Lista Funcionários',
    short: 'Equipa',
    icon: Users,
    description:
      'Funcionários em funções, posto de trabalho e número de colaboradores da unidade.',
  },
  {
    id: 'extintores',
    label: 'Extintores',
    short: 'Extintores',
    icon: Flame,
    description:
      'Verificação do equipamento de extinção de incêndios: extintores, validade e responsável.',
  },
  {
    id: 'iluminacao',
    label: 'Iluminação',
    short: 'Iluminação',
    icon: Lightbulb,
    description: 'Verificação das luzes de emergência da unidade.',
  },
  {
    id: 'mala_socorros',
    label: 'Mala Primeiros Socorros',
    short: 'Mala',
    icon: Heart,
    description: 'Verificação do conteúdo e das validades da mala de primeiros socorros.',
  },
  {
    id: 'mapa_iluminacao',
    label: 'Mapa Iluminação',
    short: 'Mapa Ilum.',
    icon: Map,
    description: 'Mapa da unidade com a localização das luzes de emergência.',
  },
  {
    id: 'mapa_extintores',
    label: 'Mapa Extintores',
    short: 'Mapa Ext.',
    icon: Map,
    description: 'Mapa da unidade com a localização dos extintores e da sinalética.',
  },
  {
    id: 'sensibilizacao',
    label: 'Sensibilização Mensal',
    short: 'Sensibil.',
    icon: Megaphone,
    description: 'Sensibilização mensal das equipas em matéria de segurança e higiene.',
  },
];

interface SafetyControlProps {
  restaurantId: string;
  activeSubTab: string;
  onTabChange?: (tab: string) => void;
}

const EmptySectionCard: React.FC<{ tab: SafetyTab }> = ({ tab }) => {
  const Icon = tab.icon;
  return (
    <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 sm:p-12 text-center">
      <div className="inline-flex p-3.5 rounded-2xl bg-slate-50 text-slate-400 mb-3">
        <Icon size={26} />
      </div>
      <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">
        Secção pronta a configurar
      </h4>
      <p className="text-xs text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">
        O separador <strong className="text-slate-700">{tab.label}</strong> já está integrado na
        navegação do módulo. Os registos desta secção são construídos a seguir.
      </p>
    </div>
  );
};

const SafetyOverview: React.FC<{ onTabChange?: (tab: string) => void }> = ({ onTabChange }) => (
  <>
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
          <ShieldAlert size={24} />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
            Prevenção e Segurança
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-2xl">
            Controlo de HST da unidade: livro de verificações, extintores e iluminação de
            emergência com os respetivos mapas, mala de primeiros socorros, lista de funcionários
            e sensibilização mensal das equipas.
          </p>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {SAFETY_TABS.filter(tab => tab.id !== 'safety_overview').map(tab => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange?.(tab.id)}
            className="group text-left bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex items-start gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-600 group-hover:bg-amber-400 group-hover:text-slate-950 flex items-center justify-center shrink-0 transition-colors">
              <Icon size={19} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-extrabold text-slate-900 tracking-tight truncate">
                  {tab.label}
                </h4>
                <ArrowRight
                  size={14}
                  className="text-slate-300 group-hover:text-slate-900 shrink-0 transition-colors"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
                {tab.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  </>
);

const SafetyControl: React.FC<SafetyControlProps> = ({ activeSubTab, onTabChange }) => {
  const activeTab = SAFETY_TABS.find(tab => tab.id === activeSubTab) ?? SAFETY_TABS[0];

  if (activeTab.id === 'safety_overview') {
    return (
      <div className="space-y-5 animate-fade-in">
        <SafetyOverview onTabChange={onTabChange} />
      </div>
    );
  }

  const Icon = activeTab.icon;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <Icon size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Prevenção e Segurança
            </p>
            <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
              {activeTab.label}
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-2xl">
              {activeTab.description}
            </p>
          </div>
        </div>
      </div>

      <EmptySectionCard tab={activeTab} />
    </div>
  );
};

export default SafetyControl;
