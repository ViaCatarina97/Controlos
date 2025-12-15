import React, { useState } from 'react';
import { StaffingTableEntry } from '../types';
import { Sliders, Save, Edit2, Plus, Trash2, X } from 'lucide-react';

interface CriteriaProps {
  staffingTable: StaffingTableEntry[];
  setStaffingTable: React.Dispatch<React.SetStateAction<StaffingTableEntry[]>>;
}

export const Criteria: React.FC<CriteriaProps> = ({ staffingTable, setStaffingTable }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localTable, setLocalTable] = useState<StaffingTableEntry[]>(staffingTable);

  const handleEditToggle = () => {
    if (isEditing) {
        // Cancel/Reset
        setLocalTable(staffingTable);
        setIsEditing(false);
    } else {
        // Start Editing
        setLocalTable([...staffingTable]); // Clone
        setIsEditing(true);
    }
  };

  const handleSave = () => {
    // Sort table by minSales just in case
    const sorted = [...localTable].sort((a, b) => a.minSales - b.minSales);
    setStaffingTable(sorted);
    setIsEditing(false);
    alert('Tabela de Staffing atualizada com sucesso!');
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
    if (confirm('Tem a certeza que deseja eliminar esta linha?')) {
        setLocalTable(prev => prev.filter(r => r.id !== id));
    }
  };

  return (
    <div className="max-w-5xl mx-auto flex flex-col h-full animate-fade-in">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Sliders className="text-blue-600" />
            Tabela de Staffing
            </h2>
            <p className="text-gray-500 mt-1 text-sm">Configure o número de pessoas necessárias por intervalo de vendas.</p>
        </div>

        <div className="flex gap-3">
             {isEditing ? (
                 <>
                    <button 
                        onClick={handleEditToggle} 
                        className="flex items-center gap-2 px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <X size={18} /> Cancelar
                    </button>
                    <button 
                        onClick={handleSave} 
                        className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm transition-colors font-medium"
                    >
                        <Save size={18} /> Gravar Tabela
                    </button>
                 </>
             ) : (
                <button 
                    onClick={handleEditToggle} 
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors font-medium"
                >
                    <Edit2 size={18} /> Editar Dados
                </button>
             )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-auto custom-scrollbar flex-1">
            <table className="w-full text-sm text-left">
                <thead className="bg-[#5a7d36] text-white sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th className="px-6 py-3 font-semibold w-32 border-r border-white/20">Venda Mínima</th>
                        <th className="px-6 py-3 font-semibold w-32 border-r border-white/20">Venda Máxima</th>
                        <th className="px-6 py-3 font-semibold w-32 text-center border-r border-white/20">Nº Pessoas</th>
                        <th className="px-6 py-3 font-semibold">Posto / Descrição</th>
                        {isEditing && <th className="px-4 py-3 w-16 text-center">Ações</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {(isEditing ? localTable : staffingTable).map((row, index) => (
                        <tr key={row.id} className={`group hover:bg-green-50/50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                            
                            {/* Min Sales */}
                            <td className="px-6 py-2 font-medium text-gray-900 border-r border-gray-100">
                                {isEditing ? (
                                    <input 
                                        type="number" 
                                        value={row.minSales} 
                                        onChange={(e) => handleRowChange(row.id, 'minSales', parseInt(e.target.value))}
                                        className="w-full p-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-green-500 outline-none"
                                    />
                                ) : (
                                    <span>{row.minSales} €</span>
                                )}
                            </td>

                            {/* Max Sales */}
                            <td className="px-6 py-2 font-medium text-gray-900 border-r border-gray-100">
                                {isEditing ? (
                                    <input 
                                        type="number" 
                                        value={row.maxSales} 
                                        onChange={(e) => handleRowChange(row.id, 'maxSales', parseInt(e.target.value))}
                                        className="w-full p-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-green-500 outline-none"
                                    />
                                ) : (
                                    <span>{row.maxSales} €</span>
                                )}
                            </td>

                             {/* Staff Count */}
                             <td className="px-6 py-2 font-bold text-center text-green-700 bg-green-50/30 border-r border-gray-100">
                                {isEditing ? (
                                    <input 
                                        type="number" 
                                        value={row.staffCount} 
                                        onChange={(e) => handleRowChange(row.id, 'staffCount', parseInt(e.target.value))}
                                        className="w-20 mx-auto p-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-green-500 outline-none font-bold"
                                    />
                                ) : (
                                    <span>{row.staffCount}</span>
                                )}
                            </td>

                            {/* Station Label */}
                            <td className="px-6 py-2 text-gray-700">
                                {isEditing ? (
                                    <input 
                                        type="text" 
                                        value={row.stationLabel} 
                                        onChange={(e) => handleRowChange(row.id, 'stationLabel', e.target.value)}
                                        className="w-full p-1 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 outline-none"
                                    />
                                ) : (
                                    <span>{row.stationLabel}</span>
                                )}
                            </td>

                            {/* Actions */}
                            {isEditing && (
                                <td className="px-4 py-2 text-center">
                                    <button 
                                        onClick={() => handleDeleteRow(row.id)}
                                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        
        {isEditing && (
            <div className="p-3 bg-gray-50 border-t border-gray-200">
                <button 
                    onClick={handleAddRow}
                    className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-green-500 hover:text-green-600 hover:bg-green-50 transition-colors flex items-center justify-center gap-2 font-medium"
                >
                    <Plus size={20} /> Adicionar Nova Linha
                </button>
            </div>
        )}
      </div>
    </div>
  );
};