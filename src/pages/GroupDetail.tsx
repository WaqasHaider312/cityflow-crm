import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Users, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { TicketCard } from '@/components/tickets/TicketCard';
import { SLATimer } from '@/components/common/SLATimer';
import { tickets, ticketGroups } from '@/lib/mockData';
import { toast } from '@/hooks/use-toast';
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [resolutionNote, setResolutionNote] = useState('');
  const [notifySupplier, setNotifySupplier] = useState(true);
  const [closeTickets, setCloseTickets] = useState(false);

  const group = ticketGroups.find((g) => g.id === id);
  const groupTickets = tickets.filter((t) => t.groupId === id);

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

  const slaStatus = group.slaRemaining.includes('-') ? 'breached' 
    : parseInt(group.slaRemaining) <= 2 ? 'warning' 
    : 'on-track';

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

  const handleBulkResolve = () => {
    toast({
      title: "Tickets Resolved",
      description: `${selectedIds.length} ticket(s) have been resolved with your note.`,
    });
    setResolveDialogOpen(false);
    setSelectedIds([]);
    setResolutionNote('');
  };

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
              {group.ticketCount} tickets • Assigned to {group.assignedTo}
            </p>
          </div>
          <SLATimer remaining={group.slaRemaining} status={slaStatus as any} />
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
        {groupTickets.map((ticket) => (
          <TicketCard
            key={ticket.id}
            ticket={ticket}
            selected={selectedIds.includes(ticket.id)}
            onSelect={handleSelect}
            showCheckbox
          />
        ))}
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
            <Button onClick={handleBulkResolve} disabled={!resolutionNote.trim()}>
              Resolve Tickets
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
