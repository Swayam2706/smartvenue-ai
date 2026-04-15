import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Zap, Map, Navigation, Clock, MessageSquare, Shield,
  ArrowRight, ChevronRight, Star, Users, Activity,
  Github, Linkedin, Mail, Menu, X, Sun, Moon,
  CheckCircle, TrendingUp, Bell, BarChart2
} from 'lucide-react';
import { useAppStore } from '../store/appStore';

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout, theme, toggleTheme } = useAppStore();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Benefits', href: '#benefits' },
    { label: 'Testimonials', href: '#testimonials' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-slate-950/90 backdrop-blur-xl border-b border-white/5 shadow-xl shadow-black/20' : 'bg-transparent'
      }`}
      role="banner"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group" aria-label="VenuroX home">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-all">
              <Zap size={16} className="text-white" aria-hidden="true" />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">VenuroX</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {navLinks.map(l => (
              <a
                key={l.label}
                href={l.href}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-all"
              >
                {l.label}
              </a>
            ))}
          </nav>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
            </button>

            {user ? (
              <>
                <Link to="/dashboard" className="px-4 py-2 text-sm font-medium text-slate-200 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10 rounded-lg transition-all"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg transition-all shadow-lg shadow-blue-500/20"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-slate-950/95 backdrop-blur-xl border-b border-white/5 px-4 py-4 space-y-2">
          {navLinks.map(l => (
            <a
              key={l.label}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-all"
            >
              {l.label}
            </a>
          ))}
          <div className="pt-2 border-t border-white/5 flex flex-col gap-2">
            {user ? (
              <>
                <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 text-sm text-center font-medium text-slate-200 bg-white/5 rounded-lg">Dashboard</Link>
                <button onClick={handleLogout} className="px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-white rounded-lg">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 text-sm text-center text-slate-300 bg-white/5 rounded-lg">Login</Link>
                <Link to="/signup" onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 text-sm text-center font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg">Get Started</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

// ── Hero Section ──────────────────────────────────────────────────────────────
function HeroSection() {
  const { user } = useAppStore();
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden hero-bg grid-bg pt-16" aria-label="Hero">
      {/* Animated orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-orb pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl animate-orb pointer-events-none" style={{ animationDelay: '4s' }} aria-hidden="true" />
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-purple-600/8 rounded-full blur-3xl animate-orb pointer-events-none" style={{ animationDelay: '8s' }} aria-hidden="true" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-8 animate-fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" aria-hidden="true" />
          Real-time Stadium Intelligence Platform
        </div>

        {/* Heading */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.05] tracking-tight mb-6 animate-fade-up">
          Intelligence behind{' '}
          <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent animate-gradient">
            every movement
          </span>
          <br />in your venue.
        </h1>

        {/* Subheading */}
        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-up delay-100">
          VenuroX uses AI and real-time data to predict crowd density, optimize navigation,
          reduce wait times, and keep every visitor safe — at scale.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-up delay-200">
          {user ? (
            <Link to="/dashboard" className="lp-btn-primary text-base px-8 py-4 shadow-xl shadow-blue-500/30">
              Open Dashboard <ArrowRight size={18} aria-hidden="true" />
            </Link>
          ) : (
            <>
              <Link to="/signup" className="lp-btn-primary text-base px-8 py-4 shadow-xl shadow-blue-500/30">
                Get Started Free <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link to="/login" className="lp-btn-secondary text-base px-8 py-4">
                Live Demo <ChevronRight size={18} aria-hidden="true" />
              </Link>
            </>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto animate-fade-up delay-300">
          {[
            { value: '20+', label: 'Zones Monitored' },
            { value: '4s',  label: 'Update Interval' },
            { value: '99%', label: 'Uptime SLA' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="text-2xl font-black text-white">{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-float" aria-hidden="true">
        <div className="w-px h-12 bg-gradient-to-b from-transparent to-slate-600" />
        <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
      </div>
    </section>
  );
}

// ── Features Section ──────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Map,
    title: 'Crowd Heatmap',
    desc: 'Real-time SVG visualization of crowd density across all 20+ venue zones with color-coded risk levels and 15-minute predictions.',
    color: 'from-blue-500/20 to-blue-600/5',
    border: 'border-blue-500/20',
    iconBg: 'bg-blue-500/10 text-blue-400',
    badge: 'Live',
  },
  {
    icon: Navigation,
    title: 'Smart Navigation',
    desc: "Dijkstra's algorithm computes the shortest AND least-crowded path between any two zones, with a gamified route score.",
    color: 'from-indigo-500/20 to-indigo-600/5',
    border: 'border-indigo-500/20',
    iconBg: 'bg-indigo-500/10 text-indigo-400',
    badge: 'AI',
  },
  {
    icon: Clock,
    title: 'Queue Prediction',
    desc: 'AI-powered wait time forecasting for gates, food courts, and restrooms — with current and 15-minute predicted wait times.',
    color: 'from-yellow-500/20 to-yellow-600/5',
    border: 'border-yellow-500/20',
    iconBg: 'bg-yellow-500/10 text-yellow-400',
    badge: 'Predictive',
  },
  {
    icon: MessageSquare,
    title: 'AI Assistant',
    desc: 'Gemini-powered chatbot answers natural language queries: "Nearest restroom?", "Fastest exit?", "Least crowded food court?"',
    color: 'from-purple-500/20 to-purple-600/5',
    border: 'border-purple-500/20',
    iconBg: 'bg-purple-500/10 text-purple-400',
    badge: 'Gemini',
  },
  {
    icon: Bell,
    title: 'Emergency Alerts',
    desc: 'Real-time critical alerts, evacuation broadcasts, and safe zone highlighting — pushed instantly to all connected clients.',
    color: 'from-red-500/20 to-red-600/5',
    border: 'border-red-500/20',
    iconBg: 'bg-red-500/10 text-red-400',
    badge: 'Safety',
  },
  {
    icon: BarChart2,
    title: 'Admin Analytics',
    desc: 'Comprehensive dashboard with 12-hour occupancy trends, zone congestion stats, CSV export, and emergency controls.',
    color: 'from-emerald-500/20 to-emerald-600/5',
    border: 'border-emerald-500/20',
    iconBg: 'bg-emerald-500/10 text-emerald-400',
    badge: 'Admin',
  },
];

function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-4 sm:px-6 relative" aria-labelledby="features-heading">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="section-badge mb-4">Platform Features</div>
          <h2 id="features-heading" className="text-4xl sm:text-5xl font-black text-white mb-4">
            Everything your venue needs
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Six powerful modules working together to deliver a seamless, safe, and intelligent event experience.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <article
              key={f.title}
              className={`lp-glass p-6 bg-gradient-to-br ${f.color} border ${f.border} group cursor-default`}
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-11 h-11 rounded-xl ${f.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <f.icon size={20} aria-hidden="true" />
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400">
                  {f.badge}
                </span>
              </div>
              <h3 className="font-bold text-white text-lg mb-2">{f.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── How It Works ──────────────────────────────────────────────────────────────
const STEPS = [
  { n: '01', title: 'Connect Your Venue', desc: 'Integrate VenuroX with your stadium infrastructure. Define zones, gates, and capacity limits in minutes.', icon: Zap },
  { n: '02', title: 'Real-Time Simulation', desc: 'Our AI engine continuously simulates crowd movement using moving-average algorithms and live sensor data.', icon: Activity },
  { n: '03', title: 'Smart Recommendations', desc: 'Visitors receive instant navigation guidance, queue predictions, and AI chat support on their devices.', icon: Navigation },
  { n: '04', title: 'Monitor & Respond', desc: 'Admins get a live dashboard with analytics, one-click alerts, and emergency evacuation controls.', icon: Shield },
];

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 px-4 sm:px-6 relative" aria-labelledby="how-heading">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-950/10 to-transparent pointer-events-none" aria-hidden="true" />
      <div className="max-w-6xl mx-auto relative">
        <div className="text-center mb-16">
          <div className="section-badge mb-4">How It Works</div>
          <h2 id="how-heading" className="text-4xl sm:text-5xl font-black text-white mb-4">
            Up and running in 4 steps
          </h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            From setup to live monitoring — VenuroX is designed for rapid deployment.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {/* Connector line */}
          <div className="hidden lg:block absolute top-10 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" aria-hidden="true" />

          {STEPS.map((s, i) => (
            <div key={s.n} className="relative text-center group">
              <div className="relative inline-flex mb-5">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600/20 to-indigo-600/10 border border-blue-500/20 flex items-center justify-center group-hover:border-blue-500/40 group-hover:shadow-lg group-hover:shadow-blue-500/10 transition-all">
                  <s.icon size={28} className="text-blue-400" aria-hidden="true" />
                </div>
                <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center">
                  {i + 1}
                </span>
              </div>
              <h3 className="font-bold text-white text-base mb-2">{s.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Benefits Section ──────────────────────────────────────────────────────────
const BENEFITS = [
  { icon: Clock,      title: 'Reduce Wait Times by 40%',    desc: 'AI queue prediction routes visitors to the shortest queues before they even arrive.' },
  { icon: Shield,     title: 'Enhanced Safety',              desc: 'Automatic critical alerts and evacuation routes keep every visitor safe in emergencies.' },
  { icon: TrendingUp, title: 'Real-Time Insights',           desc: '4-second data refresh gives operators a live pulse on every corner of the venue.' },
  { icon: Users,      title: 'Better Visitor Experience',    desc: 'Smart navigation and AI chat make every visitor feel guided and informed.' },
  { icon: Activity,   title: 'Predictive Analytics',         desc: '15-minute crowd forecasts let staff prepare before congestion becomes a problem.' },
  { icon: BarChart2,  title: 'Data-Driven Operations',       desc: 'Export analytics, track peak hours, and optimize staffing with historical data.' },
];

function BenefitsSection() {
  return (
    <section id="benefits" className="py-24 px-4 sm:px-6" aria-labelledby="benefits-heading">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="section-badge mb-4">Why VenuroX</div>
          <h2 id="benefits-heading" className="text-4xl sm:text-5xl font-black text-white mb-4">
            Built for real-world venues
          </h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Every feature is designed around the actual challenges of managing large crowds at scale.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {BENEFITS.map(b => (
            <div key={b.title} className="flex gap-4 p-5 lp-glass group">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/20 transition-colors">
                <b.icon size={18} className="text-blue-400" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm mb-1">{b.title}</h3>
                <p className="text-slate-400 text-xs leading-relaxed">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Testimonials ──────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    name: 'Arjun Mehta',
    role: 'Operations Director, IPL Stadium',
    avatar: 'AM',
    color: 'from-blue-500 to-indigo-600',
    text: 'VenuroX cut our average gate wait time from 18 minutes to under 8. The real-time heatmap alone is worth it — our staff can now respond to congestion before it becomes a problem.',
    stars: 5,
  },
  {
    name: 'Sarah Chen',
    role: 'Event Manager, FIFA World Cup Venue',
    avatar: 'SC',
    color: 'from-purple-500 to-pink-600',
    text: 'The AI assistant is genuinely impressive. Visitors ask it anything and get accurate, live answers. We saw a 35% reduction in staff queries on match days.',
    stars: 5,
  },
  {
    name: 'Rahul Verma',
    role: 'Safety Officer, Olympic Stadium',
    avatar: 'RV',
    color: 'from-emerald-500 to-teal-600',
    text: 'Emergency evacuation used to be our biggest concern. With VenuroX, we can broadcast evacuation routes to every visitor instantly. It is a game-changer for safety.',
    stars: 5,
  },
];

function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-24 px-4 sm:px-6 relative" aria-labelledby="testimonials-heading">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-950/10 to-transparent pointer-events-none" aria-hidden="true" />
      <div className="max-w-6xl mx-auto relative">
        <div className="text-center mb-16">
          <div className="section-badge mb-4">Testimonials</div>
          <h2 id="testimonials-heading" className="text-4xl sm:text-5xl font-black text-white mb-4">
            Trusted by venue operators
          </h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            From IPL to FIFA — VenuroX powers the world's largest events.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map(t => (
            <blockquote key={t.name} className="lp-glass p-6 flex flex-col gap-4">
              <div className="flex gap-1" aria-label={`${t.stars} out of 5 stars`}>
                {Array(t.stars).fill(0).map((_, i) => (
                  <Star key={i} size={14} className="text-yellow-400 fill-yellow-400" aria-hidden="true" />
                ))}
              </div>
              <p className="text-slate-300 text-sm leading-relaxed flex-1">"{t.text}"</p>
              <footer className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`} aria-hidden="true">
                  {t.avatar}
                </div>
                <div>
                  <cite className="not-italic font-semibold text-white text-sm">{t.name}</cite>
                  <div className="text-slate-500 text-xs">{t.role}</div>
                </div>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTA Section ───────────────────────────────────────────────────────────────
function CTASection() {
  const { user } = useAppStore();
  return (
    <section className="py-24 px-4 sm:px-6" aria-label="Call to action">
      <div className="max-w-4xl mx-auto">
        <div className="relative lp-glass p-12 text-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-indigo-600/5 to-purple-600/10 pointer-events-none" aria-hidden="true" />
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

          <div className="relative z-10">
            <div className="section-badge mb-6 mx-auto w-fit">Start Today — It's Free</div>
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">
              Ready to transform your{' '}
              <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                venue experience?
              </span>
            </h2>
            <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto">
              Join hundreds of venue operators using VenuroX to deliver safer, smarter, and more enjoyable events.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {user ? (
                <Link to="/dashboard" className="lp-btn-primary text-base px-10 py-4 shadow-xl shadow-blue-500/30">
                  Open Dashboard <ArrowRight size={18} aria-hidden="true" />
                </Link>
              ) : (
                <>
                  <Link to="/signup" className="lp-btn-primary text-base px-10 py-4 shadow-xl shadow-blue-500/30">
                    Create Free Account <ArrowRight size={18} aria-hidden="true" />
                  </Link>
                  <Link to="/login" className="lp-btn-secondary text-base px-10 py-4">
                    Sign In
                  </Link>
                </>
              )}
            </div>

            <div className="flex items-center justify-center gap-6 mt-8 text-xs text-slate-500">
              {['No credit card required', 'Free forever plan', 'Setup in 5 minutes'].map(t => (
                <div key={t} className="flex items-center gap-1.5">
                  <CheckCircle size={12} className="text-emerald-500" aria-hidden="true" />
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-white/5 py-12 px-4 sm:px-6" role="contentinfo">
      <div className="max-w-7xl mx-auto">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center" aria-hidden="true">
                <Zap size={16} className="text-white" />
              </div>
              <span className="font-bold text-white text-lg">VenuroX</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs mb-4">
              Intelligence behind every movement in your venue. Real-time crowd management for the world's largest events.
            </p>
            <div className="flex items-center gap-3">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all" aria-label="GitHub">
                <Github size={16} aria-hidden="true" />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all" aria-label="LinkedIn">
                <Linkedin size={16} aria-hidden="true" />
              </a>
              <a href="mailto:hello@venurox.com" className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all" aria-label="Email us">
                <Mail size={16} aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* Quick links */}
          <nav aria-label="Footer navigation">
            <h3 className="text-white font-semibold text-sm mb-4">Product</h3>
            <ul className="space-y-2.5">
              {[
                { label: 'Features', href: '#features' },
                { label: 'How It Works', href: '#how-it-works' },
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Live Demo', href: '/login' },
              ].map(l => (
                <li key={l.label}>
                  {l.href.startsWith('#') ? (
                    <a href={l.href} className="text-slate-400 hover:text-white text-sm transition-colors">{l.label}</a>
                  ) : (
                    <Link to={l.href} className="text-slate-400 hover:text-white text-sm transition-colors">{l.label}</Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-4">Contact</h3>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li><a href="mailto:hello@venurox.com" className="hover:text-white transition-colors">hello@venurox.com</a></li>
              <li><a href="mailto:support@venurox.com" className="hover:text-white transition-colors">support@venurox.com</a></li>
              <li className="pt-2 text-slate-500 text-xs">Available 24/7 for enterprise clients</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-xs">
            © {new Date().getFullYear()} VenuroX. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <a href="#" className="hover:text-slate-300 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-slate-300 transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <BenefitsSection />
        <TestimonialsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
