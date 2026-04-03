import { useState } from 'react';
import { User } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, logError } from '../firebase';
import { motion } from 'framer-motion';
import { X, Globe, Lock, AlertCircle } from 'lucide-react';

interface Props { user: User; onClose: () => void; }

const HELP_TAGS = ['Bug Fix', 'Code Review', 'Design', 'Documentation', 'Performance', 'Testing', 'Feature', 'Advice'];
const STATUSES  = ['In Progress', 'Needs Help', 'Looking for Contributors', 'Completed'] as const;

export default function CreateProject({ user, onClose }: Props) {
  const [form, setForm] = useState({
    title: '', description: '', liveUrl: '', repoUrl: '',
    thumbnail: '', techStack: '',
    issue: '',          // what are you stuck on — required
    helpTags: [] as string[],
    status: 'Needs Help' as typeof STATUSES[number],
  });
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  const toggleTag = (tag: string) =>
    setForm(f => ({
      ...f,
      helpTags: f.helpTags.includes(tag)
        ? f.helpTags.filter(t => t !== tag)
        : [...f.helpTags, tag],
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Project title is required.'); return; }
    if (!form.issue.trim()) { setError('Please describe your issue or what you need help with.'); return; }
    if (!db) return;

    setLoading(true);
    setError('');
    try {
      await addDoc(collection(db, 'projects'), {
        authorUid:    user.uid,
        authorName:   user.displayName || 'Anonymous',
        authorPhoto:  user.photoURL || '',
        title:        form.title.trim(),
        description:  form.description.trim(),
        liveUrl:      form.liveUrl.trim(),
        repoUrl:      form.repoUrl.trim(),
        thumbnail:    form.thumbnail.trim(),
        techStack:    form.techStack.split(',').map(s => s.trim()).filter(Boolean),
        issue:        form.issue.trim(),
        helpTags:     form.helpTags,
        status:       form.status,
        followersCount:    0,
        contributorsCount: 0,
        visibility,
        createdAt:    serverTimestamp(),
      });
      onClose();
    } catch (err) {
      logError('CreateProject', err);
      setError('Failed to post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#0d0d0d] border border-[#222] w-full max-w-xl max-h-[92vh] overflow-y-auto custom-scrollbar"
      >
        <div className="p-6 border-b border-[#222] flex items-center justify-between sticky top-0 bg-[#0d0d0d] z-10">
          <div>
            <h2 className="font-black text-white uppercase tracking-tighter italic -skew-x-12 inline-block text-lg">POST TO ALLSAFE</h2>
            <p className="text-[9px] font-mono text-[#00ff00] uppercase tracking-widest mt-0.5">// Share your project & get help</p>
          </div>
          <button onClick={onClose} className="text-[#444] hover:text-white"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Basic info */}
          <div className="grid grid-cols-1 gap-4">
            {[
              { key: 'title',     label: 'Project Title *',  placeholder: 'My Awesome App',                  required: true },
              { key: 'repoUrl',   label: 'GitHub Repo URL',  placeholder: 'https://github.com/you/repo',     required: false },
              { key: 'liveUrl',   label: 'Live URL',         placeholder: 'https://myapp.vercel.app',        required: false },
              { key: 'thumbnail', label: 'Thumbnail URL',    placeholder: 'https://i.imgur.com/...',         required: false },
              { key: 'techStack', label: 'Tech Stack',       placeholder: 'React, Node.js, Firebase',        required: false },
            ].map(({ key, label, placeholder, required }) => (
              <div key={key}>
                <label className="block text-[10px] font-mono uppercase text-[#444] mb-1">{label}</label>
                <input
                  value={(form as any)[key]}
                  onChange={set(key as keyof typeof form)}
                  placeholder={placeholder}
                  required={required}
                  className="w-full bg-black border border-[#222] px-3 py-2.5 text-sm focus:border-[#00ff00] focus:outline-none transition-colors"
                />
              </div>
            ))}

            <div>
              <label className="block text-[10px] font-mono uppercase text-[#444] mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={set('description')}
                placeholder="What does your project do?"
                className="w-full bg-black border border-[#222] px-3 py-2.5 text-sm focus:border-[#00ff00] focus:outline-none min-h-[70px] resize-none"
              />
            </div>
          </div>

          {/* Issue — required, prominent */}
          <div className="border border-yellow-500/30 bg-yellow-500/5 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} className="text-yellow-500" />
              <label className="text-[10px] font-mono uppercase text-yellow-500 tracking-widest">
                What are you stuck on? *
              </label>
            </div>
            <textarea
              value={form.issue}
              onChange={set('issue')}
              placeholder={`Describe your issue clearly:\n• What's the problem?\n• What have you tried?\n• What kind of help do you need?`}
              required
              className="w-full bg-black border border-yellow-500/20 px-3 py-2.5 text-sm text-[#e0e0e0] focus:border-yellow-500/60 focus:outline-none min-h-[110px] resize-none placeholder-[#555]"
            />
            <p className="text-[9px] font-mono text-[#555]">This is required — AllSafe is for getting help. Be specific so others can assist you.</p>
          </div>

          {/* Help tags */}
          <div>
            <label className="block text-[10px] font-mono uppercase text-[#444] mb-2">Type of Help Needed</label>
            <div className="flex flex-wrap gap-2">
              {HELP_TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 text-[10px] font-mono uppercase border transition-all ${
                    form.helpTags.includes(tag)
                      ? 'bg-[#00ff00] text-black border-[#00ff00]'
                      : 'bg-black border-[#222] text-[#555] hover:border-[#444] hover:text-white'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-[10px] font-mono uppercase text-[#444] mb-2">Project Status</label>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, status: s }))}
                  className={`px-3 py-1.5 text-[10px] font-mono uppercase border transition-all ${
                    form.status === s
                      ? 'bg-[#00ff00] text-black border-[#00ff00]'
                      : 'bg-black border-[#222] text-[#555] hover:border-[#444] hover:text-white'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-[10px] font-mono border border-red-500/30 bg-red-900/10 px-3 py-2">
              ERROR: {error}
            </p>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-[#222]">
            <button
              type="button"
              onClick={() => setVisibility(v => v === 'public' ? 'private' : 'public')}
              className={`flex items-center gap-2 text-[10px] font-mono px-3 py-2 border transition-all ${visibility === 'private' ? 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10' : 'text-[#555] border-[#222] hover:text-white'}`}
            >
              {visibility === 'public' ? <Globe size={13} /> : <Lock size={13} />}
              {visibility.toUpperCase()}
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-[10px] font-mono text-[#555] hover:text-white">CANCEL</button>
              <button
                type="submit"
                disabled={loading || !form.title.trim() || !form.issue.trim()}
                className="bg-[#00ff00] text-black px-6 py-2 text-[10px] font-bold hover:bg-[#00cc00] disabled:opacity-40 uppercase tracking-widest"
              >
                {loading ? 'POSTING...' : 'POST TO ALLSAFE'}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
