import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, limit, getDocs } from 'firebase/firestore';
import { db, logError } from '../firebase';
import { Search as SearchIcon, Terminal, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { avatarUrl } from '../lib/utils';

export default function Search() {
  const [term, setTerm]         = useState('');
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [results, setResults]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!db) { setLoading(false); return; }
    getDocs(query(collection(db, 'users'), limit(500)))
      .then(snap => {
        const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAllUsers(users);
        setResults(users);
      })
      .catch(err => logError('Search fetch', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!term.trim()) { setResults(allUsers); return; }
    const t = term.toLowerCase();
    setResults(allUsers.filter(u =>
      u.displayName?.toLowerCase().includes(t) ||
      u.techStack?.some((s: string) => s.toLowerCase().includes(t))
    ));
  }, [term, allUsers]);

  const highlight = (text: string) => {
    if (!term.trim()) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <span>
        {parts.map((p, i) =>
          p.toLowerCase() === term.toLowerCase()
            ? <span key={i} className="text-[#00ff00] bg-[#00ff00]/10">{p}</span>
            : p
        )}
      </span>
    );
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      <div className="mb-10">
        <h1 className="text-3xl font-black tracking-tighter italic -skew-x-12 inline-block text-white mb-1">QUERY_USERS</h1>
        <p className="text-[10px] font-mono text-[#00ff00] uppercase tracking-widest">// Search by name or tech stack</p>
      </div>

      <div className="relative mb-10">
        <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#444]" />
        <input
          value={term}
          onChange={e => setTerm(e.target.value)}
          placeholder="Search developers..."
          className="w-full bg-[#111] border border-[#222] pl-11 pr-24 py-4 text-white focus:border-[#00ff00] focus:outline-none font-mono text-sm"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#444]">
          {results.length} FOUND
        </span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-[#111] border border-[#222] animate-pulse" />)}
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-3">
          {results.map(u => (
            <motion.div key={u.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>
              <Link
                to={`/profile/${u.uid || u.id}`}
                className="flex items-center gap-4 p-4 bg-[#111] border border-[#222] hover:border-[#00ff00] transition-all group"
              >
                <img src={u.photoURL || avatarUrl(u.uid || u.id)} alt="" className="w-12 h-12 border border-[#333] object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white group-hover:text-[#00ff00] transition-all truncate">
                    {highlight(u.displayName || 'Anonymous')}
                  </h3>
                  <p className="text-[10px] font-mono text-[#666]">@{(u.uid || u.id).slice(0, 8)}</p>
                </div>
                <div className="flex flex-wrap gap-1 max-w-[200px] justify-end">
                  {u.techStack?.map((t: string) => {
                    const match = term && t.toLowerCase().includes(term.toLowerCase());
                    return (
                      <span key={t} className={`px-1.5 py-0.5 border text-[8px] font-mono uppercase ${match ? 'bg-[#00ff00] text-black border-[#00ff00]' : 'bg-[#0a0a0a] border-[#222] text-[#666]'}`}>
                        {t}
                      </span>
                    );
                  })}
                </div>
                <ArrowRight size={14} className="text-[#333] group-hover:text-[#00ff00] transition-all ml-2 shrink-0" />
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border border-dashed border-[#222]">
          <Terminal size={40} className="mx-auto text-[#222] mb-4" />
          <p className="text-[#444] font-mono uppercase tracking-widest text-sm">
            {term ? 'No users match your query.' : 'No users found.'}
          </p>
        </div>
      )}
    </div>
  );
}
