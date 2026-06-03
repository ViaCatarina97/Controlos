import React, { useState, useEffect } from 'react';
import { StaffingTableEntry } from '../types';
import { Sliders, Save, Plus, Trash2, RotateCcw, AlertCircle } from 'lucide-react';

interface CriteriaProps {
  staffingTable: StaffingTableEntry[];
  setStaffingTable: React.Dispatch<React.SetStateAction<StaffingTableEntry[]>>;
}

export const Criteria: React.FC<CriteriaProps> = ({ staffingTable, setStaffingTable }) => {
  const [localTable, setLocalTable] = useState<StaffingTableEntry[]>([]);

  // Initialize and synchronise with parent changes
  useEffect(() => {
    setLocalTable(staffingTable);
  }, [staffingTable]);

  const hasChanges = JSON.stringify(localTable) !== JSON.stringify(staffingTable);

  const handleSave = () => {
    // Sort table by minSales to maintain structured progression
    const sorted = [...localTable].sort((a, b) => a.minSales - b.minSales);
    setStaffingTable(sorted);
    alert('Tabela de Postos (Staffing) gravada com sucesso!');
  };

  const handleReset = () => {
    if (confirm('Deseja descartar as alterações não gravadas e repor os valores originais?')) {
      setLocalTable(staffingTable);
    }
  };

  const handleRowChange = (id: string, field: keyof StaffingTableEntry, value: string | number) => {
    setLocalTable(prev => prev.map(row => {
      if (row.id === id) {
        return { ...row, [field]: value };
      }
      return row;
    }));
  };

  const handleAddRow = () => {
    const lastRow = localTable[localTable.length - 1];
    const newMin = lastRow ? lastRow.maxSales + 1 : 0;
    
    const newRow: StaffingTableEntry = {
      id: crypto.randomUUID(),
      minSales: newMin,
      maxSales: newMin + 100,
      staffCount: lastRow ? lastRow.staffCount + 1 : 1,
      stationLabel: 'Novo Posto'
    };
    setLocalTable(prev => [...prev, newRow]);
  };

  const handleDeleteRow = (id: string) => {
    if (confirm('Tem a certeza que deseja eliminar este posto da tabela?')) {
      setLocalTable(prev => prev.filter(r => r.id !== id));
    }
  };

  return (
    <div className="max-w-5xl mx-auto flex flex-col h-full animate-fade-in">
      
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Sliders className="text-blue-600 animate-pulse" />
            Configuração de Postos & Staffing
          </h2>
          <p className="text-gray-500 mt-1 text-sm">
            Defina e edite os postos de trabalho requeridos por intervalo de vendas em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {hasChanges && (
            <div className="hidden md:flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-250 animate-pulse">
              <AlertCircle size={14} />
              <span>Alterações pendentes</span>
            </div>
          )}
          
          <div className="flex gap-2 w-full sm:w-auto">
            {hasChanges ? (
              <>
                <button 
                  onClick={handleReset} 
                  className="flex items-center justify-center gap-1.5 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-all font-medium text-sm cursor-pointer shadow-sm active:scale-95"
                  title="Descartar alterações pendentes"
                >
                  <RotateCcw size={16} /> Repor
                </button>
                <button 
                  onClick={handleSave} 
                  className="flex items-center justify-center gap-1.5 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-md transition-all font-bold text-sm cursor-pointer active:scale-95 animate-bounce"
                  title="Gravar configurações no servidor e base de dados"
                >
                  <Save size={16} /> Gravar Postos
                </button>
              </>
            ) : (
              <button 
                disabled
                className="flex items-center justify-center gap-1.5 px-6 py-2 bg-gray-100 text-gray-400 border border-gray-200 rounded-lg cursor-not-allowed text-sm font-medium"
              >
                <Save size={16} /> Gravado na Nuvem
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-auto custom-scrollbar flex-1">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#5a7d36] text-white sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-4 font-semibold w-1/5 border-r border-white/10 text-center">Venda Mínima (€)</th>
                <th className="px-6 py-4 font-semibold w-1/5 border-r border-white/10 text-center">Venda Máxima (€)</th>
                <th className="px-6 py-4 font-semibold w-1/6 border-r border-white/10 text-center">Nº Colaboradores</th>
                <th className="px-6 py-4 font-semibold w-2/5">Posto de Trabalho / Descrição</th>
                <th className="px-4 py-4 w-16 text-center">Remover</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {localTable.map((row, index) => (
                <tr 
                  key={row.id} 
                  className={`group hover:bg-green-50/40 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                >
                  {/* Min Sales */}
                  <td className="px-6 py-3 border-r border-gray-100 text-center">
                    <input 
                      type="number" 
                      value={row.minSales} 
                      onChange={(e) => handleRowChange(row.id, 'minSales', parseInt(e.target.value) || 0)}
                      className="w-full p-2 border border-gray-200 rounded-lg text-center font-semibold text-gray-700 focus:border-green-500 focus:ring-1 focus:ring-green-500/50 outline-none max-w-32 mx-auto bg-white transition-all shadow-inner"
                    />
                  </td>

                  {/* Max Sales */}
                  <td className="px-6 py-3 border-r border-gray-100 text-center">
                    <input 
                      type="number" 
                      value={row.maxSales} 
                      onChange={(e) => handleRowChange(row.id, 'maxSales', parseInt(e.target.value) || 0)}
                      className="w-full p-2 border border-gray-200 rounded-lg text-center font-semibold text-gray-700 focus:border-green-500 focus:ring-1 focus:ring-green-500/50 outline-none max-w-32 mx-auto bg-white transition-all shadow-inner"
                    />
                  </td>

                  {/* Staff Count */}
                  <td className="px-6 py-3 bg-green-50/10 border-r border-gray-100 text-center">
                    <input 
                      type="number" 
                      value={row.staffCount} 
                      onChange={(e) => handleRowChange(row.id, 'staffCount', parseInt(e.target.value) || 0)}
                      className="w-20 p-2 border border-green-200 rounded-lg text-center font-extrabold text-[#5a7d36] focus:border-green-500 focus:ring-1 focus:ring-green-500/50 outline-none mx-auto bg-green-50/25 transition-all shadow-sm"
                    />
                  </td>

                  {/* Station Label */}
                  <td className="px-6 py-3 text-gray-700">
                    <input 
                      type="text" 
                      value={row.stationLabel} 
                      onChange={(e) => handleRowChange(row.id, 'stationLabel', e.target.value)}
                      className="w-full p-2 border border-gray-200 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500/50 outline-none font-medium text-gray-700 bg-white transition-all shadow-inner"
                      placeholder="Ex: Cozinha, Gelados, Caixa..."
                    />
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-center">
                    <button 
                      onClick={() => handleDeleteRow(row.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all active:scale-90"
                      title="Eliminar esta linha de postos"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              
              {localTable.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-gray-400">
                    Nenhum posto configurado na tabela. Adicione uma nova linha para começar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Table Footer Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
          <button 
            onClick={handleAddRow}
            className="w-full sm:w-auto px-6 py-2.5 border border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-green-600 hover:text-green-700 hover:bg-green-50/50 transition-all flex items-center justify-center gap-2 font-semibold text-sm cursor-pointer shadow-sm active:scale-95"
          >
            <Plus size={18} /> Adicionar Nova Linha
          </button>
          
          {hasChanges && (
            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <button 
                onClick={handleReset} 
                className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-all font-semibold text-sm cursor-pointer w-full sm:w-auto shadow-sm"
              >
                <RotateCcw size={16} /> Repor Alterações
              </button>
              <button 
                onClick={handleSave} 
                className="flex items-center justify-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-md transition-all font-bold text-sm cursor-pointer w-full sm:w-auto active:scale-95"
              >
                <Save size={16} /> Gravar Postos
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
