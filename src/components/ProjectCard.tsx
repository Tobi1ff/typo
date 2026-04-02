import { ExternalLink, Github } from 'lucide-react';

interface Props { project: any; }

export default function ProjectCard({ project }: Props) {
  return (
    <div className="bg-[#111] border border-[#222] hover:border-[#00ff00]/40 transition-all group overflow-hidden flex flex-col">
      {project.thumbnail ? (
        <div className="h-48 overflow-hidden">
          <img src={project.thumbnail} alt={project.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        </div>
      ) : (
        <div className="h-48 bg-[#0a0a0a] flex items-center justify-center border-b border-[#222]">
          <span className="text-4xl font-black italic text-[#222] tracking-tighter -skew-x-12 inline-block">
            {project.title?.slice(0, 2).toUpperCase()}
          </span>
        </div>
      )}

      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-black text-white text-lg tracking-tighter mb-1 group-hover:text-[#00ff00] transition-all">{project.title}</h3>
        <p className="text-sm text-[#888] line-clamp-2 mb-4 flex-1">{project.description}</p>

        {project.techStack?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {project.techStack.map((tech: string) => (
              <span key={tech} className="px-1.5 py-0.5 bg-[#0a0a0a] border border-[#222] text-[9px] font-mono text-[#00ff00] uppercase">
                {tech}
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-3 mt-auto">
          {project.liveUrl && (
            <a href={project.liveUrl.startsWith('http') ? project.liveUrl : `https://${project.liveUrl}`}
               target="_blank" rel="noreferrer"
               className="flex items-center gap-1.5 text-xs font-mono text-[#666] hover:text-[#00ff00] transition-all">
              <ExternalLink size={13} /> Live
            </a>
          )}
          {project.repoUrl && (
            <a href={project.repoUrl.startsWith('http') ? project.repoUrl : `https://${project.repoUrl}`}
               target="_blank" rel="noreferrer"
               className="flex items-center gap-1.5 text-xs font-mono text-[#666] hover:text-[#00ff00] transition-all">
              <Github size={13} /> Repo
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
