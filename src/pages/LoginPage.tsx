import React, { useState } from 'react';
import { User, Lock, ArrowRight, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useBrand, DEFAULT_BRAND_LOGO } from '../context/BrandContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const toast = useToast();
  const { logoUrl, openEditLogo } = useBrand();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim() || !password.trim()) {
      const msg = 'Please enter both username and password';
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }
    setLoading(true);
    try {
      await login(username.trim(), password);
      toast.success(`Welcome back, ${username}!`);
    } catch (err: any) {
      const msg = err.message || 'Invalid username or password';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center px-4 py-12 text-zinc-100 selection:bg-emerald-500 selection:text-zinc-950">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-emerald-600/30 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Brand Mark */}
        <div className="text-center space-y-2">
          <div className="inline-flex relative group">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-700/80 overflow-hidden items-center justify-center shadow-2xl mb-1 p-0.5 flex">
              <img
                src={logoUrl || DEFAULT_BRAND_LOGO}
                alt="FEELFST Logo"
                className="w-full h-full object-cover rounded-xl"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (!target.src.endsWith(DEFAULT_BRAND_LOGO)) {
                    target.src = DEFAULT_BRAND_LOGO;
                  }
                }}
              />
            </div>
            {/* Quick edit logo hover button */}
            <button
              type="button"
              onClick={openEditLogo}
              title="Change Brand Logo"
              className="absolute -bottom-1 -right-1 p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 rounded-full shadow-lg opacity-80 hover:opacity-100 transition-all scale-90 hover:scale-100"
            >
              <ImageIcon className="w-3 h-3" />
            </button>
          </div>

          <h1 className="text-2xl font-black tracking-widest font-['Space_Grotesk'] text-zinc-100">
            FEELFST
          </h1>
          <p className="text-xs uppercase tracking-widest text-zinc-400 font-medium">
            DASHBOARD DATA MANAGER
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-7 shadow-2xl backdrop-blur-md space-y-6">
          {errorMessage && (
            <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-rose-200 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block mb-1.5">
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full bg-zinc-950 border border-zinc-750 rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full bg-zinc-950 border border-zinc-750 rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-2"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Change logo action link */}
        <div className="flex items-center justify-center gap-2 text-xs text-zinc-400">
          <button
            type="button"
            onClick={openEditLogo}
            className="flex items-center gap-1.5 hover:text-zinc-200 transition-colors py-1 px-2 rounded-lg hover:bg-zinc-900/60"
          >
            <ImageIcon className="w-3.5 h-3.5 text-zinc-400" />
            <span>Customize Brand Logo</span>
          </button>
          <span>&bull;</span>
          <span>Version 2.0</span>
        </div>
      </div>
    </div>
  );
};
