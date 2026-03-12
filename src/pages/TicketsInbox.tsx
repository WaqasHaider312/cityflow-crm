import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, SlidersHorizontal, Check, Loader2, FileText,
 ChevronRight, MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PriorityBadge } from '@/components/common/PriorityBadge';
import { SLATimer } from '@/components/common/SLATimer';
import { BulkActionsBar } from '@/components/tickets/BulkActionsBar';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import TicketDetail from './TicketDetail';
import { useOutletContext } from 'react-router-dom';

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
  created_at: string;
  updated_at?: string;
}

type SortType = 'needs-reply' | 'newest' | 'oldest' | 'longest-wait';
type ViewType = 'all' | 'open' | 'mine' | 'unassigned' | 'resolved';

const statusMap: Record<string, string> = {
  'All': 'All', 'New': 'new', 'In Progress': 'in_progress',
  'Pending': 'pending', 'Resolved': 'resolved', 'Closed': 'closed'
};


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
  { id: 'open', label: 'My Open Tickets' },
  { id: 'unassigned', label: 'Unassigned Tickets' },
  { id: 'mine', label: 'All Assigned' },
  { id: 'resolved', label: 'Resolved Today' },
  { id: 'all', label: 'All Tickets Ever' },
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
  {(ticket.latest_comment_preview || ticket.description || ticket.subject || '').slice(0, 60)}
</p>

        {/* Row 4: meta + SLA + time */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 flex-wrap">
            {ticket.issue_type && (
              <span className="text-xs text-muted-foreground">
                {ticket.issue_type.icon} {ticket.issue_type.name}
              </span>
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

function EmptyDetail() {
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
  const [selectedView, setSelectedView] = useState('my_open');
  const context = useOutletContext<any>();
  const activeView = context?.activeView;
  const setActiveView = context?.setActiveView;

  // ── Data state ──────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [issueTypesList, setIssueTypesList] = useState<any[]>([]);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('open');
  const [viewCounts, setViewCounts] = useState<Record<ViewType, number>>({
    open: 0, unassigned: 0, mine: 0, resolved: 0, all: 0,
  });

  // ── Filters ─────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [topicFilter, setTopicFilter] = useState('All Topics');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState<SortType>('needs-reply');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const [dbSearchResults, setDbSearchResults] = useState<Ticket[]>([]);
  const [isDbSearching, setIsDbSearching] = useState(false);

  // ── Selection ────────────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // ── Pagination ───────────────────────────────────────────────────────────────
  const [displayCount, setDisplayCount] = useState(20);
  const [autoLoadCount, setAutoLoadCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Bulk dialogs ─────────────────────────────────────────────────────────────
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [reassignType, setReassignType] = useState<'team' | 'user' | null>(null);
  const [reassignTargetId, setReassignTargetId] = useState('');
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [responseIsInternal, setResponseIsInternal] = useState(false);
  const [sendingResponse, setSendingResponse] = useState(false);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [groupAction, setGroupAction] = useState<'existing' | 'new' | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [addingToGroup, setAddingToGroup] = useState(false);

  // ── Init ─────────────────────────────────────────────────────────────────────
  useEffect(() => { fetchCurrentUser(); }, []);
  useEffect(() => {
    if (currentUser) { fetchTickets(); fetchTeamsAndUsers(); fetchGroups(); }
  }, [currentUser, currentView, statusFilter, topicFilter]);

  useEffect(() => { setDisplayCount(20); setAutoLoadCount(0); }, [currentView, topicFilter, statusFilter, search, sortBy]);
useEffect(() => {
    if (activeView) setSelectedView(activeView);
  }, [activeView]);
  // ── Scroll auto-load ──────────────────────────────────────────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (scrollHeight - scrollTop - clientHeight < 120 && autoLoadCount < 2 && displayCount < filteredTickets.length) {
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

  // ── Fetch tickets ─────────────────────────────────────────────────────────────
  const fetchTickets = async () => {
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

      if (currentUser?.region_id && currentUser?.role !== 'super_admin') {
        query = query.eq('region_id', currentUser.region_id);
      }

      // View filters
      if (currentView === 'open') {
        query = query.eq('assigned_to', currentUser.id).not('status', 'in', '(resolved,closed)');
      } else if (currentView === 'unassigned') {
        query = query.is('assigned_to', null).not('status', 'in', '(resolved,closed)');
      } else if (currentView === 'mine') {
        query = query.not('status', 'in', '(resolved,closed)').not('assigned_to', 'is', null);
      } else if (currentView === 'resolved') {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        query = query.eq('status', 'resolved').gte('resolved_at', today.toISOString());
      }

      if (statusFilter !== 'All') query = query.eq('status', statusMap[statusFilter]);

      const { data, error } = await query;
      if (error) throw error;
      setTickets(data || []);

      // Compute view counts
      const all = data || [];
      const today = new Date(); today.setHours(0, 0, 0, 0);
      setViewCounts({
        open: all.filter(t => t.assigned_to === currentUser?.id && !['resolved', 'closed'].includes(t.status)).length,
        unassigned: all.filter(t => !t.assigned_to && !['resolved', 'closed'].includes(t.status)).length,
        mine: all.filter(t => t.assigned_to && !['resolved', 'closed'].includes(t.status)).length,
        resolved: all.filter(t => t.status === 'resolved' && new Date(t.resolved_at) >= today).length,
        all: all.length,
      });
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast({ title: 'Error loading tickets', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamsAndUsers = async () => {
    try {
      const [{ data: teamsData }, { data: usersData }, { data: issueTypesData }] = await Promise.all([
        supabase.from('teams').select('id, name').eq('is_active', true).order('name'),
        supabase.from('profiles').select('id, full_name, team:teams!fk_team(name)').eq('is_active', true).order('full_name'),
        supabase.from('issue_types').select('id, name, icon').order('name'),
      ]);
      setTeams(teamsData || []);
      setUsers(usersData || []);
      setIssueTypesList(issueTypesData || []);
    } catch (error) {
      console.error('Error fetching teams/users:', error);
    }
  };

  const fetchGroups = async () => {
    try {
      const { data } = await supabase.from('ticket_groups').select('id, name, status').neq('status', 'resolved').order('name');
      setGroups(data || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
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

  // ── Filter + sort ─────────────────────────────────────────────────────────────
  const filteredTickets = (() => {
    let list = search.trim() ? dbSearchResults : [...tickets];

    if (!search.trim() && topicFilter !== 'All Topics') {
      list = list.filter(t => t.issue_type?.name === topicFilter);
    }

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

  // ── Bulk actions ──────────────────────────────────────────────────────────────
  const handleBulkResolve = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('tickets').update({ status: 'resolved', resolved_at: new Date().toISOString(), resolved_by: user?.id }).in('id', selectedIds);
      toast({ title: `${selectedIds.length} ticket(s) resolved` });
      setSelectedIds([]);
      fetchTickets();
    } catch { toast({ title: 'Error resolving tickets', variant: 'destructive' }); }
  };

  const handleBulkReassign = async () => {
    if (!reassignTargetId) return;
    try {
      const updateData = reassignType === 'team' ? { team_id: reassignTargetId } : { assigned_to: reassignTargetId };
      await supabase.from('tickets').update(updateData).in('id', selectedIds);
      toast({ title: `${selectedIds.length} ticket(s) reassigned` });
      setReassignDialogOpen(false); setReassignType(null); setReassignTargetId(''); setSelectedIds([]);
      fetchTickets();
    } catch { toast({ title: 'Error reassigning', variant: 'destructive' }); }
  };

  const handleBulkEscalate = async () => {
    try {
      await supabase.from('tickets').update({ is_escalated: true, escalated_at: new Date().toISOString() }).in('id', selectedIds);
      toast({ title: `${selectedIds.length} ticket(s) escalated` });
      setSelectedIds([]);
      fetchTickets();
    } catch { toast({ title: 'Error escalating', variant: 'destructive' }); }
  };

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

  const handleAddToGroup = async () => {
    try {
      setAddingToGroup(true);
      let groupId = selectedGroupId;
      if (groupAction === 'new') {
        if (!newGroupName.trim()) { toast({ title: 'Group name required', variant: 'destructive' }); return; }
        const { data: newGroup } = await supabase.from('ticket_groups').insert({ name: newGroupName, status: 'open' }).select().single();
        groupId = newGroup.id;
      }
      if (!groupId) return;
      await supabase.from('tickets').update({ ticket_group_id: groupId }).in('id', selectedIds);
      toast({ title: `${selectedIds.length} ticket(s) added to group` });
      setGroupDialogOpen(false); setGroupAction(null); setSelectedGroupId(''); setNewGroupName(''); setSelectedIds([]);
      fetchTickets();
    } catch { toast({ title: 'Error adding to group', variant: 'destructive' }); }
    finally { setAddingToGroup(false); }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">

      {/* ── Panel 1: Views Sidebar ─────────────────────────────────────────── */}
      <div className="w-56 flex-shrink-0 border-r border-border bg-sidebar flex flex-col">
        <div className="p-4 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Views</p>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {VIEWS.map(view => (
            <button
              key={view.id}
              onClick={() => { setCurrentView(view.id); setSelectedTicketId(null); }}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all',
                currentView === view.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
            >
              <span>{view.label}</span>
              {viewCounts[view.id] > 0 && (
                <span className={cn(
                  'px-2 py-0.5 text-xs font-medium rounded-full',
                  currentView === view.id ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'
                )}>
                  {viewCounts[view.id]}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Panel 2: Ticket List ───────────────────────────────────────────── */}
      <div className="w-[360px] flex-shrink-0 border-r border-border flex flex-col bg-background">
        {/* List Header */}
        <div className="p-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-foreground">Tickets</h2>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8"
                onClick={() => { setSearchOpen(p => !p); setTimeout(() => searchInputRef.current?.focus(), 100); }}>
                <Search className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <SlidersHorizontal className="h-4 w-4" />
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
          </div>

          {searchOpen && (
            <Input
              ref={searchInputRef}
              placeholder="Search tickets..."
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              className="mb-3 bg-card h-9"
            />
          )}

          <div className="flex gap-2 mb-3">
            <select
              value={topicFilter}
              onChange={e => setTopicFilter(e.target.value)}
              className="flex-1 text-xs border border-border rounded-lg px-2 py-1.5 bg-card text-foreground focus:border-primary outline-none"
            >
              <option>All Topics</option>
              {issueTypesList.map(t => <option key={t.id} value={t.name}>{t.icon} {t.name}</option>)}
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="flex-1 text-xs border border-border rounded-lg px-2 py-1.5 bg-card text-foreground focus:border-primary outline-none"
            >
              <option>All</option>
              <option>New</option>
              <option>In Progress</option>
              <option>Pending</option>
              <option>Resolved</option>
              <option>Closed</option>
            </select>
          </div>

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
              <p className="text-xs text-muted-foreground">{selectedIds.length} ticket{selectedIds.length !== 1 ? 's' : ''} selected</p>
            )}
          </div>

          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-muted-foreground">Sorted by: {getSortLabel(sortBy)}</p>
            <p className="text-xs text-muted-foreground">
              {isDbSearching ? 'Searching...' : `${displayedTickets.length} of ${filteredTickets.length}`}
            </p>
          </div>
        </div>

        {/* List */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center px-6">
              <FileText className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="font-medium text-foreground">No tickets found</p>
              <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters</p>
            </div>
          ) : (
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
          )}
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
          <EmptyDetail />
        )}
      </div>

      {/* ── Bulk Actions Bar ───────────────────────────────────────────────── */}
      <BulkActionsBar
        selectedCount={selectedIds.length}
        onClear={() => setSelectedIds([])}
        onResolve={handleBulkResolve}
        onReassign={() => { setReassignType(null); setReassignTargetId(''); setReassignDialogOpen(true); }}
        onEscalate={handleBulkEscalate}
        onGroup={() => { setGroupAction(null); setGroupDialogOpen(true); }}
        onRespond={() => { setResponseText(''); setResponseIsInternal(false); setResponseDialogOpen(true); }}
      />

      {/* ── Bulk Reassign Dialog ───────────────────────────────────────────── */}
      <Dialog open={reassignDialogOpen} onOpenChange={o => { setReassignDialogOpen(o); if (!o) { setReassignType(null); setReassignTargetId(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reassign {selectedIds.length} Ticket(s)</DialogTitle>
            <DialogDescription>Choose to reassign to a team or a specific user.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!reassignType && (
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setReassignType('team')} className="p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all text-left">
                  <p className="font-medium text-foreground">Assign to Team</p>
                  <p className="text-xs text-muted-foreground mt-1">Move to a team queue</p>
                </button>
                <button onClick={() => setReassignType('user')} className="p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all text-left">
                  <p className="font-medium text-foreground">Assign to User</p>
                  <p className="text-xs text-muted-foreground mt-1">Assign to a specific person</p>
                </button>
              </div>
            )}
            {reassignType === 'team' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <button onClick={() => { setReassignType(null); setReassignTargetId(''); }} className="text-xs text-muted-foreground hover:text-foreground">← Back</button>
                  <Label>Select Team</Label>
                </div>
                <Select value={reassignTargetId} onValueChange={setReassignTargetId}>
                  <SelectTrigger><SelectValue placeholder="Select a team..." /></SelectTrigger>
                  <SelectContent className="bg-popover">
                    {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {reassignType === 'user' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <button onClick={() => { setReassignType(null); setReassignTargetId(''); }} className="text-xs text-muted-foreground hover:text-foreground">← Back</button>
                  <Label>Select User</Label>
                </div>
                <Select value={reassignTargetId} onValueChange={setReassignTargetId}>
                  <SelectTrigger><SelectValue placeholder="Select a user..." /></SelectTrigger>
                  <SelectContent className="bg-popover">
                    {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}{u.team?.name ? ` (${u.team.name})` : ''}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkReassign} disabled={!reassignTargetId}>Reassign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* ── Add to Group Dialog ────────────────────────────────────────────── */}
      <Dialog open={groupDialogOpen} onOpenChange={o => { setGroupDialogOpen(o); if (!o) { setGroupAction(null); setSelectedGroupId(''); setNewGroupName(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add {selectedIds.length} Ticket(s) to Group</DialogTitle>
            <DialogDescription>Add to an existing group or create a new one.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!groupAction && (
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setGroupAction('existing')} className="p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all text-left">
                  <p className="font-medium text-foreground">Existing Group</p>
                  <p className="text-xs text-muted-foreground mt-1">Add to an existing group</p>
                </button>
                <button onClick={() => setGroupAction('new')} className="p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all text-left">
                  <p className="font-medium text-foreground">New Group</p>
                  <p className="text-xs text-muted-foreground mt-1">Create a new group</p>
                </button>
              </div>
            )}
            {groupAction === 'existing' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <button onClick={() => { setGroupAction(null); setSelectedGroupId(''); }} className="text-xs text-muted-foreground hover:text-foreground">← Back</button>
                  <Label>Select Group</Label>
                </div>
                <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                  <SelectTrigger><SelectValue placeholder="Select a group..." /></SelectTrigger>
                  <SelectContent className="bg-popover">
                    {groups.length === 0
                      ? <SelectItem value="none" disabled>No groups available</SelectItem>
                      : groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)
                    }
                  </SelectContent>
                </Select>
              </div>
            )}
            {groupAction === 'new' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <button onClick={() => { setGroupAction(null); setNewGroupName(''); }} className="text-xs text-muted-foreground hover:text-foreground">← Back</button>
                  <Label>Group Name</Label>
                </div>
                <Input placeholder="e.g. Karachi Pickup Issues - Feb" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddToGroup} disabled={(!selectedGroupId && !newGroupName.trim()) || addingToGroup}>
              {addingToGroup ? 'Adding...' : 'Add to Group'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}