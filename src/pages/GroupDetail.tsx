import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Users, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { TicketCard } from '@/components/tickets/TicketCard';
import { SLATimer } from '@/components/common/SLATimer';
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

export default function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  
  const [group, setGroup] = useState(null);
  const [groupTickets, setGroupTickets] = useState([]);
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [resolutionNote, setResolutionNote] = useState('');
  const [notifySupplier, setNotifySupplier] = useState(true);
  const [closeTickets, setCloseTickets] = useState(false);

  // Fetch group and tickets
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch group
        const { data: groupData, error: groupError } = await supabase
          .from('ticket_groups')
          .select(`
            *,
            issue_type:issue_types(name, icon),
            assigned_user:profiles!assigned_to(full_name)
          `)
          .eq('id', id)
          .single();

        if (groupError) throw groupError;

        // Fetch tickets in this group
        const { data: ticketsData, error: ticketsError } = await supabase
          .from('tickets')
          .select(`
            *,
            issue_type:issue_types(name, icon),
            assigned_user:profiles!assigned_to(full_name),
            team:teams(name)
          `)
          .eq('ticket_group_id', id)
          .order('created_at', { ascending: false });

        if (ticketsError) throw ticketsError;

        setGroup(groupData);
        setGroupTickets(ticketsData || []);
      } catch (error) {
        console.error('Error fetching group:', error);
        toast({ title: "Error loading group", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchData();
  }, [id]);

  // Calculate SLA status
  const calculateSLAStatus = () => {
    if (!group?.sla_due_at) return 'on-track';
    
    const now = new Date();
    const dueAt = new Date(group.sla_due_at);
    const timeRemaining = dueAt.getTime() - now.getTime();
    const hoursRemaining = timeRemaining / (1000 * 60 * 60);

    if (timeRemaining < 0) return 'breached';
    if (hoursRemaining <= 2) return 'warning';
    return 'on-track';
  };

  // Format SLA remaining time
  const formatSLARemaining = () => {
    if (!group?.sla_due_at) return '0h';
    
    const now = new Date();
    const dueAt = new Date(group.sla_due_at);
    const timeRemaining = dueAt.getTime() - now.getTime();
    const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
    const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

    if (timeRemaining < 0) {
      return `-${Math.abs(hoursRemaining)}h`;
    }
    return `${hoursRemaining}h ${minutesRemaining}m`;
  };

  const handleSelectAll = () => {
    if (selectedIds.length === groupTickets.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(groupTickets.map((t) => t.id));
    }
  };

  const handleSelect = (id: string, selected: boolean) => {
    if (selected) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter((sid) => sid !== id));
    }
  };

  const handleBulkResolve = async () => {
    try {
      setResolving(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update all selected tickets
      const updates = {
        status: closeTickets ? 'closed' : 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
        resolution_note: resolutionNote,
        ...(closeTickets && {
          closed_at: new Date().toISOString(),
          closed_by: user.id
        })
      };

      const { error: updateError } = await supabase
        .from('tickets')
        .update(updates)
        .in('id', selectedIds);

      if (updateError) throw updateError;

      // Create bulk resolution record
      const { error: bulkError } = await supabase
        .from('bulk_resolutions')
        .insert({
          ticket_group_id: id,
          resolved_by: user.id,
          resolution_note: resolutionNote,
          ticket_ids: selectedIds
        });

      if (bulkError) console.error('Error creating bulk resolution record:', bulkError);

      // TODO: Send notifications if notifySupplier is true

      toast({
        title: "Tickets Resolved",
        description: `${selectedIds.length} ticket(s) have been resolved with your note.`,
      });

      // Refresh data
      const { data: ticketsData } = await supabase
        .from('tickets')
        .select(`
          *,
          issue_type:issue_types(name, icon),
          assigned_user:profiles!assigned_to(full_name),
          team:teams(name)
        `)
        .eq('ticket_group_id', id)
        .order('created_at', { ascending: false });

      setGroupTickets(ticketsData || []);
      setResolveDialogOpen(false);
      setSelectedIds([]);
      setResolutionNote('');
    } catch (error) {
      console.error('Error resolving tickets:', error);
      toast({ 
        title: "Error resolving tickets", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setResolving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Group not found</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/tickets/grouped')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Groups
        </Button>
      </div>
    );
  }

  const slaStatus = calculateSLAStatus();
  const slaRemaining = formatSLARemaining();

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate('/tickets/grouped')}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Groups
      </Button>

      {/* Group Header */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{group.name}</h1>
            <p className="text-muted-foreground mt-1">
              {groupTickets.length} tickets • Assigned to {group.assigned_user?.full_name || 'Unassigned'}
            </p>
          </div>
          <SLATimer remaining={slaRemaining} status={slaStatus as any} />
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="bg-card rounded-lg border border-border p-4 flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={handleSelectAll}>
          {selectedIds.length === groupTickets.length ? 'Deselect All' : 'Select All'}
        </Button>
        
        <div className="h-4 w-px bg-border" />

        <Button
          size="sm"
          disabled={selectedIds.length === 0}
          onClick={() => setResolveDialogOpen(true)}
        >
          <CheckCircle2 className="w-4 h-4 mr-1" />
          Resolve Selected ({selectedIds.length})
        </Button>

        <Button variant="outline" size="sm" disabled={selectedIds.length === 0}>
          <Users className="w-4 h-4 mr-1" />
          Reassign
        </Button>

        <Button variant="outline" size="sm" disabled={selectedIds.length === 0}>
          <MessageSquare className="w-4 h-4 mr-1" />
          Add Note to All
        </Button>
      </div>

      {/* Tickets List */}
      <div className="space-y-3">
        {groupTickets.length === 0 ? (
          <div className="bg-card rounded-lg border border-border p-8 text-center">
            <p className="text-muted-foreground">No tickets in this group</p>
          </div>
        ) : (
          groupTickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              selected={selectedIds.includes(ticket.id)}
              onSelect={handleSelect}
              showCheckbox
            />
          ))
        )}
      </div>

      {/* Bulk Resolve Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Resolve {selectedIds.length} Ticket(s)</DialogTitle>
            <DialogDescription>
              Add a resolution note that will be applied to all selected tickets.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Enter resolution note..."
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              rows={4}
            />

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="notify"
                  checked={notifySupplier}
                  onCheckedChange={(v) => setNotifySupplier(v as boolean)}
                />
                <label htmlFor="notify" className="text-sm text-foreground">
                  Notify supplier(s) about resolution
                </label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="close"
                  checked={closeTickets}
                  onCheckedChange={(v) => setCloseTickets(v as boolean)}
                />
                <label htmlFor="close" className="text-sm text-foreground">
                  Also close tickets after resolving
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleBulkResolve} 
              disabled={!resolutionNote.trim() || resolving}
            >
              {resolving ? 'Resolving...' : 'Resolve Tickets'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
