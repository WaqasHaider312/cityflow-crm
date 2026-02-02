import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TicketTable } from '@/components/tickets/TicketTable';
import { TicketFilters } from '@/components/tickets/TicketFilters';
import { BulkActionsBar } from '@/components/tickets/BulkActionsBar';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

// Keep UI Status type
type Status = 'All' | 'New' | 'Assigned' | 'In Progress' | 'Pending' | 'Resolved' | 'Closed';
type Priority = 'All' | 'Low' | 'Normal' | 'High' | 'Critical';

// Map UI to DB values
const statusMap: Record<string, string> = {
  'All': 'All',
  'New': 'new',
  'Assigned': 'assigned',
  'In Progress': 'in_progress',
  'Pending': 'pending',
  'Resolved': 'resolved',
  'Closed': 'closed'
};

const priorityMap: Record<string, string> = {
  'All': 'All',
  'Low': 'low',
  'Normal': 'normal',
  'High': 'high',
  'Critical': 'critical'
};

export default function TicketsInbox() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<Status>('All');
  const [priority, setPriority] = useState<Priority>('All');
  const [team, setTeam] = useState('All');
  const [city, setCity] = useState('All');
  const [issueType, setIssueType] = useState('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    fetchTickets();
  }, [status, priority, city, issueType]);

  const fetchTickets = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('tickets')
        .select(`
          *,
          issue_type:issue_types(id, name, icon),
          assigned_user:profiles!assigned_to(full_name),
          team:teams(name)
        `)
        .order('created_at', { ascending: false });

      // Apply filters with mapped values
      if (status !== 'All') {
        query = query.eq('status', statusMap[status]);
      }
      if (priority !== 'All') {
        query = query.eq('priority', priorityMap[priority]);
      }
      if (city !== 'All') {
        query = query.eq('city', city);
      }

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
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        ticket.subject?.toLowerCase().includes(searchLower) ||
        ticket.ticket_number?.toLowerCase().includes(searchLower) ||
        ticket.supplier_name?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const clearFilters = () => {
    setStatus('All');
    setPriority('All');
    setTeam('All');
    setCity('All');
    setIssueType('All');
    setSearch('');
  };

  const handleBulkResolve = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('tickets')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: user.id
        })
        .in('id', selectedIds);

      if (error) throw error;

      toast({
        title: "Tickets Resolved",
        description: `${selectedIds.length} ticket(s) have been resolved.`,
      });

      setSelectedIds([]);
      fetchTickets();
    } catch (error) {
      console.error('Error resolving tickets:', error);
      toast({ title: "Error resolving tickets", variant: "destructive" });
    }
  };

  const handleBulkReassign = () => {
    toast({
      title: "Reassign Tickets",
      description: "Select a team member to reassign tickets to.",
    });
  };

  const handleBulkEscalate = async () => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({
          is_escalated: true,
          escalated_at: new Date().toISOString()
        })
        .in('id', selectedIds);

      if (error) throw error;

      toast({
        title: "Tickets Escalated",
        description: `${selectedIds.length} ticket(s) have been escalated.`,
      });

      setSelectedIds([]);
      fetchTickets();
    } catch (error) {
      console.error('Error escalating tickets:', error);
      toast({ title: "Error escalating tickets", variant: "destructive" });
    }
  };

  const handleBulkGroup = () => {
    toast({
      title: "Add to Group",
      description: "Select a group or create a new one.",
    });
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
          </p>
        </div>
        <Button onClick={() => navigate('/tickets/create')}>
          <Plus className="w-4 h-4 mr-2" />
          Create Ticket
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
          status={status}
          priority={priority}
          team={team}
          city={city}
          issueType={issueType}
          onStatusChange={setStatus}
          onPriorityChange={setPriority}
          onTeamChange={setTeam}
          onCityChange={setCity}
          onIssueTypeChange={setIssueType}
          onClearAll={clearFilters}
        />
      </div>

      {filteredTickets.length === 0 ? (
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <p className="text-muted-foreground">No tickets found</p>
          <Button variant="outline" className="mt-4" onClick={clearFilters}>
            Clear Filters
          </Button>
        </div>
      ) : (
        <TicketTable
          tickets={filteredTickets}
          selectedIds={selectedIds}
          onSelectChange={setSelectedIds}
        />
      )}

      <BulkActionsBar
        selectedCount={selectedIds.length}
        onClear={() => setSelectedIds([])}
        onResolve={handleBulkResolve}
        onReassign={handleBulkReassign}
        onEscalate={handleBulkEscalate}
        onGroup={handleBulkGroup}
      />
    </div>
  );
}