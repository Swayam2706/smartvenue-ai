import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Eye, EyeOff, Loader, User, Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppStore } from '../store/appStore';
import { createUserWithEmail, signUpWithGoogle, isFirebaseConfigured, getFirebaseErrorMessage } from '../config/firebase';
import { usePageTitle } from '../hooks/usePageTitle';

// Password strength checker
function getPasswordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8)  score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map = [
    { label: '',        color: '' },
    { label: 'Weak',    color: 'bg-red-500' },
    { label: 'Fair',    color: 'bg-yellow-500' },
    { label: 'Good',    color: 'bg-blue-500' },
    { label: 'Strong',  color: 'bg-emerald-500' },
  ];
  return { score, ...map[score] };
}

export default function SignupPage() {
  usePageTitle('Create Account');
  const [form, setForm]       = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors]   = useState({});
  const { login }             = useAppStore();
  const navigate              = useNavigate();
  const strength              = getPasswordStrength(form.password);
  const hasFirebase           = isFirebaseConfigured();

  const validate = useCallback(() => {
    const e = {};
    if (!form.name.trim())          e.name     = 'Full name is required';
    if (!form.email.trim())         e.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.password)             e.password = 'Password is required';
    else if (form.password.length < 6) e.password = 'Password must be at least 6 characters';
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
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
      if (hasFirebase) {
        const result = await createUserWithEmail(form.name.trim(), form.email.trim(), form.password);
        login(result.user, result.token);
        toast.success(`Welcome to VenuroX, ${result.user.name}! 🎉`);
      } else {
        // Demo mode
        login({ id: 'demo', name: form.name.trim(), email: form.email.trim(), role: 'user', username: form.email.split('@')[0] }, 'demo-token');
        toast.success(`Welcome, ${form.name.trim()}! (Demo mode)`);
      }
      navigate('/dashboard');
    } catch (err) {
      const msg = getFirebaseErrorMessage(err.code) || err.message;
      setErrors({ form: msg });
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [form, validate, login, navigate, hasFirebase]);

  const handleGoogleSignUp = useCallback(async () => {
    setGoogleLoading(true);
    setErrors({});
    
    try {
      const result = await signUpWithGoogle();
      login(result.user, result.token);
      toast.success(`Welcome to VenuroX, ${result.user.name}! 🎉`);
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
      <div className="fixed top-1/4 left-1/4 w-80 h-80 bg-blue-600/8 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="fixed bottom-1/4 right-1/4 w-64 h-64 bg-indigo-600/8 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 group mb-6" aria-label="VenuroX home">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Zap size={20} className="text-white" aria-hidden="true" />
            </div>
            <span className="font-bold text-white text-xl">VenuroX</span>
          </Link>
          <h1 className="text-2xl font-black text-white">Create your account</h1>
          <p className="text-slate-400 text-sm mt-1">Start managing your venue intelligently</p>
        </div>

        {/* Card */}
        <div className="lp-glass p-8">
          {errors.form && (
            <div role="alert" className="mb-5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2.5 text-sm text-red-400">
              <AlertCircle size={16} aria-hidden="true" />
              {errors.form}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate aria-label="Sign up form">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-xs font-medium text-slate-400 mb-1.5">
                Full Name <span className="text-red-400" aria-hidden="true">*</span>
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" aria-hidden="true" />
                <input
                  id="name" type="text" value={form.name}
                  onChange={handleChange('name')}
                  className={`lp-input pl-10 ${errors.name ? 'border-red-500/50 focus:ring-red-500' : ''}`}
                  placeholder="Swayam Patel"
                  autoComplete="name" aria-required="true"
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? 'name-error' : undefined}
                />
              </div>
              {errors.name && <p id="name-error" role="alert" className="text-xs text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={11} aria-hidden="true" />{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-slate-400 mb-1.5">
                Email Address <span className="text-red-400" aria-hidden="true">*</span>
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" aria-hidden="true" />
                <input
                  id="email" type="email" value={form.email}
                  onChange={handleChange('email')}
                  className={`lp-input pl-10 ${errors.email ? 'border-red-500/50 focus:ring-red-500' : ''}`}
                  placeholder="you@example.com"
                  autoComplete="email" aria-required="true"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                />
              </div>
              {errors.email && <p id="email-error" role="alert" className="text-xs text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={11} aria-hidden="true" />{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-slate-400 mb-1.5">
                Password <span className="text-red-400" aria-hidden="true">*</span>
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" aria-hidden="true" />
                <input
                  id="password" type={showPw ? 'text' : 'password'} value={form.password}
                  onChange={handleChange('password')}
                  className={`lp-input pl-10 pr-10 ${errors.password ? 'border-red-500/50 focus:ring-red-500' : ''}`}
                  placeholder="Min. 6 characters"
                  autoComplete="new-password" aria-required="true"
                  aria-invalid={!!errors.password}
                />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                  aria-label={showPw ? 'Hide password' : 'Show password'} aria-pressed={showPw}>
                  {showPw ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                </button>
              </div>
              {/* Strength bar */}
              {form.password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1,2,3,4].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strength.score ? strength.color : 'bg-slate-700'}`} />
                    ))}
                  </div>
                  {strength.label && <p className="text-xs text-slate-500">Strength: <span className="text-slate-300">{strength.label}</span></p>}
                </div>
              )}
              {errors.password && <p role="alert" className="text-xs text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={11} aria-hidden="true" />{errors.password}</p>}
            </div>

            {/* Confirm */}
            <div>
              <label htmlFor="confirm" className="block text-xs font-medium text-slate-400 mb-1.5">
                Confirm Password <span className="text-red-400" aria-hidden="true">*</span>
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" aria-hidden="true" />
                <input
                  id="confirm" type={showPw ? 'text' : 'password'} value={form.confirm}
                  onChange={handleChange('confirm')}
                  className={`lp-input pl-10 pr-10 ${errors.confirm ? 'border-red-500/50 focus:ring-red-500' : form.confirm && form.confirm === form.password ? 'border-emerald-500/30' : ''}`}
                  placeholder="Repeat password"
                  autoComplete="new-password" aria-required="true"
                  aria-invalid={!!errors.confirm}
                />
                {form.confirm && form.confirm === form.password && (
                  <CheckCircle size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400" aria-hidden="true" />
                )}
              </div>
              {errors.confirm && <p role="alert" className="text-xs text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={11} aria-hidden="true" />{errors.confirm}</p>}
            </div>

            <button type="submit" disabled={loading} className="lp-btn-primary w-full mt-2" aria-busy={loading}>
              {loading ? <><Loader size={16} className="animate-spin" aria-hidden="true" /> Creating account...</> : 'Create Account'}
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

              {/* Google Sign Up */}
              <button
                type="button"
                onClick={handleGoogleSignUp}
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
                <span>{googleLoading ? 'Signing up...' : 'Sign up with Google'}</span>
              </button>
            </>
          )}

          <p className="text-center text-sm text-slate-400 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">Sign in</Link>
          </p>
        </div>

        <p className="text-center text-xs text-slate-600 mt-4">
          © {new Date().getFullYear()} VenuroX — Intelligence behind every movement
        </p>
      </div>
    </div>
  );
}
