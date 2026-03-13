import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Inbox, Layers, Users, BarChart3, Megaphone, HelpCircle,
  Settings, Shield, MapPin, Map, ChevronRight, ChevronDown,
  LogOut, PanelLeftClose, PanelLeftOpen, MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkTrayCounts {
  myTickets: number;
  watching: number;
  groups: number;
}

interface CurrentUser {
  id: string;
  full_name: string;
  role: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getInitials = (name?: string) =>
  (name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

const roleColors: Record<string, string> = {
  super_admin: 'bg-danger/15 text-danger',
  team_admin: 'bg-info/15 text-info',
  member: 'bg-muted text-muted-foreground',
};

// ─── SidebarLink ──────────────────────────────────────────────────────────────

function SidebarLink({
  to, icon, label, onClick,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  const location = useLocation();
  const isActive = location.pathname === to || location.pathname.startsWith(to + '/');

  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:text-foreground hover:bg-secondary',
      )}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className="flex-1">{label}</span>
    </NavLink>
  );
}

// ─── AccordionSection ─────────────────────────────────────────────────────────

function AccordionSection({ icon, label, children, defaultOpen = false }: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
      >
        <span className="flex-shrink-0">{icon}</span>
        <span className="flex-1 text-left">{label}</span>
        {open
          ? <ChevronDown className="w-4 h-4 flex-shrink-0" />
          : <ChevronRight className="w-4 h-4 flex-shrink-0" />
        }
      </button>
      {open && (
        <div className="ml-3 mt-0.5 pl-3 border-l border-border space-y-0.5">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Work Tray (collapsed state) ──────────────────────────────────────────────

function WorkTray({ counts, currentUser, onNavigate, onLogout, onExpand }: {
  counts: WorkTrayCounts;
  currentUser: CurrentUser | null;
  onNavigate: (view: string) => void;
  onLogout: () => void;
  onExpand: () => void;
}) {
  return (
    <div className="flex flex-col h-full items-center py-3 gap-1">

      <Button
        variant="ghost" size="icon"
        className="w-8 h-8 hover:bg-primary/10 mb-2 flex-shrink-0"
        onClick={onExpand}
        title="Expand sidebar"
      >
        <PanelLeftOpen className="w-4 h-4 text-primary" />
      </Button>

      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-sm mb-4 flex-shrink-0">
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>

      <div className="w-8 border-t border-border mb-2" />

      <button
        onClick={() => onNavigate('my_open')}
        className="w-full flex flex-col items-center gap-0.5 py-3 px-1 rounded-lg hover:bg-secondary transition-colors group"
        title="My Open Tickets"
      >
        <span className="text-xl font-bold text-foreground group-hover:text-primary leading-none">{counts.myTickets}</span>
        <Inbox className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors mt-1" />
        <span className="text-[10px] text-muted-foreground leading-none mt-0.5">Mine</span>
      </button>

      <button
        onClick={() => onNavigate('watching')}
        className="w-full flex flex-col items-center gap-0.5 py-3 px-1 rounded-lg hover:bg-secondary transition-colors group"
        title="Tickets I'm Watching"
      >
        <span className="text-xl font-bold text-foreground group-hover:text-primary leading-none">{counts.watching}</span>
        <svg className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        <span className="text-[10px] text-muted-foreground leading-none mt-0.5">Watching</span>
      </button>

      <button
        onClick={() => onNavigate('groups')}
        className="w-full flex flex-col items-center gap-0.5 py-3 px-1 rounded-lg hover:bg-secondary transition-colors group"
        title="Active Groups"
      >
        <span className="text-xl font-bold text-foreground group-hover:text-primary leading-none">{counts.groups}</span>
        <Layers className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors mt-1" />
        <span className="text-[10px] text-muted-foreground leading-none mt-0.5">Groups</span>
      </button>

      <div className="flex-1" />
      <div className="w-8 border-t border-border mb-2" />

      <div
        className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-primary/20 cursor-default flex-shrink-0"
        title={currentUser?.full_name}
      >
        <span className="text-primary font-semibold text-xs">{getInitials(currentUser?.full_name)}</span>
      </div>

      <Button
        variant="ghost" size="icon"
        className="w-8 h-8 text-muted-foreground hover:text-danger flex-shrink-0"
        onClick={onLogout}
        title="Log out"
      >
        <LogOut className="w-4 h-4" />
      </Button>
    </div>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────

export interface SidebarProps {
  onViewChange?: (view: string) => void;
}

export function Sidebar({ onViewChange }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [counts, setCounts] = useState<WorkTrayCounts>({ myTickets: 0, watching: 0, groups: 0 });

  useEffect(() => { fetchUserAndCounts(); }, []);

  useEffect(() => {
    if (currentUser?.id) fetchCounts(currentUser.id);
  }, [location.pathname]);

  const fetchUserAndCounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles').select('id, full_name, role').eq('id', user.id).single();
      if (profile) { setCurrentUser(profile); fetchCounts(profile.id); }
    } catch (error) { console.error('Error fetching user:', error); }
  };

  const fetchCounts = async (userId: string) => {
    try {
      const { count: myTickets } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', userId)
        .not('status', 'in', '(resolved,closed)');

      const { data: watchRows } = await supabase
        .from('ticket_watchers')
        .select('ticket_id')
        .eq('user_id', userId)
        .not('ticket_id', 'is', null);

      const watchingTicketIds = (watchRows || []).map(r => r.ticket_id);
      let watchingCount = 0;
      if (watchingTicketIds.length > 0) {
        // AFTER
const { count } = await supabase
  .from('tickets')
  .select('*', { count: 'exact', head: true })
  .in('id', watchingTicketIds)
  .not('status', 'in', '(resolved,closed)');
      }

      const { count: groups } = await supabase
        .from('ticket_groups')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      setCounts({ myTickets: myTickets || 0, watching: watchingCount, groups: groups || 0 });
    } catch (error) { console.error('Error fetching counts:', error); }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
      toast({ title: 'Logged out successfully' });
    } catch { toast({ title: 'Error logging out', variant: 'destructive' }); }
  };

  const handleWorkTrayNavigate = (view: string) => {
    if (view === 'groups') {
      navigate('/tickets/grouped');
    } else {
      navigate('/tickets');
      setTimeout(() => onViewChange?.(view), 50);
    }
  };

  const roleColor = roleColors[currentUser?.role || ''] || 'bg-muted text-muted-foreground';
  const roleLabel = currentUser?.role
    ?.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'User';

  // ── Collapsed ────────────────────────────────────────────────────────────────
  if (collapsed) {
    return (
      <aside className="h-screen sticky top-0 w-16 border-r border-border bg-sidebar flex-shrink-0 transition-all duration-300">
        <WorkTray
          counts={counts}
          currentUser={currentUser}
          onNavigate={handleWorkTrayNavigate}
          onLogout={handleLogout}
          onExpand={() => setCollapsed(false)}
        />
      </aside>
    );
  }

  // ── Expanded ─────────────────────────────────────────────────────────────────
  return (
    <aside className="h-screen sticky top-0 w-60 border-r border-border bg-sidebar flex flex-col flex-shrink-0 transition-all duration-300">

      {/* Logo + collapse */}
      <div className="flex items-center justify-between px-4 py-4 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-sm flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm text-foreground leading-none">CityTeam CRM</span>
            <span className="text-xs text-muted-foreground">Ticket Management</span>
          </div>
        </div>
        <Button
          variant="ghost" size="icon"
          className="w-8 h-8 flex-shrink-0 hover:bg-primary/10"
          onClick={() => setCollapsed(true)}
        >
          <PanelLeftClose className="w-4 h-4 text-primary" />
        </Button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto scrollbar-thin">
        <SidebarLink to="/tickets" icon={<Inbox className="w-5 h-5" />} label="Tickets" />
        <SidebarLink to="/tickets/grouped" icon={<Layers className="w-5 h-5" />} label="Grouped Issues" />

        <div className="my-3 border-t border-border" />

        <AccordionSection icon={<Megaphone className="w-5 h-5" />} label="Communications">
          <SidebarLink to="/broadcasts" icon={<Megaphone className="w-4 h-4" />} label="Broadcasts" />
          <SidebarLink to="/faqs" icon={<HelpCircle className="w-4 h-4" />} label="FAQs" />
          <SidebarLink to="/canned-messages" icon={<MessageSquare className="w-4 h-4" />} label="Canned Messages" />
        </AccordionSection>

        <AccordionSection icon={<Settings className="w-5 h-5" />} label="Settings">
          <SidebarLink to="/teams" icon={<Users className="w-4 h-4" />} label="Teams" />
          <SidebarLink to="/reports" icon={<BarChart3 className="w-4 h-4" />} label="Reports" />
          <SidebarLink to="/admin/users" icon={<Shield className="w-4 h-4" />} label="User Management" />
          <SidebarLink to="/admin/settings" icon={<Settings className="w-4 h-4" />} label="App Settings" />
          <SidebarLink to="/regions" icon={<MapPin className="w-4 h-4" />} label="Regions" />
          <SidebarLink to="/cities" icon={<Map className="w-4 h-4" />} label="City Mapping" />
        </AccordionSection>
      </nav>

      {/* User + logout */}
      <div className="p-3 border-t border-border flex-shrink-0">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-secondary transition-colors">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-primary/20 flex-shrink-0">
            <span className="text-primary font-semibold text-xs">{getInitials(currentUser?.full_name)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{currentUser?.full_name || 'Loading...'}</p>
            <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium', roleColor)}>{roleLabel}</span>
          </div>
          <Button
            variant="ghost" size="icon"
            className="w-7 h-7 flex-shrink-0 text-muted-foreground hover:text-danger"
            onClick={handleLogout}
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}