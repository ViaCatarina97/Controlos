import React from 'react';
import {
  LayoutDashboard,
  Gift,
  Megaphone,
  Heart,
  Flame,
  Lightbulb,
  Bug,
  ClipboardCheck,
  Users,
  FileText,
  ShieldAlert,
  GraduationCap,
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
 * Estrutura de abas herdada da folha "Prevenção e Segurança":
 * o Índice da folha define as áreas e cada uma ganha aqui o seu separador.
 */
export const SAFETY_TABS: SafetyTab[] = [
  {
    id: 'safety_overview',
    label: 'Visão Geral',
    short: 'Visão',
    icon: LayoutDashboard,
    description:
      'Índice dos separadores de Prevenção e Segurança previstos para a unidade.',
  },
  {
    id: 'caixa_surpresa',
    label: 'Caixa Surpresa',
    short: 'Caixa',
    icon: Gift,
    description: 'Registo das caixas surpresa de prevenção e segurança da unidade.',
  },
  {
    id: 'sensibilizacao',
    label: 'Sensibilização Mensal',
    short: 'Sensibil.',
    icon: Megaphone,
    description: 'Sensibilização mensal das equipas em matéria de segurança e higiene.',
  },
  {
    id: 'primeiros_socorros',
    label: 'Material Primeiros Socorros',
    short: 'Socorros',
    icon: Heart,
    description: 'Material de primeiros socorros disponível e respetiva verificação.',
  },
  {
    id: 'incendios',
    label: 'Equipamento Extinção Incêndios',
    short: 'Incêndios',
    icon: Flame,
    description:
      'Mapa e verificação do equipamento de extinção de incêndios (extintores, mantas e sinalética).',
  },
  {
    id: 'iluminacao',
    label: 'Iluminação de Emergência',
    short: 'Iluminação',
    icon: Lightbulb,
    description: 'Mapa e verificação das luzes de emergência da unidade.',
  },
  {
    id: 'pragas',
    label: 'Controlo de Pragas',
    short: 'Pragas',
    icon: Bug,
    description: 'Registo do controlo de pragas e respetiva verificação.',
  },
  {
    id: 'lv_prevencao',
    label: 'LV Prevenção e Segurança',
    short: 'LV P&S',
    icon: ClipboardCheck,
    description: 'Livro de verificações de Prevenção e Segurança.',
  },
  {
    id: 'consulta_hst',
    label: 'Consulta aos Trabalhadores de HST',
    short: 'Consulta HST',
    icon: Users,
    description:
      'Consulta aos trabalhadores em matéria de Higiene e Segurança no Trabalho.',
  },
  {
    id: 'politica_vidros',
    label: 'Política de Vidros / Checklist',
    short: 'Vidros',
    icon: FileText,
    description: 'Política de vidros da unidade e checklist associada.',
  },
  {
    id: 'politica_alergenios',
    label: 'Política de Alergénios',
    short: 'Alergénios',
    icon: ShieldAlert,
    description: 'Política de alergénios e controlo de aplicação na loja.',
  },
  {
    id: 'formacao',
    label: 'Formação',
    short: 'Formação',
    icon: GraduationCap,
    description: 'Formação ministrada às equipas e validade das ações.',
  },
  {
    id: 'funcionarios',
    label: 'Lista de Funcionários',
    short: 'Equipa',
    icon: Users,
    description: 'Lista de funcionários usada nas consultas e ações de HST.',
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
        navegação do módulo. Os registos, checklists e mapas desta secção são definidos depois de
        fechar a lista de abas.
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
            Áreas de HST, equipamentos de segurança e políticas da unidade, organizadas pelos
            separadores da folha de controlo. As abas sem dados ficam prontas a receber os
            registos operacionais.
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

const SafetyControl: React.FC<SafetyControlProps> = ({
  activeSubTab,
  onTabChange,
}) => {
  const activeTab =
    SAFETY_TABS.find(tab => tab.id === activeSubTab) ?? SAFETY_TABS[0];

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
