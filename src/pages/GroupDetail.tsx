import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Users, MessageSquare, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { SLATimer } from '@/components/common/SLATimer';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PriorityBadge } from '@/components/common/PriorityBadge';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import TicketDetail from './TicketDetail';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getInitials = (name?: string) =>
  (name || 'UN').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

// ─── TicketRow ────────────────────────────────────────────────────────────────

function TicketRow({
  ticket,
  selected,
  active,
  onSelect,
  onClick,
}: {
  ticket: any;
  selected: boolean;
  active: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onClick: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-all border-b border-border',
        'hover:bg-secondary/40',
        active && 'bg-primary/5 border-l-[3px] border-l-primary',
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
            <FileText className="h-3.5 w-3.5 text-primary flex-shrink-0" />
            <span className="text-sm text-primary font-semibold">
              {ticket.ticket_number || `#${ticket.id.slice(0, 8)}`}
            </span>
          </div>
          <StatusBadge status={ticket.status} />
        </div>

        {/* Row 2: supplier name + agent avatar */}
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm text-foreground font-medium truncate max-w-[180px]">
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

        {/* Row 3: preview */}
        <p className="text-xs text-muted-foreground mb-1.5 leading-relaxed truncate">
          {(ticket.latest_comment_preview || ticket.description || ticket.subject || '').slice(0, 80)}
        </p>

        {/* Row 4: meta + time */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {ticket.issue_type && (
              <span className="text-xs text-muted-foreground">
                {ticket.issue_type.icon} {ticket.issue_type.name}
              </span>
            )}
            <PriorityBadge priority={ticket.priority} />
          </div>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Empty Detail Panel ───────────────────────────────────────────────────────

function EmptyDetail({
  selectedCount,
  onBulkResolve,
  onClear,
}: {
  selectedCount: number;
  onBulkResolve?: () => void;
  onClear?: () => void;
}) {
  if (selectedCount > 1) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background text-center px-8">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <MessageSquare className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">{selectedCount} tickets selected</h3>
        <p className="text-sm text-muted-foreground mb-6">Resolve all selected tickets at once</p>
        <div className="flex gap-3">
          <Button onClick={onBulkResolve}>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Resolve Selected
          </Button>
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

export default function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [group, setGroup] = useState<any>(null);
  const [groupTickets, setGroupTickets] = useState<any[]>([]);

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [resolutionNote, setResolutionNote] = useState('');
  const [notifySupplier, setNotifySupplier] = useState(true);
  const [closeTickets, setCloseTickets] = useState(false);

  // ── Fetch ────────────────────────────────────────────────────────────────────

  const fetchData = async () => {
    try {
      setLoading(true);

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

      const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets')
        .select(`
          *,
          issue_type:issue_types(name, icon),
          assigned_user:profiles!assigned_to(full_name),
          team:teams!tickets_team_id_fkey(name)
        `)
        .eq('ticket_group_id', id)
        .order('created_at', { ascending: false });

      if (ticketsError) throw ticketsError;

      setGroup(groupData);
      setGroupTickets(ticketsData || []);
    } catch (error) {
      console.error('Error fetching group:', error);
      toast({ title: 'Error loading group', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  // ── SLA ──────────────────────────────────────────────────────────────────────

  const calculateSLAStatus = () => {
    if (!group?.sla_due_at) return 'on-track';
    const now = new Date();
    const dueAt = new Date(group.sla_due_at);
    const timeRemaining = dueAt.getTime() - now.getTime();
    if (timeRemaining < 0) return 'breached';
    if (timeRemaining / (1000 * 60 * 60) <= 2) return 'warning';
    return 'on-track';
  };

  const formatSLARemaining = () => {
    if (!group?.sla_due_at) return '0h 0m';
    const now = new Date();
    const dueAt = new Date(group.sla_due_at);
    const timeRemaining = dueAt.getTime() - now.getTime();
    const abs = Math.abs(timeRemaining);
    const hours = Math.floor(abs / (1000 * 60 * 60));
    const minutes = Math.floor((abs % (1000 * 60 * 60)) / (1000 * 60));
    return timeRemaining < 0 ? `-${hours}h ${minutes}m` : `${hours}h ${minutes}m`;
  };

  // ── Selection ────────────────────────────────────────────────────────────────

  const handleSelectAll = () => {
    setSelectedIds(
      selectedIds.length === groupTickets.length ? [] : groupTickets.map(t => t.id)
    );
  };

  const handleSelectOne = (ticketId: string, checked: boolean) => {
    setSelectedIds(prev =>
      checked ? [...prev, ticketId] : prev.filter(sid => sid !== ticketId)
    );
  };

  // ── Bulk Resolve ─────────────────────────────────────────────────────────────

  const handleBulkResolve = async () => {
    try {
      setResolving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const updates = {
        status: closeTickets ? 'closed' : 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
        resolution_note: resolutionNote,
        ...(closeTickets && {
          closed_at: new Date().toISOString(),
          closed_by: user.id,
        }),
      };

      const { error: updateError } = await supabase
        .from('tickets')
        .update(updates)
        .in('id', selectedIds);

      if (updateError) throw updateError;

      const { error: bulkError } = await supabase
        .from('bulk_resolutions')
        .insert({
          ticket_group_id: id,
          resolved_by: user.id,
          resolution_note: resolutionNote,
          ticket_ids: selectedIds,
        });

      if (bulkError) console.error('Bulk resolution record error:', bulkError);

      toast({
        title: 'Tickets Resolved',
        description: `${selectedIds.length} ticket(s) resolved.`,
      });

      // Clear detail panel if the open ticket was just resolved
      if (selectedTicketId && selectedIds.includes(selectedTicketId)) {
        setSelectedTicketId(null);
      }

      await fetchData();
      setResolveDialogOpen(false);
      setSelectedIds([]);
      setResolutionNote('');
    } catch (error: any) {
      toast({ title: 'Error resolving tickets', description: error.message, variant: 'destructive' });
    } finally {
      setResolving(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

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
    <div className="flex h-screen overflow-hidden bg-background">

      {/* ── Panel 1: Group Info + Ticket List ─────────────────────────────── */}
      <div className="w-[380px] flex-shrink-0 border-r border-border flex flex-col bg-background">

        {/* Group Header */}
        <div className="p-4 border-b border-border flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="mb-3 -ml-2"
            onClick={() => navigate('/tickets/grouped')}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Groups
          </Button>

          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 mr-3">
              <h1 className="text-base font-bold text-foreground leading-tight">{group.name}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {groupTickets.length} tickets · {group.assigned_user?.full_name || 'Unassigned'}
              </p>
            </div>
            <SLATimer remaining={slaRemaining} status={slaStatus as any} />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleSelectAll}>
            {selectedIds.length === groupTickets.length ? 'Deselect All' : 'Select All'}
          </Button>

          <Button
            size="sm"
            className="h-7 text-xs"
            disabled={selectedIds.length === 0}
            onClick={() => setResolveDialogOpen(true)}
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            Resolve ({selectedIds.length})
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            disabled={selectedIds.length === 0}
          >
            <Users className="w-3.5 h-3.5 mr-1" />
            Reassign
          </Button>
        </div>

        {/* Ticket List */}
        <div className="flex-1 overflow-y-auto">
          {groupTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center px-6">
              <p className="text-muted-foreground">No tickets in this group</p>
            </div>
          ) : (
            groupTickets.map(ticket => (
              <TicketRow
                key={ticket.id}
                ticket={ticket}
                selected={selectedIds.includes(ticket.id)}
                active={selectedTicketId === ticket.id}
                onSelect={handleSelectOne}
                onClick={tid => setSelectedTicketId(tid)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Panel 2: Ticket Detail ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedTicketId ? (
          <TicketDetail
            ticketId={selectedTicketId}
            embedded
            onClose={() => setSelectedTicketId(null)}
            onRefresh={fetchData}
          />
        ) : (
          <EmptyDetail
            selectedCount={selectedIds.length}
            onBulkResolve={() => setResolveDialogOpen(true)}
            onClear={() => setSelectedIds([])}
          />
        )}
      </div>

      {/* ── Bulk Resolve Dialog ────────────────────────────────────────────── */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Resolve {selectedIds.length} Ticket(s)</DialogTitle>
            <DialogDescription>
              Add a resolution note applied to all selected tickets.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Enter resolution note..."
              value={resolutionNote}
              onChange={e => setResolutionNote(e.target.value)}
              rows={4}
            />

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="notify"
                  checked={notifySupplier}
                  onCheckedChange={v => setNotifySupplier(v as boolean)}
                />
                <label htmlFor="notify" className="text-sm text-foreground">
                  Notify supplier(s) about resolution
                </label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="close"
                  checked={closeTickets}
                  onCheckedChange={v => setCloseTickets(v as boolean)}
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