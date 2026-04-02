import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db, logError } from '../firebase';
import ProjectCard from '../components/ProjectCard';
import CreateProject from '../components/CreateProject';
import { Layout, Plus, Search } from 'lucide-react';

interface Props { user: User; }

export default function Projects({ user }: Props) {
  const [projects, setProjects]   = useState<any[]>([]);
  const [term, setTerm]           = useState('');
  const [loading, setLoading]     = useState(true);
  const [showCreate, setCreate]   = useState(false);

  useEffect(() => {
    if (!db) { setLoading(false); return; }
    const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'), limit(60));
    return onSnapshot(q, snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      setProjects(all.filter(p => p.authorUid === user.uid || p.visibility === 'public'));
      setLoading(false);
    }, err => { logError('Projects', err); setLoading(false); });
  }, [user.uid]);

  const filtered = term.trim()
    ? projects.filter(p => {
        const t = term.toLowerCase();
        return p.title?.toLowerCase().includes(t) || p.description?.toLowerCase().includes(t) || p.techStack?.some((s: string) => s.toLowerCase().includes(t));
      })
    : projects;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      {showCreate && <CreateProject user={user} onClose={() => setCreate(false)} />}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-black tracking-tighter italic -skew-x-12 inline-block text-white mb-1">PROJECT_SHOWCASE</h1>
          <p className="text-[10px] font-mono text-[#00ff00] uppercase tracking-widest">// Explore developer builds & experiments</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <p className="text-[10px] font-mono text-[#444] uppercase">Builds</p>
            <p className="text-xl font-black text-white">{filtered.length}</p>
          </div>
          <div className="w-px h-10 bg-[#222] hidden md:block" />
          <button
            onClick={() => setCreate(true)}
            className="bg-[#00ff00] text-black font-bold px-5 py-3 hover:bg-[#00cc00] transition-all flex items-center gap-2 text-sm uppercase"
          >
            <Plus size={16} /> Submit_Build
          </button>
        </div>
      </div>

      <div className="relative mb-10">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#444]" />
        <input
          value={term}
          onChange={e => setTerm(e.target.value)}
          placeholder="Search by title, description or tech stack..."
          className="w-full bg-[#111] border border-[#222] pl-11 pr-4 py-4 text-white focus:border-[#00ff00] focus:outline-none font-mono text-sm"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-80 bg-[#111] border border-[#222] animate-pulse" />)}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(p => <ProjectCard key={p.id} project={p} />)}
        </div>
      ) : (
        <div className="py-32 text-center border border-dashed border-[#222]">
          <Layout size={56} className="mx-auto text-[#222] mb-4" />
          <p className="text-xl font-bold text-[#444] uppercase tracking-widest mb-2">No Projects Found</p>
          <p className="text-[#333] font-mono text-sm">Be the first to push a build to the showcase.</p>
        </div>
      )}
    </div>
  );
}
