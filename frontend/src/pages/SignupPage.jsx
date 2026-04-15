import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Eye, EyeOff, Loader, User, Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppStore } from '../store/appStore';
import { firebaseSignUp, getFirebaseAuthError, hasFirebaseConfig } from '../config/firebase';
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
  const [errors, setErrors]   = useState({});
  const { login }             = useAppStore();
  const navigate              = useNavigate();
  const strength              = getPasswordStrength(form.password);

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
      if (hasFirebaseConfig) {
        const result = await firebaseSignUp(form.name.trim(), form.email.trim(), form.password);
        login(result.user, result.token);
        toast.success(`Welcome to VenuroX, ${result.user.name}! 🎉`);
      } else {
        // Demo mode
        login({ id: 'demo', name: form.name.trim(), email: form.email.trim(), role: 'user', username: form.email.split('@')[0] }, 'demo-token');
        toast.success(`Welcome, ${form.name.trim()}! (Demo mode)`);
      }
      navigate('/dashboard');
    } catch (err) {
      const msg = getFirebaseAuthError(err.code) || err.message;
      setErrors({ form: msg });
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [form, validate, login, navigate]);

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
