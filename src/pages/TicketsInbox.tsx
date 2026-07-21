import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, SlidersHorizontal, Check, Loader2, FileText, MessageSquare, LogOut, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PriorityBadge } from '@/components/common/PriorityBadge';
import { SLATimer } from '@/components/common/SLATimer';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import TicketDetail from './TicketDetail';
import { useNavigate } from 'react-router-dom';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  description?: string;
  status: string;
  priority: string;
  supplier_name?: string;
  supplier_phone?: string;
  supplier_address?: string;
  supplier_order_count?: number;
  city?: string;
  supplier_id?: string;
  issue_type?: { id: string; name: string; icon: string };
  assigned_user?: { full_name: string };
  region?: { name: string };
  sla_due_at?: string;
  sla_status?: string;
  needs_response?: boolean;
  last_supplier_message_at?: string;
  latest_comment_preview?: string;
  is_escalated?: boolean;
  created_at: string;
  updated_at?: string;
  resolved_at?: string;
  assigned_to?: string;
}

type SortType = 'needs-reply' | 'newest' | 'oldest' | 'longest-wait';
type ViewType = 'open' | 'unassigned' | 'mine' | 'all';

const statusMap: Record<string, string> = {
  'All': 'All', 'Pending': 'new', 'In Progress': 'in_progress', 'Resolved': 'resolved'
};

// Shared styling for the compact filter dropdowns
const FILTER_SELECT =
  'w-full min-w-0 text-xs border border-border rounded-lg px-2 py-1.5 bg-card text-foreground focus:border-primary outline-none cursor-pointer truncate';
const FILTER_ACTIVE = 'border-primary/60 bg-primary/5 text-primary font-medium';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getInitials = (name?: string) =>
  (name || 'UN').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

const getSortLabel = (sort: SortType) => ({
  'needs-reply': 'Needs Reply First',
  'newest': 'Newest First',
  'oldest': 'Oldest First',
  'longest-wait': 'Longest Wait',
}[sort]);

const needsReply = (t: Ticket) =>
  t.needs_response === true &&
  t.status !== 'resolved' &&
  t.status !== 'closed';

// ─── Sidebar Views ────────────────────────────────────────────────────────────

const VIEWS: { id: ViewType; label: string }[] = [
  { id: 'open',       label: 'My Open Tickets' },
  { id: 'unassigned', label: 'Unassigned Tickets' },
  { id: 'mine',       label: 'All Assigned Tickets' },
  { id: 'all',        label: 'All Tickets Ever' },
];

// ─── TicketCard ───────────────────────────────────────────────────────────────

function TicketCard({
  ticket, selected, active, onSelect, onClick,
}: {
  ticket: Ticket;
  selected: boolean;
  active: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onClick: (id: string) => void;
}) {
  const unread = needsReply(ticket);

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-all border-b border-border',
        'hover:bg-secondary/40',
        active && 'bg-primary/5 border-l-[3px] border-l-primary',
        unread && !active && 'bg-blue-50/60 dark:bg-blue-950/20',
      )}
      onClick={() => onClick(ticket.id)}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={e => { e.stopPropagation(); onSelect(ticket.id, e.target.checked); }}
        onClick={e => e.stopPropagation()}
        className="mt-1 h-4 w-4 rounded border-border text-primary cursor-pointer flex-shrink-0 accent-primary"
      />

      <div className="flex-1 min-w-0">
        {/* Row 1: ticket number + status */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            {unread && <span className="h-2 w-2 bg-blue-500 rounded-full animate-pulse flex-shrink-0" />}
            <FileText className="h-3.5 w-3.5 text-primary flex-shrink-0" />
            <span className={cn('text-sm text-primary', unread ? 'font-bold' : 'font-semibold')}>
              {ticket.ticket_number}
            </span>
            {ticket.is_escalated && (
              <Badge variant="outline" className="text-[10px] px-1 py-0 bg-destructive/10 text-destructive border-destructive/20">
                Escalated
              </Badge>
            )}
          </div>
          <StatusBadge status={ticket.status as any} />
        </div>

        {/* Row 2: supplier name + agent avatar */}
        <div className="flex items-center justify-between mb-1">
          <p className={cn('text-sm text-foreground truncate max-w-[200px]', unread ? 'font-bold' : 'font-medium')}>
            {ticket.supplier_name || ticket.subject}
          </p>
          {ticket.assigned_user?.full_name ? (
            <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center flex-shrink-0 font-medium">
              {getInitials(ticket.assigned_user.full_name)}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Unassigned</span>
          )}
        </div>

        {/* Row 3: latest message preview */}
        <p className="text-xs text-muted-foreground mb-1.5 leading-relaxed">
          {(ticket.latest_comment_preview || ticket.description || ticket.subject || '').slice(0, 90)}
        </p>

        {/* Row 4: meta + time */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 flex-wrap">
            {ticket.issue_type && (
              <span className="text-xs text-muted-foreground">
                {ticket.issue_type.icon} {ticket.issue_type.name}
              </span>
            )}
            {ticket.region?.name && (
              <span className="text-xs text-muted-foreground">· {ticket.region.name}</span>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(
              new Date(ticket.last_supplier_message_at || ticket.created_at),
              { addSuffix: true }
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Empty Detail Panel ───────────────────────────────────────────────────────

function EmptyDetail({ selectedCount, onSendBulk, onClear }: {
  selectedCount: number; onSendBulk?: () => void; onClear?: () => void;
}) {
  if (selectedCount > 1) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background text-center px-8">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <MessageSquare className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">{selectedCount} tickets selected</h3>
        <p className="text-sm text-muted-foreground mb-6">Send a message to all selected tickets at once</p>
        <div className="flex gap-3">
          <Button onClick={onSendBulk}>Send Bulk Message</Button>
          <Button variant="outline" onClick={onClear}>Clear Selection</Button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-background text-center px-8">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <MessageSquare className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">Select a ticket</h3>
      <p className="text-sm text-muted-foreground">Choose a ticket from the list to view the conversation</p>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TicketsInbox() {
  const navigate = useNavigate();

  // ── Data state ───────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [issueTypesList, setIssueTypesList] = useState<any[]>([]);

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('open');
  const [viewCounts, setViewCounts] = useState<Record<ViewType, number>>({
    open: 0, unassigned: 0, mine: 0, all: 0,
  });

  // ── Filters ──────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [topicFilter, setTopicFilter] = useState('All Topics');
  const [cityFilter, setCityFilter] = useState('All Cities');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState<SortType>('needs-reply');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const [dbSearchResults, setDbSearchResults] = useState<Ticket[]>([]);
  const [isDbSearching, setIsDbSearching] = useState(false);

  // ── Selection ─────────────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // ── Pagination ────────────────────────────────────────────────────────────────
  const [displayCount, setDisplayCount] = useState(20);
  const [autoLoadCount, setAutoLoadCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Bulk reply dialog ─────────────────────────────────────────────────────────
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [responseIsInternal, setResponseIsInternal] = useState(false);
  const [sendingResponse, setSendingResponse] = useState(false);

  // ── Init ──────────────────────────────────────────────────────────────────────
  useEffect(() => { fetchCurrentUser(); }, []);

  useEffect(() => {
    if (!currentUser) return;
    const channel = supabase
      .channel('tickets-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
        fetchTickets();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser, currentView]);

  useEffect(() => {
    if (currentUser) {
      fetchTickets();
      fetchIssueTypes();
    }
  }, [currentUser, currentView, statusFilter, topicFilter]);

  useEffect(() => {
    setDisplayCount(20);
    setAutoLoadCount(0);
  }, [currentView, topicFilter, cityFilter, statusFilter, search, sortBy]);

  // ── Scroll auto-load ──────────────────────────────────────────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (
        scrollHeight - scrollTop - clientHeight < 120 &&
        autoLoadCount < 2 &&
        displayCount < filteredTickets.length
      ) {
        setDisplayCount(p => p + 20);
        setAutoLoadCount(p => p + 1);
      }
    };
    el.addEventListener('scroll', handler);
    return () => el.removeEventListener('scroll', handler);
  }, [displayCount, autoLoadCount]);

  // ── Fetch current user ────────────────────────────────────────────────────────
  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setCurrentUser(profile);
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  // ── Region scoping: non-super-admins only see their own region ────────────────
  const scopeToRegion = (q: any) =>
    currentUser?.region_id && currentUser?.role !== 'super_admin'
      ? q.eq('region_id', currentUser.region_id)
      : q;

  // ── Apply a view's filter to a query ──────────────────────────────────────────
  const applyView = (q: any, view: ViewType) => {
    if (view === 'open') {
      return q.eq('assigned_to', currentUser.id).not('status', 'in', '(resolved,closed)');
    }
    if (view === 'unassigned') {
      return q.is('assigned_to', null).not('status', 'in', '(resolved,closed)');
    }
    if (view === 'mine') {
      return q.not('assigned_to', 'is', null).not('status', 'in', '(resolved,closed)');
    }
    return q; // 'all' — no filter
  };

  // ── Fetch tickets ─────────────────────────────────────────────────────────────
  const fetchTickets = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);

      let query = supabase
        .from('tickets')
        .select(`
          *,
          issue_type:issue_types(id, name, icon),
          assigned_user:profiles!assigned_to(full_name),
          region:regions(name)
        `)
        .order('needs_response', { ascending: false })
        .order('created_at', { ascending: false });

      query = applyView(scopeToRegion(query), currentView);
      if (statusFilter !== 'All') query = query.eq('status', statusMap[statusFilter]);

      const { data, error } = await query;
      if (error) throw error;

      setTickets(data || []);
      fetchViewCounts();
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast({ title: 'Error loading tickets', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // ── View counts: one head-only count query per view ───────────────────────────
  const fetchViewCounts = async () => {
    if (!currentUser) return;
    try {
      const counts = await Promise.all(
        VIEWS.map(async v => {
          const base = supabase.from('tickets').select('*', { count: 'exact', head: true });
          const { count } = await applyView(scopeToRegion(base), v.id);
          return [v.id, count || 0] as const;
        })
      );
      setViewCounts(Object.fromEntries(counts) as Record<ViewType, number>);
    } catch (error) {
      console.error('Error fetching view counts:', error);
    }
  };

  const fetchIssueTypes = async () => {
    try {
      const { data } = await supabase.from('issue_types').select('id, name, icon').order('name');
      setIssueTypesList(data || []);
    } catch (error) {
      console.error('Error fetching issue types:', error);
    }
  };

  // ── DB Search ─────────────────────────────────────────────────────────────────
  const searchDatabase = useCallback(async (query: string) => {
    if (!query.trim()) { setDbSearchResults([]); setIsDbSearching(false); return; }
    setIsDbSearching(true);
    try {
      const { data } = await supabase
        .from('tickets')
        .select(`*, issue_type:issue_types(id, name, icon), assigned_user:profiles!assigned_to(full_name), region:regions(name)`)
        .or(`ticket_number.ilike.%${query}%,supplier_name.ilike.%${query}%,subject.ilike.%${query}%,supplier_phone.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(100);
      setDbSearchResults(data || []);
    } catch { setDbSearchResults([]); }
    finally { setIsDbSearching(false); }
  }, []);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => searchDatabase(value), 400);
  };

  // ── City filter options — derived from the tickets actually loaded ────────────
  // (tickets carry a free-text `city`, so every option here is guaranteed to
  //  match real tickets, unlike pulling from a separate cities table.)
  const cityOptions = (() => {
    const base = search.trim() ? dbSearchResults : tickets;
    const set = new Set<string>();
    base.forEach(t => { const c = (t.city || '').trim(); if (c) set.add(c); });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  })();

  const filtersActive =
    topicFilter !== 'All Topics' || cityFilter !== 'All Cities' || statusFilter !== 'All';

  const clearFilters = () => {
    setTopicFilter('All Topics');
    setCityFilter('All Cities');
    setStatusFilter('All');
    setSearch('');
    setDbSearchResults([]);
  };

  // ── Filter + sort ─────────────────────────────────────────────────────────────
  const filteredTickets = (() => {
    let list = search.trim() ? [...dbSearchResults] : [...tickets];

    // Topic / city / status apply whether or not we're searching, so the two
    // never silently disagree.
    if (topicFilter !== 'All Topics') list = list.filter(t => t.issue_type?.name === topicFilter);
    if (cityFilter !== 'All Cities') list = list.filter(t => (t.city || '').trim() === cityFilter);
    if (statusFilter !== 'All') list = list.filter(t => t.status === statusMap[statusFilter]);

    const sortFn = (arr: Ticket[]) => {
      if (sortBy === 'oldest' || sortBy === 'longest-wait')
        return arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      return arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    };

    if (sortBy === 'needs-reply') {
      const nr = list.filter(t => needsReply(t));
      const rest = list.filter(t => !needsReply(t));
      return [...sortFn(nr), ...sortFn(rest)];
    }
    return sortFn(list);
  })();

  const displayedTickets = filteredTickets.slice(0, displayCount);
  const hasMore = displayCount < filteredTickets.length;

  // ── Selection ─────────────────────────────────────────────────────────────────
  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(sid => sid !== id));
  };

  const handleSelectBatch = (count: number) => {
    if (count === 0) { setSelectedIds([]); return; }
    if (count === -1) { setSelectedIds(filteredTickets.map(t => t.id)); return; }
    setSelectedIds(filteredTickets.slice(0, count).map(t => t.id));
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
      toast({ title: 'Logged out successfully' });
    } catch { toast({ title: 'Error logging out', variant: 'destructive' }); }
  };

  // ── Bulk actions ──────────────────────────────────────────────────────────────
  const handleBulkResponse = async () => {
    if (!responseText.trim()) return;
    try {
      setSendingResponse(true);
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('comments').insert(
        selectedIds.map(ticketId => ({
          ticket_id: ticketId, user_id: user?.id, content: responseText,
          is_internal: responseIsInternal, comment_source: 'agent'
        }))
      );
      toast({ title: responseIsInternal ? 'Internal notes added' : 'Replies sent' });
      setResponseDialogOpen(false); setResponseText(''); setResponseIsInternal(false); setSelectedIds([]);
    } catch { toast({ title: 'Error sending response', variant: 'destructive' }); }
    finally { setSendingResponse(false); }
  };

  // ── Render ticket list ────────────────────────────────────────────────────────
  const renderTicketList = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (filteredTickets.length === 0) {
      const hasQuery = filtersActive || !!search.trim();
      return (
        <div className="flex flex-col items-center justify-center h-48 text-center px-6">
          <FileText className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="font-medium text-foreground">
            {hasQuery
              ? 'No tickets match your filters'
              : currentView === 'unassigned'
                ? 'Nothing waiting to be picked up'
                : 'No tickets found'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {hasQuery
              ? 'Try widening your search or clearing filters'
              : currentView === 'unassigned'
                ? 'New tickets with no owner will appear here'
                : 'Tickets in this view will appear here'}
          </p>
          {hasQuery && (
            <button onClick={clearFilters} className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline">
              <X className="h-3.5 w-3.5" /> Clear filters
            </button>
          )}
        </div>
      );
    }

    return (
      <>
        {displayedTickets.map(ticket => (
          <TicketCard
            key={ticket.id}
            ticket={ticket}
            selected={selectedIds.includes(ticket.id)}
            active={selectedTicketId === ticket.id}
            onSelect={handleSelectOne}
            onClick={id => setSelectedTicketId(id)}
          />
        ))}
        {hasMore && autoLoadCount < 2 && (
          <div className="py-4 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {hasMore && autoLoadCount >= 2 && (
          <div className="py-4 flex justify-center">
            <button onClick={() => setDisplayCount(p => p + 20)} className="text-sm text-primary hover:underline">
              Load 20 more ({filteredTickets.length - displayCount} remaining)
            </button>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">

      {/* ── Panel 1: Views Sidebar ─────────────────────────────────────────── */}
      <div className="w-56 flex-shrink-0 border-r border-border bg-sidebar flex flex-col">
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-sm flex-shrink-0">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-sm text-foreground leading-none">CityTeam</span>
            <span className="text-xs text-muted-foreground">Tickets</span>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {VIEWS.map(view => (
            <button
              key={view.id}
              onClick={() => { setCurrentView(view.id); setSelectedTicketId(null); clearFilters(); }}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all',
                currentView === view.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
            >
              <span className="text-left">{view.label}</span>
              {viewCounts[view.id] > 0 && (
                <span className={cn(
                  'px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0',
                  currentView === view.id
                    ? 'bg-primary/20 text-primary'
                    : view.id === 'unassigned'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-secondary text-muted-foreground'
                )}>
                  {viewCounts[view.id]}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Current user + logout */}
        <div className="p-3 border-t border-border flex-shrink-0">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-secondary transition-colors">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-primary/20 flex-shrink-0">
              <span className="text-primary font-semibold text-xs">
                {getInitials(currentUser?.full_name)}
              </span>
            </div>
            <p className="flex-1 min-w-0 text-sm font-medium text-foreground truncate">
              {currentUser?.full_name || 'Loading...'}
            </p>
            <Button
              variant="ghost" size="icon"
              className="w-7 h-7 flex-shrink-0 text-muted-foreground hover:text-destructive"
              onClick={handleLogout}
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Panel 2: Ticket List ───────────────────────────────────────────── */}
      <div className="w-[360px] flex-shrink-0 border-r border-border flex flex-col bg-background">
        {/* List Header */}
        <div className="p-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-lg font-bold text-foreground truncate">
                {VIEWS.find(v => v.id === currentView)?.label ?? 'Tickets'}
              </h2>
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-secondary text-muted-foreground flex-shrink-0">
                {isDbSearching ? '…' : filteredTickets.length}
              </span>
            </div>
            {/* Sort */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs text-muted-foreground">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  {getSortLabel(sortBy)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-popover">
                {(['needs-reply', 'newest', 'oldest', 'longest-wait'] as SortType[]).map(s => (
                  <DropdownMenuItem key={s} onClick={() => setSortBy(s)} className="flex items-center justify-between cursor-pointer">
                    <span>{getSortLabel(s)}</span>
                    {sortBy === s && <Check className="h-4 w-4" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Search */}
          <div className="relative mb-2.5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              ref={searchInputRef}
              placeholder="Search number, supplier, subject, phone…"
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              className="pl-9 bg-card h-9"
            />
          </div>

          {/* Filters: Issue Type · City · Status */}
          <div className="grid grid-cols-3 gap-2">
            <select
              value={topicFilter}
              onChange={e => setTopicFilter(e.target.value)}
              title="Filter by issue type"
              className={cn(FILTER_SELECT, topicFilter !== 'All Topics' && FILTER_ACTIVE)}
            >
              <option value="All Topics">All Issues</option>
              {issueTypesList.map(t => <option key={t.id} value={t.name}>{t.icon} {t.name}</option>)}
            </select>
            <select
              value={cityFilter}
              onChange={e => setCityFilter(e.target.value)}
              title="Filter by city"
              className={cn(FILTER_SELECT, cityFilter !== 'All Cities' && FILTER_ACTIVE)}
            >
              <option value="All Cities">All Cities</option>
              {cityOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              title="Filter by status"
              className={cn(FILTER_SELECT, statusFilter !== 'All' && FILTER_ACTIVE)}
            >
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          {(filtersActive || search.trim()) && (
            <button
              onClick={clearFilters}
              className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <X className="h-3 w-3" /> Clear filters
            </button>
          )}

          {/* Bulk select */}
          <div className="space-y-2 pt-2 border-t border-border">
            <select
              onChange={e => { handleSelectBatch(parseInt(e.target.value)); e.target.value = '0'; }}
              className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-card text-foreground focus:border-primary outline-none"
            >
              <option value="0">Select Tickets...</option>
              <option value="0">Deselect All</option>
              <option value="20">Select 20</option>
              <option value="50">Select 50</option>
              <option value="-1">Select All ({filteredTickets.length})</option>
            </select>
            {selectedIds.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {selectedIds.length} ticket{selectedIds.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>
        </div>

        {/* List */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {renderTicketList()}
        </div>
      </div>

      {/* ── Panel 3: Ticket Detail ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedTicketId ? (
          <TicketDetail
            ticketId={selectedTicketId}
            onClose={() => setSelectedTicketId(null)}
            onRefresh={fetchTickets}
            embedded
          />
        ) : (
          <EmptyDetail
            selectedCount={selectedIds.length}
            onSendBulk={() => { setResponseText(''); setResponseIsInternal(false); setResponseDialogOpen(true); }}
            onClear={() => setSelectedIds([])}
          />
        )}
      </div>

      {/* ── Bulk Response Dialog ───────────────────────────────────────────── */}
      <Dialog open={responseDialogOpen} onOpenChange={setResponseDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Respond to {selectedIds.length} Ticket(s)</DialogTitle>
            <DialogDescription>Send the same message to all selected tickets.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2">
              <button onClick={() => setResponseIsInternal(false)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${!responseIsInternal ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
                Reply to Supplier
              </button>
              <button onClick={() => setResponseIsInternal(true)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${responseIsInternal ? 'bg-warning text-white' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
                Internal Note
              </button>
            </div>
            <Textarea
              placeholder={responseIsInternal ? 'Internal note (only visible to team)...' : 'Reply to all selected tickets...'}
              value={responseText}
              onChange={e => setResponseText(e.target.value)}
              rows={4}
            />
            {responseIsInternal && <p className="text-xs text-warning">Only visible to your team, not suppliers.</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResponseDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkResponse} disabled={!responseText.trim() || sendingResponse} className={responseIsInternal ? 'bg-warning hover:bg-warning/90' : ''}>
              {sendingResponse ? 'Sending...' : responseIsInternal ? 'Add Notes' : 'Send Replies'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}