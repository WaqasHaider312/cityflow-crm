import { useNavigate } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PriorityBadge } from '@/components/common/PriorityBadge';
import { SLATimer } from '@/components/common/SLATimer';
import type { Ticket } from '@/lib/mockData';
import { cn } from '@/lib/utils';

interface TicketCardProps {
  ticket: Ticket;
  selected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  showCheckbox?: boolean;
}

export function TicketCard({ ticket, selected, onSelect, showCheckbox = false }: TicketCardProps) {
  const navigate = useNavigate();

  return (
    <div
      className={cn(
        'bg-card rounded-lg p-4 border border-border card-hover cursor-pointer',
        selected && 'ring-2 ring-primary border-primary'
      )}
      onClick={() => navigate(`/tickets/${ticket.id}`)}
    >
      <div className="flex items-start gap-3">
        {showCheckbox && (
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => onSelect?.(ticket.id, checked as boolean)}
            onClick={(e) => e.stopPropagation()}
            className="mt-1"
          />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-muted-foreground">#{ticket.id}</span>
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
          </div>

          <h4 className="font-medium text-foreground truncate mb-2">{ticket.subject}</h4>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4 text-muted-foreground">
              <span>{ticket.issueType}</span>
              <span>•</span>
              <span>{ticket.city}</span>
              <span>•</span>
              <span>{ticket.assignedTo}</span>
            </div>
            
            {ticket.status !== 'Resolved' && ticket.status !== 'Closed' && (
              <SLATimer
                remaining={ticket.slaRemaining}
                status={ticket.slaStatus}
                className="text-xs"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
