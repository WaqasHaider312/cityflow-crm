import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SLATimer } from '@/components/common/SLATimer';
import type { TicketGroup } from '@/lib/mockData';

interface GroupedIssueCardProps {
  group: TicketGroup;
}

export function GroupedIssueCard({ group }: GroupedIssueCardProps) {
  const navigate = useNavigate();

  const slaStatus = group.slaRemaining.includes('-') ? 'breached' 
    : parseInt(group.slaRemaining) <= 2 ? 'warning' 
    : 'on-track';

  return (
    <div 
      className="bg-card rounded-lg p-5 shadow-subtle border border-border card-hover cursor-pointer"
      onClick={() => navigate(`/tickets/group/${group.id}`)}
    >
      <div className="flex items-start justify-between mb-4">
        <h3 className="font-semibold text-foreground">{group.name}</h3>
        <span className="text-2xl">{group.issueType === 'Pickup Issue' ? '📦' : group.issueType === 'Payment Delay' ? '💰' : group.issueType === 'Delivery Issue' ? '🚚' : '🏢'}</span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Tickets</span>
          <span className="font-medium text-foreground">{group.ticketCount}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Assigned to</span>
          <span className="font-medium text-foreground">{group.assignedTo}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Created</span>
          <span className="text-muted-foreground">{group.createdAt}</span>
        </div>

        <SLATimer remaining={group.slaRemaining} status={slaStatus as any} />
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
