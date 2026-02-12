import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TicketTable } from '@/components/tickets/TicketTable';
import { TicketFilters } from '@/components/tickets/TicketFilters';
import { BulkActionsBar } from '@/components/tickets/BulkActionsBar';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
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

type Status = 'All' | 'New' | 'Assigned' | 'In Progress' | 'Pending' | 'Resolved' | 'Closed';
type Priority = 'All' | 'Low' | 'Normal' | 'High' | 'Critical';

const statusMap: Record<string, string> = {
  'All': 'All', 'New': 'new', 'Assigned': 'assigned',
  'In Progress': 'in_progress', 'Pending': 'pending',
  'Resolved': 'resolved', 'Closed': 'closed'
};

const priorityMap: Record<string, string> = {
  'All': 'All', 'Low': 'low', 'Normal': 'normal', 'High': 'high', 'Critical': 'critical'
};


export default function TicketsInbox() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [issueTypesList, setIssueTypesList] = useState([]);


  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<Status>('All');
  const [priority, setPriority] = useState<Priority>('All');
  const [team, setTeam] = useState('All');
  const [city, setCity] = useState('All');
  const [issueType, setIssueType] = useState('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Bulk Reassign
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [reassignType, setReassignType] = useState<'team' | 'user' | null>(null);
  const [reassignTargetId, setReassignTargetId] = useState('');

  // Bulk Response
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [responseIsInternal, setResponseIsInternal] = useState(false);
  const [sendingResponse, setSendingResponse] = useState(false);

  // Add to Group
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [groupAction, setGroupAction] = useState<'existing' | 'new' | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [addingToGroup, setAddingToGroup] = useState(false);
  

  useEffect(() => { fetchCurrentUser(); }, []);

  useEffect(() => {
    if (currentUser) { fetchTickets(); fetchTeamsAndUsers(); fetchGroups(); }
  }, [status, priority, city, issueType, currentUser]);

  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setCurrentUser(profile);
    } catch (error) {
      console.error('Error fetching user:', error);
      toast({ title: "Error loading user", variant: "destructive" });
    }
  };

  const fetchTeamsAndUsers = async () => {
    try {
      const { data: teamsData } = await supabase
        .from('teams')
        .select('id, name')
        .eq('is_active', true)
        .order('name');



      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, full_name, team:teams!fk_team(name)')
        .eq('is_active', true)
        .order('full_name');

      const { data: issueTypesData } = await supabase
  .from('issue_types')
  .select('id, name, icon')
  .order('name');

setTeams(teamsData || []);
setUsers(usersData || []);
setIssueTypesList(issueTypesData || []);
    } catch (error) {
      console.error('Error fetching teams/users:', error);
    }
  };

  const fetchGroups = async () => {
    try {
      const { data: groupsData } = await supabase
        .from('ticket_groups')
        .select('id, name, status')
        .neq('status', 'resolved')
        .order('name');
      setGroups(groupsData || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('tickets')
        .select(`
          *,
          issue_type:issue_types(id, name, icon),
          assigned_user:profiles!assigned_to(full_name),
          team:teams!team_id(name),
          region:regions(name)
        `)
        .order('created_at', { ascending: false });

      if (currentUser?.region_id && currentUser?.role !== 'super_admin') {
        query = query.eq('region_id', currentUser.region_id);
      }
      if (status !== 'All') query = query.eq('status', statusMap[status]);
      if (priority !== 'All') query = query.eq('priority', priorityMap[priority]);
      if (city !== 'All') query = query.eq('supplier_city', city);

      const { data, error } = await query;
      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast({ title: "Error loading tickets", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      ticket.subject?.toLowerCase().includes(s) ||
      ticket.ticket_number?.toLowerCase().includes(s) ||
      ticket.supplier_name?.toLowerCase().includes(s)
    );
  });

  const clearFilters = () => {
    setStatus('All'); setPriority('All'); setTeam('All');
    setCity('All'); setIssueType('All'); setSearch('');
  };

  // ── Bulk Resolve ────────────────────────────────────────────────────────────
  const handleBulkResolve = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('tickets')
        .update({ status: 'resolved', resolved_at: new Date().toISOString(), resolved_by: user.id })
        .in('id', selectedIds);

      if (error) throw error;
      toast({ title: "Tickets Resolved", description: `${selectedIds.length} ticket(s) resolved.` });
      setSelectedIds([]);
      fetchTickets();
    } catch (error) {
      toast({ title: "Error resolving tickets", variant: "destructive" });
    }
  };

  // ── Bulk Reassign ───────────────────────────────────────────────────────────
  const handleBulkReassign = async () => {
    if (!reassignTargetId) return;
    try {
      const updateData = reassignType === 'team'
        ? { team_id: reassignTargetId }
        : { assigned_to: reassignTargetId };

      const { error } = await supabase
        .from('tickets')
        .update(updateData)
        .in('id', selectedIds);

      if (error) throw error;
      toast({ title: "Tickets Reassigned", description: `${selectedIds.length} ticket(s) reassigned.` });
      setReassignDialogOpen(false);
      setReassignType(null);
      setReassignTargetId('');
      setSelectedIds([]);
      fetchTickets();
    } catch (error) {
      toast({ title: "Error reassigning tickets", variant: "destructive" });
    }
  };

  // ── Bulk Escalate ───────────────────────────────────────────────────────────
  const handleBulkEscalate = async () => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ is_escalated: true, escalated_at: new Date().toISOString() })
        .in('id', selectedIds);

      if (error) throw error;
      toast({ title: "Tickets Escalated", description: `${selectedIds.length} ticket(s) escalated.` });
      setSelectedIds([]);
      fetchTickets();
    } catch (error) {
      toast({ title: "Error escalating tickets", variant: "destructive" });
    }
  };

  // ── Bulk Response ───────────────────────────────────────────────────────────
  const handleBulkResponse = async () => {
    if (!responseText.trim()) return;
    try {
      setSendingResponse(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const comments = selectedIds.map(ticketId => ({
        ticket_id: ticketId,
        user_id: user.id,
        content: responseText,
        is_internal: responseIsInternal
      }));

      const { error } = await supabase.from('comments').insert(comments);
      if (error) throw error;

      toast({
        title: responseIsInternal ? "Internal Notes Added" : "Replies Sent",
        description: `Message sent to ${selectedIds.length} ticket(s).`
      });
      setResponseDialogOpen(false);
      setResponseText('');
      setResponseIsInternal(false);
      setSelectedIds([]);
    } catch (error) {
      toast({ title: "Error sending response", variant: "destructive" });
    } finally {
      setSendingResponse(false);
    }
  };

  // ── Add to Group ────────────────────────────────────────────────────────────
  const handleAddToGroup = async () => {
    try {
      setAddingToGroup(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let groupId = selectedGroupId;

      // Create new group if needed
      if (groupAction === 'new') {
        if (!newGroupName.trim()) {
          toast({ title: "Group name is required", variant: "destructive" });
          return;
        }
        const { data: newGroup, error: createError } = await supabase
          .from('ticket_groups')
          .insert({ name: newGroupName, status: 'open' })
          .select()
          .single();

        if (createError) throw createError;
        groupId = newGroup.id;
      }

      if (!groupId) return;

      // Update tickets with group id
      const { error } = await supabase
        .from('tickets')
        .update({ ticket_group_id: groupId })
        .in('id', selectedIds);

      if (error) throw error;

      toast({ title: "Added to Group", description: `${selectedIds.length} ticket(s) added to group.` });
      setGroupDialogOpen(false);
      setGroupAction(null);
      setSelectedGroupId('');
      setNewGroupName('');
      setSelectedIds([]);
      fetchTickets();
    } catch (error) {
      toast({ title: "Error adding to group", variant: "destructive" });
    } finally {
      setAddingToGroup(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Tickets</h1>
            <p className="text-muted-foreground mt-1">Loading...</p>
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <p className="text-muted-foreground">Loading tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tickets</h1>
          <p className="text-muted-foreground mt-1">
            {filteredTickets.length} ticket{filteredTickets.length !== 1 ? 's' : ''} found
            {currentUser?.region && currentUser?.role !== 'super_admin' && (
              <> in {currentUser.region.name}</>
            )}
          </p>
        </div>
        <Button onClick={() => navigate('/tickets/create')}>
          <Plus className="w-4 h-4 mr-2" /> Create Ticket
        </Button>
      </div>

      <div className="space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card"
          />
        </div>
        <TicketFilters
  status={status} priority={priority} team={team} city={city} issueType={issueType}
  onStatusChange={setStatus} onPriorityChange={setPriority} onTeamChange={setTeam}
  onCityChange={setCity} onIssueTypeChange={setIssueType} onClearAll={clearFilters}
  teams={teams} issueTypes={issueTypesList}
/>
      </div>

      {filteredTickets.length === 0 ? (
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <p className="text-muted-foreground">No tickets found</p>
          <Button variant="outline" className="mt-4" onClick={clearFilters}>Clear Filters</Button>
        </div>
      ) : (
        <TicketTable tickets={filteredTickets} selectedIds={selectedIds} onSelectChange={setSelectedIds} />
      )}

      <BulkActionsBar
        selectedCount={selectedIds.length}
        onClear={() => setSelectedIds([])}
        onResolve={handleBulkResolve}
        onReassign={() => { setReassignType(null); setReassignTargetId(''); setReassignDialogOpen(true); }}
        onEscalate={handleBulkEscalate}
        onGroup={() => { setGroupAction(null); setGroupDialogOpen(true); }}
        onRespond={() => { setResponseText(''); setResponseIsInternal(false); setResponseDialogOpen(true); }}
      />

      {/* ── Bulk Reassign Dialog ─────────────────────────────────────────────── */}
      <Dialog open={reassignDialogOpen} onOpenChange={(o) => { setReassignDialogOpen(o); if (!o) { setReassignType(null); setReassignTargetId(''); } }}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Reassign {selectedIds.length} Ticket(s)</DialogTitle>
            <DialogDescription>Choose to reassign to a team or a specific user.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Step 1: Team or User */}
            {!reassignType && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setReassignType('team')}
                  className="p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
                >
                  <p className="font-medium text-foreground">Assign to Team</p>
                  <p className="text-xs text-muted-foreground mt-1">Move tickets to a team queue</p>
                </button>
                <button
                  onClick={() => setReassignType('user')}
                  className="p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
                >
                  <p className="font-medium text-foreground">Assign to User</p>
                  <p className="text-xs text-muted-foreground mt-1">Assign to a specific person</p>
                </button>
              </div>
            )}

            {/* Step 2: Select team or user */}
            {reassignType === 'team' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <button onClick={() => { setReassignType(null); setReassignTargetId(''); }} className="text-xs text-muted-foreground hover:text-foreground">← Back</button>
                  <Label>Select Team</Label>
                </div>
                <Select value={reassignTargetId} onValueChange={setReassignTargetId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a team..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {teams.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
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
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name} {u.team?.name ? `(${u.team.name})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkReassign} disabled={!reassignTargetId}>
              Reassign Tickets
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk Response Dialog ─────────────────────────────────────────────── */}
      <Dialog open={responseDialogOpen} onOpenChange={setResponseDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Respond to {selectedIds.length} Ticket(s)</DialogTitle>
            <DialogDescription>Send the same message to all selected tickets.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setResponseIsInternal(false)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${!responseIsInternal ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
              >
                Reply to Supplier
              </button>
              <button
                onClick={() => setResponseIsInternal(true)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${responseIsInternal ? 'bg-warning text-white' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
              >
                Internal Note
              </button>
            </div>

            <Textarea
              placeholder={responseIsInternal ? 'Internal note (only visible to team)...' : 'Reply to all selected tickets...'}
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              rows={4}
            />

            {responseIsInternal && (
              <p className="text-xs text-warning">This note will only be visible to your team, not suppliers.</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResponseDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleBulkResponse}
              disabled={!responseText.trim() || sendingResponse}
              className={responseIsInternal ? 'bg-warning hover:bg-warning/90' : ''}
            >
              {sendingResponse ? 'Sending...' : responseIsInternal ? 'Add Notes' : 'Send Replies'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add to Group Dialog ──────────────────────────────────────────────── */}
      <Dialog open={groupDialogOpen} onOpenChange={(o) => { setGroupDialogOpen(o); if (!o) { setGroupAction(null); setSelectedGroupId(''); setNewGroupName(''); } }}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add {selectedIds.length} Ticket(s) to Group</DialogTitle>
            <DialogDescription>Add to an existing group or create a new one.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {!groupAction && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setGroupAction('existing')}
                  className="p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
                >
                  <p className="font-medium text-foreground">Existing Group</p>
                  <p className="text-xs text-muted-foreground mt-1">Add to an existing group</p>
                </button>
                <button
                  onClick={() => setGroupAction('new')}
                  className="p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
                >
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
                  <SelectTrigger>
                    <SelectValue placeholder="Select a group..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {groups.length === 0 ? (
                      <SelectItem value="none" disabled>No groups available</SelectItem>
                    ) : (
                      groups.map(g => (
                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                      ))
                    )}
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
                <Input
                  placeholder="e.g. Karachi Pickup Issues - Feb"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleAddToGroup}
              disabled={(!selectedGroupId && !newGroupName.trim()) || addingToGroup}
            >
              {addingToGroup ? 'Adding...' : 'Add to Group'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}