import { useState } from 'react';
import {
  signInWithPopup, GoogleAuthProvider,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Cpu, Mail, Lock, UserPlus, LogIn, KeyRound } from 'lucide-react';

type Mode = 'login' | 'register' | 'reset';

function friendlyError(err: any): string {
  switch (err?.code) {
    case 'auth/email-already-in-use': return 'Email already in use.';
    case 'auth/invalid-email':        return 'Invalid email address.';
    case 'auth/weak-password':        return 'Password is too weak (min 6 chars).';
    case 'auth/user-not-found':       return 'No account found with this email.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':   return 'Incorrect email or password.';
    case 'auth/popup-closed-by-user': return 'Login cancelled.';
    case 'auth/too-many-requests':    return 'Too many attempts. Try again later.';
    default: return err?.message?.replace('Firebase: ', '') ?? 'Something went wrong.';
  }
}

export default function Auth() {
  const [mode, setMode]       = useState<Mode>('login');
  const [email, setEmail]     = useState('');
  const [password, setPass]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const reset = () => { setError(null); setSuccess(null); };

  const handleGoogle = async () => {
    if (!auth) return;
    setLoading(true); reset();
    try { await signInWithPopup(auth, new GoogleAuthProvider()); }
    catch (e) { setError(friendlyError(e)); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setLoading(true); reset();
    try {
      if (mode === 'reset') {
        await sendPasswordResetEmail(auth, email);
        setSuccess('Reset link sent — check your inbox.');
        setMode('login');
      } else if (mode === 'register') {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  };

  if (!auth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4">
        <div className="max-w-md w-full bg-[#111] border border-red-500/40 p-8 text-center space-y-4">
          <Terminal size={40} className="mx-auto text-red-500" />
          <h2 className="font-black text-white text-xl uppercase tracking-tighter">Firebase Not Configured</h2>
          <p className="text-sm font-mono text-[#888]">
            Add your Firebase credentials to <code className="text-[#00ff00]">.env</code> and redeploy.
          </p>
          <div className="text-left bg-[#0a0a0a] border border-[#222] p-4 font-mono text-[10px] text-[#666] space-y-1">
            <p>VITE_FIREBASE_API_KEY=</p>
            <p>VITE_FIREBASE_AUTH_DOMAIN=</p>
            <p>VITE_FIREBASE_PROJECT_ID=</p>
            <p>VITE_FIREBASE_APP_ID=</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#0a0a0a] overflow-hidden relative">
      {/* dot grid bg */}
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(#00ff00 1px, transparent 1px)', backgroundSize: '36px 36px' }}
      />

      <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="z-10 w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <motion.div
            animate={{ rotate: [0, 4, -4, 0] }}
            transition={{ repeat: Infinity, duration: 5 }}
            className="inline-block p-4 border-2 border-[#00ff00] mb-4"
          >
            <Terminal size={44} className="text-[#00ff00]" />
          </motion.div>
          <h1 className="text-6xl font-black tracking-tighter text-white italic -skew-x-12 inline-block mb-2">TYPO</h1>
          <p className="text-[#666] font-mono text-xs uppercase tracking-widest">// Developer Social Protocol</p>
        </div>

        {/* Card */}
        <div className="bg-[#111] border border-[#222] p-8 relative shadow-2xl">
          <div className="absolute top-0 right-0 px-2 py-1 text-[9px] font-mono text-[#333]">v2.0.0</div>

          <div className="mb-6">
            <h2 className="text-lg font-bold text-white">
              {mode === 'reset' ? 'Reset Access' : mode === 'register' ? 'Register Identity' : 'Initialize Session'}
            </h2>
            <p className="text-xs text-[#666] mt-1">
              {mode === 'reset' ? 'We\'ll send a reset link to your email.' : mode === 'register' ? 'Create your developer credentials.' : 'Connect your identity to the grid.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-[#444] mb-1"><Mail size={10} /> Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full bg-black border border-[#222] p-3 text-sm focus:border-[#00ff00] focus:outline-none font-mono transition-colors"
                placeholder="dev@null.io"
              />
            </div>

            {mode !== 'reset' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-[#444]"><Lock size={10} /> Password</label>
                  {mode === 'login' && (
                    <button type="button" onClick={() => { setMode('reset'); reset(); }} className="text-[9px] font-mono text-[#444] hover:text-[#00ff00] uppercase">
                      Forgot?
                    </button>
                  )}
                </div>
                <input
                  type="password" value={password} onChange={e => setPass(e.target.value)} required
                  className="w-full bg-black border border-[#222] p-3 text-sm focus:border-[#00ff00] focus:outline-none font-mono transition-colors"
                  placeholder="••••••••"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#00ff00] text-black font-bold py-3 hover:bg-[#00cc00] disabled:opacity-50 transition-all active:scale-95 uppercase text-xs tracking-widest"
            >
              {mode === 'reset' ? <KeyRound size={14} /> : mode === 'register' ? <UserPlus size={14} /> : <LogIn size={14} />}
              {loading ? 'PROCESSING...' : mode === 'reset' ? 'SEND RESET' : mode === 'register' ? 'REGISTER' : 'LOGIN'}
            </button>

            {mode === 'reset' && (
              <button type="button" onClick={() => { setMode('login'); reset(); }} className="w-full text-[10px] font-mono text-[#555] hover:text-[#00ff00] uppercase tracking-widest">
                ← Back to Login
              </button>
            )}
          </form>

          {mode !== 'reset' && (
            <>
              <div className="relative flex items-center my-5">
                <div className="flex-grow border-t border-[#222]" />
                <span className="mx-3 text-[10px] font-mono text-[#333] uppercase">or</span>
                <div className="flex-grow border-t border-[#222]" />
              </div>

              <button
                onClick={handleGoogle}
                disabled={loading}
                className="w-full relative flex items-center justify-center gap-2 bg-white text-black font-bold py-3 hover:bg-[#00ff00] transition-all active:scale-95 disabled:opacity-50 uppercase text-xs tracking-widest group"
              >
                <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                {loading ? 'CONNECTING...' : 'SIGN IN WITH GOOGLE'}
                <div className="absolute -bottom-1 -right-1 w-full h-full border border-white group-hover:border-[#00ff00] -z-10" />
              </button>

              <div className="text-center mt-4">
                <button
                  onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); reset(); }}
                  className="text-[10px] font-mono text-[#555] hover:text-[#00ff00] uppercase tracking-widest transition-colors"
                >
                  {mode === 'login' ? 'Need an identity? Register' : 'Already registered? Login'}
                </button>
              </div>
            </>
          )}

          {/* Messages */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mt-4 p-3 bg-red-900/20 border border-red-500/50 text-red-400 text-[10px] font-mono">
                ERROR: {error}
              </motion.div>
            )}
            {success && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mt-4 p-3 bg-green-900/20 border border-[#00ff00]/40 text-[#00ff00] text-[10px] font-mono">
                SUCCESS: {success}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="pt-6 mt-6 border-t border-[#222] grid grid-cols-3 gap-4 opacity-30">
            {['Compute', 'Shell', 'Network'].map(label => (
              <div key={label} className="flex flex-col items-center gap-1">
                <Cpu size={14} />
                <span className="text-[8px] font-mono uppercase">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
