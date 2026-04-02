import { useState } from 'react';
import { User } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, logError } from '../firebase';
import { motion } from 'framer-motion';
import { X, Globe, Lock } from 'lucide-react';

interface Props { user: User; onClose: () => void; }

export default function CreateProject({ user, onClose }: Props) {
  const [form, setForm] = useState({ title: '', description: '', liveUrl: '', repoUrl: '', thumbnail: '', techStack: '' });
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !db) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'projects'), {
        authorUid:   user.uid,
        authorName:  user.displayName || 'Anonymous',
        authorPhoto: user.photoURL || '',
        title:       form.title.trim(),
        description: form.description.trim(),
        liveUrl:     form.liveUrl.trim(),
        repoUrl:     form.repoUrl.trim(),
        thumbnail:   form.thumbnail.trim(),
        techStack:   form.techStack.split(',').map(s => s.trim()).filter(Boolean),
        visibility,
        createdAt:   serverTimestamp(),
      });
      onClose();
    } catch (err) {
      logError('CreateProject', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#0d0d0d] border border-[#222] w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-[#222] flex items-center justify-between">
          <h2 className="font-black text-white uppercase tracking-tighter italic -skew-x-12 inline-block text-lg">PUSH_BUILD</h2>
          <button onClick={onClose} className="text-[#444] hover:text-white"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {[
            { key: 'title',       label: 'Project_Title*', placeholder: 'My Awesome App' },
            { key: 'liveUrl',     label: 'Live_URL',       placeholder: 'https://myapp.vercel.app' },
            { key: 'repoUrl',     label: 'Repo_URL',       placeholder: 'https://github.com/you/repo' },
            { key: 'thumbnail',   label: 'Thumbnail_URL',  placeholder: 'https://...' },
            { key: 'techStack',   label: 'Tech_Stack',     placeholder: 'React, Node.js, Firebase' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-[10px] font-mono uppercase text-[#444] mb-1">{label}</label>
              <input
                value={form[key as keyof typeof form]}
                onChange={set(key as keyof typeof form)}
                placeholder={placeholder}
                className="w-full bg-black border border-[#222] px-3 py-2 text-sm focus:border-[#00ff00] focus:outline-none"
              />
            </div>
          ))}

          <div>
            <label className="block text-[10px] font-mono uppercase text-[#444] mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={set('description')}
              placeholder="What does your project do?"
              className="w-full bg-black border border-[#222] px-3 py-2 text-sm focus:border-[#00ff00] focus:outline-none min-h-[80px] resize-y"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setVisibility(v => v === 'public' ? 'private' : 'public')}
              className={`flex items-center gap-2 text-xs font-mono px-3 py-2 border transition-all ${visibility === 'private' ? 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10' : 'text-[#666] border-[#222] hover:text-white'}`}
            >
              {visibility === 'public' ? <Globe size={14} /> : <Lock size={14} />}
              {visibility.toUpperCase()}
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-mono text-[#666] hover:text-white">CANCEL</button>
              <button
                type="submit"
                disabled={loading || !form.title.trim()}
                className="bg-[#00ff00] text-black px-6 py-2 text-xs font-bold hover:bg-[#00cc00] disabled:opacity-40 uppercase"
              >
                {loading ? 'PUSHING...' : 'PUSH_BUILD'}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
