import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ArrowUpRight, Users, X, Eye, Send, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PriorityBadge } from '@/components/common/PriorityBadge';
import { SLATimer } from '@/components/common/SLATimer';
import { Badge } from '@/components/ui/badge';
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

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [escalateDialogOpen, setEscalateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [escalationNote, setEscalationNote] = useState('');

  useEffect(() => {
    fetchTicketData();
  }, [id]);

  const fetchTicketData = async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('*, region:regions(id, name)')
        .eq('id', user.id)
        .single();

      setCurrentUser(profile);

      // Fetch ticket
      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .select(`
          *,
          issue_type:issue_types(name, icon),
          assigned_user:profiles!assigned_to(id, full_name),
          team:teams!tickets_team_id_fkey(name),
          tier2_team:teams!tier2_team_id(name),
          region:regions(id, name, manager:profiles!regions_manager_id_fkey(full_name)),
          watchers:ticket_watchers(user:profiles(full_name))
        `)
        .eq('id', id)
        .single();

      if (ticketError) throw ticketError;

      // Fetch comments
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select(`
          *,
          user:profiles(full_name)
        `)
        .eq('ticket_id', id)
        .order('created_at', { ascending: true });

      if (commentsError) throw commentsError;

      // Fetch all users for reassignment
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, full_name, team:teams!fk_team(name)')
        .eq('is_active', true)
        .order('full_name');

      if (usersError) throw usersError;

      setTicket(ticketData);
      setComments(commentsData || []);
      setUsers(usersData || []);
    } catch (error) {
      console.error('Error fetching ticket:', error);
      toast({ title: "Error loading ticket", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const formatSLARemaining = () => {
    if (!ticket?.sla_due_at) return '0h';
    
    const now = new Date();
    const dueAt = new Date(ticket.sla_due_at);
    const timeRemaining = dueAt.getTime() - now.getTime();
    const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
    const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

    if (timeRemaining < 0) {
      return `-${Math.abs(hoursRemaining)}h`;
    }
    return `${hoursRemaining}h ${minutesRemaining}m`;
  };

  const handleIntervene = async () => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({
          manager_intervened: true,
          manager_intervened_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      toast({ title: "Intervention Marked", description: "You're now actively involved in this ticket." });
      
      setTicket({ ...ticket, manager_intervened: true });
    } catch (error) {
      console.error('Error marking intervention:', error);
      toast({ title: "Error marking intervention", variant: "destructive" });
    }
  };

  const handleResolve = async () => {
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
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Ticket Resolved",
        description: `Ticket #${ticket.ticket_number} has been marked as resolved.`,
      });

      fetchTicketData();
    } catch (error) {
      console.error('Error resolving ticket:', error);
      toast({ title: "Error resolving ticket", variant: "destructive" });
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('comments')
        .insert({
          ticket_id: id,
          user_id: user.id,
          content: newComment,
          is_internal: isInternal
        })
        .select(`
          *,
          user:profiles(full_name)
        `)
        .single();

      if (error) throw error;

      toast({
        title: "Comment Added",
        description: isInternal ? "Internal note added." : "Reply sent to supplier.",
      });

      setComments([...comments, data]);
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({ title: "Error adding comment", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReassign = async () => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ assigned_to: selectedUser })
        .eq('id', id);

      if (error) throw error;

      toast({ title: "Ticket Reassigned" });
      setReassignDialogOpen(false);
      fetchTicketData();
    } catch (error) {
      console.error('Error reassigning ticket:', error);
      toast({ title: "Error reassigning ticket", variant: "destructive" });
    }
  };

  const handleEscalate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('tickets')
        .update({
          is_escalated: true,
          escalated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      // Add escalation comment
      if (escalationNote.trim()) {
        await supabase.from('comments').insert({
          ticket_id: id,
          user_id: user.id,
          content: `[ESCALATED] ${escalationNote}`,
          is_internal: true
        });
      }

      toast({ title: "Ticket Escalated", description: "The team has been notified." });
      setEscalateDialogOpen(false);
      setEscalationNote('');
      fetchTicketData();
    } catch (error) {
      console.error('Error escalating ticket:', error);
      toast({ title: "Error escalating ticket", variant: "destructive" });
    }
  };

  const handleClose = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('tickets')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
          closed_by: user.id
        })
        .eq('id', id);

      if (error) throw error;

      toast({ title: "Ticket Closed" });
      fetchTicketData();
    } catch (error) {
      console.error('Error closing ticket:', error);
      toast({ title: "Error closing ticket", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Ticket not found</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/tickets')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Tickets
        </Button>
      </div>
    );
  }

  const slaRemaining = formatSLARemaining();
  const watchers = ticket.watchers?.map(w => w.user.full_name) || [];
  const isCityManager = currentUser?.region_id === ticket.region_id;
  const isAssignedSpecialist = currentUser?.id === ticket.assigned_to;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate('/tickets')}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Tickets
      </Button>

      {/* Ticket Header */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-muted-foreground">#{ticket.ticket_number}</span>
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              {ticket.manager_intervened && (
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Manager Involved
                </Badge>
              )}
            </div>
            <h1 className="text-xl font-bold text-foreground">{ticket.subject}</h1>
          </div>

          {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
            <SLATimer remaining={slaRemaining} status={ticket.sla_status} />
          )}
        </div>

        {/* City Manager Intervention Alert */}
        {isCityManager && !ticket.manager_intervened && ticket.sla_status === 'breached' && (
          <div className="mt-4 p-4 bg-warning/10 border border-warning/20 rounded-lg flex items-start justify-between">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-warning mt-0.5" />
              <div>
                <p className="font-medium text-foreground">SLA Breached - Intervention Needed</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Specialist hasn't responded within SLA. Would you like to intervene?
                </p>
              </div>
            </div>
            <Button size="sm" onClick={handleIntervene}>
              Intervene
            </Button>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-border">
          <Button onClick={handleResolve} disabled={ticket.status === 'resolved' || ticket.status === 'closed'}>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Resolve
          </Button>
          <Button variant="outline" onClick={() => setEscalateDialogOpen(true)} disabled={ticket.is_escalated}>
            <ArrowUpRight className="w-4 h-4 mr-2" />
            Escalate
          </Button>
          <Button variant="outline" onClick={() => setReassignDialogOpen(true)}>
            <Users className="w-4 h-4 mr-2" />
            Reassign
          </Button>
          <Button variant="outline" onClick={handleClose} disabled={ticket.status === 'closed'}>
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Ticket Info */}
        <div className="space-y-6">
          <div className="bg-card rounded-lg border border-border p-5 space-y-4">
            <h3 className="font-semibold text-foreground">Ticket Details</h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Issue Type</span>
                <span className="font-medium text-foreground">{ticket.issue_type?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Supplier</span>
                <span className="font-medium text-foreground">{ticket.supplier_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">City</span>
                <span className="font-medium text-foreground">{ticket.supplier_city}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Region</span>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  {ticket.region?.name || 'Unknown'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="text-foreground">
                  {new Date(ticket.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-5 space-y-4">
            <h3 className="font-semibold text-foreground">Assignment</h3>

            <div className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground block mb-2">Tier 1 (Specialist)</span>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                    {ticket.assigned_user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
                  </div>
                  <span className="font-medium text-foreground">
                    {ticket.assigned_user?.full_name || 'Unassigned'}
                  </span>
                </div>
                {ticket.team?.name && (
                  <p className="text-xs text-muted-foreground mt-1">Team: {ticket.team.name}</p>
                )}
              </div>

              <div>
                <span className="text-muted-foreground block mb-2">Tier 2 (Escalation)</span>
                <p className="text-foreground">{ticket.tier2_team?.name || 'No escalation team'}</p>
                {ticket.region?.manager?.full_name && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Manager: {ticket.region.manager.full_name}
                  </p>
                )}
              </div>
              
              {watchers.length > 0 && (
                <div className="flex justify-between items-start">
                  <span className="text-muted-foreground">Watchers</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {watchers.map((watcher, i) => (
                      <span key={i} className="text-xs px-2 py-1 bg-secondary rounded-full">
                        {watcher}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="bg-card rounded-lg border border-border p-5 space-y-4">
            <h3 className="font-semibold text-foreground">Description</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {ticket.description}
            </p>
          </div>
        </div>

        {/* Right - Communication Thread */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card rounded-lg border border-border">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Communication</h3>
              {(isAssignedSpecialist || isCityManager) && (
                <p className="text-xs text-muted-foreground mt-1">
                  {isCityManager && !isAssignedSpecialist && 'You can respond as City Manager'}
                  {isAssignedSpecialist && !isCityManager && 'You are the assigned specialist'}
                  {isAssignedSpecialist && isCityManager && 'You are both specialist and city manager'}
                </p>
              )}
            </div>

            {/* Comments */}
            <div className="p-4 space-y-4 max-h-96 overflow-y-auto scrollbar-thin">
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No comments yet. Start the conversation below.
                </p>
              ) : (
                comments.map((comment) => (
                  <div
                    key={comment.id}
                    className={`p-4 rounded-lg ${
                      comment.is_internal ? 'bg-warning/10 border border-warning/20' : 'bg-secondary'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                          {comment.user.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </div>
                        <span className="font-medium text-sm text-foreground">{comment.user.full_name}</span>
                        {comment.is_internal && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-warning/20 text-warning">
                            Internal
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{comment.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* New Comment - Only if specialist or city manager */}
            {(isAssignedSpecialist || isCityManager) && (
              <div className="p-4 border-t border-border space-y-3">
                <div className="flex items-center gap-2">
                  <Button
                    variant={isInternal ? 'outline' : 'default'}
                    size="sm"
                    onClick={() => setIsInternal(false)}
                  >
                    <Send className="w-4 h-4 mr-1" />
                    Reply
                  </Button>
                  <Button
                    variant={isInternal ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setIsInternal(true)}
                    className={isInternal ? 'bg-warning hover:bg-warning/90' : ''}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Internal Note
                  </Button>
                </div>

                <Textarea
                  placeholder={isInternal ? 'Add internal note (only visible to team)...' : 'Reply to supplier...'}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                />

                <div className="flex justify-end">
                  <Button onClick={handleAddComment} disabled={!newComment.trim() || submitting}>
                    {submitting ? 'Adding...' : isInternal ? 'Add Note' : 'Send Reply'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reassign Dialog */}
      <Dialog open={reassignDialogOpen} onOpenChange={setReassignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign Ticket</DialogTitle>
            <DialogDescription>
              Select a team member to reassign this ticket to.
            </DialogDescription>
          </DialogHeader>

          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger>
              <SelectValue placeholder="Select team member" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.full_name} ({user.team?.name || 'No team'})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleReassign} disabled={!selectedUser}>
              Reassign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Escalate Dialog */}
      <Dialog open={escalateDialogOpen} onOpenChange={setEscalateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escalate Ticket</DialogTitle>
            <DialogDescription>
              Add a note explaining why this ticket is being escalated.
            </DialogDescription>
          </DialogHeader>

          <Textarea 
            placeholder="Add escalation note..." 
            rows={3} 
            value={escalationNote}
            onChange={(e) => setEscalationNote(e.target.value)}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setEscalateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEscalate}>
              Escalate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}