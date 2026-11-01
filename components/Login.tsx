import React, { useState } from 'react';
import { RestaurantTypology } from '../types';
import { AVAILABLE_TYPOLOGIES } from '../constants';
import {
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  Building2,
  Copy,
  Check,
  LogOut,
  RefreshCw,
  KeyRound,
} from 'lucide-react';
import { describeAuthError } from '../services/authService';

export interface RegisterPayload {
  restaurantName: string;
  restaurantType: RestaurantTypology;
  username: string;
  password: string;
}

interface LoginProps {
  onLogin: (username: string, password: string) => Promise<void>;
  onAdopt: (username: string, password: string) => Promise<void>;
  onRegister: (payload: RegisterPayload) => Promise<void>;
}

type LoginMode = 'login' | 'adopt' | 'register';

export const Login: React.FC<LoginProps> = ({ onLogin, onAdopt, onRegister }) => {
  const [mode, setMode] = useState<LoginMode>('login');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [restName, setRestName] = useState('');
  const [restType, setRestType] = useState<RestaurantTypology>('Shopping');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Preencha o utilizador da unidade e a palavra-passe.');
      return;
    }
    setBusy(true);
    try {
      await onLogin(username.trim(), password);
    } catch (err) {
      setError(describeAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleAdopt = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Indique o utilizador e a palavra-passe da unidade que já existe.');
      return;
    }
    if (password.length < 6) {
      setError('A conta de acesso exige uma palavra-passe com pelo menos 6 caracteres.');
      return;
    }
    setBusy(true);
    try {
      await onAdopt(username.trim(), password);
    } catch (err) {
      setError(describeAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password || !restName.trim()) {
      setError('Preencha todos os campos obrigatórios da nova unidade.');
      return;
    }
    if (password.length < 6) {
      setError('A palavra-passe tem de ter pelo menos 6 caracteres.');
      return;
    }
    setBusy(true);
    try {
      await onRegister({
        restaurantName: restName.trim(),
        restaurantType: restType,
        username: username.trim(),
        password,
      });
    } catch (err) {
      setError(describeAuthError(err));
    } finally {
      setBusy(false);
    }
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
          <div className="grid grid-cols-3 bg-slate-100 p-1 rounded-xl mb-6">
            {([
              { id: 'login', label: 'Entrar' },
              { id: 'adopt', label: 'Ligar Unidade' },
              { id: 'register', label: 'Nova' },
            ] as { id: LoginMode; label: string }[]).map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setMode(tab.id);
                  setError('');
                }}
                className={`py-2.5 rounded-lg text-[11px] font-bold transition-all ${
                  mode === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="bg-rose-50 text-rose-700 text-xs p-3.5 rounded-xl flex items-start gap-2.5 mb-5 border border-rose-200 font-medium">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form
            onSubmit={
              mode === 'register' ? handleRegister : mode === 'adopt' ? handleAdopt : handleLogin
            }
            className="space-y-4"
          >
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
              <p className="text-[10px] text-slate-400 mt-1.5">
                Cada unidade tem o seu próprio utilizador. As palavras-passe são guardadas
                apenas no Firebase Authentication, nunca na base de dados da loja.
              </p>
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
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
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
              disabled={busy}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-bold text-sm py-3.5 rounded-xl shadow-lg shadow-slate-900/15 flex items-center justify-center gap-2 transition-all active:scale-[0.99] mt-2"
            >
              <span>
                {busy
                  ? 'A validar...'
                  : mode === 'register'
                  ? 'Registar Unidade'
                  : mode === 'adopt'
                  ? 'Ligar Unidade Existente'
                  : 'Entrar na Plataforma'}
              </span>
              {!busy && <ArrowRight size={17} />}
            </button>
          </form>

          {mode === 'login' && (
            <p className="text-[10px] text-slate-400 mt-4 flex items-start gap-1.5">
              <KeyRound size={12} className="shrink-0 mt-0.5" />
              <span>
                A conta dá acesso apenas aos dados desta unidade. Loja nova? Use
                &quot;Nova&quot;.
              </span>
            </p>
          )}

          {mode === 'adopt' && (
            <p className="text-[10px] text-slate-400 mt-4 flex items-start gap-1.5">
              <KeyRound size={12} className="shrink-0 mt-0.5" />
              <span>
                Para a unidade que já existe: é criada agora a conta de acesso com este
                utilizador e ligada à loja. Os dados atuais ficam intactos.
              </span>
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-center gap-2 text-slate-500 text-xs">
          <ShieldCheck size={14} className="text-emerald-400" />
          <span>Sessão individual por unidade • Dados isolados por loja</span>
        </div>
      </div>
    </div>
  );
};

interface UnlinkedAccountScreenProps {
  uid: string;
  email: string | null;
  onRetry: () => void;
  onLogout: () => void;
}

/**
 * Mostrada quando a conta está autenticada mas ainda não pertence a nenhuma loja.
 * Serve de guião para a associação única feita na consola do Firebase.
 */
export const UnlinkedAccountScreen: React.FC<UnlinkedAccountScreenProps> = ({
  uid,
  email,
  onRetry,
  onLogout,
}) => {
  const [copied, setCopied] = useState(false);

  const copyUid = async () => {
    try {
      await navigator.clipboard.writeText(uid);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl p-6 sm:p-8 space-y-5">
        <div className="flex items-start gap-3">
          <div className="p-3 bg-amber-50 text-amber-700 rounded-2xl border border-amber-200 shrink-0">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Conta sem unidade associada
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              A sessão está ativa, mas esta conta ainda não tem permissão para nenhuma loja.
              Nenhum dado é exposto até a associação ser feita.
            </p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Identificador desta conta
          </p>
          {email && (
            <p className="text-xs font-semibold text-slate-700 break-all">{email}</p>
          )}
          <div className="flex items-center gap-2">
            <code className="flex-1 text-[11px] font-mono text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 break-all">
              {uid}
            </code>
            <button
              type="button"
              onClick={copyUid}
              className="shrink-0 p-2.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors"
              title="Copiar identificador"
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-600 space-y-2">
          <p className="font-bold text-slate-900">Como ligar esta conta a uma loja:</p>
          <ol className="list-decimal list-inside space-y-1.5">
            <li>
              Termine sessão e use <strong>Ligar Unidade</strong> com o utilizador da
              loja que já existe — é o caminho para lojas criadas antes desta
              atualização.
            </li>
            <li>
              Se a loja for de outra conta, um responsável pode abrir{' '}
              <strong>Firestore → restaurants/&lt;id da loja&gt;</strong> e acrescentar o
              identificador acima ao campo <code className="font-mono">memberUids</code>{' '}
              (array).
            </li>
            <li>Volte aqui e toque em &quot;Verificar novamente&quot;.</li>
          </ol>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <button
            type="button"
            onClick={onRetry}
            className="flex-1 flex items-center justify-center gap-2 bg-slate-900 text-white font-bold text-xs py-3 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <RefreshCw size={15} /> Verificar novamente
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="flex-1 flex items-center justify-center gap-2 bg-slate-100 text-slate-700 font-bold text-xs py-3 rounded-xl hover:bg-slate-200 transition-colors"
          >
            <LogOut size={15} /> Terminar sessão
          </button>
        </div>
      </div>
    </div>
  );
};
