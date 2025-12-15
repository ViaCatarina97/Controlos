import React, { useState } from 'react';
import { AppSettings } from '../types';
import { Store, Plus, ArrowRight, MapPin, Car, ShoppingBag, Coffee } from 'lucide-react';
import { AVAILABLE_AREAS, DEFAULT_SETTINGS } from '../constants';

interface RestaurantSelectorProps {
  restaurants: AppSettings[];
  onSelect: (restaurant: AppSettings) => void;
  onCreate: (restaurant: AppSettings) => void;
}

export const RestaurantSelector: React.FC<RestaurantSelectorProps> = ({ restaurants, onSelect, onCreate }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const handleCreate = () => {
    if (!newName.trim()) return;
    const newRestaurant: AppSettings = {
      ...DEFAULT_SETTINGS,
      restaurantId: crypto.randomUUID(),
      restaurantName: newName,
    };
    onCreate(newRestaurant);
  };

  const getIconForType = (type: string) => {
    switch(type) {
      case 'Drive': return <Car size={16} />;
      case 'Shopping': return <ShoppingBag size={16} />;
      default: return <Store size={16} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-2">TeamPos</h1>
        <p className="text-gray-500">Gestão de Posicionamento Operacional</p>
      </div>

      <div className="w-full max-w-2xl">
        {isCreating ? (
          <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 animate-fade-in">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Adicionar Novo Restaurante</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Restaurante</label>
                <input 
                  type="text" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ex: McDonald's Chiado"
                  autoFocus
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button 
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleCreate}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Criar Restaurante
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
             <div className="flex justify-between items-center px-2 mb-2">
                <h2 className="text-lg font-semibold text-gray-700">Selecione o Restaurante</h2>
                <button 
                  onClick={() => setIsCreating(true)}
                  className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1"
                >
                  <Plus size={16} /> Adicionar
                </button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {restaurants.map((rest) => (
                 <button
                    key={rest.restaurantId}
                    onClick={() => onSelect(rest)}
                    className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all text-left group relative overflow-hidden"
                 >
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    
                    <div className="flex justify-between items-start mb-3">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        {getIconForType(rest.restaurantType)}
                      </div>
                      <ArrowRight className="text-gray-300 group-hover:text-blue-500 transition-colors" size={20} />
                    </div>
                    
                    <h3 className="font-bold text-gray-900 text-lg mb-1">{rest.restaurantName}</h3>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-3">{rest.restaurantType}</p>
                    
                    <div className="flex flex-wrap gap-1">
                      {rest.businessAreas.slice(0, 3).map(area => (
                        <span key={area} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                          {area}
                        </span>
                      ))}
                      {rest.businessAreas.length > 3 && <span className="text-[10px] text-gray-400 px-1">...</span>}
                    </div>
                 </button>
               ))}
               
               {restaurants.length === 0 && (
                 <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                    <p className="mb-2">Nenhum restaurante configurado.</p>
                    <button onClick={() => setIsCreating(true)} className="text-blue-600 font-bold hover:underline">
                      Crie o primeiro agora
                    </button>
                 </div>
               )}
             </div>
          </div>
        )}
      </div>
      
      <div className="mt-12 text-center text-gray-400 text-xs">
        <p>&copy; {new Date().getFullYear()} TeamPos Management System</p>
      </div>
    </div>
  );
};