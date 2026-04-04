import { NavLink } from 'react-router-dom';
import { User } from 'firebase/auth';
import { Home, Search, Bell, User as UserIcon, LogOut, Terminal, Layout, MessageSquare } from 'lucide-react';
import { auth } from '../firebase';

interface Props { user: User; }

const navItems = (uid: string) => [
  { to: '/',              icon: Home,         label: 'Feed'     },
  { to: '/projects',      icon: Layout,       label: 'Projects' },
  { to: '/search',        icon: Search,       label: 'Search'   },
  { to: '/notifications', icon: Bell,         label: 'Alerts'   },
  { to: '/messages',      icon: MessageSquare,label: 'Messages' },
  { to: `/profile/${uid}`,icon: UserIcon,     label: 'Profile'  },
];

export default function Navbar({ user }: Props) {
  const items = navItems(user.uid);
  const avatar = user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`;

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <nav className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-[#0a0a0a] border-r border-[#222] flex-col p-6 z-50">
        <div className="flex items-center gap-3 mb-12">
          <div className="p-2 border border-[#00ff00]">
            <Terminal size={24} className="text-[#00ff00]" />
          </div>
          <span className="text-2xl font-black tracking-tighter italic -skew-x-12 inline-block">TYPO</span>
        </div>

        <div className="flex-1 space-y-1">
          {items.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-4 px-4 py-3 font-mono text-sm uppercase tracking-wider transition-all
                 ${isActive
                   ? 'bg-[#111] text-[#00ff00] border-r-2 border-[#00ff00]'
                   : 'text-[#666] hover:text-white hover:bg-[#111]'
                 }`
              }
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </div>

        <div className="pt-6 border-t border-[#222]">
          <div className="flex items-center gap-3 mb-4 px-4">
            <img src={avatar} alt={user.displayName || 'User'} className="w-10 h-10 border border-[#333] object-cover" />
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate">{user.displayName}</p>
              <p className="text-[10px] font-mono text-[#666]">@{user.uid.slice(0, 8)}</p>
            </div>
          </div>
          <button
            onClick={() => auth?.signOut()}
            className="w-full flex items-center gap-4 px-4 py-3 font-mono text-sm uppercase tracking-wider text-red-500 hover:bg-red-900/10 transition-all"
          >
            <LogOut size={20} /> Disconnect
          </button>
        </div>
      </nav>

      {/* ── Mobile Top Bar ── */}
      <div className="md:hidden fixed top-0 left-0 w-full bg-[#0a0a0a] border-b border-[#222] px-4 py-3 flex items-center justify-between z-50">
        <div className="flex items-center gap-2">
          <Terminal size={18} className="text-[#00ff00]" />
          <span className="font-black italic tracking-tighter -skew-x-12 inline-block">TYPO</span>
        </div>
        <img src={avatar} alt="" className="w-8 h-8 border border-[#333] object-cover" />
      </div>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-[#0a0a0a] border-t border-[#222] flex justify-around py-3 z-50">
        {items.map(({ to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `p-2 transition-all ${isActive ? 'text-[#00ff00]' : 'text-[#666]'}`
            }
          >
            <Icon size={22} />
          </NavLink>
        ))}
        <button onClick={() => auth?.signOut()} className="p-2 text-red-500">
          <LogOut size={22} />
        </button>
      </nav>
    </>
  );
}
