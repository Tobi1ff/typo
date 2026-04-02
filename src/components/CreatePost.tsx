import { useState } from 'react';
import { User } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, logError } from '../firebase';
import { motion } from 'framer-motion';
import { Code, Send, Globe, Lock, Image as ImageIcon } from 'lucide-react';
import { avatarUrl } from '../lib/utils';

interface Props { user: User; }

const LANGUAGES = ['javascript', 'typescript', 'python', 'rust', 'cpp', 'go', 'css', 'html', 'bash', 'json'];

export default function CreatePost({ user }: Props) {
  const [content, setContent]         = useState('');
  const [code, setCode]               = useState('');
  const [lang, setLang]               = useState('javascript');
  const [showCode, setShowCode]       = useState(false);
  const [visibility, setVisibility]   = useState<'public' | 'private'>('public');
  const [loading, setLoading]         = useState(false);

  const canSubmit = content.trim() || code.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !db) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'posts'), {
        authorUid:    user.uid,
        authorName:   user.displayName || 'Anonymous',
        authorPhoto:  user.photoURL || avatarUrl(user.uid),
        content:      content.trim(),
        codeSnippet:  showCode ? code.trim() : '',
        language:     showCode ? lang : '',
        likesCount:   0,
        commentsCount: 0,
        visibility,
        createdAt:    serverTimestamp(),
      });
      setContent('');
      setCode('');
      setShowCode(false);
    } catch (err) {
      logError('CreatePost', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#111] border border-[#222] p-4 mb-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-4">
          <img src={user.photoURL || avatarUrl(user.uid)} alt="" className="w-10 h-10 border border-[#333] shrink-0 object-cover" />
          <div className="flex-1 space-y-3">
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="What's on your terminal?"
              className="w-full bg-transparent border-none focus:ring-0 text-white placeholder-[#444] resize-none min-h-[72px] font-sans text-sm"
            />

            {showCode && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                <div className="flex items-center justify-between bg-[#0a0a0a] px-3 py-2 border border-[#222]">
                  <select
                    value={lang}
                    onChange={e => setLang(e.target.value)}
                    className="bg-transparent text-[10px] font-mono text-[#00ff00] border-none focus:ring-0 uppercase cursor-pointer"
                  >
                    {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <span className="text-[10px] font-mono text-[#444]">CODE_BLOCK</span>
                </div>
                <textarea
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="Paste your code here..."
                  className="w-full bg-[#0a0a0a] border border-[#222] p-4 font-mono text-sm text-[#00ff00] focus:border-[#00ff00] focus:ring-0 min-h-[140px] resize-y"
                />
              </motion.div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-[#222]">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setShowCode(!showCode)}
                  className={`p-2 transition-all ${showCode ? 'text-[#00ff00] bg-[#00ff00]/10' : 'text-[#666] hover:text-white'}`}
                  title="Toggle code block"
                >
                  <Code size={18} />
                </button>
                <button type="button" className="p-2 text-[#666] hover:text-white transition-all opacity-40 cursor-not-allowed" title="Image (coming soon)">
                  <ImageIcon size={18} />
                </button>
                <div className="w-px h-8 bg-[#222] mx-1 self-center" />
                <button
                  type="button"
                  onClick={() => setVisibility(v => v === 'public' ? 'private' : 'public')}
                  className={`p-2 flex items-center gap-1.5 text-[10px] font-mono transition-all ${visibility === 'private' ? 'text-yellow-500 bg-yellow-500/10' : 'text-[#666] hover:text-white'}`}
                >
                  {visibility === 'public' ? <Globe size={16} /> : <Lock size={16} />}
                  <span className="hidden sm:inline uppercase">{visibility}</span>
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || !canSubmit}
                className="flex items-center gap-2 bg-[#00ff00] text-black font-bold px-5 py-2 hover:bg-[#00cc00] disabled:opacity-40 transition-all active:scale-95 text-xs uppercase tracking-wide"
              >
                {loading ? 'EXECUTING...' : 'PUSH'}
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
