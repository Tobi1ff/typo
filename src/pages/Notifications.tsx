import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, writeBatch, limit } from 'firebase/firestore';
import { db, logError } from '../firebase';
import { Bell, Heart, MessageSquare, UserPlus, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDate } from '../lib/utils';

interface Props { user: User; }

export default function Notifications({ user }: Props) {
  const [notifs, setNotifs]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) { setLoading(false); return; }
    const q = query(
      collection(db, 'notifications'),
      where('recipientUid', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    return onSnapshot(q, snap => {
      setNotifs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, err => { logError('Notifications', err); setLoading(false); });
  }, [user.uid]);

  const markRead = (id: string) => {
    if (!db) return;
    updateDoc(doc(db, 'notifications', id), { read: true }).catch(err => logError('markRead', err));
  };

  const markAllRead = async () => {
    if (!db) return;
    const batch = writeBatch(db);
    notifs.filter(n => !n.read).forEach(n => batch.update(doc(db!, 'notifications', n.id), { read: true }));
    await batch.commit().catch(err => logError('markAllRead', err));
  };

  const icon = (type: string) => {
    if (type === 'like')    return <Heart size={15} className="text-red-400" />;
    if (type === 'comment') return <MessageSquare size={15} className="text-blue-400" />;
    if (type === 'follow')  return <UserPlus size={15} className="text-[#00ff00]" />;
    return <Bell size={15} />;
  };

  const message = (n: any) => {
    if (n.type === 'like')    return 'liked your post';
    if (n.type === 'comment') return 'commented on your post';
    if (n.type === 'follow')  return 'started following you';
    return 'sent you a notification';
  };

  const unread = notifs.filter(n => !n.read).length;

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-black tracking-tighter italic -skew-x-12 inline-block text-white mb-1">ALERTS_LOG</h1>
          <p className="text-[10px] font-mono text-[#00ff00] uppercase tracking-widest">// System notifications</p>
        </div>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 text-[10px] font-mono text-[#555] hover:text-[#00ff00] transition-all"
          >
            <CheckCircle2 size={12} /> MARK_ALL_READ ({unread})
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-[#111] border border-[#222] animate-pulse" />)}
        </div>
      ) : notifs.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-[#222]">
          <Bell size={40} className="mx-auto text-[#222] mb-4" />
          <p className="text-[#444] font-mono uppercase tracking-widest text-sm">No alerts detected.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifs.map(n => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => !n.read && markRead(n.id)}
              className={`flex items-center gap-4 p-4 border cursor-pointer transition-all ${n.read ? 'bg-[#0a0a0a] border-[#1a1a1a] opacity-50' : 'bg-[#111] border-[#00ff00]/20 hover:border-[#00ff00]/40'}`}
            >
              <div className="p-2 bg-[#0a0a0a] border border-[#222] shrink-0">{icon(n.type)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <Link to={`/profile/${n.senderUid}`} className="font-bold text-white hover:text-[#00ff00]" onClick={e => e.stopPropagation()}>
                    {n.senderName}
                  </Link>
                  <span className="text-[#777] ml-2 text-xs">{message(n)}</span>
                </p>
                <p className="text-[10px] font-mono text-[#444]">{formatDate(n.createdAt?.toDate())}</p>
              </div>
              {!n.read && <span className="w-2 h-2 bg-[#00ff00] rounded-full shrink-0" />}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
