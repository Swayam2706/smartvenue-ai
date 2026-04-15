import React, { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Zap, Eye, EyeOff, Loader, Shield, AlertCircle, Mail, Lock } from 'lucide-react';
import axios from 'axios';
import { useAppStore } from '../store/appStore';
import toast from 'react-hot-toast';
import { logAnalyticsEvent, firebaseSignIn, hasFirebaseConfig, getFirebaseAuthError } from '../config/firebase';
import { usePageTitle } from '../hooks/usePageTitle';

export default function LoginPage() {
  usePageTitle('Sign In');
  const [form, setForm]       = useState({ username: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState({});
  const { login }             = useAppStore();
  const navigate              = useNavigate();

  const validate = useCallback(() => {
    const e = {};
    if (!form.username.trim()) e.username = 'Email or username is required';
    if (!form.password)        e.password = 'Password is required';
    if (form.password && form.password.length < 4) e.password = 'Password too short';
    return e;
  }, [form]);

  const handleChange = useCallback((field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  }, [errors]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);

    try {
      // Firebase Auth — if email format and Firebase configured
      if (hasFirebaseConfig && form.username.includes('@')) {
        const result = await firebaseSignIn(form.username.trim(), form.password);
        login(result.user, result.token);
        toast.success(`Welcome back, ${result.user.name}! 👋`);
        logAnalyticsEvent('admin_login', { method: 'firebase' });
        navigate('/dashboard');
        return;
      }

      // Backend JWT auth
      const res = await axios.post('/api/auth/login', {
        username: form.username.trim(),
        password: form.password,
      });
      login(res.data.user, res.data.token);
      toast.success(`Welcome back, ${res.data.user.name}! 👋`);
      logAnalyticsEvent('admin_login', { role: res.data.user.role });
      navigate('/dashboard');
    } catch (err) {
      // Demo mode fallback
      if (form.username === 'admin' && form.password === 'admin123') {
        login({ id: '1', username: 'admin', role: 'admin', name: 'Stadium Admin' }, 'demo-token');
        toast.success('Welcome, Stadium Admin! (Demo mode)');
        navigate('/dashboard');
      } else if (form.username === 'operator' && form.password === 'operator123') {
        login({ id: '2', username: 'operator', role: 'operator', name: 'Venue Operator' }, 'demo-token-op');
        toast.success('Welcome, Venue Operator! (Demo mode)');
        navigate('/dashboard');
      } else {
        const msg = err.code
          ? getFirebaseAuthError(err.code)
          : err.response?.data?.error || 'Invalid credentials';
        setErrors({ form: msg });
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [form, validate, login, navigate]);

  return (
    <div className="min-h-screen hero-bg grid-bg flex items-center justify-center p-4">
      {/* Orbs */}
      <div className="fixed top-1/4 right-1/4 w-80 h-80 bg-blue-600/8 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="fixed bottom-1/4 left-1/4 w-64 h-64 bg-indigo-600/8 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-6" aria-label="VenuroX home">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Zap size={20} className="text-white" aria-hidden="true" />
            </div>
            <span className="font-bold text-white text-xl">VenuroX</span>
          </Link>
          <h1 className="text-2xl font-black text-white">Welcome back</h1>
          <p className="text-slate-400 text-sm mt-1">Sign in to your VenuroX account</p>
        </div>

        {/* Card */}
        <div className="lp-glass p-8">
          <div className="flex items-center gap-2 mb-6">
            <Shield size={16} className="text-blue-400" aria-hidden="true" />
            <span className="text-sm font-medium text-slate-300">Secure Sign In</span>
          </div>

          {errors.form && (
            <div role="alert" className="mb-5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2.5 text-sm text-red-400">
              <AlertCircle size={16} aria-hidden="true" />
              {errors.form}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate aria-label="Sign in form">
            {/* Email / Username */}
            <div>
              <label htmlFor="username" className="block text-xs font-medium text-slate-400 mb-1.5">
                Email or Username <span className="text-red-400" aria-hidden="true">*</span>
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" aria-hidden="true" />
                <input
                  id="username" type="text" value={form.username}
                  onChange={handleChange('username')}
                  className={`lp-input pl-10 ${errors.username ? 'border-red-500/50 focus:ring-red-500' : ''}`}
                  placeholder="admin or you@example.com"
                  autoComplete="username" aria-required="true"
                  aria-invalid={!!errors.username}
                  aria-describedby={errors.username ? 'username-error' : undefined}
                />
              </div>
              {errors.username && <p id="username-error" role="alert" className="text-xs text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={11} aria-hidden="true" />{errors.username}</p>}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="text-xs font-medium text-slate-400">
                  Password <span className="text-red-400" aria-hidden="true">*</span>
                </label>
                <button type="button" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" aria-hidden="true" />
                <input
                  id="password" type={showPass ? 'text' : 'password'} value={form.password}
                  onChange={handleChange('password')}
                  className={`lp-input pl-10 pr-10 ${errors.password ? 'border-red-500/50 focus:ring-red-500' : ''}`}
                  placeholder="••••••••"
                  autoComplete="current-password" aria-required="true"
                  aria-invalid={!!errors.password}
                />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                  aria-label={showPass ? 'Hide password' : 'Show password'} aria-pressed={showPass}>
                  {showPass ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                </button>
              </div>
              {errors.password && <p role="alert" className="text-xs text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={11} aria-hidden="true" />{errors.password}</p>}
            </div>

            <button type="submit" disabled={loading} className="lp-btn-primary w-full mt-2" aria-busy={loading}>
              {loading
                ? <><Loader size={16} className="animate-spin" aria-hidden="true" /> Signing in...</>
                : <><Shield size={16} aria-hidden="true" /> Sign In</>
              }
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-5 p-3.5 bg-slate-800/50 rounded-xl border border-slate-700/50" aria-label="Demo credentials">
            <p className="text-xs font-medium text-slate-400 mb-2">Demo Credentials</p>
            <dl className="space-y-1 text-xs">
              <div className="flex justify-between">
                <dt className="text-slate-500">Admin:</dt>
                <dd className="text-slate-300 font-mono">admin / admin123</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Operator:</dt>
                <dd className="text-slate-300 font-mono">operator / operator123</dd>
              </div>
              {hasFirebaseConfig && (
                <div className="flex justify-between pt-1 border-t border-slate-700/50 mt-1">
                  <dt className="text-emerald-500">Firebase:</dt>
                  <dd className="text-slate-300">use your email</dd>
                </div>
              )}
            </dl>
          </div>

          <p className="text-center text-sm text-slate-400 mt-5">
            Don't have an account?{' '}
            <Link to="/signup" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">Create one free</Link>
          </p>
        </div>

        <p className="text-center text-xs text-slate-600 mt-4">
          © {new Date().getFullYear()} VenuroX — Intelligence behind every movement
        </p>
      </div>
    </div>
  );
}
