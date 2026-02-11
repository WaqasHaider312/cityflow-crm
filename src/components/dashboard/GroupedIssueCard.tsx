import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SLATimer } from '@/components/common/SLATimer';
import { formatDistanceToNow } from 'date-fns';

interface GroupedIssueCardProps {
  group: any; // Your actual database group object
}

export function GroupedIssueCard({ group }: GroupedIssueCardProps) {
  const navigate = useNavigate();

  // Calculate SLA remaining
  const calculateSLARemaining = () => {
    if (!group.sla_due_at) return 'No SLA';
    
    const now = new Date();
    const dueDate = new Date(group.sla_due_at);
    const diffMs = dueDate.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 0) return `${Math.abs(diffHours)}h overdue`;
    return `${diffHours}h `;
  };

  const slaRemaining = calculateSLARemaining();
  
  const slaStatus = slaRemaining.includes('overdue') ? 'breached' 
    : parseInt(slaRemaining) <= 2 ? 'warning' 
    : 'on-track';

  const ticketCount = group.tickets?.length || 0;

  return (
    <div 
      className="bg-card rounded-lg p-5 shadow-subtle border border-border card-hover cursor-pointer"
      onClick={() => navigate(`/tickets/group/${group.id}`)}
    >
      <div className="flex items-start justify-between mb-4">
        <h3 className="font-semibold text-foreground">{group.name || 'Unnamed Group'}</h3>
        <span className="text-2xl">{group.issue_type?.icon || '📋'}</span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Tickets</span>
          <span className="font-medium text-foreground">{ticketCount}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Issue Type</span>
          <span className="font-medium text-foreground">{group.issue_type?.name || '-'}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">City</span>
          <span className="font-medium text-foreground">{group.city || '-'}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Assigned to</span>
          <span className="font-medium text-foreground">{group.assigned_user?.full_name || 'Unassigned'}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Created</span>
          <span className="text-muted-foreground">
            {group.created_at ? formatDistanceToNow(new Date(group.created_at), { addSuffix: true }) : '-'}
          </span>
        </div>

        <SLATimer remaining={slaRemaining} status={slaStatus as any} />
      </div>

      <Button 
        variant="ghost" 
        className="w-full mt-4 justify-between text-primary hover:text-primary hover:bg-primary/5"
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/tickets/group/${group.id}`);
        }}
      >
        View Group
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
