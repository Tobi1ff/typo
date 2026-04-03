import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User } from 'firebase/auth';
import {
  doc, setDoc, deleteDoc, onSnapshot,
  collection, addDoc, serverTimestamp, increment, updateDoc,
} from 'firebase/firestore';
import { db, logError } from '../firebase';
import {
  ExternalLink, Github, Star, GitFork, AlertCircle,
  Eye, GitPullRequest, Users, ChevronDown, ChevronUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { avatarUrl } from '../lib/utils';

interface Props {
  project: any;
  currentUser: User;
}

const STATUS_COLORS: Record<string, string> = {
  'Needs Help':               'text-yellow-400 border-yellow-500/40 bg-yellow-900/10',
  'Looking for Contributors': 'text-blue-400 border-blue-500/40 bg-blue-900/10',
  'In Progress':              'text-orange-400 border-orange-500/40 bg-orange-900/10',
  'Completed':                'text-[#00ff00] border-[#00ff00]/40 bg-[#00ff00]/5',
};

function extractGithubPath(url: string): string | null {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    if (!u.hostname.includes('github.com')) return null;
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    return `${parts[0]}/${parts[1]}`;
  } catch { return null; }
}

function useGithubStats(repoUrl: string | undefined) {
  const [stats, setStats] = useState<{ stars: number; forks: number; issues: number; watchers: number } | null>(null);

  useEffect(() => {
    if (!repoUrl) return;
    const path = extractGithubPath(repoUrl);
    if (!path) return;

    fetch(`https://api.github.com/repos/${path}`)
      .then(r => r.json())
      .then(d => {
        if (d.stargazers_count !== undefined) {
          setStats({
            stars:    d.stargazers_count,
            forks:    d.forks_count,
            issues:   d.open_issues_count,
            watchers: d.watchers_count,
          });
        }
      })
      .catch(() => {});
  }, [repoUrl]);

  return stats;
}

export default function ProjectCard({ project, currentUser }: Props) {
  const [following, setFollowing]   = useState(false);
  const [showIssue, setShowIssue]   = useState(false);
  const githubStats                 = useGithubStats(project.repoUrl);
  const githubPath                  = extractGithubPath(project.repoUrl || '');

  /* ── Follow state ── */
  useEffect(() => {
    if (!db) return;
    const ref = doc(db, 'projects', project.id, 'followers', currentUser.uid);
    return onSnapshot(ref, s => setFollowing(s.exists()), () => {});
  }, [project.id, currentUser.uid]);

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!db) return;
    const ref     = doc(db, 'projects', project.id, 'followers', currentUser.uid);
    const projRef = doc(db, 'projects', project.id);
    try {
      if (following) {
        await deleteDoc(ref);
        await updateDoc(projRef, { followersCount: increment(-1) });
      } else {
        await setDoc(ref, { uid: currentUser.uid, joinedAt: serverTimestamp() });
        await updateDoc(projRef, { followersCount: increment(1) });
        // Notify project owner
        if (project.authorUid !== currentUser.uid) {
          await addDoc(collection(db, 'notifications'), {
            recipientUid: project.authorUid,
            senderUid:    currentUser.uid,
            senderName:   currentUser.displayName || 'Someone',
            type:         'project_follow',
            projectId:    project.id,
            projectTitle: project.title,
            read:         false,
            createdAt:    serverTimestamp(),
          });
        }
      }
    } catch (err) { logError('follow project', err); }
  };

  const handleContribute = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!db) return;
    // Mark as contributor interest
    const ref = doc(db, 'projects', project.id, 'contributors', currentUser.uid);
    try {
      await setDoc(ref, { uid: currentUser.uid, joinedAt: serverTimestamp() }, { merge: true });
      await updateDoc(doc(db, 'projects', project.id), { contributorsCount: increment(1) });
      // Notify project owner
      if (project.authorUid !== currentUser.uid) {
        await addDoc(collection(db, 'notifications'), {
          recipientUid: project.authorUid,
          senderUid:    currentUser.uid,
          senderName:   currentUser.displayName || 'Someone',
          type:         'project_contribute',
          projectId:    project.id,
          projectTitle: project.title,
          read:         false,
          createdAt:    serverTimestamp(),
        });
      }
      // If there's a GitHub repo, open issues page
      if (githubPath) {
        window.open(`https://github.com/${githubPath}/issues`, '_blank');
      }
    } catch (err) { logError('contribute project', err); }
  };

  const statusColor = STATUS_COLORS[project.status] ?? '';
  const isOwn = project.authorUid === currentUser.uid;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#111] border border-[#222] hover:border-[#00ff00]/30 transition-all group overflow-hidden flex flex-col"
    >
      {/* Thumbnail / Placeholder */}
      {project.thumbnail ? (
        <div className="h-44 overflow-hidden">
          <img src={project.thumbnail} alt={project.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        </div>
      ) : (
        <div className="h-44 bg-[#0a0a0a] flex items-center justify-center border-b border-[#222] relative overflow-hidden">
          <span className="text-5xl font-black italic text-[#1a1a1a] tracking-tighter -skew-x-12 inline-block select-none">
            {project.title?.slice(0, 2).toUpperCase()}
          </span>
          {/* Dot grid overlay */}
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: 'radial-gradient(#00ff00 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        </div>
      )}

      <div className="p-4 flex flex-col flex-1">
        {/* Author */}
        <div className="flex items-center gap-2 mb-3">
          <Link to={`/profile/${project.authorUid}`} className="flex items-center gap-2 group/author">
            <img src={project.authorPhoto || avatarUrl(project.authorUid)}
              alt={project.authorName} className="w-6 h-6 border border-[#333] object-cover" />
            <span className="text-[10px] font-mono text-[#555] group-hover/author:text-[#00ff00] transition-colors">
              {project.authorName}
            </span>
          </Link>
          {project.status && (
            <span className={`ml-auto flex items-center gap-1 px-2 py-0.5 border text-[9px] font-mono uppercase ${statusColor}`}>
              {project.status === 'Needs Help' && <AlertCircle size={9} />}
              {project.status}
            </span>
          )}
        </div>

        {/* Title + description */}
        <h3 className="font-black text-white text-base tracking-tighter mb-1 group-hover:text-[#00ff00] transition-colors leading-tight">
          {project.title}
        </h3>
        {project.description && (
          <p className="text-xs text-[#777] line-clamp-2 mb-3 leading-relaxed">{project.description}</p>
        )}

        {/* Tech stack */}
        {project.techStack?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {project.techStack.map((tech: string) => (
              <span key={tech} className="px-1.5 py-0.5 bg-[#0a0a0a] border border-[#222] text-[8px] font-mono text-[#00ff00] uppercase">
                {tech}
              </span>
            ))}
          </div>
        )}

        {/* Help tags */}
        {project.helpTags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {project.helpTags.map((tag: string) => (
              <span key={tag} className="px-1.5 py-0.5 bg-purple-900/20 border border-purple-500/30 text-[8px] font-mono text-purple-300 uppercase">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* GitHub stats — only if we got data */}
        {githubStats && (
          <div className="flex items-center gap-4 mb-3 py-2 border-t border-b border-[#1a1a1a]">
            <span className="flex items-center gap-1 text-[10px] font-mono text-[#555]">
              <Star size={11} className="text-yellow-500" /> {githubStats.stars.toLocaleString()}
            </span>
            <span className="flex items-center gap-1 text-[10px] font-mono text-[#555]">
              <GitFork size={11} /> {githubStats.forks.toLocaleString()}
            </span>
            <span className="flex items-center gap-1 text-[10px] font-mono text-[#555]">
              <Eye size={11} /> {githubStats.watchers.toLocaleString()}
            </span>
            {githubStats.issues > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-mono text-yellow-500">
                <AlertCircle size={11} /> {githubStats.issues} open
              </span>
            )}
          </div>
        )}

        {/* Follower / contributor counts */}
        <div className="flex items-center gap-4 mb-3 text-[10px] font-mono text-[#444]">
          <span className="flex items-center gap-1">
            <Eye size={10} /> {project.followersCount ?? 0} watching
          </span>
          <span className="flex items-center gap-1">
            <Users size={10} /> {project.contributorsCount ?? 0} contributors
          </span>
        </div>

        {/* Issue preview (collapsible) */}
        {project.issue && (
          <div className="mb-3 border border-yellow-500/20 bg-yellow-900/5">
            <button
              onClick={() => setShowIssue(!showIssue)}
              className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-mono text-yellow-500 uppercase tracking-widest hover:bg-yellow-500/5 transition-colors"
            >
              <span className="flex items-center gap-1.5"><AlertCircle size={10} /> Issue / Help Needed</span>
              {showIssue ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            <AnimatePresence>
              {showIssue && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <p className="px-3 pb-3 text-xs text-[#aaa] leading-relaxed whitespace-pre-wrap">{project.issue}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-auto pt-3 border-t border-[#1a1a1a] flex flex-wrap gap-2">
          {/* Links */}
          {project.repoUrl && (
            <a
              href={project.repoUrl.startsWith('http') ? project.repoUrl : `https://${project.repoUrl}`}
              target="_blank" rel="noreferrer"
              className="flex items-center gap-1 text-[10px] font-mono text-[#555] hover:text-white transition-colors"
            >
              <Github size={12} /> Repo
            </a>
          )}
          {project.liveUrl && (
            <a
              href={project.liveUrl.startsWith('http') ? project.liveUrl : `https://${project.liveUrl}`}
              target="_blank" rel="noreferrer"
              className="flex items-center gap-1 text-[10px] font-mono text-[#555] hover:text-white transition-colors"
            >
              <ExternalLink size={12} /> Live
            </a>
          )}
          {githubPath && (
            <a
              href={`https://github.com/${githubPath}/pulls`}
              target="_blank" rel="noreferrer"
              className="flex items-center gap-1 text-[10px] font-mono text-[#555] hover:text-white transition-colors"
            >
              <GitPullRequest size={12} /> PRs
            </a>
          )}

          {/* Follow + Contribute — not shown to own project */}
          {!isOwn && (
            <div className="ml-auto flex gap-2">
              <button
                onClick={handleFollow}
                className={`flex items-center gap-1 px-3 py-1.5 border text-[10px] font-mono uppercase transition-all ${
                  following
                    ? 'bg-[#00ff00]/10 border-[#00ff00]/40 text-[#00ff00]'
                    : 'border-[#222] text-[#555] hover:border-[#00ff00]/40 hover:text-[#00ff00]'
                }`}
              >
                <Eye size={11} />
                {following ? 'Watching' : 'Watch'}
              </button>
              <button
                onClick={handleContribute}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#00ff00] text-black text-[10px] font-bold uppercase hover:bg-[#00cc00] transition-all"
              >
                <GitPullRequest size={11} />
                Contribute
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
