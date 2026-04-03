import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, limit, getDocs } from 'firebase/firestore';
import { db, logError } from '../firebase';
import { Search as SearchIcon, Terminal, ArrowRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { avatarUrl } from '../lib/utils';

export default function Search() {
  const [input, setInput]       = useState('');
  const [term, setTerm]         = useState('');
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [results, setResults]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [searched, setSearched] = useState(false);
  const inputRef                = useRef<HTMLInputElement>(null);

  /* ── Fetch all users once ── */
  useEffect(() => {
    if (!db) { setLoading(false); return; }
    getDocs(query(collection(db, 'users'), limit(500)))
      .then(snap => {
        // Normalise: always use doc.id as the uid if uid field is missing
        const users = snap.docs.map(d => ({
          id: d.id,
          uid: d.id,          // <-- fix: ensure uid is always present
          ...d.data(),
        }));
        setAllUsers(users);
      })
      .catch(err => logError('Search fetch', err))
      .finally(() => setLoading(false));
  }, []);

  /* ── Run search ── */
  const doSearch = (q = input) => {
    const t = q.trim().toLowerCase();
    setTerm(t);
    setSearched(true);
    if (!t) { setResults(allUsers); return; }
    setResults(
      allUsers.filter(u =>
        u.displayName?.toLowerCase().includes(t) ||
        u.bio?.toLowerCase().includes(t) ||
        u.techStack?.some((s: string) => s.toLowerCase().includes(t))
      )
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') doSearch();
    if (e.key === 'Escape') { setInput(''); setTerm(''); setSearched(false); setResults([]); }
  };

  const clear = () => {
    setInput(''); setTerm(''); setSearched(false); setResults([]);
    inputRef.current?.focus();
  };

  const highlight = (text: string) => {
    if (!term) return <span>{text}</span>;
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts   = text.split(new RegExp(`(${escaped})`, 'gi'));
    return (
      <span>
        {parts.map((p, i) =>
          p.toLowerCase() === term
            ? <span key={i} className="text-[#00ff00] bg-[#00ff00]/10 px-0.5">{p}</span>
            : p
        )}
      </span>
    );
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      <div className="mb-10">
        <h1 className="text-3xl font-black tracking-tighter italic -skew-x-12 inline-block text-white mb-1">QUERY_USERS</h1>
        <p className="text-[10px] font-mono text-[#00ff00] uppercase tracking-widest">// Search by name, bio or tech stack</p>
      </div>

      {/* ── Search bar ── */}
      <div className="flex gap-2 mb-10">
        <div className="relative flex-1">
          <SearchIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#444]" />
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Name, bio, or tech stack..."
            className="w-full bg-[#111] border border-[#222] pl-11 pr-10 py-4 text-white focus:border-[#00ff00] focus:outline-none font-mono text-sm transition-colors"
          />
          {input && (
            <button onClick={clear} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#444] hover:text-white transition-colors">
              <X size={16} />
            </button>
          )}
        </div>
        <button
          onClick={() => doSearch()}
          disabled={loading}
          className="bg-[#00ff00] text-black font-bold px-6 py-4 hover:bg-[#00cc00] transition-all active:scale-95 disabled:opacity-40 uppercase text-xs tracking-widest shrink-0"
        >
          SEARCH
        </button>
      </div>

      {/* ── Results ── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-[#111] border border-[#222] animate-pulse" />)}
        </div>
      ) : !searched ? (
        <div className="text-center py-20 border border-dashed border-[#222]">
          <SearchIcon size={40} className="mx-auto text-[#222] mb-4" />
          <p className="text-[#444] font-mono text-sm uppercase tracking-widest">Type a name or tech to find developers</p>
        </div>
      ) : results.length > 0 ? (
        <>
          <p className="text-[10px] font-mono text-[#444] mb-4 uppercase">{results.length} developer{results.length !== 1 ? 's' : ''} found</p>
          <AnimatePresence>
            <div className="space-y-3">
              {results.map((u, i) => (
                <motion.div
                  key={u.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Link
                    to={`/profile/${u.uid}`}
                    className="flex items-center gap-4 p-4 bg-[#111] border border-[#222] hover:border-[#00ff00] transition-all group"
                  >
                    <img
                      src={u.photoURL || avatarUrl(u.uid)}
                      alt={u.displayName}
                      className="w-12 h-12 border border-[#333] object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white group-hover:text-[#00ff00] transition-colors truncate">
                        {highlight(u.displayName || 'Anonymous')}
                      </h3>
                      <p className="text-[10px] font-mono text-[#555]">@{u.uid.slice(0, 8)}</p>
                      {u.bio && (
                        <p className="text-[10px] text-[#555] truncate mt-0.5">
                          {highlight(u.bio)}
                        </p>
                      )}
                      {/* Status badge */}
                      {u.status && u.status !== 'none' && (
                        <span className={`inline-block mt-1 text-[8px] font-mono uppercase px-1.5 py-0.5 border ${
                          u.status === 'open_to_work'
                            ? 'text-green-400 border-green-500/30'
                            : 'text-blue-400 border-blue-500/30'
                        }`}>
                          {u.status === 'open_to_work' ? 'Open to Work' : 'Looking to Collaborate'}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 max-w-[180px] justify-end shrink-0">
                      {u.techStack?.slice(0, 4).map((t: string) => {
                        const match = term && t.toLowerCase().includes(term);
                        return (
                          <span key={t} className={`px-1.5 py-0.5 border text-[8px] font-mono uppercase transition-colors ${
                            match ? 'bg-[#00ff00] text-black border-[#00ff00]' : 'bg-[#0a0a0a] border-[#222] text-[#555]'
                          }`}>
                            {t}
                          </span>
                        );
                      })}
                      {u.techStack?.length > 4 && (
                        <span className="px-1.5 py-0.5 border border-[#222] text-[8px] font-mono text-[#444]">
                          +{u.techStack.length - 4}
                        </span>
                      )}
                    </div>
                    <ArrowRight size={14} className="text-[#333] group-hover:text-[#00ff00] transition-colors ml-2 shrink-0" />
                  </Link>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        </>
      ) : (
        <div className="text-center py-20 border border-dashed border-[#222]">
          <Terminal size={40} className="mx-auto text-[#222] mb-4" />
          <p className="text-[#444] font-mono text-sm uppercase tracking-widest">No developers match "{term}"</p>
          <button onClick={clear} className="mt-4 text-[10px] font-mono text-[#555] hover:text-[#00ff00] uppercase transition-colors">
            Clear search
          </button>
        </div>
      )}
    </div>
  );
}
