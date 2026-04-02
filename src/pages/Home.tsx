import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db, logError } from '../firebase';
import CreatePost from '../components/CreatePost';
import PostCard from '../components/PostCard';
import { motion } from 'framer-motion';
import { Terminal, Activity } from 'lucide-react';

interface Props { user: User; }

export default function Home({ user }: Props) {
  const [posts, setPosts]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) { setLoading(false); return; }

    // Simple query — no composite index needed.
    // We filter out private posts from other users client-side.
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(60));
    return onSnapshot(q, snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      // Show own posts regardless of visibility; show only public posts from others
      setPosts(all.filter(p => p.authorUid === user.uid || p.visibility === 'public'));
      setLoading(false);
    }, err => { logError('Home feed', err); setLoading(false); });
  }, [user.uid]);

  const Skeleton = () => (
    <div className="space-y-6">
      {[1, 2, 3].map(i => <div key={i} className="h-56 bg-[#111] border border-[#222] animate-pulse" />)}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      {/* Header */}
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

      <CreatePost user={user} />

      {loading ? (
        <Skeleton />
      ) : posts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0a0a0a] border border-[#00ff00]/20 p-8 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Terminal size={120} />
          </div>
          <h2 className="text-2xl font-black tracking-tighter italic -skew-x-12 inline-block text-white mb-2">WELCOME_TO_TYPO</h2>
          <p className="text-sm text-[#888] font-mono mb-6 max-w-md">
            You've entered the decentralized developer hub. Share your logic, showcase your builds, and connect with the sector.
          </p>
          <div className="flex flex-wrap gap-3">
            <span className="flex items-center gap-2 text-[10px] font-mono text-[#00ff00] border border-[#00ff00]/30 px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-[#00ff00] rounded-full animate-pulse" />
              STATUS: CONNECTED
            </span>
            <span className="text-[10px] font-mono text-[#555] border border-[#222] px-3 py-1 rounded-full">
              ENCRYPTION: AES-256
            </span>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-0">
          {posts.map(post => <PostCard key={post.id} post={post} currentUser={user} />)}
        </div>
      )}
    </div>
  );
}
