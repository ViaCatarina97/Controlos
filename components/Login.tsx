import React, { useState } from 'react';
import { AppSettings, RestaurantTypology } from '../types';
import { AVAILABLE_TYPOLOGIES, DEFAULT_SETTINGS } from '../constants';
import { Lock, User, Building2, ArrowRight, Store, AlertCircle } from 'lucide-react';

interface LoginProps {
  restaurants: AppSettings[];
  onLogin: (restaurant: AppSettings) => void;
  onRegister: (restaurant: AppSettings) => void;
}

export const Login: React.FC<LoginProps> = ({ restaurants, onLogin, onRegister }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [restName, setRestName] = useState('');
  const [restType, setRestType] = useState<RestaurantTypology>('Loja de Rua');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const found = restaurants.find(r => r.username === username && r.password === password);
    if (found) {
      onLogin(found);
    } else {
      setError('Credenciais inválidas.');
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password || !restName) {
      setError('Todos os campos são obrigatórios.');
      return;
    }

    if (restaurants.some(r => r.username === username)) {
      setError('Este nome de utilizador já existe.');
      return;
    }

    const newRest: AppSettings = {
      ...DEFAULT_SETTINGS,
      restaurantId: crypto.randomUUID(),
      restaurantName: restName,
      restaurantType: restType,
      username,
      password,
    };

    onRegister(newRest);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        
        {/* Header */}
        <div className="bg-blue-600 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-white opacity-5 transform rotate-12 scale-150"></div>
          <div className="relative z-10">
            <h1 className="text-3xl font-extrabold text-white tracking-tight mb-1">TeamPos</h1>
            <p className="text-blue-100 text-sm">Gestão de Equipas & Operações</p>
          </div>
        </div>

        {/* Form Container */}
        <div className="p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">
            {isRegistering ? 'Registar Restaurante' : 'Login de Acesso'}
          </h2>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2 mb-4 border border-red-100">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
            
            {isRegistering && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Nome do Restaurante</label>
                  <div className="relative">
                    <Store className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input
                      type="text"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="Ex: McDonald's Chiado"
                      value={restName}
                      onChange={e => setRestName(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                   <label className="block text-sm font-medium text-gray-600 mb-1">Tipologia</label>
                   <select 
                      className="w-full pl-3 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={restType}
                      onChange={e => setRestType(e.target.value as RestaurantTypology)}
                   >
                     {AVAILABLE_TYPOLOGIES.map(t => <option key={t} value={t}>{t}</option>)}
                   </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Utilizador</label>
              <div className="relative">
                <User className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Seu username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Palavra-passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                  type="password"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 mt-6"
            >
              {isRegistering ? 'Criar Conta' : 'Entrar'}
              <ArrowRight size={18} />
            </button>
          </form>

          <div className="mt-6 text-center pt-6 border-t border-gray-100">
            <p className="text-sm text-gray-500 mb-2">
              {isRegistering ? 'Já tem uma conta?' : 'Novo no TeamPos?'}
            </p>
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
                setUsername('');
                setPassword('');
              }}
              className="text-blue-600 font-bold hover:underline"
            >
              {isRegistering ? 'Voltar ao Login' : 'Registar novo restaurante'}
            </button>
          </div>
        </div>
      </div>
      
      <div className="fixed bottom-4 text-slate-500 text-xs text-center w-full">
         &copy; {new Date().getFullYear()} TeamPos. v2.1
      </div>
    </div>
  );
};