import React from 'react';
import { AppSettings } from '../types';
import { Users, TrendingUp, FileText, ArrowRight, Building2, LogOut } from 'lucide-react';

interface ModuleSelectorProps {
  restaurant: AppSettings;
  onSelectModule: (module: 'positioning' | 'finance' | 'billing') => void;
  onLogout: () => void;
}

export const ModuleSelector: React.FC<ModuleSelectorProps> = ({ restaurant, onSelectModule, onLogout }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg text-white">
            <Building2 size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">{restaurant.restaurantName}</h1>
            <p className="text-sm text-gray-500">{restaurant.restaurantType}</p>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="flex items-center gap-2 text-gray-500 hover:text-red-500 transition-colors px-4 py-2 hover:bg-red-50 rounded-lg"
        >
          <LogOut size={18} />
          <span>Sair</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-8 animate-fade-in">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-3">Menu Principal</h2>
          <p className="text-gray-500 text-lg">Selecione o módulo que pretende aceder</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full">
          
          {/* Module 1: Posicionamento (Active) */}
          <button 
            onClick={() => onSelectModule('positioning')}
            className="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200 text-left p-8 flex flex-col h-80"
          >
            <div className="absolute top-0 left-0 w-2 h-full bg-blue-500 group-hover:w-full transition-all duration-500 opacity-5 group-hover:opacity-100"></div>
            
            <div className="relative z-10 flex-1 flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:bg-white group-hover:scale-110 transition-all duration-300">
                  <Users size={32} />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2 group-hover:text-blue-700">Gestão Operacional</h3>
                <p className="text-gray-500 group-hover:text-gray-700">
                  Posicionamento diário, gestão de turnos, staff e previsões horárias.
                </p>
              </div>
              <div className="flex items-center gap-2 text-blue-600 font-bold mt-4 group-hover:translate-x-2 transition-transform">
                <span>Aceder</span>
                <ArrowRight size={20} />
              </div>
            </div>
          </button>

          {/* Module 2: Financeiro (Placeholder) */}
          <button 
            onClick={() => onSelectModule('finance')}
            className="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200 text-left p-8 flex flex-col h-80"
          >
            <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500 group-hover:w-full transition-all duration-500 opacity-5 group-hover:opacity-100"></div>
            
            <div className="relative z-10 flex-1 flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-6 group-hover:bg-white group-hover:scale-110 transition-all duration-300">
                  <TrendingUp size={32} />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2 group-hover:text-emerald-700">Controlo Financeiro</h3>
                <p className="text-gray-500 group-hover:text-gray-700">
                  Análise de P&L, controlo de custos, inventários e gestão de fluxo de caixa.
                </p>
              </div>
              <div className="flex items-center gap-2 text-emerald-600 font-bold mt-4 group-hover:translate-x-2 transition-transform">
                <span>Aceder</span>
                <ArrowRight size={20} />
              </div>
            </div>
          </button>

          {/* Module 3: Faturação (Placeholder) */}
          <button 
            onClick={() => onSelectModule('billing')}
            className="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200 text-left p-8 flex flex-col h-80"
          >
            <div className="absolute top-0 left-0 w-2 h-full bg-purple-500 group-hover:w-full transition-all duration-500 opacity-5 group-hover:opacity-100"></div>
            
            <div className="relative z-10 flex-1 flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:bg-white group-hover:scale-110 transition-all duration-300">
                  <FileText size={32} />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2 group-hover:text-purple-700">Controlo de Faturação</h3>
                <p className="text-gray-500 group-hover:text-gray-700">
                  Gestão de faturas, fornecedores, integrações fiscais e arquivo digital.
                </p>
              </div>
              <div className="flex items-center gap-2 text-purple-600 font-bold mt-4 group-hover:translate-x-2 transition-transform">
                <span>Aceder</span>
                <ArrowRight size={20} />
              </div>
            </div>
          </button>

        </div>
        
        <div className="mt-16 text-gray-400 text-sm">
          TeamPos Management System v2.2
        </div>
      </main>
    </div>
  );
};