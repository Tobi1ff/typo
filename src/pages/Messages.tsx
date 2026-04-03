import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { User } from 'firebase/auth';
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, serverTimestamp, doc, getDoc, updateDoc,
} from 'firebase/firestore';
import { db, logError } from '../firebase';
import { motion } from 'framer-motion';
import { Send, Shield, MessageSquare, ArrowLeft, Search } from 'lucide-react';
import { formatDate, avatarUrl } from '../lib/utils';

interface Props { user: User; }

export default function Messages({ user }: Props) {
  const { convId } = useParams<{ convId?: string }>();
  const navigate   = useNavigate();

  const [convos, setConvos]       = useState<any[]>([]);
  const [messages, setMessages]   = useState<any[]>([]);
  const [newMsg, setNewMsg]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [sending, setSending]     = useState(false);
  const [activeConvo, setActive]  = useState<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  /* ── Conversations list ── */
  useEffect(() => {
    if (!db) { setLoading(false); return; }
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );
    return onSnapshot(q, async snap => {
      const list = await Promise.all(snap.docs.map(async d => {
        const data = d.data();
        const otherId = data.participants?.find((p: string) => p !== user.uid);
        let otherUser = null;
        if (otherId && db) {
          const usnap = await getDoc(doc(db, 'users', otherId)).catch(() => null);
          otherUser = usnap?.exists() ? usnap.data() : null;
        }
        return { id: d.id, ...data, otherUser };
      }));
      setConvos(list);
      setLoading(false);
    }, err => { logError('Conversations', err); setLoading(false); });
  }, [user.uid]);

  /* ── Sync active conversation ── */
  useEffect(() => {
    if (convId) {
      const c = convos.find(c => c.id === convId);
      if (c) setActive(c);
    } else {
      setActive(null);
      setMessages([]);
    }
  }, [convId, convos]);

  /* ── Messages for active conversation ── */
  useEffect(() => {
    if (!convId || !db) return;
    const q = query(
      collection(db, 'conversations', convId, 'messages'),
      orderBy('createdAt', 'asc')
    );
    return onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => logError('Messages listen', err));
  }, [convId]);

  /* ── Scroll to bottom on new messages ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim() || !convId || !activeConvo || !db) return;

    const otherId = activeConvo.participants?.find((p: string) => p !== user.uid);
    if (!otherId) return;

    setSending(true);
    const text = newMsg.trim();
    setNewMsg('');

    try {
      // Store message as plain text — privacy enforced by Firestore rules
      await addDoc(collection(db, 'conversations', convId, 'messages'), {
        senderId:    user.uid,
        recipientId: otherId,
        text,
        createdAt:   serverTimestamp(),
      });

      // Update conversation preview
      await updateDoc(doc(db, 'conversations', convId), {
        lastMessage:   text.length > 40 ? text.slice(0, 40) + '...' : text,
        lastMessageAt: serverTimestamp(),
        updatedAt:     serverTimestamp(),
      });

      // Notification to recipient
      await addDoc(collection(db, 'notifications'), {
        recipientUid: otherId,
        senderUid:    user.uid,
        senderName:   user.displayName || 'Someone',
        type:         'message',
        convId,
        read:         false,
        createdAt:    serverTimestamp(),
      });
    } catch (err) {
      logError('handleSend', err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as any);
    }
  };

  if (loading) return <div className="p-8 text-center font-mono text-[#444]">LOADING_MESSAGES...</div>;

  return (
    <div className="flex h-[calc(100vh-4rem)] md:h-screen overflow-hidden bg-[#0a0a0a]">

      {/* ── Sidebar ── */}
      <div className={`w-full md:w-80 border-r border-[#222] flex flex-col ${convId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-5 border-b border-[#222]">
          <h2 className="text-lg font-black italic tracking-tighter -skew-x-12 inline-block flex items-center gap-2">
            <Shield size={18} className="text-[#00ff00]" /> MESSAGES
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {convos.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare size={40} className="mx-auto text-[#222] mb-3" />
              <p className="text-[10px] font-mono text-[#444] uppercase mb-4">No conversations yet</p>
              <Link to="/search"
                className="inline-flex items-center gap-1.5 text-[10px] font-mono text-[#555] hover:text-[#00ff00] uppercase border border-[#222] hover:border-[#00ff00]/40 px-3 py-2 transition-all">
                <Search size={11} /> Find Developers
              </Link>
            </div>
          ) : convos.map(c => (
            <Link
              key={c.id}
              to={`/messages/${c.id}`}
              className={`flex items-center gap-3 p-4 border-b border-[#111] hover:bg-[#111] transition-all ${convId === c.id ? 'bg-[#111] border-r-2 border-r-[#00ff00]' : ''}`}
            >
              <img src={c.otherUser?.photoURL || avatarUrl(c.id)} alt="" className="w-11 h-11 border border-[#222] object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{c.otherUser?.displayName || 'Unknown'}</p>
                <p className="text-[10px] font-mono text-[#555] truncate">{c.lastMessage || 'Start a conversation'}</p>
              </div>
              {c.lastMessageAt && (
                <span className="text-[8px] font-mono text-[#333] shrink-0">
                  {formatDate(c.lastMessageAt.toDate())}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Chat window ── */}
      <div className={`flex-1 flex flex-col ${!convId ? 'hidden md:flex' : 'flex'}`}>
        {convId ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-[#222] bg-[#0d0d0d] flex items-center gap-4">
              <button onClick={() => navigate('/messages')} className="md:hidden text-[#666] hover:text-white">
                <ArrowLeft size={20} />
              </button>
              <img src={activeConvo?.otherUser?.photoURL || avatarUrl(convId)} alt=""
                className="w-9 h-9 border border-[#222] object-cover" />
              <div>
                <p className="font-bold text-sm">{activeConvo?.otherUser?.displayName || '...'}</p>
                <p className="text-[9px] font-mono text-[#555] uppercase tracking-widest">Private conversation</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
              {messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12"
                >
                  <MessageSquare size={36} className="mx-auto text-[#222] mb-3" />
                  <p className="text-[10px] font-mono text-[#444] uppercase">Say something to start the conversation</p>
                </motion.div>
              )}

              {messages.map((m: any) => {
                const isMine = m.senderId === user.uid;
                return (
                  <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-4 py-2.5 text-sm ${isMine
                      ? 'bg-[#00ff00] text-black font-medium'
                      : 'bg-[#111] text-white border border-[#222]'}`}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                      <p className={`text-[8px] mt-1 ${isMine ? 'text-black/50 text-right' : 'text-[#555]'}`}>
                        {m.createdAt ? formatDate(m.createdAt.toDate()) : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 border-t border-[#222] bg-[#0d0d0d] flex gap-2">
              <input
                value={newMsg}
                onChange={e => setNewMsg(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="flex-1 bg-black border border-[#222] px-4 py-3 text-sm focus:border-[#00ff00] focus:outline-none font-sans"
              />
              <button
                type="submit"
                disabled={!newMsg.trim() || sending}
                className="bg-[#00ff00] text-black p-3 hover:bg-[#00cc00] transition-all disabled:opacity-40"
              >
                <Send size={18} />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="p-8 border border-[#222] bg-[#0d0d0d] max-w-sm">
              <Shield size={52} className="mx-auto text-[#222] mb-5" />
              <h2 className="text-xl font-black italic tracking-tighter -skew-x-12 inline-block mb-2">PRIVATE MESSAGES</h2>
              <p className="text-[10px] font-mono text-[#555] uppercase mb-5 leading-relaxed">
                Select a conversation to start chatting. Messages are private and only visible to participants.
              </p>
              <Link to="/search"
                className="inline-flex items-center gap-2 bg-[#111] border border-[#222] px-5 py-3 font-mono text-xs uppercase hover:border-[#00ff00] hover:text-[#00ff00] transition-all">
                <Search size={13} /> Find Developers
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
