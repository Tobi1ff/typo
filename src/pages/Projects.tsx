import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db, logError } from '../firebase';
import ProjectCard from '../components/ProjectCard';
import CreateProject from '../components/CreateProject';
import { Shield, Plus, Search, AlertCircle, Layout, User as UserIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props { user: User; }

type Tab = 'all' | 'needs_help' | 'mine';

export default function Projects({ user }: Props) {
  const [projects, setProjects] = useState<any[]>([]);
  const [term, setTerm]         = useState('');
  const [tab, setTab]           = useState<Tab>('all');
  const [loading, setLoading]   = useState(true);
  const [showCreate, setCreate] = useState(false);

  useEffect(() => {
    if (!db) { setLoading(false); return; }
    const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'), limit(80));
    return onSnapshot(q, snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      setProjects(all.filter(p => p.authorUid === user.uid || p.visibility === 'public'));
      setLoading(false);
    }, err => { logError('Projects', err); setLoading(false); });
  }, [user.uid]);

  const byTab = projects.filter(p => {
    if (tab === 'needs_help') return p.status === 'Needs Help' || p.status === 'Looking for Contributors';
    if (tab === 'mine') return p.authorUid === user.uid;
    return true;
  });

  const filtered = term.trim()
    ? byTab.filter(p => {
        const t = term.toLowerCase();
        return (
          p.title?.toLowerCase().includes(t) ||
          p.description?.toLowerCase().includes(t) ||
          p.issue?.toLowerCase().includes(t) ||
          p.techStack?.some((s: string) => s.toLowerCase().includes(t)) ||
          p.helpTags?.some((s: string) => s.toLowerCase().includes(t))
        );
      })
    : byTab;

  const needsHelpCount = projects.filter(p =>
    p.status === 'Needs Help' || p.status === 'Looking for Contributors'
  ).length;

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'all',        label: 'All Builds',  icon: <Layout size={13} />,      count: projects.length },
    { id: 'needs_help', label: 'Needs Help',  icon: <AlertCircle size={13} />, count: needsHelpCount },
    { id: 'mine',       label: 'My Projects', icon: <UserIcon size={13} />,    count: projects.filter(p => p.authorUid === user.uid).length },
  ];

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      {showCreate && <CreateProject user={user} onClose={() => setCreate(false)} />}

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Shield size={28} className="text-[#00ff00]" />
            <h1 className="text-4xl font-black tracking-tighter italic -skew-x-12 inline-block text-white">DEV_SHOWCASE</h1>
          </div>
          <p className="text-[10px] font-mono text-[#00ff00] uppercase tracking-widest">
            // Post your project. Share your issue. Get help from the sector.
          </p>
        </div>
        <button
          onClick={() => setCreate(true)}
          className="flex items-center gap-2 bg-[#00ff00] text-black font-bold px-5 py-3 hover:bg-[#00cc00] transition-all text-sm uppercase shrink-0"
        >
          <Plus size={16} /> Post Your Project
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 mb-6 border-b border-[#222]">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-5 py-3 text-[10px] font-mono uppercase tracking-widest transition-all ${
              tab === t.id
                ? 'text-[#00ff00] border-b-2 border-[#00ff00] bg-[#111]'
                : 'text-[#444] hover:text-white'
            }`}
          >
            {t.icon}
            {t.label}
            {t.count !== undefined && (
              <span className={`px-1.5 py-0.5 text-[8px] rounded-full ${tab === t.id ? 'bg-[#00ff00] text-black' : 'bg-[#222] text-[#555]'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Search ── */}
      <div className="relative mb-8">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#444]" />
        <input
          value={term}
          onChange={e => setTerm(e.target.value)}
          placeholder="Search by title, tech stack, issue description..."
          className="w-full bg-[#111] border border-[#222] pl-11 pr-4 py-3.5 text-white focus:border-[#00ff00] focus:outline-none font-mono text-sm"
        />
        {term && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#444]">
            {filtered.length} found
          </span>
        )}
      </div>

      {/* ── Needs help callout ── */}
      {tab === 'needs_help' && !loading && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-start gap-3 p-4 border border-yellow-500/20 bg-yellow-900/5"
        >
          <AlertCircle size={16} className="text-yellow-500 shrink-0 mt-0.5" />
          <p className="text-xs font-mono text-[#888] leading-relaxed">
            These developers are stuck and need your help. Read their issue, check the repo, and hit <span className="text-[#00ff00]">Contribute</span> to let them know you're in.
          </p>
        </motion.div>
      )}

      {/* ── Grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-96 bg-[#111] border border-[#222] animate-pulse" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(p => (
            <ProjectCard key={p.id} project={p} currentUser={user} />
          ))}
        </div>
      ) : (
        <div className="py-28 text-center border border-dashed border-[#222]">
          <Shield size={52} className="mx-auto text-[#222] mb-4" />
          {tab === 'needs_help' ? (
            <>
              <p className="text-lg font-bold text-[#444] uppercase tracking-widest mb-2">No Help Requests</p>
              <p className="text-[#333] font-mono text-sm">All quiet in the sector — for now.</p>
            </>
          ) : tab === 'mine' ? (
            <>
              <p className="text-lg font-bold text-[#444] uppercase tracking-widest mb-2">No Projects Yet</p>
              <button onClick={() => setCreate(true)} className="mt-4 bg-[#00ff00] text-black font-bold px-6 py-2 text-sm uppercase hover:bg-[#00cc00] transition-all">
                Post Your First Project
              </button>
            </>
          ) : (
            <>
              <p className="text-lg font-bold text-[#444] uppercase tracking-widest mb-2">No Projects Found</p>
              <p className="text-[#333] font-mono text-sm">Be the first to post to the hub.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
