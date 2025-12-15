import React, { useState } from 'react';
import { Employee, RoleType } from '../types';
import { ROLE_COLORS, ROLE_LABELS } from '../constants';
import { Plus, Edit2, Trash2, User, X, Check } from 'lucide-react';

interface StaffManagerProps {
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
}

export const StaffManager: React.FC<StaffManagerProps> = ({ employees, setEmployees }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [name, setName] = useState('');
  const [role, setRole] = useState<RoleType>('TREINADOR');

  const openModal = (emp?: Employee) => {
    if (emp) {
      setEditingId(emp.id);
      setName(emp.name);
      setRole(emp.role);
    } else {
      setEditingId(null);
      setName('');
      setRole('TREINADOR');
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!name.trim()) return;

    if (editingId) {
      setEmployees(prev => prev.map(e => e.id === editingId ? { ...e, name, role } : e));
    } else {
      const newEmp: Employee = {
        id: crypto.randomUUID(),
        name,
        role,
        isActive: true
      };
      setEmployees(prev => [...prev, newEmp]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem a certeza que deseja eliminar este colaborador?')) {
      setEmployees(prev => prev.filter(e => e.id !== id));
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Equipa e Cargos</h2>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
          Novo Colaborador
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {employees.map((emp) => (
          <div key={emp.id} className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow border-l-4 border-l-gray-300">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full bg-gray-100`}>
                    <User size={20} className="text-gray-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{emp.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${ROLE_COLORS[emp.role]}`}>
                    {ROLE_LABELS[emp.role]}
                  </span>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openModal(emp)} className="p-1 text-gray-400 hover:text-blue-500">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(emp.id)} className="p-1 text-gray-400 hover:text-red-500">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">{editingId ? 'Editar' : 'Criar'} Colaborador</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
                <select
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={role}
                  onChange={(e) => setRole(e.target.value as RoleType)}
                >
                  {Object.entries(ROLE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                >
                  <Check size={16} /> Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};