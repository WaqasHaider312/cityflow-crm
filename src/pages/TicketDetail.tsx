import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ArrowUpRight, Users, X, Eye, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PriorityBadge } from '@/components/common/PriorityBadge';
import { SLATimer } from '@/components/common/SLATimer';
import { tickets, users } from '@/lib/mockData';
import { toast } from '@/hooks/use-toast';
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
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [escalateDialogOpen, setEscalateDialogOpen] = useState(false);

  const ticket = tickets.find((t) => t.id === id);

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

  const handleResolve = () => {
    toast({
      title: "Ticket Resolved",
      description: `Ticket #${ticket.id} has been marked as resolved.`,
    });
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    toast({
      title: "Comment Added",
      description: isInternal ? "Internal note added." : "Reply sent to supplier.",
    });
    setNewComment('');
  };

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
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">#{ticket.id}</span>
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
            </div>
            <h1 className="text-xl font-bold text-foreground">{ticket.subject}</h1>
          </div>

          {ticket.status !== 'Resolved' && ticket.status !== 'Closed' && (
            <SLATimer remaining={ticket.slaRemaining} status={ticket.slaStatus} />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-border">
          <Button onClick={handleResolve}>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Resolve
          </Button>
          <Button variant="outline" onClick={() => setEscalateDialogOpen(true)}>
            <ArrowUpRight className="w-4 h-4 mr-2" />
            Escalate
          </Button>
          <Button variant="outline" onClick={() => setReassignDialogOpen(true)}>
            <Users className="w-4 h-4 mr-2" />
            Reassign
          </Button>
          <Button variant="outline">
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
                <span className="font-medium text-foreground">{ticket.issueType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Supplier</span>
                <span className="font-medium text-foreground">{ticket.supplier}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">City</span>
                <span className="font-medium text-foreground">{ticket.city}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="text-foreground">{ticket.createdAt}</span>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-5 space-y-4">
            <h3 className="font-semibold text-foreground">Assignment</h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Assigned To</span>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                    {ticket.assignedTo.split(' ').map(n => n[0]).join('')}
                  </div>
                  <span className="font-medium text-foreground">{ticket.assignedTo}</span>
                </div>
              </div>
              
              {ticket.watchers.length > 0 && (
                <div className="flex justify-between items-start">
                  <span className="text-muted-foreground">Watchers</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {ticket.watchers.map((watcher) => (
                      <span key={watcher} className="text-xs px-2 py-1 bg-secondary rounded-full">
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
            </div>

            {/* Comments */}
            <div className="p-4 space-y-4 max-h-96 overflow-y-auto scrollbar-thin">
              {ticket.comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No comments yet. Start the conversation below.
                </p>
              ) : (
                ticket.comments.map((comment) => (
                  <div
                    key={comment.id}
                    className={`p-4 rounded-lg ${
                      comment.isInternal ? 'bg-warning/10 border border-warning/20' : 'bg-secondary'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                          {comment.author.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span className="font-medium text-sm text-foreground">{comment.author}</span>
                        {comment.isInternal && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-warning/20 text-warning">
                            Internal
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{comment.timestamp}</span>
                    </div>
                    <p className="text-sm text-foreground">{comment.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* New Comment */}
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
                <Button onClick={handleAddComment} disabled={!newComment.trim()}>
                  {isInternal ? 'Add Note' : 'Send Reply'}
                </Button>
              </div>
            </div>
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

          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select team member" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {users.map((user) => (
                <SelectItem key={user.id} value={user.name}>
                  {user.name} ({user.team})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              toast({ title: "Ticket Reassigned" });
              setReassignDialogOpen(false);
            }}>
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
              Select a Tier 2 team to escalate this ticket to.
            </DialogDescription>
          </DialogHeader>

          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select team" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="logistics-tier2">Logistics Tier 2</SelectItem>
              <SelectItem value="finance-tier2">Finance Tier 2</SelectItem>
              <SelectItem value="operations">Operations Management</SelectItem>
            </SelectContent>
          </Select>

          <Textarea placeholder="Add escalation note..." rows={3} />

          <DialogFooter>
            <Button variant="outline" onClick={() => setEscalateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              toast({ title: "Ticket Escalated", description: "The team has been notified." });
              setEscalateDialogOpen(false);
            }}>
              Escalate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
