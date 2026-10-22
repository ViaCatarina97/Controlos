import React, { useState } from 'react';
import { AppSettings, RestaurantTypology } from '../types';
import { AVAILABLE_TYPOLOGIES, DEFAULT_SETTINGS } from '../constants';
import { Lock, User, ArrowRight, AlertCircle, Eye, EyeOff, ShieldCheck, Building2 } from 'lucide-react';

interface LoginProps {
  restaurants: AppSettings[];
  onLogin: (restaurant: AppSettings) => void;
  onRegister: (restaurant: AppSettings) => void;
}

export const Login: React.FC<LoginProps> = ({ restaurants, onLogin, onRegister }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [restName, setRestName] = useState('');
  const [restType, setRestType] = useState<RestaurantTypology>('Shopping');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const found = restaurants.find(
      r => r.username.trim().toLowerCase() === username.trim().toLowerCase() && r.password === password
    );
    if (found) onLogin(found);
    else setError('Credenciais inválidas. Verifique o utilizador da unidade e a palavra-passe.');
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password || !restName.trim()) {
      setError('Preencha todos os campos obrigatórios da nova unidade.');
      return;
    }
    onRegister({
      ...DEFAULT_SETTINGS,
      restaurantId: crypto.randomUUID(),
      restaurantName: restName.trim(),
      restaurantType: restType,
      username: username.trim(),
      password,
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden flex flex-col items-center justify-center p-4 sm:p-6">
      {/* Subtle Ambient Executive Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[680px] h-[360px] rounded-full bg-amber-500/10 blur-3xl"
      />

      <div className="relative z-10 w-full max-w-[420px] animate-fade-in">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-400 text-slate-950 font-black text-2xl shadow-lg shadow-amber-500/20 mb-4">
            M
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Controlos de Gestão
          </h1>
          <p className="text-xs font-medium text-slate-400 mt-1">
            Plataforma Integrada de Operações, Tesouraria &amp; Food Cost
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-800/40 overflow-hidden p-6 sm:p-8">
          <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`py-2.5 rounded-lg text-xs font-bold transition-all ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Iniciar Sessão
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={`py-2.5 rounded-lg text-xs font-bold transition-all ${
                mode === 'register'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Nova Unidade
            </button>
          </div>

          {error && (
            <div className="bg-rose-50 text-rose-700 text-xs p-3.5 rounded-xl flex items-start gap-2.5 mb-5 border border-rose-200 font-medium">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={mode === 'register' ? handleRegister : handleLogin} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                    Nome do Restaurante
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                    <input
                      type="text"
                      placeholder="Ex.: Via Catarina"
                      value={restName}
                      onChange={e => setRestName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                    Tipologia de Loja
                  </label>
                  <select
                    value={restType}
                    onChange={e => setRestType(e.target.value as RestaurantTypology)}
                    className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:bg-white focus:border-slate-900"
                  >
                    {AVAILABLE_TYPOLOGIES.map(t => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                Utilizador da Unidade
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                <input
                  type="text"
                  placeholder="Ex.: Via Catarina"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                Palavra-passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 transition-colors"
                  tabIndex={-1}
                  title={showPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm py-3.5 rounded-xl shadow-lg shadow-slate-900/15 flex items-center justify-center gap-2 transition-all active:scale-[0.99] mt-2"
            >
              <span>{mode === 'register' ? 'Registar Unidade' : 'Entrar na Plataforma'}</span>
              <ArrowRight size={17} />
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-center gap-2 text-slate-500 text-xs">
          <ShieldCheck size={14} className="text-emerald-400" />
          <span>Controlos de Gestão v4.0 • Sincronização Cloud Ativa</span>
        </div>
      </div>
    </div>
  );
};
