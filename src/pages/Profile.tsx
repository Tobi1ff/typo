import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { User } from 'firebase/auth';
import {
  doc, getDoc, collection, query, where, orderBy,
  onSnapshot, updateDoc, setDoc, deleteDoc,
  serverTimestamp, addDoc, getDocs,
} from 'firebase/firestore';
import { db, logError } from '../firebase';
import PostCard from '../components/PostCard';
import ProjectCard from '../components/ProjectCard';
import CreateProject from '../components/CreateProject';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Github, Twitter, Globe, Calendar, Edit3, Terminal, Cpu, Code,
  Plus, ArrowRight, X, MessageSquare, Ban,
} from 'lucide-react';
import { formatDate, avatarUrl } from '../lib/utils';

interface Props { currentUser: User; }

export default function Profile({ currentUser }: Props) {
  const { uid }    = useParams<{ uid: string }>();
  const navigate   = useNavigate();

  const [user, setUser]               = useState<any>(null);
  const [posts, setPosts]             = useState<any[]>([]);
  const [projects, setProjects]       = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState<'posts' | 'projects'>('posts');
  const [isFollowing, setFollowing]   = useState(false);
  const [isBlocked, setBlocked]       = useState(false);
  const [isEditing, setEditing]       = useState(false);
  const [showCreate, setShowCreate]   = useState(false);
  const [followers, setFollowers]     = useState<any[]>([]);
  const [following, setFollowing2]    = useState<any[]>([]);
  const [modal, setModal]             = useState<'followers' | 'following' | null>(null);
  const [editData, setEditData]       = useState({ displayName: '', bio: '', github: '', twitter: '', website: '', techStack: '' });

  const isOwn = uid === currentUser.uid;

  /* ── Load user ── */
  useEffect(() => {
    if (!uid || !db) return;

    getDoc(doc(db, 'users', uid)).then(snap => {
      if (!snap.exists()) return;
      const d = snap.data();
      setUser(d);
      setEditData({
        displayName: d.displayName || '',
        bio:         d.bio || '',
        github:      d.github || '',
        twitter:     d.twitter || '',
        website:     d.website || '',
        techStack:   d.techStack?.join(', ') || '',
      });
    }).catch(err => logError('Profile user', err));

    /* posts */
    const postsQ = isOwn
      ? query(collection(db, 'posts'), where('authorUid', '==', uid), orderBy('createdAt', 'desc'))
      : query(collection(db, 'posts'), where('authorUid', '==', uid), orderBy('createdAt', 'desc'));
    const unsubPosts = onSnapshot(postsQ, snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      setPosts(isOwn ? all : all.filter(p => p.visibility === 'public'));
      setLoading(false);
    }, err => { logError('Profile posts', err); setLoading(false); });

    /* projects */
    const projQ = query(collection(db, 'projects'), where('authorUid', '==', uid), orderBy('createdAt', 'desc'));
    const unsubProjects = onSnapshot(projQ, snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      setProjects(isOwn ? all : all.filter(p => p.visibility === 'public'));
    }, err => logError('Profile projects', err));

    /* followers */
    const unsubFollowers = onSnapshot(
      query(collection(db, 'follows'), where('followingUid', '==', uid)),
      async snap => {
        const ids = snap.docs.map(d => d.data().followerUid);
        const users = await Promise.all(ids.map(async id => {
          const s = await getDoc(doc(db!, 'users', id)).catch(() => null);
          return { id, ...s?.data() };
        }));
        setFollowers(users);
      }, err => logError('followers', err)
    );

    /* following */
    const unsubFollowing = onSnapshot(
      query(collection(db, 'follows'), where('followerUid', '==', uid)),
      async snap => {
        const ids = snap.docs.map(d => d.data().followingUid);
        const users = await Promise.all(ids.map(async id => {
          const s = await getDoc(doc(db!, 'users', id)).catch(() => null);
          return { id, ...s?.data() };
        }));
        setFollowing2(users);
      }, err => logError('following', err)
    );

    /* is following (if not own) */
    let unsubFollow = () => {};
    if (!isOwn) {
      const followRef = doc(db, 'follows', `${currentUser.uid}_${uid}`);
      unsubFollow = onSnapshot(followRef, s => setFollowing(s.exists()), () => {});
      /* is blocked */
      getDoc(doc(db, 'blocks', `${currentUser.uid}_${uid}`)).then(s => setBlocked(s.exists())).catch(() => {});
    }

    return () => { unsubPosts(); unsubProjects(); unsubFollowers(); unsubFollowing(); unsubFollow(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, currentUser.uid]);

  const handleFollow = async () => {
    if (!uid || !db) return;
    const ref = doc(db, 'follows', `${currentUser.uid}_${uid}`);
    try {
      if (isFollowing) {
        await deleteDoc(ref);
      } else {
        await setDoc(ref, { followerUid: currentUser.uid, followingUid: uid, createdAt: serverTimestamp() });
        await addDoc(collection(db, 'notifications'), {
          recipientUid: uid, senderUid: currentUser.uid, senderName: currentUser.displayName,
          type: 'follow', read: false, createdAt: serverTimestamp(),
        });
      }
    } catch (err) { logError('handleFollow', err); }
  };

  const handleBlock = async () => {
    if (!uid || !db) return;
    const ref = doc(db, 'blocks', `${currentUser.uid}_${uid}`);
    try {
      if (isBlocked) { await deleteDoc(ref); setBlocked(false); }
      else           { await setDoc(ref, { blockerUid: currentUser.uid, blockedUid: uid, createdAt: serverTimestamp() }); setBlocked(true); }
    } catch (err) { logError('handleBlock', err); }
  };

  const handleMessage = async () => {
    if (!uid || isOwn || !db) return;
    try {
      const snap = await getDocs(query(collection(db, 'conversations'), where('participants', 'array-contains', currentUser.uid)));
      const existing = snap.docs.find(d => d.data().participants?.includes(uid));
      if (existing) { navigate(`/messages/${existing.id}`); return; }
      const ref = await addDoc(collection(db, 'conversations'), {
        participants: [currentUser.uid, uid],
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
      navigate(`/messages/${ref.id}`);
    } catch (err) { logError('handleMessage', err); }
  };

  const handleSave = async () => {
    if (!uid || !db) return;
    try {
      await updateDoc(doc(db, 'users', uid), {
        ...editData,
        techStack: editData.techStack.split(',').map(s => s.trim()).filter(Boolean),
      });
      setUser((u: any) => ({ ...u, ...editData, techStack: editData.techStack.split(',').map(s => s.trim()).filter(Boolean) }));
      setEditing(false);
    } catch (err) { logError('handleSave', err); }
  };

  /* ── Follow / Following modal ── */
  const FollowModal = ({ title, users, onClose }: { title: string; users: any[]; onClose: () => void }) => (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-[#0d0d0d] border border-[#222] w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-[#222] flex items-center justify-between">
          <h3 className="font-bold uppercase tracking-widest text-sm">{title}</h3>
          <button onClick={onClose}><X size={18} className="text-[#555] hover:text-white" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {users.length ? users.map(u => (
            <Link key={u.id} to={`/profile/${u.id}`} onClick={onClose}
              className="flex items-center gap-3 p-3 bg-[#111] border border-[#222] hover:border-[#00ff00] transition-all group">
              <img src={u.photoURL || avatarUrl(u.id)} alt="" className="w-10 h-10 border border-[#333] object-cover" />
              <div className="flex-1">
                <p className="font-bold text-white group-hover:text-[#00ff00] transition-all">{u.displayName}</p>
                <p className="text-[10px] font-mono text-[#555]">@{u.id.slice(0, 8)}</p>
              </div>
              <ArrowRight size={14} className="text-[#333] group-hover:text-[#00ff00]" />
            </Link>
          )) : <p className="text-center py-8 text-[#444] font-mono text-xs">No users found.</p>}
        </div>
      </motion.div>
    </div>
  );

  if (!user) return <div className="p-8 text-center font-mono text-[#444]">LOADING_PROFILE...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <AnimatePresence>
        {modal === 'followers' && <FollowModal title="Followers" users={followers} onClose={() => setModal(null)} />}
        {modal === 'following' && <FollowModal title="Following" users={following} onClose={() => setModal(null)} />}
      </AnimatePresence>
      {showCreate && <CreateProject user={currentUser} onClose={() => setShowCreate(false)} />}

      {/* ── Header ── */}
      <div className="bg-[#111] border border-[#222] mb-8 overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-[#00ff00]/15 to-transparent border-b border-[#222]" />
        <div className="p-6 pt-0 flex flex-col md:flex-row gap-6 -mt-12">
          <img src={user.photoURL || avatarUrl(user.uid || uid)} alt={user.displayName} className="w-28 h-28 border-4 border-[#0a0a0a] bg-[#111] object-cover shrink-0" />
          <div className="flex-1 pt-10">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black tracking-tighter italic -skew-x-12 inline-block text-white">{user.displayName}</h1>
                <div className="flex flex-wrap items-center gap-4 mt-1">
                  <span className="text-[10px] font-mono text-[#00ff00] uppercase">@{(uid || '').slice(0, 8)}</span>
                  <button onClick={() => setModal('followers')} className="text-[10px] font-mono text-[#666] hover:text-[#00ff00] uppercase transition-all">{followers.length} Followers</button>
                  <button onClick={() => setModal('following')} className="text-[10px] font-mono text-[#666] hover:text-[#00ff00] uppercase transition-all">{following.length} Following</button>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                {isOwn ? (
                  <button onClick={() => setEditing(!isEditing)} className="flex items-center gap-2 bg-[#222] text-white px-4 py-2 hover:bg-[#333] transition-all font-mono text-xs">
                    <Edit3 size={13} /> EDIT_PROFILE
                  </button>
                ) : (
                  <>
                    <button onClick={handleMessage} className="flex items-center gap-2 bg-[#111] border border-[#222] text-white px-4 py-2 hover:border-[#00ff00] hover:text-[#00ff00] transition-all font-mono text-xs">
                      <MessageSquare size={13} /> MESSAGE
                    </button>
                    <button onClick={handleFollow} className={`flex items-center gap-2 px-5 py-2 font-bold transition-all active:scale-95 text-sm ${isFollowing ? 'bg-[#222] text-white hover:bg-red-900/20 hover:text-red-400' : 'bg-[#00ff00] text-black hover:bg-[#00cc00]'}`}>
                      {isFollowing ? 'DISCONNECT' : 'CONNECT'}
                    </button>
                    <button onClick={handleBlock} className={`flex items-center gap-2 px-3 py-2 border text-xs font-mono transition-all ${isBlocked ? 'bg-red-900/20 text-red-400 border-red-500/40' : 'text-[#555] border-[#222] hover:text-red-400 hover:border-red-500/40'}`} title={isBlocked ? 'Unblock' : 'Block'}>
                      <Ban size={13} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Bio / Edit form */}
            <div className="mt-4">
              {isEditing ? (
                <div className="space-y-3 bg-[#0d0d0d] p-4 border border-[#222]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { k: 'displayName', ph: 'Display Name' },
                      { k: 'techStack',   ph: 'Tech Stack (comma separated)' },
                      { k: 'github',      ph: 'GitHub Username' },
                      { k: 'twitter',     ph: 'Twitter Username' },
                    ].map(({ k, ph }) => (
                      <input key={k} value={(editData as any)[k]} onChange={e => setEditData(d => ({ ...d, [k]: e.target.value }))}
                        placeholder={ph} className="bg-transparent border border-[#222] p-2 text-sm focus:border-[#00ff00] focus:outline-none" />
                    ))}
                    <input value={editData.website} onChange={e => setEditData(d => ({ ...d, website: e.target.value }))}
                      placeholder="Website URL" className="bg-transparent border border-[#222] p-2 text-sm focus:border-[#00ff00] focus:outline-none md:col-span-2" />
                  </div>
                  <textarea value={editData.bio} onChange={e => setEditData(d => ({ ...d, bio: e.target.value }))}
                    placeholder="Bio" className="w-full bg-transparent border border-[#222] p-2 text-sm focus:border-[#00ff00] focus:outline-none min-h-[80px]" />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditing(false)} className="px-4 py-2 text-xs font-mono text-[#555] hover:text-white">CANCEL</button>
                    <button onClick={handleSave} className="bg-[#00ff00] text-black px-5 py-2 text-xs font-bold hover:bg-[#00cc00]">SAVE_CHANGES</button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-[#aaa] leading-relaxed mb-3">{user.bio || 'No bio provided.'}</p>
                  <div className="flex flex-wrap gap-4 text-xs font-mono text-[#555]">
                    {user.github  && <a href={`https://github.com/${user.github}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-[#00ff00]"><Github size={13} />{user.github}</a>}
                    {user.twitter && <a href={`https://twitter.com/${user.twitter}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-[#00ff00]"><Twitter size={13} />{user.twitter}</a>}
                    {user.website && <a href={user.website.startsWith('http') ? user.website : `https://${user.website}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-[#00ff00]"><Globe size={13} />Website</a>}
                    <span className="flex items-center gap-1"><Calendar size={13} />Joined {formatDate(user.createdAt?.toDate())}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tech stack badges */}
        {!isEditing && user.techStack?.length > 0 && (
          <div className="px-6 pb-5 flex flex-wrap gap-1.5">
            {user.techStack.map((t: string) => (
              <span key={t} className="px-2 py-0.5 bg-[#0a0a0a] border border-[#222] text-[9px] font-mono text-[#00ff00] uppercase">{t}</span>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#222] mb-8">
        {(['posts', 'projects'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-6 py-3 text-xs font-mono uppercase tracking-widest transition-all ${tab === t ? 'text-[#00ff00] border-b-2 border-[#00ff00] bg-[#111]' : 'text-[#444] hover:text-white'}`}>
            {t === 'posts' ? `Activity_Log (${posts.length})` : `Build_Showcase (${projects.length})`}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {tab === 'posts' ? (
            loading ? <div className="h-48 bg-[#111] border border-[#222] animate-pulse" /> :
            posts.length > 0 ? posts.map(p => <PostCard key={p.id} post={p} currentUser={currentUser} />) :
            <div className="p-12 text-center border border-dashed border-[#222]">
              <Terminal size={32} className="mx-auto text-[#222] mb-3" />
              <p className="text-[#444] font-mono text-sm uppercase tracking-widest">No activity recorded.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {isOwn && (
                <button onClick={() => setShowCreate(true)}
                  className="w-full py-8 border border-dashed border-[#222] hover:border-[#00ff00] hover:bg-[#00ff00]/5 transition-all flex flex-col items-center gap-2 group">
                  <Plus size={28} className="text-[#222] group-hover:text-[#00ff00]" />
                  <span className="text-xs font-mono text-[#444] group-hover:text-white uppercase tracking-widest">Push_New_Build</span>
                </button>
              )}
              {projects.length > 0
                ? <div className="grid grid-cols-1 md:grid-cols-2 gap-5">{projects.map(p => <ProjectCard key={p.id} project={p} />)}</div>
                : <div className="p-12 text-center border border-dashed border-[#222]"><p className="text-[#444] font-mono text-sm uppercase tracking-widest">No projects yet.</p></div>
              }
            </div>
          )}
        </div>

        {/* Sidebar stats */}
        <div className="space-y-6">
          <div className="bg-[#111] border border-[#222] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Cpu size={16} className="text-[#00ff00]" />
              <h3 className="font-bold uppercase tracking-tighter italic -skew-x-6 inline-block">Stats</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[['Posts', posts.length], ['Builds', projects.length], ['Followers', followers.length], ['Following', following.length]].map(([label, val]) => (
                <div key={label as string} className="p-3 bg-[#0a0a0a] border border-[#222]">
                  <p className="text-[9px] font-mono text-[#555] uppercase">{label}</p>
                  <p className="text-2xl font-black text-white">{val}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#111] border border-[#222] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Code size={16} className="text-[#00ff00]" />
              <h3 className="font-bold uppercase tracking-tighter italic -skew-x-6 inline-block">Sector_Info</h3>
            </div>
            <div className="space-y-2 text-[9px] font-mono text-[#555]">
              {[['STATUS', 'ONLINE', 'text-[#00ff00]'], ['ENCRYPTION', 'AES-256', ''], ['PROTOCOL', 'TYPO_v2.0', '']].map(([k, v, cls]) => (
                <div key={k} className="flex justify-between"><span>{k}</span><span className={cls}>{v}</span></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
