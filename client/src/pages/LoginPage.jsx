import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Lock, Mail, Eye, EyeOff, Shield, Zap, Users, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const features = [
  { icon: Shield, text: 'AES-256 client-side encryption' },
  { icon: Zap, text: 'Real-time messaging with Socket.IO' },
  { icon: Users, text: 'One-to-one and group conversations' },
  { icon: CheckCircle, text: 'Typing indicators & read receipts' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const login = useAuthStore(s => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#0d0d14]">

      {/* ── Left branding pane ── */}
      <div className="hidden lg:flex flex-col justify-between w-[52%] relative overflow-hidden p-16">
        {/* Gradient blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-150 h-150 bg-violet-700 opacity-20 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-125 h-125 bg-indigo-600 opacity-15 rounded-full blur-[120px]" />
          <div className="absolute top-[40%] left-[30%] w-75 h-75 bg-fuchsia-700 opacity-10 rounded-full blur-[80px]" />
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-900/60">
              <Shield size={22} className="text-white" />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">CrypticChat</span>
          </div>
        </div>

        {/* Hero copy */}
        <div className="relative z-10">
          <h1 className="text-5xl font-bold text-white leading-tight tracking-tight mb-6">
            Secure messaging,<br />
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #a78bfa, #818cf8)' }}>
              zero compromise.
            </span>
          </h1>
          <p className="text-[#9090b0] text-lg leading-relaxed mb-12 max-w-sm">
            Every message encrypted on your device before it ever reaches our servers. Only you and your contacts can read what you send.
          </p>

          <div className="space-y-4">
            {features.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/20 flex items-center justify-center shrink-0">
                  <Icon size={15} className="text-violet-400" />
                </div>
                <span className="text-[#b0b0cc] text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom badge */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-[#ffffff08] border border-[#ffffff10] rounded-full px-4 py-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-[#9090b0] text-xs">Server running · End-to-end encrypted</span>
          </div>
        </div>
      </div>

      {/* ── Right form pane ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 sm:px-16 lg:px-24 py-12 relative">
        {/* Mobile-only glow */}
        <div className="lg:hidden absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-30%] right-[-20%] w-96 h-96 bg-violet-700 opacity-15 rounded-full blur-3xl" />
        </div>

        <div className="w-full max-w-sm relative">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-600 mb-4 shadow-lg shadow-violet-900/50">
              <Shield size={26} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">CrypticChat</h1>
            <p className="text-[#8888aa] text-sm mt-1">End-to-end encrypted messaging</p>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">Welcome back</h2>
          <p className="text-[#7070a0] text-sm mb-8">Sign in to your encrypted workspace</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-[#9090b0] uppercase tracking-widest mb-2">
                Email address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#555575]" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full bg-[#14141f] border border-[#2a2a42] rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-[#44445a] focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-[#9090b0] uppercase tracking-widest mb-2">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#555575]" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-[#14141f] border border-[#2a2a42] rounded-xl pl-11 pr-12 py-3.5 text-sm text-white placeholder-[#44445a] focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#555575] hover:text-[#9090b0] transition"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-semibold text-white text-sm transition-all duration-200 disabled:opacity-50 mt-1"
              style={{
                background: loading ? '#5b21b6' : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                boxShadow: '0 4px 24px rgba(124,58,237,0.35)',
              }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-[#1e1e30]" />
            <span className="text-xs text-[#44445a]">or</span>
            <div className="flex-1 h-px bg-[#1e1e30]" />
          </div>

          <p className="text-center text-sm text-[#6060a0]">
            Don't have an account?{' '}
            <Link to="/register" className="text-violet-400 hover:text-violet-300 font-semibold transition">
              Create one free
            </Link>
          </p>

          <div className="mt-10 flex items-center justify-center gap-2 text-xs text-[#40404a]">
            <Shield size={11} className="text-violet-600" />
            <span>Messages encrypted with AES-256 before transmission</span>
          </div>
        </div>
      </div>
    </div>
  );
}
