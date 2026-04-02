import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { User } from 'firebase/auth';
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, serverTimestamp, doc, getDoc, updateDoc,
} from 'firebase/firestore';
import { db, logError } from '../firebase';
import { encryptMessage, decryptMessage } from '../lib/crypto';
import { motion } from 'framer-motion';
import { Send, Lock, Shield, ShieldAlert, MessageSquare, ArrowLeft, Search, Eye, EyeOff } from 'lucide-react';
import { formatDate, avatarUrl } from '../lib/utils';

interface Props { user: User; }

export default function Messages({ user }: Props) {
  const { convId } = useParams<{ convId?: string }>();
  const navigate   = useNavigate();

  const [convos, setConvos]         = useState<any[]>([]);
  const [messages, setMessages]     = useState<any[]>([]);
  const [newMsg, setNewMsg]         = useState('');
  const [passphrase, setPass]       = useState(sessionStorage.getItem('typo_pp') || '');
  const [showPass, setShowPass]     = useState(false);
  const [loading, setLoading]       = useState(true);
  const [activeConvo, setActive]    = useState<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  /* ── Conversations ── */
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

  /* ── Active conversation ── */
  useEffect(() => {
    if (convId) {
      const c = convos.find(c => c.id === convId);
      if (c) setActive(c);
    } else {
      setActive(null);
      setMessages([]);
    }
  }, [convId, convos]);

  /* ── Messages ── */
  useEffect(() => {
    if (!convId || !db) return;
    const q = query(collection(db, 'conversations', convId, 'messages'), orderBy('createdAt', 'asc'));
    return onSnapshot(q, async snap => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (passphrase) {
        const dec = await Promise.all(msgs.map(async (m: any) => {
          try { return { ...m, text: await decryptMessage(m.encryptedText, m.iv, m.salt, passphrase) }; }
          catch { return { ...m, error: true }; }
        }));
        setMessages(dec);
      } else {
        setMessages(msgs);
      }
    }, err => logError('Messages listen', err));
  }, [convId, passphrase]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const savePassphrase = (e: React.FormEvent) => {
    e.preventDefault();
    sessionStorage.setItem('typo_pp', passphrase);
    // re-trigger decrypt by updating state (already done via passphrase dep)
    setPass(p => p); // force re-render
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim() || !convId || !passphrase || !activeConvo || !db) return;
    const otherId = activeConvo.participants?.find((p: string) => p !== user.uid);
    if (!otherId) return;
    try {
      const enc = await encryptMessage(newMsg.trim(), passphrase);
      await addDoc(collection(db, 'conversations', convId, 'messages'), {
        senderId:      user.uid,
        recipientId:   otherId,
        encryptedText: enc.encryptedText,
        iv:            enc.iv,
        salt:          enc.salt,
        createdAt:     serverTimestamp(),
      });
      await updateDoc(doc(db, 'conversations', convId), {
        lastMessage:   '[Encrypted]',
        lastMessageAt: serverTimestamp(),
        updatedAt:     serverTimestamp(),
      });
      setNewMsg('');
    } catch (err) { logError('handleSend', err); }
  };

  if (loading) return <div className="p-8 text-center font-mono text-[#444]">LOADING_MESSAGES...</div>;

  return (
    <div className="flex h-[calc(100vh-4rem)] md:h-screen overflow-hidden bg-[#0a0a0a]">

      {/* ── Sidebar ── */}
      <div className={`w-full md:w-80 border-r border-[#222] flex flex-col ${convId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-5 border-b border-[#222]">
          <h2 className="text-lg font-black italic tracking-tighter -skew-x-12 inline-block flex items-center gap-2">
            <Shield size={18} className="text-[#00ff00]" /> SECURE_COMMS
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {convos.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare size={40} className="mx-auto text-[#222] mb-3" />
              <p className="text-[10px] font-mono text-[#444] uppercase">No conversations</p>
              <Link to="/search" className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-mono text-[#555] hover:text-[#00ff00] uppercase">
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
                <p className="text-[10px] font-mono text-[#555] truncate">{c.lastMessage || 'START_CONVERSATION'}</p>
              </div>
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
              <img src={activeConvo?.otherUser?.photoURL || avatarUrl(convId)} alt="" className="w-9 h-9 border border-[#222] object-cover" />
              <div>
                <p className="font-bold text-sm">{activeConvo?.otherUser?.displayName || '...'}</p>
                <div className="flex items-center gap-1">
                  <Lock size={9} className="text-[#00ff00]" />
                  <span className="text-[9px] font-mono text-[#00ff00] uppercase">End-to-End Encrypted</span>
                </div>
              </div>
            </div>

            {/* Passphrase gate */}
            {!passphrase ? (
              <div className="flex-1 flex items-center justify-center p-6 bg-[#0a0a0a]">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-sm w-full p-8 border border-[#222] bg-[#0d0d0d] text-center">
                  <ShieldAlert size={44} className="mx-auto text-yellow-500 mb-4" />
                  <h3 className="text-base font-bold mb-1 uppercase tracking-tighter">Secret Passphrase</h3>
                  <p className="text-[10px] font-mono text-[#555] mb-5 uppercase leading-relaxed">
                    Messages are AES-256 encrypted. Share a passphrase with your contact to read and send messages.
                  </p>
                  <form onSubmit={savePassphrase} className="space-y-3">
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={passphrase}
                        onChange={e => setPass(e.target.value)}
                        placeholder="ENTER_PASSPHRASE"
                        required
                        className="w-full bg-black border border-[#222] px-4 py-3 font-mono text-sm focus:border-[#00ff00] focus:outline-none"
                      />
                      <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#444] hover:text-white">
                        {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <button className="w-full bg-[#00ff00] text-black font-black py-3 uppercase tracking-tighter hover:bg-[#00cc00] transition-all">
                      Unlock
                    </button>
                  </form>
                </motion.div>
              </div>
            ) : (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
                  {messages.map(m => (
                    <div key={m.id} className={`flex ${m.senderId === user.uid ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] px-4 py-2.5 font-mono text-xs ${m.senderId === user.uid ? 'bg-[#00ff00] text-black' : 'bg-[#111] text-white border border-[#222]'}`}>
                        {m.error ? (
                          <span className="flex items-center gap-1.5 text-red-400 italic">
                            <ShieldAlert size={11} /> DECRYPTION_FAILED
                          </span>
                        ) : (
                          <p className="whitespace-pre-wrap leading-relaxed">{m.text || '...'}</p>
                        )}
                        <p className="text-[8px] mt-1 opacity-50 text-right">
                          {m.createdAt ? formatDate(m.createdAt.toDate()) : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleSend} className="p-4 border-t border-[#222] bg-[#0d0d0d] flex gap-2">
                  <input
                    value={newMsg}
                    onChange={e => setNewMsg(e.target.value)}
                    placeholder="TYPE_ENCRYPTED_MESSAGE..."
                    className="flex-1 bg-black border border-[#222] px-4 py-3 font-mono text-xs focus:border-[#00ff00] focus:outline-none"
                  />
                  <button type="submit" disabled={!newMsg.trim()} className="bg-[#00ff00] text-black p-3 hover:bg-[#00cc00] transition-all disabled:opacity-40">
                    <Send size={18} />
                  </button>
                </form>
              </>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="p-8 border border-[#222] bg-[#0d0d0d] max-w-sm">
              <Shield size={56} className="mx-auto text-[#222] mb-5" />
              <h2 className="text-xl font-black italic tracking-tighter -skew-x-12 inline-block mb-2">SECURE_CHANNEL</h2>
              <p className="text-[10px] font-mono text-[#555] uppercase mb-5">
                Select a conversation or find a developer to start chatting. All messages use AES-256-GCM encryption.
              </p>
              <Link to="/search" className="inline-flex items-center gap-2 bg-[#111] border border-[#222] px-5 py-3 font-mono text-xs uppercase hover:border-[#00ff00] hover:text-[#00ff00] transition-all">
                <Search size={13} /> Find Developers
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
