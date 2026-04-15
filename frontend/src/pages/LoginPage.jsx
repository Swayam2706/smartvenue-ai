import React, { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Zap, Eye, EyeOff, Loader, Shield, AlertCircle, Mail, Lock } from 'lucide-react';
import axios from 'axios';
import { useAppStore } from '../store/appStore';
import toast from 'react-hot-toast';
import { signInWithEmail, signInWithGoogle, isFirebaseConfigured, getFirebaseErrorMessage } from '../config/firebase';
import { usePageTitle } from '../hooks/usePageTitle';

export default function LoginPage() {
  usePageTitle('Sign In');
  const [form, setForm]       = useState({ username: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors]   = useState({});
  const { login }             = useAppStore();
  const navigate              = useNavigate();
  const hasFirebase           = isFirebaseConfigured();

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
      if (hasFirebase && form.username.includes('@')) {
        const result = await signInWithEmail(form.username.trim(), form.password);
        login(result.user, result.token);
        toast.success(`Welcome back, ${result.user.name}! 👋`);
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
          ? getFirebaseErrorMessage(err.code)
          : err.response?.data?.error || 'Invalid credentials';
        setErrors({ form: msg });
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [form, validate, login, navigate, hasFirebase]);

  const handleGoogleSignIn = useCallback(async () => {
    setGoogleLoading(true);
    setErrors({});
    
    try {
      const result = await signInWithGoogle();
      login(result.user, result.token);
      toast.success(`Welcome back, ${result.user.name}! 👋`);
      navigate('/dashboard');
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        const msg = getFirebaseErrorMessage(err.code);
        setErrors({ form: msg });
        toast.error(msg);
      }
    } finally {
      setGoogleLoading(false);
    }
  }, [login, navigate]);

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

          {/* Divider */}
          {hasFirebase && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-700/50"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-slate-900/80 text-slate-500">Or continue with</span>
                </div>
              </div>

              {/* Google Sign In */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 text-gray-800 font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                aria-busy={googleLoading}
              >
                {googleLoading ? (
                  <Loader size={18} className="animate-spin" aria-hidden="true" />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                    <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707 0-.593.102-1.17.282-1.709V4.958H.957C.347 6.173 0 7.548 0 9c0 1.452.348 2.827.957 4.042l3.007-2.335z"/>
                    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
                  </svg>
                )}
                <span>{googleLoading ? 'Signing in...' : 'Sign in with Google'}</span>
              </button>
            </>
          )}

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
              {hasFirebase && (
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
