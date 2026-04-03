import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User } from 'firebase/auth';
import {
  doc, updateDoc, increment, deleteDoc,
  collection, addDoc, query, onSnapshot,
  serverTimestamp, setDoc,
} from 'firebase/firestore';
import { db, logError } from '../firebase';
import { motion } from 'framer-motion';
import { Heart, MessageSquare, Share2, Trash2, Lock, AlertTriangle, Edit3, Check, X, Bookmark } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import { formatDate, avatarUrl } from '../lib/utils';

interface Props { post: any; currentUser: User; }

const LANGUAGES = ['javascript', 'typescript', 'python', 'rust', 'cpp', 'go', 'css', 'html', 'bash', 'json'];

export default function PostCard({ post, currentUser }: Props) {
  const [liked, setLiked]             = useState(false);
  const [likes, setLikes]             = useState<number>(post.likesCount ?? 0);
  const [bookmarked, setBookmarked]   = useState(false);
  const [showComments, setShowC]      = useState(false);
  const [comments, setComments]       = useState<any[]>([]);
  const [newComment, setNewC]         = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [confirmDel, setConfirmDel]   = useState(false);
  const [copied, setCopied]           = useState(false);

  // Edit state
  const [editing, setEditing]         = useState(false);
  const [editContent, setEditContent] = useState(post.content || '');
  const [editCode, setEditCode]       = useState(post.codeSnippet || '');
  const [editLang, setEditLang]       = useState(post.language || 'javascript');
  const [saving, setSaving]           = useState(false);

  const isOwn = currentUser.uid === post.authorUid;

  /* ── Like ── */
  useEffect(() => {
    if (!db) return;
    const ref = doc(db, 'posts', post.id, 'likes', currentUser.uid);
    return onSnapshot(ref, s => setLiked(s.exists()), err => logError('like-listen', err));
  }, [post.id, currentUser.uid]);

  /* ── Bookmark (stored in Firestore under user doc) ── */
  useEffect(() => {
    if (!db) return;
    const ref = doc(db, 'users', currentUser.uid, 'bookmarks', post.id);
    return onSnapshot(ref, s => setBookmarked(s.exists()), err => logError('bookmark-listen', err));
  }, [post.id, currentUser.uid]);

  /* ── Comments ── */
  useEffect(() => {
    if (!db || !showComments) return;
    const q = query(collection(db, 'posts', post.id, 'comments'));
    return onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setComments(data.sort((a: any, b: any) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)));
    }, err => logError('comments-listen', err));
  }, [showComments, post.id]);

  const handleLike = async () => {
    if (!db) return;
    const likeRef = doc(db, 'posts', post.id, 'likes', currentUser.uid);
    const postRef = doc(db, 'posts', post.id);
    try {
      if (liked) {
        await deleteDoc(likeRef);
        await updateDoc(postRef, { likesCount: increment(-1) });
        setLikes(n => n - 1);
      } else {
        await setDoc(likeRef, { userUid: currentUser.uid, createdAt: serverTimestamp() });
        await updateDoc(postRef, { likesCount: increment(1) });
        setLikes(n => n + 1);
        if (post.authorUid !== currentUser.uid) {
          await addDoc(collection(db, 'notifications'), {
            recipientUid: post.authorUid, senderUid: currentUser.uid,
            senderName: currentUser.displayName, type: 'like',
            postUid: post.id, read: false, createdAt: serverTimestamp(),
          });
        }
      }
    } catch (err) { logError('handleLike', err); }
  };

  const handleBookmark = async () => {
    if (!db) return;
    const ref = doc(db, 'users', currentUser.uid, 'bookmarks', post.id);
    try {
      if (bookmarked) {
        await deleteDoc(ref);
      } else {
        await setDoc(ref, { postId: post.id, savedAt: serverTimestamp() });
      }
    } catch (err) { logError('handleBookmark', err); }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !db) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'posts', post.id, 'comments'), {
        postUid: post.id, authorUid: currentUser.uid,
        authorName: currentUser.displayName, authorPhoto: currentUser.photoURL,
        content: newComment.trim(), createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'posts', post.id), { commentsCount: increment(1) });
      if (post.authorUid !== currentUser.uid) {
        await addDoc(collection(db, 'notifications'), {
          recipientUid: post.authorUid, senderUid: currentUser.uid,
          senderName: currentUser.displayName, type: 'comment',
          postUid: post.id, read: false, createdAt: serverTimestamp(),
        });
      }
      setNewC('');
    } catch (err) { logError('handleComment', err); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!confirmDel) { setConfirmDel(true); setTimeout(() => setConfirmDel(false), 3000); return; }
    if (!db) return;
    await deleteDoc(doc(db, 'posts', post.id)).catch(err => logError('handleDelete', err));
  };

  const handleSaveEdit = async () => {
    if (!db || !editContent.trim()) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'posts', post.id), {
        content:     editContent.trim(),
        codeSnippet: editCode.trim(),
        language:    editLang,
        editedAt:    serverTimestamp(),
      });
      setEditing(false);
    } catch (err) { logError('handleSaveEdit', err); }
    finally { setSaving(false); }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.origin).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#111] border border-[#222] overflow-hidden mb-6">
      <div className="p-4">
        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-4">
          <Link to={`/profile/${post.authorUid}`} className="flex items-center gap-3 group">
            <img src={post.authorPhoto || avatarUrl(post.authorUid)} alt={post.authorName}
              className="w-10 h-10 border border-[#333] group-hover:border-[#00ff00] transition-all object-cover" />
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-white group-hover:text-[#00ff00] transition-all">{post.authorName}</p>
                {post.visibility === 'private' && <Lock size={11} className="text-yellow-500" />}
                {post.editedAt && <span className="text-[9px] font-mono text-[#444]">edited</span>}
              </div>
              <p className="text-[10px] font-mono text-[#666]">{formatDate(post.createdAt?.toDate())}</p>
            </div>
          </Link>

          <div className="flex items-center gap-1">
            {isOwn ? (
              <>
                {!editing && (
                  <button onClick={() => setEditing(true)} className="p-1.5 text-[#444] hover:text-white transition-all" title="Edit post">
                    <Edit3 size={15} />
                  </button>
                )}
                <button
                  onClick={handleDelete}
                  className={`flex items-center gap-1 text-xs font-mono transition-all px-1.5 py-1 ${confirmDel ? 'text-red-500' : 'text-[#444] hover:text-red-500'}`}
                >
                  {confirmDel && <span className="text-[9px]">CONFIRM?</span>}
                  <Trash2 size={15} />
                </button>
              </>
            ) : (
              <button className="p-1.5 text-[#444] hover:text-yellow-500 transition-all" title="Report">
                <AlertTriangle size={15} />
              </button>
            )}
          </div>
        </div>

        {/* ── Body / Edit mode ── */}
        {editing ? (
          <div className="space-y-3 mb-4">
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#00ff00]/40 p-3 text-sm text-white focus:border-[#00ff00] focus:outline-none resize-none min-h-[80px] font-sans"
            />
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-[#0a0a0a] px-3 py-2 border border-[#222]">
                <select value={editLang} onChange={e => setEditLang(e.target.value)}
                  className="bg-transparent text-[10px] font-mono text-[#00ff00] border-none focus:ring-0 uppercase cursor-pointer">
                  {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <span className="text-[10px] font-mono text-[#444]">CODE_BLOCK</span>
              </div>
              <textarea
                value={editCode}
                onChange={e => setEditCode(e.target.value)}
                placeholder="Code snippet (optional)..."
                className="w-full bg-[#0a0a0a] border border-[#222] p-3 font-mono text-sm text-[#00ff00] focus:border-[#00ff00] focus:outline-none min-h-[100px] resize-y"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditing(false)} className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-mono text-[#555] hover:text-white border border-[#222] hover:border-[#444] transition-all">
                <X size={12} /> CANCEL
              </button>
              <button onClick={handleSaveEdit} disabled={saving || !editContent.trim()}
                className="flex items-center gap-1 px-4 py-1.5 text-[10px] font-mono bg-[#00ff00] text-black font-bold hover:bg-[#00cc00] disabled:opacity-40 transition-all">
                <Check size={12} /> {saving ? 'SAVING...' : 'SAVE'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 mb-4">
            <div className="text-[#e0e0e0] text-sm leading-relaxed prose prose-invert prose-sm max-w-none">
              <ReactMarkdown>{post.content}</ReactMarkdown>
            </div>
            {post.codeSnippet && (
              <div className="relative">
                <div className="absolute top-0 right-0 px-2 py-1 text-[10px] font-mono text-[#444] bg-[#0a0a0a] border-l border-b border-[#222] z-10">
                  {post.language || 'code'}
                </div>
                <SyntaxHighlighter
                  language={post.language || 'javascript'}
                  style={vscDarkPlus}
                  customStyle={{ margin: 0, padding: '1.5rem', backgroundColor: '#0a0a0a', border: '1px solid #222', fontSize: '0.8rem', borderRadius: 0 }}
                >
                  {post.codeSnippet}
                </SyntaxHighlighter>
              </div>
            )}
          </div>
        )}

        {/* ── Actions ── */}
        <div className="flex items-center gap-5 pt-3 border-t border-[#222]">
          <button onClick={handleLike} className={`flex items-center gap-1.5 text-sm font-mono transition-all ${liked ? 'text-[#00ff00]' : 'text-[#666] hover:text-white'}`}>
            <Heart size={16} fill={liked ? '#00ff00' : 'transparent'} /> {likes}
          </button>
          <button onClick={() => setShowC(!showComments)} className={`flex items-center gap-1.5 text-sm font-mono transition-all ${showComments ? 'text-[#00ff00]' : 'text-[#666] hover:text-white'}`}>
            <MessageSquare size={16} /> {post.commentsCount ?? 0}
          </button>
          <button onClick={handleBookmark} className={`flex items-center gap-1.5 text-sm font-mono transition-all ${bookmarked ? 'text-[#00ff00]' : 'text-[#666] hover:text-white'}`} title={bookmarked ? 'Remove bookmark' : 'Bookmark'}>
            <Bookmark size={16} fill={bookmarked ? '#00ff00' : 'transparent'} />
          </button>
          <button onClick={handleShare} className="flex items-center gap-1.5 text-sm font-mono text-[#666] hover:text-white transition-all ml-auto">
            <Share2 size={16} />
            {copied && <span className="text-[10px] text-[#00ff00]">COPIED</span>}
          </button>
        </div>
      </div>

      {/* ── Comments ── */}
      {showComments && (
        <div className="bg-[#0d0d0d] border-t border-[#222] p-4 space-y-4">
          <form onSubmit={handleComment} className="flex gap-3">
            <img src={currentUser.photoURL || avatarUrl(currentUser.uid)} alt="" className="w-8 h-8 border border-[#333] object-cover shrink-0" />
            <div className="flex-1 flex gap-2">
              <input
                value={newComment}
                onChange={e => setNewC(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 bg-transparent border border-[#222] px-3 py-1.5 text-sm focus:border-[#00ff00] focus:outline-none"
              />
              <button disabled={submitting || !newComment.trim()}
                className="bg-[#00ff00] text-black px-4 py-1.5 text-xs font-bold hover:bg-[#00cc00] disabled:opacity-40">
                {submitting ? '...' : 'REPLY'}
              </button>
            </div>
          </form>
          <div className="space-y-4 max-h-72 overflow-y-auto custom-scrollbar">
            {comments.map(c => (
              <div key={c.id} className="flex gap-3">
                <img src={c.authorPhoto || avatarUrl(c.authorUid)} alt="" className="w-7 h-7 border border-[#333] object-cover shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{c.authorName}</span>
                    <span className="text-[10px] font-mono text-[#444]">{formatDate(c.createdAt?.toDate())}</span>
                  </div>
                  <p className="text-sm text-[#aaa] mt-0.5">{c.content}</p>
                </div>
              </div>
            ))}
            {comments.length === 0 && <p className="text-[10px] font-mono text-[#444] text-center py-4">No comments yet.</p>}
          </div>
        </div>
      )}
    </motion.div>
  );
}
