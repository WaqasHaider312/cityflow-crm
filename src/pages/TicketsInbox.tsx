import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TicketTable } from '@/components/tickets/TicketTable';
import { TicketFilters } from '@/components/tickets/TicketFilters';
import { BulkActionsBar } from '@/components/tickets/BulkActionsBar';
import { tickets } from '@/lib/mockData';
import { toast } from '@/hooks/use-toast';

type Status = 'All' | 'New' | 'Assigned' | 'In Progress' | 'Pending' | 'Resolved' | 'Closed';
type Priority = 'All' | 'Low' | 'Normal' | 'High' | 'Critical';

export default function TicketsInbox() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<Status>('All');
  const [priority, setPriority] = useState<Priority>('All');
  const [team, setTeam] = useState('All');
  const [city, setCity] = useState('All');
  const [issueType, setIssueType] = useState('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      if (search && !ticket.subject.toLowerCase().includes(search.toLowerCase()) && 
          !ticket.id.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (status !== 'All' && ticket.status !== status) return false;
      if (priority !== 'All' && ticket.priority !== priority) return false;
      if (city !== 'All' && ticket.city !== city) return false;
      if (issueType !== 'All' && ticket.issueType !== issueType) return false;
      return true;
    });
  }, [search, status, priority, team, city, issueType]);

  const clearFilters = () => {
    setStatus('All');
    setPriority('All');
    setTeam('All');
    setCity('All');
    setIssueType('All');
    setSearch('');
  };

  const handleBulkResolve = () => {
    toast({
      title: "Tickets Resolved",
      description: `${selectedIds.length} ticket(s) have been resolved.`,
    });
    setSelectedIds([]);
  };

  const handleBulkReassign = () => {
    toast({
      title: "Reassign Tickets",
      description: "Select a team member to reassign tickets to.",
    });
  };

  const handleBulkEscalate = () => {
    toast({
      title: "Tickets Escalated",
      description: `${selectedIds.length} ticket(s) have been escalated.`,
    });
    setSelectedIds([]);
  };

  const handleBulkGroup = () => {
    toast({
      title: "Add to Group",
      description: "Select a group or create a new one.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
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

      {/* Search and Filters */}
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

      {/* Tickets Table */}
      <TicketTable
        tickets={filteredTickets}
        selectedIds={selectedIds}
        onSelectChange={setSelectedIds}
      />

      {/* Bulk Actions */}
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
