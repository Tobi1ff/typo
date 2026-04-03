import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, limit, doc, getDoc } from 'firebase/firestore';
import { db, logError } from '../firebase';
import CreatePost from '../components/CreatePost';
import PostCard from '../components/PostCard';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Activity, X } from 'lucide-react';

interface Props { user: User; }

export default function Home({ user }: Props) {
  const [posts, setPosts]         = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [myStack, setMyStack]     = useState<string[]>([]);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  /* ── Fetch user's tech stack for filter chips ── */
  useEffect(() => {
    if (!db) return;
    getDoc(doc(db, 'users', user.uid))
      .then(snap => { if (snap.exists()) setMyStack(snap.data().techStack || []); })
      .catch(err => logError('Home stack', err));
  }, [user.uid]);

  /* ── Feed ── */
  useEffect(() => {
    if (!db) { setLoading(false); return; }
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(60));
    return onSnapshot(q, snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      setPosts(all.filter(p => p.authorUid === user.uid || p.visibility === 'public'));
      setLoading(false);
    }, err => { logError('Home feed', err); setLoading(false); });
  }, [user.uid]);

  /* ── Apply tag filter ── */
  const filtered = activeTag
    ? posts.filter(p =>
        p.codeSnippet?.toLowerCase().includes(activeTag.toLowerCase()) ||
        p.language?.toLowerCase() === activeTag.toLowerCase() ||
        p.content?.toLowerCase().includes(activeTag.toLowerCase())
      )
    : posts;

  const Skeleton = () => (
    <div className="space-y-6">
      {[1, 2, 3].map(i => <div key={i} className="h-56 bg-[#111] border border-[#222] animate-pulse" />)}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tighter italic -skew-x-12 inline-block text-white">SYSTEM_FEED</h1>
          <p className="text-[10px] font-mono text-[#00ff00] uppercase tracking-widest mt-1">// Real-time developer activity</p>
        </div>
        <div className="flex items-center gap-2 text-[#444]">
          <Activity size={14} className="animate-pulse text-[#00ff00]" />
          <span className="text-[10px] font-mono">LIVE_SYNC</span>
        </div>
      </div>

      {/* ── Tech stack filter chips ── */}
      {myStack.length > 0 && (
        <div className="mb-6">
          <p className="text-[9px] font-mono text-[#444] uppercase tracking-widest mb-2">Filter by your stack</p>
          <div className="flex flex-wrap gap-2">
            {myStack.map(tag => (
              <button
                key={tag}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                className={`px-2.5 py-1 border text-[10px] font-mono uppercase tracking-wide transition-all ${
                  activeTag === tag
                    ? 'bg-[#00ff00] text-black border-[#00ff00]'
                    : 'bg-[#0a0a0a] border-[#222] text-[#666] hover:border-[#00ff00]/50 hover:text-white'
                }`}
              >
                {tag}
              </button>
            ))}
            {activeTag && (
              <button
                onClick={() => setActiveTag(null)}
                className="flex items-center gap-1 px-2.5 py-1 border border-[#333] text-[10px] font-mono text-[#555] hover:text-white hover:border-[#555] transition-all"
              >
                <X size={10} /> Clear
              </button>
            )}
          </div>

          <AnimatePresence>
            {activeTag && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-[9px] font-mono text-[#00ff00] mt-2"
              >
                {filtered.length} post{filtered.length !== 1 ? 's' : ''} matching "{activeTag}"
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}

      <CreatePost user={user} />

      {loading ? (
        <Skeleton />
      ) : filtered.length === 0 && posts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0a0a0a] border border-[#00ff00]/20 p-8 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5"><Terminal size={120} /></div>
          <h2 className="text-2xl font-black tracking-tighter italic -skew-x-12 inline-block text-white mb-2">WELCOME_TO_TYPO</h2>
          <p className="text-sm text-[#888] font-mono mb-6 max-w-md">
            You've entered the decentralized developer hub. Share your logic, showcase your builds, and connect with the sector.
          </p>
          <div className="flex flex-wrap gap-3">
            <span className="flex items-center gap-2 text-[10px] font-mono text-[#00ff00] border border-[#00ff00]/30 px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-[#00ff00] rounded-full animate-pulse" /> STATUS: CONNECTED
            </span>
            <span className="text-[10px] font-mono text-[#555] border border-[#222] px-3 py-1 rounded-full">ENCRYPTION: AES-256</span>
          </div>
        </motion.div>
      ) : filtered.length === 0 && activeTag ? (
        <div className="text-center py-16 border border-dashed border-[#222]">
          <Terminal size={36} className="mx-auto text-[#222] mb-3" />
          <p className="text-[#444] font-mono text-sm uppercase tracking-widest">No posts match "{activeTag}"</p>
        </div>
      ) : (
        <div>
          {filtered.map(post => <PostCard key={post.id} post={post} currentUser={user} />)}
        </div>
      )}
    </div>
  );
}
