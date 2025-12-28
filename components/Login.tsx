
import React, { useState } from 'react';
import { AppSettings, RestaurantTypology } from '../types';
import { AVAILABLE_TYPOLOGIES, DEFAULT_SETTINGS } from '../constants';
import { Lock, User, ArrowRight, AlertCircle } from 'lucide-react';

interface LoginProps {
  restaurants: AppSettings[];
  onLogin: (restaurant: AppSettings) => void;
  onRegister: (restaurant: AppSettings) => void;
}

export const Login: React.FC<LoginProps> = ({ restaurants, onLogin, onRegister }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState('');

  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [restName, setRestName] = useState('');
  const [restType, setRestType] = useState<RestaurantTypology>('Loja de Rua');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const found = restaurants.find(r => r.username === username && r.password === password);
    if (found) onLogin(found);
    else setError('Credenciais inválidas.');
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || !restName) { setError('Campos obrigatórios em falta.'); return; }
    onRegister({ ...DEFAULT_SETTINGS, restaurantId: crypto.randomUUID(), restaurantName: restName, restaurantType: restType, username, password });
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-fade-in border border-slate-700">
        <div className="bg-blue-600 p-8 text-center text-white">
          <h1 className="text-3xl font-black uppercase tracking-tighter">Controlos</h1>
          <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mt-1 opacity-80">Controlos de Gestão</p>
        </div>

        <div className="p-8">
          <div className="flex bg-gray-100 p-1 rounded-2xl mb-8">
             <button onClick={() => setMode('login')} className={`flex-1 py-2 rounded-xl text-xs font-black uppercase transition-all ${mode === 'login' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}>Login</button>
             <button onClick={() => setMode('register')} className={`flex-1 py-2 rounded-xl text-xs font-black uppercase transition-all ${mode === 'register' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}>Nova Loja</button>
          </div>

          {error && <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl flex items-center gap-2 mb-6 border border-red-100 font-bold"><AlertCircle size={16}/>{error}</div>}

          <form onSubmit={mode === 'register' ? handleRegister : handleLogin} className="space-y-4">
            {mode === 'register' && (
              <>
                <input type="text" placeholder="Nome do Restaurante" value={restName} onChange={e => setRestName(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                <select value={restType} onChange={e => setRestType(e.target.value as RestaurantTypology)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none">
                  {AVAILABLE_TYPOLOGIES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </>
            )}
            <div className="relative">
              <User className="absolute left-3 top-3.5 text-gray-400" size={18} />
              <input type="text" placeholder="Utilizador" value={username} onChange={e => setUsername(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 text-gray-400" size={18} />
              <input type="password" placeholder="Palavra-passe" value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button type="submit" className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-slate-800 shadow-xl flex items-center justify-center gap-2 mt-4">{mode === 'register' ? 'Registar Restaurante' : 'Entrar no Sistema'} <ArrowRight size={18}/></button>
          </form>
        </div>
      </div>
      <div className="fixed bottom-4 text-slate-500 text-[10px] font-black uppercase tracking-widest">© Controlos de Gestão v3.0</div>
    </div>
  );
};
